#!/usr/bin/env node

/**
 * Render Production Start Script
 * ==============================
 * Runs pending database migrations then starts the server.
 * Migrations are idempotent — already-applied ones are skipped instantly.
 */

import { spawn } from 'child_process';
import ffmpegStaticPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

console.log('SwanStudios Backend Starting on Render');
console.log('======================================');
console.log('Environment:', process.env.NODE_ENV || 'not set');
console.log('Port:', process.env.PORT || '10000');
console.log('Database:', process.env.DATABASE_URL ? 'CONFIGURED' : 'NOT CONFIGURED');

// PLAUD audio pipeline binaries. Render's build sandbox is read-only so
// apt-get install ffmpeg fails; we ship the binaries via npm instead and
// resolve their paths here before the server child process inherits env.
if (!process.env.PLAUD_FFMPEG_PATH && ffmpegStaticPath) {
  process.env.PLAUD_FFMPEG_PATH = ffmpegStaticPath;
  console.log('PLAUD ffmpeg path:', ffmpegStaticPath);
}
if (!process.env.PLAUD_FFPROBE_PATH && ffprobeStatic?.path) {
  process.env.PLAUD_FFPROBE_PATH = ffprobeStatic.path;
  console.log('PLAUD ffprobe path:', ffprobeStatic.path);
}

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: 'inherit', env: process.env, cwd, shell: true });
    proc.on('error', reject);
    proc.on('exit', code => code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`)));
  });
}

async function start() {
  // Run pending migrations (safe — auto-skips already-applied)
  if (process.env.DATABASE_URL) {
    console.log('\nRunning safe database migrations...');
    try {
      await run('node', ['scripts/safe-migrate.mjs', 'production']);
      console.log('Migrations completed successfully');

      // Run achievement seeder (idempotent — skips if data exists)
      console.log('Running achievement seeder...');
      try {
        await run('npx', [
          'sequelize-cli', 'db:seed',
          '--seed', '20260301001000-seed-achievements.cjs',
          '--config', 'config/config.cjs',
          '--seeders-path', 'seeders',
          '--models-path', 'models',
          '--env', 'production'
        ]);
        console.log('Achievement seeder completed');
      } catch (seedErr) {
        // Seeder failure is non-fatal — server can still start
        console.warn('Achievement seeder failed (non-fatal):', seedErr.message);
      }

      // Run exercise seeders (idempotent — uses ON CONFLICT DO NOTHING / findOrCreate)
      console.log('Running exercise seeders...');
      try {
        // NASM seeder uses Sequelize CLI format (up/down exports)
        await run('npx', [
          'sequelize-cli', 'db:seed',
          '--seed', '20260228-seed-nasm-comprehensive-exercises.mjs',
          '--config', 'config/config.cjs',
          '--seeders-path', 'seeders',
          '--models-path', 'models',
          '--env', 'production'
        ]);
        console.log('NASM exercise seeder completed (200+ exercises)');
      } catch (exSeedErr) {
        console.warn('NASM exercise seeder failed (non-fatal):', exSeedErr.message);
      }

      try {
        // Expanded seeder is a standalone script (imports Exercise model directly)
        await run('node', ['seeders/20260321-seed-expanded-exercises.mjs']);
        console.log('Expanded exercise seeder completed (300+ exercises)');
      } catch (exSeedErr) {
        console.warn('Expanded exercise seeder failed (non-fatal):', exSeedErr.message);
      }
    } catch (err) {
      // Migration failure is non-fatal — let the server start so we can debug
      console.error('WARNING: Migration failed (non-fatal):', err.message);
      console.error('The server will start but some features may not work correctly.');
      console.error('Check the migration error above and fix manually if needed.');
    }
  }

  // Start the main server with increased heap + GC access for photo processing
  console.log('\nStarting Application Server...');
  const serverProcess = spawn('node', ['--max-old-space-size=1024', '--expose-gc', 'server.mjs'], {
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
