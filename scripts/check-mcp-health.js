/**
 * MCP Server Health Check Script
 * Verifies that the Workout MCP Server is running and responding
 */

const http = require('http');

function checkMcpHealth() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:8000/', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.name === 'Workout MCP Server') {
            console.log('✅ Workout MCP Server is running and healthy');
            console.log(`   Version: ${response.version || 'unknown'}`);
            console.log(`   Description: ${response.description || 'N/A'}`);
            resolve(true);
          } else {
            console.log('⚠️  MCP Server responded but with unexpected format');
            resolve(false);
          }
        } catch (e) {
          console.log('⚠️  MCP Server responded but with invalid JSON');
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log('❌ Workout MCP Server is not responding');
      console.log(`   Error: ${err.message}`);
      console.log('   Make sure the server is running on http://localhost:8000');
      resolve(false);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      console.log('❌ MCP Server health check timed out');
      resolve(false);
    });
  });
}

async function main() {
  console.log('Checking Workout MCP Server health...');
  await checkMcpHealth();
}

if (require.main === module) {
  main();
}

module.exports = { checkMcpHealth };
