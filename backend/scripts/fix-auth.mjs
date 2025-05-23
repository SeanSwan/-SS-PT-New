/**
 * Authentication Repair Script
 * This script fixes authentication issues by:
 * 1. Creating the Achievement model required by User model
 * 2. Ensuring the admin user exists with the correct credentials
 * 3. Fixing any password hashing issues
 */
import sequelize from '../database.mjs';
import User from '../models/User.mjs';
import Achievement from '../models/Achievement.mjs';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import logger from '../utils/logger.mjs';

// Load environment variables
dotenv.config();

// Admin user credentials from environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'ogpswan';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Password123!';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@swanstudios.com';
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'Sean';
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || 'Swan';

async function fixAuthentication() {
  console.log('🔧 AUTH REPAIR TOOL 🔧');
  console.log('==============================================');
  
  try {
    // Test database connection
    console.log('\n1. Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    
    // Step 1: Create Achievements table first
    console.log('\n2. Creating Achievements table...');
    try {
      await Achievement.sync({ alter: true });
      console.log('✅ Achievements table created/updated successfully!');
      
      // Create a default achievement
      const defaultAchievement = await Achievement.findOrCreate({
        where: { name: 'New Member' },
        defaults: {
          description: 'Welcome to the platform!',
          category: 'onboarding',
          requiredPoints: 0,
          iconUrl: '/images/badges/new-member.png',
          isActive: true
        }
      });
      console.log(`✅ Default achievement ID: ${defaultAchievement[0].id}`);
    } catch (error) {
      console.error('❌ Error creating Achievements table:', error.message);
      throw error;
    }
    
    // Step 2: Sync User table with the foreign key reference
    console.log('\n3. Synchronizing User table...');
    try {
      await User.sync({ alter: true });
      console.log('✅ User table synchronized successfully!');
    } catch (error) {
      console.error('❌ Error synchronizing User table:', error.message);
      throw error;
    }
    
    // Step 3: Find or create admin user
    console.log(`\n4. Checking for admin user (${ADMIN_USERNAME})...`);
    let adminUser = await User.findOne({
      where: {
        username: ADMIN_USERNAME,
        role: 'admin'
      }
    });
    
    if (adminUser) {
      console.log('✅ Admin user found!');
      console.log(`   ID: ${adminUser.id}`);
      console.log(`   Username: ${adminUser.username}`);
      console.log(`   Created: ${adminUser.createdAt}`);
      
      // Step 4: Test password validation
      console.log('\n5. Testing password validation...');
      try {
        const isMatch = await adminUser.checkPassword(ADMIN_PASSWORD);
        console.log(`   Current password valid: ${isMatch ? 'YES ✅' : 'NO ❌'}`);
        
        if (!isMatch) {
          console.log('   Attempting to fix admin password...');
          
          // Try direct bcrypt comparison for debugging
          try {
            const directMatch = await bcrypt.compare(ADMIN_PASSWORD, adminUser.password);
            console.log(`   Direct bcrypt match: ${directMatch ? 'YES ✅' : 'NO ❌'}`);
          } catch (err) {
            console.error('   Error in direct bcrypt comparison:', err.message);
          }
          
          // Fix password using direct hash (bypass model hooks)
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
          
          // Use direct update to avoid hooks that might double-hash
          await User.update(
            { password: hashedPassword },
            { 
              where: { id: adminUser.id },
              individualHooks: false // Skip hooks
            }
          );
          
          console.log('✅ Admin password updated successfully!');
          
          // Verify the password fix
          adminUser = await User.findByPk(adminUser.id);
          const newIsMatch = await bcrypt.compare(ADMIN_PASSWORD, adminUser.password);
          console.log(`   New password valid: ${newIsMatch ? 'YES ✅' : 'NO ❌'}`);
        }
      } catch (error) {
        console.error('❌ Error during password validation:', error.message);
        throw error;
      }
    } else {
      console.log('⚠️ Admin user not found. Creating new admin user...');
      
      // Create admin user with pre-hashed password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
      
      try {
        adminUser = await User.create({
          firstName: ADMIN_FIRST_NAME,
          lastName: ADMIN_LAST_NAME,
          username: ADMIN_USERNAME,
          email: ADMIN_EMAIL,
          password: hashedPassword, // Already hashed
          role: 'admin',
          isActive: true
        }, { hooks: false }); // Skip hooks to prevent double hashing
        
        console.log('✅ Admin user created successfully!');
        console.log(`   ID: ${adminUser.id}`);
        console.log(`   Username: ${adminUser.username}`);
        
        // Verify the new admin password
        const isMatch = await bcrypt.compare(ADMIN_PASSWORD, adminUser.password);
        console.log(`   Password valid: ${isMatch ? 'YES ✅' : 'NO ❌'}`);
      } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        throw error;
      }
    }
    
    // Verification step
    console.log('\n6. Final verification...');
    const verifiedAdmin = await User.findOne({
      where: {
        username: ADMIN_USERNAME,
        role: 'admin'
      }
    });
    
    if (!verifiedAdmin) {
      throw new Error('Could not verify admin user after fixes!');
    }
    
    const finalPasswordCheck = await bcrypt.compare(ADMIN_PASSWORD, verifiedAdmin.password);
    if (!finalPasswordCheck) {
      console.warn('⚠️ WARNING: Password still not validating correctly!');
    } else {
      console.log('✅ Admin user verified with correct password!');
    }
    
    console.log('\n==============================================');
    console.log('🎉 AUTH REPAIR COMPLETED SUCCESSFULLY! 🎉');
    console.log('==============================================');
    console.log('\nYou can now login with:');
    console.log(`Username: ${ADMIN_USERNAME}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log('==============================================');
    
  } catch (error) {
    console.error('\n❌ ERROR DURING AUTH REPAIR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await sequelize.close();
  }
}

// Run the repair tool
fixAuthentication();
