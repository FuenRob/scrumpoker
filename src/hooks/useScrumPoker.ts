import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { RoomState, DeckType, Participant, HistoryItem } from '../types';
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
  const [socketId, setSocketId] = useState<string>('user-self');
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

  // Refs to always access the latest values without breaking socket listeners
  const socketRef = useRef<Socket | null>(null);
  const roomIdRef = useRef<string | null>(roomId);
  const userNameRef = useRef<string>(userName);
  const avatarColorRef = useRef<string>(avatarColor);
  const isSpectatorRef = useRef<boolean>(isSpectator);
  const isSimulatedRef = useRef<boolean>(isSimulated);
  const prevRevealedRef = useRef<boolean>(false);

  // Keep refs synchronized
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  useEffect(() => {
    avatarColorRef.current = avatarColor;
  }, [avatarColor]);

  useEffect(() => {
    isSpectatorRef.current = isSpectator;
  }, [isSpectator]);

  useEffect(() => {
    isSimulatedRef.current = isSimulated;
  }, [isSimulated]);

  // Initialize socket ONCE on mount
  useEffect(() => {
    const serverUrl =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3001'
        : window.location.origin;

    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setSocketId(socket.id || 'user-self');

      // Auto-rejoin if we already have room and user name
      if (roomIdRef.current && userNameRef.current) {
        socket.emit('join_room', {
          roomId: roomIdRef.current,
          name: userNameRef.current,
          avatarColor: avatarColorRef.current,
          isSpectator: isSpectatorRef.current,
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
      const self = state.participants.find(
        (p) => p.id === socket.id || p.name === userNameRef.current
      );
      if (self) {
        setSelectedCard(self.vote);
      }

      // Check if cards were just revealed for confetti
      if (!prevRevealedRef.current && state.isRevealed) {
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
  }, []);

  // Join room
  const joinRoom = useCallback(
    (targetRoomId: string, roomName?: string, deckType?: DeckType) => {
      const cleanId = targetRoomId.trim().toLowerCase();
      setRoomId(cleanId);
      roomIdRef.current = cleanId;

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

      // Provide immediate optimistic room state
      const currentSocketId = socketRef.current?.id || 'user-self';
      setRoomState((prev) => {
        if (prev && prev.roomId === cleanId) return prev;
        return {
          roomId: cleanId,
          roomName: roomName || `Sala ${cleanId.toUpperCase()}`,
          storyTitle: '',
          deckType: deckType || 'modified-fibonacci',
          isRevealed: false,
          participants: [
            {
              id: currentSocketId,
              name: userName || 'Tú',
              avatarColor,
              isSpectator,
              hasVoted: false,
              vote: null,
              isHost: true,
            },
          ],
          history: [],
          hostId: currentSocketId,
        };
      });

      if (socketRef.current?.connected) {
        socketRef.current.emit('join_room', {
          roomId: cleanId,
          roomName,
          name: userName || 'Tú',
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
    roomIdRef.current = null;
    setRoomState(null);
    setSelectedCard(null);
    setIsSimulated(false);
  }, []);

  // Cast vote (with instant optimistic update so votes ALWAYS register immediately)
  const castVote = useCallback(
    (card: string) => {
      if (roomState?.isRevealed) return;
      const newVote = selectedCard === card ? null : card;
      setSelectedCard(newVote);

      const currentSocketId = socketRef.current?.id;

      // Instant Optimistic Update on local roomState
      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map((p) => {
            const isMe =
              (currentSocketId && p.id === currentSocketId) ||
              p.id === 'user-self' ||
              p.name === userNameRef.current;
            if (isMe) {
              return {
                ...p,
                vote: newVote,
                hasVoted: newVote !== null,
              };
            }
            return p;
          }),
        };
      });

      // Send to server if connected
      if (socketRef.current?.connected && !isSimulated) {
        socketRef.current.emit('cast_vote', { vote: newVote });
      }
    },
    [selectedCard, roomState?.isRevealed, isSimulated]
  );

  // Reveal votes
  const revealVotes = useCallback(() => {
    // Instant Optimistic Update
    setRoomState((prev) => {
      if (!prev) return prev;

      // In simulated mode or offline, record to history
      if (isSimulated || !socketRef.current?.connected) {
        const voters = prev.participants.filter((p) => !p.isSpectator && p.vote !== null);
        const numeric = voters
          .map((v) => parseFloat(v.vote || ''))
          .filter((n) => !isNaN(n));
        const avg =
          numeric.length > 0
            ? Math.round((numeric.reduce((a, b) => a + b, 0) / numeric.length) * 10) / 10
            : null;

        const newRecord: HistoryItem = {
          id: `hist_${Date.now()}`,
          storyTitle: prev.storyTitle || 'Estimación sin título',
          timestamp: Date.now(),
          average: avg,
          agreementPercentage: voters.length > 0 ? 100 : 0,
          votes: voters.map((v) => ({ name: v.name, vote: v.vote! })),
        };

        return {
          ...prev,
          isRevealed: true,
          history: [newRecord, ...prev.history].slice(0, 20),
        };
      }

      return { ...prev, isRevealed: true };
    });

    if (socketRef.current?.connected && !isSimulated) {
      socketRef.current.emit('reveal_votes');
    }
  }, [isSimulated]);

  // Reset votes
  const resetVotes = useCallback(() => {
    setSelectedCard(null);

    // Instant Optimistic Update
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

    if (socketRef.current?.connected && !isSimulated) {
      socketRef.current.emit('reset_votes');
    }
  }, [isSimulated]);

  // Update story
  const updateStory = useCallback(
    (storyTitle: string) => {
      setRoomState((prev) => (prev ? { ...prev, storyTitle } : prev));

      if (socketRef.current?.connected && !isSimulated) {
        socketRef.current.emit('update_story', { storyTitle });
      }
    },
    [isSimulated]
  );

  // Change deck
  const changeDeck = useCallback(
    (deckType: DeckType) => {
      setSelectedCard(null);
      setRoomState((prev) =>
        prev
          ? {
              ...prev,
              deckType,
              isRevealed: false,
              participants: prev.participants.map((p) => ({ ...p, vote: null, hasVoted: false })),
            }
          : prev
      );

      if (socketRef.current?.connected && !isSimulated) {
        socketRef.current.emit('change_deck', { deckType });
      }
    },
    [isSimulated]
  );

  // Toggle spectator
  const toggleSpectator = useCallback(
    (spectator: boolean) => {
      setIsSpectator(spectator);
      isSpectatorRef.current = spectator;
      localStorage.setItem(STORAGE_KEYS.IS_SPECTATOR, String(spectator));

      const currentSocketId = socketRef.current?.id;
      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map((p) => {
            const isMe =
              (currentSocketId && p.id === currentSocketId) ||
              p.id === 'user-self' ||
              p.name === userNameRef.current;
            if (isMe) {
              return { ...p, isSpectator: spectator, vote: spectator ? null : p.vote };
            }
            return p;
          }),
        };
      });

      if (socketRef.current?.connected && !isSimulated) {
        socketRef.current.emit('toggle_spectator', { isSpectator: spectator });
      }
    },
    [isSimulated]
  );

  // Save / Update user name
  const saveUserName = useCallback(
    (name: string, color?: string, spectator?: boolean) => {
      const cleanName = name.trim();
      if (!cleanName) return;

      setUserName(cleanName);
      userNameRef.current = cleanName;
      localStorage.setItem(STORAGE_KEYS.USERNAME, cleanName);

      if (color) {
        setAvatarColor(color);
        avatarColorRef.current = color;
        localStorage.setItem(STORAGE_KEYS.AVATAR_COLOR, color);
      }
      if (spectator !== undefined) {
        setIsSpectator(spectator);
        isSpectatorRef.current = spectator;
        localStorage.setItem(STORAGE_KEYS.IS_SPECTATOR, String(spectator));
      }

      const currentSocketId = socketRef.current?.id;
      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map((p) => {
            const isMe =
              (currentSocketId && p.id === currentSocketId) ||
              p.id === 'user-self' ||
              p.name === userNameRef.current;
            if (isMe) {
              return {
                ...p,
                name: cleanName,
                avatarColor: color || p.avatarColor,
                isSpectator: spectator !== undefined ? spectator : p.isSpectator,
              };
            }
            return p;
          }),
        };
      });

      if (socketRef.current?.connected) {
        socketRef.current.emit('change_name', { name: cleanName });
      }
    },
    []
  );

  // Add demo bots for simulation
  const addDemoBots = useCallback(() => {
    setIsSimulated(true);
    isSimulatedRef.current = true;
    const mockBots: Participant[] = [
      { id: 'bot-1', name: 'Laura (Frontend)', avatarColor: '#ec4899', isSpectator: false, hasVoted: true, vote: '5' },
      { id: 'bot-2', name: 'Marcos (Backend)', avatarColor: '#3b82f6', isSpectator: false, hasVoted: true, vote: '5' },
      { id: 'bot-3', name: 'Elena (QA)', avatarColor: '#10b981', isSpectator: false, hasVoted: true, vote: '8' },
    ];

    const currentSocketId = socketRef.current?.id || 'user-self';

    setRoomState((prev) => {
      const existingUser = prev?.participants.find(
        (p) => p.id === currentSocketId || p.id === 'user-self' || p.name === userNameRef.current
      );

      const currentUser: Participant = existingUser || {
        id: currentSocketId,
        name: userNameRef.current || 'Tú',
        avatarColor: avatarColorRef.current,
        isSpectator: isSpectatorRef.current,
        hasVoted: selectedCard !== null,
        vote: selectedCard,
        isHost: true,
      };

      return {
        roomId: prev?.roomId || roomIdRef.current || 'demo-room',
        roomName: prev?.roomName || 'Sala de Demostración con Bots',
        storyTitle: prev?.storyTitle || 'US-204: Integración del sistema de pagos y checkout',
        deckType: prev?.deckType || 'modified-fibonacci',
        isRevealed: false,
        participants: [currentUser, ...mockBots],
        history: prev?.history || [],
        hostId: currentUser.id,
      };
    });
  }, [selectedCard]);

  return {
    roomId,
    roomState,
    isConnected,
    socketId,
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
