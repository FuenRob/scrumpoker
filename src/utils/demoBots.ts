import type { Participant, RoomState } from '../types';
import { isParticipantSelf } from './stats';

export const DEMO_BOT_POOL: Participant[] = [
  { id: 'bot-1', name: 'Laura (Frontend)', avatarColor: '#ec4899', isSpectator: false, hasVoted: true, vote: '5' },
  { id: 'bot-2', name: 'Marcos (Backend)', avatarColor: '#3b82f6', isSpectator: false, hasVoted: true, vote: '5' },
  { id: 'bot-3', name: 'Elena (QA)', avatarColor: '#10b981', isSpectator: false, hasVoted: true, vote: '8' },
  { id: 'bot-4', name: 'David (DevOps)', avatarColor: '#f59e0b', isSpectator: false, hasVoted: true, vote: '5' },
  { id: 'bot-5', name: 'Sara (Product)', avatarColor: '#8b5cf6', isSpectator: false, hasVoted: true, vote: '8' },
  { id: 'bot-6', name: 'Carlos (Mobile)', avatarColor: '#06b6d4', isSpectator: false, hasVoted: true, vote: '3' },
  { id: 'bot-7', name: 'Ana (Design)', avatarColor: '#f43f5e', isSpectator: false, hasVoted: true, vote: '5' },
  { id: 'bot-8', name: 'Javier (Data)', avatarColor: '#14b8a6', isSpectator: false, hasVoted: true, vote: '8' },
];

export function buildSimulatedRoomState(
  prev: RoomState | null,
  options: {
    roomId: string | null;
    socketId: string;
    userName: string;
    avatarColor: string;
    isSpectator: boolean;
    selectedCard: string | null;
  }
): RoomState {
  const { roomId, socketId, userName, avatarColor, isSpectator, selectedCard } = options;

  const existingUser = prev?.participants.find((p) =>
    isParticipantSelf(p, socketId, userName)
  );

  const currentUser: Participant = existingUser || {
    id: socketId,
    name: userName || 'Tú',
    avatarColor,
    isSpectator,
    hasVoted: selectedCard !== null,
    vote: selectedCard,
    isHost: true,
  };

  const existingBots = (prev?.participants || []).filter((p) => p.id.startsWith('bot-'));
  let nextBots: Participant[];

  if (existingBots.length === 0) {
    nextBots = DEMO_BOT_POOL.slice(0, 3);
  } else if (existingBots.length < DEMO_BOT_POOL.length) {
    nextBots = DEMO_BOT_POOL.slice(0, existingBots.length + 1);
  } else {
    nextBots = existingBots;
  }

  const otherRealUsers = (prev?.participants || []).filter(
    (p) => !p.id.startsWith('bot-') && !isParticipantSelf(p, currentUser.id, currentUser.name)
  );

  return {
    roomId: prev?.roomId || roomId || 'demo-room',
    roomName: prev?.roomName || 'Sala de Demostración con Bots',
    storyTitle: prev?.storyTitle || 'US-204: Integración del sistema de pagos y checkout',
    deckType: prev?.deckType || 'modified-fibonacci',
    isRevealed: false,
    participants: [currentUser, ...otherRealUsers, ...nextBots],
    history: prev?.history || [],
    hostId: currentUser.id,
  };
}
