// Server monitoring utility - FIXED VERSION
// Fixes missing script referenced in package.json

const axios = require('axios');

// Chalk v5+ requires dynamic import
let chalk;

async function loadChalk() {
  if (!chalk) {
    chalk = await import('chalk');
  }
  return chalk.default;
}

class ServerMonitor {
  constructor() {
    this.servers = [
      { name: 'Backend', url: 'http://localhost:10000/health' },
      { name: 'Frontend', url: 'http://localhost:5173' },
      { name: 'Workout MCP', url: 'http://localhost:8001/health' },
      { name: 'Gamification MCP', url: 'http://localhost:8002/health' },
      { name: 'YOLO MCP', url: 'http://localhost:8003/health' }
    ];
    this.monitoring = false;
    this.chalkInstance = null;
  }
  
  async initChalk() {
    if (!this.chalkInstance) {
      this.chalkInstance = await loadChalk();
    }
    return this.chalkInstance;
  }
  
  async checkServer(server) {
    try {
      const start = Date.now();
      const response = await axios.get(server.url, { 
        timeout: 5000,
        validateStatus: () => true // Accept any status code
      });
      const responseTime = Date.now() - start;
      
      return {
        name: server.name,
        status: response.status < 400 ? 'up' : 'error',
        statusCode: response.status,
        responseTime,
        url: server.url
      };
    } catch (error) {
      return {
        name: server.name,
        status: 'down',
        error: error.code || error.message,
        url: server.url
      };
    }
  }
  
  async checkAllServers() {
    const results = await Promise.all(
      this.servers.map(server => this.checkServer(server))
    );
    
    return results;
  }
  
  async displayResults(results) {
    const chalk = await this.initChalk();
    console.clear();
    console.log(chalk.blue('🖥️  SwanStudios Server Monitor'));
    console.log(chalk.gray('═'.repeat(50)));
    console.log(chalk.gray(`Last check: ${new Date().toLocaleTimeString()}\n`));
    
    results.forEach(result => {
      const statusIcon = result.status === 'up' ? '✅' : 
                        result.status === 'error' ? '⚠️' : '❌';
      const statusColor = result.status === 'up' ? chalk.green :
                         result.status === 'error' ? chalk.yellow : chalk.red;
      
      const statusText = result.status === 'up' ? 
        `UP (${result.responseTime}ms)` :
        result.status === 'error' ?
        `ERROR (${result.statusCode})` :
        `DOWN (${result.error})`;
      
      console.log(`${statusIcon} ${chalk.bold(result.name.padEnd(20))} ${statusColor(statusText)}`);
    });
    
    const upCount = results.filter(r => r.status === 'up').length;
    console.log(chalk.gray('\n═'.repeat(50)));
    console.log(chalk.blue(`Status: ${upCount}/${results.length} servers running`));
  }
  
  async startMonitoring(interval = 5000) {
    const chalk = await this.initChalk();
    this.monitoring = true;
    console.log(chalk.blue('🚀 Starting server monitoring...'));
    console.log(chalk.gray('Press Ctrl+C to stop\n'));
    
    while (this.monitoring) {
      const results = await this.checkAllServers();
      await this.displayResults(results);
      
      if (this.monitoring) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
  }
  
  async stop() {
    const chalk = await this.initChalk();
    this.monitoring = false;
    console.log(chalk.yellow('\n⏹️  Monitoring stopped'));
  }
}

async function runMonitor() {
  const monitor = new ServerMonitor();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await monitor.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await monitor.stop();
    process.exit(0);
  });
  
  await monitor.startMonitoring();
}

if (require.main === module) {
  runMonitor().catch(console.error);
}

module.exports = { ServerMonitor };
