import { useState, useEffect } from 'react';
import { 
  doc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { User } from 'firebase/auth';
import { OperationType } from '../types';

export interface Presence {
  uid: string;
  displayName: string;
  photoURL: string;
  lastSeen: number;
  status: 'online' | 'busy' | 'dnd';
}

export function usePresence(user: User | null) {
  const [onlineUsers, setOnlineUsers] = useState<Presence[]>([]);

  useEffect(() => {
    if (!user) {
      setOnlineUsers([]);
      return;
    }

    // Set own presence
    const presenceRef = doc(db, 'presence', user.uid);
    const setOnline = async () => {
      await setDoc(presenceRef, {
        uid: user.uid,
        displayName: user.displayName || 'Anonymous',
        photoURL: user.photoURL || '',
        lastSeen: Date.now(),
        status: 'online'
      });
    };

    setOnline();
    const interval = setInterval(setOnline, 30000); // Update every 30s

    // Cleanup on unmount or logout
    const cleanup = async () => {
      clearInterval(interval);
      try {
        await deleteDoc(presenceRef);
      } catch (e) {
        console.error("Error cleaning up presence", e);
      }
    };

    // Listen to other online users
    const q = query(
      collection(db, 'presence'),
      where('uid', '!=', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as Presence);
      // Filter out stale users (older than 2 mins)
      const now = Date.now();
      setOnlineUsers(users.filter(u => now - u.lastSeen < 120000));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'presence');
    });

    window.addEventListener('beforeunload', cleanup);

    return () => {
      cleanup();
      unsubscribe();
      window.removeEventListener('beforeunload', cleanup);
    };
  }, [user]);

  const setStatus = async (status: 'online' | 'busy' | 'dnd') => {
    if (!user) return;
    const presenceRef = doc(db, 'presence', user.uid);
    await setDoc(presenceRef, {
      uid: user.uid,
      displayName: user.displayName || 'Anonymous',
      photoURL: user.photoURL || '',
      lastSeen: Date.now(),
      status
    });
  };

  return { onlineUsers, setStatus };
}
