import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import type { DeckType } from '../src/types.ts';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const rooms = new Map<string, InternalRoom>();
const socketToRoom = new Map<string, string>();
const roomCleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();

function broadcastRoomState(room: InternalRoom) {
  room.users.forEach((_, socketId) => {
    const state = sanitizeRoomState(room, socketId);
    io.to(socketId).emit('room_state', state);
  });
}

function getRoomForSocket(socketId: string): InternalRoom | undefined {
  const roomId = socketToRoom.get(socketId);
  return roomId ? rooms.get(roomId) : undefined;
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
  socket.on(
    'join_room',
    ({
      roomId,
      roomName,
      userId,
      name,
      avatarColor,
      isSpectator = false,
      deckType = 'modified-fibonacci',
    }: {
      roomId: string;
      roomName?: string;
      userId?: string;
      name: string;
      avatarColor?: string;
      isSpectator?: boolean;
      deckType?: DeckType;
    }) => {
      const cleanRoomId = roomId.trim().toLowerCase();
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
        room = createRoom(cleanRoomId, roomName, deckType, socket.id);
        rooms.set(cleanRoomId, room);
      }

      socket.join(cleanRoomId);
      socketToRoom.set(socket.id, cleanRoomId);

      const previousSocketIds = new Set(room.users.keys());
      addUserToRoom(room, {
        socketId: socket.id,
        userId,
        name,
        avatarColor,
        isSpectator,
      });

      // Clean up socketToRoom if an old socket entry was replaced on rejoin
      for (const oldSocketId of previousSocketIds) {
        if (!room.users.has(oldSocketId)) {
          socketToRoom.delete(oldSocketId);
        }
      }

      broadcastRoomState(room);
    }
  );

  // Cast vote
  socket.on('cast_vote', ({ vote }: { vote: string | null }) => {
    const room = getRoomForSocket(socket.id);
    if (!room) return;

    if (castVoteInRoom(room, socket.id, vote)) {
      broadcastRoomState(room);
    }
  });

  // Reveal votes
  socket.on('reveal_votes', () => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.isRevealed) return;

    revealVotesInRoom(room);
    broadcastRoomState(room);
  });

  // Reset votes for next round
  socket.on('reset_votes', () => {
    const room = getRoomForSocket(socket.id);
    if (!room) return;

    resetVotesInRoom(room);
    broadcastRoomState(room);
  });

  // Update story / topic
  socket.on('update_story', ({ storyTitle }: { storyTitle: string }) => {
    const room = getRoomForSocket(socket.id);
    if (!room) return;

    updateStoryInRoom(room, storyTitle);
    broadcastRoomState(room);
  });

  // Change deck type
  socket.on('change_deck', ({ deckType }: { deckType: DeckType }) => {
    const room = getRoomForSocket(socket.id);
    if (!room) return;

    changeDeckInRoom(room, deckType);
    broadcastRoomState(room);
  });

  // Toggle spectator mode
  socket.on('toggle_spectator', ({ isSpectator }: { isSpectator: boolean }) => {
    const room = getRoomForSocket(socket.id);
    if (!room) return;

    toggleSpectatorInRoom(room, socket.id, isSpectator);
    broadcastRoomState(room);
  });

  // Change user name / avatar color
  socket.on(
    'change_name',
    ({ name, avatarColor }: { name: string; avatarColor?: string }) => {
      const room = getRoomForSocket(socket.id);
      if (!room) return;

      changeNameInRoom(room, socket.id, name, avatarColor);
      broadcastRoomState(room);
    }
  );

  // Explicit leave room (when user clicks "Leave room" or navigates back to Lobby)
  socket.on('leave_room', () => {
    handleSocketLeaveRoom(socket);
  });

  // Disconnect
  socket.on('disconnect', () => {
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
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));
app.use((_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`> Servidor de Scrum Poker corriendo en http://localhost:${PORT}`);
});
