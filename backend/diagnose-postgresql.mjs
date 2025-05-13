// diagnose-postgresql.mjs
import { execSync } from 'child_process';
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

console.log('=== PostgreSQL Diagnostic Tool ===\n');

// Step 1: Check if PostgreSQL service is running
console.log('1. Checking if PostgreSQL service is running...');
try {
  if (process.platform === 'win32') {
    const result = execSync('sc query postgresql-x64-14', { encoding: 'utf8' });
    console.log('✅ PostgreSQL service found');
    console.log(result);
  } else {
    const result = execSync('systemctl is-active postgresql', { encoding: 'utf8' });
    console.log(`✅ PostgreSQL status: ${result.trim()}`);
  }
} catch (error) {
  console.log('❌ PostgreSQL service check failed:', error.message);
  console.log('\nTrying alternative service names...');
  
  const serviceNames = ['postgresql', 'postgresql-13', 'postgresql-14', 'postgresql-15', 'postgresql-16'];
  for (const service of serviceNames) {
    try {
      if (process.platform === 'win32') {
        execSync(`sc query ${service}`, { encoding: 'utf8' });
        console.log(`✅ Found service: ${service}`);
      }
    } catch (e) {
      console.log(`❌ Service not found: ${service}`);
    }
  }
}

// Step 2: Check if PostgreSQL is listening on the expected port
console.log('\n2. Checking PostgreSQL port (5432)...');
try {
  if (process.platform === 'win32') {
    const result = execSync('netstat -an | findstr ":5432"', { encoding: 'utf8' });
    console.log('✅ Something is listening on port 5432:');
    console.log(result);
  } else {
    const result = execSync('netstat -tlnp | grep :5432', { encoding: 'utf8' });
    console.log('✅ PostgreSQL is listening on port 5432');
    console.log(result);
  }
} catch (error) {
  console.log('❌ Nothing seems to be listening on port 5432');
  console.log('PostgreSQL might not be running or listening on a different port');
}

// Step 3: Check environment variables
console.log('\n3. Current environment variables:');
console.log(`PG_USER: ${process.env.PG_USER || 'undefined'}`);
console.log(`PG_PASSWORD: ${process.env.PG_PASSWORD ? '*'.repeat(process.env.PG_PASSWORD.length) : 'undefined'}`);
console.log(`PG_DB: ${process.env.PG_DB || 'undefined'}`);
console.log(`PG_HOST: ${process.env.PG_HOST || 'undefined'}`);
console.log(`PG_PORT: ${process.env.PG_PORT || 'undefined'}`);

// Step 4: Try to get PostgreSQL version
console.log('\n4. Checking PostgreSQL installation...');
try {
  const version = execSync('psql --version', { encoding: 'utf8' });
  console.log('✅ PostgreSQL client found:', version.trim());
} catch (error) {
  console.log('❌ PostgreSQL client (psql) not found in PATH');
  console.log('This might mean PostgreSQL is not installed or not in the system PATH');
}

// Step 5: Check if we can connect using psql command line
console.log('\n5. Testing command line connection...');
const testCommands = [
  'psql -h localhost -U postgres -d postgres -c "SELECT version();"',
  'psql -h localhost -U swanadmin -d swanstudios -c "SELECT version();"',
  'psql -h localhost -U postgres -d swanstudios -c "SELECT version();"'
];

for (const cmd of testCommands) {
  try {
    console.log(`\nTrying: ${cmd}`);
    const result = execSync(cmd, { encoding: 'utf8', timeout: 5000 });
    console.log('✅ Connection successful!');
    console.log(result);
    break;
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }
}

// Step 6: Recommendations
console.log('\n=== RECOMMENDATIONS ===');
console.log('\nBased on the diagnostics above:');
console.log('\n1. If PostgreSQL service is not running:');
console.log('   - Windows: Start "PostgreSQL" service from Services.msc');
console.log('   - Linux: sudo systemctl start postgresql');
console.log('   - macOS: brew services start postgresql');

console.log('\n2. If PostgreSQL is not installed:');
console.log('   - Windows: Download from postgresql.org');
console.log('   - Linux: sudo apt install postgresql (Ubuntu) or equivalent');
console.log('   - macOS: brew install postgresql');

console.log('\n3. If you\'re using Docker:');
console.log('   - Make sure your PostgreSQL container is running');
console.log('   - Check docker ps to see running containers');
console.log('   - Use docker logs <container_name> to check for errors');

console.log('\n4. If PostgreSQL is running but credentials are wrong:');
console.log('   - Check if you remember the password you set during installation');
console.log('   - Try resetting the postgres user password');
console.log('   - Check if you have other users configured');

console.log('\n=== END DIAGNOSTIC ===');
