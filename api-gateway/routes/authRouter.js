'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User    = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ─── Rate limiting for auth endpoints ────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, full_name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

function safeUser(user) {
  return { id: user.id, full_name: user.full_name, email: user.email, created_at: user.created_at, last_login: user.last_login };
}

const passwordRules = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  .matches(/[A-Z]/).withMessage('Password must contain at least 1 uppercase letter')
  .matches(/[0-9]/).withMessage('Password must contain at least 1 number')
  .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least 1 special character');

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register',
  authLimiter,
  [
    body('full_name').trim().notEmpty().withMessage('Full name is required').isLength({ max: 100 }),
    body('email').trim().isEmail().withMessage('Invalid email format').normalizeEmail(),
    passwordRules,
    body('confirm_password').custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Passwords do not match');
      return true;
    })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { full_name, email, password } = req.body;

    try {
      const existing = await User.findOne({ where: { email } });
      if (existing) return res.status(409).json({ error: 'Email already registered' });

      const password_hash = await bcrypt.hash(password, 12);
      const user = await User.create({ full_name, email, password_hash });
      const token = generateToken(user);

      return res.status(201).json({ token, user: safeUser(user) });
    } catch (err) {
      console.error('[AuthRouter] Register error:', err.message);
      return res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  }
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login',
  authLimiter,
  [
    body('email').trim().isEmail().withMessage('Invalid email').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ where: { email } });
      if (!user) return res.status(401).json({ error: 'Invalid email or password' });
      if (!user.is_active) return res.status(403).json({ error: 'Account is deactivated. Contact support.' });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

      await user.update({ last_login: new Date() });
      const token = generateToken(user);

      return res.json({ token, user: safeUser(user) });
    } catch (err) {
      console.error('[AuthRouter] Login error:', err.message);
      return res.status(500).json({ error: 'Login failed. Please try again.' });
    }
  }
);

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: safeUser(user) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ─── POST /api/auth/change-password ──────────────────────────────────────────
router.post('/change-password',
  authMiddleware,
  [
    body('current_password').notEmpty().withMessage('Current password required'),
    body('new_password')
      .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Must contain uppercase')
      .matches(/[0-9]/).withMessage('Must contain a number')
      .matches(/[^A-Za-z0-9]/).withMessage('Must contain special character'),
    body('confirm_new_password').custom((value, { req }) => {
      if (value !== req.body.new_password) throw new Error('Passwords do not match');
      return true;
    })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { current_password, new_password } = req.body;

    try {
      const user = await User.findByPk(req.user.id);
      const valid = await bcrypt.compare(current_password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

      const password_hash = await bcrypt.hash(new_password, 12);
      await user.update({ password_hash });

      return res.json({ message: 'Password changed successfully' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

// ─── PUT /api/auth/profile ───────────────────────────────────────────────────
router.put('/profile',
  authMiddleware,
  [
    body('full_name').optional().trim().notEmpty().withMessage('Full name cannot be empty').isLength({ max: 100 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { full_name, current_password, new_password } = req.body;

    try {
      const user = await User.findByPk(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const updates = {};
      if (full_name) {
        updates.full_name = full_name;
      }

      if (new_password) {
        if (!current_password) {
          return res.status(400).json({ error: 'Current password is required to change password' });
        }
        const valid = await bcrypt.compare(current_password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

        const password_hash = await bcrypt.hash(new_password, 12);
        updates.password_hash = password_hash;
      }

      await user.update(updates);

      return res.json({ message: 'Profile updated successfully', user: safeUser(user) });
    } catch (err) {
      console.error('[AuthRouter] Profile update error:', err.message);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', authMiddleware, (req, res) => {
  // Stateless JWT — client clears token
  return res.json({ message: 'Logged out successfully' });
});

module.exports = router;
