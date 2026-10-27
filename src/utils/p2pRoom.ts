import { Peer, type DataConnection } from 'peerjs';
import type { DeckType, RoomState } from '../types';
import {
  createRoom,
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
  | { type: 'change_name'; payload: { name: string; senderId: string } }
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
  private hostRetryTimer: any = null;

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
    this.onStateChange = options.onStateChange;
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

        // Setup host internal room
        this.internalRoom = createRoom(
          this.cleanRoomId,
          this.roomName,
          this.deckType,
          this.localSocketId
        );

        addUserToRoom(this.internalRoom, {
          socketId: this.localSocketId,
          userId: this.userId,
          name: this.userName,
          avatarColor: this.avatarColor,
          isSpectator: this.isSpectator,
        });

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

    conn.on('close', () => {
      const socketId = this.peerToSocketId.get(conn.peer) || conn.peer;
      this.connections.delete(conn.peer);
      this.peerToSocketId.delete(conn.peer);
      if (this.internalRoom) {
        removeUserFromRoom(this.internalRoom, socketId);
        this.broadcastHostState();
      }
    });
  }

  private setupGuestHostConnection(conn: DataConnection) {
    this.hostConnection = conn;

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
          senderId: this.localSocketId,
        },
      });
    });

    conn.on('data', (data) => {
      if (this.isDestroyed) return;
      const msg = data as P2PMessage;
      if (msg.type === 'room_state') {
        this.onStateChange(msg.payload);
      }
    });

    conn.on('close', () => {
      if (this.isDestroyed) return;
      this.hostConnection = null;
      // Host disconnected: try to promote self to host
      this.peer?.destroy();
      this.peer = null;
      this.tryBecomeHost();
    });

    conn.on('error', () => {
      if (this.isDestroyed) return;
      this.peer?.destroy();
      this.peer = null;
      this.tryBecomeHost();
    });
  }

  private broadcastHostState() {
    if (!this.internalRoom) return;

    // Notify local host
    const selfState = sanitizeRoomState(this.internalRoom, this.localSocketId);
    this.onStateChange(selfState);

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
          changeNameInRoom(this.internalRoom, senderId, msg.payload.name);
          this.broadcastHostState();
          break;
        }

        case 'leave': {
          removeUserFromRoom(this.internalRoom, senderId);
          this.broadcastHostState();
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
      }
    }
  }

  // Guest actions dispatched to host (and broadcast channel)
  public sendAction(action: P2PMessage) {
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
    if (spectator !== undefined) this.isSpectator = spectator;

    if (this.isHost && this.internalRoom) {
      changeNameInRoom(this.internalRoom, this.localSocketId, name, color);
      if (spectator !== undefined) {
        toggleSpectatorInRoom(this.internalRoom, this.localSocketId, spectator);
      }
      this.broadcastHostState();
    } else {
      this.sendAction({
        type: 'change_name',
        payload: { name, senderId: this.localSocketId },
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
    this.isDestroyed = true;
    if (this.hostRetryTimer) {
      clearTimeout(this.hostRetryTimer);
      this.hostRetryTimer = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {
        // Ignore
      }
      this.broadcastChannel = null;
    }

    this.connections.forEach((conn) => {
      try {
        conn.close();
      } catch {
        // Ignore
      }
    });
    this.connections.clear();

    if (this.hostConnection) {
      try {
        this.hostConnection.close();
      } catch {
        // Ignore
      }
      this.hostConnection = null;
    }

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // Ignore
      }
      this.peer = null;
    }
  }
}
