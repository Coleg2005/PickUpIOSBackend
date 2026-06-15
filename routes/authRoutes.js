import express from 'express';
import User from '../models/User.js';
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
const RESET_APP_URL = process.env.RESET_APP_URL || 'pickup2://reset-password';

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
      return res.json({ ok: true, message: 'If email exists, reset link has been sent' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY);
    await user.save();

    // Send email
    const resetLink = `${RESET_APP_URL}?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@pickup.com',
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetLink}" style="background-color: #007AFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
        <p>This link expires in 15 minutes.</p>
        <p>If you didn't request this, ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.json({ ok: true, message: 'If email exists, reset link has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to process reset request' });
  }
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

export default router;