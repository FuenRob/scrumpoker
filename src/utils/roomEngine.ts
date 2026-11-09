import type { DeckType, HistoryItem, RoomState } from '../types';
import { buildHistoryRecord } from './stats';
import {
  LIMITS,
  isValidDeckType,
  isValidVoteForDeck,
  sanitizeAvatarColor,
  sanitizeDeckType,
  sanitizeRoomId,
  sanitizeRoomName,
  sanitizeStoryTitle,
  sanitizeUserId,
  sanitizeUserName,
} from './validation';

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
  const cleanId = sanitizeRoomId(id) || 'default';
  return {
    id: cleanId,
    name: sanitizeRoomName(name, cleanId),
    deckType: sanitizeDeckType(deckType),
    storyTitle: '',
    isRevealed: false,
    users: new Map(),
    history: [],
    hostSocketId,
  };
}

export function hydrateRoomFromState(state: RoomState, hostSocketId: string): InternalRoom {
  const room = createRoom(state.roomId, state.roomName, state.deckType, hostSocketId);
  room.storyTitle = sanitizeStoryTitle(state.storyTitle);
  room.isRevealed = !!state.isRevealed;
  room.history = Array.isArray(state.history) ? state.history.slice(0, 20) : [];

  if (Array.isArray(state.participants)) {
    for (const p of state.participants.slice(0, LIMITS.MAX_USERS_PER_ROOM)) {
      if (!p || typeof p.id !== 'string') continue;
      room.users.set(p.id, {
        socketId: p.id,
        name: sanitizeUserName(p.name),
        avatarColor: sanitizeAvatarColor(p.avatarColor),
        isSpectator: !!p.isSpectator,
        vote: isValidVoteForDeck(p.vote, room.deckType) ? p.vote : null,
      });
    }
  }

  return room;
}

export function sanitizeRoomState(room: InternalRoom, recipientSocketId: string): RoomState {
  const seenUserKeys = new Set<string>();
  const participants = [];

  for (const user of room.users.values()) {
    // Deduplicate by persistent userId or socketId (allows distinct users with same display name)
    const uniqueKey = (user.userId || user.socketId).trim().toLowerCase();
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
): boolean {
  const cleanName = sanitizeUserName(user.name);
  const cleanNameLower = cleanName.toLowerCase();
  const cleanUserId = sanitizeUserId(user.userId);

  // Match existing session ONLY by socketId, matching secret userId, or legacy unnamed session without userId
  let existingKey: string | null = null;
  for (const [key, existing] of room.users.entries()) {
    const isSameSocket = key === user.socketId;
    const isSameUserId = Boolean(cleanUserId && existing.userId && cleanUserId === existing.userId);
    const isUnauthenticatedSameName =
      !existing.userId && existing.name.trim().toLowerCase() === cleanNameLower;

    if (isSameSocket || isSameUserId || isUnauthenticatedSameName) {
      existingKey = key;
      break;
    }
  }

  if (!existingKey && room.users.size >= LIMITS.MAX_USERS_PER_ROOM) {
    return false;
  }

  // Preserve existing vote and avatar if re-joining on refresh
  const prevUser = existingKey ? room.users.get(existingKey) : null;
  const rawVote = user.vote !== undefined ? user.vote : (prevUser?.vote ?? null);
  const vote = isValidVoteForDeck(rawVote, room.deckType) ? rawVote : null;
  const avatarColor = sanitizeAvatarColor(user.avatarColor || prevUser?.avatarColor);
  const isSpectator =
    user.isSpectator !== undefined ? !!user.isSpectator : (prevUser?.isSpectator ?? false);

  // If the socketId has changed (e.g. page refresh), remove the old entry
  if (existingKey && existingKey !== user.socketId) {
    room.users.delete(existingKey);
  }

  room.users.set(user.socketId, {
    socketId: user.socketId,
    userId: cleanUserId || prevUser?.userId,
    name: cleanName,
    avatarColor,
    isSpectator,
    vote: isSpectator ? null : vote,
  });

  // Preserve host role if the previous user was host
  if (
    !room.hostSocketId ||
    existingKey === room.hostSocketId ||
    !room.users.has(room.hostSocketId)
  ) {
    room.hostSocketId = user.socketId;
  }

  return true;
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

export function castVoteInRoom(
  room: InternalRoom,
  socketId: string,
  vote: unknown
): boolean {
  if (room.isRevealed) return false;
  if (!isValidVoteForDeck(vote, room.deckType)) return false;

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

export function updateStoryInRoom(room: InternalRoom, storyTitle: unknown): boolean {
  if (typeof storyTitle !== 'string') return false;
  room.storyTitle = sanitizeStoryTitle(storyTitle);
  return true;
}

export function changeDeckInRoom(room: InternalRoom, deckType: unknown): boolean {
  if (!isValidDeckType(deckType)) return false;
  room.deckType = deckType;
  room.isRevealed = false;
  room.users.forEach((u) => {
    u.vote = null;
  });
  return true;
}

export function toggleSpectatorInRoom(
  room: InternalRoom,
  socketId: string,
  isSpectator: unknown
): boolean {
  if (typeof isSpectator !== 'boolean') return false;
  const user = findUserInRoom(room, socketId);
  if (!user) return false;
  user.isSpectator = isSpectator;
  if (isSpectator) {
    user.vote = null;
  }
  return true;
}

export function changeNameInRoom(
  room: InternalRoom,
  socketId: string,
  name: unknown,
  avatarColor?: unknown
): boolean {
  if (typeof name !== 'string') return false;
  const user = findUserInRoom(room, socketId);
  if (!user) return false;
  user.name = sanitizeUserName(name);
  if (avatarColor !== undefined) {
    user.avatarColor = sanitizeAvatarColor(avatarColor, user.avatarColor);
  }
  return true;
}
