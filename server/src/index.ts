import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initializeSocketServer } from './socket/index';
import { GameManager } from './game/GameManager';
import cors from 'cors';

const app = express();
const server = createServer(app);

app.use(cors());

const allowedOrigins = ["http://localhost:5173"];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ===== INSTANCIER LE GAME MANAGER =====
const gameManager = new GameManager();

// ===== INITIALISER SOCKET.IO =====
initializeSocketServer(io, gameManager);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ===== CLEANUP AU SHUTDOWN =====
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  gameManager.cleanup();
  process.exit(0);
});