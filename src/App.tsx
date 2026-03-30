import React, { useState, useEffect, useRef } from 'react';
import LandingPage from './LandingPage';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { handleError, ErrorType } from './lib/error-handler';
import { 
  Home, 
  Mic, 
  MessageCircle, 
  Flame, 
  Trophy, 
  ArrowRight,
  User as UserIcon,
  BookOpen,
  Sparkles,
  Volume2,
  X,
  ChevronRight,
  PhoneCall,
  PhoneOff,
  Activity,
  LogOut,
  LogIn,
  AlertCircle,
  Copy,
  Users,
  Phone,
  Zap,
  PhoneIncoming,
  Clock,
  Shield,
  Brain,
  Search,
  Target,
  Award,
  TrendingUp,
  CalendarDays,
  BadgeCheck,
  AlertTriangle,
  RefreshCcw,
  XCircle,
  Flag,
  Ban,
  BellOff
} from 'lucide-react';
import { cn } from './lib/utils';
import { UserStats, Feedback, ChatMessage, OperationType, ChatCoachMode, LearnerLevel, SupportLanguage, TargetGoal } from './types';
import { analyzeSpeaking, getChatResponse } from './services/gemini';
import { useLiveSession, LiveMessage } from './hooks/useLiveSession';
import { usePresence } from './hooks/usePresence';
import { useWebRTC } from './hooks/useWebRTC';
import ReactMarkdown from 'react-markdown';
import { CHAT_COACH_MODES, DAILY_GOAL_OPTIONS, LEARNER_LEVELS, PRACTICE_TOPICS, SUPPORT_LANGUAGES, TARGET_GOALS, VOICE_CONFIGS, WEEKLY_CHALLENGES } from './constants';
import { computeLearningInsight, computeLiveMetrics, filterTranscriptRecords, getRecommendedTopic, getStarterTopicByLevel } from './lib/learning';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { 
  auth, 
  db, 
  googleProvider, 
  handleFirestoreError
} from './firebase';

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4 bg-red-50">
          <AlertCircle size={48} className="text-red-500" />
          <h1 className="text-2xl font-bold text-red-900">Something went wrong</h1>
          <p className="text-red-700 max-w-xs mx-auto">
            {this.state.error?.message || "An unexpected error occurred. Please try refreshing the app."}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-2xl font-bold"
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Main App ---

const ProgressBar = ({ value, max }: { value: number; max: number }) => (
  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: `${(value / max) * 100}%` }}
      className="bg-brand-primary h-full rounded-full"
    />
  </div>
);

const StatBadge = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) => (
  <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border", color)}>
    <Icon size={16} />
    <span className="text-sm font-bold">{value}</span>
    <span className="text-xs opacity-70">{label}</span>
  </div>
);

const getPartnerMeta = (uid: string) => {
  const levelCycle: LearnerLevel[] = ['beginner', 'intermediate', 'advanced'];
  const goalCycle: TargetGoal[] = ['conversation', 'job', 'travel', 'confidence', 'exam'];
  const hash = uid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return {
    learnerLevel: levelCycle[hash % levelCycle.length],
    targetGoal: goalCycle[hash % goalCycle.length],
    safeScore: 82 + (hash % 17),
    commonTopics: PRACTICE_TOPICS.slice(hash % 4, (hash % 4) + 2).map((topic) => topic.title),
  };
};

// --- Main App ---

export default function App() {
  return (
    <ErrorBoundary>
      <BolDostApp />
    </ErrorBoundary>
  );
}

function BolDostApp() {
  const [showLanding, setShowLanding] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'live' | 'settings' | 'community'>('home');
  const [stats, setStats] = useState<UserStats>({
    xp: 0,
    streak: 0,
    level: 1,
    dailyGoalMinutes: 5,
    minutesPracticedToday: 0
  });

  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [loadingTranscripts, setLoadingTranscripts] = useState(false);
  const [livePrompt, setLivePrompt] = useState<string | undefined>(undefined);
  const { 
    isActive: isLiveActive, 
    isConnecting: isLiveConnecting, 
    status: liveStatus,
    startSession: startLiveSession, 
    stopSession: stopLive, 
    modelTranscript: liveModelTranscript,
    userTranscript: liveUserTranscript,
    volume: liveVolume,
    conversation
  } = useLiveSession();

  const { onlineUsers, setStatus } = usePresence(user);
  const { startCall, acceptCall, rejectCall, hangup, activeCall, incomingCall, callStatus, remoteStream } = useWebRTC(user);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const startLive = (prompt?: string) => {
    setLivePrompt(prompt);
    startLiveSession(selectedVoice, prompt);
  };
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [showSaveTranscript, setShowSaveTranscript] = useState(false);
  const [lastConversation, setLastConversation] = useState<LiveMessage[]>([]);
  const [isSavingTranscript, setIsSavingTranscript] = useState(false);
  const [chatMode, setChatMode] = useState<ChatCoachMode>('coach');
  const [historySearch, setHistorySearch] = useState('');
  const [communityFilter, setCommunityFilter] = useState<'all' | LearnerLevel>('all');
  const [preferredLanguage, setPreferredLanguage] = useState<SupportLanguage>('mixed');
  const [targetGoal, setTargetGoal] = useState<TargetGoal>('conversation');
  const [learnerLevel, setLearnerLevel] = useState<LearnerLevel>('beginner');
  const [selectedTopicId, setSelectedTopicId] = useState<string>(PRACTICE_TOPICS[0].id);
  const [liveFeedback, setLiveFeedback] = useState<Feedback | null>(null);
  const [isAnalyzingLive, setIsAnalyzingLive] = useState(false);
  const [retryQueue, setRetryQueue] = useState<{ id: string; text: string; createdAt: number }[]>([]);
  const [selectedTranscript, setSelectedTranscript] = useState<any | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [reportedUserIds, setReportedUserIds] = useState<string[]>([]);
  const [isDnd, setIsDnd] = useState(false);

  // Handle remote audio
  useEffect(() => {
    if (remoteStream && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Update presence status when in call
  useEffect(() => {
    if (callStatus === 'connected') {
      setStatus('busy');
    } else if (isDnd) {
      setStatus('dnd');
    } else {
      setStatus('online');
    }
  }, [callStatus, isDnd]);

  // Auto-reject incoming calls when DND is on
  useEffect(() => {
    if (isDnd && incomingCall) {
      rejectCall();
    }
  }, [incomingCall, isDnd]);
  const progressPercent = Math.min(100, (stats.minutesPracticedToday / Math.max(stats.dailyGoalMinutes, 1)) * 100);
  const selectedVoiceConfig = VOICE_CONFIGS.find(v => v.id === selectedVoice);
  const firstName = user?.displayName?.split(' ')[0] || 'User';
  const selectedTopic = PRACTICE_TOPICS.find((topic) => topic.id === selectedTopicId) || PRACTICE_TOPICS[0];
  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'live', icon: PhoneCall, label: 'Speaking' },
    { id: 'community', icon: Users, label: 'Community' },
    { id: 'chat', icon: MessageCircle, label: 'Chat' },
    { id: 'settings', icon: UserIcon, label: 'Profile' }
  ] as const;
  const filteredTranscripts = filterTranscriptRecords(transcripts, historySearch);
  const learningInsight = computeLearningInsight(transcripts, chatMessages);
  const averageSpeakingScore = learningInsight.averageScore;
  // Only show focus words from live session transcripts, not chat (avoids garbage words)
  const focusWords = computeLearningInsight(transcripts, []).focusWords.slice(0, 3);
  const recommendedTopic = getRecommendedTopic(PRACTICE_TOPICS, selectedTopic.id, learnerLevel, targetGoal);
  const achievements = [
    { label: 'Consistency Star', detail: `${stats.streak} day streak running`, unlocked: stats.streak >= 3 },
    { label: 'Practice Builder', detail: `${transcripts.length} saved sessions reviewed`, unlocked: transcripts.length >= 2 },
    { label: 'XP Explorer', detail: `${stats.xp} XP collected`, unlocked: stats.xp >= 100 },
  ];
  const weakArea = learningInsight.weakestMetric;
  const nextAction =
    weakArea === 'confidenceScore'
      ? 'Start a 5-minute live topic and answer in full sentences.'
      : weakArea === 'fluencyScore'
        ? 'Do one guided speaking session on an easy topic and avoid long pauses.'
        : 'Use Grammar Fix mode in chat before your next live call.';
  const communityUsers = onlineUsers
    .map((person) => ({ ...person, ...getPartnerMeta(person.uid) }))
    .filter((person) => !blockedUserIds.includes(person.uid))
    .filter((person) => communityFilter === 'all' || person.learnerLevel === communityFilter);
  const liveMetrics = computeLiveMetrics(conversation);

  const liveStartTimeRef = useRef<number | null>(null);

  // --- Auth & Data Sync ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthLoading(false);

      if (firebaseUser) {
        // Fetch or Initialize User Stats
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          const today = new Date().toISOString().split('T')[0];

          if (userDoc.exists()) {
            const data = userDoc.data();
            const lastPracticeDate = data.lastPracticeDate || "";
            const isNewDay = lastPracticeDate !== today;

            // Streak logic: increment if practiced yesterday, reset if missed a day
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayKey = yesterday.toISOString().split('T')[0];
            let newStreak = data.streak || 0;
            if (isNewDay) {
              if (lastPracticeDate === yesterdayKey) {
                // practiced yesterday, streak continues (will increment on first practice today)
              } else if (lastPracticeDate && lastPracticeDate !== today) {
                // missed a day, reset streak
                newStreak = 0;
              }
            }
            
            const currentStats: UserStats = {
              xp: data.xp || 0,
              streak: newStreak,
              level: Math.floor((data.xp || 0) / 500) + 1,
              dailyGoalMinutes: data.dailyGoalMinutes || 5,
              minutesPracticedToday: isNewDay ? 0 : (data.minutesPracticedToday || 0),
              lastPracticeDate: data.lastPracticeDate || '',
              learnerLevel: data.learnerLevel || 'beginner',
              targetGoal: data.targetGoal || 'conversation',
              supportLanguage: data.supportLanguage || 'mixed',
              currentTopicId: data.currentTopicId || PRACTICE_TOPICS[0].id,
            };
            
            setStats(currentStats);
            setLearnerLevel(currentStats.learnerLevel || 'beginner');
            setTargetGoal(currentStats.targetGoal || 'conversation');
            setPreferredLanguage(currentStats.supportLanguage || 'mixed');
            setSelectedTopicId(currentStats.currentTopicId || PRACTICE_TOPICS[0].id);
            if (data.selectedVoice) setSelectedVoice(data.selectedVoice);
            
            if (isNewDay) {
              await updateDoc(userDocRef, {
                lastPracticeDate: today,
                minutesPracticedToday: 0,
                streak: newStreak,
                level: Math.floor((data.xp || 0) / 500) + 1,
              });
            }
          } else {
            const initialStats: UserStats = {
              xp: 0,
              streak: 0,
              level: 1,
              dailyGoalMinutes: 5,
              minutesPracticedToday: 0,
              learnerLevel: 'beginner',
              targetGoal: 'conversation',
              supportLanguage: 'mixed',
              currentTopicId: PRACTICE_TOPICS[0].id,
            };
            await setDoc(userDocRef, {
              ...initialStats,
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              lastPracticeDate: today,
              selectedVoice: 'Zephyr',
            });
            setStats(initialStats);
            setLearnerLevel('beginner');
            setTargetGoal('conversation');
            setPreferredLanguage('mixed');
            setSelectedTopicId(PRACTICE_TOPICS[0].id);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }

        // Fetch Chat History
        const chatQuery = query(
          collection(db, 'users', firebaseUser.uid, 'chatHistory'),
          orderBy('timestamp', 'asc'),
          limit(50)
        );
        const unsubChat = onSnapshot(chatQuery, (snapshot) => {
          const messages = snapshot.docs.map(doc => doc.data() as ChatMessage);
          if (messages.length === 0) {
            setChatMessages([{ id: 'welcome', role: 'assistant', content: `Welcome ${firebaseUser.displayName?.split(' ')[0]}! I am BolDost. Ready to practice English today?`, timestamp: Date.now() }]);
          } else {
            setChatMessages(messages);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, `users/${firebaseUser.uid}/chatHistory`);
        });

        return () => unsubChat();
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    const savedDraft = localStorage.getItem('boldost-chat-draft');
    const savedQueue = localStorage.getItem('boldost-chat-retry-queue');
    const savedBlocked = localStorage.getItem('boldost-blocked-users');
    const savedReported = localStorage.getItem('boldost-reported-users');

    if (savedDraft) setChatInput(savedDraft);
    if (savedQueue) setRetryQueue(JSON.parse(savedQueue));
    if (savedBlocked) setBlockedUserIds(JSON.parse(savedBlocked));
    if (savedReported) setReportedUserIds(JSON.parse(savedReported));
  }, []);

  useEffect(() => {
    localStorage.setItem('boldost-chat-draft', chatInput);
  }, [chatInput]);

  useEffect(() => {
    localStorage.setItem('boldost-chat-retry-queue', JSON.stringify(retryQueue));
  }, [retryQueue]);

  useEffect(() => {
    localStorage.setItem('boldost-blocked-users', JSON.stringify(blockedUserIds));
  }, [blockedUserIds]);

  useEffect(() => {
    localStorage.setItem('boldost-reported-users', JSON.stringify(reportedUserIds));
  }, [reportedUserIds]);

  useEffect(() => {
    if (isLiveActive) {
      liveStartTimeRef.current = Date.now();
      setLiveFeedback(null);
    } else if (liveStartTimeRef.current) {
      const endTime = Date.now();
      const durationMs = endTime - liveStartTimeRef.current;
      const durationMinutes = durationMs / (1000 * 60);
      
      if (durationMinutes > 0.01) { // Only track if more than ~0.6 seconds
        updatePracticeStats(durationMinutes);
      }
      liveStartTimeRef.current = null;

      // Offer to save transcript if there was a conversation
      if (conversation.length > 0) {
        setLastConversation(conversation);
        setShowSaveTranscript(true);

        const userSummary = conversation
          .filter((msg) => msg.role === 'user')
          .map((msg) => msg.text)
          .join(' ');

        if (userSummary.trim()) {
          setIsAnalyzingLive(true);
          analyzeSpeaking(userSummary, selectedTopic.title)
            .then((feedback) => setLiveFeedback(feedback))
            .catch(() => {
              setLiveFeedback({
                original: userSummary,
                corrected: userSummary,
                explanation: 'Session ended well. Try speaking in slightly longer complete sentences next time.',
                fluencyScore: 70,
                confidenceScore: 72,
                grammarScore: 68,
              });
            })
            .finally(() => setIsAnalyzingLive(false));
        }
      }
    }
  }, [isLiveActive, conversation, selectedTopic.title]);

  const updatePracticeStats = async (minutes: number) => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    const isNewDay = stats.lastPracticeDate !== today;
    
    const newMinutes = isNewDay ? minutes : stats.minutesPracticedToday + minutes;
    const newXp = stats.xp + Math.floor(minutes * 10);
    const newLevel = Math.floor(newXp / 500) + 1;

    // Increment streak only once per day (on first practice of the day)
    const newStreak = isNewDay ? stats.streak + 1 : stats.streak;
    
    const updatedStats = {
      ...stats,
      minutesPracticedToday: newMinutes,
      xp: newXp,
      level: newLevel,
      streak: newStreak,
      lastPracticeDate: today
    };
    
    setStats(updatedStats);
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        minutesPracticedToday: newMinutes,
        xp: newXp,
        level: newLevel,
        streak: newStreak,
        lastPracticeDate: today
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const toggleDnd = async () => {
    const next = !isDnd;
    setIsDnd(next);
    await setStatus(next ? 'dnd' : 'online');
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      handleError(error, ErrorType.AUTH);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveTab('home');
    } catch (error) {
      handleError(error, ErrorType.AUTH);
    }
  };

  // Fetch transcripts for history
  useEffect(() => {
    if (!user) return;

    const fetchTranscripts = async () => {
      setLoadingTranscripts(true);
      try {
        const q = query(
          collection(db, 'users', user.uid, 'liveTranscripts'),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTranscripts(docs);
      } catch (error) {
        console.error("Error fetching transcripts:", error);
      } finally {
        setLoadingTranscripts(false);
      }
    };

    if (activeTab === 'settings' || activeTab === 'home') {
      fetchTranscripts();
    }
  }, [user, activeTab]);

  const saveTranscript = async () => {
    if (!user || lastConversation.length === 0) return;
    setIsSavingTranscript(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'liveTranscripts'), {
        userId: user.uid,
        timestamp: Date.now(),
        messages: lastConversation,
        topicId: selectedTopic.id,
        topicTitle: selectedTopic.title,
        feedback: liveFeedback,
      });
      setShowSaveTranscript(false);
      setLastConversation([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/liveTranscripts`);
    } finally {
      setIsSavingTranscript(false);
    }
  };

  const updateStats = async (xpGain: number, minutesGain: number) => {
    if (!user) return;
    const newXp = stats.xp + xpGain;
    const newStats = {
      ...stats,
      xp: newXp,
      minutesPracticedToday: stats.minutesPracticedToday + minutesGain,
      level: Math.floor(newXp / 500) + 1
    };
    setStats(newStats);
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        xp: newStats.xp,
        minutesPracticedToday: newStats.minutesPracticedToday,
        level: newStats.level,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const savePreferences = async (updates: Partial<UserStats> & { selectedVoice?: string }) => {
    if (!user) return;

    const nextStats = { ...stats, ...updates };
    setStats(nextStats);

    try {
      await updateDoc(doc(db, 'users', user.uid), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const buildChatPrompt = (input: string) => {
    const modeInstruction =
      chatMode === 'grammar'
        ? 'Correct my grammar clearly. Reply with sections: Better sentence, Why, Try saying this.'
        : chatMode === 'interview'
          ? 'Act like an interview coach. Ask follow-up questions and improve my answer.'
          : chatMode === 'translation'
            ? 'If I write in Hindi or Marathi, translate it into natural spoken English and explain why.'
            : 'Coach me naturally and help me speak better English.';

    return `Learner level: ${learnerLevel}. Target goal: ${targetGoal}. Support language: ${preferredLanguage}. Coaching mode: ${chatMode}. ${modeInstruction}\n\nUser message: ${input}`;
  };

  const retryQueuedMessage = (queuedId: string, text: string) => {
    setRetryQueue((current) => current.filter((item) => item.id !== queuedId));
    setChatInput(text);
    setActiveTab('chat');
  };

  const handleChatSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || !user) return;

    const queuedText = chatInput;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: queuedText, timestamp: Date.now() };
    
    try {
      try {
        await addDoc(collection(db, 'users', user.uid, 'chatHistory'), userMsg);
      } catch (dbError) {
        handleFirestoreError(dbError, OperationType.CREATE, `users/${user.uid}/chatHistory`);
      }
      
      setChatInput('');
      setIsChatLoading(true);

      const response = await getChatResponse(chatMessages, buildChatPrompt(queuedText));
      const assistantMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: response, timestamp: Date.now() };
      
      try {
        await addDoc(collection(db, 'users', user.uid, 'chatHistory'), assistantMsg);
      } catch (dbError) {
        handleFirestoreError(dbError, OperationType.CREATE, `users/${user.uid}/chatHistory`);
      }

      await updateStats(8, 1);
    } catch (error) {
      setRetryQueue((current) => [...current, { id: userMsg.id, text: queuedText, createdAt: Date.now() }]);
      setChatInput(queuedText);
      handleError(error, ErrorType.UNKNOWN, { context: 'Chat submission' });
    } finally {
      setIsChatLoading(false);
    }
  };

  const renderHome = () => (
    <div className="space-y-8 pb-10">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="app-shell relative overflow-hidden p-6 lg:p-8">
          <div className="absolute -left-10 top-10 h-36 w-36 rounded-full bg-brand-secondary/20 blur-3xl" />
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-brand-accent/20 blur-3xl" />
          <div className="relative z-10 space-y-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 overflow-hidden rounded-[22px] bg-brand-primary/10 ring-4 ring-white/70">
                  <img
                    src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`}
                    alt="Profile"
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-brand-primary">Welcome back</p>
                  <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 lg:text-4xl">
                    Welcome, {firstName}
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                    Today&apos;s dashboard brings live practice, smart chat, and progress tracking into one cleaner website layout.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <StatBadge icon={Sparkles} label="Level" value={stats.level} color="border-brand-primary/15 bg-white/75 text-brand-primary" />
                <button
                  onClick={() => setActiveTab('settings')}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-500 shadow-sm transition-all hover:text-brand-primary"
                >
                  <UserIcon size={20} />
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="soft-panel p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-500">
                    <Flame size={20} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-[0.24em] text-orange-500">Daily streak</span>
                </div>
                <p className="font-display text-4xl font-extrabold text-slate-900">{stats.streak}</p>
                <p className="mt-2 text-sm text-slate-500">Keep the learning chain active every day.</p>
              </div>

              <div className="soft-panel p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                    <Trophy size={20} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-[0.24em] text-sky-600">Sessions</span>
                </div>
                <p className="font-display text-4xl font-extrabold text-slate-900">{transcripts.length}</p>
                <p className="mt-2 text-sm text-slate-500">Total live sessions you have completed so far.</p>
              </div>

              <div className="soft-panel p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
                    <Sparkles size={20} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-[0.24em] text-brand-primary">XP earned</span>
                </div>
                <p className="font-display text-4xl font-extrabold text-slate-900">{stats.xp}</p>
                <p className="mt-2 text-sm text-slate-500">Small progress markers that keep practice motivating.</p>
              </div>
            </div>

            <div
              onClick={() => setActiveTab('live')}
              className="group relative cursor-pointer overflow-hidden rounded-[32px] border border-brand-primary/10 bg-[linear-gradient(135deg,rgba(19,93,102,0.96),rgba(37,120,110,0.93))] p-6 text-white shadow-[0_24px_58px_rgba(19,93,102,0.18)] transition-all duration-300 hover:-translate-y-1"
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute bottom-0 left-12 h-24 w-24 rounded-full bg-brand-secondary/20 blur-2xl" />
              <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-white/10 bg-white/15 px-4 py-1 text-[10px] font-black uppercase tracking-[0.3em]">
                      Live speaking room
                    </span>
                    <div className="flex gap-1">
                      {[1, 2, 3].map(i => (
                        <motion.div
                          key={i}
                          animate={{ height: [4, 12, 4] }}
                          transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.15 }}
                          className="w-1 rounded-full bg-white/70"
                        />
                      ))}
                    </div>
                  </div>
                  <h2 className="text-3xl font-black tracking-tight lg:text-4xl">Talk with BolDost like a real conversation partner</h2>
                  <p className="max-w-xl text-sm leading-6 text-white/75">
                    Real-time AI voice practice with guided topics, smoother feedback flow, and a bigger website-style stage.
                  </p>
                </div>

                <div className="flex items-center gap-4 self-start rounded-[28px] border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-white/15">
                    <PhoneCall size={28} />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/60">Tap to start</p>
                    <p className="mt-1 text-lg font-black">Voice practice</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="soft-panel p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-brand-primary">Daily goal tracker</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Stay consistent with short sessions</h3>
                </div>
                <div className="rounded-[24px] bg-white/70 px-4 py-3 text-right shadow-sm">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Today</p>
                  <p className="font-display text-3xl font-extrabold text-brand-primary">
                    {stats.minutesPracticedToday}
                    <span className="ml-1 text-base font-bold text-slate-400">/ {stats.dailyGoalMinutes} min</span>
                  </p>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-full bg-slate-200/80">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  className="h-4 rounded-full bg-gradient-to-r from-brand-primary via-[#2d8b78] to-brand-accent"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Learning compass</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight">What to improve next</h3>
              </div>
              <Target size={20} className="text-brand-primary" />
            </div>

            <div className="rounded-[28px] bg-brand-dark p-5 text-white">
              <p className="text-xs uppercase tracking-[0.24em] text-white/55">Next best action</p>
              <p className="mt-3 text-lg font-black">{nextAction}</p>
              <p className="mt-3 text-sm text-white/70">Current weak area: {weakArea.replace('Score', '')}</p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="soft-panel p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Speaking avg</p>
                <p className="mt-2 font-display text-3xl font-extrabold text-slate-900">{averageSpeakingScore || '--'}</p>
              </div>
              <div className="soft-panel p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Focus words</p>
                <p className="mt-2 text-sm font-bold text-slate-900">{focusWords.join(', ') || 'confidence, grammar, fluency'}</p>
              </div>
              <div className="soft-panel p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Recommended topic</p>
                <p className="mt-2 text-sm font-bold text-slate-900">{recommendedTopic.title}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Quick actions</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight">Choose how you want to practice</h3>
              </div>
              <Sparkles size={20} className="text-brand-primary" />
            </div>

            <div className="space-y-3">
              {[
                { icon: MessageCircle, title: 'AI Chat Tutor', desc: 'Ask doubts or practice messages', tab: 'chat' as const },
                { icon: PhoneCall, title: 'Live Speaking', desc: 'Start a voice conversation instantly', tab: 'live' as const },
                { icon: Users, title: 'Community Mode', desc: 'Connect with other learners', tab: 'community' as const },
              ].map((item) => (
                <button
                  key={item.title}
                  onClick={() => setActiveTab(item.tab)}
                  className="flex w-full items-center gap-4 rounded-[24px] border border-slate-200/70 bg-white px-4 py-4 text-left transition-all hover:border-brand-primary/25 hover:bg-brand-primary/[0.03]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
                    <item.icon size={22} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                  <ChevronRight size={20} className="text-slate-300" />
                </button>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Voice setup</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight">Current speaking assistant</h3>
              </div>
              <Volume2 size={20} className="text-brand-accent" />
            </div>

            <div className="rounded-[28px] bg-brand-dark p-5 text-white">
              <p className="text-xs uppercase tracking-[0.26em] text-white/55">Selected voice</p>
              <p className="mt-2 font-display text-3xl font-extrabold">{selectedVoiceConfig?.name || selectedVoice}</p>
              <p className="mt-3 text-sm leading-6 text-white/70">{selectedVoiceConfig?.description}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-brand-secondary">{selectedVoiceConfig?.detail}</p>
            </div>

            <div className="mt-4 grid gap-3">
              {achievements.map((achievement) => (
                <div key={achievement.label} className={cn("flex items-center gap-3 rounded-[22px] px-4 py-3", achievement.unlocked ? "bg-brand-accent/10 text-slate-900" : "bg-slate-100 text-slate-500")}>
                  <Award size={18} className={achievement.unlocked ? "text-brand-accent" : "text-slate-400"} />
                  <div>
                    <p className="text-sm font-bold">{achievement.label}</p>
                    <p className="text-xs">{achievement.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Real-world topics</p>
            <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Start with a guided scenario</h3>
          </div>
          <span className="hidden rounded-full bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-brand-primary shadow-sm md:block">
            Click any topic
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {PRACTICE_TOPICS.map((topic) => (
            <motion.button
              key={topic.id}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                setSelectedTopicId(topic.id);
                savePreferences({ currentTopicId: topic.id });
                setActiveTab('live');
                startLive(topic.prompt);
              }}
                className="card group p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(15,23,42,0.08)]"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-slate-100 text-slate-500 transition-colors group-hover:bg-brand-primary/10 group-hover:text-brand-primary">
                  <topic.icon size={28} />
                </div>
                <ChevronRight size={22} className="text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-primary" />
              </div>
              <h4 className="text-xl font-black tracking-tight text-slate-900">{topic.title}</h4>
              <p className="mt-3 text-sm leading-7 text-slate-600">{topic.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-brand-primary">{topic.difficulty}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{topic.milestone}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="flex h-full flex-col gap-5 pb-4">
      <div className="card flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveTab('home')} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <X size={20} />
          </button>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-brand-primary">AI chat room</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Chat with BolDost</h2>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-brand-accent/20 bg-brand-accent/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-brand-accent md:flex">
          <span className="h-2 w-2 rounded-full bg-brand-accent animate-pulse" /> Online
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.42fr]">
        <div className="card p-4">
          <div className="mb-4 flex items-center gap-3 overflow-x-auto no-scrollbar">
            {CHAT_COACH_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setChatMode(mode.id)}
                className={cn(
                  "flex min-w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] transition-all",
                  chatMode === mode.id ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "bg-slate-100 text-slate-500"
                )}
              >
                <mode.icon size={14} />
                {mode.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="soft-panel p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Mode</p>
              <p className="mt-2 text-sm font-bold text-slate-900">{CHAT_COACH_MODES.find((mode) => mode.id === chatMode)?.description}</p>
            </div>
            <div className="soft-panel p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Level</p>
              <p className="mt-2 text-sm font-bold text-slate-900">{learnerLevel}</p>
            </div>
            <div className="soft-panel p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Goal</p>
              <p className="mt-2 text-sm font-bold text-slate-900">{targetGoal}</p>
            </div>
          </div>
        </div>

        <div className="card p-4 xl:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Brain size={18} className="text-brand-primary" />
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Quick drills</p>
          </div>
          <div className="space-y-2">
            {selectedTopic.starterPrompts.slice(0, 3).map((prompt) => (
              <button
                key={prompt}
                onClick={() => setChatInput(prompt)}
                className="w-full rounded-[20px] bg-slate-100 px-3 py-3 text-left text-xs font-semibold text-slate-600 transition-all hover:bg-brand-primary/10 hover:text-brand-primary"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {retryQueue.length > 0 && (
        <div className="card border border-amber-200 bg-amber-50/70 p-4">
          <div className="mb-3 flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-600" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">Retry queue</p>
              <p className="text-sm text-amber-800">These messages were saved locally because the AI request failed.</p>
            </div>
          </div>
          <div className="space-y-2">
            {retryQueue.slice(-3).reverse().map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-[18px] bg-white/80 px-3 py-3">
                <div className="flex-1 text-sm text-slate-700 line-clamp-1">{item.text}</div>
                <button onClick={() => retryQueuedMessage(item.id, item.text)} className="btn-secondary px-4 py-2 text-xs">
                  Retry
                </button>
                <button onClick={() => setRetryQueue((current) => current.filter((queued) => queued.id !== item.id))} className="rounded-full bg-slate-100 p-2 text-slate-500">
                  <XCircle size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card flex-1 overflow-hidden p-4 lg:p-5">
        <div className="flex h-full flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto pr-2 no-scrollbar">
        {chatMessages.map((msg) => (
          <motion.div 
            key={msg.id}
            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "max-w-[88%] p-4 rounded-[24px] text-sm leading-7",
              msg.role === 'user' 
                ? "ml-auto self-end rounded-tr-md bg-brand-primary text-white shadow-lg shadow-brand-primary/10" 
                : "self-start rounded-tl-md border border-slate-200 bg-[#fcfbf8] text-slate-800 shadow-sm"
            )}
          >
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </motion.div>
        ))}
        {isChatLoading && (
          <div className="w-16 rounded-[22px] rounded-tl-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex gap-1">
            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
          </div>
          </div>
        )}
        <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleChatSubmit} className="mt-4 flex gap-3">
            <input 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={CHAT_COACH_MODES.find((mode) => mode.id === chatMode)?.placeholder || "Type in English or Hindi..."}
              className="min-h-14 flex-1 rounded-2xl border border-slate-200 bg-[#fcfbf8] px-5 py-3 text-sm shadow-sm outline-none transition-all focus:border-brand-primary/30 focus:ring-4 focus:ring-brand-primary/10"
            />
            <button 
              type="submit"
              disabled={!chatInput.trim() || isChatLoading}
              className="btn-primary flex h-14 w-14 items-center justify-center rounded-2xl p-0 disabled:opacity-50"
            >
              <ArrowRight size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  const renderLive = () => (
    <div className="relative flex h-full flex-col items-center justify-center space-y-8 px-0 pb-6">
      <div className="card flex w-full items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <button onClick={() => { stopLive(); setActiveTab('home'); }} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><X size={20} /></button>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-brand-primary">Voice studio</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Live speaking with BolDost</h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{selectedTopic.title} • {selectedTopic.difficulty}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className={cn("w-2 h-2 rounded-full", isLiveActive ? "bg-green-500 animate-pulse" : "bg-gray-300")} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{liveStatus}</span>
        </div>
      </div>

      <div className="app-shell relative flex w-full flex-col items-center justify-center overflow-hidden p-8 lg:p-10">
        <div className="absolute inset-x-20 top-0 h-28 rounded-full bg-brand-primary/10 blur-3xl" />
        <div className="absolute bottom-0 h-28 w-40 rounded-full bg-brand-secondary/20 blur-3xl" />
      <div className="relative flex items-center justify-center">
        <AnimatePresence>
          {isLiveActive && (
            <>
              {/* Dynamic Volume Pulse */}
              <motion.div 
                animate={{ scale: 1 + (liveVolume / 100) * 1.5, opacity: 0.1 + (liveVolume / 100) * 0.2 }}
                className="absolute inset-0 bg-brand-primary rounded-full w-48 h-48"
              />
              <motion.div 
                animate={{ scale: 1 + (liveVolume / 100) * 0.8, opacity: 0.2 + (liveVolume / 100) * 0.3 }}
                className="absolute inset-0 bg-brand-primary rounded-full w-48 h-48"
              />
            </>
          )}
        </AnimatePresence>
        
        <div className="relative z-10 flex h-56 w-56 flex-col items-center justify-center overflow-hidden rounded-full border border-brand-primary/10 bg-white shadow-[0_22px_60px_rgba(19,93,102,0.12)]">
          <div className="mb-2 flex h-32 w-32 items-center justify-center rounded-full bg-brand-primary/5">
            <UserIcon size={64} className="text-brand-primary" />
          </div>
          <p className="font-bold text-brand-primary">BolDost</p>
          
          {/* Status Overlay */}
          {isLiveActive && (
            <div className="absolute bottom-4 flex gap-1">
              {[1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  animate={{ height: [4, 12, 4] }}
                  transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                  className="w-1 bg-brand-primary rounded-full"
                  style={{ height: 4 + (liveVolume / 100) * 20 }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-2xl font-black tracking-tight">
          {isLiveConnecting ? "Connecting..." : liveStatus === 'listening' ? "I'm Listening" : liveStatus === 'speaking' ? "Speaking..." : liveStatus === 'thinking' ? "Thinking..." : "Ready to talk?"}
        </h3>
        <p className="mx-auto max-w-[320px] text-sm font-medium text-slate-500">
          {isLiveActive ? "Talk to me like a friend. I'm here to help you learn!" : "Start a real-time voice conversation with your AI tutor."}
        </p>
      </div>

      {isLiveActive && (
        <div className="w-full space-y-4">
          {/* Transcription History */}
          <div className="flex max-h-72 w-full flex-col space-y-4 overflow-y-auto rounded-[2rem] border border-white/40 bg-white/60 p-4 shadow-inner backdrop-blur no-scrollbar">
            {conversation.length > 0 ? (
              conversation.map((msg, idx) => {
                const isLast = idx === conversation.length - 1;
                const isActive = isLast && (
                  (msg.role === 'user' && liveStatus === 'listening' && liveVolume > 10) ||
                  (msg.role === 'model' && liveStatus === 'speaking')
                );

                return (
                  <div key={idx} className={cn("flex flex-col group transition-all duration-300", msg.role === 'user' ? "items-end" : "items-start", isActive && "scale-[1.02]")}>
                    <div className="flex items-center gap-2 mb-1 px-2">
                      <div className="flex items-center gap-1.5">
                        {isActive && (
                          <motion.div 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                            className={cn("w-1.5 h-1.5 rounded-full", msg.role === 'user' ? "bg-brand-primary" : "bg-brand-accent")}
                          />
                        )}
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-widest",
                          isActive ? (msg.role === 'user' ? "text-brand-primary" : "text-brand-accent") : "text-gray-400"
                        )}>
                          {msg.role === 'user' ? 'You' : 'BolDost'}
                          {isActive && (msg.role === 'user' ? ' • Listening' : ' • Speaking')}
                        </span>
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(msg.text);
                          toast.success("Copied to clipboard");
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded-md text-gray-400"
                        title="Copy text"
                      >
                        <Copy size={10} />
                      </button>
                    </div>
                    <div className={cn(
                      "px-4 py-2.5 rounded-2xl text-xs max-w-[85%] shadow-sm transition-all hover:shadow-md",
                      msg.role === 'user' 
                        ? "bg-brand-primary text-white rounded-tr-none" 
                        : "bg-white text-gray-800 rounded-tl-none border border-gray-100",
                      isActive && (msg.role === 'user' ? "ring-2 ring-brand-primary/30 shadow-lg shadow-brand-primary/10" : "ring-2 ring-brand-accent/30 shadow-lg shadow-brand-accent/10")
                    )}>
                      {msg.text}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-8 space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 bg-brand-primary/20 rounded-full"
                    />
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold">Waiting for conversation...</p>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
      )}

      {!isLiveActive && (
        <div className="flex w-full flex-col items-center gap-6">
          <div className="grid w-full gap-4 lg:grid-cols-[0.62fr_0.38fr]">
            <div className="soft-panel p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Guided topic</p>
                  <h4 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{selectedTopic.title}</h4>
                </div>
                <Target size={20} className="text-brand-primary" />
              </div>
              <p className="text-sm leading-7 text-slate-600">{selectedTopic.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedTopic.starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setSelectedTopicId(selectedTopic.id);
                      savePreferences({ currentTopicId: selectedTopic.id });
                      setLivePrompt(prompt);
                    }}
                    className="rounded-full bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 shadow-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="soft-panel p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Practice path</p>
              <div className="mt-4 space-y-3">
                {[selectedTopic, recommendedTopic, getStarterTopicByLevel(PRACTICE_TOPICS, learnerLevel)].map((topic, index) => (
                  <div key={`${topic.id}-${index}`} className="flex items-center gap-3 rounded-[20px] bg-white/80 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
                      <topic.icon size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">{topic.title}</p>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{topic.milestone}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 w-full max-w-sm">
          <div className="grid w-full grid-cols-5 gap-2 rounded-[22px] bg-slate-100/90 p-1.5">
            {VOICE_CONFIGS.map(v => (
              <button
                key={v.id}
                onClick={() => setSelectedVoice(v.id)}
                className={cn(
                  "py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                  selectedVoice === v.id ? "bg-white text-brand-primary shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                {v.name}
              </button>
            ))}
          </div>
          
          <div className="text-center">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-brand-primary">
              {selectedVoiceConfig?.description}
            </p>
            <p className="text-[10px] font-medium text-gray-400">
              {selectedVoiceConfig?.detail}
            </p>
          </div>
        </div>
        </div>
      )}

      {(liveFeedback || isAnalyzingLive) && (
        <div className="grid w-full gap-4 lg:grid-cols-[0.58fr_0.42fr]">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Live feedback</p>
                <h4 className="mt-2 text-2xl font-black tracking-tight">Session scorecard</h4>
              </div>
              <BadgeCheck size={20} className="text-brand-accent" />
            </div>
            {isAnalyzingLive ? (
              <p className="text-sm text-slate-500">Analyzing your speaking performance...</p>
            ) : liveFeedback && (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Fluency', value: liveFeedback.fluencyScore },
                    { label: 'Confidence', value: liveFeedback.confidenceScore },
                    { label: 'Grammar', value: liveFeedback.grammarScore },
                  ].map((score) => (
                    <div key={score.label} className="soft-panel p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{score.label}</p>
                      <p className="mt-2 font-display text-3xl font-extrabold text-slate-900">{score.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-[24px] bg-slate-100 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Coach note</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{liveFeedback.explanation}</p>
                </div>
              </>
            )}
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center gap-3">
              <TrendingUp size={18} className="text-brand-primary" />
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Next improvement</p>
            </div>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="soft-panel p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Fillers</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{liveMetrics.fillerCount}</p>
                </div>
                <div className="soft-panel p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Avg answer</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{liveMetrics.averageAnswerWords}w</p>
                </div>
                <div className="soft-panel p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Pace</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{liveMetrics.estimatedPace} wpm</p>
                </div>
              </div>
              <div className="rounded-[22px] bg-brand-primary/8 p-4">
                <p className="text-sm font-bold text-slate-900">Better version</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{liveFeedback?.corrected || 'Your corrected response will appear here after analysis.'}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedTopicId(recommendedTopic.id);
                  setActiveTab('chat');
                  setChatInput(`Help me practice ${recommendedTopic.title.toLowerCase()} for my next speaking session.`);
                }}
                className="btn-secondary w-full"
              >
                Practice weakness in chat
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {!isLiveActive ? (
          <button 
            onClick={() => startLive(livePrompt || selectedTopic.prompt)}
            disabled={isLiveConnecting}
            className="w-20 h-20 rounded-full bg-brand-accent text-white flex items-center justify-center shadow-xl hover:scale-110 transition-transform disabled:opacity-50 relative group"
          >
            <PhoneCall size={32} />
            <div className="absolute -top-12 bg-gray-900 text-white text-[10px] px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-bold uppercase tracking-widest">Start Call</div>
          </button>
        ) : (
          <button 
            onClick={stopLive}
            className="w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-transform relative group"
          >
            <PhoneOff size={32} />
            <div className="absolute -top-12 bg-gray-900 text-white text-[10px] px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-bold uppercase tracking-widest">End Call</div>
          </button>
        )}
      </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6 pb-6">
      <div className="card flex items-center justify-between p-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-brand-primary">Profile</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">Settings and history</h1>
        </div>
        <button onClick={() => setActiveTab('home')} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><X size={20} /></button>
      </div>

      <div className="glass-card flex flex-col items-center space-y-4 p-6 text-center">
        <div className="relative">
          <img 
            src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} 
            alt="Profile" 
            className="w-24 h-24 rounded-full border-4 border-brand-primary/20"
            referrerPolicy="no-referrer"
          />
          <div className="absolute bottom-0 right-0 w-8 h-8 bg-brand-accent rounded-full flex items-center justify-center text-white border-2 border-white">
            <Sparkles size={16} />
          </div>
        </div>
        
        <div>
          <h2 className="text-2xl font-black tracking-tight">{user?.displayName || 'BolDost User'}</h2>
          <p className="text-gray-500 text-sm">{user?.email}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 w-full pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-lg font-bold text-brand-primary">{stats.level}</p>
            <p className="text-[10px] text-gray-400 uppercase font-bold">Level</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-lg font-bold text-brand-primary">{stats.xp}</p>
            <p className="text-[10px] text-gray-400 uppercase font-bold">Total XP</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-brand-primary">{stats.streak}</p>
            <p className="text-[10px] text-gray-400 uppercase font-bold">Streak</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="px-2 text-sm font-bold uppercase tracking-[0.28em] text-gray-400">Account</h3>
        <div className="glass-card overflow-hidden">
          <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                <UserIcon size={18} />
              </div>
              <span className="font-medium text-sm">Edit Profile</span>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>
          <button 
            onClick={handleLogout}
            className="w-full p-4 flex items-center justify-between hover:bg-red-50 transition-colors text-left text-red-500"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <LogOut size={18} />
              </div>
              <span className="font-medium text-sm">Logout</span>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-3">
              <Target size={18} className="text-brand-primary" />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Learning preferences</p>
                <h3 className="text-2xl font-black tracking-tight">Personalize your path</h3>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-slate-500">Target goal</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {TARGET_GOALS.map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => {
                        setTargetGoal(goal.id);
                        savePreferences({ targetGoal: goal.id });
                      }}
                      className={cn("rounded-[22px] p-4 text-left transition-all", targetGoal === goal.id ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "bg-slate-100 text-slate-700")}
                    >
                      <goal.icon size={18} />
                      <p className="mt-3 text-sm font-bold">{goal.label}</p>
                      <p className={cn("mt-1 text-xs", targetGoal === goal.id ? "text-white/70" : "text-slate-500")}>{goal.detail}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-slate-500">Learner level</p>
                  <div className="space-y-2">
                    {LEARNER_LEVELS.map((level) => (
                      <button
                        key={level.id}
                        onClick={() => {
                          setLearnerLevel(level.id);
                          savePreferences({ learnerLevel: level.id });
                        }}
                        className={cn("w-full rounded-[18px] px-4 py-3 text-left", learnerLevel === level.id ? "bg-brand-accent/15 text-slate-900" : "bg-slate-100 text-slate-500")}
                      >
                        <p className="text-sm font-bold capitalize">{level.label}</p>
                        <p className="text-xs">{level.detail}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-slate-500">Support language</p>
                  <div className="space-y-2">
                    {SUPPORT_LANGUAGES.map((language) => (
                      <button
                        key={language.id}
                        onClick={() => {
                          setPreferredLanguage(language.id);
                          savePreferences({ supportLanguage: language.id });
                        }}
                        className={cn("w-full rounded-[18px] px-4 py-3 text-left", preferredLanguage === language.id ? "bg-brand-secondary/20 text-slate-900" : "bg-slate-100 text-slate-500")}
                      >
                        <p className="text-sm font-bold">{language.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-slate-500">Daily goal</p>
                <div className="flex flex-wrap gap-2">
                  {DAILY_GOAL_OPTIONS.map((goalMinutes) => (
                    <button
                      key={goalMinutes}
                      onClick={() => savePreferences({ dailyGoalMinutes: goalMinutes })}
                      className={cn("rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.22em]", stats.dailyGoalMinutes === goalMinutes ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-500")}
                    >
                      {goalMinutes} min
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="mb-4 flex items-center gap-3">
              <CalendarDays size={18} className="text-brand-primary" />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Weekly challenge</p>
                <h3 className="text-2xl font-black tracking-tight">Momentum boosters</h3>
              </div>
            </div>
            <div className="space-y-3">
              {WEEKLY_CHALLENGES.map((challenge, index) => (
                <div key={challenge} className="flex items-center gap-3 rounded-[22px] bg-slate-100 p-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white font-black text-brand-primary">{index + 1}</div>
                  <p className="text-sm font-semibold text-slate-700">{challenge}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-sm font-bold uppercase tracking-[0.28em] text-gray-400">Practice History</h3>
          {transcripts.length > 0 && (
            <button 
              onClick={async () => {
                if (!user) return;
                try {
                  const q = query(collection(db, 'users', user.uid, 'liveTranscripts'));
                  const snapshot = await getDocs(q);
                  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
                  await Promise.all(deletePromises);
                  setTranscripts([]);
                  toast.success("History cleared");
                } catch (error) {
                  console.error("Error clearing history:", error);
                }
              }}
              className="text-[10px] font-bold text-red-500 hover:underline"
            >
              Clear All
            </button>
          )}
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3 rounded-[22px] bg-slate-100 px-4 py-3">
              <Search size={16} className="text-slate-400" />
              <input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search transcript topics or phrases..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="soft-panel p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Saved sessions</p>
                <p className="mt-2 font-display text-3xl font-extrabold text-slate-900">{transcripts.length}</p>
              </div>
              <div className="soft-panel p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Avg score</p>
                <p className="mt-2 font-display text-3xl font-extrabold text-slate-900">{averageSpeakingScore || '--'}</p>
              </div>
              <div className="soft-panel p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Repeated focus</p>
                <p className="mt-2 text-sm font-bold text-slate-900">{focusWords[0] || 'fluency'}</p>
              </div>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
          {loadingTranscripts ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-primary"></div>
            </div>
          ) : filteredTranscripts.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredTranscripts.map((t) => (
                <button key={t.id} onClick={() => setSelectedTranscript(t)} className="w-full p-4 text-left transition-colors hover:bg-[#faf7f2]">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-gray-400" />
                      <span className="text-xs font-medium text-gray-500">
                        {new Date(t.timestamp).toLocaleDateString()} {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold bg-green-100 text-green-600 px-1.5 py-0.5 rounded uppercase">
                      {t.messages?.length || 0} messages
                    </span>
                  </div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-brand-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-primary">{t.topicTitle || 'General practice'}</span>
                    {t.feedback && (
                      <span className="rounded-full bg-brand-accent/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-accent">
                        avg {Math.round((t.feedback.fluencyScore + t.feedback.confidenceScore + t.feedback.grammarScore) / 3)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium line-clamp-1 text-gray-700">
                    {t.messages?.[0]?.text || "No content"}
                  </p>
                  {t.feedback?.explanation && <p className="mt-2 text-xs text-slate-500 line-clamp-2">{t.feedback.explanation}</p>}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center space-y-2">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                <Clock size={24} />
              </div>
              <p className="text-sm text-gray-500">No practice history yet</p>
              <button 
                onClick={() => setActiveTab('live')}
                className="text-xs font-bold text-brand-primary hover:underline"
              >
                Start your first session
              </button>
            </div>
          )}
          </div>

          <div className="glass-card overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500">
                  <Volume2 size={18} />
                </div>
                <span className="font-medium text-sm">Voice Selection</span>
              </div>
              <select 
                value={selectedVoice}
                onChange={(e) => {
                  setSelectedVoice(e.target.value);
                  savePreferences({ selectedVoice: e.target.value });
                }}
                className="bg-gray-100 px-2 py-1 rounded-lg text-xs font-bold outline-none"
              >
                {VOICE_CONFIGS.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                  <Flame size={18} />
                </div>
                <span className="font-medium text-sm">Daily Goal</span>
              </div>
              <span className="text-xs font-bold text-brand-primary">{stats.dailyGoalMinutes} min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCommunity = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6 pb-6"
    >
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-brand-primary">Community practice</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Meet learners and practice together</h2>
            <p className="mt-3 text-sm font-medium text-gray-500">Find someone online, start a call, and turn solo learning into live conversation.</p>
          </div>
          <button
            onClick={toggleDnd}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.2em] transition-all",
              isDnd
                ? "bg-red-100 text-red-600 shadow-inner"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            )}
          >
            <BellOff size={15} />
            {isDnd ? 'DND On' : 'Do Not Disturb'}
          </button>
        </div>
        {isDnd && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
            <BellOff size={14} />
            You are in Do Not Disturb mode. All incoming calls will be auto-rejected.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="group relative overflow-hidden rounded-[2.5rem] border border-brand-primary/10 bg-[linear-gradient(135deg,rgba(19,93,102,0.96),rgba(37,120,110,0.93))] p-8 text-white shadow-[0_24px_56px_rgba(19,93,102,0.18)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10">
            <h3 className="text-xl font-black uppercase mb-2">Live Practice</h3>
            <p className="text-white/80 text-sm mb-6 max-w-[320px]">Find a filtered practice partner, compare goals, and start a safer, smarter conversation.</p>
            <div className="mb-5 flex flex-wrap gap-2">
              {([{ id: 'all', label: 'All' }, ...LEARNER_LEVELS.map((level) => ({ id: level.id, label: level.label }))] as { id: 'all' | LearnerLevel; label: string }[]).map((filterItem) => (
                <button
                  key={filterItem.id}
                  onClick={() => setCommunityFilter(filterItem.id)}
                  className={cn("rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em]", communityFilter === filterItem.id ? "bg-white text-brand-primary" : "bg-white/10 text-white")}
                >
                  {filterItem.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                const availableUsers = communityUsers.filter((u) => u.status === 'online');
                if (availableUsers.length > 0) {
                  const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                  startCall(randomUser.uid);
                } else {
                  toast.error("No users available right now. Try again later!");
                }
              }}
              className="bg-white text-brand-primary px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
            >
              <Zap size={16} />
              Find Partner
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-xs font-black uppercase tracking-[0.28em] text-gray-400">Online Now ({communityUsers.length})</h4>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              <Shield size={12} />
              safer match view
            </div>
          </div>

          {communityUsers.length > 0 ? (
            <div className="space-y-2">
              {communityUsers.map((u) => (
                <div key={u.uid} className="group rounded-3xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand-primary/20 hover:shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon size={20} className="text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{u.displayName}</p>
                        <div className="flex items-center gap-1">
                          <div className={cn("w-1.5 h-1.5 rounded-full", u.status === 'online' ? "bg-green-500" : u.status === 'dnd' ? "bg-red-400" : "bg-amber-500")} />
                          <span className={cn("text-[10px] uppercase font-bold tracking-tighter", u.status === 'dnd' ? "text-red-400" : "text-gray-400")}>{u.status === 'dnd' ? 'Do Not Disturb' : u.status}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-brand-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-primary">{u.learnerLevel}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{u.targetGoal}</span>
                          <span className="rounded-full bg-brand-accent/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-accent">safe {u.safeScore}%</span>
                        </div>
                        <p className="mt-2 text-[11px] text-slate-500">Best for: {u.commonTopics.join(' • ')}</p>
                      </div>
                    </div>
                    <button
                      disabled={u.status === 'busy' || u.status === 'dnd'}
                      onClick={() => startCall(u.uid)}
                      title={u.status === 'dnd' ? 'This user has Do Not Disturb enabled' : undefined}
                      className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90",
                        u.status === 'busy' || u.status === 'dnd'
                          ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                          : "bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white"
                      )}
                    >
                      {u.status === 'dnd' ? <BellOff size={16} /> : <Phone size={18} />}
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setReportedUserIds((current) => [...new Set([...current, u.uid])]);
                        toast.success(`Reported ${u.displayName} for review`);
                      }}
                      className={cn("rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em]", reportedUserIds.includes(u.uid) ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500")}
                    >
                      <Flag size={12} className="inline mr-1" />
                      {reportedUserIds.includes(u.uid) ? 'Reported' : 'Report'}
                    </button>
                    <button
                      onClick={() => {
                        setBlockedUserIds((current) => [...new Set([...current, u.uid])]);
                        toast.success(`${u.displayName} hidden from your community list`);
                      }}
                      className="rounded-full bg-red-50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-red-600"
                    >
                      <Ban size={12} className="inline mr-1" />
                      Block
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4 rounded-[2rem] border border-dashed border-slate-200 bg-[#faf7f2] p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-gray-300">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-400">No one else is online</p>
                <p className="text-[10px] text-gray-300 uppercase tracking-widest">Invite your friends to practice!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  const renderCall = () => (
    <div className="dashboard-theme fixed inset-0 z-[200] flex flex-col items-center justify-center space-y-12 bg-brand-bg p-8">
      <div className="relative">
        <div className="flex h-48 w-48 items-center justify-center rounded-full bg-white shadow-[0_20px_60px_rgba(19,93,102,0.12)] animate-pulse">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-brand-primary/12">
            <UserIcon size={64} className="text-brand-primary" />
          </div>
        </div>
        <div className="absolute -bottom-2 -right-2 bg-green-500 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center text-white">
          <Activity size={16} />
        </div>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-gray-900">
          {callStatus === 'ringing' ? 'Calling...' : 'In Conversation'}
        </h2>
        <p className="text-gray-500 font-medium">
          {callStatus === 'ringing' ? 'Waiting for partner to join...' : 'Practice your English with a real partner!'}
        </p>
      </div>

      <div className="flex flex-col items-center space-y-6 w-full max-w-xs">
        <div className="flex gap-4 w-full justify-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
            <Mic size={24} />
          </div>
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
            <Volume2 size={24} />
          </div>
        </div>

        <button 
          onClick={hangup}
          className="w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-200 hover:bg-red-600 transition-all transform hover:scale-105"
        >
          <PhoneOff size={32} />
        </button>
        <p className="text-xs font-bold text-red-500 uppercase tracking-widest">End Call</p>
      </div>

      {/* Visualizer for peer call */}
      <div className="flex gap-1.5 h-8 items-center">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <motion.div
            key={i}
            animate={{ height: callStatus === 'connected' ? [8, 24, 8] : 8 }}
            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
            className="w-1.5 bg-brand-primary rounded-full"
          />
        ))}
      </div>
    </div>
  );

  if (showLanding && !user) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  }

  if (isAuthLoading) {
    return (
      <div className="dashboard-theme min-h-screen flex flex-col items-center justify-center bg-brand-bg">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-[0_16px_40px_rgba(19,93,102,0.10)]"
        >
          <Sparkles size={48} className="text-brand-primary" />
        </motion.div>
        <p className="mt-4 text-brand-primary font-bold animate-pulse">BolDost is loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard-theme relative flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <button onClick={() => setShowLanding(true)} className="absolute top-6 left-6 text-sm text-gray-400 hover:text-brand-primary font-bold flex items-center gap-1">← Back</button>
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="app-shell w-full max-w-md space-y-8 p-8"
        >
          <div className="space-y-4">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] bg-white shadow-[0_22px_50px_rgba(19,93,102,0.10)]">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-brand-primary to-brand-accent text-white shadow-lg shadow-brand-primary/20">
                <Mic size={34} />
              </div>
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">BolDost</h1>
            <p className="text-gray-500 font-medium">Sign in to continue with your speaking practice, feedback, and progress tracking.</p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={handleLogin}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 font-bold text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-primary/20 hover:shadow-lg"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              Continue with Google
            </button>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-[0.24em]">Secure Login powered by Firebase</p>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-8">
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-2 text-blue-500">
                <Activity size={20} />
              </div>
              <p className="text-[8px] font-bold uppercase">Real-time</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-2 text-green-500">
                <Sparkles size={20} />
              </div>
              <p className="text-[8px] font-bold uppercase">AI Feedback</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-2 text-purple-500">
                <Flame size={20} />
              </div>
              <p className="text-[8px] font-bold uppercase">Daily Streak</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-[1520px] px-3 py-3 sm:px-4 lg:px-6 lg:py-5">
      <Toaster position="top-center" richColors />
      
      {/* Call Overlay */}
      <AnimatePresence>
        {callStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200]"
          >
            {renderCall()}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="dashboard-theme app-shell dashboard-canvas relative flex min-h-[calc(100vh-1.5rem)] flex-col overflow-hidden lg:min-h-[calc(100vh-2.5rem)] lg:flex-row">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-8%] top-[-4%] h-48 w-48 rounded-full bg-brand-secondary/18 blur-3xl sm:h-64 sm:w-64" />
          <div className="absolute right-[-8%] top-24 h-56 w-56 rounded-full bg-brand-accent/18 blur-3xl sm:h-72 sm:w-72" />
          <div className="absolute bottom-[-8%] left-1/3 h-52 w-52 rounded-full bg-brand-primary/10 blur-3xl sm:h-72 sm:w-72" />
        </div>

        <aside className="hidden border-r border-slate-200/70 bg-white/70 p-5 backdrop-blur-xl lg:flex lg:w-[300px] lg:flex-col lg:justify-between xl:w-[330px]">
          <div>
            <div className="mb-6 flex items-center gap-3 px-2 pt-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-[22px] bg-gradient-to-br from-brand-primary to-brand-accent text-white shadow-lg shadow-brand-primary/20">
                <Mic size={22} />
              </div>
              <div>
                <p className="font-display text-xl font-extrabold tracking-tight">BolDost</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">English Practice Hub</p>
              </div>
            </div>

            <div className="mb-6 hidden rounded-[28px] border border-brand-primary/10 bg-white p-5 text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.05)] lg:block">
              <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Today&apos;s progress</p>
              <p className="mt-2 font-display text-4xl font-extrabold">{stats.minutesPracticedToday.toFixed(0)} min</p>
              <div className="mt-4 overflow-hidden rounded-full bg-slate-100">
                <div className="h-3 rounded-full bg-gradient-to-r from-brand-primary to-brand-accent" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="mt-3 text-sm text-slate-500">{stats.xp} XP earned so far, with level {stats.level} active.</p>
            </div>

            <nav className="grid gap-2.5">
              {navItems.map((item) => (
                <NavButton
                  key={item.id}
                  active={activeTab === item.id}
                  onClick={() => setActiveTab(item.id)}
                  icon={item.icon}
                  label={item.label}
                />
              ))}
            </nav>
          </div>

          <div className="mt-6 hidden rounded-[28px] border border-slate-200/80 bg-white/90 p-4 lg:block">
            <div className="flex items-center gap-3">
              <img
                src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`}
                alt="Profile"
                className="h-12 w-12 rounded-2xl object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{user?.displayName}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="relative flex-1 overflow-y-auto p-3 pb-28 no-scrollbar sm:p-4 sm:pb-32 lg:p-6 lg:pb-8 xl:p-8">
          <div className="editorial-panel mb-5 flex items-center justify-between gap-4 px-4 py-4 sm:px-5 lg:hidden">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-brand-primary to-brand-accent text-white shadow-lg shadow-brand-primary/20">
                <Mic size={20} />
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-extrabold tracking-tight">BolDost</p>
                <p className="truncate text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">{firstName} dashboard</p>
              </div>
            </div>

            <div className="rounded-[22px] border border-brand-primary/10 bg-white px-3 py-2 text-right text-slate-900 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Today</p>
              <p className="font-display text-2xl font-extrabold text-brand-primary">{stats.minutesPracticedToday.toFixed(0)}m</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'home' && renderHome()}
              {activeTab === 'chat' && renderChat()}
              {activeTab === 'live' && renderLive()}
              {activeTab === 'community' && renderCommunity()}
              {activeTab === 'settings' && renderSettings()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-[90] lg:hidden">
        <div className="floating-dock grid grid-cols-5 gap-1.5 p-2 sm:mx-auto sm:max-w-xl">
          {navItems.map((item) => (
            <NavButton
              key={item.id}
              active={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
              icon={item.icon}
              label={item.label}
            />
          ))}
        </div>
      </nav>

      {/* Remote Audio Element */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Incoming Call Dialog */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 right-4 z-[100] bg-white rounded-3xl p-6 shadow-2xl border border-brand-primary/20 flex flex-col items-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary animate-pulse">
              <PhoneIncoming size={32} />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">Incoming Call</h3>
              <p className="text-sm text-gray-500">Someone wants to practice English with you!</p>
            </div>
            <div className="flex gap-4 w-full">
              <button 
                onClick={rejectCall}
                className="flex-1 py-3 rounded-2xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors"
              >
                Decline
              </button>
              <button 
                onClick={acceptCall}
                className="flex-1 py-3 rounded-2xl bg-brand-primary text-white font-bold hover:bg-brand-primary/90 transition-colors"
              >
                Accept
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Call Overlay */}
      <AnimatePresence>
        {callStatus !== 'idle' && !incomingCall && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-brand-primary flex flex-col items-center justify-center p-8 text-white"
          >
            <div className="relative mb-12">
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 bg-white rounded-full scale-150"
              />
              <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center relative z-10">
                <UserIcon size={64} className="text-white" />
              </div>
            </div>

            <h2 className="text-2xl font-black mb-2 uppercase tracking-widest">
              {callStatus === 'ringing' ? 'Calling...' : 'Connected'}
            </h2>
            <p className="text-white/60 mb-12 text-center max-w-xs">
              {callStatus === 'ringing' ? 'Waiting for partner to join...' : 'Practice your English speaking skills now!'}
            </p>

            <div className="flex flex-col items-center space-y-8">
              {callStatus === 'connected' && (
                <div className="flex gap-2">
                  {[1, 2, 3].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ height: [10, 30, 10] }}
                      transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                      className="w-1 bg-white rounded-full"
                    />
                  ))}
                </div>
              )}

              <button 
                onClick={hangup}
                className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-xl hover:bg-red-600 transition-all active:scale-95"
              >
                <PhoneOff size={32} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTranscript && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[105] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
              className="app-shell max-h-[85vh] w-full max-w-3xl overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/50 px-5 py-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-brand-primary">Transcript detail</p>
                  <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{selectedTranscript.topicTitle || 'Practice session'}</h3>
                </div>
                <button onClick={() => setSelectedTranscript(null)} className="rounded-2xl bg-white/80 p-3 text-slate-500 shadow-sm">
                  <X size={18} />
                </button>
              </div>

              <div className="grid gap-0 lg:grid-cols-[0.62fr_0.38fr]">
                <div className="max-h-[70vh] overflow-y-auto p-5 no-scrollbar">
                  <div className="space-y-3">
                    {(selectedTranscript.messages || []).map((message: any, index: number) => (
                      <div key={`${selectedTranscript.id}-${index}`} className={cn("max-w-[88%] rounded-[24px] px-4 py-3 text-sm leading-7", message.role === 'user' ? "ml-auto bg-brand-primary text-white rounded-tr-md" : "bg-white text-slate-700 border border-slate-200 rounded-tl-md")}>
                        {message.text}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/50 bg-white/35 p-5 lg:border-l lg:border-t-0">
                  <div className="space-y-4">
                    <div className="soft-panel p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Date</p>
                      <p className="mt-2 text-sm font-bold text-slate-900">{new Date(selectedTranscript.timestamp).toLocaleString()}</p>
                    </div>
                    {selectedTranscript.feedback ? (
                      <>
                        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                          {[
                            { label: 'Fluency', value: selectedTranscript.feedback.fluencyScore },
                            { label: 'Confidence', value: selectedTranscript.feedback.confidenceScore },
                            { label: 'Grammar', value: selectedTranscript.feedback.grammarScore },
                          ].map((item) => (
                            <div key={item.label} className="soft-panel p-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
                              <p className="mt-2 font-display text-3xl font-extrabold text-slate-900">{item.value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="soft-panel p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Coach note</p>
                          <p className="mt-2 text-sm leading-7 text-slate-700">{selectedTranscript.feedback.explanation}</p>
                        </div>
                        <div className="soft-panel p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Better version</p>
                          <p className="mt-2 text-sm leading-7 text-slate-700">{selectedTranscript.feedback.corrected}</p>
                        </div>
                      </>
                    ) : (
                      <div className="soft-panel p-4 text-sm text-slate-500">No detailed scorecard was saved for this session.</div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Transcript Dialog */}
      <AnimatePresence>
        {showSaveTranscript && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl space-y-6"
            >
              <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto text-brand-primary">
                <BookOpen size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-black tracking-tight">Save Session?</h3>
                <p className="text-gray-500 text-sm font-medium">Would you like to save the transcript of your conversation with BolDost?</p>
              </div>
              <div className="space-y-3">
                <button 
                  onClick={saveTranscript}
                  disabled={isSavingTranscript}
                  className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingTranscript ? "Saving..." : "Yes, Save it!"}
                </button>
                <button 
                  onClick={() => { setShowSaveTranscript(false); setLastConversation([]); }}
                  disabled={isSavingTranscript}
                  className="w-full bg-gray-50 text-gray-500 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-[22px] px-1.5 py-2 text-center transition-all duration-300 lg:min-h-0 lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:py-3.5",
        active ? "bg-brand-primary text-white shadow-[0_14px_28px_rgba(19,93,102,0.18)]" : "text-gray-400 hover:bg-[#faf7f2] hover:text-slate-700"
      )}
    >
      <div className={cn(
        "rounded-2xl p-2 transition-all",
        active ? "bg-white/15" : "bg-white"
      )}>
        <Icon size={20} />
      </div>
      <span className="text-[9px] font-bold uppercase tracking-[0.18em] sm:text-[10px] lg:text-xs lg:tracking-[0.22em]">{label}</span>
    </button>
  );
}
