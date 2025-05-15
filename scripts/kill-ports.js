/**
 * Kill Ports Script
 * Kills processes running on specified ports
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

const execAsync = promisify(exec);

const PORTS = [5000, 5173, 8000, 8002, 27017];

async function killPort(port) {
  try {
    // Find process using the port
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    
    if (stdout) {
      // Extract PID from netstat output
      const lines = stdout.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        
        if (pid && pid !== '0') {
          try {
            await execAsync(`taskkill /F /PID ${pid}`);
            console.log(chalk.green(`✅ Killed process on port ${port} (PID: ${pid})`));
          } catch (killError) {
            console.log(chalk.yellow(`⚠️  Could not kill process ${pid} on port ${port}`));
          }
        }
      }
    } else {
      console.log(chalk.blue(`ℹ️  No process found on port ${port}`));
    }
  } catch (error) {
    console.log(chalk.blue(`ℹ️  No process found on port ${port}`));
  }
}

async function killAllPorts() {
  console.log(chalk.blue('🔄 Killing processes on ports: ' + PORTS.join(', ') + '...\n'));
  
  for (const port of PORTS) {
    await killPort(port);
  }
  
  console.log(chalk.green('\n✨ Port cleanup complete!'));
}

killAllPorts().catch(console.error);
