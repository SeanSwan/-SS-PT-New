/**
 * Node.js wrapper for starting the Workout MCP Server
 * Ensures Python dependencies are installed and server starts correctly
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const colorLog = {
  info: (msg) => console.log(`\x1b[36m[MCP]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[MCP]\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m[MCP]\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m[MCP]\x1b[0m ${msg}`)
};

async function checkPython() {
  try {
    execSync('python --version', { stdio: 'pipe' });
    return 'python';
  } catch (e) {
    try {
      execSync('python3 --version', { stdio: 'pipe' });
      return 'python3';
    } catch (e2) {
      throw new Error('Python is not installed or not in PATH');
    }
  }
}

async function installDependencies(pythonCmd) {
  const mcpDir = path.join(__dirname, 'backend', 'mcp_server');
  const requirementsFile = path.join(mcpDir, 'workout_requirements.txt');
  
  if (!fs.existsSync(requirementsFile)) {
    colorLog.warn('Requirements file not found, continuing...');
    return;
  }
  
  colorLog.info('Installing Python dependencies...');
  try {
    execSync(`${pythonCmd} -m pip install -r "${requirementsFile}"`, {
      cwd: mcpDir,
      stdio: 'pipe'
    });
    colorLog.success('Python dependencies installed successfully');
  } catch (error) {
    colorLog.warn('Warning: Some dependencies may have failed to install');
    colorLog.info('MCP Server will attempt to start with existing dependencies');
  }
}

async function startMcpServer(pythonCmd) {
  const mcpDir = path.join(__dirname, 'backend', 'mcp_server');
  const launcherScript = path.join(mcpDir, 'workout_launcher.py');
  
  colorLog.info('Starting Workout MCP Server...');
  
  const mcpProcess = spawn(pythonCmd, [launcherScript], {
    cwd: mcpDir,
    stdio: 'inherit'
  });
  
  mcpProcess.on('error', (error) => {
    colorLog.error(`Failed to start MCP server: ${error.message}`);
    process.exit(1);
  });
  
  mcpProcess.on('exit', (code) => {
    if (code !== 0) {
      colorLog.error(`MCP server exited with code ${code}`);
      process.exit(code);
    }
  });
  
  // Handle process termination
  process.on('SIGTERM', () => mcpProcess.kill('SIGTERM'));
  process.on('SIGINT', () => mcpProcess.kill('SIGINT'));
  
  return mcpProcess;
}

async function main() {
  try {
    // Check Python installation
    const pythonCmd = await checkPython();
    colorLog.success(`Found Python: ${pythonCmd}`);
    
    // Install dependencies
    await installDependencies(pythonCmd);
    
    // Start MCP server
    await startMcpServer(pythonCmd);
    
  } catch (error) {
    colorLog.error(`Error: ${error.message}`);
    colorLog.info('Please ensure Python is installed and accessible from command line');
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { main };
