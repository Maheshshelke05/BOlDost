export type LearnerLevel = 'beginner' | 'intermediate' | 'advanced';
export type TargetGoal = 'conversation' | 'job' | 'travel' | 'exam' | 'confidence';
export type SupportLanguage = 'english' | 'hindi' | 'marathi' | 'mixed';
export type ChatCoachMode = 'coach' | 'grammar' | 'interview' | 'translation';
export type TopicDifficulty = 'easy' | 'medium' | 'hard';

export interface UserStats {
  xp: number;
  streak: number;
  level: number;
  dailyGoalMinutes: number;
  minutesPracticedToday: number;
  lastPracticeDate?: string;
  learnerLevel?: LearnerLevel;
  targetGoal?: TargetGoal;
  supportLanguage?: SupportLanguage;
  currentTopicId?: string;
}

export interface Feedback {
  original: string;
  corrected: string;
  explanation: string;
  fluencyScore: number;
  confidenceScore: number;
  grammarScore: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface TopicDefinition {
  id: string;
  title: string;
  icon: any;
  description: string;
  prompt: string;
  difficulty: TopicDifficulty;
  category: string;
  milestone: string;
  starterPrompts: string[];
}

export interface VoiceConfig {
  id: string;
  name: string;
  description: string;
  detail: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
