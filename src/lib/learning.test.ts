import assert from 'node:assert/strict';
import { computeLearningInsight, computeLiveMetrics, filterTranscriptRecords, getRecommendedTopic } from './learning.ts';

const TEST_TOPICS = [
  { id: 'ordering-coffee', title: 'Ordering Coffee', difficulty: 'easy', category: 'Daily Life' },
  { id: 'job-interview', title: 'Job Interview', difficulty: 'hard', category: 'Career' },
  { id: 'travel-booking', title: 'Travel Booking', difficulty: 'medium', category: 'Travel' },
] as any;

const insight = computeLearningInsight(
  [
    {
      id: '1',
      timestamp: Date.now(),
      topicTitle: 'Interview',
      messages: [{ role: 'user', text: 'I am actually very nervous in interviews', timestamp: Date.now() }],
      feedback: {
        original: '',
        corrected: '',
        explanation: 'Grammar and confidence need more work in interview answers.',
        fluencyScore: 62,
        confidenceScore: 50,
        grammarScore: 58,
      },
    },
  ],
  [{ id: 'c1', role: 'user', content: 'Help me with interview confidence and grammar', timestamp: Date.now() }],
);

assert.equal(insight.weakestMetric, 'confidenceScore');
assert.equal(insight.focusWords.length > 0, true);

const metrics = computeLiveMetrics([
  { role: 'user', text: 'Um I actually want to improve my English', timestamp: Date.now() },
  { role: 'user', text: 'You know I speak slowly sometimes', timestamp: Date.now() + 60000 },
]);

assert.equal(metrics.fillerCount >= 2, true);
assert.equal(metrics.longestAnswerWords > 0, true);

const results = filterTranscriptRecords(
  [
    { id: '1', timestamp: Date.now(), topicTitle: 'Travel Booking', messages: [{ role: 'user', text: 'I need a ticket' }] },
    { id: '2', timestamp: Date.now(), topicTitle: 'Doctor Visit', messages: [{ role: 'user', text: 'I have a fever' }] },
  ],
  'ticket',
);

assert.equal(results.length, 1);
assert.equal(results[0].id, '1');

const topic = getRecommendedTopic(TEST_TOPICS, 'ordering-coffee', 'intermediate', 'job');
assert.equal(topic.category === 'Career' || topic.id !== 'ordering-coffee', true);

console.log('learning utilities tests passed');
