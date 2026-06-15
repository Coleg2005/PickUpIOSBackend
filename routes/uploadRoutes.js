import { Router } from 'express';
import multer from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import User from '../models/User.js';

const router = Router();

// Ensure persistent uploads folder exists
const uploadDir = '/var/www/uploads';
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Upload endpoint
router.post('/', upload.single('image'), async (req, res) => {
  try {  
    const { userid } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    if (!userid) {
      return res.status(400).json({ error: 'No user id provided' });
    }

    const user = await User.findOne({ _id: userid });
    if (!user) {
      return res.status(400).json({ error: 'Could not find user' });
    }

    // Delete old profile picture if it exists
    if (user.profile?.picture) {
      const oldFilePath = join(uploadDir, user.profile.picture.split('/').pop());
      if (existsSync(oldFilePath)) {
        try {
          unlinkSync(oldFilePath);
        } catch (err) {
          console.error('Failed to delete old profile picture:', err);
        }
      }
    }

    // Save new picture URL
    user.profile.picture = `/uploads/${file.filename}`;
    await user.save();

    // Return public URL immediately
    res.status(201).json({ message: 'Picture uploaded successfully', url: user.profile.picture });
  } catch (err) {
    console.error('Error uploading picture:', err);
    res.status(500).json({ error: 'Error uploading picture' });
  }
});

export default router;
