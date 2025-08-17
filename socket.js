import GameMessage from './models/GameMessage.js';

export default function registerSocketHandlers(io) {
  io.on('connection', (socket) => {

    socket.on('join-room', (gameId) => {
      socket.join(gameId);
      console.log(`User joined room: ${gameId}`);
    });

    socket.on('send-message', async (data) => {
      // Broadcast the message to everyone in the room (gameId)
      if (data && data.gameId) {
        io.to(data.gameId).emit('new-message', data);
      }      
      const message = new GameMessage({ ...data });
      await message.save();
    });

    socket.on('disconnect', () => {
    });
  });
}