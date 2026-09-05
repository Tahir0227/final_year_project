'use strict';

require('dotenv').config();

const express  = require('express');
const helmet   = require('helmet');
const cors     = require('cors');
const rateLimit = require('express-rate-limit');

const config          = require('./config');
const syncDB          = require('./db/sync');
const telemetryRouter = require('./routes/telemetryRouter');
const authRouter      = require('./routes/authRouter');
const projectRouter   = require('./routes/projectRouter');
const dashboardRouter = require('./routes/dashboardRouter');
const { initAutoScanScheduler }  = require('./services/autoScanScheduler');

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());

// CORS — allow only the frontend dev server
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Global rate limiter (generous — auth routes have stricter limits)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(globalLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/telemetry',  telemetryRouter);
app.use('/api/auth',       authRouter);
app.use('/api/projects',   projectRouter);
app.use('/api/dashboard',  dashboardRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Sentinel API Gateway', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function startServer() {
  await syncDB();

  // Module 4 hourly auto-scan scheduler
  initAutoScanScheduler();

  app.listen(config.app.port, () => {
    console.log(`[Server] Sentinel API Gateway running on port ${config.app.port}`);
    console.log(`[Server] Frontend CORS: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  });
}

startServer();
