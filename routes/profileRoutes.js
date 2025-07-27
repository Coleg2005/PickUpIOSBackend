import express from 'express';
import User from '../models/User.js';
const router = express.Router();

router.patch('/updateProfile', async (req, res) => {
  try {
    const { description, picture, userid } = req.body;
    if (!userid) {
      return res.status(400).json({ error: 'username is required' });
    }
    const user = await User.findOne({ _id: userid });
    if(description) {
      user.profile.description = description;
    }
    if(picture != 1) {
      user.profile.picture = picture;
    }
    await user.save();
    res.json({ message: 'Profile updated successfully' });
  } catch {
    res.status(500).json({ error: 'Error updating profile' });
  }
});

export default router;