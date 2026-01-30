/**
 * seed-test-accounts.mjs
 * 
 * This script creates or resets test accounts for development purposes.
 * It generates an admin, trainer, and client account with consistent credentials.
 * 
 * IMPORTANT: This script should ONLY be run in development environments, never in production!
 * 
 * Usage: 
 * node scripts/seed-test-accounts.mjs
 * 
 * You can also run it with an API endpoint through: 
 * GET /api/dev/seed-test-accounts (secured with developer-only access)
 */

import bcrypt from 'bcrypt';
import User from '../models/User.mjs';
import dotenv from 'dotenv';
import sequelize, { Op } from '../database.mjs';

// Load environment variables
dotenv.config();

// Define test accounts with consistent IDs for easier tracking
const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@swanstudios.com',
    username: 'admin',
    password: 'admin123', // Will be hashed
    firstName: 'Admin',
    lastName: 'Test',
    role: 'admin',
    permissions: JSON.stringify(['manage_users', 'manage_content', 'manage_sessions', 'manage_packages', 'manage_gamification', 'view_analytics']),
    phone: '555-000-0000',
    bio: 'Test admin account with full system access',
    isActive: true
  },
  trainer: {
    email: 'trainer@swanstudios.com',
    username: 'trainer',
    password: 'trainer123', // Will be hashed
    firstName: 'Trainer',
    lastName: 'Test',
    role: 'trainer',
    permissions: JSON.stringify(['manage_sessions', 'view_clients', 'create_workouts']),
    phone: '555-000-0001',
    bio: 'Test trainer account for development',
    specialties: JSON.stringify(['Strength Training', 'Cardio', 'Nutrition']),
    hourlyRate: 150.00,
    availableDays: JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
    availableHours: JSON.stringify(['09:00-17:00']),
    isActive: true
  },
  client: {
    email: 'client@test.com',
    username: 'client',
    password: 'client123', // Will be hashed
    firstName: 'Client',
    lastName: 'Test',
    role: 'client',
    phone: '555-000-0002',
    dateOfBirth: '1990-01-01',
    gender: 'Other',
    weight: 70.0,
    height: 175.0,
    fitnessGoal: 'Testing the application',
    trainingExperience: 'Beginner',
    healthConcerns: 'None',
    emergencyContact: 'Emergency Contact',
    availableSessions: 5,
    isActive: true,
    points: 100,
    level: 2,
    tier: 'silver'
  },
  user: {
    email: 'user@test.com',
    username: 'user',
    password: 'user123', // Will be hashed
    firstName: 'User',
    lastName: 'Test',
    role: 'user',
    phone: '555-000-0003',
    bio: 'Test user account for social features',
    isActive: true
  }
};

/**
 * Main function to create or reset test accounts
 */
async function seedTestAccounts() {
  try {
    console.log('Starting test account seeding...');
    
    // Use a transaction to ensure all operations succeed or fail together
    const transaction = await sequelize.transaction();
    
    try {
      // For each test account type
      for (const [role, accountData] of Object.entries(TEST_ACCOUNTS)) {
        console.log(`Processing ${role} account...`);

        // Check if the user already exists by username OR email
        // This handles cases where user exists with same email but different username
        // Use paranoid: false to also find soft-deleted users (deletedAt is set)
        let user = await User.findOne({
          where: {
            [Op.or]: [
              { username: accountData.username },
              { email: accountData.email }
            ]
          },
          paranoid: false, // Include soft-deleted users
          transaction
        });

        // If user was soft-deleted, restore them
        if (user && user.deletedAt) {
          console.log(`  → Restoring soft-deleted ${role} account`);
          await user.restore({ transaction });
        }
        
        // Prepare user data without the password initially
        const { password, ...userDataWithoutPassword } = accountData;
        
        if (user) {
          // Update existing user
          const updateData = { ...userDataWithoutPassword };

          // Check if password needs to be reset (if corrupted or force reset requested)
          // A valid bcrypt hash starts with $2a$, $2b$, or $2y$
          const hasValidPassword = user.password && /^\$2[aby]\$\d+\$/.test(user.password);

          // Verify the password actually works (not double-hashed)
          let passwordWorks = false;
          if (hasValidPassword) {
            try {
              passwordWorks = await bcrypt.compare(password, user.password);
            } catch (e) {
              passwordWorks = false;
            }
          }

          // Reset password if it's invalid or doesn't match the expected default
          if (!hasValidPassword || !passwordWorks) {
            console.log(`  → Resetting password for ${role} (was invalid or corrupted)`);
            // Pass plain password - let model's beforeUpdate hook hash it
            updateData.password = password;
          }

          await user.update(updateData, { transaction });
          console.log(`Updated existing ${role} account`);
        } else {
          // Create new user - let the model's beforeCreate hook handle password hashing
          // DO NOT pre-hash the password here as it will be double-hashed
          user = await User.create({
            ...userDataWithoutPassword,
            password: password // Plain password - model hook will hash it
          }, { transaction });

          console.log(`Created new ${role} account`);
        }
      }
      
      // Commit the transaction
      await transaction.commit();
      console.log('Test accounts created/updated successfully!');
      
      // Print login credentials for convenience
      console.log('\n===== TEST ACCOUNT CREDENTIALS =====');
      console.log('Admin:   admin@swanstudios.com / admin123 (username: admin)');
      console.log('Trainer: trainer@swanstudios.com / trainer123 (username: trainer)');
      console.log('Client:  client@test.com / client123 (username: client)');
      console.log('User:    user@test.com / user123 (username: user)');
      console.log('====================================\n');
      
      return {
        success: true,
        message: 'Test accounts created/updated successfully'
      };
    } catch (error) {
      // Rollback the transaction on error
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error seeding test accounts:', error);
    return {
      success: false,
      message: `Failed to seed test accounts: ${error.message}`
    };
  }
}

// If this script is run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTestAccounts()
    .then(result => {
      console.log('Result:', result);
      if (result.success) {
        console.log('✅ Success! Test accounts are ready.');
        process.exit(0);
      } else {
        console.log('❌ Failed to create test accounts.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export default seedTestAccounts;
