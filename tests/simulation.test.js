import { calculateVoteStats } from '../src/utils/stats.js';

console.log('--- Testing Simulation & Stats Calculation ---');

const participants = [
  { id: 'user-self', name: 'Tú', avatarColor: '#6366f1', isSpectator: false, hasVoted: true, vote: '5' },
  { id: 'bot-1', name: 'Laura', avatarColor: '#ec4899', isSpectator: false, hasVoted: true, vote: '5' },
  { id: 'bot-2', name: 'Marcos', avatarColor: '#3b82f6', isSpectator: false, hasVoted: true, vote: '5' },
  { id: 'bot-3', name: 'Elena', avatarColor: '#10b981', isSpectator: false, hasVoted: true, vote: '8' },
];

const stats = calculateVoteStats(participants);
console.log('Stats computed:', {
  average: stats.average,
  median: stats.median,
  mode: stats.mode,
  totalVoted: stats.totalVoted,
  distribution: stats.distribution,
});

if (stats.totalVoted !== 4) {
  throw new Error(`Expected 4 votes, got ${stats.totalVoted}`);
}
if (stats.distribution['5'] !== 3) {
  throw new Error(`Expected 3 votes for '5', got ${stats.distribution['5']}`);
}
if (stats.mode !== '5') {
  throw new Error(`Expected mode '5', got ${stats.mode}`);
}

console.log('✓ All simulation stats tests passed!');
