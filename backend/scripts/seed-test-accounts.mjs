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
import { User, Profile, ClientProfile, TrainerProfile } from '../models/index.mjs';
import dotenv from 'dotenv';
import { sequelize } from '../database.mjs';

// Load environment variables
dotenv.config();

// Define test accounts with consistent IDs for easier tracking
const TEST_ACCOUNTS = {
  admin: {
    id: 'admin-test-id',
    email: 'admin@swanstudios.com',
    password: 'admin123', // Will be hashed
    name: 'Admin Test',
    role: 'admin',
    permissions: ['manage_users', 'manage_content', 'manage_sessions', 'manage_packages', 'manage_gamification', 'view_analytics'],
    profile: {
      phone: '555-000-0000',
      bio: 'Test admin account with full system access',
      location: 'SwanStudios HQ'
    }
  },
  trainer: {
    id: 'trainer-test-id',
    email: 'trainer@swanstudios.com',
    password: 'trainer123', // Will be hashed
    name: 'Trainer Test',
    role: 'trainer',
    permissions: ['manage_sessions', 'view_clients', 'create_workouts'],
    profile: {
      phone: '555-000-0001',
      bio: 'Test trainer account for development',
      location: 'SwanStudios Gym',
      specialties: ['Strength Training', 'Cardio', 'Nutrition']
    }
  },
  client: {
    id: 'client-test-id',
    email: 'client@test.com',
    password: 'client123', // Will be hashed
    name: 'Client Test',
    role: 'client',
    permissions: ['access_workouts', 'access_store'],
    profile: {
      phone: '555-000-0002',
      bio: 'Test client account for development',
      emergency_contact: 'Emergency Contact',
      emergency_phone: '555-999-9999',
      membership: 'premium',
      health_info: {
        height: 175,
        weight: 70,
        medical_conditions: 'None',
        fitness_goals: 'Testing the application'
      }
    }
  },
  user: {
    id: 'user-test-id',
    email: 'user@test.com',
    password: 'user123', // Will be hashed
    name: 'User Test',
    role: 'user',
    permissions: ['access_social', 'create_posts'],
    profile: {
      phone: '555-000-0003',
      bio: 'Test user account for social features',
      location: 'Internet'
    }
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
        
        // Check if the user already exists
        let user = await User.findOne({ 
          where: { 
            id: accountData.id 
          },
          transaction
        });
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(accountData.password, 10);
        
        if (user) {
          // Update existing user
          await user.update({
            email: accountData.email,
            password: hashedPassword,
            name: accountData.name,
            role: accountData.role,
            permissions: accountData.permissions
          }, { transaction });
          
          console.log(`Updated existing ${role} account`);
        } else {
          // Create new user
          user = await User.create({
            id: accountData.id,
            email: accountData.email,
            password: hashedPassword,
            name: accountData.name,
            role: accountData.role,
            permissions: accountData.permissions
          }, { transaction });
          
          console.log(`Created new ${role} account`);
        }
        
        // Handle profile data based on role
        if (role === 'admin' || role === 'trainer') {
          // Find or create general profile
          let profile = await Profile.findOne({ 
            where: { userId: user.id },
            transaction
          });
          
          if (profile) {
            await profile.update({
              phone: accountData.profile.phone,
              bio: accountData.profile.bio,
              location: accountData.profile.location
            }, { transaction });
          } else {
            await Profile.create({
              userId: user.id,
              phone: accountData.profile.phone,
              bio: accountData.profile.bio,
              location: accountData.profile.location
            }, { transaction });
          }
          
          // If trainer, add trainer-specific profile
          if (role === 'trainer') {
            let trainerProfile = await TrainerProfile.findOne({
              where: { userId: user.id },
              transaction
            });
            
            if (trainerProfile) {
              await trainerProfile.update({
                specialties: accountData.profile.specialties
              }, { transaction });
            } else {
              await TrainerProfile.create({
                userId: user.id,
                specialties: accountData.profile.specialties
              }, { transaction });
            }
          }
        } else if (role === 'client') {
          // Handle client profile
          let clientProfile = await ClientProfile.findOne({
            where: { userId: user.id },
            transaction
          });
          
          if (clientProfile) {
            await clientProfile.update({
              phone: accountData.profile.phone,
              bio: accountData.profile.bio,
              emergency_contact: accountData.profile.emergency_contact,
              emergency_phone: accountData.profile.emergency_phone,
              membership: accountData.profile.membership,
              health_info: accountData.profile.health_info
            }, { transaction });
          } else {
            await ClientProfile.create({
              userId: user.id,
              phone: accountData.profile.phone,
              bio: accountData.profile.bio,
              emergency_contact: accountData.profile.emergency_contact,
              emergency_phone: accountData.profile.emergency_phone,
              membership: accountData.profile.membership,
              health_info: accountData.profile.health_info
            }, { transaction });
          }
        }
      }
      
      // Commit the transaction
      await transaction.commit();
      console.log('Test accounts created/updated successfully!');
      
      // Print login credentials for convenience
      console.log('\n===== TEST ACCOUNT CREDENTIALS =====');
      console.log('Admin:   admin@swanstudios.com / admin123');
      console.log('Trainer: trainer@swanstudios.com / trainer123');
      console.log('Client:  client@test.com / client123');
      console.log('User:    user@test.com / user123');
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
if (process.argv[1] === import.meta.url) {
  seedTestAccounts()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export default seedTestAccounts;