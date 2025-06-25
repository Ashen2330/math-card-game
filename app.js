import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { fileURLToPath } from 'url';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static files
app.use(express.static('template'));
app.use(express.static('public'));

// LowDB setup
const dbFile = path.join(__dirname, 'db.json');
const adapter = new JSONFile(dbFile);
const defaultData = {
  players: {},
  rooms: {}
};
const db = new Low(adapter, defaultData);

await db.read();
db.data ||= defaultData;
await db.write();

// Socket.IO logic
io.on('connection', async (socket) => {
  console.log('User connected:', socket.id);

  // Register player
  await db.read();
  db.data.players[socket.id] = {};  // TODO: Player Name
  await db.write();

  // Create a room
  socket.on('createRoom', async (roomCode) => {
    await db.read();

    if (!db.data.rooms[roomCode]) {
      db.data.rooms[roomCode] = {
        host: socket.id,
        members: [socket.id],
        started: false
      };
    } else if (!db.data.rooms[roomCode].members.includes(socket.id)) {
      db.data.rooms[roomCode].members.push(socket.id);
    }

    await db.write();
    socket.join(roomCode);


    io.to(roomCode).emit('roomInfo', {
      roomCode,
      players: db.data.rooms[roomCode].members
    });
  });

  // Join existing room
  socket.on('joinRoom', async (roomCode) => {
    await db.read();

    const room = db.data.rooms[roomCode];
    if (room && !room.members.includes(socket.id)) {
      room.members.push(socket.id);
      await db.write();

      socket.join(roomCode);
      io.to(roomCode).emit('roomInfo', {
        roomCode,
        players: db.data.rooms[roomCode].members
      });
    }else{
      socket.emit("Theres no such room");
    }
  });

  // Host starts the game
  socket.on('startGame', async (roomCode) => {
    await db.read();
    const room = db.data.rooms[roomCode];
    const playerNum = db.data.rooms[roomCode].members.length;
    if (room?.host === socket.id && !room.started && playerNum > 1) {
      room.started = true;
      await db.write();
      io.to(roomCode).emit('gameStarted', { message: "Game has started!" });
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    await db.read();

    // Remove from player list
    delete db.data.players[socket.id];

    // Remove from rooms
    for (const [roomCode, room] of Object.entries(db.data.rooms)) {
      const index = room.members.indexOf(socket.id);
      if (index !== -1) {
        room.members.splice(index, 1);

        // If host left, delete room
        if (room.host === socket.id) {
          delete db.data.rooms[roomCode];
        }
      }
    }

    await db.write();
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Basic Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "template", "index.html"));
});
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, "template", "index.html"));
});
app.get('/room.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'template', 'room.html'));
});
app.get('/setting.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'template', 'setting.html'));
});


//In game routes

app.get('/:roomCode', async (req, res) => {
  const roomCode = req.params.roomCode;
  const socketId = req.query.id;

  await db.read();
  const room = db.data.rooms[roomCode];

  if (room && room.members.includes(socketId)) {
    res.sendFile(path.join(__dirname, 'template', 'game.html'));
  } else {
    res.status(403).send("Access Denied: You're not part of this room.");
  }
});


server.listen(3000, () => {
  console.log('Listening on http://localhost:3000');
});
