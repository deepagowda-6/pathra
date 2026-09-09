require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');

const app = express();

app.use(helmet());
// Permissive CORS so the static frontend (hosted on a different domain, e.g. Netlify) can call this
// API. A production app would restrict this to the frontend's exact origin.
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Basic abuse protection — generous enough for normal use, but stops a runaway loop (or a password-
// guessing script) from hammering the free database tier.
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
// Tighter limit specifically on login attempts to slow down password guessing.
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));

app.get('/', (req, res) => res.json({ status: 'Pathra API is running' }));
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'pathra-api', time: new Date().toISOString() }));
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

// Catch-all for unmatched routes
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI environment variable. See .env.example / README.md.');
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error('Missing JWT_SECRET environment variable. See .env.example / README.md.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Pathra API listening on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
