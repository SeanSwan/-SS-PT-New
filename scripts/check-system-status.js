/**
 * System Status Check Script
 * Provides overview of all services
 */

import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

const execAsync = promisify(exec);

const services = [
  {
    name: 'Frontend (React)',
    url: 'http://localhost:5173',
    port: 5173,
    type: 'web'
  },
  {
    name: 'Backend (Node.js)',
    url: 'http://localhost:5000/health',
    port: 5000,
    type: 'api'
  },
  {
    name: 'MongoDB',
    port: 27017,
    type: 'database'
  },
  {
    name: 'Workout MCP',
    url: 'http://localhost:8000/health',
    port: 8000,
    type: 'mcp'
  },
  {
    name: 'Gamification MCP',
    url: 'http://localhost:8002/health',
    port: 8002,
    type: 'mcp'
  }
];

async function checkPortUsage(port) {
  try {
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    return stdout.includes(port.toString());
  } catch (error) {
    return false;
  }
}

async function checkHTTPService(service) {
  if (!service.url) return null;
  
  try {
    const response = await axios.get(service.url, { timeout: 3000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

async function checkService(service) {
  const portInUse = await checkPortUsage(service.port);
  const httpOk = await checkHTTPService(service);
  
  let status;
  let color;
  
  if (service.type === 'database') {
    status = portInUse ? 'Running' : 'Stopped';
    color = portInUse ? 'green' : 'red';
  } else if (httpOk === true) {
    status = 'Healthy';
    color = 'green';
  } else if (portInUse) {
    status = 'Port in use';
    color = 'yellow';
  } else {
    status = 'Stopped';
    color = 'red';
  }
  
  return { ...service, status, color, portInUse, httpOk };
}

async function checkSystemStatus() {
  console.log(chalk.blue('🔍 SwanStudios System Status Check\n'));
  
  const results = await Promise.all(services.map(checkService));
  
  console.log('Service'.padEnd(20) + 'Port'.padEnd(10) + 'Status');
  console.log('─'.repeat(50));
  
  results.forEach(service => {
    const statusColor = service.color === 'green' ? chalk.green : 
                       service.color === 'yellow' ? chalk.yellow : chalk.red;
    
    console.log(
      service.name.padEnd(20) + 
      service.port.toString().padEnd(10) + 
      statusColor(service.status)
    );
  });
  
  const healthyCount = results.filter(s => s.status === 'Healthy' || s.status === 'Running').length;
  
  console.log('\n' + '─'.repeat(50));
  console.log(chalk.blue(`📊 Summary: ${healthyCount}/${results.length} services running`));
  
  if (healthyCount === results.length) {
    console.log(chalk.green('🎉 All systems operational!'));
  } else {
    console.log(chalk.yellow('⚠️  Some services need attention'));
    console.log(chalk.blue('💡 Run "npm start" to start all services'));
  }
}

checkSystemStatus().catch(console.error);
