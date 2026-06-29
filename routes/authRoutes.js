import 'dotenv/config';
import express from 'express';
import User from '../models/User.js';
import Game from '../models/Game.js';
import GameMessage from '../models/GameMessage.js';
import Notification from '../models/Notification.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
const router = express.Router();

const SECRET = process.env.SECRET_KEY || 'dev-secret-key';

// Email service setup (configure with your email provider)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const RESET_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes

// ─── DEV / PROD CONFIG ────────────────────────────────────────────────────────
const IS_DEV = process.env.NODE_ENV !== 'production';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
// DEV:  exp://YOUR_LOCAL_IP:8081/--  (Expo Go)
// PROD: pickup2:/
const DEEP_LINK_BASE = IS_DEV
  ? process.env.EXPO_GO_URL || 'exp://localhost:8081/--'
  : 'pickup2:/';
// ─────────────────────────────────────────────────────────────────────────────

// Register route works
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  // checks that info is present
  if (!username || !email || !password) {
    return res.status(400).json({ ok: false, error: 'username, email, and password are required' });
  }
  
  // checks if username or email already exists
  if (await User.findOne({ username })) {
    return res.status(400).json({ ok: false, error: 'Username already taken' });
  }

  if (await User.findOne({ email })) {
    return res.status(400).json({ ok: false, error: 'Email already registered' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, email, password: hashedPassword });
  await user.save();

  const token = jwt.sign({ _id: user._id }, SECRET, { expiresIn: '1h' });
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

// Search users by username
router.get('/search', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ ok: false, error: 'username query is required' });

  try {
    const users = await User.find(
      { username: { $regex: username, $options: 'i' } },
      '_id username profile'
    ).limit(10);
    return res.json({ ok: true, users });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Search failed' });
  }
});

// Forgot Password - Generate reset token and send email
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ ok: false, error: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if email exists (security best practice)
      return res.json({ ok: true, message: 'If email exists, reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY);
    await user.save();

    // Send email with an HTTP link to a backend redirect page
    const resetLink = `${BACKEND_URL}/auth/reset-redirect?token=${resetToken}&email=${encodeURIComponent(email)}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Click the button below to reset your password:</p>
        <a href="${resetLink}" style="background-color: #007AFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px;">
          Reset Password
        </a>
        <p>This link expires in 15 minutes.</p>
        <p>If you didn't request this, ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.json({ ok: true, message: 'If email exists, reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to process reset request' });
  }
});

// Reset redirect page - serves an HTML page that opens the deep link
router.get('/reset-redirect', (req, res) => {
  const { token, email } = req.query;

  if (!token || !email) {
    return res.status(400).send('<h2>Invalid reset link.</h2>');
  }

  const deepLink = `${DEEP_LINK_BASE}/(auth)/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  res.send(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Reset Password</title>
    <style>
      body { font-family: -apple-system, sans-serif; background: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
      .card { background: white; border-radius: 16px; padding: 40px 32px; text-align: center; max-width: 360px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
      h2 { margin: 0 0 12px; font-size: 24px; color: #111; }
      p { color: #666; font-size: 15px; margin: 0 0 28px; }
      a.btn { display: inline-block; background: #007AFF; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 17px; font-weight: 600; }
      a.btn:hover { background: #005ecb; }
    </style>
  </head>
  <body>
    <div class="card">
      <h2>Reset Your Password</h2>
      <p>Tap the button below to open the PickUp app and set a new password.</p>
      <a class="btn" href="${deepLink}">Open PickUp App</a>
    </div>
    <script>
      // Auto-open the deep link on page load
      window.location.href = "${deepLink}";
    </script>
  </body>
</html>`);
});

// Reset Password - Validate token and update password
router.post('/reset-password', async (req, res) => {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    return res.status(400).json({ ok: false, error: 'Email, token, and new password are required' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ ok: false, error: 'User not found' });
    }

    // Check token validity
    if (user.resetToken !== token) {
      return res.status(400).json({ ok: false, error: 'Invalid reset token' });
    }

    if (!user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
      return res.status(400).json({ ok: false, error: 'Reset token expired' });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    return res.json({ ok: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to reset password' });
  }
});

// Delete Account
router.delete('/delete-account', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ ok: false, error: 'No token' });

  let userId;
  try {
    const decoded = jwt.verify(auth.split(' ')[1], SECRET);
    userId = decoded._id;
  } catch {
    return res.status(401).json({ ok: false, error: 'Invalid token' });
  }

  try {
    // Remove user from all friends lists
    await User.updateMany({ friends: userId }, { $pull: { friends: userId } });

    // Delete all games they lead (and their messages)
    const ledGames = await Game.find({ leader: userId }, '_id');
    const ledGameIds = ledGames.map(g => g._id);
    await Game.deleteMany({ leader: userId });
    await GameMessage.deleteMany({ gameId: { $in: ledGameIds } });

    // Remove user from games they were a member of
    await Game.updateMany({ gameMembers: userId }, { $pull: { gameMembers: userId } });

    // Anonymise their messages in other games
    await GameMessage.updateMany({ userId }, { $set: { username: '[deleted]' } });

    // Delete notifications they received or triggered
    await Notification.deleteMany({ recipient: userId });
    await Notification.deleteMany({ object: userId });

    // Delete the user
    await User.findByIdAndDelete(userId);

    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to delete account' });
  }
});

export default router;