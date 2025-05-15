/**
 * MCP Health Check Script
 * Verifies that all MCP servers are running and accessible
 */

import axios from 'axios';
import chalk from 'chalk';

const mcpServers = [
  {
    name: 'Workout MCP',
    url: 'http://localhost:8000/health',
    port: 8000
  },
  {
    name: 'Gamification MCP',
    url: 'http://localhost:8002/health',
    port: 8002
  }
];

async function checkMCPServer(server) {
  try {
    const response = await axios.get(server.url, { timeout: 5000 });
    if (response.status === 200) {
      console.log(chalk.green(`✅ ${server.name} - Running (Port ${server.port})`));
      return true;
    }
  } catch (error) {
    console.log(chalk.red(`❌ ${server.name} - Not running (Port ${server.port})`));
    return false;
  }
}

async function checkAllMCPServers() {
  console.log(chalk.blue('🔍 Checking MCP Server Health...\n'));
  
  const results = await Promise.all(mcpServers.map(checkMCPServer));
  
  const runningCount = results.filter(Boolean).length;
  
  console.log(chalk.blue(`\n📊 Summary: ${runningCount}/${mcpServers.length} MCP servers running`));
  
  if (runningCount === mcpServers.length) {
    console.log(chalk.green('🎉 All MCP servers are healthy!'));
  } else {
    console.log(chalk.yellow('⚠️  Some MCP servers are not running'));
    console.log(chalk.blue('💡 Run "npm run start-all-mcp" to start all MCP servers'));
  }
}

checkAllMCPServers().catch(console.error);
