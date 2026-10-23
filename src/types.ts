export type DeckType = 'modified-fibonacci' | 'fibonacci' | 'tshirt' | 'powers-of-2';

export const DECKS: Record<DeckType, { name: string; cards: string[] }> = {
  'modified-fibonacci': {
    name: 'Scrum Estándar (Modificada)',
    cards: ['0', '0.5', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕'],
  },
  'fibonacci': {
    name: 'Fibonacci Puro',
    cards: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'],
  },
  'tshirt': {
    name: 'Tallas de Camiseta (T-Shirt)',
    cards: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'],
  },
  'powers-of-2': {
    name: 'Potencias de 2',
    cards: ['0', '1', '2', '4', '8', '16', '32', '64', '?', '☕'],
  },
};

export interface Participant {
  id: string;
  name: string;
  avatarColor: string;
  isSpectator: boolean;
  hasVoted: boolean;
  vote: string | null;
  isHost?: boolean;
}

export interface HistoryItem {
  id: string;
  storyTitle: string;
  timestamp: number;
  average: number | null;
  agreementPercentage: number;
  votes: { name: string; vote: string }[];
}

export interface RoomState {
  roomId: string;
  roomName: string;
  storyTitle: string;
  deckType: DeckType;
  isRevealed: boolean;
  participants: Participant[];
  history: HistoryItem[];
  hostId?: string;
}

export interface VoteStats {
  average: number | null;
  median: number | null;
  mode: string | null;
  agreementPercentage: number;
  min: number | null;
  max: number | null;
  totalVoters: number;
  totalVoted: number;
  distribution: Record<string, number>;
}
