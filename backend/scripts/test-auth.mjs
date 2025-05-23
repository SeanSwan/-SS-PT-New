/**
 * Test Authentication Script
 * ==========================
 * A standalone script to test authentication without the server
 * Run with: node scripts/test-auth.mjs
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

// Set up proper paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment variables
dotenv.config({ path: join(rootDir, '.env') });

// Import database and models
import sequelize from '../database.mjs';
import User from '../models/User.mjs';

// Set up constants
const TEST_USERNAME = 'admin';
const TEST_PASSWORD = '55555';

/**
 * Generate a JWT token
 */
const generateToken = (userId, role) => {
  const payload = {
    id: userId,
    role,
    tokenType: 'access',
    tokenId: uuidv4()
  };
  
  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET || 'insecure_default_jwt_secret',
    { expiresIn: '1h' }
  );
  
  return { token, payload };
};

/**
 * Run tests
 */
const runTests = async () => {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connection established successfully.');

    // Test 1: Check for the admin user
    console.log('\n--- Test 1: Find the admin user ---');
    const user = await User.findOne({ where: { username: TEST_USERNAME } });
    
    if (!user) {
      console.log(`❌ User '${TEST_USERNAME}' not found.`);
      console.log(`   Creating admin user...`);
      
      // Create admin user if not found
      const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
      const newUser = await User.create({
        id: uuidv4(),
        username: TEST_USERNAME,
        email: 'admin@example.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true
      });
      
      console.log(`✅ Admin user created with ID: ${newUser.id}`);
      console.log(`   Username: ${newUser.username}, Role: ${newUser.role}`);
    } else {
      console.log(`✅ User found: ${user.username} (ID: ${user.id})`);
      console.log(`   Role: ${user.role}, Active: ${user.isActive}`);
      
      // Display user details
      const { password, refreshTokenHash, ...userDetails } = user.toJSON();
      console.log('\nUser details:');
      console.log(JSON.stringify(userDetails, null, 2));
    }
    
    // Test 2: Try to match password
    const foundUser = await User.findOne({ where: { username: TEST_USERNAME } });
    console.log('\n--- Test 2: Verify password ---');
    
    if (foundUser) {
      const isMatch = await foundUser.checkPassword(TEST_PASSWORD);
      console.log(`Password match: ${isMatch ? '✅ Success' : '❌ Failed'}`);
      
      if (!isMatch) {
        // Update password for testing
        const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
        foundUser.password = hashedPassword;
        await foundUser.save();
        console.log(`✅ Password updated to '${TEST_PASSWORD}'`);
      }
    }
    
    // Test 3: Generate and validate token
    console.log('\n--- Test 3: Generate and validate JWT token ---');
    const foundUser2 = await User.findOne({ where: { username: TEST_USERNAME } });
    
    if (foundUser2) {
      const { token, payload } = generateToken(foundUser2.id, foundUser2.role);
      
      console.log(`Generated token for user ID: ${payload.id}`);
      console.log(`Token type: ${typeof token}`);
      console.log(`Token: ${token.substring(0, 20)}...`);
      
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'insecure_default_jwt_secret'
        );
        
        console.log('\nDecoded token:');
        console.log(JSON.stringify(decoded, null, 2));
        console.log(`✅ Token verified successfully`);
      } catch (error) {
        console.error(`❌ Token verification failed:`, error.message);
      }
    }
    
    console.log('\nTests completed.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
    console.log('\nDatabase connection closed.');
  }
};

// Run the tests
runTests();
