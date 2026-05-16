/**
 * Create Test Users for DevTools
 */

import User from '../models/User.mjs';
import bcrypt from 'bcryptjs';
import sequelize from '../database.mjs';
import dotenv from 'dotenv';

dotenv.config();

async function createTestUsers() {
  console.log('🔧 Creating test users for DevTools...');
  
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Test users data
    const testUsers = [
      {
        username: 'client@test.com',
        email: 'client@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Client',
        role: 'client'
      },
      {
        username: 'trainer@test.com',
        email: 'trainer@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Trainer',
        role: 'trainer'
      }
    ];
    
    for (const userData of testUsers) {
      console.log(`\n📝 Processing user: ${userData.username}`);
      
      // Check if user already exists
      const existingUser = await User.findOne({
        where: { username: userData.username }
      });
      
      if (existingUser) {
        console.log(`⚠️  User already exists: ${userData.username}`);
        
        // Check if user has the same email
        if (existingUser.email !== userData.email) {
          console.log(`   Updating email from ${existingUser.email} to ${userData.email}`);
        }
        
        // Update password to ensure it's correct
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);
        
        await sequelize.models.User.update(
          { 
            password: hashedPassword,
            role: userData.role,
            email: userData.email,  // Update email in case it's different
            isActive: true
          },
          { 
            where: { username: userData.username },
            hooks: false
          }
        );
        
        console.log(`✅ Updated password and details for ${userData.username}`);
      } else {
        console.log(`🆕 Creating new user: ${userData.username}`);
        
        // Create new user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);
        
        await User.create({
          ...userData,
          password: hashedPassword,
          isActive: true
        }, {
          hooks: false // Skip hooks to avoid double hashing
        });
        
        console.log(`✅ Created user: ${userData.username}`);
      }
      
      // Verify the user can login
      const verifyUser = await User.findOne({
        where: { username: userData.username }
      });
      
      if (verifyUser) {
        const passwordTest = await verifyUser.checkPassword(userData.password);
        console.log(`   Password verification: ${passwordTest ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`   Role: ${verifyUser.role}`);
        console.log(`   Is Active: ${verifyUser.isActive}`);
      }
    }
    
    console.log('\n🎉 Test users created successfully!');
    console.log('\nDevTools Login Credentials:');
    console.log('- Admin: username=admin, password=admin123');
    console.log('- Trainer: username=trainer@test.com, password=password123');
    console.log('- Client: username=client@test.com, password=password123');
    
    return { success: true };
    
  } catch (error) {
    console.error('\n❌ Error creating test users:', error.message);
    console.error('Stack:', error.stack);
    return { success: false, error: error.message };
  } finally {
    await sequelize.close();
  }
}

createTestUsers();
