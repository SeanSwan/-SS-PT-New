/**
 * Test Admin Login Script
 * =======================
 * Simulates the login process to test if admin login returns correct role
 */

import User from '../models/User.mjs';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.mjs';
import sequelize, { Op } from '../database.mjs';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Simulate the login process
 */
async function testAdminLogin() {
  try {
    console.log('🔑 Testing admin login process...');
    
    const username = 'admin';
    const password = 'admin123';
    
    console.log(`\n1️⃣ Finding user with username: ${username}`);
    
    // Find the user (same logic as in authController)
    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { username },
          { email: username }
        ]
      }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return { success: false, error: 'User not found' };
    }
    
    console.log('✅ User found');
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    
    console.log(`\n2️⃣ Checking password...`);
    
    // Check password (same logic as in authController)
    const isMatch = await user.checkPassword(password);
    
    if (!isMatch) {
      console.log('❌ Password does not match');
      return { success: false, error: 'Invalid password' };
    }
    
    console.log('✅ Password matches');
    
    console.log(`\n3️⃣ Generating JWT token...`);
    
    // Generate access token (same logic as in authController)
    const generateAccessToken = (id, role) => {
      return jwt.sign(
        { 
          id,
          role,
          tokenType: 'access'
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: process.env.JWT_EXPIRES_IN || '3h' }
      );
    };
    
    const accessToken = generateAccessToken(user.id, user.role);
    console.log('✅ Token generated');
    
    // Decode the token to verify its contents
    const decoded = jwt.decode(accessToken);
    console.log(`\n4️⃣ Token contents:`);
    console.log(`   ID: ${decoded.id}`);
    console.log(`   Role: ${decoded.role}`);
    console.log(`   Token Type: ${decoded.tokenType}`);
    
    console.log(`\n5️⃣ Sanitizing user object...`);
    
    // Sanitize user (same logic as in authController)
    const sanitizeUser = (user) => {
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        role: user.role,
        photo: user.photo,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    };
    
    const sanitizedUser = sanitizeUser(user);
    console.log('✅ User sanitized');
    console.log('   Sanitized role:', sanitizedUser.role);
    
    console.log(`\n6️⃣ Final response object:`);
    const response = {
      success: true,
      user: sanitizedUser,
      token: accessToken
    };
    
    console.log(JSON.stringify(response, null, 2));
    
    return {
      success: true,
      response,
      tokenDecoded: decoded,
      rawUser: user.dataValues
    };
    
  } catch (error) {
    console.error('❌ Error during login test:', error);
    logger.error('Login test failed:', { error: error.message, stack: error.stack });
    return {
      success: false,
      error: error.message
    };
  }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAdminLogin()
    .then(result => {
      console.log('\n📋 TEST RESULT:', result.success ? '✅ SUCCESS' : '❌ FAILED');
      if (!result.success) {
        console.log('Error:', result.error);
      } else {
        console.log('\n🎯 Key findings:');
        console.log(`- User role in DB: ${result.rawUser.role}`);
        console.log(`- Role in JWT token: ${result.tokenDecoded.role}`);
        console.log(`- Role in response: ${result.response.user.role}`);
        console.log(`- All roles match: ${result.rawUser.role === result.tokenDecoded.role && result.tokenDecoded.role === result.response.user.role}`);
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Script execution failed:', error);
      process.exit(1);
    })
    .finally(() => {
      sequelize.close();
    });
}

export default testAdminLogin;
