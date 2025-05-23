/**
 * Direct Login Test
 */

import User from '../models/User.mjs';
import jwt from 'jsonwebtoken';
import sequelize, { Op } from '../database.mjs';
import dotenv from 'dotenv';

dotenv.config();

async function testLogin() {
  try {
    console.log('🔐 Testing admin login...');
    
    // Find user
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username: 'admin' },
          { email: 'admin' }
        ]
      }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.username);
    console.log('   Role:', user.role);
    
    // Check password
    const isValid = await user.checkPassword('admin123');
    console.log('✅ Password valid:', isValid);
    
    if (!isValid) {
      console.log('❌ Password invalid');
      return;
    }
    
    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        tokenType: 'access'
      },
      process.env.JWT_SECRET,
      { expiresIn: '3h' }
    );
    
    // Decode token to verify
    const decoded = jwt.decode(token);
    console.log('✅ Token created');
    console.log('   Token role:', decoded.role);
    
    // Format response like the actual controller
    const response = {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      },
      token: token
    };
    
    console.log('\n📨 Login response:');
    console.log(JSON.stringify(response, null, 2));
    
    // Verify the role specifically
    console.log('\n🎯 Role verification:');
    console.log('   DB role:', user.role);
    console.log('   Response role:', response.user.role);
    console.log('   Token role:', decoded.role);
    console.log('   All match:', user.role === response.user.role && response.user.role === decoded.role);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

testLogin();
