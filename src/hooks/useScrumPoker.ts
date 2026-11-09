import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { RoomState, DeckType } from '../types';
import confetti from 'canvas-confetti';
import { STORAGE_KEYS, getStoredUserName, setStoredUserName, getStoredUserId } from '../utils/storage';
import { P2PRoomManager, type P2PMessage } from '../utils/p2pRoom';
import { buildHistoryRecord, isParticipantSelf } from '../utils/stats';
import { buildSimulatedRoomState } from '../utils/demoBots';

interface UseScrumPokerProps {
  initialRoomId?: string | null;
}

export type ConnectionMode = 'socket' | 'p2p' | 'offline';

function resolveServerUrl(): string | null {
  if (import.meta.env.VITE_P2P === 'true') {
    return null;
  }
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
  const [roomId, setRoomId] = useState<string | null>(
    initialRoomId ? initialRoomId.trim().toLowerCase() : null
  );
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

  const socketRef = useRef<Socket | null>(null);
  const p2pManagerRef = useRef<P2PRoomManager | null>(null);
  const prevRevealedRef = useRef<boolean>(false);
  const socketJoinedRoomRef = useRef<boolean>(false);

  // Consolidated ref for accessing latest state inside socket/P2P listeners
  const sessionRef = useRef({
    roomId,
    roomState,
    userName,
    avatarColor,
    isSpectator,
    isSimulated,
  });

  useEffect(() => {
    sessionRef.current = {
      roomId,
      roomState,
      userName,
      avatarColor,
      isSpectator,
      isSimulated,
    };
  }, [roomId, roomState, userName, avatarColor, isSpectator, isSimulated]);

  const getActiveSocketId = useCallback((): string => {
    return socketRef.current?.id || p2pManagerRef.current?.getSocketId() || 'user-self';
  }, []);

  // Unified transport dispatcher for room actions
  const dispatchRoomAction = useCallback(
    (
      socketEvent: string,
      socketPayload: Record<string, unknown> | undefined,
      buildP2PMessage: (senderId: string) => P2PMessage
    ) => {
      if (sessionRef.current.isSimulated) return;

      if (socketRef.current?.connected) {
        if (socketPayload !== undefined) {
          socketRef.current.emit(socketEvent, socketPayload);
        } else {
          socketRef.current.emit(socketEvent);
        }
      } else if (p2pManagerRef.current) {
        p2pManagerRef.current.sendAction(
          buildP2PMessage(p2pManagerRef.current.getSocketId())
        );
      }
    },
    []
  );

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

  const syncIncomingRoomState = useCallback(
    (state: RoomState, activeId?: string) => {
      if (!sessionRef.current.roomId || state.roomId !== sessionRef.current.roomId) {
        return;
      }
      setRoomState(state);
      const self = state.participants.find((p) =>
        isParticipantSelf(p, activeId, sessionRef.current.userName)
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
    [handleRevealSideEffects]
  );

  // Start P2P mode if socket is not available
  const startP2PMode = useCallback(
    (targetRoomId: string, roomName?: string, deckType?: DeckType, isHostIntent = false) => {
      if (socketRef.current?.connected) return;

      const { userName: curName, avatarColor: curColor, isSpectator: curSpectator, roomState: curState } =
        sessionRef.current;

      p2pManagerRef.current?.destroy();
      const manager = new P2PRoomManager({
        roomId: targetRoomId,
        roomName,
        userId: getStoredUserId(),
        userName: curName || 'Tú',
        avatarColor: curColor,
        isSpectator: curSpectator,
        deckType: deckType || 'modified-fibonacci',
        isHostIntent,
        initialState: curState && curState.roomId === targetRoomId ? curState : null,
        onStateChange: (state: RoomState) => {
          syncIncomingRoomState(state, p2pManagerRef.current?.getSocketId());
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
    [syncIncomingRoomState]
  );

  // Initialize socket or P2P ONCE on mount
  useEffect(() => {
    const serverUrl = resolveServerUrl();

    if (!serverUrl) {
      // Direct P2P mode (e.g. on GitHub Pages)
      if (sessionRef.current.roomId) {
        startP2PMode(sessionRef.current.roomId);
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
      const { roomId: curRoomId, userName: curName, avatarColor: curColor, isSpectator: curSpectator } =
        sessionRef.current;
      if (curRoomId && curName) {
        socket.emit('join_room', {
          roomId: curRoomId,
          userId: getStoredUserId(),
          name: curName,
          avatarColor: curColor,
          isSpectator: curSpectator,
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
      if (sessionRef.current.roomId && !p2pManagerRef.current) {
        startP2PMode(sessionRef.current.roomId);
      }
    });

    socket.on('room_state', (state: RoomState) => {
      syncIncomingRoomState(state, socket.id);
    });

    return () => {
      socket.disconnect();
      p2pManagerRef.current?.destroy();
    };
  }, [startP2PMode, syncIncomingRoomState]);

  // Join Room
  const joinRoom = useCallback(
    (targetRoomId: string, roomName?: string, deckType?: DeckType, userNameOverride?: string) => {
      const cleanId = targetRoomId.trim().toLowerCase();
      setRoomId(cleanId);
      sessionRef.current.roomId = cleanId;

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

      const currentSocketId = getActiveSocketId();
      const effectiveName = userNameOverride || sessionRef.current.userName || 'Tú';
      const effectiveAvatar = sessionRef.current.avatarColor;
      const effectiveSpectator = sessionRef.current.isSpectator;

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
    [getActiveSocketId, startP2PMode]
  );

  // Leave room
  const leaveRoom = useCallback(() => {
    setRoomId(null);
    sessionRef.current.roomId = null;
    setRoomState(null);
    sessionRef.current.roomState = null;
    setSelectedCard(null);
    setIsSimulated(false);
    sessionRef.current.isSimulated = false;
    setShowCrabSwarm(false);
    socketJoinedRoomRef.current = false;

    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_room');
    }

    if (p2pManagerRef.current) {
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

      const currentSocketId = getActiveSocketId();
      const currentName = sessionRef.current.userName;

      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map((p) =>
            isParticipantSelf(p, currentSocketId, currentName)
              ? { ...p, vote: newVote, hasVoted: newVote !== null }
              : p
          ),
        };
      });

      dispatchRoomAction('cast_vote', { vote: newVote }, (senderId) => ({
        type: 'cast_vote',
        payload: { vote: newVote, senderId },
      }));
    },
    [selectedCard, roomState?.isRevealed, getActiveSocketId, dispatchRoomAction]
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
        const newRecord = buildHistoryRecord(prev.storyTitle, prev.participants);

        return {
          ...prev,
          isRevealed: true,
          history: newRecord ? [newRecord, ...prev.history].slice(0, 20) : prev.history,
        };
      }

      return { ...prev, isRevealed: true };
    });

    dispatchRoomAction('reveal_votes', undefined, (senderId) => ({
      type: 'reveal_votes',
      payload: { senderId },
    }));
  }, [isSimulated, selectedCard, dispatchRoomAction]);

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

    dispatchRoomAction('reset_votes', undefined, (senderId) => ({
      type: 'reset_votes',
      payload: { senderId },
    }));
  }, [dispatchRoomAction]);

  // Update story
  const updateStory = useCallback(
    (storyTitle: string) => {
      setRoomState((prev) => (prev ? { ...prev, storyTitle } : prev));

      dispatchRoomAction('update_story', { storyTitle }, (senderId) => ({
        type: 'update_story',
        payload: { storyTitle, senderId },
      }));
    },
    [dispatchRoomAction]
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

      dispatchRoomAction('change_deck', { deckType }, (senderId) => ({
        type: 'change_deck',
        payload: { deckType, senderId },
      }));
    },
    [dispatchRoomAction]
  );

  // Toggle spectator
  const toggleSpectator = useCallback(
    (spectator: boolean) => {
      setIsSpectator(spectator);
      sessionRef.current.isSpectator = spectator;
      localStorage.setItem(STORAGE_KEYS.IS_SPECTATOR, String(spectator));
      if (spectator) {
        setSelectedCard(null);
      }

      const currentSocketId = getActiveSocketId();
      const currentName = sessionRef.current.userName;

      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map((p) =>
            isParticipantSelf(p, currentSocketId, currentName)
              ? {
                  ...p,
                  isSpectator: spectator,
                  vote: spectator ? null : p.vote,
                  hasVoted: spectator ? false : p.hasVoted,
                }
              : p
          ),
        };
      });

      dispatchRoomAction('toggle_spectator', { isSpectator: spectator }, (senderId) => ({
        type: 'toggle_spectator',
        payload: { isSpectator: spectator, senderId },
      }));
    },
    [getActiveSocketId, dispatchRoomAction]
  );

  // Save / Update user name
  const saveUserName = useCallback(
    (name: string, color?: string, spectator?: boolean) => {
      const cleanName = name.trim();
      if (!cleanName) return;

      const previousName = sessionRef.current.userName;
      const currentSocketId = getActiveSocketId();

      setUserName(cleanName);
      sessionRef.current.userName = cleanName;
      setStoredUserName(cleanName);

      if (color) {
        setAvatarColor(color);
        sessionRef.current.avatarColor = color;
        localStorage.setItem(STORAGE_KEYS.AVATAR_COLOR, color);
      }
      if (spectator !== undefined) {
        setIsSpectator(spectator);
        sessionRef.current.isSpectator = spectator;
        localStorage.setItem(STORAGE_KEYS.IS_SPECTATOR, String(spectator));
      }

      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map((p) =>
            isParticipantSelf(p, currentSocketId, previousName || cleanName)
              ? {
                  ...p,
                  name: cleanName,
                  avatarColor: color || p.avatarColor,
                  isSpectator: spectator !== undefined ? spectator : p.isSpectator,
                }
              : p
          ),
        };
      });

      if (socketRef.current?.connected) {
        if (socketJoinedRoomRef.current) {
          socketRef.current.emit('change_name', {
            name: cleanName,
            avatarColor: color || sessionRef.current.avatarColor,
          });
          if (spectator !== undefined) {
            socketRef.current.emit('toggle_spectator', { isSpectator: spectator });
          }
        } else if (sessionRef.current.roomId) {
          socketRef.current.emit('join_room', {
            roomId: sessionRef.current.roomId,
            userId: getStoredUserId(),
            name: cleanName,
            avatarColor: color || sessionRef.current.avatarColor,
            isSpectator: spectator !== undefined ? spectator : sessionRef.current.isSpectator,
          });
          socketJoinedRoomRef.current = true;
        }
      }

      if (p2pManagerRef.current) {
        p2pManagerRef.current.updateProfile(cleanName, color, spectator);
      }
    },
    [getActiveSocketId]
  );

  // Add demo bots for simulation
  const addDemoBots = useCallback(() => {
    setIsSimulated(true);
    sessionRef.current.isSimulated = true;

    const currentSocketId = getActiveSocketId();
    const { roomId: curRoomId, userName: curName, avatarColor: curColor, isSpectator: curSpectator } =
      sessionRef.current;

    setRoomState((prev) =>
      buildSimulatedRoomState(prev, {
        roomId: curRoomId,
        socketId: currentSocketId,
        userName: curName,
        avatarColor: curColor,
        isSpectator: curSpectator,
        selectedCard,
      })
    );
  }, [getActiveSocketId, selectedCard]);

  const closeCrabSwarm = useCallback(() => {
    setShowCrabSwarm(false);
  }, []);

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
    closeCrabSwarm,
  };
}
