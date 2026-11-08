const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'tenantsheep-distro-secret-change-me';

// This is the CORRECT middleware -- used on most routes. Used as a contrast
// to the deliberately broken jwt.decode() path in routes/campaigns.js.
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    const payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
    req.user = payload; // { operatorId, orgId, role }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

module.exports = { authenticate, SECRET };
