import { Router } from 'express';
import multer, { diskStorage } from 'multer';
import { join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uploadDir = join(__dirname, '../uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const storage = diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

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
      const oldFilePath = join(uploadDir, user.profile.picture);
      if (existsSync(oldFilePath)) {
        try {
          // Remove the old file
          require('fs').unlinkSync(oldFilePath);
        } catch (err) {
          console.error('Failed to delete old profile picture:', err);
        }
      }
    }

    user.profile.picture = file.filename;
    await user.save();

    res.status(201).json({ message: 'Picture uploaded successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error uploading picture' });
    console.error('Error uploading picture:', err);
  }
});

router.get('/pfp/:userid', async (req, res) => {

  try{
    const { userid } = req.params;
    if (!userid) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const user = await User.findOne({ _id: userid });
    if (!user || !user.profile.picture) {
      return res.status(400).json({ error: 'Could not find user pfp' });
    }   
    const filename = user.profile.picture
    const filePath = join(uploadDir, filename);
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.sendFile(filePath);
  } catch {
    res.status(500).json({ error: 'Error getting picture' });
  }
});

export default router;
