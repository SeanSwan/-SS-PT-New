#!/usr/bin/env node
/**
 * DEV-ONLY Test Data Seeder for SwanStudios
 * ==========================================
 *
 * This script seeds test data for development and testing purposes.
 *
 * SECURITY: This script will REFUSE to run in production.
 *
 * Creates:
 * - Test users (admin, trainer, clients with/without credits)
 * - Phase 6 accurate packages
 * - Sample sessions (past and future)
 * - Client-trainer assignments
 *
 * Usage: node backend/scripts/dev-test-seeder.mjs
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import bcrypt from 'bcrypt';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ============================================================================
// CRITICAL SAFETY CHECK - REFUSE TO RUN IN PRODUCTION
// ============================================================================
const isProduction = process.env.NODE_ENV === 'production';
const hasProductionDb = process.env.DATABASE_URL &&
  (process.env.DATABASE_URL.includes('render.com') ||
   process.env.DATABASE_URL.includes('amazonaws') ||
   process.env.DATABASE_URL.includes('heroku'));

if (isProduction || hasProductionDb) {
  console.error('\n');
  console.error('========================================');
  console.error('   SECURITY BLOCK: PRODUCTION DETECTED');
  console.error('========================================');
  console.error('This script is DEV-ONLY and cannot run in production.');
  console.error(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.error(`DATABASE_URL detected: ${hasProductionDb ? 'YES (blocked)' : 'No'}`);
  console.error('');
  console.error('If you need to seed production, use the approved');
  console.error('production seeder with proper safeguards.');
  console.error('========================================\n');
  process.exit(1);
}

console.log('\n');
console.log('=========================================');
console.log('  SwanStudios DEV Test Data Seeder');
console.log('=========================================');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('Mode: DEV-ONLY (Safe for testing)');
console.log('');

// ============================================================================
// AUTHORITATIVE PACKAGE DATA (Production Seeder is Source of Truth)
// ============================================================================
// Source: backend/render-production-seeder.mjs
// Business Model: Fixed sessions only, NO unlimited packages
// Discounts = Bonus Sessions (2-7 extra depending on tier)
const SWANSTUDIOS_PACKAGES = [
  {
    name: 'SwanStudios 10-Pack',
    description: '10 personal training sessions (60 min each). Valid for 16 months. +2 bonus sessions included.',
    packageType: 'fixed',
    price: 1750.00,          // $1,750 total
    sessions: 10,
    totalSessions: 10,
    pricePerSession: 175.00, // $175/session
    months: 16,
    isActive: true,
    displayOrder: 1
  },
  {
    name: 'SwanStudios 24-Pack',
    description: '24 personal training sessions (60 min each). Valid for 16 months. +3 bonus sessions included.',
    packageType: 'fixed',
    price: 4200.00,          // $4,200 total
    sessions: 24,
    totalSessions: 24,
    pricePerSession: 175.00, // $175/session
    months: 16,
    isActive: true,
    displayOrder: 2
  },
  {
    name: 'SwanStudios 6 Month',
    description: '108 personal training sessions. Valid for 16 months. +5 bonus sessions included.',
    packageType: 'fixed',
    price: 18900.00,         // $18,900 total
    sessions: 108,
    totalSessions: 108,
    pricePerSession: 175.00, // $175/session
    months: 16,
    isActive: true,
    displayOrder: 3
  },
  {
    name: 'SwanStudios 12 Month',
    description: '208 personal training sessions. Valid for 16 months. +7 bonus sessions included.',
    packageType: 'fixed',
    price: 36400.00,         // $36,400 total
    sessions: 208,
    totalSessions: 208,
    pricePerSession: 175.00, // $175/session
    months: 16,
    isActive: true,
    displayOrder: 4
  },
  {
    name: 'SwanStudios Express',
    description: '10 quick sessions (30 min each). Valid for 16 months. +2 bonus sessions included.',
    packageType: 'fixed',
    price: 1100.00,          // $1,100 total
    sessions: 10,
    totalSessions: 10,
    pricePerSession: 110.00, // $110/session (30 min sessions)
    months: 16,
    isActive: true,
    displayOrder: 5
  }
];

// ============================================================================
// TEST USER DATA
// ============================================================================
const TEST_USERS = {
  admin: {
    email: 'admin@swanstudios.dev',
    username: 'admin_dev',
    password: 'AdminTest123!',
    firstName: 'Dev',
    lastName: 'Admin',
    role: 'admin',
    isActive: true,
    phone: '555-000-0001'
  },
  trainer: {
    email: 'trainer@swanstudios.dev',
    username: 'trainer_dev',
    password: 'TrainerTest123!',
    firstName: 'Dev',
    lastName: 'Trainer',
    role: 'trainer',
    isActive: true,
    phone: '555-000-0002',
    specialties: JSON.stringify(['Strength Training', 'HIIT', 'Flexibility'])
  },
  clientWithCredits: {
    email: 'client-paid@test.dev',
    username: 'client_paid_dev',
    password: 'ClientTest123!',
    firstName: 'Paid',
    lastName: 'Client',
    role: 'client',
    isActive: true,
    phone: '555-000-0003',
    availableSessions: 10  // Has credits
  },
  clientNoCredits: {
    email: 'client-free@test.dev',
    username: 'client_free_dev',
    password: 'ClientTest123!',
    firstName: 'Free',
    lastName: 'Client',
    role: 'client',
    isActive: true,
    phone: '555-000-0004',
    availableSessions: 0   // No credits
  }
};

// ============================================================================
// MAIN SEEDER FUNCTION
// ============================================================================
async function runDevSeeder() {
  try {
    // Dynamic imports
    const { default: sequelize } = await import('../database.mjs');
    const { default: User } = await import('../models/User.mjs');
    const { default: StorefrontItem } = await import('../models/StorefrontItem.mjs');
    const { default: Session } = await import('../models/Session.mjs');

    // Try to import ClientTrainerAssignment
    let ClientTrainerAssignment;
    try {
      const module = await import('../models/ClientTrainerAssignment.mjs');
      ClientTrainerAssignment = module.default;
    } catch (e) {
      console.log('Note: ClientTrainerAssignment model not found, skipping assignments');
    }

    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection successful\n');

    const results = {
      users: { created: 0, updated: 0 },
      packages: { created: 0, updated: 0 },
      sessions: { created: 0 },
      assignments: { created: 0 }
    };

    // ========================================================================
    // SEED USERS
    // ========================================================================
    console.log('--- Seeding Test Users ---');

    const createdUsers = {};

    for (const [key, userData] of Object.entries(TEST_USERS)) {
      const { password, ...userDataWithoutPassword } = userData;

      // Check if user exists
      let user = await User.findOne({
        where: { email: userData.email },
        paranoid: false  // Include soft-deleted
      });

      if (user) {
        // Restore if soft-deleted
        if (user.deletedAt) {
          await user.restore();
        }
        // Update existing user
        await user.update(userDataWithoutPassword);
        results.users.updated++;
        console.log(`  Updated: ${userData.email} (${userData.role})`);
      } else {
        // Create new user - let model hook hash password
        user = await User.create({
          ...userDataWithoutPassword,
          password: password
        });
        results.users.created++;
        console.log(`  Created: ${userData.email} (${userData.role})`);
      }

      createdUsers[key] = user;
    }

    // ========================================================================
    // SEED PHASE 6 PACKAGES
    // ========================================================================
    console.log('\n--- Seeding Phase 6 Packages ---');

    // Check if packages exist
    const existingCount = await StorefrontItem.count();

    if (existingCount > 0) {
      console.log(`  Found ${existingCount} existing packages`);
      console.log('  Updating to match Phase 6 specifications...');

      // Deactivate all existing packages first
      await StorefrontItem.update(
        { isActive: false },
        { where: {} }
      );

      // Upsert Phase 6 packages
      for (const pkgData of SWANSTUDIOS_PACKAGES) {
        const [pkg, created] = await StorefrontItem.upsert(pkgData, {
          returning: true
        });

        if (created) {
          results.packages.created++;
          console.log(`  Created: ${pkgData.name} - $${pkgData.price}`);
        } else {
          results.packages.updated++;
          console.log(`  Updated: ${pkgData.name} - $${pkgData.price}`);
        }
      }
    } else {
      // Create fresh
      for (const pkgData of SWANSTUDIOS_PACKAGES) {
        await StorefrontItem.create(pkgData);
        results.packages.created++;
        console.log(`  Created: ${pkgData.name} - $${pkgData.price}`);
      }
    }

    // ========================================================================
    // SEED SAMPLE SESSIONS
    // ========================================================================
    console.log('\n--- Seeding Sample Sessions ---');

    const trainer = createdUsers.trainer;
    const clientPaid = createdUsers.clientWithCredits;

    if (trainer && clientPaid) {
      const now = new Date();

      // Future sessions (bookable)
      const futureSessionsData = [
        {
          clientId: clientPaid.id,
          trainerId: trainer.id,
          startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
          endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
          status: 'scheduled',
          sessionDeducted: true,
          notes: 'Dev test session - tomorrow'
        },
        {
          clientId: clientPaid.id,
          trainerId: trainer.id,
          startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days
          endTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
          status: 'scheduled',
          sessionDeducted: true,
          notes: 'Dev test session - 3 days out'
        }
      ];

      // Past sessions (completed)
      const pastSessionsData = [
        {
          clientId: clientPaid.id,
          trainerId: trainer.id,
          startTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
          endTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
          status: 'completed',
          sessionDeducted: true,
          notes: 'Dev test session - completed last week'
        },
        {
          clientId: clientPaid.id,
          trainerId: trainer.id,
          startTime: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
          endTime: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
          status: 'completed',
          sessionDeducted: true,
          notes: 'Dev test session - completed 2 weeks ago'
        }
      ];

      // Cancelled session
      const cancelledSessionData = {
        clientId: clientPaid.id,
        trainerId: trainer.id,
        startTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        endTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        status: 'cancelled',
        sessionDeducted: false,
        cancelReason: 'Client requested cancellation (test data)',
        cancellationDecision: 'refunded'
      };

      const allSessionsData = [...futureSessionsData, ...pastSessionsData, cancelledSessionData];

      for (const sessionData of allSessionsData) {
        try {
          await Session.create(sessionData);
          results.sessions.created++;
          console.log(`  Created: ${sessionData.status} session (${sessionData.startTime.toDateString()})`);
        } catch (err) {
          console.log(`  Skipped: Session may already exist - ${err.message}`);
        }
      }
    } else {
      console.log('  Skipped: Trainer or client not available');
    }

    // ========================================================================
    // SEED CLIENT-TRAINER ASSIGNMENTS
    // ========================================================================
    if (ClientTrainerAssignment && trainer && clientPaid) {
      console.log('\n--- Seeding Client-Trainer Assignments ---');

      try {
        const [assignment, created] = await ClientTrainerAssignment.findOrCreate({
          where: {
            clientId: clientPaid.id,
            trainerId: trainer.id
          },
          defaults: {
            clientId: clientPaid.id,
            trainerId: trainer.id,
            isActive: true,
            assignedAt: new Date()
          }
        });

        if (created) {
          results.assignments.created++;
          console.log(`  Created: ${clientPaid.email} -> ${trainer.email}`);
        } else {
          console.log(`  Exists: ${clientPaid.email} -> ${trainer.email}`);
        }
      } catch (err) {
        console.log(`  Error creating assignment: ${err.message}`);
      }
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n');
    console.log('=========================================');
    console.log('  DEV SEEDER COMPLETE');
    console.log('=========================================');
    console.log('');
    console.log('Users:');
    console.log(`  Created: ${results.users.created}`);
    console.log(`  Updated: ${results.users.updated}`);
    console.log('');
    console.log('Packages:');
    console.log(`  Created: ${results.packages.created}`);
    console.log(`  Updated: ${results.packages.updated}`);
    console.log('');
    console.log('Sessions:');
    console.log(`  Created: ${results.sessions.created}`);
    console.log('');
    console.log('Assignments:');
    console.log(`  Created: ${results.assignments.created}`);
    console.log('');
    console.log('--- TEST CREDENTIALS ---');
    console.log('Admin:   admin@swanstudios.dev / AdminTest123!');
    console.log('Trainer: trainer@swanstudios.dev / TrainerTest123!');
    console.log('Client (paid):  client-paid@test.dev / ClientTest123!');
    console.log('Client (free):  client-free@test.dev / ClientTest123!');
    console.log('=========================================\n');

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('\n');
    console.error('=========================================');
    console.error('  DEV SEEDER ERROR');
    console.error('=========================================');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('=========================================\n');
    process.exit(1);
  }
}

// Run the seeder
runDevSeeder();
