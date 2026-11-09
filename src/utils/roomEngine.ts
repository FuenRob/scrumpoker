import type { DeckType, HistoryItem, RoomState } from '../types';
import { buildHistoryRecord } from './stats';

export interface InternalUser {
  socketId: string;
  userId?: string;
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

export function hydrateRoomFromState(state: RoomState, hostSocketId: string): InternalRoom {
  const room = createRoom(state.roomId, state.roomName, state.deckType, hostSocketId);
  room.storyTitle = state.storyTitle || '';
  room.isRevealed = !!state.isRevealed;
  room.history = Array.isArray(state.history) ? [...state.history] : [];

  for (const p of state.participants) {
    room.users.set(p.id, {
      socketId: p.id,
      name: p.name,
      avatarColor: p.avatarColor,
      isSpectator: p.isSpectator,
      vote: p.vote,
    });
  }

  return room;
}

export function sanitizeRoomState(room: InternalRoom, recipientSocketId: string): RoomState {
  const seenUserKeys = new Set<string>();
  const participants = [];

  for (const user of room.users.values()) {
    // Deduplicate by userId or lowercase name
    const uniqueKey = (user.userId || user.name).trim().toLowerCase();
    if (seenUserKeys.has(uniqueKey)) {
      continue;
    }
    seenUserKeys.add(uniqueKey);

    const isSelf = user.socketId === recipientSocketId;
    participants.push({
      id: user.socketId,
      name: user.name,
      avatarColor: user.avatarColor,
      isSpectator: user.isSpectator,
      hasVoted: user.vote !== null,
      vote: room.isRevealed || isSelf ? user.vote : null,
      isHost: user.socketId === room.hostSocketId,
    });
  }

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
  return buildHistoryRecord(room.storyTitle, Array.from(room.users.values()));
}

function findUserInRoom(room: InternalRoom, socketOrUserId: string): InternalUser | undefined {
  const direct = room.users.get(socketOrUserId);
  if (direct) return direct;

  for (const u of room.users.values()) {
    if (u.socketId === socketOrUserId || (u.userId && u.userId === socketOrUserId)) {
      return u;
    }
  }
  return undefined;
}

export function addUserToRoom(
  room: InternalRoom,
  user: {
    socketId: string;
    userId?: string;
    name: string;
    avatarColor?: string;
    isSpectator?: boolean;
    vote?: string | null;
  }
): void {
  const cleanName = user.name.trim() || 'Anónimo';
  const cleanNameLower = cleanName.toLowerCase();

  // Find if a participant with the same userId OR the same name already exists
  let existingKey: string | null = null;
  for (const [key, existing] of room.users.entries()) {
    const isSameUserId = !!(user.userId && existing.userId && user.userId === existing.userId);
    const isSameName = existing.name.trim().toLowerCase() === cleanNameLower;
    const isSameSocket = key === user.socketId;

    if (isSameUserId || isSameName || isSameSocket) {
      existingKey = key;
      break;
    }
  }

  // Preserve existing vote and avatar if re-joining on refresh
  const prevUser = existingKey ? room.users.get(existingKey) : null;
  const vote = user.vote !== undefined ? user.vote : (prevUser?.vote ?? null);
  const avatarColor = user.avatarColor || prevUser?.avatarColor || '#6366f1';
  const isSpectator =
    user.isSpectator !== undefined ? !!user.isSpectator : (prevUser?.isSpectator ?? false);

  // If the socketId has changed (e.g. page refresh), remove the old entry
  if (existingKey && existingKey !== user.socketId) {
    room.users.delete(existingKey);
  }

  room.users.set(user.socketId, {
    socketId: user.socketId,
    userId: user.userId || prevUser?.userId,
    name: cleanName,
    avatarColor,
    isSpectator,
    vote,
  });

  // Preserve host role if the previous user was host
  if (
    !room.hostSocketId ||
    existingKey === room.hostSocketId ||
    !room.users.has(room.hostSocketId)
  ) {
    room.hostSocketId = user.socketId;
  }
}

export function removeUserFromRoom(room: InternalRoom, socketOrUserId: string): boolean {
  let targetKey: string | null = room.users.has(socketOrUserId) ? socketOrUserId : null;
  if (!targetKey) {
    for (const [key, u] of room.users.entries()) {
      if (u.socketId === socketOrUserId || (u.userId && u.userId === socketOrUserId)) {
        targetKey = key;
        break;
      }
    }
  }
  if (!targetKey) return false;

  room.users.delete(targetKey);

  if (room.users.size === 0) {
    room.hostSocketId = '';
  } else if (room.hostSocketId === targetKey || !room.users.has(room.hostSocketId)) {
    const nextHost = room.users.keys().next().value;
    if (nextHost) {
      room.hostSocketId = nextHost;
    }
  }
  return true;
}

export function castVoteInRoom(room: InternalRoom, socketId: string, vote: string | null): boolean {
  if (room.isRevealed) return false;
  const user = findUserInRoom(room, socketId);
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
  const user = findUserInRoom(room, socketId);
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
  const user = findUserInRoom(room, socketId);
  if (!user) return;
  user.name = name.trim() || 'Anónimo';
  if (avatarColor) {
    user.avatarColor = avatarColor;
  }
}
