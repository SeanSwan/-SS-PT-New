// backend/scripts/verify-password.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { QueryTypes } from 'sequelize';
import readline from 'readline/promises';

// --- Environment Loading ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRootDir = path.resolve(__dirname, '..', '..'); // Go up two levels
const envPath = path.resolve(projectRootDir, '.env');

if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env file not found at ${envPath}.`);
  dotenv.config(); // Try default
}

// --- Imports (AFTER dotenv) ---
import sequelize from '../database.mjs'; // Import configured sequelize instance

// --- Main Function ---
async function verifyPassword() {
  console.log('--- Password Verification Utility ---');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  let username = '';
  let password = '';
  
  try {
    // 1. Get username
    while (!username) {
      username = await rl.question('Enter username to verify: ');
      if (!username) console.log('Username cannot be empty.');
    }
    
    // 2. Get password
    while (!password) {
      password = await rl.question(`Enter password to verify for '${username}': `);
      if (!password) console.log('Password cannot be empty.');
    }
    
    rl.close();
    
    // 3. Connect to DB
    console.log('\nConnecting to database...');
    await sequelize.authenticate(); // Test connection
    console.log('✅ Database connection successful.');
    
    // 4. Check if the users table exists
    console.log('Checking for users table...');
    const tableCheck = await sequelize.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_name = 'users'`,
      { type: QueryTypes.SELECT }
    );
    
    if (tableCheck.length === 0) {
      throw new Error('Users table does not exist!');
    }
    console.log('✅ Users table exists.');
    
    // 5. Fetch user by username
    console.log(`\nLooking for user '${username}'...`);
    const users = await sequelize.query(
      `SELECT id, username, "firstName", "lastName", email, role, password
       FROM users
       WHERE username = :username`,
      {
        replacements: { username },
        type: QueryTypes.SELECT
      }
    );
    
    if (users.length === 0) {
      throw new Error(`User '${username}' not found in the database.`);
    }
    
    const user = users[0];
    console.log(`✅ Found user: ${user.username} (${user.firstName} ${user.lastName})`);
    console.log(`   Email: ${user.email}, Role: ${user.role}, ID: ${user.id}`);
    
    // 6. Verify password
    console.log('\nVerifying password...');
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (isMatch) {
      console.log('\n✅ SUCCESS! Password is correct.');
      console.log(`The password '${password}' is valid for user '${username}'.`);
    } else {
      console.log('\n❌ FAILED! Password is incorrect.');
      console.log(`The password '${password}' does NOT match the hash in the database.`);
      
      // Show first few characters of hash for debugging
      console.log(`\nStored password hash begins with: ${user.password.substring(0, 20)}...`);
      
      // Generate a test hash for comparison
      const testSalt = await bcrypt.genSalt(10);
      const testHash = await bcrypt.hash(password, testSalt);
      console.log(`New hash of '${password}' begins with: ${testHash.substring(0, 20)}...`);
    }
    
  } catch (error) {
    rl.close(); // Ensure readline is closed on error
    console.error(`\n❌ ERROR: ${error.message}`);
    if (error.stack && process.env.NODE_ENV !== 'production') {
      console.error("\nStack Trace:");
      console.error(error.stack);
    }
    process.exitCode = 1; // Indicate failure
  } finally {
    // Always close the database connection
    await sequelize.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the function
verifyPassword();
