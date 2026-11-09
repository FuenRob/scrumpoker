import { DECKS, type DeckType } from '../types';

export const LIMITS = {
  MAX_ROOM_ID_LENGTH: 32,
  MAX_ROOM_NAME_LENGTH: 60,
  MAX_USER_NAME_LENGTH: 25,
  MAX_USER_ID_LENGTH: 64,
  MAX_STORY_TITLE_LENGTH: 200,
  MAX_ROOMS: 500,
  MAX_USERS_PER_ROOM: 50,
} as const;

const CONTROL_CHARS_REGEX = /\p{Cc}/gu;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_AVATAR_COLOR = '#6366f1';

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function generateSecureId(length = 8, alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'): string {
  const bytes = new Uint8Array(length);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let result = '';
  for (let i = 0; i < length; i++) {
    result += alphabet.charAt(bytes[i] % alphabet.length);
  }
  return result;
}

export function sanitizeRoomId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, LIMITS.MAX_ROOM_ID_LENGTH);
  return cleaned || null;
}

export function sanitizeUserName(raw: unknown, fallback = 'Anónimo'): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw
    .replace(CONTROL_CHARS_REGEX, '')
    .trim()
    .slice(0, LIMITS.MAX_USER_NAME_LENGTH);
  return cleaned || fallback;
}

export function sanitizeRoomName(raw: unknown, cleanRoomId: string): string {
  if (typeof raw !== 'string') {
    return `Sala ${cleanRoomId.toUpperCase()}`;
  }
  const cleaned = raw
    .replace(CONTROL_CHARS_REGEX, '')
    .trim()
    .slice(0, LIMITS.MAX_ROOM_NAME_LENGTH);
  return cleaned || `Sala ${cleanRoomId.toUpperCase()}`;
}

export function sanitizeStoryTitle(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(CONTROL_CHARS_REGEX, '')
    .trim()
    .slice(0, LIMITS.MAX_STORY_TITLE_LENGTH);
}

export function sanitizeUserId(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const cleaned = raw
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, LIMITS.MAX_USER_ID_LENGTH);
  return cleaned || undefined;
}

export function sanitizeAvatarColor(raw: unknown, fallback = DEFAULT_AVATAR_COLOR): string {
  if (typeof raw === 'string' && HEX_COLOR_REGEX.test(raw.trim())) {
    return raw.trim().toLowerCase();
  }
  return fallback;
}

export function isValidDeckType(raw: unknown): raw is DeckType {
  return typeof raw === 'string' && Object.prototype.hasOwnProperty.call(DECKS, raw);
}

export function sanitizeDeckType(raw: unknown, fallback: DeckType = 'modified-fibonacci'): DeckType {
  return isValidDeckType(raw) ? raw : fallback;
}

export function isValidVoteForDeck(vote: unknown, deckType: DeckType): vote is string | null {
  if (vote === null) return true;
  if (typeof vote !== 'string') return false;
  if (vote === '🦀') return true;
  const deck = DECKS[deckType] || DECKS['modified-fibonacci'];
  return deck.cards.includes(vote);
}

export function escapeMarkdownCell(text: string): string {
  return text
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();
}
