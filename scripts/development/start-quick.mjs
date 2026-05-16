#!/usr/bin/env node

/**
 * SwanStudios Quick Start Script
 * ==============================
 *
 * Diagnoses and starts the local SwanStudios API and frontend.
 * Legacy MCP launchers are intentionally retired; workout and gamification
 * behavior now runs through the backend APIs.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..');

console.log('SwanStudios Platform Quick Start');
console.log('=================================\n');

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => {
        resolve(false);
      });
      server.close();
    });
    server.on('error', () => {
      resolve(true);
    });
  });
}

async function checkServices() {
  console.log('Checking required services...\n');

  const services = [
    { name: 'Frontend (Vite)', port: 5173, required: true },
    { name: 'Backend (Express)', port: 10000, required: true },
  ];

  for (const service of services) {
    const inUse = await checkPort(service.port);
    const status = inUse ? 'RUNNING' : 'STOPPED';
    const required = service.required ? '[REQUIRED]' : '[OPTIONAL]';
    console.log(`${status} ${service.name} (Port ${service.port}) ${required}`);
  }

  console.log('');
}

function checkDirectories() {
  console.log('Checking project structure...\n');

  const dirs = [
    { path: join(rootDir, 'backend'), name: 'Backend' },
    { path: join(rootDir, 'frontend'), name: 'Frontend' },
  ];

  for (const dir of dirs) {
    const exists = fs.existsSync(dir.path);
    const status = exists ? 'OK' : 'MISSING';
    console.log(`${status} ${dir.name}: ${dir.path}`);
  }

  console.log('');
}

function startService(name, command, args, cwd) {
  console.log(`Starting ${name}...`);

  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
  });

  child.on('error', (error) => {
    console.error(`Failed to start ${name}:`, error.message);
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.log(`${name} exited with code ${code}`);
    }
  });

  return child;
}

async function installIfNeeded(packageDir, label) {
  if (fs.existsSync(join(packageDir, 'node_modules'))) {
    return;
  }

  console.log(`Installing ${label} dependencies...`);
  await new Promise((resolve) => {
    const install = spawn('npm', ['install'], {
      cwd: packageDir,
      stdio: 'inherit',
      shell: true,
    });
    install.on('close', resolve);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'check';

  if (command === 'check') {
    checkDirectories();
    await checkServices();

    console.log('Available commands:');
    console.log('   node start-quick.mjs check          - Check system status');
    console.log('   node start-quick.mjs backend        - Start backend only');
    console.log('   node start-quick.mjs frontend       - Start frontend only');
    console.log('   node start-quick.mjs all            - Start backend and frontend');
    console.log('   npm run start                       - Start full platform (recommended)');
  } else if (command === 'backend') {
    console.log('Starting Backend Server...\n');

    const backendDir = join(rootDir, 'backend');
    if (!fs.existsSync(backendDir)) {
      console.error('Backend directory not found');
      process.exit(1);
    }

    await installIfNeeded(backendDir, 'backend');
    startService('Backend', 'npm', ['run', 'dev'], backendDir);
  } else if (command === 'frontend') {
    console.log('Starting Frontend Server...\n');

    const frontendDir = join(rootDir, 'frontend');
    if (!fs.existsSync(frontendDir)) {
      console.error('Frontend directory not found');
      process.exit(1);
    }

    await installIfNeeded(frontendDir, 'frontend');
    startService('Frontend', 'npm', ['run', 'dev'], frontendDir);
  } else if (command === 'mcp') {
    console.error('Legacy MCP startup is retired. Use the SwanStudios backend APIs instead.');
    process.exit(1);
  } else if (command === 'all') {
    console.log('Starting SwanStudios API + frontend...\n');

    const backendDir = join(rootDir, 'backend');
    const frontendDir = join(rootDir, 'frontend');

    startService('Backend', 'npm', ['run', 'dev'], backendDir);

    setTimeout(() => {
      startService('Frontend', 'npm', ['run', 'dev'], frontendDir);
    }, 3000);
  } else {
    console.log('Unknown command:', command);
    console.log('Available commands: check, backend, frontend, all');
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('\nShutting down services...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down services...');
  process.exit(0);
});

main().catch(console.error);
