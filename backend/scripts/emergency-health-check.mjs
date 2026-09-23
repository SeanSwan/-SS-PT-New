#!/usr/bin/env node

/**
 * EMERGENCY Health Check - Minimal server for debugging
 * Creates the simplest possible Express server to test if basic routing works
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 10000;

// L-02 fix (hostile review of the review, 2026-09-18).
//
// This was `cors({ origin: '*', credentials: true })`. That combination is
// not merely permissive, it is INVALID: the CORS spec forbids
// `Access-Control-Allow-Origin: *` together with
// `Access-Control-Allow-Credentials: true`, so browsers reject the response —
// the diagnostic server could not actually be called cross-origin by a
// browser, and would have leaked any endpoint behind it to any server-side
// caller the moment it was deployed.
//
// This is a diagnostic entrypoint: it needs no credentials at all. Restrict to
// an explicit origin list and drop the credentials flag.
const ALLOWED_ORIGINS = (process.env.EMERGENCY_HEALTH_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : false,
  credentials: false,
}));

// Emergency diagnostic endpoints
app.get('/', (req, res) => {
  res.json({
    status: 'EMERGENCY_SERVER_RUNNING',
    message: 'Basic Express server is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    port: PORT
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'EMERGENCY_HEALTH_OK',
    message: 'Emergency health check working',
    timestamp: new Date().toISOString()
  });
});

app.get('/debug', (req, res) => {
  res.json({
    status: 'DEBUG_INFO',
    environment: process.env.NODE_ENV,
    port: PORT,
    databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
    jwtSecret: process.env.JWT_SECRET ? 'SET' : 'NOT_SET',
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚨 EMERGENCY SERVER running on port ${PORT}`);
  console.log(`Test with: curl https://swan-studios-api.onrender.com/health`);
});
