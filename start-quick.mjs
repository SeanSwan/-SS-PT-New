#!/usr/bin/env node

/**
 * SwanStudios Quick Start Script
 * ==============================
 * 
 * This script helps diagnose and start the SwanStudios platform
 * with proper error checking and port verification.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import net from 'net';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🚀 SwanStudios Platform Quick Start');
console.log('====================================\n');

// Port checking utility
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => {
        resolve(false); // Port is available
      });
      server.close();
    });
    server.on('error', () => {
      resolve(true); // Port is in use
    });
  });
}

// Service status checking
async function checkServices() {
  console.log('🔍 Checking required services...\n');
  
  const services = [
    { name: 'Frontend (Vite)', port: 5173, required: true },
    { name: 'Backend (Express)', port: 10000, required: true },
    { name: 'MCP Gamification', port: 8002, required: true },
    { name: 'MCP Workout', port: 8000, required: false },
    { name: 'MCP YOLO', port: 8003, required: false },
  ];
  
  for (const service of services) {
    const inUse = await checkPort(service.port);
    const status = inUse ? '🟢 RUNNING' : '🔴 STOPPED';
    const required = service.required ? '[REQUIRED]' : '[OPTIONAL]';
    console.log(`${status} ${service.name} (Port ${service.port}) ${required}`);
  }
  
  console.log('');
}

// Directory checking
function checkDirectories() {
  console.log('📁 Checking project structure...\n');
  
  const dirs = [
    { path: join(rootDir, 'backend'), name: 'Backend' },
    { path: join(rootDir, 'frontend'), name: 'Frontend' },
    { path: join(rootDir, 'backend', 'mcp_server'), name: 'MCP Servers' },
  ];
  
  for (const dir of dirs) {
    const exists = fs.existsSync(dir.path);
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${dir.name}: ${dir.path}`);
  }
  
  console.log('');
}

// Start individual service
function startService(name, command, args, cwd) {
  console.log(`🚀 Starting ${name}...`);
  
  const process = spawn(command, args, {
    cwd: cwd,
    stdio: 'inherit',
    shell: true,
  });
  
  process.on('error', (error) => {
    console.error(`❌ Failed to start ${name}:`, error.message);
  });
  
  process.on('exit', (code) => {
    if (code !== 0) {
      console.log(`⚠️  ${name} exited with code ${code}`);
    }
  });
  
  return process;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'check';
  
  if (command === 'check') {
    checkDirectories();
    await checkServices();
    
    console.log('💡 Available commands:');
    console.log('   node start-quick.mjs check          - Check system status');
    console.log('   node start-quick.mjs backend        - Start backend only');
    console.log('   node start-quick.mjs frontend       - Start frontend only');
    console.log('   node start-quick.mjs mcp            - Start MCP servers only');
    console.log('   node start-quick.mjs all            - Start all services');
    console.log('   npm run start                       - Start full platform (recommended)');
    
  } else if (command === 'backend') {
    console.log('🔧 Starting Backend Server...\n');
    
    const backendDir = join(rootDir, 'backend');
    if (!fs.existsSync(backendDir)) {
      console.error('❌ Backend directory not found');
      process.exit(1);
    }
    
    // Check if backend dependencies are installed
    if (!fs.existsSync(join(backendDir, 'node_modules'))) {
      console.log('📦 Installing backend dependencies...');
      await new Promise((resolve) => {
        const install = spawn('npm', ['install'], { cwd: backendDir, stdio: 'inherit', shell: true });
        install.on('close', resolve);
      });
    }
    
    startService('Backend', 'npm', ['run', 'dev'], backendDir);
    
  } else if (command === 'frontend') {
    console.log('🎨 Starting Frontend Server...\n');
    
    const frontendDir = join(rootDir, 'frontend');
    if (!fs.existsSync(frontendDir)) {
      console.error('❌ Frontend directory not found');
      process.exit(1);
    }
    
    // Check if frontend dependencies are installed
    if (!fs.existsSync(join(frontendDir, 'node_modules'))) {
      console.log('📦 Installing frontend dependencies...');
      await new Promise((resolve) => {
        const install = spawn('npm', ['install'], { cwd: frontendDir, stdio: 'inherit', shell: true });
        install.on('close', resolve);
      });
    }
    
    startService('Frontend', 'npm', ['run', 'dev'], frontendDir);
    
  } else if (command === 'mcp') {
    console.log('🤖 Starting MCP Servers...\n');
    
    const mcpDir = join(rootDir, 'backend', 'mcp_server');
    if (!fs.existsSync(mcpDir)) {
      console.error('❌ MCP server directory not found');
      process.exit(1);
    }
    
    // Start gamification MCP server
    console.log('Starting Enhanced Gamification MCP Server...');
    startService('Gamification MCP', 'python', ['start_enhanced_gamification_server.py'], mcpDir);
    
    // Wait a bit before starting next service
    setTimeout(() => {
      console.log('Starting Workout MCP Server...');
      startService('Workout MCP', 'python', ['workout_launcher.py'], mcpDir);
    }, 2000);
    
  } else if (command === 'all') {
    console.log('🌟 Starting All Services...\n');
    
    // Start backend first
    const backendDir = join(rootDir, 'backend');
    const mcpDir = join(rootDir, 'backend', 'mcp_server');
    const frontendDir = join(rootDir, 'frontend');
    
    console.log('1. Starting Backend...');
    startService('Backend', 'npm', ['run', 'dev'], backendDir);
    
    // Wait for backend to start
    setTimeout(() => {
      console.log('2. Starting MCP Servers...');
      startService('Gamification MCP', 'python', ['start_enhanced_gamification_server.py'], mcpDir);
      
      setTimeout(() => {
        startService('Workout MCP', 'python', ['workout_launcher.py'], mcpDir);
      }, 2000);
      
    }, 3000);
    
    // Wait for everything to start before frontend
    setTimeout(() => {
      console.log('3. Starting Frontend...');
      startService('Frontend', 'npm', ['run', 'dev'], frontendDir);
    }, 8000);
    
  } else {
    console.log('❌ Unknown command:', command);
    console.log('Available commands: check, backend, frontend, mcp, all');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down services...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\\n🛑 Shutting down services...');
  process.exit(0);
});

main().catch(console.error);