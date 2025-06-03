#!/usr/bin/env node
/**
 * Run Emergency Pricing Fix
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { existsSync } from 'fs';
import dotenv from 'dotenv';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '.env');

if (existsSync(envPath)) {
  console.log(`Loading environment from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log('Warning: .env file not found.');
  dotenv.config();
}

// Import the emergency fix
try {
  console.log('🔧 Starting Emergency Pricing Fix...');
  await import('./backend/emergency-pricing-fix.mjs');
} catch (error) {
  console.error('❌ Failed to run emergency pricing fix:', error.message);
  process.exit(1);
}
