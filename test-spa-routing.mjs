#!/usr/bin/env node

/**
 * 🧪 LOCAL SPA ROUTING TEST
 * =========================
 * 
 * This script adds temporary SPA routing to the development server
 * so you can test the fix locally before deploying to production.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 LOCAL SPA ROUTING TEST SERVER');
console.log('================================');

const app = express();
const PORT = 3001; // Use different port from main servers

// Serve the built frontend
const frontendDistPath = path.join(__dirname, 'frontend/dist');

if (!existsSync(frontendDistPath)) {
  console.log('❌ Frontend dist directory not found');
  console.log('   Run: cd frontend && npm run build');
  process.exit(1);
}

console.log('✅ Frontend dist found');

// Serve static files
app.use(express.static(frontendDistPath));

// SPA Routing - serve index.html for all non-file routes
app.get('*', (req, res) => {
  // Don't handle files with extensions
  if (req.path.includes('.')) {
    return res.status(404).send('File not found');
  }
  
  const indexPath = path.join(frontendDistPath, 'index.html');
  console.log(`📍 SPA Route: ${req.path} -> index.html`);
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log('');
  console.log('🧪 Test these routes:');
  console.log(`   http://localhost:${PORT}/client-dashboard`);
  console.log(`   http://localhost:${PORT}/store`);
  console.log(`   http://localhost:${PORT}/about`);
  console.log('');
  console.log('✅ If these work without 404, your SPA routing fix is good!');
  console.log('🔄 Refresh each page to test the fix');
  console.log('');
  console.log('Press Ctrl+C to stop the test server');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n👋 Test server stopped');
  process.exit(0);
});