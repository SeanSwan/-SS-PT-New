// backend/scripts/reset-postgres-completely.mjs
import { exec } from 'child_process';
import { promisify } from 'util';
import readline from 'readline';

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

async function resetPostgresCompletely() {
  console.log('🔧 Complete PostgreSQL Reset for SwanStudios\n');
  
  console.log('We\'ll try multiple approaches to connect and reset the authentication.\n');
  
  // Method 1: Try connecting with -W (prompt for password)
  console.log('1. First, let\'s try connecting with password prompt...');
  console.log('Run this command and see if it works:');
  console.log('psql -U postgres -W');
  console.log('\nIf it prompts for password, try common defaults like:');
  console.log('- postgres');
  console.log('- admin');
  console.log('- (empty - just press Enter)');
  console.log('- The password you remember setting during installation');
  
  const tryManualConnection = await question('\nDid the manual connection work? (y/n): ');
  
  if (tryManualConnection.toLowerCase() === 'y') {
    console.log('\nGreat! Now let\'s reset the swanadmin user...');
    await resetSwanAdmin();
  } else {
    // Method 2: Try connecting without password (trust authentication)
    console.log('\n2. Trying connection without password...');
    try {
      const { stdout } = await execAsync('psql -U postgres -h localhost -c "SELECT version();"');
      console.log('✅ Connected without password!');
      console.log('PostgreSQL is configured for trust authentication locally.');
      await resetSwanAdmin();
    } catch (error) {
      console.log('❌ Failed:', error.message);
      
      // Method 3: Windows authentication
      console.log('\n3. Checking Windows authentication...');
      try {
        const { stdout } = await execAsync('psql -h localhost -c "SELECT version();"');
        console.log('✅ Connected with Windows authentication!');
        await resetSwanAdmin();
      } catch (error2) {
        console.log('❌ Failed:', error2.message);
        
        // Method 4: Check if service is running as different user
        console.log('\n4. Checking PostgreSQL service configuration...');
        try {
          const { stdout } = await execAsync('sc qc postgresql-x64-17');
          console.log('Service configuration:');
          console.log(stdout);
          
          if (stdout.includes('SERVICE_START_NAME')) {
            console.log('\n💡 The service might be running under a different user account.');
          }
        } catch (error3) {
          console.log('❌ Cannot check service configuration');
        }
        
        // Method 5: Show manual steps
        console.log('\n5. 📋 Manual Steps to Reset PostgreSQL:\n');
        console.log('A. Stop PostgreSQL service:');
        console.log('   net stop postgresql-x64-17');
        console.log('\nB. Edit pg_hba.conf to allow trust authentication:');
        console.log('   File location: C:\\Program Files\\PostgreSQL\\17\\data\\pg_hba.conf');
        console.log('   Change all "scram-sha-256" to "trust"');
        console.log('\nC. Start PostgreSQL service:');
        console.log('   net start postgresql-x64-17');
        console.log('\nD. Connect without password:');
        console.log('   psql -U postgres');
        console.log('\nE. Reset passwords:');
        console.log('   ALTER USER postgres PASSWORD \'newpassword\';');
        console.log('   CREATE USER swanadmin WITH SUPERUSER PASSWORD \'swanadmin123\';');
        console.log('\nF. Restore pg_hba.conf security and restart service');
        
        const tryManualSteps = await question('\nWould you like me to create scripts for these manual steps? (y/n): ');
        if (tryManualSteps.toLowerCase() === 'y') {
          await createManualStepScripts();
        }
      }
    }
  }
  
  rl.close();
}

async function resetSwanAdmin() {
  console.log('\n🔄 Resetting swanadmin user...');
  
  // First, let's create the user if it doesn't exist
  const commands = [
    "DROP USER IF EXISTS swanadmin;",
    "CREATE USER swanadmin WITH SUPERUSER CREATEDB CREATEROLE LOGIN;",
    "ALTER USER swanadmin PASSWORD 'swanadmin123';",
    "CREATE DATABASE IF NOT EXISTS swanstudios OWNER swanadmin;",
    "GRANT ALL PRIVILEGES ON DATABASE swanstudios TO swanadmin;"
  ];
  
  console.log('\nExecuting commands...');
  for (const command of commands) {
    try {
      console.log(`Running: ${command}`);
      const { stdout } = await execAsync(`psql -U postgres -c "${command}"`);
      console.log('✅ Success');
      if (stdout) console.log('   Output:', stdout.trim());
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ Already exists, continuing...');
      } else {
        console.log('❌ Error:', error.message);
      }
    }
  }
  
  console.log('\n✨ Reset complete!');
  console.log('Updated credentials:');
  console.log('  User: swanadmin');
  console.log('  Password: swanadmin123');
  console.log('  Database: swanstudios');
  console.log('\n📝 Update your .env file:');
  console.log('PG_USER=swanadmin');
  console.log('PG_PASSWORD=swanadmin123');
  console.log('PG_DB=swanstudios');
  
  const updateEnv = await question('\nUpdate .env file automatically? (y/n): ');
  if (updateEnv.toLowerCase() === 'y') {
    await updateEnvFile();
  }
}

async function updateEnvFile() {
  console.log('\nUpdating .env file...');
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const envPath = path.resolve(__dirname, '../../.env');
    
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update or add the PostgreSQL settings
    envContent = envContent.replace(/PG_PASSWORD=.*/, 'PG_PASSWORD=swanadmin123');
    
    if (!envContent.includes('PG_PASSWORD=')) {
      envContent += '\nPG_PASSWORD=swanadmin123';
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file updated successfully!');
  } catch (error) {
    console.log('❌ Error updating .env file:', error.message);
    console.log('Please update manually:');
    console.log('PG_PASSWORD=swanadmin123');
  }
}

async function createManualStepScripts() {
  console.log('\nCreating manual step scripts...');
  
  // Create batch file to modify pg_hba.conf
  const modifyHbaScript = `@echo off
echo Creating backup of pg_hba.conf...
copy "C:\\Program Files\\PostgreSQL\\17\\data\\pg_hba.conf" "C:\\Program Files\\PostgreSQL\\17\\data\\pg_hba.conf.backup"

echo Modifying pg_hba.conf for trust authentication...
powershell -Command "(Get-Content 'C:\\Program Files\\PostgreSQL\\17\\data\\pg_hba.conf') -replace 'scram-sha-256', 'trust' | Set-Content 'C:\\Program Files\\PostgreSQL\\17\\data\\pg_hba.conf'"

echo Restarting PostgreSQL service...
net stop postgresql-x64-17
net start postgresql-x64-17

echo PostgreSQL is now accessible without password!
echo Run: psql -U postgres
pause`;
  
  // Create restoration script
  const restoreHbaScript = `@echo off
echo Restoring original pg_hba.conf...
copy "C:\\Program Files\\PostgreSQL\\17\\data\\pg_hba.conf.backup" "C:\\Program Files\\PostgreSQL\\17\\data\\pg_hba.conf"

echo Restarting PostgreSQL service...
net stop postgresql-x64-17
net start postgresql-x64-17

echo Security restored!
pause`;
  
  // Create SQL script for user setup
  const sqlScript = `-- Reset PostgreSQL users for SwanStudios
-- Run this with: psql -U postgres -f setup_users.sql

DROP USER IF EXISTS swanadmin;
CREATE USER swanadmin WITH SUPERUSER CREATEDB CREATEROLE LOGIN PASSWORD 'swanadmin123';
CREATE DATABASE IF NOT EXISTS swanstudios OWNER swanadmin;
GRANT ALL PRIVILEGES ON DATABASE swanstudios TO swanadmin;

-- Update postgres user password if needed
ALTER USER postgres PASSWORD 'postgres';

\\q`;
  
  const fs = await import('fs');
  
  fs.writeFileSync('modify_pg_hba.bat', modifyHbaScript);
  fs.writeFileSync('restore_pg_hba.bat', restoreHbaScript);
  fs.writeFileSync('setup_users.sql', sqlScript);
  
  console.log('✅ Created manual step scripts:');
  console.log('  1. modify_pg_hba.bat - Run as Administrator to enable trust auth');
  console.log('  2. setup_users.sql - Run after trust auth is enabled');
  console.log('  3. restore_pg_hba.bat - Run as Administrator to restore security');
  console.log('\n📋 Steps:');
  console.log('  1. Run modify_pg_hba.bat as Administrator');
  console.log('  2. Run: psql -U postgres -f setup_users.sql');
  console.log('  3. Run restore_pg_hba.bat as Administrator');
  console.log('  4. Update your .env file with new password');
}

resetPostgresCompletely().catch(console.error);