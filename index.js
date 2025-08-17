import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import http from 'http';
import { Server } from 'socket.io';
import registerSocketHandlers from './socket.js';

import authRoutes from './routes/authRoutes.js';
import friendRoutes from './routes/friendRoutes.js';
import gameRoutes from './routes/gameRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

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
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

app.use("/upload", uploadRoutes);
app.use('/auth', authRoutes);
app.use('/friend', friendRoutes);
app.use('/game', gameRoutes);
app.use('/profile', profileRoutes);
app.use('/message', messageRoutes);

const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 3000;
const hostname = '0.0.0.0';

server.listen(PORT, hostname, () => {
  console.log(`Server running at http://${hostname}:${PORT}`);
}); 
