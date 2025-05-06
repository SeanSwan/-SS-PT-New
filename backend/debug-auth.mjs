/**
 * Debug Authentication Script
 * 
 * This script directly tests authentication functions to identify issues
 * Bypasses the Express server to isolate potential problems
 */
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import sequelize from './database.mjs';
import User from './models/User.mjs';
import Achievement from './models/Achievement.mjs';

// Load environment variables
dotenv.config();

// Admin user credentials (from .env)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'ogpswan';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Password123!';

async function debugAuth() {
  try {
    console.log('============ AUTH DEBUGGING TOOL ============');
    console.log('Starting authentication debug process...');
    
    // Test database connection
    console.log('\n1. Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    
    // Synchronize models (if needed)
    console.log('\n2. Synchronizing Achievement model...');
    await Achievement.sync({ alter: false });
    console.log('Achievement model synchronized');
    
    console.log('\n3. Synchronizing User model...');
    await User.sync({ alter: false });
    console.log('User model synchronized');
    
    // Get admin user
    console.log(`\n4. Looking for admin user "${ADMIN_USERNAME}"...`);
    const adminUser = await User.findOne({ 
      where: { 
        username: ADMIN_USERNAME,
        role: 'admin'
      } 
    });
    
    if (!adminUser) {
      console.log(`⚠️ Admin user "${ADMIN_USERNAME}" not found!`);
      console.log('Creating admin user...');
      
      // Hash password for admin
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
      
      // Create admin user
      const newAdmin = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        username: ADMIN_USERNAME,
        email: process.env.ADMIN_EMAIL || 'admin@swanstudios.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true
      });
      
      console.log(`✅ Admin user created with ID: ${newAdmin.id}`);
      console.log(`Username: ${newAdmin.username}`);
      
      // Test password check for new admin
      const passwordValid = await newAdmin.checkPassword(ADMIN_PASSWORD);
      console.log(`Password valid: ${passwordValid ? 'YES' : 'NO'}`);
      
      return;
    }
    
    console.log('✅ Admin user found!');
    console.log(`ID: ${adminUser.id}`);
    console.log(`Username: ${adminUser.username}`);
    console.log(`Created: ${adminUser.createdAt}`);
    console.log(`Is active: ${adminUser.isActive ? 'YES' : 'NO'}`);
    console.log(`Last login: ${adminUser.lastLogin || 'Never'}`);
    
    // Test password validation
    console.log(`\n5. Testing password validation for "${ADMIN_USERNAME}"...`);
    console.log(`Plain password: "${ADMIN_PASSWORD}"`);
    console.log(`Stored hashed password: "${adminUser.password.substring(0, 20)}..."`);
    
    try {
      const isMatch = await adminUser.checkPassword(ADMIN_PASSWORD);
      console.log(`Password valid: ${isMatch ? 'YES' : 'NO'}`);
      
      if (!isMatch) {
        console.log('⚠️ Password validation failed!');
        console.log('Fixing password...');
        
        // Fix password
        const salt = await bcrypt.genSalt(10);
        const newHashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
        
        // Update user with new password
        adminUser.password = newHashedPassword;
        await adminUser.save();
        
        console.log('✅ Password updated successfully!');
        
        // Verify the new password
        const newIsMatch = await adminUser.checkPassword(ADMIN_PASSWORD);
        console.log(`Updated password valid: ${newIsMatch ? 'YES' : 'NO'}`);
      }
    } catch (error) {
      console.error('Error during password validation:', error.message);
      console.error(error.stack);
    }
    
    console.log('\n6. Testing direct bcrypt comparison...');
    try {
      const directCompare = await bcrypt.compare(ADMIN_PASSWORD, adminUser.password);
      console.log(`Direct bcrypt comparison: ${directCompare ? 'SUCCESS' : 'FAILED'}`);
      
      if (!directCompare) {
        console.log('Creating new hash directly with bcrypt...');
        const salt = await bcrypt.genSalt(10);
        const directHash = await bcrypt.hash(ADMIN_PASSWORD, salt);
        console.log(`New bcrypt hash: ${directHash.substring(0, 20)}...`);
        
        // Update user with this direct hash
        await User.update(
          { password: directHash },
          { 
            where: { id: adminUser.id },
            individualHooks: false // Skip hooks to avoid double hashing
          }
        );
        
        console.log('Password updated with direct hash!');
      }
    } catch (error) {
      console.error('Error during direct bcrypt comparison:', error.message);
    }
    
    console.log('\n============ DEBUG COMPLETE ============');
    console.log('Try logging in with:');
    console.log(`Username: ${ADMIN_USERNAME}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    
  } catch (error) {
    console.error('Debug error:', error);
    console.error(error.stack);
  } finally {
    // Close database connection
    await sequelize.close();
  }
}

// Run the debug function
debugAuth();
