import type { DeckType, HistoryItem, RoomState } from '../types';

export interface InternalUser {
  socketId: string;
  name: string;
  avatarColor: string;
  isSpectator: boolean;
  vote: string | null;
}

export interface InternalRoom {
  id: string;
  name: string;
  deckType: DeckType;
  storyTitle: string;
  isRevealed: boolean;
  users: Map<string, InternalUser>;
  history: HistoryItem[];
  hostSocketId: string;
}

export function createRoom(
  id: string,
  name?: string,
  deckType: DeckType = 'modified-fibonacci',
  hostSocketId = ''
): InternalRoom {
  const cleanId = id.trim().toLowerCase();
  return {
    id: cleanId,
    name: name || `Sala ${cleanId.toUpperCase()}`,
    deckType,
    storyTitle: '',
    isRevealed: false,
    users: new Map(),
    history: [],
    hostSocketId,
  };
}

export function sanitizeRoomState(room: InternalRoom, recipientSocketId: string): RoomState {
  const participants = Array.from(room.users.values()).map((user) => {
    const isSelf = user.socketId === recipientSocketId;
    return {
      id: user.socketId,
      name: user.name,
      avatarColor: user.avatarColor,
      isSpectator: user.isSpectator,
      hasVoted: user.vote !== null,
      vote: room.isRevealed || isSelf ? user.vote : null,
      isHost: user.socketId === room.hostSocketId,
    };
  });

  return {
    roomId: room.id,
    roomName: room.name,
    storyTitle: room.storyTitle,
    deckType: room.deckType,
    isRevealed: room.isRevealed,
    participants,
    history: room.history,
    hostId: room.hostSocketId,
  };
}

export function calculateHistoryRecord(room: InternalRoom): HistoryItem | null {
  const voters = Array.from(room.users.values()).filter((u) => !u.isSpectator && u.vote !== null);
  if (voters.length === 0) return null;

  const numericVotes: number[] = [];
  const distribution: Record<string, number> = {};

  for (const v of voters) {
    if (!v.vote) continue;
    distribution[v.vote] = (distribution[v.vote] || 0) + 1;
    const num = parseFloat(v.vote);
    if (!isNaN(num) && v.vote !== '?' && v.vote !== '☕' && v.vote !== '🦀') {
      numericVotes.push(num);
    }
  }

  let average: number | null = null;
  if (numericVotes.length > 0) {
    const sum = numericVotes.reduce((a, b) => a + b, 0);
    average = Math.round((sum / numericVotes.length) * 10) / 10;
  }

  let maxFreq = 0;
  for (const freq of Object.values(distribution)) {
    if (freq > maxFreq) maxFreq = freq;
  }
  const agreementPercentage = Math.round((maxFreq / voters.length) * 100);

  return {
    id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    storyTitle: room.storyTitle.trim() || 'Estimación sin título',
    timestamp: Date.now(),
    average,
    agreementPercentage,
    votes: voters.map((v) => ({ name: v.name, vote: v.vote! })),
  };
}

export function addUserToRoom(
  room: InternalRoom,
  user: {
    socketId: string;
    name: string;
    avatarColor?: string;
    isSpectator?: boolean;
    vote?: string | null;
  }
): void {
  room.users.set(user.socketId, {
    socketId: user.socketId,
    name: user.name.trim() || 'Anónimo',
    avatarColor: user.avatarColor || '#6366f1',
    isSpectator: !!user.isSpectator,
    vote: user.vote !== undefined ? user.vote : null,
  });

  if (!room.hostSocketId || !room.users.has(room.hostSocketId)) {
    room.hostSocketId = user.socketId;
  }
}

export function removeUserFromRoom(room: InternalRoom, socketId: string): void {
  room.users.delete(socketId);

  if (room.hostSocketId === socketId && room.users.size > 0) {
    const nextHost = room.users.keys().next().value;
    if (nextHost) {
      room.hostSocketId = nextHost;
    }
  }
}

export function castVoteInRoom(room: InternalRoom, socketId: string, vote: string | null): boolean {
  if (room.isRevealed) return false;
  const user = room.users.get(socketId);
  if (!user || user.isSpectator) return false;
  user.vote = vote;
  return true;
}

export function revealVotesInRoom(room: InternalRoom): HistoryItem | null {
  if (room.isRevealed) return null;
  room.isRevealed = true;
  const record = calculateHistoryRecord(room);
  if (record) {
    room.history.unshift(record);
    if (room.history.length > 20) {
      room.history.pop();
    }
  }
  return record;
}

export function resetVotesInRoom(room: InternalRoom): void {
  room.isRevealed = false;
  room.users.forEach((u) => {
    u.vote = null;
  });
}

export function updateStoryInRoom(room: InternalRoom, storyTitle: string): void {
  room.storyTitle = storyTitle;
}

export function changeDeckInRoom(room: InternalRoom, deckType: DeckType): void {
  room.deckType = deckType;
  room.isRevealed = false;
  room.users.forEach((u) => {
    u.vote = null;
  });
}

export function toggleSpectatorInRoom(
  room: InternalRoom,
  socketId: string,
  isSpectator: boolean
): void {
  const user = room.users.get(socketId);
  if (!user) return;
  user.isSpectator = isSpectator;
  if (isSpectator) {
    user.vote = null;
  }
}

export function changeNameInRoom(
  room: InternalRoom,
  socketId: string,
  name: string,
  avatarColor?: string
): void {
  const user = room.users.get(socketId);
  if (!user) return;
  user.name = name.trim() || 'Anónimo';
  if (avatarColor) {
    user.avatarColor = avatarColor;
  }
}
