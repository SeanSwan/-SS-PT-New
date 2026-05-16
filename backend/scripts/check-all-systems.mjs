// backend/scripts/check-all-systems.mjs

async function checkAllSystems() {
  console.log('SwanStudios System Status Check\n');

  const checks = [];

  console.log('1. Backend Server...');
  try {
    const response = await fetch('http://localhost:10000/health');
    const data = await response.json();
    console.log('   OK: running on port 10000');
    console.log(`   Status: ${data.status}`);
    checks.push({ name: 'Backend', status: 'OK' });
  } catch (error) {
    console.log(`   ERROR: not responding: ${error.message}`);
    checks.push({ name: 'Backend', status: 'ERROR' });
  }

  console.log('\n2. Frontend Server...');
  try {
    await fetch('http://localhost:5173');
    console.log('   OK: running on port 5173');
    checks.push({ name: 'Frontend', status: 'OK' });
  } catch (error) {
    console.log(`   ERROR: not responding: ${error.message}`);
    checks.push({ name: 'Frontend', status: 'ERROR' });
  }

  console.log('\n3. PostgreSQL Database...');
  try {
    const { default: sequelize } = await import('../database.mjs');
    await sequelize.authenticate();
    console.log('   OK: connected successfully');
    checks.push({ name: 'PostgreSQL', status: 'OK' });
  } catch (error) {
    console.log(`   ERROR: connection failed: ${error.message}`);
    checks.push({ name: 'PostgreSQL', status: 'ERROR' });
  }

  console.log('\n4. MongoDB Database...');
  try {
    const { connectToMongoDB } = await import('../mongodb-connect.mjs');
    await connectToMongoDB();
    console.log('   OK: connected successfully');
    checks.push({ name: 'MongoDB', status: 'OK' });
  } catch (error) {
    console.log(`   ERROR: connection failed: ${error.message}`);
    checks.push({ name: 'MongoDB', status: 'ERROR' });
  }

  console.log('\n5. Retired MCP Stack...');
  console.log('   OK: MCP workers are retired; first-party APIs own workout and gamification flows.');
  checks.push({ name: 'MCP Retirement', status: 'OK' });

  console.log('\n' + '='.repeat(50));
  console.log('SYSTEM STATUS SUMMARY');
  console.log('='.repeat(50));

  checks.forEach((check) => {
    const marker = check.status === 'OK' ? 'OK' : 'ERROR';
    console.log(`${marker} ${check.name.padEnd(20)} ${check.status}`);
  });

  const successCount = checks.filter((check) => check.status === 'OK').length;
  const totalCount = checks.length;

  console.log('\nOverall Status:');
  console.log(`${successCount}/${totalCount} systems operational`);

  if (successCount === totalCount) {
    console.log('All required first-party systems are operational.');
  } else {
    console.log('Some systems need attention. Check the details above.');
  }

  console.log('\nAccess Your Application:');
  console.log('Frontend: http://localhost:5173');
  console.log('Backend API: http://localhost:10000');
  console.log('Health Check: http://localhost:10000/health');
}

checkAllSystems().catch(console.error);
