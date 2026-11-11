import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
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
} from '../src/utils/roomEngine.ts';
import {
  LIMITS,
  isPlainObject,
  sanitizeDeckType,
  sanitizeRoomId,
} from '../src/utils/validation.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : '*';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '16kb' }));

const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 16 * 1024, // 16 KB max frame size
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

const rooms = new Map<string, InternalRoom>();
const socketToRoom = new Map<string, string>();
const roomCleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();
const socketRateLimits = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 5000;
const RATE_LIMIT_MAX_EVENTS = 45;

function isSocketRateLimited(socketId: string): boolean {
  const now = Date.now();
  const entry = socketRateLimits.get(socketId);
  if (!entry || now >= entry.resetAt) {
    socketRateLimits.set(socketId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_EVENTS;
}

function evictEmptyRoomIfNeeded(): boolean {
  if (rooms.size < LIMITS.MAX_ROOMS) return true;
  for (const [id, r] of rooms.entries()) {
    if (r.users.size === 0) {
      const timer = roomCleanupTimers.get(id);
      if (timer) clearTimeout(timer);
      roomCleanupTimers.delete(id);
      rooms.delete(id);
      return true;
    }
  }
  return rooms.size < LIMITS.MAX_ROOMS;
}

function broadcastRoomState(room: InternalRoom) {
  room.users.forEach((_, socketId) => {
    const state = sanitizeRoomState(room, socketId);
    io.to(socketId).emit('room_state', state);
  });
}

function getRoomForMemberSocket(socketId: string): InternalRoom | undefined {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return undefined;
  const room = rooms.get(roomId);
  if (!room || !room.users.has(socketId)) return undefined;
  return room;
}

function handleSocketLeaveRoom(socket: Socket) {
  const roomId = socketToRoom.get(socket.id);
  if (!roomId) return;
  socketToRoom.delete(socket.id);
  socket.leave(roomId);

  const room = rooms.get(roomId);
  if (!room) return;

  removeUserFromRoom(room, socket.id);

  if (room.users.size === 0) {
    // Clean up empty room after 5 minutes
    const existingTimer = roomCleanupTimers.get(roomId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      roomCleanupTimers.delete(roomId);
      const checkRoom = rooms.get(roomId);
      if (checkRoom && checkRoom.users.size === 0) {
        rooms.delete(roomId);
      }
    }, 5 * 60 * 1000);
    roomCleanupTimers.set(roomId, timer);
  } else {
    broadcastRoomState(room);
  }
}

io.on('connection', (socket: Socket) => {
  // Join Room
  socket.on('join_room', (payload: unknown) => {
    if (isSocketRateLimited(socket.id)) {
      socket.emit('room_join_error', { code: 'rate_limited', message: 'Demasiados intentos. Vuelve a probar en unos segundos.' });
      return;
    }
    if (!isPlainObject(payload)) {
      socket.emit('room_join_error', { code: 'invalid_payload', message: 'Los datos de acceso a la sala no son válidos.' });
      return;
    }

    const cleanRoomId = sanitizeRoomId(payload.roomId);
    if (!cleanRoomId) {
      socket.emit('room_join_error', { code: 'invalid_room_id', message: 'El enlace o código de sala no es válido.' });
      return;
    }

    const previousRoomId = socketToRoom.get(socket.id);
    if (previousRoomId && previousRoomId !== cleanRoomId) {
      handleSocketLeaveRoom(socket);
    }

    let room = rooms.get(cleanRoomId);

    const pendingTimer = roomCleanupTimers.get(cleanRoomId);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      roomCleanupTimers.delete(cleanRoomId);
    }

    if (!room) {
      if (!evictEmptyRoomIfNeeded()) {
        socket.emit('room_join_error', { code: 'room_limit', message: 'El servidor ha alcanzado el límite de salas. Prueba más tarde.' });
        return;
      }
      room = createRoom(
        cleanRoomId,
        typeof payload.roomName === 'string' ? payload.roomName : undefined,
        sanitizeDeckType(payload.deckType),
        socket.id
      );
      rooms.set(cleanRoomId, room);
    }

    const previousSocketIds = new Set(room.users.keys());
    const added = addUserToRoom(room, {
      socketId: socket.id,
      userId: typeof payload.userId === 'string' ? payload.userId : undefined,
      name: typeof payload.name === 'string' ? payload.name : 'Anónimo',
      avatarColor: typeof payload.avatarColor === 'string' ? payload.avatarColor : undefined,
      isSpectator: typeof payload.isSpectator === 'boolean' ? payload.isSpectator : false,
    });

    if (!added) {
      socket.emit('room_join_error', { code: 'room_full', message: 'Esta sala ha alcanzado el máximo de participantes.' });
      return;
    }

    socket.join(cleanRoomId);
    socketToRoom.set(socket.id, cleanRoomId);

    // Clean up socketToRoom if an old socket entry was replaced on rejoin
    for (const oldSocketId of previousSocketIds) {
      if (!room.users.has(oldSocketId)) {
        socketToRoom.delete(oldSocketId);
      }
    }

    broadcastRoomState(room);
  });

  // Cast vote
  socket.on('cast_vote', (payload: unknown) => {
    if (isSocketRateLimited(socket.id) || !isPlainObject(payload)) return;
    const room = getRoomForMemberSocket(socket.id);
    if (!room) return;

    if (castVoteInRoom(room, socket.id, payload.vote)) {
      broadcastRoomState(room);
    }
  });

  // Reveal votes
  socket.on('reveal_votes', () => {
    if (isSocketRateLimited(socket.id)) return;
    const room = getRoomForMemberSocket(socket.id);
    if (!room || room.isRevealed) return;

    revealVotesInRoom(room);
    broadcastRoomState(room);
  });

  // Reset votes for next round
  socket.on('reset_votes', () => {
    if (isSocketRateLimited(socket.id)) return;
    const room = getRoomForMemberSocket(socket.id);
    if (!room) return;

    resetVotesInRoom(room);
    broadcastRoomState(room);
  });

  // Update story / topic
  socket.on('update_story', (payload: unknown) => {
    if (isSocketRateLimited(socket.id) || !isPlainObject(payload)) return;
    const room = getRoomForMemberSocket(socket.id);
    if (!room) return;

    if (updateStoryInRoom(room, payload.storyTitle)) {
      broadcastRoomState(room);
    }
  });

  // Change deck type
  socket.on('change_deck', (payload: unknown) => {
    if (isSocketRateLimited(socket.id) || !isPlainObject(payload)) return;
    const room = getRoomForMemberSocket(socket.id);
    if (!room) return;

    if (changeDeckInRoom(room, payload.deckType)) {
      broadcastRoomState(room);
    }
  });

  // Toggle spectator mode
  socket.on('toggle_spectator', (payload: unknown) => {
    if (isSocketRateLimited(socket.id) || !isPlainObject(payload)) return;
    const room = getRoomForMemberSocket(socket.id);
    if (!room) return;

    if (toggleSpectatorInRoom(room, socket.id, payload.isSpectator)) {
      broadcastRoomState(room);
    }
  });

  // Change user name / avatar color
  socket.on('change_name', (payload: unknown) => {
    if (isSocketRateLimited(socket.id) || !isPlainObject(payload)) return;
    const room = getRoomForMemberSocket(socket.id);
    if (!room) return;

    if (changeNameInRoom(room, socket.id, payload.name, payload.avatarColor)) {
      broadcastRoomState(room);
    }
  });

  // Explicit leave room (when user clicks "Leave room" or navigates back to Lobby)
  socket.on('leave_room', () => {
    handleSocketLeaveRoom(socket);
  });

  // Disconnect
  socket.on('disconnect', () => {
    socketRateLimits.delete(socket.id);
    handleSocketLeaveRoom(socket);
  });
});

// API health endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    roomsCount: rooms.size,
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend in production
const distPath = process.env.STATIC_DIR
  ? path.resolve(process.env.STATIC_DIR)
  : path.resolve(__dirname, '../dist');
app.use(express.static(distPath));
app.use((_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`> Servidor de Scrum Poker corriendo en http://localhost:${PORT}`);
});
