import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
const router = express.Router();

const SECRET = process.env.SECRET_KEY || 'dev-secret-key';

// Register route works
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // checks that info is present
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'username and password are required' });
  }
  
  // checks if username is already exists
  if (await User.findOne({ username })) {
    return res.status(400).json({ ok: false, error: 'Username already taken' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashedPassword });
  await user.save();

  const token = jwt.sign({ id: user._id }, SECRET, { expiresIn: '1h' });
  return res.json({ ok: true, message: 'Registered successfully', token });
});

router.post('/login', async (req, res) => {

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'username and password are required' });
  }

  const user = await User.findOne({ username });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ ok: false, error: 'Invalid credentials' });
  }

  const token = jwt.sign({ _id: user._id }, SECRET, { expiresIn: '1h' });
  return res.json({ ok: true, token });
});

router.get('/user/:id', async (req, res) => {

  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'userid are required' });
  }

  const user = await User.findOne({ _id: id });

  if (!user) {
    return res.status(401).json({ error: 'Could not find User' });
  }
  res.json({ user });
});

router.get('/protected', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(auth.split(' ')[1], SECRET);
    res.json({ message: 'Protected content', user: decoded });
  } catch (e) {
    console.error('JWT verification error:', e);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;