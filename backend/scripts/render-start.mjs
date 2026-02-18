#!/usr/bin/env node

/**
 * Render Production Start Script
 * ==============================
 * Runs pending database migrations then starts the server.
 * Migrations are idempotent — already-applied ones are skipped instantly.
 */

import { spawn } from 'child_process';

console.log('SwanStudios Backend Starting on Render');
console.log('======================================');
console.log('Environment:', process.env.NODE_ENV || 'not set');
console.log('Port:', process.env.PORT || '10000');
console.log('Database:', process.env.DATABASE_URL ? 'CONFIGURED' : 'NOT CONFIGURED');

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: 'inherit', env: process.env, cwd, shell: true });
    proc.on('error', reject);
    proc.on('exit', code => code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`)));
  });
}

async function start() {
  // Run pending migrations (idempotent — skips already-applied)
  if (process.env.DATABASE_URL) {
    console.log('\nRunning database migrations...');
    try {
      await run('npx', [
        'sequelize-cli', 'db:migrate',
        '--config', 'config/config.cjs',
        '--migrations-path', 'migrations',
        '--models-path', 'models',
        '--env', 'production'
      ]);
      console.log('Migrations completed successfully');
    } catch (err) {
      console.error('FATAL: Migration failed:', err.message);
      process.exit(1);
    }
  }

  // Start the main server
  console.log('\nStarting Application Server...');
  const serverProcess = spawn('node', ['server.mjs'], {
    stdio: 'inherit',
    env: process.env
  });

  serverProcess.on('error', (err) => {
    console.error('Server startup error:', err);
    process.exit(1);
  });

  serverProcess.on('exit', (code) => {
    console.log(`Server exited with code ${code}`);
    process.exit(code);
  });

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down...');
    serverProcess.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down...');
    serverProcess.kill('SIGINT');
  });
}

start().catch(error => {
  console.error('Startup failed:', error);
  process.exit(1);
});
