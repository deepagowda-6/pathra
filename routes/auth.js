const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

function normPhone(p) {
  return (p || '').replace(/[^\d+]/g, '');
}

function signToken(user) {
  return jwt.sign({ uid: user._id.toString(), phone: user.phone }, process.env.JWT_SECRET, { expiresIn: '180d' });
}

function toProfile(user) {
  return {
    phone: user.phone,
    email: user.email || '',
    username: user.username || '',
    verified: user.verified,
    onboardingComplete: user.onboardingComplete,
    personal: user.personal,
    contacts: user.contacts,
    country: user.country,
    emergencyNumber: user.emergencyNumber,
    settings: user.settings,
  };
}

router.post('/register', async (req, res) => {
  try {
    const phone = normPhone(req.body.phone);
    const password = req.body.password || '';
    const email = (req.body.email || '').trim().toLowerCase() || null;
    const username = (req.body.username || '').trim().toLowerCase() || null;

    if (!phone || phone.length < 7) return res.status(400).json({ error: 'Enter a valid mobile number' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) return res.status(409).json({ error: 'This mobile number already has an account. Please log in instead.' });

    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) return res.status(409).json({ error: 'This email is already in use on another account.' });
    }
    if (username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) return res.status(409).json({ error: 'This username is already taken.' });
    }

    const user = new User({ phone, email, username });
    await user.setPassword(password);
    await user.save();

    const token = signToken(user);
    res.status(201).json({ token, profile: toProfile(user), activity: user.activity, chat: user.chat });
  } catch (err) {
    console.error('POST /auth/register failed:', err.message);
    if (err.code === 11000) return res.status(409).json({ error: 'That mobile number, email or username is already registered.' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const raw = (req.body.identifier || '').trim();
    const password = req.body.password || '';
    if (!raw || !password) return res.status(400).json({ error: 'Enter your mobile number/email and password' });

    const asPhone = normPhone(raw);
    const asLower = raw.toLowerCase();
    const user = await User.findOne({
      $or: [{ phone: asPhone }, { email: asLower }, { username: asLower }],
    });
    if (!user) return res.status(401).json({ error: 'No account found with those details' });

    const ok = await user.checkPassword(password);
    if (!ok) return res.status(401).json({ error: 'Incorrect password' });

    const token = signToken(user);
    res.json({ token, profile: toProfile(user), activity: user.activity, chat: user.chat });
  } catch (err) {
    console.error('POST /auth/login failed:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Account not found' });
    const ok = await user.checkPassword(req.body.currentPassword || '');
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
    if (!req.body.newPassword || req.body.newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    await user.setPassword(req.body.newPassword);
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /auth/change-password failed:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
