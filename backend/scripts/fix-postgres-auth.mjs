// backend/scripts/fix-postgres-auth.mjs
import { exec } from 'child_process';
import { promisify } from 'util';
import readline from 'readline';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const execAsync = promisify(exec);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function fixPostgresAuth() {
  console.log('🔐 PostgreSQL Authentication Diagnosis & Fix\n');
  
  const dbUser = process.env.PG_USER || 'swanadmin';
  const dbPassword = process.env.PG_PASSWORD;
  
  console.log(`Target user: ${dbUser}`);
  console.log(`Password from .env: ${dbPassword ? '***SET***' : 'NOT SET'}\n`);
  
  // Step 1: Check if we can connect as postgres superuser
  console.log('1. Testing connection as postgres superuser...');
  try {
    const { stdout } = await execAsync('psql -U postgres -c "SELECT version();"');
    console.log('✅ Successfully connected as postgres');
    console.log('   This means PostgreSQL is running and accessible');
  } catch (error) {
    console.log('❌ Cannot connect as postgres:', error.message);
    console.log('💡 Try setting the postgres user password or use Windows authentication');
    
    const tryWinAuth = await question('Try Windows authentication? (y/n): ');
    if (tryWinAuth.toLowerCase() === 'y') {
      console.log('Using integrated Windows authentication...');
      // Continue with Windows auth approach
    }
  }
  
  // Step 2: Check if swanadmin user exists
  console.log('\n2. Checking if swanadmin user exists...');
  try {
    const { stdout } = await execAsync(`psql -U postgres -c "SELECT usename FROM pg_user WHERE usename='${dbUser}';"`);
    if (stdout.includes(dbUser)) {
      console.log(`✅ User '${dbUser}' exists in PostgreSQL`);
    } else {
      console.log(`❌ User '${dbUser}' does not exist`);
      
      const createUser = await question(`Create user '${dbUser}'? (y/n): `);
      if (createUser.toLowerCase() === 'y') {
        await createPostgresUser(dbUser, dbPassword);
      }
    }
  } catch (error) {
    console.log('❌ Error checking user:', error.message);
  }
  
  // Step 3: Reset password
  console.log('\n3. Password reset options...');
  const resetPassword = await question('Reset password for swanadmin? (y/n): ');
  
  if (resetPassword.toLowerCase() === 'y') {
    console.log('\nChoose password reset method:');
    console.log('1. Use password from .env file');
    console.log('2. Set a new password');
    console.log('3. Use the same password your dev tool uses');
    
    const method = await question('Choose method (1-3): ');
    
    switch (method) {
      case '1':
        await resetUserPassword(dbUser, dbPassword);
        break;
      case '2':
        const newPassword = await question('Enter new password: ');
        await resetUserPassword(dbUser, newPassword);
        
        const updateEnv = await question('Update .env file with new password? (y/n): ');
        if (updateEnv.toLowerCase() === 'y') {
          await updateEnvPassword(newPassword);
        }
        break;
      case '3':
        console.log('\n💡 To sync with your dev tool:');
        console.log('1. Use your dev tool to connect successfully');
        console.log('2. Check what password it used');
        console.log('3. Come back and use method 1 or 2 with that password');
        break;
    }
  }
  
  // Step 4: Test connection
  console.log('\n4. Testing connection with current credentials...');
  await testConnection(dbUser, dbPassword);
  
  // Step 5: Provide additional solutions
  console.log('\n5. 🔧 Additional Solutions:\n');
  console.log('A. Check pg_hba.conf for authentication method:');
  console.log('   - Location: C:\\Program Files\\PostgreSQL\\17\\data\\pg_hba.conf');
  console.log('   - Look for lines with HOST connections');
  console.log('   - Change method from "scram-sha-256" to "md5" if needed');
  console.log('\nB. Use your dev tool\'s credentials:');
  console.log('   - Connect with your dev tool');
  console.log('   - Note the successful connection details');
  console.log('   - Update .env file accordingly');
  console.log('\nC. Create a test script that matches your dev tool:');
  console.log('   - We can create a script that connects the same way your dev tool does');
  
  const createDevToolScript = await question('\nCreate a script that mimics your dev tool? (y/n): ');
  if (createDevToolScript.toLowerCase() === 'y') {
    await createDevToolMimicScript();
  }
  
  rl.close();
}

async function createPostgresUser(username, password) {
  console.log(`\nCreating user '${username}'...`);
  try {
    const createCmd = `psql -U postgres -c "CREATE USER ${username} WITH SUPERUSER CREATEDB CREATEROLE LOGIN PASSWORD '${password}';"`;
    await execAsync(createCmd);
    console.log('✅ User created successfully');
  } catch (error) {
    console.log('❌ Error creating user:', error.message);
  }
}

async function resetUserPassword(username, password) {
  console.log(`\nResetting password for '${username}'...`);
  try {
    const alterCmd = `psql -U postgres -c "ALTER USER ${username} PASSWORD '${password}';"`;
    await execAsync(alterCmd);
    console.log('✅ Password reset successfully');
  } catch (error) {
    console.log('❌ Error resetting password:', error.message);
  }
}

async function updateEnvPassword(newPassword) {
  console.log('\nUpdating .env file...');
  try {
    const envContent = require('fs').readFileSync(envPath, 'utf8');
    const updatedContent = envContent.replace(
      /PG_PASSWORD=.*/,
      `PG_PASSWORD=${newPassword}`
    );
    require('fs').writeFileSync(envPath, updatedContent);
    console.log('✅ .env file updated');
  } catch (error) {
    console.log('❌ Error updating .env:', error.message);
  }
}

async function testConnection(username, password) {
  try {
    const testCmd = `psql -h localhost -p 5432 -U ${username} -d postgres -c "SELECT current_user;"`;
    const { stdout } = await execAsync(testCmd);
    console.log('✅ Connection successful!');
    console.log('   Connected as:', stdout.trim());
  } catch (error) {
    console.log('❌ Connection still failing:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.log('\n💡 The password is still incorrect. Try:');
      console.log('1. Double-check your dev tool\'s credentials');
      console.log('2. Use pgAdmin to connect and verify the password');
      console.log('3. Check if Windows authentication is being used');
    }
  }
}

async function createDevToolMimicScript() {
  console.log('\nCreating dev tool mimic script...');
  
  const devToolScript = `// backend/scripts/dev-tool-connection.mjs
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Try different connection methods that dev tools commonly use
async function testDevToolConnections() {
  console.log('🔧 Testing different connection methods...\\n');
  
  const baseConfig = {
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    database: process.env.PG_DB || 'swanstudios',
    user: process.env.PG_USER || 'swanadmin',
  };
  
  // Method 1: Direct password from .env
  console.log('1. Testing with .env password...');
  try {
    const client1 = new Client({
      ...baseConfig,
      password: process.env.PG_PASSWORD,
    });
    await client1.connect();
    console.log('✅ Success with .env password!');
    await client1.end();
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }
  
  // Method 2: SSL connection
  console.log('\\n2. Testing with SSL...');
  try {
    const client2 = new Client({
      ...baseConfig,
      password: process.env.PG_PASSWORD,
      ssl: false, // Most dev tools use ssl: false for local
    });
    await client2.connect();
    console.log('✅ Success with SSL disabled!');
    await client2.end();
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }
  
  // Method 3: Trust authentication (no password)
  console.log('\\n3. Testing without password (trust auth)...');
  try {
    const client3 = new Client({
      ...baseConfig,
      // No password - trust authentication
    });
    await client3.connect();
    console.log('✅ Success with no password (trust auth)!');
    await client3.end();
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }
  
  // Method 4: Windows authentication
  console.log('\\n4. Testing with Windows authentication...');
  try {
    const client4 = new Client({
      host: baseConfig.host,
      port: baseConfig.port,
      database: baseConfig.database,
      // Use Windows credentials
    });
    await client4.connect();
    console.log('✅ Success with Windows auth!');
    await client4.end();
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }
  
  console.log('\\n💡 If any method succeeded, update your database.mjs accordingly');
}

testDevToolConnections().catch(console.error);
`;

  const scriptPath = path.join(process.cwd(), 'scripts', 'dev-tool-connection.mjs');
  require('fs').writeFileSync(scriptPath, devToolScript);
  console.log(`✅ Created: ${scriptPath}`);
  console.log('Run with: node scripts/dev-tool-connection.mjs');
}

fixPostgresAuth().catch(console.error);