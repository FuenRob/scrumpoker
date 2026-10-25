import type { Participant, VoteStats } from '../types';

export function calculateVoteStats(participants: Participant[]): VoteStats {
  const voters = participants.filter((p) => !p.isSpectator);
  const activeVotes = voters.filter((p) => p.hasVoted && p.vote !== null);
  
  const distribution: Record<string, number> = {};
  const numericValues: number[] = [];

  for (const p of activeVotes) {
    if (!p.vote) continue;
    distribution[p.vote] = (distribution[p.vote] || 0) + 1;
    const num = parseFloat(p.vote);
    if (!isNaN(num) && p.vote !== '?' && p.vote !== '☕' && p.vote !== '🦀') {
      numericValues.push(num);
    }
  }

  const totalVoted = activeVotes.length;
  const totalVoters = voters.length;

  let average: number | null = null;
  let median: number | null = null;
  let min: number | null = null;
  let max: number | null = null;
  let mode: string | null = null;
  let maxFreq = 0;

  for (const [vote, freq] of Object.entries(distribution)) {
    if (freq > maxFreq) {
      maxFreq = freq;
      mode = vote;
    }
  }

  const agreementPercentage = totalVoted > 0 ? Math.round((maxFreq / totalVoted) * 100) : 0;

  if (numericValues.length > 0) {
    numericValues.sort((a, b) => a - b);
    const sum = numericValues.reduce((acc, val) => acc + val, 0);
    average = Math.round((sum / numericValues.length) * 10) / 10;
    min = numericValues[0];
    max = numericValues[numericValues.length - 1];

    const mid = Math.floor(numericValues.length / 2);
    if (numericValues.length % 2 === 0) {
      median = Math.round(((numericValues[mid - 1] + numericValues[mid]) / 2) * 10) / 10;
    } else {
      median = numericValues[mid];
    }
  }

  return {
    average,
    median,
    mode,
    agreementPercentage,
    min,
    max,
    totalVoters,
    totalVoted,
    distribution,
  };
}

export const AVATAR_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
];

export function getRandomAvatarColor(): string {
  const index = Math.floor(Math.random() * AVATAR_COLORS.length);
  return AVATAR_COLORS[index];
}

export function generateRoomId(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
