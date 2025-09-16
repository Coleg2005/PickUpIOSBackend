import express from 'express';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
const router = express.Router();

router.patch('/request', async (req, res) => {
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
    const notif = new Notification({ recipient: friend, date: new Date(), type: 'friend-request', object: user, objectModel: 'User' });
    await notif.save();
    res.json({ message: 'Friend requested successfully', friends: user.friends });
  } catch {
    res.status(500).json({ error: 'Error requesting friend' });
  }
});

router.patch('/accept', async (req, res) => {
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
    if (!friend.friends) friend.friends = [];

    const alreadyFriend = user.friends.some(f => f._id.toString() === friend._id.toString());
    if (alreadyFriend) {
      return res.status(400).json({ error: 'Already friends' });
    }

    // Add each other to friends arrays
    user.friends.push(friend._id);
    friend.friends.push(user._id);
    await user.save();
    await friend.save();

    res.json({ message: 'Friend request accepted', friends: user.friends });
  } catch {
    res.status(500).json({ error: 'Error accepting friend request' });
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
    if (!friend.friends) friend.friends = [];
    // Remove friend from user's friends
    user.friends = user.friends.filter(f => {
      if (typeof f === 'object' && f._id) {
        return f._id.toString() !== friend._id.toString();
      }
      return f.toString() !== friend._id.toString();
    });
    // Remove user from friend's friends
    friend.friends = friend.friends.filter(f => {
      if (typeof f === 'object' && f._id) {
        return f._id.toString() !== user._id.toString();
      }
      return f.toString() !== user._id.toString();
    });
    await user.save();
    await friend.save();

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