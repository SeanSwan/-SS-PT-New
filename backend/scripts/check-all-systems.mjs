// backend/scripts/check-all-systems.mjs
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkAllSystems() {
  console.log('🔍 SwanStudios System Status Check\n');
  
  const checks = [];
  
  // Check 1: Backend Server
  console.log('1. 🎯 Backend Server...');
  try {
    const response = await fetch('http://localhost:10000/health');
    const data = await response.json();
    console.log(`   ✅ Running on port 10000`);
    console.log(`   📊 Status: ${data.status}`);
    checks.push({ name: 'Backend', status: 'OK' });
  } catch (error) {
    console.log(`   ❌ Not responding: ${error.message}`);
    checks.push({ name: 'Backend', status: 'ERROR' });
  }
  
  // Check 2: Frontend Server
  console.log('\n2. 🖥️ Frontend Server...');
  try {
    const response = await fetch('http://localhost:5173');
    console.log(`   ✅ Running on port 5173`);
    checks.push({ name: 'Frontend', status: 'OK' });
  } catch (error) {
    console.log(`   ❌ Not responding: ${error.message}`);
    checks.push({ name: 'Frontend', status: 'ERROR' });
  }
  
  // Check 3: PostgreSQL
  console.log('\n3. 🗃️ PostgreSQL Database...');
  try {
    const { default: sequelize } = await import('../database.mjs');
    await sequelize.authenticate();
    console.log(`   ✅ Connected successfully`);
    checks.push({ name: 'PostgreSQL', status: 'OK' });
  } catch (error) {
    console.log(`   ❌ Connection failed: ${error.message}`);
    checks.push({ name: 'PostgreSQL', status: 'ERROR' });
  }
  
  // Check 4: MongoDB
  console.log('\n4. 🍃 MongoDB Database...');
  try {
    const { connectToMongoDB } = await import('../mongodb-connect.mjs');
    await connectToMongoDB();
    console.log(`   ✅ Connected successfully`);
    checks.push({ name: 'MongoDB', status: 'OK' });
  } catch (error) {
    console.log(`   ❌ Connection failed: ${error.message}`);
    checks.push({ name: 'MongoDB', status: 'ERROR' });
  }
  
  // Check 5: Gamification MCP
  console.log('\n5. 🎮 Gamification MCP Server...');
  try {
    const response = await fetch('http://localhost:8002/health');
    console.log(`   ✅ Running on port 8002`);
    checks.push({ name: 'Gamification MCP', status: 'OK' });
  } catch (error) {
    console.log(`   ❌ Not responding: ${error.message}`);
    checks.push({ name: 'Gamification MCP', status: 'ERROR' });
  }
  
  // Check 6: Workout MCP
  console.log('\n6. 💪 Workout MCP Server...');
  try {
    const response = await fetch('http://localhost:8000/health');
    console.log(`   ✅ Running on port 8000`);
    checks.push({ name: 'Workout MCP', status: 'OK' });
  } catch (error) {
    console.log(`   ❌ Not responding: ${error.message}`);
    checks.push({ name: 'Workout MCP', status: 'ERROR' });
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SYSTEM STATUS SUMMARY');
  console.log('='.repeat(50));
  
  checks.forEach(check => {
    const emoji = check.status === 'OK' ? '✅' : '❌';
    console.log(`${emoji} ${check.name.padEnd(20)} ${check.status}`);
  });
  
  const successCount = checks.filter(c => c.status === 'OK').length;
  const totalCount = checks.length;
  
  console.log('\n🎯 Overall Status:');
  console.log(`${successCount}/${totalCount} systems operational`);
  
  if (successCount === totalCount) {
    console.log('🎉 All systems are GO! Your SwanStudios platform is fully operational!');
  } else {
    console.log('⚠️ Some systems need attention. Check the details above.');
  }
  
  console.log('\n📲 Access Your Application:');
  console.log('🌐 Frontend: http://localhost:5173');
  console.log('🔗 Backend API: http://localhost:10000');
  console.log('🏥 Health Check: http://localhost:10000/health');
  
  console.log('\n👤 Test Login Credentials:');
  console.log('🔐 Admin:   admin@swanstudios.com / admin123');
  console.log('🏃 Trainer: trainer@swanstudios.com / trainer123');
  console.log('💪 Client:  client@test.com / client123');
  console.log('👥 User:    user@test.com / user123');
}

checkAllSystems().catch(console.error);