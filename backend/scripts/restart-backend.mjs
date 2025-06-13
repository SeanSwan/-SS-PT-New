// Backend restart utility
// Fixes missing script referenced in backend package.json

import { spawn } from 'child_process';
import chalk from 'chalk';
import axios from 'axios';

const PORT = process.env.PORT || 10000;
const BASE_URL = `http://localhost:${PORT}`;

async function checkServerStatus() {
  try {
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    return { running: true, status: response.status };
  } catch {
    return { running: false };
  }
}

export async function restartBackend() {
  console.log(chalk.blue('🔄 SwanStudios Backend Restart Utility'));
  console.log(chalk.gray('=' .repeat(40)));
  
  // Check if server is currently running
  const initialStatus = await checkServerStatus();
  if (initialStatus.running) {
    console.log(chalk.yellow('⚠️  Server is currently running - attempting graceful restart'));
  } else {
    console.log(chalk.green('✅ No server detected - starting fresh'));
  }
  
  // Kill any existing processes on the port
  console.log(chalk.blue('🔫 Checking for processes on port ' + PORT));
  
  // Cross-platform port killing
  const killCommand = process.platform === 'win32' 
    ? `powershell "Get-NetTCPConnection -LocalPort ${PORT} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`
    : `lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true`;
  
  try {
    const { exec } = await import('child_process');
    await new Promise((resolve) => {
      exec(killCommand, () => resolve());
    });
    console.log(chalk.green('✅ Port cleared'));
  } catch (error) {
    console.log(chalk.yellow('⚠️  Port clear attempt completed'));
  }
  
  // Wait a moment for cleanup
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Start the server
  console.log(chalk.blue('🚀 Starting backend server...'));
  
  const serverProcess = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true
  });
  
  // Handle server process events
  serverProcess.on('error', (error) => {
    console.error(chalk.red('❌ Failed to start server:'), error.message);
    process.exit(1);
  });
  
  serverProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(chalk.red(`❌ Server exited with code ${code}`));
      process.exit(code);
    }
  });
  
  // Wait for server to be ready
  console.log(chalk.blue('⏳ Waiting for server to be ready...'));
  
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const status = await checkServerStatus();
    
    if (status.running) {
      console.log(chalk.green('✅ Backend server is ready!'));
      console.log(chalk.blue(`🌐 Server available at: ${BASE_URL}`));
      return { success: true, url: BASE_URL };
    }
    
    attempts++;
    console.log(chalk.gray(`⏳ Attempt ${attempts}/${maxAttempts}...`));
  }
  
  console.log(chalk.red('❌ Server failed to start within timeout'));
  return { success: false };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  restartBackend().catch(console.error);
}
