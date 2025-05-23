// backend/scripts/dev-tool-connection.mjs
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Try different connection methods that dev tools commonly use
async function testDevToolConnections() {
  console.log('🔧 Testing different connection methods...\n');
  
  const baseConfig = {
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    database: process.env.PG_DB || 'swanstudios',
    user: process.env.PG_USER || 'swanadmin',
  };
  
  console.log('Config:', { ...baseConfig, password: '***SET***' });
  console.log('\n');
  
  // Method 1: Direct password from .env
  console.log('1. Testing with .env password...');
  try {
    const client1 = new Client({
      ...baseConfig,
      password: process.env.PG_PASSWORD,
    });
    await client1.connect();
    console.log('✅ Success with .env password!');
    await client1.query('SELECT current_user');
    await client1.end();
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }
  
  // Method 2: SSL settings
  console.log('\n2. Testing with different SSL settings...');
  
  // Test with SSL disabled
  console.log('  2a. SSL disabled...');
  try {
    const client2a = new Client({
      ...baseConfig,
      password: process.env.PG_PASSWORD,
      ssl: false,
    });
    await client2a.connect();
    console.log('  ✅ Success with SSL disabled!');
    await client2a.end();
  } catch (error) {
    console.log('  ❌ Failed:', error.message);
  }
  
  // Test with SSL reject unauthorized false
  console.log('  2b. SSL with rejectUnauthorized: false...');
  try {
    const client2b = new Client({
      ...baseConfig,
      password: process.env.PG_PASSWORD,
      ssl: {
        rejectUnauthorized: false
      }
    });
    await client2b.connect();
    console.log('  ✅ Success with SSL rejectUnauthorized false!');
    await client2b.end();
  } catch (error) {
    console.log('  ❌ Failed:', error.message);
  }
  
  // Method 3: Different users
  console.log('\n3. Testing with different users...');
  
  // Test with postgres user
  console.log('  3a. Testing with postgres user...');
  try {
    const client3a = new Client({
      host: baseConfig.host,
      port: baseConfig.port,
      database: baseConfig.database,
      user: 'postgres',
      password: process.env.PG_PASSWORD, // Sometimes same password
    });
    await client3a.connect();
    console.log('  ✅ Success with postgres user!');
    await client3a.end();
  } catch (error) {
    console.log('  ❌ Failed:', error.message);
  }
  
  // Method 4: Connection string
  console.log('\n4. Testing with connection string...');
  try {
    const connectionString = `postgresql://${baseConfig.user}:${process.env.PG_PASSWORD}@${baseConfig.host}:${baseConfig.port}/${baseConfig.database}`;
    const client4 = new Client({
      connectionString,
      ssl: false
    });
    await client4.connect();
    console.log('✅ Success with connection string!');
    await client4.end();
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }
  
  // Method 5: Direct pgAdmin-style connection
  console.log('\n5. Testing pgAdmin-style connection...');
  try {
    const client5 = new Client({
      ...baseConfig,
      password: process.env.PG_PASSWORD,
      statement_timeout: 30000,
      query_timeout: 30000,
      application_name: 'swanstudios-app'
    });
    await client5.connect();
    console.log('✅ Success with pgAdmin-style settings!');
    await client5.end();
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🎯 RECOMMENDATIONS:');
  console.log('='.repeat(50));
  console.log('\nIf any method succeeded:');
  console.log('1. Note which method worked');
  console.log('2. Update your database.mjs to use the same settings');
  console.log('3. Test your application again');
  console.log('\nIf all methods failed:');
  console.log('1. Try resetting the password: ALTER USER swanadmin PASSWORD \'newpass\';');
  console.log('2. Check your dev tool\'s exact connection settings');
  console.log('3. Consider using the same credentials your dev tool uses');
  console.log('\nCommon dev tool connection patterns:');
  console.log('- PgAdmin typically uses ssl: false for local connections');
  console.log('- DBeaver often uses default SSL settings');
  console.log('- VS Code extensions may use connection strings');
}

testDevToolConnections().catch(console.error);