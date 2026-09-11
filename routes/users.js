const express = require('express');
const router = express.Router();
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

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

router.get('/me', async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ exists: false });
    res.json({ exists: true, profile: toProfile(user), activity: user.activity, chat: user.chat });
  } catch (err) {
    console.error('GET /users/me failed:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/me/profile', async (req, res) => {
  try {
    const body = req.body || {};
    const update = {
      onboardingComplete: !!body.onboardingComplete,
      personal: body.personal || {},
      contacts: Array.isArray(body.contacts) ? body.contacts : [],
      country: body.country || 'India',
      emergencyNumber: body.emergencyNumber || '112',
      settings: body.settings || {},
    };
    const user = await User.findByIdAndUpdate(req.userId, update, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'Account not found' });
    res.json({ profile: toProfile(user) });
  } catch (err) {
    console.error('PUT /users/me/profile failed:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/me/activity', async (req, res) => {
  try {
    const entry = {
      id: req.body.id, type: req.body.type, title: req.body.title,
      detail: req.body.detail, at: req.body.at,
    };
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $push: { activity: { $each: [entry], $position: 0, $slice: 200 } } },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'Account not found' });
    res.json({ activity: user.activity });
  } catch (err) {
    console.error('POST /users/me/activity failed:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/me/chat', async (req, res) => {
  try {
    const chat = Array.isArray(req.body) ? req.body.slice(-24) : [];
    const user = await User.findByIdAndUpdate(req.userId, { chat }, { new: true });
    if (!user) return res.status(404).json({ error: 'Account not found' });
    res.json({ chat: user.chat });
  } catch (err) {
    console.error('PUT /users/me/chat failed:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/me', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.userId);
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /users/me failed:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
