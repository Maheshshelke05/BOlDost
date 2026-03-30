import {
  Coffee,
  ShoppingBag,
  Plane,
  Briefcase,
  Heart,
  Utensils,
  Camera,
  Music,
  Gamepad2,
  Book,
  Globe,
  Zap,
  User,
  Smile,
  MessageSquare,
  Languages,
  Target,
  Rocket,
} from 'lucide-react';
import { ChatCoachMode, LearnerLevel, SupportLanguage, TargetGoal, TopicDefinition, VoiceConfig } from './types.ts';

export const PRACTICE_TOPICS: TopicDefinition[] = [
  {
    id: 'ordering-coffee',
    title: 'Ordering Coffee',
    icon: Coffee,
    description: 'Practice ordering your favorite brew at a cafe.',
    prompt: 'Let us practice ordering coffee. You are the customer and I am the barista. Start by greeting me and placing your order.',
    difficulty: 'easy',
    category: 'Daily Life',
    milestone: 'Polite requests',
    starterPrompts: ['Can I get a cappuccino?', 'What sizes do you have?', 'Can I order this to go?'],
  },
  {
    id: 'job-interview',
    title: 'Job Interview',
    icon: Briefcase,
    description: 'Prepare for common interview questions.',
    prompt: 'We are in a job interview. I am the interviewer. Tell me about yourself and why you want this job.',
    difficulty: 'hard',
    category: 'Career',
    milestone: 'Confident self-introduction',
    starterPrompts: ['Tell me about yourself', 'What are your strengths?', 'Why should we hire you?'],
  },
  {
    id: 'travel-booking',
    title: 'Travel Booking',
    icon: Plane,
    description: 'Book a flight or hotel for your next trip.',
    prompt: 'You want to book a trip to Paris. I am a travel agent. Ask about flights, budget, and hotel options.',
    difficulty: 'medium',
    category: 'Travel',
    milestone: 'Question asking',
    starterPrompts: ['I want to book a flight', 'Do you have any cheaper options?', 'Can you suggest a hotel near the airport?'],
  },
  {
    id: 'grocery-shopping',
    title: 'Grocery Shopping',
    icon: ShoppingBag,
    description: 'Ask for items and prices at the store.',
    prompt: 'You are at a grocery store looking for ingredients for dinner. I am the store assistant.',
    difficulty: 'easy',
    category: 'Daily Life',
    milestone: 'Asking for help',
    starterPrompts: ['Where can I find rice?', 'How much does this cost?', 'Do you have fresh vegetables?'],
  },
  {
    id: 'doctor-visit',
    title: 'Doctor Visit',
    icon: Heart,
    description: 'Explain your symptoms and ask for advice.',
    prompt: 'You are at the doctor’s office. I am your doctor. Explain your symptoms clearly and ask questions.',
    difficulty: 'medium',
    category: 'Health',
    milestone: 'Explaining clearly',
    starterPrompts: ['I have had a fever since yesterday', 'My throat hurts when I swallow', 'Should I take any medicine?'],
  },
  {
    id: 'restaurant-dinner',
    title: 'Restaurant Dinner',
    icon: Utensils,
    description: 'Make a reservation or order a meal.',
    prompt: 'You are at a restaurant and I am your waiter. Ask for recommendations and place an order politely.',
    difficulty: 'easy',
    category: 'Daily Life',
    milestone: 'Ordering politely',
    starterPrompts: ['Can I see the menu?', 'What do you recommend?', 'Could I get the bill please?'],
  },
  {
    id: 'hobbies-talk',
    title: 'Hobbies & Interests',
    icon: Gamepad2,
    description: 'Discuss what you love doing in your free time.',
    prompt: 'Let us talk about your hobbies. Tell me what you enjoy and why it matters to you.',
    difficulty: 'easy',
    category: 'Conversation',
    milestone: 'Extended speaking',
    starterPrompts: ['I enjoy playing cricket', 'I like reading in my free time', 'My hobby helps me relax'],
  },
  {
    id: 'photography',
    title: 'Photography',
    icon: Camera,
    description: 'Talk about cameras, lighting, and composition.',
    prompt: 'We are talking about photography. Tell me what kind of photos you enjoy taking and why.',
    difficulty: 'medium',
    category: 'Conversation',
    milestone: 'Describing preferences',
    starterPrompts: ['I like nature photography', 'Lighting changes the mood', 'I prefer taking photos on my phone'],
  },
  {
    id: 'music-genres',
    title: 'Music Genres',
    icon: Music,
    description: 'Share your favorite artists and styles.',
    prompt: 'Let us discuss music. Talk about your favorite songs, artists, and the kind of music you enjoy.',
    difficulty: 'easy',
    category: 'Conversation',
    milestone: 'Opinion sharing',
    starterPrompts: ['I mostly listen to soft songs', 'My favorite singer is...', 'Music helps me focus'],
  },
  {
    id: 'reading-books',
    title: 'Reading Books',
    icon: Book,
    description: 'Recommend a book or discuss a recent read.',
    prompt: 'Tell me about the last book you read or a book you would recommend to a friend.',
    difficulty: 'medium',
    category: 'Conversation',
    milestone: 'Storytelling',
    starterPrompts: ['The last book I read was...', 'I liked it because...', 'I would recommend it to...'],
  },
  {
    id: 'world-travel',
    title: 'World Travel',
    icon: Globe,
    description: 'Talk about places you have been or want to go.',
    prompt: 'If you could travel anywhere right now, where would you go and why? Explain your plan in detail.',
    difficulty: 'medium',
    category: 'Travel',
    milestone: 'Reasoning and details',
    starterPrompts: ['I want to visit Japan because...', 'I would travel with my family', 'I want to explore the local food'],
  },
  {
    id: 'daily-routine',
    title: 'Daily Routine',
    icon: Zap,
    description: 'Describe your typical day from start to finish.',
    prompt: 'Tell me about your daily routine from morning to night. Use sequence words naturally.',
    difficulty: 'easy',
    category: 'Daily Life',
    milestone: 'Sequence language',
    starterPrompts: ['First I wake up at...', 'After that I go to...', 'In the evening I usually...'],
  },
  {
    id: 'meeting-friends',
    title: 'Meeting Friends',
    icon: User,
    description: 'Practice casual social interactions.',
    prompt: 'You are meeting an old friend after a long time. I am that friend. Start the conversation naturally.',
    difficulty: 'easy',
    category: 'Conversation',
    milestone: 'Casual fluency',
    starterPrompts: ['It is so nice to see you again', 'What have you been up to?', 'We should meet more often'],
  },
  {
    id: 'asking-directions',
    title: 'Asking Directions',
    icon: Globe,
    description: 'Learn how to find your way in a new city.',
    prompt: 'You are lost in a city and need to find the nearest train station. Ask me for help clearly.',
    difficulty: 'medium',
    category: 'Travel',
    milestone: 'Functional speaking',
    starterPrompts: ['Excuse me, can you help me?', 'How do I get to the station?', 'Is it far from here?'],
  },
  {
    id: 'weather-talk',
    title: 'Weather Talk',
    icon: Smile,
    description: 'Common small talk about the weather.',
    prompt: 'Let us practice small talk about the weather and daily plans. Keep it natural and friendly.',
    difficulty: 'easy',
    category: 'Conversation',
    milestone: 'Small talk confidence',
    starterPrompts: ['The weather is pleasant today', 'It might rain later', 'I prefer winter over summer'],
  },
];

export const VOICE_CONFIGS: VoiceConfig[] = [
  { id: 'Zephyr', name: 'Zephyr', description: 'Calm & Professional', detail: 'Perfect for focused learning sessions.' },
  { id: 'Kore', name: 'Kore', description: 'Energetic & Friendly', detail: 'Great for high-energy conversation practice.' },
  { id: 'Puck', name: 'Puck', description: 'Playful & Witty', detail: 'Makes learning fun with a bit of humor.' },
  { id: 'Charon', name: 'Charon', description: 'Deep & Authoritative', detail: 'A steady, reliable voice for clear guidance.' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Warm & Gentle', detail: 'A soothing voice for relaxed practice.' },
];

export const CHAT_COACH_MODES: {
  id: ChatCoachMode;
  label: string;
  description: string;
  icon: any;
  placeholder: string;
}[] = [
  { id: 'coach', label: 'Daily Coach', description: 'Natural, encouraging conversation help.', icon: MessageSquare, placeholder: 'Ask anything about speaking or grammar...' },
  { id: 'grammar', label: 'Grammar Fix', description: 'Correct sentences and explain mistakes clearly.', icon: Book, placeholder: 'Paste a sentence to fix or improve...' },
  { id: 'interview', label: 'Interview Prep', description: 'Practice confident job answers and follow-ups.', icon: Briefcase, placeholder: 'Try: Tell me about yourself for an interview' },
  { id: 'translation', label: 'Translation Help', description: 'Translate your thoughts into natural spoken English.', icon: Languages, placeholder: 'Type in your preferred language and get natural spoken English help...' },
];

export const LEARNER_LEVELS: { id: LearnerLevel; label: string; detail: string }[] = [
  { id: 'beginner', label: 'Beginner', detail: 'Need simple sentence building and confidence.' },
  { id: 'intermediate', label: 'Intermediate', detail: 'Can speak but want fluency and correction.' },
  { id: 'advanced', label: 'Advanced', detail: 'Want polish, natural phrasing, and depth.' },
];

export const TARGET_GOALS: { id: TargetGoal; label: string; detail: string; icon: any }[] = [
  { id: 'conversation', label: 'Daily Conversation', detail: 'Speak naturally in everyday situations.', icon: MessageSquare },
  { id: 'job', label: 'Job & Interviews', detail: 'Prepare for work communication and interviews.', icon: Briefcase },
  { id: 'travel', label: 'Travel English', detail: 'Handle trips, bookings, and directions smoothly.', icon: Plane },
  { id: 'exam', label: 'Exam Speaking', detail: 'Prepare for formal speaking tests.', icon: Target },
  { id: 'confidence', label: 'Confidence Boost', detail: 'Reduce fear and speak more freely.', icon: Rocket },
];

export const SUPPORT_LANGUAGES: { id: SupportLanguage; label: string }[] = [
  { id: 'english', label: 'English only' },
  { id: 'hindi', label: 'Hindi support' },
  { id: 'marathi', label: 'Marathi support' },
  { id: 'mixed', label: 'Mixed support' },
];

export const DAILY_GOAL_OPTIONS = [5, 10, 15, 20, 30];

export const WEEKLY_CHALLENGES = [
  'Complete 3 live sessions this week',
  'Practice 5 different real-world topics',
  'Fix the same grammar mistake 3 times in chat',
];
