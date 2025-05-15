/**
 * Simple Health Check Script (CommonJS)
 * Compatible with Git Bash and older Node.js versions
 */

const http = require('http');

// Services to check
const services = [
  { name: 'Backend API', url: 'http://localhost:10000/health' },
  { name: 'Frontend', url: 'http://localhost:5173' },
  { name: 'Workout MCP', url: 'http://localhost:8000/health' },
  { name: 'Gamification MCP', url: 'http://localhost:8002/health' }
];

// Simple check function
function checkService(service) {
  return new Promise((resolve) => {
    const req = http.get(service.url, { timeout: 3000 }, (res) => {
      resolve({ name: service.name, status: res.statusCode >= 200 && res.statusCode < 300 ? 'OK' : 'ERROR' });
    });
    
    req.on('error', () => {
      resolve({ name: service.name, status: 'DOWN' });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ name: service.name, status: 'TIMEOUT' });
    });
  });
}

// Run all checks
async function runHealthCheck() {
  console.log('=== SwanStudios Health Check ===\n');
  
  const results = [];
  for (const service of services) {
    const result = await checkService(service);
    results.push(result);
    console.log(`${service.name}: ${result.status}`);
  }
  
  console.log('\n=== Summary ===');
  const healthy = results.filter(r => r.status === 'OK').length;
  console.log(`${healthy}/${results.length} services operational`);
  
  if (healthy === results.length) {
    console.log('✅ All systems operational!');
    process.exit(0);
  } else {
    console.log('⚠️  Some services have issues');
    process.exit(1);
  }
}

runHealthCheck().catch(console.error);
