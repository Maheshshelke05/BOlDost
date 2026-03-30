import { useState, useCallback, useRef } from 'react';

import { handleError, ErrorType } from '../lib/error-handler';

export function useSpeech() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      handleError('Speech recognition not supported', ErrorType.SPEECH);
      return;
    }

    try {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        handleError(event.error, ErrorType.SPEECH);
        setIsListening(false);
      };
      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcriptValue = event.results[current][0].transcript;
        setTranscript(transcriptValue);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      handleError(error, ErrorType.SPEECH);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const speak = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, []);

  return { isListening, transcript, startListening, stopListening, speak, setTranscript };
}
