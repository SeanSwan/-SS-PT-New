#!/usr/bin/env node

/**
 * EMERGENCY Health Check - Minimal server for debugging
 * Creates the simplest possible Express server to test if basic routing works
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 10000;

// Ultra-basic CORS
app.use(cors({
  origin: '*',
  credentials: true
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
