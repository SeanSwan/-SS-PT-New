/**
 * Create Admin User Based on Environment Variables
 */

import User from '../models/User.mjs';
import bcrypt from 'bcryptjs';
import sequelize from '../database.mjs';
import dotenv from 'dotenv';

dotenv.config();

async function createAdminFromEnv() {
  console.log('🔧 Creating admin user from environment variables...');
  
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Get admin credentials from environment
    const adminData = {
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      email: process.env.ADMIN_EMAIL || 'admin@swanstudios.com',
      firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
      lastName: process.env.ADMIN_LAST_NAME || 'User'
    };
    
    console.log('\nAdmin credentials from .env:');
    console.log(`   Username: ${adminData.username}`);
    console.log(`   Email: ${adminData.email}`);
    console.log(`   Password: ${adminData.password ? '***' : 'NOT SET'}`);
    console.log(`   First Name: ${adminData.firstName}`);
    console.log(`   Last Name: ${adminData.lastName}`);
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({
      where: { username: adminData.username }
    });
    
    if (existingAdmin) {
      console.log(`\n⚠️  Admin user already exists with username: ${adminData.username}`);
      console.log('Updating password...');
      
      // Update password directly without hooks
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminData.password, salt);
      
      await sequelize.models.User.update(
        { 
          password: hashedPassword,
          role: 'admin',
          email: adminData.email,
          firstName: adminData.firstName,
          lastName: adminData.lastName,
          isActive: true
        },
        { 
          where: { username: adminData.username },
          hooks: false
        }
      );
      
      console.log('✅ Admin password updated successfully');
    } else {
      console.log('\n🆕 Creating new admin user...');
      
      // Create admin user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminData.password, salt);
      
      await User.create({
        username: adminData.username,
        email: adminData.email,
        password: hashedPassword,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        role: 'admin',
        isActive: true
      }, {
        hooks: false // Skip hooks to avoid double hashing
      });
      
      console.log('✅ Admin user created successfully');
    }
    
    // Verify the admin user
    console.log('\n🔍 Verifying admin user...');
    const verifyAdmin = await User.findOne({
      where: { username: adminData.username }
    });
    
    if (verifyAdmin) {
      const passwordTest = await verifyAdmin.checkPassword(adminData.password);
      console.log(`   Password verification: ${passwordTest ? '✅ SUCCESS' : '❌ FAILED'}`);
      console.log(`   Role: ${verifyAdmin.role}`);
      console.log(`   Is Active: ${verifyAdmin.isActive}`);
      
      if (passwordTest) {
        console.log(`\n🎉 SUCCESS! Admin login credentials:`);
        console.log(`   Username: ${adminData.username}`);
        console.log(`   Password: ${adminData.password}`);
      } else {
        console.log('\n❌ Password verification failed. There may be an issue with the User model.');
      }
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('\n❌ Error creating admin:', error.message);
    console.error('Stack:', error.stack);
    return { success: false, error: error.message };
  } finally {
    await sequelize.close();
  }
}

createAdminFromEnv();
