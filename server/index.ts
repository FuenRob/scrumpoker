import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

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

type DeckType = 'modified-fibonacci' | 'fibonacci' | 'tshirt' | 'powers-of-2';

interface ServerUser {
  socketId: string;
  name: string;
  avatarColor: string;
  isSpectator: boolean;
  vote: string | null;
}

interface HistoryItem {
  id: string;
  storyTitle: string;
  timestamp: number;
  average: number | null;
  agreementPercentage: number;
  votes: { name: string; vote: string }[];
}

interface ServerRoom {
  id: string;
  name: string;
  deckType: DeckType;
  storyTitle: string;
  isRevealed: boolean;
  users: Map<string, ServerUser>;
  history: HistoryItem[];
  hostSocketId: string;
}

const rooms = new Map<string, ServerRoom>();
const socketToRoom = new Map<string, string>();

function sanitizeRoomState(room: ServerRoom, recipientSocketId: string) {
  const participants = Array.from(room.users.values()).map((user) => {
    const isSelf = user.socketId === recipientSocketId;
    return {
      id: user.socketId,
      name: user.name,
      avatarColor: user.avatarColor,
      isSpectator: user.isSpectator,
      hasVoted: user.vote !== null,
      vote: room.isRevealed || isSelf ? user.vote : null,
      isHost: user.socketId === room.hostSocketId,
    };
  });

  return {
    roomId: room.id,
    roomName: room.name,
    storyTitle: room.storyTitle,
    deckType: room.deckType,
    isRevealed: room.isRevealed,
    participants,
    history: room.history,
    hostId: room.hostSocketId,
  };
}

function broadcastRoomState(room: ServerRoom) {
  room.users.forEach((_, socketId) => {
    const state = sanitizeRoomState(room, socketId);
    io.to(socketId).emit('room_state', state);
  });
}

function calculateHistoryRecord(room: ServerRoom): HistoryItem | null {
  const voters = Array.from(room.users.values()).filter((u) => !u.isSpectator && u.vote !== null);
  if (voters.length === 0) return null;

  const numericVotes: number[] = [];
  const distribution: Record<string, number> = {};

  for (const v of voters) {
    if (!v.vote) continue;
    distribution[v.vote] = (distribution[v.vote] || 0) + 1;
    const num = parseFloat(v.vote);
    if (!isNaN(num) && v.vote !== '?' && v.vote !== '☕' && v.vote !== '🦀') {
      numericVotes.push(num);
    }
  }

  let average: number | null = null;
  if (numericVotes.length > 0) {
    const sum = numericVotes.reduce((a, b) => a + b, 0);
    average = Math.round((sum / numericVotes.length) * 10) / 10;
  }

  let maxFreq = 0;
  for (const freq of Object.values(distribution)) {
    if (freq > maxFreq) maxFreq = freq;
  }
  const agreementPercentage = Math.round((maxFreq / voters.length) * 100);

  return {
    id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    storyTitle: room.storyTitle.trim() || 'Estimación sin título',
    timestamp: Date.now(),
    average,
    agreementPercentage,
    votes: voters.map((v) => ({ name: v.name, vote: v.vote! })),
  };
}

io.on('connection', (socket: Socket) => {
  // Join Room
  socket.on(
    'join_room',
    ({
      roomId,
      roomName,
      name,
      avatarColor,
      isSpectator = false,
      deckType = 'modified-fibonacci',
    }: {
      roomId: string;
      roomName?: string;
      name: string;
      avatarColor?: string;
      isSpectator?: boolean;
      deckType?: DeckType;
    }) => {
      const cleanRoomId = roomId.trim().toLowerCase();
      let room = rooms.get(cleanRoomId);

      if (!room) {
        room = {
          id: cleanRoomId,
          name: roomName || `Sala ${cleanRoomId.toUpperCase()}`,
          deckType: deckType || 'modified-fibonacci',
          storyTitle: '',
          isRevealed: false,
          users: new Map(),
          history: [],
          hostSocketId: socket.id,
        };
        rooms.set(cleanRoomId, room);
      }

      socket.join(cleanRoomId);
      socketToRoom.set(socket.id, cleanRoomId);

      room.users.set(socket.id, {
        socketId: socket.id,
        name: name.trim() || 'Anónimo',
        avatarColor: avatarColor || '#6366f1',
        isSpectator: !!isSpectator,
        vote: null,
      });

      // If no host exists or previous host left, assign to current
      if (!room.users.has(room.hostSocketId)) {
        room.hostSocketId = socket.id;
      }

      broadcastRoomState(room);
    }
  );

  // Cast vote
  socket.on('cast_vote', ({ vote }: { vote: string | null }) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room || room.isRevealed) return;

    const user = room.users.get(socket.id);
    if (!user || user.isSpectator) return;

    user.vote = vote;
    broadcastRoomState(room);
  });

  // Reveal votes
  socket.on('reveal_votes', () => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room || room.isRevealed) return;

    room.isRevealed = true;

    // Save history record of this round
    const record = calculateHistoryRecord(room);
    if (record) {
      room.history.unshift(record);
      // Keep only last 20 records
      if (room.history.length > 20) {
        room.history.pop();
      }
    }

    broadcastRoomState(room);
  });

  // Reset votes for next round
  socket.on('reset_votes', () => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    room.isRevealed = false;
    room.users.forEach((u) => {
      u.vote = null;
    });

    broadcastRoomState(room);
  });

  // Update story / topic
  socket.on('update_story', ({ storyTitle }: { storyTitle: string }) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    room.storyTitle = storyTitle;
    broadcastRoomState(room);
  });

  // Change deck type
  socket.on('change_deck', ({ deckType }: { deckType: DeckType }) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    room.deckType = deckType;
    // Reset votes if deck changed to avoid invalid votes
    room.isRevealed = false;
    room.users.forEach((u) => {
      u.vote = null;
    });

    broadcastRoomState(room);
  });

  // Toggle spectator mode
  socket.on('toggle_spectator', ({ isSpectator }: { isSpectator: boolean }) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (!user) return;

    user.isSpectator = isSpectator;
    if (isSpectator) {
      user.vote = null;
    }

    broadcastRoomState(room);
  });

  // Change user name
  socket.on('change_name', ({ name }: { name: string }) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (!user) return;

    user.name = name.trim() || 'Anónimo';
    broadcastRoomState(room);
  });

  // Disconnect
  socket.on('disconnect', () => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    socketToRoom.delete(socket.id);

    const room = rooms.get(roomId);
    if (!room) return;

    room.users.delete(socket.id);

    if (room.users.size === 0) {
      // Clean up empty room after 5 minutes
      setTimeout(() => {
        const checkRoom = rooms.get(roomId);
        if (checkRoom && checkRoom.users.size === 0) {
          rooms.delete(roomId);
        }
      }, 5 * 60 * 1000);
    } else {
      if (room.hostSocketId === socket.id) {
        // Assign next connected user as host
        const firstUserSocket = room.users.keys().next().value;
        if (firstUserSocket) {
          room.hostSocketId = firstUserSocket;
        }
      }
      broadcastRoomState(room);
    }
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
