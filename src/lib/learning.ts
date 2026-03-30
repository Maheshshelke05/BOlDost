import type { ChatMessage, Feedback, LearnerLevel, TargetGoal, TopicDefinition } from '../types.ts';

export interface TranscriptRecord {
  id: string;
  timestamp: number;
  topicId?: string;
  topicTitle?: string;
  messages?: { role: 'user' | 'model'; text: string; timestamp?: number }[];
  feedback?: Feedback;
}

export interface LearningInsight {
  averageScore: number;
  focusWords: string[];
  weakestMetric: 'fluencyScore' | 'confidenceScore' | 'grammarScore';
  repeatedMistakes: string[];
  weeklyMinutes: number[];
  achievementProgress: number;
}

export interface LiveMetrics {
  fillerCount: number;
  longestAnswerWords: number;
  averageAnswerWords: number;
  estimatedPace: number;
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'have', 'this', 'your', 'you', 'are', 'not',
  'was', 'but', 'can', 'just', 'from', 'they', 'them', 'what', 'when', 'where',
  'will', 'would', 'please', 'then', 'than', 'there', 'their', 'about', 'into',
]);

const FILLERS = ['um', 'uh', 'like', 'actually', 'basically', 'you know', 'matlab'];

export function extractFocusWords(items: string[]) {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    item
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
      .forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

export function computeLearningInsight(
  transcripts: TranscriptRecord[],
  chatMessages: ChatMessage[],
): LearningInsight {
  const feedbacks = transcripts.map((item) => item.feedback).filter(Boolean) as Feedback[];
  const scores = feedbacks.flatMap((item) => [item.fluencyScore, item.confidenceScore, item.grammarScore]);
  const averageScore = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0;

  const focusWords = extractFocusWords([
    ...chatMessages.filter((message) => message.role === 'user').map((message) => message.content),
    ...transcripts.flatMap((transcript) => (transcript.messages || []).filter((message) => message.role === 'user').map((message) => message.text)),
  ]);

  const metricAverages = {
    fluencyScore: feedbacks.length ? feedbacks.reduce((sum, item) => sum + item.fluencyScore, 0) / feedbacks.length : 0,
    confidenceScore: feedbacks.length ? feedbacks.reduce((sum, item) => sum + item.confidenceScore, 0) / feedbacks.length : 0,
    grammarScore: feedbacks.length ? feedbacks.reduce((sum, item) => sum + item.grammarScore, 0) / feedbacks.length : 0,
  };

  const weakestMetric = (Object.entries(metricAverages) as [LearningInsight['weakestMetric'], number][])
    .sort((a, b) => a[1] - b[1])[0]?.[0] || 'grammarScore';

  const repeatedMistakes = extractFocusWords(feedbacks.map((item) => item.explanation)).slice(0, 3);

  const today = new Date();
  const weeklyMinutes = Array.from({ length: 7 }, (_, offset) => {
    const targetDay = new Date(today);
    targetDay.setDate(today.getDate() - (6 - offset));
    const dayKey = targetDay.toDateString();

    return Math.round(
      transcripts
        .filter((transcript) => new Date(transcript.timestamp).toDateString() === dayKey)
        .reduce((sum, transcript) => sum + Math.max((transcript.messages?.length || 0) * 0.5, 2), 0)
    );
  });

  const achievementProgress = Math.min(100, Math.round((transcripts.length * 20) + averageScore / 2));

  return {
    averageScore,
    focusWords,
    weakestMetric,
    repeatedMistakes,
    weeklyMinutes,
    achievementProgress,
  };
}

export function getStarterTopicByLevel(topics: TopicDefinition[], learnerLevel: LearnerLevel) {
  return (
    topics.find((topic) =>
      learnerLevel === 'beginner'
        ? topic.difficulty === 'easy'
        : learnerLevel === 'advanced'
          ? topic.difficulty === 'hard'
          : topic.difficulty === 'medium'
    ) || topics[0]
  );
}

export function computeLiveMetrics(messages: { role: 'user' | 'model'; text: string; timestamp?: number }[]): LiveMetrics {
  const userMessages = messages.filter((message) => message.role === 'user');
  const wordCounts = userMessages.map((message) => message.text.trim().split(/\s+/).filter(Boolean).length);
  const totalWords = wordCounts.reduce((sum, count) => sum + count, 0);
  const fillerCount = userMessages.reduce((sum, message) => {
    const lower = message.text.toLowerCase();
    return sum + FILLERS.reduce((inner, filler) => inner + (lower.match(new RegExp(`\\b${filler}\\b`, 'g')) || []).length, 0);
  }, 0);

  const timestamps = userMessages.map((message) => message.timestamp).filter((value): value is number => typeof value === 'number');
  const durationMinutes = timestamps.length >= 2 ? Math.max((timestamps[timestamps.length - 1] - timestamps[0]) / 60000, 0.5) : 1;
  const estimatedPace = Math.round(totalWords / durationMinutes);

  return {
    fillerCount,
    longestAnswerWords: wordCounts.length ? Math.max(...wordCounts) : 0,
    averageAnswerWords: wordCounts.length ? Math.round(totalWords / wordCounts.length) : 0,
    estimatedPace,
  };
}

export function getRecommendedTopic(topics: TopicDefinition[], currentTopicId: string, learnerLevel: LearnerLevel, targetGoal: TargetGoal) {
  const goalMap: Record<TargetGoal, string[]> = {
    conversation: ['Conversation', 'Daily Life'],
    job: ['Career'],
    travel: ['Travel'],
    exam: ['Conversation', 'Career'],
    confidence: ['Daily Life', 'Conversation'],
  };

  const preferredCategories = goalMap[targetGoal];
  return (
    topics.find((topic) => topic.id !== currentTopicId && preferredCategories.includes(topic.category) && (learnerLevel === 'advanced' ? topic.difficulty !== 'easy' : true)) ||
    topics.find((topic) => topic.id !== currentTopicId) ||
    topics[0]
  );
}

export function filterTranscriptRecords(transcripts: TranscriptRecord[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return transcripts;

  return transcripts.filter((transcript) => {
    const haystack = `${transcript.topicTitle || ''} ${(transcript.messages || []).map((message) => message.text).join(' ')}`.toLowerCase();
    return haystack.includes(normalized);
  });
}
