// Cross-platform port killing utility - FIXED VERSION
// Fixes missing script referenced in package.json

const { spawn, exec } = require('child_process');

// Chalk v5+ requires dynamic import
let chalk;

async function loadChalk() {
  if (!chalk) {
    chalk = await import('chalk');
  }
  return chalk.default;
}

const PORTS_TO_KILL = [3000, 5173, 10000, 8001, 8002, 8003, 27017];

function killPortWindows(port) {
  return new Promise((resolve) => {
    exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
      if (error || !stdout) {
        resolve({ port, killed: false, reason: 'Port not in use' });
        return;
      }
      
      const lines = stdout.split('\n');
      const pids = lines
        .map(line => line.trim().split(/\s+/).pop())
        .filter(pid => pid && !isNaN(pid));
      
      if (pids.length === 0) {
        resolve({ port, killed: false, reason: 'No PIDs found' });
        return;
      }
      
      let killed = 0;
      pids.forEach(pid => {
        exec(`taskkill /PID ${pid} /F`, (killError) => {
          if (!killError) killed++;
        });
      });
      
      setTimeout(() => {
        resolve({ port, killed: killed > 0, pids: killed });
      }, 1000);
    });
  });
}

function killPortUnix(port) {
  return new Promise((resolve) => {
    exec(`lsof -ti:${port}`, (error, stdout) => {
      if (error || !stdout.trim()) {
        resolve({ port, killed: false, reason: 'Port not in use' });
        return;
      }
      
      const pids = stdout.trim().split('\n');
      exec(`kill -9 ${pids.join(' ')}`, (killError) => {
        resolve({ 
          port, 
          killed: !killError, 
          pids: pids.length,
          reason: killError ? killError.message : 'Success'
        });
      });
    });
  });
}

async function killPorts() {
  const chalkInstance = await loadChalk();
  console.log(chalkInstance.blue('🔫 Killing ports that might be in use...'));
  
  const isWindows = process.platform === 'win32';
  const killFunction = isWindows ? killPortWindows : killPortUnix;
  
  const results = [];
  
  for (const port of PORTS_TO_KILL) {
    console.log(chalkInstance.yellow(`Checking port ${port}...`));
    const result = await killFunction(port);
    results.push(result);
    
    if (result.killed) {
      console.log(chalkInstance.green(`✅ Port ${port}: Killed ${result.pids} process(es)`));
    } else {
      console.log(chalkInstance.gray(`⚪ Port ${port}: ${result.reason}`));
    }
  }
  
  const totalKilled = results.filter(r => r.killed).length;
  console.log(chalkInstance.blue(`\n📊 Summary: Killed processes on ${totalKilled}/${PORTS_TO_KILL.length} ports`));
  
  return results;
}

if (require.main === module) {
  killPorts().catch(console.error);
}

module.exports = { killPorts };
