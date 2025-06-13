// MCP Health Checker - FIXED VERSION
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

async function checkMCPHealth() {
  const chalkInstance = await loadChalk();
  console.log(chalkInstance.blue('🔍 Checking MCP Server Health...'));
  
  const mcpServers = [
    { name: 'Workout MCP', url: 'http://localhost:8001/health', port: 8001 },
    { name: 'Gamification MCP', url: 'http://localhost:8002/health', port: 8002 },
    { name: 'YOLO MCP', url: 'http://localhost:8003/health', port: 8003 }
  ];
  
  const results = [];
  
  for (const server of mcpServers) {
    try {
      const response = await axios.get(server.url, { timeout: 5000 });
      results.push({
        name: server.name,
        status: 'healthy',
        port: server.port,
        responseTime: response.headers['x-response-time'] || 'N/A'
      });
      console.log(chalkInstance.green(`✅ ${server.name}: Healthy`));
    } catch (error) {
      results.push({
        name: server.name,
        status: 'unhealthy',
        port: server.port,
        error: error.message
      });
      console.log(chalkInstance.red(`❌ ${server.name}: ${error.message}`));
    }
  }
  
  // Summary
  const healthy = results.filter(r => r.status === 'healthy');
  const unhealthy = results.filter(r => r.status === 'unhealthy');
  
  console.log(chalkInstance.blue(`\n📊 MCP Health Summary:`));
  console.log(chalkInstance.green(`✅ Healthy: ${healthy.length}/${mcpServers.length}`));
  console.log(chalkInstance.red(`❌ Unhealthy: ${unhealthy.length}/${mcpServers.length}`));
  
  return results;
}

if (require.main === module) {
  checkMCPHealth().catch(console.error);
}

module.exports = { checkMCPHealth };
