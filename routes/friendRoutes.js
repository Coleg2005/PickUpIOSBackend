import express from 'express';
import User from '../models/User.js';
const router = express.Router();

router.patch('/add', async (req, res) => {
  try {
    const { userid, friendid } = req.body;
    if (!userid || !friendid) {
      return res.status(400).json({ error: 'user and friend are required' });
    }
    const user = await User.findOne({ _id: userid });
    const friend = await User.findOne({ _id: friendid });

    if (!user || !friend) {
      return res.status(404).json({ error: 'User or friend not found' });
    }

    if (!user.friends) user.friends = [];
    const alreadyFriend = user.friends.some(f => f._id.toString() === friend._id.toString());
    if (alreadyFriend) {
      return res.status(400).json({ error: 'Already friends' });
    }

    user.friends.push(friend);
    await user.save();

    res.json({ message: 'Friend added successfully', friends: user.friends });
  } catch {
    res.status(500).json({ error: 'Error updating profile' });
  }
});

router.patch('/remove', async (req, res) => {
  try {
    const { userid, friendid } = req.body;
    if (!userid || !friendid) {
      return res.status(400).json({ error: 'user and friend are required' });
    }
    const user = await User.findOne({ _id: userid });
    const friend = await User.findOne({ _id: friendid });

    if (!user || !friend) {
      return res.status(404).json({ error: 'User or friend not found' });
    }

    if (!user.friends) user.friends = [];
    // Remove friend by _id
    user.friends = user.friends.filter(f => {
      if (typeof f === 'object' && f._id) {
        return f._id.toString() !== friend._id.toString();
      }
      return f.toString() !== friend._id.toString();
    });
    await user.save();

    res.json({ message: 'Friend removed successfully', friends: user.friends });
  } catch {
    res.status(500).json({ error: 'Error removing friend' });
  }
});

router.get('/:userid', async (req, res) => {
  try {
    const { userid } = req.params;
    if (!userid) {
      return res.status(400).json({ error: 'id is required' });
    }
    const user = await User.findById(userid).populate('friends');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(user.friends);
  } catch {
    res.status(500).json({ error: 'Error getting friends using id' });
  }
});

export default router;