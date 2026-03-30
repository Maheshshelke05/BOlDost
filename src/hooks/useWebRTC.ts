import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  doc, 
  setDoc, 
  onSnapshot, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  query,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { User } from 'firebase/auth';
import { OperationType } from '../types';
import { toast } from 'sonner';

const servers = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
  ],
  iceCandidatePoolSize: 10,
};

export function useWebRTC(user: User | null) {
  const [activeCall, setActiveCall] = useState<any>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'ringing' | 'connected' | 'ended'>('idle');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string | null>(null);

  // Initialize PeerConnection
  const initPC = useCallback(async () => {
    const pc = new RTCPeerConnection(servers);
    pcRef.current = pc;

    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }, 
      video: false 
    });
    localStreamRef.current = stream;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    return pc;
  }, []);

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'calls'), 
      where('receiverId', '==', user.uid), 
      where('status', '==', 'ringing')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        if (change.type === 'added') {
          setIncomingCall({ id: change.doc.id, ...data });
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'calls');
    });

    return () => unsubscribe();
  }, [user]);

  // Listen for active call updates
  useEffect(() => {
    if (!activeCall?.id) return;

    const unsubscribe = onSnapshot(doc(db, 'calls', activeCall.id), (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      
      if (data.status === 'accepted' && pcRef.current?.signalingState === 'have-local-offer') {
        pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setCallStatus('connected');
      }
      if (data.status === 'rejected' || data.status === 'ended') {
        hangup();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `calls/${activeCall.id}`);
    });

    return () => unsubscribe();
  }, [activeCall?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callIdRef.current) {
        updateDoc(doc(db, 'calls', callIdRef.current), { status: 'ended' }).catch(() => {});
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  const startCall = async (receiverId: string) => {
    const pc = await initPC();
    const callDoc = doc(collection(db, 'calls'));
    callIdRef.current = callDoc.id;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(collection(db, 'calls', callDoc.id, 'callerCandidates'), event.candidate.toJSON());
      }
    };

    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
      type: offerDescription.type,
      sdp: offerDescription.sdp,
    };

    await setDoc(callDoc, {
      callerId: user!.uid,
      receiverId,
      offer,
      status: 'ringing',
      timestamp: Date.now(),
    });

    // Listen for receiver candidates
    onSnapshot(collection(db, 'calls', callDoc.id, 'receiverCandidates'), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          pc.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `calls/${callDoc.id}/receiverCandidates`);
    });

    setActiveCall({ id: callDoc.id, receiverId });
    setCallStatus('ringing');

    // Timeout if no one answers in 30 seconds
    setTimeout(async () => {
      const snap = await getDoc(callDoc);
      if (snap.exists() && snap.data().status === 'ringing') {
        await updateDoc(callDoc, { status: 'ended' });
        toast.error("Call timed out. No answer.");
      }
    }, 30000);
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    const pc = await initPC();
    const callDoc = doc(db, 'calls', incomingCall.id);
    callIdRef.current = incomingCall.id;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(collection(db, 'calls', incomingCall.id, 'receiverCandidates'), event.candidate.toJSON());
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await updateDoc(callDoc, { answer, status: 'accepted' });

    // Listen for caller candidates
    onSnapshot(collection(db, 'calls', incomingCall.id, 'callerCandidates'), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          pc.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `calls/${incomingCall.id}/callerCandidates`);
    });

    setActiveCall(incomingCall);
    setIncomingCall(null);
    setCallStatus('connected');
  };

  const rejectCall = async () => {
    if (!incomingCall) return;
    await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'rejected' });
    setIncomingCall(null);
  };

  const hangup = async () => {
    const id = callIdRef.current;
    if (id) {
      await updateDoc(doc(db, 'calls', id), { status: 'ended' });
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
    }
    
    pcRef.current = null;
    localStreamRef.current = null;
    callIdRef.current = null;
    setActiveCall(null);
    setIncomingCall(null);
    setCallStatus('idle');
    setRemoteStream(null);
  };

  return { startCall, acceptCall, rejectCall, hangup, activeCall, incomingCall, callStatus, remoteStream };
}
