import net from 'net';

console.log('🔍 Checking port availability for SwanStudios...');

const portsToCheck = [
  { port: 8000, service: 'workout-mcp' },
  { port: 8001, service: 'yolo-mcp' },
  { port: 8002, service: 'gamify-mcp' },
  { port: 8003, service: 'nutrition-mcp' },
  { port: 8004, service: 'alternatives-mcp' },
  { port: 8005, service: 'yolo-mcp-fallback' },
  { port: 10000, service: 'backend' },
  { port: 5173, service: 'frontend' }
];

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve({ port, available: true });
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve({ port, available: false });
    });
  });
}

async function checkAllPorts() {
  console.log('📋 Port availability check:');
  
  for (const { port, service } of portsToCheck) {
    const result = await checkPort(port);
    const status = result.available ? '✅ Available' : '❌ In Use';
    console.log(`  Port ${port} (${service}): ${status}`);
  }
  
  console.log('\n💡 Solutions for port conflicts:');
  console.log('1. Kill processes using these ports');
  console.log('2. Change port configuration in .env files');
  console.log('3. Use different ports for local development');
}

checkAllPorts().catch(console.error);