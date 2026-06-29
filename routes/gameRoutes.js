import express from 'express';
import User from '../models/User.js';
import Game from '../models/Game.js'
const router = express.Router();

const SECRET = process.env.SECRET_KEY || 'dev-secret-key';
const FSQ_KEY = process.env.FSQ_KEY;

router.get('/places/search', async (req, res) => {
  try {
    const { query, ll, radius, limit = 50 } = req.query;

    if (!FSQ_KEY) {
      return res.status(500).json({ error: 'FSQ_KEY is not configured on the backend' });
    }

    if (!query || !ll || !radius) {
      return res.status(400).json({ error: 'query, ll, and radius are required' });
    }

    const url = new URL('https://places-api.foursquare.com/places/search');
    url.searchParams.set('query', String(query));
    url.searchParams.set('ll', String(ll));
    url.searchParams.set('radius', String(radius));
    url.searchParams.set('limit', String(limit));

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${FSQ_KEY}`,
        'X-Places-Api-Version': '2025-06-17',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error || 'Failed to fetch places',
        details: data,
      });
    }

    return res.json({ results: data.results || [] });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch places',
      details: error.message,
    });
  }
});

router.get('/places/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;

    if (!FSQ_KEY) {
      return res.status(500).json({ error: 'FSQ_KEY is not configured on the backend' });
    }

    if (!placeId) {
      return res.status(400).json({ error: 'placeId is required' });
    }

    const response = await fetch(`https://places-api.foursquare.com/places/${placeId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${FSQ_KEY}`,
        'X-Places-Api-Version': '2025-06-17',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error || 'Failed to fetch place details',
        details: data,
      });
    }

    return res.json(data);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch place details',
      details: error.message,
    });
  }
});


// Create game works
router.post('', async (req, res) => {

  try {
    const { name, date, location, fsq_id, sport, leader, description } = req.body;
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
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    await game.deleteOne();
    res.json({ message: 'Game deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting game', details: error.message });
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
  } catch (error) {
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
  } catch (error) {
    res.status(500).json({ error: 'Error adding game member', details: error.message });
  }
});

export default router;