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
    const alreadyFriend = user.friends.some(f => (f._id || f).toString() === friend._id.toString());
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

    const alreadyFriend = user.friends.some(f => (f._id || f).toString() === friend._id.toString());
    if (alreadyFriend) {
      return res.status(400).json({ error: 'Already friends' });
    }

    await User.updateOne({ _id: user._id }, { $addToSet: { friends: friend._id } });
    await User.updateOne({ _id: friend._id }, { $addToSet: { friends: user._id } });

    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    console.error('Accept friend error:', err);
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

    await User.updateOne({ _id: user._id }, { $pull: { friends: friend._id } });
    await User.updateOne({ _id: friend._id }, { $pull: { friends: user._id } });

    res.json({ message: 'Friend removed successfully' });
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