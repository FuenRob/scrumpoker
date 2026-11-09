import { Peer, type DataConnection } from 'peerjs';
import type { DeckType, RoomState } from '../types';
import {
  createRoom,
  hydrateRoomFromState,
  sanitizeRoomState,
  addUserToRoom,
  removeUserFromRoom,
  castVoteInRoom,
  revealVotesInRoom,
  resetVotesInRoom,
  updateStoryInRoom,
  changeDeckInRoom,
  toggleSpectatorInRoom,
  changeNameInRoom,
  type InternalRoom,
} from './roomEngine';

export type P2PMessage =
  | {
      type: 'join_room';
      payload: {
        roomId: string;
        roomName?: string;
        userId?: string;
        name: string;
        avatarColor?: string;
        isSpectator?: boolean;
        deckType?: DeckType;
        vote?: string | null;
        senderId: string;
      };
    }
  | { type: 'room_state'; payload: RoomState }
  | { type: 'cast_vote'; payload: { vote: string | null; senderId: string } }
  | { type: 'reveal_votes'; payload: { senderId: string } }
  | { type: 'reset_votes'; payload: { senderId: string } }
  | { type: 'update_story'; payload: { storyTitle: string; senderId: string } }
  | { type: 'change_deck'; payload: { deckType: DeckType; senderId: string } }
  | { type: 'toggle_spectator'; payload: { isSpectator: boolean; senderId: string } }
  | { type: 'change_name'; payload: { name: string; avatarColor?: string; senderId: string } }
  | { type: 'leave'; payload: { senderId: string } };

export interface P2PRoomOptions {
  roomId: string;
  roomName?: string;
  userId?: string;
  userName: string;
  avatarColor: string;
  isSpectator: boolean;
  deckType?: DeckType;
  isHostIntent?: boolean;
  initialState?: RoomState | null;
  onStateChange: (state: RoomState) => void;
  onStatusChange: (status: 'connected' | 'connecting' | 'disconnected') => void;
}

export class P2PRoomManager {
  private cleanRoomId: string;
  private roomName?: string;
  private userId: string;
  private userName: string;
  private avatarColor: string;
  private isSpectator: boolean;
  private deckType: DeckType;
  private isHostIntent: boolean;
  private lastKnownState: RoomState | null = null;
  private currentVote: string | null = null;
  private onStateChange: (state: RoomState) => void;
  private onStatusChange: (status: 'connected' | 'connecting' | 'disconnected') => void;

  private peer: Peer | null = null;
  private isHost = false;
  private internalRoom: InternalRoom | null = null;
  private connections = new Map<string, DataConnection>();
  private peerToSocketId = new Map<string, string>();
  private hostConnection: DataConnection | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private localSocketId: string;
  private isDestroyed = false;
  private hostRetryTimer: ReturnType<typeof setTimeout> | null = null;

  private handleBeforeUnload = () => {
    this.destroy();
  };

  constructor(options: P2PRoomOptions) {
    this.cleanRoomId = options.roomId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    this.roomName = options.roomName;
    this.userId = options.userId || `u_${Math.random().toString(36).substring(2, 9)}`;
    this.userName = options.userName;
    this.avatarColor = options.avatarColor;
    this.isSpectator = options.isSpectator;
    this.deckType = options.deckType || 'modified-fibonacci';
    this.isHostIntent = !!options.isHostIntent;
    this.lastKnownState = options.initialState || null;
    this.onStateChange = (state: RoomState) => {
      this.lastKnownState = state;
      options.onStateChange(state);
    };
    this.onStatusChange = options.onStatusChange;

    this.localSocketId = `p2p_${Math.random().toString(36).substring(2, 9)}`;

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }

    this.initBroadcastChannel();
    this.startP2P();
  }

  public getSocketId(): string {
    return this.localSocketId;
  }

  private initBroadcastChannel() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel(`scrumpoker_bc_${this.cleanRoomId}`);
        this.broadcastChannel.onmessage = (event) => {
          if (this.isDestroyed) return;
          const msg = event.data as P2PMessage;
          this.handleIncomingMessage(msg, 'local-bc');
        };
      } catch {
        // BroadcastChannel unavailable
      }
    }
  }

  private getHostPeerId(): string {
    // Alphanumeric with hyphens for PeerJS compatibility
    const safeRoom = this.cleanRoomId.replace(/[^a-z0-9]/g, '') || 'default';
    return `spoker-v2-${safeRoom}`;
  }

  private startP2P() {
    this.onStatusChange('connecting');

    if (this.isHostIntent) {
      this.tryBecomeHost();
    } else {
      this.connectAsGuest();
    }
  }

  private tryBecomeHost() {
    const hostId = this.getHostPeerId();

    try {
      this.peer = new Peer(hostId, {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      this.peer.on('open', () => {
        if (this.isDestroyed) return;
        this.isHost = true;
        this.onStatusChange('connected');

        // Setup or hydrate host internal room preserving previous state on host migration
        if (this.lastKnownState && this.lastKnownState.roomId === this.cleanRoomId) {
          this.internalRoom = hydrateRoomFromState(this.lastKnownState, this.localSocketId);
        } else {
          this.internalRoom = createRoom(
            this.cleanRoomId,
            this.roomName,
            this.deckType,
            this.localSocketId
          );
        }

        addUserToRoom(this.internalRoom, {
          socketId: this.localSocketId,
          userId: this.userId,
          name: this.userName,
          avatarColor: this.avatarColor,
          isSpectator: this.isSpectator,
          vote: this.currentVote,
        });
        this.internalRoom.hostSocketId = this.localSocketId;

        this.broadcastHostState();
      });

      this.peer.on('connection', (conn) => {
        if (this.isDestroyed || !this.isHost) return;
        this.setupHostGuestConnection(conn);
      });

      this.peer.on('error', (err: any) => {
        if (this.isDestroyed) return;
        // If ID is already taken, check if we should retry briefly (e.g. host page reloaded) or connect as guest
        if (err.type === 'unavailable-id') {
          this.peer?.destroy();
          this.peer = null;
          if (this.isHostIntent && !this.hostRetryTimer) {
            this.hostRetryTimer = setTimeout(() => {
              this.hostRetryTimer = null;
              if (!this.isDestroyed && !this.peer) {
                this.tryBecomeHost();
              }
            }, 600);
          } else {
            this.connectAsGuest();
          }
        } else {
          this.onStatusChange('disconnected');
        }
      });
    } catch {
      this.connectAsGuest();
    }
  }

  private connectAsGuest() {
    const guestId = `sp-guest-${this.cleanRoomId}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      this.peer = new Peer(guestId, {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      this.peer.on('open', () => {
        if (this.isDestroyed) return;
        const hostId = this.getHostPeerId();
        const conn = this.peer!.connect(hostId, { reliable: true });
        this.setupGuestHostConnection(conn);
      });

      this.peer.on('error', (err: any) => {
        if (this.isDestroyed) return;
        // If host was not found, become the host!
        if (err.type === 'peer-unavailable') {
          this.peer?.destroy();
          this.peer = null;
          this.tryBecomeHost();
        } else {
          this.onStatusChange('disconnected');
        }
      });
    } catch {
      this.onStatusChange('disconnected');
    }
  }

  private setupHostGuestConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
    });

    conn.on('data', (data) => {
      if (this.isDestroyed) return;
      this.handleIncomingMessage(data as P2PMessage, conn.peer);
    });

    const handleGuestDisconnect = () => {
      const socketId = this.peerToSocketId.get(conn.peer) || conn.peer;
      this.connections.delete(conn.peer);
      this.peerToSocketId.delete(conn.peer);
      if (!this.isDestroyed && this.internalRoom) {
        if (removeUserFromRoom(this.internalRoom, socketId)) {
          this.broadcastHostState();
        }
      }
    };

    conn.on('close', handleGuestDisconnect);
    conn.on('error', handleGuestDisconnect);
  }

  private setupGuestHostConnection(conn: DataConnection) {
    this.hostConnection = conn;
    let connectedHostSocketId: string | null = null;

    conn.on('open', () => {
      if (this.isDestroyed) return;
      this.onStatusChange('connected');

      // Send join_room to host
      conn.send({
        type: 'join_room',
        payload: {
          roomId: this.cleanRoomId,
          roomName: this.roomName,
          userId: this.userId,
          name: this.userName,
          avatarColor: this.avatarColor,
          isSpectator: this.isSpectator,
          deckType: this.deckType,
          vote: this.currentVote,
          senderId: this.localSocketId,
        },
      });
    });

    conn.on('data', (data) => {
      if (this.isDestroyed) return;
      const msg = data as P2PMessage;
      if (msg.type === 'room_state') {
        if (!connectedHostSocketId && msg.payload.hostId) {
          connectedHostSocketId = msg.payload.hostId;
        }
        this.onStateChange(msg.payload);
      }
    });

    const handleHostDisconnect = () => {
      if (this.isDestroyed) return;
      const hostToRemove = connectedHostSocketId || this.lastKnownState?.hostId;
      if (hostToRemove && this.lastKnownState) {
        const remaining = this.lastKnownState.participants.filter((p) => p.id !== hostToRemove);
        const nextHostId = remaining[0]?.id || this.localSocketId;
        this.lastKnownState = {
          ...this.lastKnownState,
          hostId: nextHostId,
          participants: remaining.map((p) => ({
            ...p,
            isHost: p.id === nextHostId,
          })),
        };
        this.onStateChange(this.lastKnownState);
      }
      this.hostConnection = null;
      // Host disconnected: try to promote self to host
      this.peer?.destroy();
      this.peer = null;
      this.tryBecomeHost();
    };

    conn.on('close', handleHostDisconnect);
    conn.on('error', handleHostDisconnect);
  }

  private broadcastHostState(notifySelf = true) {
    if (!this.internalRoom) return;

    // Notify local host
    if (notifySelf && !this.isDestroyed) {
      const selfState = sanitizeRoomState(this.internalRoom, this.localSocketId);
      this.onStateChange(selfState);
    }

    // Send to WebRTC connections
    this.connections.forEach((conn, peerId) => {
      if (conn.open) {
        const targetSocketId = this.peerToSocketId.get(peerId) || peerId;
        const peerState = sanitizeRoomState(this.internalRoom!, targetSocketId);
        conn.send({ type: 'room_state', payload: peerState });
      }
    });

    // Mirror to BroadcastChannel
    if (this.broadcastChannel) {
      try {
        const serializedUsers = Array.from(this.internalRoom.users.entries());
        this.broadcastChannel.postMessage({
          type: 'internal_room_sync',
          payload: {
            ...this.internalRoom,
            users: serializedUsers,
          },
        });
      } catch {
        // Ignore
      }
    }
  }

  private handleIncomingMessage(msg: P2PMessage, senderPeerId: string) {
    if (!msg || !msg.type) return;

    // If I am the Host, process action in roomEngine and broadcast!
    if (this.isHost && this.internalRoom) {
      const senderId = (msg as any).payload?.senderId || senderPeerId;

      switch (msg.type) {
        case 'join_room': {
          const p = msg.payload;
          this.peerToSocketId.set(senderPeerId, senderId);
          addUserToRoom(this.internalRoom, {
            socketId: senderId,
            userId: p.userId,
            name: p.name,
            avatarColor: p.avatarColor,
            isSpectator: p.isSpectator,
            vote: p.vote,
          });
          this.broadcastHostState();
          break;
        }

        case 'cast_vote': {
          castVoteInRoom(this.internalRoom, senderId, msg.payload.vote);
          this.broadcastHostState();
          break;
        }

        case 'reveal_votes': {
          revealVotesInRoom(this.internalRoom);
          this.broadcastHostState();
          break;
        }

        case 'reset_votes': {
          resetVotesInRoom(this.internalRoom);
          this.broadcastHostState();
          break;
        }

        case 'update_story': {
          updateStoryInRoom(this.internalRoom, msg.payload.storyTitle);
          this.broadcastHostState();
          break;
        }

        case 'change_deck': {
          changeDeckInRoom(this.internalRoom, msg.payload.deckType);
          this.broadcastHostState();
          break;
        }

        case 'toggle_spectator': {
          toggleSpectatorInRoom(this.internalRoom, senderId, msg.payload.isSpectator);
          this.broadcastHostState();
          break;
        }

        case 'change_name': {
          changeNameInRoom(
            this.internalRoom,
            senderId,
            msg.payload.name,
            msg.payload.avatarColor
          );
          this.broadcastHostState();
          break;
        }

        case 'leave': {
          const mappedSocketId = this.peerToSocketId.get(senderPeerId);
          const removedBySender = removeUserFromRoom(this.internalRoom, senderId);
          const removedByPeer =
            mappedSocketId && mappedSocketId !== senderId
              ? removeUserFromRoom(this.internalRoom, mappedSocketId)
              : false;
          if (removedBySender || removedByPeer) {
            this.broadcastHostState();
          }
          break;
        }
      }
    } else if (!this.isHost) {
      if ((msg as any).type === 'internal_room_sync') {
        const data = (msg as any).payload;
        const reconstructedRoom: InternalRoom = {
          ...data,
          users: new Map(data.users),
        };
        const myState = sanitizeRoomState(reconstructedRoom, this.localSocketId);
        this.onStateChange(myState);
      } else if (msg.type === 'room_state') {
        this.onStateChange(msg.payload);
      } else if (msg.type === 'leave' && this.lastKnownState) {
        const leavingId = msg.payload.senderId;
        const remaining = this.lastKnownState.participants.filter((p) => p.id !== leavingId);
        if (remaining.length !== this.lastKnownState.participants.length) {
          const wasHost = this.lastKnownState.hostId === leavingId;
          const nextHostId = wasHost ? remaining[0]?.id : this.lastKnownState.hostId;
          this.lastKnownState = {
            ...this.lastKnownState,
            hostId: nextHostId,
            participants: remaining.map((p) => ({
              ...p,
              isHost: p.id === nextHostId,
            })),
          };
          this.onStateChange(this.lastKnownState);
        }
      }
    }
  }

  // Guest actions dispatched to host (and broadcast channel)
  public sendAction(action: P2PMessage) {
    if (action.type === 'cast_vote') {
      this.currentVote = action.payload.vote;
    } else if (action.type === 'reset_votes' || action.type === 'change_deck') {
      this.currentVote = null;
    }

    if (this.isHost) {
      this.handleIncomingMessage(action, this.localSocketId);
    } else if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send(action);
    }

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(action);
      } catch {
        // Ignore
      }
    }
  }

  public updateProfile(name: string, color?: string, spectator?: boolean) {
    this.userName = name;
    if (color) this.avatarColor = color;
    if (spectator !== undefined) {
      this.isSpectator = spectator;
      if (spectator) this.currentVote = null;
    }

    if (this.isHost && this.internalRoom) {
      changeNameInRoom(this.internalRoom, this.localSocketId, name, color);
      if (spectator !== undefined) {
        toggleSpectatorInRoom(this.internalRoom, this.localSocketId, spectator);
      }
      this.broadcastHostState();
    } else {
      this.sendAction({
        type: 'change_name',
        payload: { name, avatarColor: color, senderId: this.localSocketId },
      });
      if (spectator !== undefined) {
        this.sendAction({
          type: 'toggle_spectator',
          payload: { isSpectator: spectator, senderId: this.localSocketId },
        });
      }
    }
  }

  public destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    const leaveMessage: P2PMessage = {
      type: 'leave',
      payload: { senderId: this.localSocketId },
    };

    // Notify peers and local tabs that this user has left the room
    if (this.isHost && this.internalRoom) {
      removeUserFromRoom(this.internalRoom, this.localSocketId);
      this.broadcastHostState(false);
    } else if (this.hostConnection && this.hostConnection.open) {
      try {
        this.hostConnection.send(leaveMessage);
      } catch {
        // Ignore
      }
    }

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(leaveMessage);
        this.broadcastChannel.close();
      } catch {
        // Ignore
      }
      this.broadcastChannel = null;
    }

    if (this.hostRetryTimer) {
      clearTimeout(this.hostRetryTimer);
      this.hostRetryTimer = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }

    const activeConnections = Array.from(this.connections.values());
    const activeHostConn = this.hostConnection;
    const activePeer = this.peer;

    this.connections.clear();
    this.hostConnection = null;
    this.peer = null;

    // Allow outgoing leave / room_state frames to flush over WebRTC before tearing down PeerJS
    setTimeout(() => {
      activeConnections.forEach((conn) => {
        try {
          conn.close();
        } catch {
          // Ignore
        }
      });

      if (activeHostConn) {
        try {
          activeHostConn.close();
        } catch {
          // Ignore
        }
      }

      if (activePeer) {
        try {
          activePeer.destroy();
        } catch {
          // Ignore
        }
      }
    }, 60);
  }
}
