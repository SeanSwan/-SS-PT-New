/**
 * MCP Servers Startup Script
 * 
 * This script starts both the Workout MCP Server and Gamification MCP Server.
 * It provides better error handling and status reporting compared to direct invocation.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Define paths
const ROOT_DIR = path.resolve(__dirname, '..');
const MCP_SERVER_DIR = path.join(ROOT_DIR, 'backend', 'mcp_server');
const WORKOUT_SERVER_SCRIPT = path.join(MCP_SERVER_DIR, 'start_workout_server.py');
const GAMIFICATION_SERVER_SCRIPT = path.join(MCP_SERVER_DIR, 'start_gamification_server.py');

// Colors for console output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Log a message with a specific server prefix and color
 */
function logServerMessage(server, message, color = COLORS.reset) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${COLORS.dim}[${timestamp}]${COLORS.reset} ${color}[${server}]${COLORS.reset} ${message}`);
}

/**
 * Start a Python MCP server
 */
function startPythonServer(scriptPath, serverName, serverColor) {
  // Check if the script exists
  if (!fs.existsSync(scriptPath)) {
    logServerMessage(serverName, `Script not found: ${scriptPath}`, COLORS.red);
    logServerMessage(serverName, 'Server will not be started.', COLORS.red);
    return;
  }

  logServerMessage(serverName, 'Starting server...', serverColor);

  // Get Python executable (use python3 on Unix-like systems, python on Windows)
  const pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';

  // Spawn the Python process
  const serverProcess = spawn(pythonExecutable, [scriptPath], {
    cwd: MCP_SERVER_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });

  // Handle process output
  serverProcess.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        logServerMessage(serverName, line, serverColor);
      }
    }
  });

  serverProcess.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        // Filter out non-error messages that Python sends to stderr (like install progress)
        if (line.includes('ERROR') || line.includes('Error') || line.includes('exception')) {
          logServerMessage(serverName, line, COLORS.red);
        } else {
          logServerMessage(serverName, line, COLORS.yellow);
        }
      }
    }
  });

  // Handle process exit
  serverProcess.on('exit', (code) => {
    if (code === 0) {
      logServerMessage(serverName, 'Server exited successfully.', serverColor);
    } else {
      logServerMessage(serverName, `Server exited with code ${code}.`, COLORS.red);
    }
  });

  // Handle process error
  serverProcess.on('error', (err) => {
    logServerMessage(serverName, `Failed to start server: ${err.message}`, COLORS.red);
  });

  // Return the process
  return serverProcess;
}

// Print startup banner
console.log('\n' + COLORS.bright + '╔════════════════════════════════════════════════════════════╗');
console.log('║                    SwanStudios MCP Servers                    ║');
console.log('╚════════════════════════════════════════════════════════════╝' + COLORS.reset + '\n');

// Start both servers
const workoutServer = startPythonServer(
  WORKOUT_SERVER_SCRIPT, 
  'Workout MCP', 
  COLORS.cyan
);

const gamificationServer = startPythonServer(
  GAMIFICATION_SERVER_SCRIPT, 
  'Gamification MCP', 
  COLORS.magenta
);

// Handle script termination
process.on('SIGINT', () => {
  logServerMessage('MCP Manager', 'Shutting down all servers...', COLORS.yellow);
  
  if (workoutServer) {
    workoutServer.kill();
  }
  
  if (gamificationServer) {
    gamificationServer.kill();
  }
  
  process.exit(0);
});

logServerMessage('MCP Manager', 'MCP servers initialized.', COLORS.green);
logServerMessage('MCP Manager', 'Press Ctrl+C to stop all servers.', COLORS.green);
