// scripts/server-status.mjs
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Server Status Monitor
 * Checks the health of all servers and provides real-time status updates
 */

const SERVERS = [
  {
    name: 'Backend API',
    url: 'http://localhost:5000/health',
    color: 'blue',
    process: 'backend'
  },
  {
    name: 'Frontend (Vite)',
    url: 'http://localhost:5173',
    color: 'green',
    process: 'frontend'
  },
  {
    name: 'Workout MCP',
    url: 'http://localhost:8000',
    color: 'yellow',
    process: 'workout-mcp'
  },
  {
    name: 'Enhanced Gamification MCP',
    url: 'http://localhost:8002',
    color: 'purple',
    process: 'gamification-mcp'
  },
  {
    name: 'MongoDB',
    url: 'http://localhost:5000/health',
    checkProperty: 'mongodb',
    color: 'cyan',
    process: 'mongodb'
  }
];

class ServerMonitor {
  constructor() {
    this.checkedServers = new Map();
    this.interval = null;
  }

  async checkServer(server) {
    try {
      const response = await axios.get(server.url, { timeout: 5000 });
      
      if (server.checkProperty) {
        // Check specific property for MongoDB status
        return response.data.dbStatus && response.data.dbStatus.mongodb && response.data.dbStatus.mongodb.connected;
      }
      
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async checkAllServers() {
    const results = {};
    
    for (const server of SERVERS) {
      const isUp = await this.checkServer(server);
      results[server.process] = {
        ...server,
        status: isUp ? 'online' : 'offline',
        timestamp: new Date()
      };
    }
    
    return results;
  }

  displayStatus(results) {
    console.clear();
    console.log(chalk.bold.white('🚀 SwanStudios Server Status Monitor'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log();

    const onlineServers = [];
    const offlineServers = [];

    for (const [process, info] of Object.entries(results)) {
      const statusIcon = info.status === 'online' ? '✅' : '❌';
      const statusColor = info.status === 'online' ? chalk.green : chalk.red;
      const timeStr = info.timestamp.toLocaleTimeString();
      
      console.log(`${statusIcon} ${chalk[info.color].bold(info.name.padEnd(25))} ${statusColor(info.status.toUpperCase().padEnd(10))} ${chalk.gray(timeStr)}`);
      
      if (info.status === 'online') {
        onlineServers.push(info.name);
      } else {
        offlineServers.push(info.name);
      }
    }

    console.log();
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`${chalk.green('Online:')} ${onlineServers.length} servers`);
    console.log(`${chalk.red('Offline:')} ${offlineServers.length} servers`);
    
    if (offlineServers.length > 0) {
      console.log();
      console.log(chalk.red.bold('⚠️  Offline servers:'));
      offlineServers.forEach(server => {
        console.log(`   • ${server}`);
      });
    }
    
    console.log();
    console.log(chalk.gray('Last updated: ' + new Date().toLocaleString()));
    console.log(chalk.gray('Press Ctrl+C to exit'));
  }

  async startMonitoring(interval = 5000) {
    console.log(chalk.blue.bold('Starting server monitoring...'));
    
    // Initial check
    const results = await this.checkAllServers();
    this.displayStatus(results);
    
    // Set up periodic checks
    this.interval = setInterval(async () => {
      const results = await this.checkAllServers();
      this.displayStatus(results);
    }, interval);
  }

  stopMonitoring() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log(chalk.yellow('\nServer monitoring stopped.'));
    }
  }
}

// Auto-run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new ServerMonitor();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    monitor.stopMonitoring();
    process.exit(0);
  });
  
  monitor.startMonitoring();
}

export default ServerMonitor;
