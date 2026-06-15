import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import registerSocketHandlers from './socket.js';
import path from 'path';

import authRoutes from './routes/authRoutes.js';
import friendRoutes from './routes/friendRoutes.js';
import gameRoutes from './routes/gameRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import inboxRoutes from './routes/inboxRoutes.js';

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: '*'},
});
registerSocketHandlers(io);

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join('/var/www/uploads')));
app.use("/inbox", inboxRoutes);
app.use("/upload", uploadRoutes);
app.use('/auth', authRoutes);
app.use('/friend', friendRoutes);
app.use('/game', gameRoutes);
app.use('/profile', profileRoutes);
app.use('/message', messageRoutes);

const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  console.error("❌ MONGO_URI is missing");
  process.exit(1);
}

mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running at http://${hostname}:${PORT}`);
}); 
