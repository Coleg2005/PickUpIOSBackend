import express from 'express';
import User from '../models/User.js';
import Game from '../models/Game.js'
const router = express.Router();

const SECRET = process.env.SECRET_KEY || 'dev-secret-key';


// Create game works
router.post('', async (req, res) => {

  try {
    const { name, date, location, fsq_id, sport, leader, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Game Name is required' });
    }
    if (!name || !date || !location || !fsq_id || !sport || !leader ) {
      return res.status(400).json({ error: 'name, date, location, sport, and leader are required' });
    }
    const leadUser = await User.findOne({username: leader});
    if (!leadUser) {
      return res.status(404).json({ error: 'Leader not found' });
    }
    const game = new Game({ name, gameMembers: [leadUser], date, location, fsq_id, sport, leader: leadUser._id, description: description });
    await game.save();

    res.status(201).json({ message: 'Game created successfully' });
  } catch (error) {
    
    res.status(500).json({ error: "Failed to create game", details: error.message });
  }
});

router.get('/location/:locationID', async (req, res) => {
  try {
    const { locationID } = req.params;
    if (!locationID) {
      return res.status(400).json({ error: 'locationID is required' });
    }
    const games = await Game.find({ fsq_id: locationID }).populate('gameMembers').populate('leader');
    res.json(games);
  } catch {
    res.status(500).json({ error: 'Error getting game' });
  }
});

// use user id as arg not username
router.get('/user/lead/:userid', async (req, res) => {
  try {
    const { userid } = req.params;
    if (!userid) {
      return res.status(400).json({ error: 'user id is required' });
    }

    const games = await Game.find({ leader: userid });
    res.json(games);
  } catch {
    res.status(500).json({ error: 'Error getting lead game' });
  }
});

// use user id as arg not username
router.get('/user/member/:userid', async (req, res) => {
  try {
    const { userid } = req.params;
    if (!userid) {
      return res.status(400).json({ error: 'userid is required' });
    }

    const games = await Game.find({ gameMembers: userid, leader: { $ne: userid } });
    res.json(games);
  } catch {
    res.status(500).json({ error: 'Error getting member game' });
  }
});

// get games using game id
router.get('/id/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }
    const game = await Game.findById(id).populate('gameMembers').populate('leader');;
    if (!game) {
      return res.status(400).json({ error: 'game not found'});
    }

    res.status(200).json(game);

  } catch {
    res.status(500).json({ error: 'Error getting game using id' });
  }
});

// delete game works
router.delete('/:gameid', async (req, res) => {
  try {
    const { gameid } = req.params;
    if (!gameid) {
      return res.status(400).json({ error: 'gameid is required' });
    }
    const game = await Game.findOne({ _id: gameid });
    await game.deleteOne();
    res.json({ message: 'Game deleted successfully' });
  } catch {
    res.status(500).json({ error: 'Error deleting game' });
  }
});

// remove member works
router.patch('/removeMember', async (req, res) => {
  try {
    const { gameid, gameMember } = req.body;
    if (!gameid || !gameMember) {
      return res.status(400).json({ error: 'gameid, and gameMember are required', gameMember});
    }
    const game = await Game.findOne({ _id: gameid });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const member = await User.findOne({_id: gameMember});
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Remove member if present
    const initialLength = game.gameMembers.length;
    game.gameMembers = game.gameMembers.filter((existingMember) => existingMember._id.toString() !== member._id.toString());
    if (game.gameMembers.length === initialLength) {
      return res.status(404).json({ error: 'User not in game' });
    }

    await game.save();
    res.json({ message: 'Game member removed successfully' });
  } catch {
    res.status(500).json({ error: 'Error removing game member', details: error.message });
  }
});

// add game member works
router.patch('/member', async (req, res) => {
  try {
    const { gameid, gameMember } = req.body;
    if (!gameid || !gameMember) {
      return res.status(400).json({ error: 'gameid, and gameMember are required', gameMember});
    }
    const game = await Game.findOne({ _id: gameid });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const member = await User.findOne({_id: gameMember});
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (game.gameMembers.some((existingMember) => existingMember._id.toString() === member._id.toString())) {
      return res.status(400).json({ error: 'User already in game' });
    }

    game.gameMembers.push(member._id);
    await game.save();
    res.json({ message: 'Game member added successfully' });
  } catch {
    res.status(500).json({ error: 'Error adding game member', details: error.message });
  }
});

export default router;