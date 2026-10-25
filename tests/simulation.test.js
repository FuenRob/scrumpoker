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

const participantsWithCrab = [
  ...participants,
  { id: 'bot-4', name: 'Pepe', avatarColor: '#f59e0b', isSpectator: false, hasVoted: true, vote: '🦀' },
];

const statsWithCrab = calculateVoteStats(participantsWithCrab);
console.log('Stats with Crab:', {
  average: statsWithCrab.average,
  median: statsWithCrab.median,
  mode: statsWithCrab.mode,
  totalVoted: statsWithCrab.totalVoted,
  distribution: statsWithCrab.distribution,
});

if (statsWithCrab.totalVoted !== 5) {
  throw new Error(`Expected 5 votes with crab, got ${statsWithCrab.totalVoted}`);
}
if (statsWithCrab.distribution['🦀'] !== 1) {
  throw new Error(`Expected 1 vote for '🦀', got ${statsWithCrab.distribution['🦀']}`);
}
// Average should still be calculated ONLY from numeric votes (5, 5, 5, 8 => 23 / 4 = 5.8)
if (statsWithCrab.average !== 5.8) {
  throw new Error(`Expected numeric average 5.8, got ${statsWithCrab.average}`);
}

console.log('✓ Crab stats test passed!');
console.log('✓ All simulation stats tests passed!');
