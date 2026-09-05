'use strict';

const jwt = require('jsonwebtoken');

/**
 * Auth middleware — verifies JWT Bearer token.
 * Sets req.user = { id, email, full_name } on success.
 * Returns 401 on missing, expired, or invalid token.
 */
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or malformed' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token missing' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id:        decoded.id,
      email:     decoded.email,
      full_name: decoded.full_name
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

module.exports = authMiddleware;
