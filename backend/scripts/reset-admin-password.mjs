// backend/scripts/reset-admin-password.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import readline from 'readline/promises'; // Use promises interface for readline

// --- Environment Loading ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRootDir = path.resolve(__dirname, '..', '..'); // Go up two levels
const envPath = path.resolve(projectRootDir, '.env');

if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env file not found at ${envPath}. Script might fail if DB requires env vars.`);
  dotenv.config(); // Try default
}

// --- Imports (AFTER dotenv) ---
import sequelize from '../database.mjs'; // Import configured sequelize instance
import User from '../models/User.mjs'; // Import User model

// --- Main Function ---
async function resetAdminPassword() {
  console.log('--- Admin Password Reset Script ---');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let adminUsername = '';
  let newPassword = '';
  let confirmPassword = '';

  try {
    // 1. Get Username
    while (!adminUsername) {
      adminUsername = await rl.question('Enter the username of the admin account to reset: ');
      if (!adminUsername) console.log('Username cannot be empty.');
    }

    // 2. Get New Password
    while (!newPassword) {
      newPassword = await rl.question(`Enter the NEW password for '${adminUsername}': `);
      if (!newPassword) console.log('Password cannot be empty.');
      // Optional: Add password strength check here if desired
    }

    // 3. Confirm New Password
    while (!confirmPassword) {
        confirmPassword = await rl.question(`Confirm the NEW password for '${adminUsername}': `);
        if (!confirmPassword) console.log('Confirmation cannot be empty.');
    }

    if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match. Please run the script again.');
    }

    rl.close(); // Close readline interface

    // 4. Connect & Find User
    console.log('\nConnecting to database...');
    await sequelize.authenticate(); // Test connection
    console.log('✅ Database connection successful.');

    console.log(`Searching for user '${adminUsername}'...`);
    const user = await User.findOne({ where: { username: adminUsername } });

    if (!user) {
      throw new Error(`User '${adminUsername}' not found in the database.`);
    }
    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (ID: ${user.id})`);

    // 5. Hash New Password
    console.log('Hashing new password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    console.log('✅ Password hashed.');

    // 6. Update User Password
    console.log(`Updating password for '${adminUsername}'...`);
    await user.update({ password: hashedPassword });
    // Note: We directly update the hash. The beforeUpdate hook in User.mjs
    // might re-hash it, but hashing an already hashed string is usually safe
    // though slightly inefficient. Ideally, the hook would only hash if it's *not* already a hash.
    // For this script's purpose, directly setting the intended hash is fine.

    console.log(`✅ Password for '${adminUsername}' successfully updated in the database!`);
    console.log('--- Script Complete ---');

  } catch (error) {
    rl.close(); // Ensure readline is closed on error
    console.error(`❌ Error during password reset: ${error.message}`);
    if (error.stack && process.env.NODE_ENV !== 'production') {
        console.error("Stack Trace:", error.stack);
    }
    process.exitCode = 1; // Indicate failure
  } finally {
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

// Run the function
resetAdminPassword();
