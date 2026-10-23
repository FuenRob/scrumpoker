import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { RoomState, DeckType } from '../types';
import confetti from 'canvas-confetti';

interface UseScrumPokerProps {
  initialRoomId?: string | null;
}

const STORAGE_KEYS = {
  USERNAME: 'scrumpoker_username',
  AVATAR_COLOR: 'scrumpoker_avatar_color',
  IS_SPECTATOR: 'scrumpoker_is_spectator',
  RECENT_ROOMS: 'scrumpoker_recent_rooms',
};

export function useScrumPoker({ initialRoomId }: UseScrumPokerProps) {
  const [roomId, setRoomId] = useState<string | null>(initialRoomId || null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.USERNAME) || '';
  });
  const [avatarColor, setAvatarColor] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.AVATAR_COLOR) || '#6366f1';
  });
  const [isSpectator, setIsSpectator] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.IS_SPECTATOR) === 'true';
  });
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);
  const prevRevealedRef = useRef<boolean>(false);

  // Initialize socket
  useEffect(() => {
    const serverUrl =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3001'
        : window.location.origin;

    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // If we have roomId and userName, rejoin
      if (roomId && userName) {
        socket.emit('join_room', {
          roomId,
          name: userName,
          avatarColor,
          isSpectator,
        });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
    });

    socket.on('room_state', (state: RoomState) => {
      setRoomState(state);

      // Find self in participants to update selected card
      const self = state.participants.find((p) => p.id === socket.id);
      if (self) {
        setSelectedCard(self.vote);
      }

      // Check if cards were just revealed for confetti
      if (!prevRevealedRef.current && state.isRevealed) {
        // Calculate agreement
        const votes = state.participants.filter((p) => !p.isSpectator && p.vote);
        if (votes.length > 1) {
          const first = votes[0].vote;
          const allSame = votes.every((v) => v.vote === first);
          if (allSame) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#6366f1', '#a855f7', '#ec4899', '#22c55e', '#eab308'],
            });
          }
        }
      }
      prevRevealedRef.current = state.isRevealed;
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, userName, avatarColor, isSpectator]);

  // Join room
  const joinRoom = useCallback(
    (targetRoomId: string, roomName?: string, deckType?: DeckType) => {
      const cleanId = targetRoomId.trim().toLowerCase();
      setRoomId(cleanId);

      // Save to recent rooms
      try {
        const recent = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECENT_ROOMS) || '[]');
        const updated = [
          cleanId,
          ...recent.filter((id: string) => id !== cleanId),
        ].slice(0, 5);
        localStorage.setItem(STORAGE_KEYS.RECENT_ROOMS, JSON.stringify(updated));
      } catch {
        // Ignore storage error
      }

      if (socketRef.current?.connected && userName) {
        socketRef.current.emit('join_room', {
          roomId: cleanId,
          roomName,
          name: userName,
          avatarColor,
          isSpectator,
          deckType,
        });
      }
    },
    [userName, avatarColor, isSpectator]
  );

  // Leave room
  const leaveRoom = useCallback(() => {
    setRoomId(null);
    setRoomState(null);
    setSelectedCard(null);
    setIsSimulated(false);
  }, []);

  // Cast vote
  const castVote = useCallback(
    (card: string) => {
      if (roomState?.isRevealed) return;
      const newVote = selectedCard === card ? null : card;
      setSelectedCard(newVote);

      if (isSimulated && roomState) {
        // Update local simulated state
        setRoomState((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            participants: prev.participants.map((p) =>
              p.id === 'user-self'
                ? { ...p, vote: newVote, hasVoted: newVote !== null }
                : p
            ),
          };
          return updated;
        });
        return;
      }

      if (socketRef.current?.connected) {
        socketRef.current.emit('cast_vote', { vote: newVote });
      }
    },
    [selectedCard, roomState, isSimulated]
  );

  // Reveal votes
  const revealVotes = useCallback(() => {
    if (isSimulated && roomState) {
      setRoomState((prev) => {
        if (!prev) return prev;
        return { ...prev, isRevealed: true };
      });
      return;
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit('reveal_votes');
    }
  }, [isSimulated, roomState]);

  // Reset votes
  const resetVotes = useCallback(() => {
    setSelectedCard(null);

    if (isSimulated && roomState) {
      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          isRevealed: false,
          participants: prev.participants.map((p) => ({
            ...p,
            vote: null,
            hasVoted: false,
          })),
        };
      });
      return;
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit('reset_votes');
    }
  }, [isSimulated, roomState]);

  // Update story
  const updateStory = useCallback(
    (storyTitle: string) => {
      if (isSimulated && roomState) {
        setRoomState((prev) => (prev ? { ...prev, storyTitle } : prev));
        return;
      }

      if (socketRef.current?.connected) {
        socketRef.current.emit('update_story', { storyTitle });
      }
    },
    [isSimulated, roomState]
  );

  // Change deck
  const changeDeck = useCallback(
    (deckType: DeckType) => {
      if (isSimulated && roomState) {
        setRoomState((prev) => (prev ? { ...prev, deckType, isRevealed: false } : prev));
        setSelectedCard(null);
        return;
      }

      if (socketRef.current?.connected) {
        socketRef.current.emit('change_deck', { deckType });
      }
    },
    [isSimulated, roomState]
  );

  // Toggle spectator
  const toggleSpectator = useCallback(
    (spectator: boolean) => {
      setIsSpectator(spectator);
      localStorage.setItem(STORAGE_KEYS.IS_SPECTATOR, String(spectator));

      if (socketRef.current?.connected) {
        socketRef.current.emit('toggle_spectator', { isSpectator: spectator });
      }
    },
    []
  );

  // Save / Update user name
  const saveUserName = useCallback(
    (name: string, color?: string, spectator?: boolean) => {
      const cleanName = name.trim();
      if (!cleanName) return;

      setUserName(cleanName);
      localStorage.setItem(STORAGE_KEYS.USERNAME, cleanName);

      if (color) {
        setAvatarColor(color);
        localStorage.setItem(STORAGE_KEYS.AVATAR_COLOR, color);
      }
      if (spectator !== undefined) {
        setIsSpectator(spectator);
        localStorage.setItem(STORAGE_KEYS.IS_SPECTATOR, String(spectator));
      }

      if (socketRef.current?.connected) {
        socketRef.current.emit('change_name', { name: cleanName });
      }
    },
    []
  );

  // Add demo bots for simulation
  const addDemoBots = useCallback(() => {
    setIsSimulated(true);
    const mockBots = [
      { id: 'bot-1', name: 'Laura (Frontend)', avatarColor: '#ec4899', isSpectator: false, hasVoted: true, vote: '5' },
      { id: 'bot-2', name: 'Marcos (Backend)', avatarColor: '#3b82f6', isSpectator: false, hasVoted: true, vote: '5' },
      { id: 'bot-3', name: 'Elena (QA)', avatarColor: '#10b981', isSpectator: false, hasVoted: true, vote: '8' },
    ];

    setRoomState((prev) => {
      if (!prev) {
        return {
          roomId: roomId || 'demo-room',
          roomName: 'Sala de Demostración con Bots',
          storyTitle: 'US-204: Integración del sistema de notificaciones',
          deckType: 'modified-fibonacci',
          isRevealed: false,
          participants: [
            {
              id: 'user-self',
              name: userName || 'Tú',
              avatarColor,
              isSpectator,
              hasVoted: selectedCard !== null,
              vote: selectedCard,
              isHost: true,
            },
            ...mockBots,
          ],
          history: [],
        };
      }
      return {
        ...prev,
        participants: [
          ...prev.participants.filter((p) => !p.id.startsWith('bot-')),
          ...mockBots,
        ],
      };
    });
  }, [roomId, userName, avatarColor, isSpectator, selectedCard]);

  return {
    roomId,
    roomState,
    isConnected,
    userName,
    avatarColor,
    isSpectator,
    selectedCard,
    joinRoom,
    leaveRoom,
    castVote,
    revealVotes,
    resetVotes,
    updateStory,
    changeDeck,
    toggleSpectator,
    saveUserName,
    addDemoBots,
    isSimulated,
  };
}
