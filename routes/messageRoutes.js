import express from 'express';
import GameMessage from '../models/GameMessage.js';

const router = express.Router();

// GET all messages for a game
router.get('/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const messages = await GameMessage.find({ gameId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages: ', err });
  }
});

// POST a new message
router.post('/', async (req, res) => {
  try {
    const { gameId, userId, username, message, messageType } = req.body;
    const newMessage = new GameMessage({
      gameId,
      userId,
      username,
      message,
      timestamp: new Date(),
      messageType
    });
    await newMessage.save();
    
    // If using sockets, emit here (optional)
    req.io?.to(gameId).emit('new-message', newMessage);

    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message: ', err });
  }
});

export default router;
