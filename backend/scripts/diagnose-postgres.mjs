// backend/scripts/diagnose-postgres.mjs
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const execAsync = promisify(exec);

async function diagnosePostgres() {
  console.log('🔍 PostgreSQL Diagnosis Starting...\n');
  
  // 1. Check if PostgreSQL is running
  console.log('1. Checking if PostgreSQL service is running...');
  try {
    // Check Windows PostgreSQL service
    const { stdout: serviceStatus } = await execAsync('sc query postgresql*');
    console.log('✅ PostgreSQL service found');
    console.log(serviceStatus);
  } catch (error) {
    console.log('⚠️ PostgreSQL service check failed:', error.message);
    console.log('💡 Try starting PostgreSQL manually or through Services');
  }
  
  // 2. Check if psql command is available
  console.log('\n2. Checking psql availability...');
  try {
    const { stdout: psqlVersion } = await execAsync('psql --version');
    console.log('✅ psql is available:', psqlVersion.trim());
  } catch (error) {
    console.log('❌ psql not found in PATH:', error.message);
    console.log('💡 Make sure PostgreSQL bin directory is in your PATH');
  }
  
  // 3. List PostgreSQL clusters/instances
  console.log('\n3. Checking PostgreSQL instances...');
  try {
    const { stdout: instances } = await execAsync('pg_lsclusters 2>nul || echo "pg_lsclusters not available"');
    console.log('Instances:', instances);
  } catch (error) {
    console.log('⚠️ Could not list PostgreSQL instances');
  }
  
  // 4. Check environment variables
  console.log('\n4. Environment Variables:');
  console.log(`PG_HOST: ${process.env.PG_HOST || 'localhost'}`);
  console.log(`PG_PORT: ${process.env.PG_PORT || '5432'}`);
  console.log(`PG_DB: ${process.env.PG_DB || 'swanstudios'}`);
  console.log(`PG_USER: ${process.env.PG_USER || 'swanadmin'}`);
  console.log(`PG_PASSWORD: ${process.env.PG_PASSWORD ? '***SET***' : 'NOT SET'}`);
  
  // 5. Test basic connection (without authentication)
  console.log('\n5. Testing connection to PostgreSQL...');
  try {
    const testCmd = `psql -h ${process.env.PG_HOST || 'localhost'} -p ${process.env.PG_PORT || '5432'} -U postgres -l`;
    console.log('Running:', testCmd);
    const { stdout } = await execAsync(testCmd);
    console.log('✅ Connected to PostgreSQL');
    console.log('Available databases:');
    console.log(stdout);
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
  }
  
  // 6. Suggest solutions
  console.log('\n🔧 Suggested Solutions:');
  console.log('1. Create the user: createuser -s swanadmin');
  console.log('2. Create the database: createdb -O swanadmin swanstudios');
  console.log('3. Set password: ALTER USER swanadmin PASSWORD \'your_password\';');
  console.log('4. Check pg_hba.conf for authentication method');
  console.log('5. Restart PostgreSQL service');
}

// Run the diagnosis
diagnosePostgres().catch(console.error);