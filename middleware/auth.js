const jwt = require('jsonwebtoken');

module.exports = function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing auth token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.uid;
    req.userPhone = payload.phone;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session, please sign in again' });
  }
};
