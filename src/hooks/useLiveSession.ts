import { useState, useCallback, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { handleError, ErrorType } from '../lib/error-handler';

export type LiveStatus = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking';

export interface LiveMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export function useLiveSession() {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState<LiveStatus>('idle');
  const [modelTranscript, setModelTranscript] = useState('');
  const [userTranscript, setUserTranscript] = useState('');
  const [conversation, setConversation] = useState<LiveMessage[]>([]);
  const [volume, setVolume] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const isPlayingRef = useRef(false);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const isActiveRef = useRef(false);
  const nextStartTimeRef = useRef<number>(0);
  
  const stopSession = useCallback(() => {
    isActiveRef.current = false;
    sessionRef.current?.close();
    if (currentSourceRef.current) {
      try { currentSourceRef.current.stop(); } catch(e) {}
      currentSourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    setIsActive(false);
    setIsConnecting(false);
    setStatus('idle');
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    nextStartTimeRef.current = 0;
    setVolume(0);
  }, []);

  const playNext = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === 'closed') return;

    // Process all available chunks in the queue
    while (audioQueueRef.current.length > 0) {
      // Jitter buffer: wait for enough chunks to accumulate before starting playback
      // Increased to 10 chunks for better stability on unstable connections
      if (!isPlayingRef.current && audioQueueRef.current.length < 10) {
        return;
      }

      const chunk = audioQueueRef.current.shift()!;
      const buf = ctx.createBuffer(1, chunk.length, 24000);
      buf.getChannelData(0).set(chunk);
      
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      
      const now = ctx.currentTime;
      
      // If we're starting a new sequence, add a small lookahead (150ms) 
      // to give the hardware time to prepare and avoid initial stutter
      if (nextStartTimeRef.current < now) {
        nextStartTimeRef.current = now + 0.15;
      }
      
      const startTime = nextStartTimeRef.current;
      try {
        src.start(startTime);
      } catch (e) {
        console.error("Failed to start audio source:", e);
        nextStartTimeRef.current = now + 0.1;
        src.start(nextStartTimeRef.current);
      }
      
      // Update the next start time based on this buffer's duration
      nextStartTimeRef.current = startTime + buf.duration;
      
      if (!isPlayingRef.current) {
        isPlayingRef.current = true;
        setStatus('speaking');
      }

      src.onended = () => {
        // Check if this was the last scheduled buffer
        // We use a small threshold (100ms) to account for floating point precision
        if (ctx.currentTime >= nextStartTimeRef.current - 0.1) {
          isPlayingRef.current = false;
          nextStartTimeRef.current = 0;
          setStatus('listening');
        }
      };
    }
  }, []);

  const startSession = useCallback(async (voice: string = 'Zephyr', customInstruction?: string) => {
    setIsConnecting(true);
    setStatus('connecting');
    setModelTranscript('');
    setUserTranscript('');
    setConversation([]);
    
    try {
      const keyRes = await fetch('/api/ai/key');
      const { key } = await keyRes.json();
      if (!key) throw new Error('Gemini API key not available');
      const ai = new GoogleGenAI({ apiKey: key });
      const ctx = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = ctx;

      const baseInstruction = "You are BolDost, a friendly and highly expressive English tutor. Your voice should have a wide emotional range. CRITICAL: Sound genuinely excited and high-energy when the user gets something right or shows progress. Sound deeply encouraging, warm, and patient when the user is struggling or makes a mistake. Use natural intonation, occasional natural fillers like 'hmm' or 'oh', and vary your pitch to sound like a real human friend. Gently and warmly correct mistakes. Keep responses concise but full of personality. Use vocal variety: speak faster when excited, slower when explaining, and use pauses for effect. Sound like you are truly present in the conversation.";
      const systemInstruction = customInstruction ? `${baseInstruction} ${customInstruction}` : baseInstruction;

      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
          systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: async () => {
            setIsActive(true); 
            isActiveRef.current = true;
            setIsConnecting(false);
            setStatus('listening');
            try {
              // Ensure AudioContext is active (browsers often suspend it)
              if (ctx.state === 'suspended') {
                await ctx.resume();
              }

              const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                  channelCount: 1,
                  sampleRate: 24000
                } 
              });
              mediaStreamRef.current = stream;
              const src = ctx.createMediaStreamSource(stream);
              
              // Volume Analyser
              const analyser = ctx.createAnalyser();
              analyser.fftSize = 256;
              src.connect(analyser);
              analyserRef.current = analyser;

              const dataArray = new Uint8Array(analyser.frequencyBinCount);
              const updateVolume = () => {
                if (!isActiveRef.current) return;
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                setVolume(Math.round((average / 128) * 100));
                requestAnimationFrame(updateVolume);
              };
              updateVolume();

              await ctx.audioWorklet.addModule('/audio-processor.js');
              const workletNode = new AudioWorkletNode(ctx, 'pcm-capture-processor');
              workletNode.port.onmessage = (event) => {
                if (!isActiveRef.current) return;
                const samples = event.data as number[];
                const pcm = new Int16Array(samples.length);
                for (let i = 0; i < samples.length; i++) {
                  const s = Math.max(-1, Math.min(1, samples[i]));
                  pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                const b64 = btoa(String.fromCharCode(...new Uint8Array(pcm.buffer)));
                session.sendRealtimeInput({ audio: { data: b64, mimeType: 'audio/pcm;rate=24000' } });
              };
              src.connect(workletNode);
              workletNodeRef.current = workletNode;
            } catch (err) {
              handleError(err, ErrorType.SPEECH, { context: 'Live session microphone' });
              stopSession();
            }
          },
          onmessage: (msg: any) => {
            // Handle Interruption
            if (msg.serverContent?.interrupted) {
              audioQueueRef.current = [];
              if (currentSourceRef.current) {
                try { currentSourceRef.current.stop(); } catch(e) {}
                currentSourceRef.current = null;
              }
              isPlayingRef.current = false;
              nextStartTimeRef.current = 0;
              setStatus('listening');
              return;
            }

            // Handle Audio Output
            const b64 = msg.serverContent?.modelTurn?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
            if (b64) {
              const bin = atob(b64);
              const buffer = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) buffer[i] = bin.charCodeAt(i);
              const bytes = new Int16Array(buffer.buffer);
              const f32 = new Float32Array(bytes.length);
              for (let i = 0; i < bytes.length; i++) f32[i] = bytes[i] / 32768.0;
              audioQueueRef.current.push(f32); 
              playNext();
            }

            // Handle Model Transcriptions
            const modelText = msg.serverContent?.modelTurn?.parts?.filter((p: any) => p.text).map((p: any) => p.text).join(" ");
            if (modelText) {
              setModelTranscript(t => (t + " " + modelText).trim());
              setConversation(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'model' && (Date.now() - last.timestamp < 3000)) {
                  return [...prev.slice(0, -1), { ...last, text: (last.text + " " + modelText).trim() }];
                }
                return [...prev, { role: 'model', text: modelText, timestamp: Date.now() }];
              });
            }
            
            // Handle User Transcriptions
            const userText = msg.serverContent?.userTurn?.parts?.filter((p: any) => p.text).map((p: any) => p.text).join(" ");
            if (userText) {
              setUserTranscript(t => (t + " " + userText).trim());
              setConversation(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'user' && (Date.now() - last.timestamp < 3000)) {
                  return [...prev.slice(0, -1), { ...last, text: (last.text + " " + userText).trim() }];
                }
                return [...prev, { role: 'user', text: userText, timestamp: Date.now() }];
              });
              setStatus('thinking');
            }
          },
          onclose: () => stopSession(),
          onerror: (err: any) => {
            handleError(err, ErrorType.GEMINI, { context: 'Live session error' });
            stopSession();
          }
        }
      });
      sessionRef.current = session;
    } catch (err) {
      handleError(err, ErrorType.GEMINI, { context: 'Live session start' });
      setIsConnecting(false);
      setStatus('idle');
    }
  }, [stopSession, playNext, isActive, isConnecting]);

  return { isActive, isConnecting, status, startSession, stopSession, modelTranscript, userTranscript, conversation, volume };
}
