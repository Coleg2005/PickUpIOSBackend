import express from 'express';
import Notification from '../models/Notification.js';
const router = express.Router();

router.get('/:userid', async (req, res) => {
  try {
    const { userid } = req.params;
    if (!userid) {
      return res.status(400).json({ error: 'id is required' });
    }
    const notifs = await Notification.find({ recipient: userid }).populate('object');
    res.status(200).json(notifs);
  } catch {
    res.status(500).json({ error: 'Error getting notifications using id' });
  }
});

router.delete('/:notifid', async (req, res) => {
  try {
    const { notifid } = req.params;
    if (!notifid) {
      return res.status(400).json({ error: 'notifid is required' });
    }
    const deletedNotif = await Notification.findByIdAndDelete(notifid);
    if (!deletedNotif) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.status(200).json(deletedNotif);
  } catch {
    res.status(500).json({ error: 'Error deleting notification' });
  }
});

export default router;