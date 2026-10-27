import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { RoomState, DeckType, Participant, HistoryItem } from '../types';
import confetti from 'canvas-confetti';
import { STORAGE_KEYS, getStoredUserName, setStoredUserName, getStoredUserId } from '../utils/storage';
import { P2PRoomManager } from '../utils/p2pRoom';

interface UseScrumPokerProps {
  initialRoomId?: string | null;
}

export type ConnectionMode = 'socket' | 'p2p' | 'offline';

function resolveServerUrl(): string | null {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  if (typeof window === 'undefined') return null;

  const host = window.location.hostname;

  // GitHub Pages has no backend server
  if (host.endsWith('github.io')) {
    return null;
  }

  // Local development
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    host.endsWith('.local')
  ) {
    if (window.location.port === '5173') {
      return `http://${host}:3001`;
    }
    return window.location.origin;
  }

  return window.location.origin;
}

export function useScrumPoker({ initialRoomId }: UseScrumPokerProps) {
  const [roomId, setRoomId] = useState<string | null>(initialRoomId ? initialRoomId.trim().toLowerCase() : null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('offline');
  const [socketId, setSocketId] = useState<string>('user-self');
  const [userName, setUserName] = useState<string>(getStoredUserName);
  const [avatarColor, setAvatarColor] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.AVATAR_COLOR) || '#6366f1';
  });
  const [isSpectator, setIsSpectator] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.IS_SPECTATOR) === 'true';
  });
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [showCrabSwarm, setShowCrabSwarm] = useState<boolean>(false);

  // Refs for access in callbacks and listeners
  const socketRef = useRef<Socket | null>(null);
  const p2pManagerRef = useRef<P2PRoomManager | null>(null);
  const roomIdRef = useRef<string | null>(roomId);
  const userNameRef = useRef<string>(userName);
  const avatarColorRef = useRef<string>(avatarColor);
  const isSpectatorRef = useRef<boolean>(isSpectator);
  const isSimulatedRef = useRef<boolean>(isSimulated);
  const prevRevealedRef = useRef<boolean>(false);
  const socketJoinedRoomRef = useRef<boolean>(false);

  // Synchronize refs
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

  // Handle revelation animations (confetti & crab easter egg)
  const handleRevealSideEffects = useCallback((state: RoomState) => {
    if (!prevRevealedRef.current && state.isRevealed) {
      const hasCrab = state.participants.some(
        (p) => !p.isSpectator && p.vote === '🦀'
      );
      if (hasCrab) {
        setShowCrabSwarm(true);
      }

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
    } else if (!state.isRevealed) {
      setShowCrabSwarm(false);
    }
    prevRevealedRef.current = state.isRevealed;
  }, []);

  // Start P2P mode if socket is not available
  const startP2PMode = useCallback(
    (targetRoomId: string, roomName?: string, deckType?: DeckType, isHostIntent = false) => {
      if (socketRef.current?.connected) return;

      p2pManagerRef.current?.destroy();
      const manager = new P2PRoomManager({
        roomId: targetRoomId,
        roomName,
        userId: getStoredUserId(),
        userName: userNameRef.current || 'Tú',
        avatarColor: avatarColorRef.current,
        isSpectator: isSpectatorRef.current,
        deckType: deckType || 'modified-fibonacci',
        isHostIntent,
        onStateChange: (state: RoomState) => {
          setRoomState(state);
          const self = state.participants.find(
            (p) =>
              (p2pManagerRef.current && p.id === p2pManagerRef.current.getSocketId()) ||
              p.id === 'user-self' ||
              (userNameRef.current && p.name.trim().toLowerCase() === userNameRef.current.trim().toLowerCase())
          );
          if (self) {
            if (self.vote !== null) {
              setSelectedCard(self.vote);
            } else if (!self.hasVoted) {
              setSelectedCard(null);
            }
          }
          handleRevealSideEffects(state);
        },
        onStatusChange: (status) => {
          if (socketRef.current?.connected) return;
          setIsConnected(status === 'connected');
          setConnectionMode(status === 'connected' ? 'p2p' : 'offline');
          if (status === 'connected' && p2pManagerRef.current) {
            setSocketId(p2pManagerRef.current.getSocketId());
          }
        },
      });
      p2pManagerRef.current = manager;
      setSocketId(manager.getSocketId());
    },
    [handleRevealSideEffects]
  );

  // Initialize socket or P2P ONCE on mount
  useEffect(() => {
    const serverUrl = resolveServerUrl();

    if (!serverUrl) {
      // Direct P2P mode (e.g. on GitHub Pages)
      if (roomIdRef.current) {
        startP2PMode(roomIdRef.current);
      }
      return;
    }

    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 3000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionMode('socket');
      setSocketId(socket.id || 'user-self');

      // Stop P2P fallback if socket connects
      if (p2pManagerRef.current) {
        p2pManagerRef.current.destroy();
        p2pManagerRef.current = null;
      }

      // Auto-rejoin if room and username are present
      if (roomIdRef.current && userNameRef.current) {
        socket.emit('join_room', {
          roomId: roomIdRef.current,
          userId: getStoredUserId(),
          name: userNameRef.current,
          avatarColor: avatarColorRef.current,
          isSpectator: isSpectatorRef.current,
        });
        socketJoinedRoomRef.current = true;
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setConnectionMode('offline');
      socketJoinedRoomRef.current = false;
    });

    socket.on('connect_error', () => {
      // If socket server cannot be reached, fallback to WebRTC P2P
      if (roomIdRef.current && !p2pManagerRef.current) {
        startP2PMode(roomIdRef.current);
      }
    });

    socket.on('room_state', (state: RoomState) => {
      setRoomState(state);

      const self = state.participants.find(
        (p) =>
          (socket.id && p.id === socket.id) ||
          p.id === 'user-self' ||
          (userNameRef.current && p.name.trim().toLowerCase() === userNameRef.current.trim().toLowerCase())
      );
      if (self) {
        if (self.vote !== null) {
          setSelectedCard(self.vote);
        } else if (!self.hasVoted) {
          setSelectedCard(null);
        }
      }

      handleRevealSideEffects(state);
    });

    return () => {
      socket.disconnect();
      p2pManagerRef.current?.destroy();
    };
  }, [startP2PMode, handleRevealSideEffects]);

  // Join Room
  const joinRoom = useCallback(
    (targetRoomId: string, roomName?: string, deckType?: DeckType, userNameOverride?: string) => {
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

      const currentSocketId = socketRef.current?.id || p2pManagerRef.current?.getSocketId() || 'user-self';
      const effectiveName = userNameOverride || userNameRef.current || userName || 'Tú';
      const effectiveAvatar = avatarColorRef.current || avatarColor;
      const effectiveSpectator = isSpectatorRef.current ?? isSpectator;

      // Provide immediate optimistic room state so poker table renders instantly
      setRoomState((prev) => {
        if (prev && prev.roomId === cleanId && prev.participants.length > 0) return prev;
        return {
          roomId: cleanId,
          roomName: roomName || `Sala ${cleanId.toUpperCase()}`,
          storyTitle: '',
          deckType: deckType || 'modified-fibonacci',
          isRevealed: false,
          participants: [
            {
              id: currentSocketId,
              name: effectiveName,
              avatarColor: effectiveAvatar,
              isSpectator: effectiveSpectator,
              hasVoted: false,
              vote: null,
              isHost: true,
            },
          ],
          history: [],
          hostId: currentSocketId,
        };
      });

      // Send to Socket.IO if connected
      if (socketRef.current?.connected) {
        socketRef.current.emit('join_room', {
          roomId: cleanId,
          roomName,
          userId: getStoredUserId(),
          name: effectiveName,
          avatarColor: effectiveAvatar,
          isSpectator: effectiveSpectator,
          deckType,
        });
        socketJoinedRoomRef.current = true;
      } else {
        // Otherwise start P2P mode
        startP2PMode(cleanId, roomName, deckType, !!roomName);
      }
    },
    [userName, avatarColor, isSpectator, startP2PMode]
  );

  // Leave room
  const leaveRoom = useCallback(() => {
    setRoomId(null);
    roomIdRef.current = null;
    setRoomState(null);
    setSelectedCard(null);
    setIsSimulated(false);
    setShowCrabSwarm(false);
    socketJoinedRoomRef.current = false;

    if (p2pManagerRef.current) {
      p2pManagerRef.current.sendAction({
        type: 'leave',
        payload: { senderId: p2pManagerRef.current.getSocketId() },
      });
      p2pManagerRef.current.destroy();
      p2pManagerRef.current = null;
    }
  }, []);

  // Cast vote (instant optimistic update)
  const castVote = useCallback(
    (card: string) => {
      if (roomState?.isRevealed) return;
      const newVote = selectedCard === card ? null : card;
      setSelectedCard(newVote);

      const currentSocketId = socketRef.current?.id || p2pManagerRef.current?.getSocketId();

      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map((p) => {
            const isMe =
              (currentSocketId && p.id === currentSocketId) ||
              p.id === 'user-self' ||
              (userNameRef.current && p.name.trim().toLowerCase() === userNameRef.current.trim().toLowerCase());
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

      if (socketRef.current?.connected && !isSimulated) {
        socketRef.current.emit('cast_vote', { vote: newVote });
      } else if (p2pManagerRef.current && !isSimulated) {
        p2pManagerRef.current.sendAction({
          type: 'cast_vote',
          payload: { vote: newVote, senderId: p2pManagerRef.current.getSocketId() },
        });
      }
    },
    [selectedCard, roomState?.isRevealed, isSimulated]
  );

  // Reveal votes
  const revealVotes = useCallback(() => {
    setRoomState((prev) => {
      if (!prev) return prev;

      const hasCrab =
        selectedCard === '🦀' ||
        prev.participants.some((p) => !p.isSpectator && p.vote === '🦀');

      if (hasCrab) {
        setShowCrabSwarm(true);
      }

      if (isSimulated || (!socketRef.current?.connected && !p2pManagerRef.current)) {
        const voters = prev.participants.filter((p) => !p.isSpectator && p.vote !== null);
        const numeric = voters
          .filter((v) => v.vote !== '?' && v.vote !== '☕' && v.vote !== '🦀')
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
    } else if (p2pManagerRef.current && !isSimulated) {
      p2pManagerRef.current.sendAction({
        type: 'reveal_votes',
        payload: { senderId: p2pManagerRef.current.getSocketId() },
      });
    }
  }, [isSimulated, selectedCard]);

  // Reset votes
  const resetVotes = useCallback(() => {
    setSelectedCard(null);
    setShowCrabSwarm(false);

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
    } else if (p2pManagerRef.current && !isSimulated) {
      p2pManagerRef.current.sendAction({
        type: 'reset_votes',
        payload: { senderId: p2pManagerRef.current.getSocketId() },
      });
    }
  }, [isSimulated]);

  // Update story
  const updateStory = useCallback(
    (storyTitle: string) => {
      setRoomState((prev) => (prev ? { ...prev, storyTitle } : prev));

      if (socketRef.current?.connected && !isSimulated) {
        socketRef.current.emit('update_story', { storyTitle });
      } else if (p2pManagerRef.current && !isSimulated) {
        p2pManagerRef.current.sendAction({
          type: 'update_story',
          payload: { storyTitle, senderId: p2pManagerRef.current.getSocketId() },
        });
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
      } else if (p2pManagerRef.current && !isSimulated) {
        p2pManagerRef.current.sendAction({
          type: 'change_deck',
          payload: { deckType, senderId: p2pManagerRef.current.getSocketId() },
        });
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

      const currentSocketId = socketRef.current?.id || p2pManagerRef.current?.getSocketId();
      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map((p) => {
            const isMe =
              (currentSocketId && p.id === currentSocketId) ||
              p.id === 'user-self' ||
              (userNameRef.current && p.name.trim().toLowerCase() === userNameRef.current.trim().toLowerCase());
            if (isMe) {
              return { ...p, isSpectator: spectator, vote: spectator ? null : p.vote };
            }
            return p;
          }),
        };
      });

      if (socketRef.current?.connected && !isSimulated) {
        socketRef.current.emit('toggle_spectator', { isSpectator: spectator });
      } else if (p2pManagerRef.current && !isSimulated) {
        p2pManagerRef.current.sendAction({
          type: 'toggle_spectator',
          payload: { isSpectator: spectator, senderId: p2pManagerRef.current.getSocketId() },
        });
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
      setStoredUserName(cleanName);

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

      const currentSocketId = socketRef.current?.id || p2pManagerRef.current?.getSocketId();
      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map((p) => {
            const isMe =
              (currentSocketId && p.id === currentSocketId) ||
              p.id === 'user-self' ||
              (userNameRef.current && p.name.trim().toLowerCase() === userNameRef.current.trim().toLowerCase());
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
        if (socketJoinedRoomRef.current) {
          socketRef.current.emit('change_name', { name: cleanName });
        } else if (roomIdRef.current) {
          socketRef.current.emit('join_room', {
            roomId: roomIdRef.current,
            userId: getStoredUserId(),
            name: cleanName,
            avatarColor: color || avatarColorRef.current,
            isSpectator: spectator !== undefined ? spectator : isSpectatorRef.current,
          });
          socketJoinedRoomRef.current = true;
        }
      }

      if (p2pManagerRef.current) {
        p2pManagerRef.current.updateProfile(cleanName, color, spectator);
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

    const currentSocketId = socketRef.current?.id || p2pManagerRef.current?.getSocketId() || 'user-self';

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
    connectionMode,
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
    showCrabSwarm,
    closeCrabSwarm: () => setShowCrabSwarm(false),
  };
}
