// backend/scripts/setup-postgres.mjs
import { exec } from 'child_process';
import { promisify } from 'util';
import readline from 'readline';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
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

async function setupPostgres() {
  console.log('🛠️  PostgreSQL Setup for SwanStudios\n');
  
  const dbName = process.env.PG_DB || 'swanstudios';
  const dbUser = process.env.PG_USER || 'swanadmin';
  const dbPassword = process.env.PG_PASSWORD;
  
  if (!dbPassword) {
    console.log('❌ No password found in .env file');
    console.log('Please add PG_PASSWORD=your_password to your .env file');
    process.exit(1);
  }
  
  console.log(`Database: ${dbName}`);
  console.log(`User: ${dbUser}`);
  console.log(`Password: ${dbPassword ? '***SET***' : 'NOT SET'}\n`);
  
  const proceed = await question('Do you want to proceed with PostgreSQL setup? (y/n): ');
  if (proceed.toLowerCase() !== 'y') {
    console.log('Setup cancelled');
    process.exit(0);
  }
  
  console.log('\n🔄 Starting PostgreSQL setup...\n');
  
  try {
    // Step 1: Create the user if it doesn't exist
    console.log('1. Creating PostgreSQL user...');
    try {
      await execAsync(`psql -U postgres -c "CREATE USER ${dbUser} WITH SUPERUSER CREATEDB CREATEROLE LOGIN;"`);
      console.log('✅ User created successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ User already exists');
      } else {
        console.log('⚠️ Error creating user:', error.message);
      }
    }
    
    // Step 2: Set the password
    console.log('\n2. Setting user password...');
    try {
      await execAsync(`psql -U postgres -c "ALTER USER ${dbUser} PASSWORD '${dbPassword}';"`);
      console.log('✅ Password set successfully');
    } catch (error) {
      console.log('❌ Error setting password:', error.message);
    }
    
    // Step 3: Create the database
    console.log('\n3. Creating database...');
    try {
      await execAsync(`createdb -U postgres -O ${dbUser} ${dbName}`);
      console.log('✅ Database created successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Database already exists');
      } else {
        console.log('⚠️ Error creating database:', error.message);
      }
    }
    
    // Step 4: Grant privileges
    console.log('\n4. Granting privileges...');
    try {
      await execAsync(`psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser};"`);
      console.log('✅ Privileges granted successfully');
    } catch (error) {
      console.log('⚠️ Error granting privileges:', error.message);
    }
    
    // Step 5: Test connection
    console.log('\n5. Testing connection...');
    try {
      await execAsync(`psql -h localhost -p 5432 -U ${dbUser} -d ${dbName} -c "SELECT version();"`);
      console.log('✅ Connection test successful!');
    } catch (error) {
      console.log('❌ Connection test failed:', error.message);
      console.log('\n🔧 Potential solutions:');
      console.log('1. Check if PostgreSQL is running');
      console.log('2. Verify pg_hba.conf allows local connections');
      console.log('3. Restart PostgreSQL service');
    }
    
    console.log('\n🎉 PostgreSQL setup completed!');
    console.log('You can now run your application.');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n📝 Manual Setup Instructions:');
    console.log('1. Start PostgreSQL as admin/postgres user');
    console.log(`2. Run: createuser -s ${dbUser}`);
    console.log(`3. Run: createdb -O ${dbUser} ${dbName}`);
    console.log(`4. Connect to PostgreSQL and set password: ALTER USER ${dbUser} PASSWORD '${dbPassword}';`);
  } finally {
    rl.close();
  }
}

setupPostgres().catch(console.error);