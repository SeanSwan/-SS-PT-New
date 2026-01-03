'use strict';

/**
 * Comprehensive Test Data Seeder
 * ================================
 *
 * PURPOSE:
 * Creates realistic test data for comprehensive feature testing
 *
 * TEST USER: clienttest (ID: 3)
 * - Client role with complete test data
 * - Sessions (scheduled, completed, cancelled)
 * - Workout sessions (both solo and trainer-led)
 * - Body measurements over time
 * - Session package with credits
 *
 * USAGE:
 * npx sequelize-cli db:seed --seed 20260102000002-comprehensive-test-data.cjs
 *
 * ROLLBACK:
 * npx sequelize-cli db:seed:undo --seed 20260102000002-comprehensive-test-data.cjs
 */

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const clientId = 3; // clienttest user
    const trainerId = 2; // trainertest user
    const now = new Date();

    console.log('\n🌱 Starting comprehensive test data seeding...\n');

    try {
      // ========================================
      // 1. UPDATE CLIENT WITH SESSION CREDITS
      // ========================================
      console.log('📦 Setting up session package (20 sessions, 12 remaining)...');
      await queryInterface.bulkUpdate(
        'Users',
        {
          availableSessions: 12, // 12 sessions remaining (8 used)
          updatedAt: now
        },
        { id: clientId }
      );

      // ========================================
      // 2. CREATE SESSIONS (Paid Training Sessions)
      // ========================================
      console.log('📅 Creating session history (8 sessions)...');

      const sessions = [
        // COMPLETED SESSIONS (6 total - credits deducted)
        {
          id: 101,
          userId: clientId,
          trainerId: trainerId,
          sessionDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          duration: 60,
          status: 'completed',
          sessionDeducted: true,
          location: 'Main Gym - Room A',
          notes: 'Great first session! Focused on form and baseline strength assessment.',
          createdAt: now,
          updatedAt: now
        },
        {
          id: 102,
          userId: clientId,
          trainerId: trainerId,
          sessionDate: new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000),
          duration: 60,
          status: 'completed',
          sessionDeducted: true,
          location: 'Main Gym - Room A',
          notes: 'Upper body strength training. Client showing good progress.',
          createdAt: now,
          updatedAt: now
        },
        {
          id: 103,
          userId: clientId,
          trainerId: trainerId,
          sessionDate: new Date(now.getTime() - 23 * 24 * 60 * 60 * 1000),
          duration: 60,
          status: 'completed',
          sessionDeducted: true,
          location: 'Main Gym - Room A',
          notes: 'Lower body day. Introduced deadlifts and squats.',
          createdAt: now,
          updatedAt: now
        },
        {
          id: 104,
          userId: clientId,
          trainerId: trainerId,
          sessionDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
          duration: 60,
          status: 'completed',
          sessionDeducted: true,
          location: 'Main Gym - Room A',
          notes: 'Full body circuit training. Excellent energy today.',
          createdAt: now,
          updatedAt: now
        },
        {
          id: 105,
          userId: clientId,
          trainerId: trainerId,
          sessionDate: new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000),
          duration: 60,
          status: 'completed',
          sessionDeducted: true,
          location: 'Main Gym - Room A',
          notes: 'Upper body push day. Increased bench press weight.',
          createdAt: now,
          updatedAt: now
        },
        {
          id: 106,
          userId: clientId,
          trainerId: trainerId,
          sessionDate: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000),
          duration: 60,
          status: 'completed',
          sessionDeducted: true,
          location: 'Main Gym - Room A',
          notes: 'Lower body strength. New PR on squats!',
          createdAt: now,
          updatedAt: now
        },

        // UPCOMING SESSIONS (2 total - no credits deducted yet)
        {
          id: 107,
          userId: clientId,
          trainerId: trainerId,
          sessionDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
          duration: 60,
          status: 'scheduled',
          sessionDeducted: false,
          location: 'Main Gym - Room A',
          notes: 'Planned: Upper body pull day',
          createdAt: now,
          updatedAt: now
        },
        {
          id: 108,
          userId: clientId,
          trainerId: trainerId,
          sessionDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          duration: 60,
          status: 'scheduled',
          sessionDeducted: false,
          location: 'Main Gym - Room A',
          notes: 'Planned: Full body functional training',
          createdAt: now,
          updatedAt: now
        }
      ];

      await queryInterface.bulkInsert('sessions', sessions);

      // ========================================
      // 3. CREATE WORKOUT SESSIONS
      // ========================================
      console.log('💪 Creating workout history (12 total: 6 trainer-led + 6 solo)...');

      const workoutSessions = [
        // TRAINER-LED WORKOUTS (linked to sessions)
        {
          id: uuidv4(),
          userId: clientId,
          trainerId: trainerId,
          sessionId: 101,
          sessionType: 'trainer-led',
          title: 'Baseline Strength Assessment',
          date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          duration: 60,
          avgRPE: 7,
          status: 'completed',
          totalWeight: 4500,
          totalReps: 85,
          totalSets: 15,
          experiencePoints: 150,
          notes: 'First session establishing baseline strength levels',
          completedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000 + 3600000),
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          userId: clientId,
          trainerId: trainerId,
          sessionId: 102,
          sessionType: 'trainer-led',
          title: 'Upper Body Strength - Push',
          date: new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000),
          duration: 60,
          avgRPE:8,
          status: 'completed',
          totalWeight: 5200,
          totalReps: 92,
          totalSets: 16,
          experiencePoints: 180,
          notes: 'Bench press, overhead press, tricep work',
          completedAt: new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000 + 3600000),
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          userId: clientId,
          trainerId: trainerId,
          sessionId: 103,
          sessionType: 'trainer-led',
          title: 'Lower Body - Squats & Deadlifts',
          date: new Date(now.getTime() - 23 * 24 * 60 * 60 * 1000),
          duration: 60,
          avgRPE:9,
          status: 'completed',
          totalWeight: 6800,
          totalReps: 78,
          totalSets: 14,
          experiencePoints: 200,
          notes: 'Heavy compound lifts, great form',
          completedAt: new Date(now.getTime() - 23 * 24 * 60 * 60 * 1000 + 3600000),
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          userId: clientId,
          trainerId: trainerId,
          sessionId: 104,
          sessionType: 'trainer-led',
          title: 'Full Body Circuit',
          date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
          duration: 60,
          avgRPE:8,
          status: 'completed',
          totalWeight: 4200,
          totalReps: 120,
          totalSets: 20,
          experiencePoints: 175,
          notes: 'High-intensity circuit training',
          completedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000 + 3600000),
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          userId: clientId,
          trainerId: trainerId,
          sessionId: 105,
          sessionType: 'trainer-led',
          title: 'Upper Body - Progressive Overload',
          date: new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000),
          duration: 60,
          avgRPE:9,
          status: 'completed',
          totalWeight: 5800,
          totalReps: 88,
          totalSets: 16,
          experiencePoints: 190,
          notes: 'Increased weights across all exercises',
          completedAt: new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000 + 3600000),
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          userId: clientId,
          trainerId: trainerId,
          sessionId: 106,
          sessionType: 'trainer-led',
          title: 'Lower Body - New PR Day',
          date: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000),
          duration: 60,
          avgRPE:9,
          status: 'completed',
          totalWeight: 7200,
          totalReps: 75,
          totalSets: 13,
          experiencePoints: 220,
          notes: 'New personal record on squats! 225lbs x 5',
          completedAt: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000 + 3600000),
          createdAt: now,
          updatedAt: now
        },

        // SOLO WORKOUTS (self-logged, no session credits used)
        {
          id: uuidv4(),
          userId: clientId,
          trainerId: null,
          sessionId: null,
          sessionType: 'solo',
          title: 'Solo Cardio & Core',
          date: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
          duration: 45,
          avgRPE:6,
          status: 'completed',
          totalWeight: 0,
          totalReps: 150,
          totalSets: 10,
          experiencePoints: 100,
          notes: 'Treadmill 3 miles, ab circuit',
          completedAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000 + 2700000),
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          userId: clientId,
          trainerId: null,
          sessionId: null,
          sessionType: 'solo',
          title: 'Solo Upper Body Accessory Work',
          date: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
          duration: 40,
          avgRPE: 7,
          status: 'completed',
          totalWeight: 2800,
          totalReps: 95,
          totalSets: 12,
          experiencePoints: 120,
          notes: 'Bicep curls, tricep extensions, shoulder raises',
          completedAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000 + 2400000),
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          userId: clientId,
          trainerId: null,
          sessionId: null,
          sessionType: 'solo',
          title: 'Solo Active Recovery',
          date: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
          duration: 30,
          avgRPE:4,
          status: 'completed',
          totalWeight: 0,
          totalReps: 60,
          totalSets: 6,
          experiencePoints: 80,
          notes: 'Stretching, foam rolling, light mobility work',
          completedAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000 + 1800000),
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          userId: clientId,
          trainerId: null,
          sessionId: null,
          sessionType: 'solo',
          title: 'Solo Leg Day',
          date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
          duration: 50,
          avgRPE:8,
          status: 'completed',
          totalWeight: 5400,
          totalReps: 82,
          totalSets: 14,
          experiencePoints: 160,
          notes: 'Leg press, lunges, calf raises',
          completedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000 + 3000000),
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          userId: clientId,
          trainerId: null,
          sessionId: null,
          sessionType: 'solo',
          title: 'Solo HIIT Cardio',
          date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          duration: 35,
          avgRPE:9,
          status: 'completed',
          totalWeight: 0,
          totalReps: 200,
          totalSets: 15,
          experiencePoints: 140,
          notes: 'Burpees, mountain climbers, jump squats',
          completedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000 + 2100000),
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          userId: clientId,
          trainerId: null,
          sessionId: null,
          sessionType: 'solo',
          title: 'Solo Full Body Maintenance',
          date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
          duration: 45,
          avgRPE: 7,
          status: 'completed',
          totalWeight: 3600,
          totalReps: 105,
          totalSets: 15,
          experiencePoints: 130,
          notes: 'Light weights, focused on time under tension',
          completedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000 + 2700000),
          createdAt: now,
          updatedAt: now
        }
      ];

      await queryInterface.bulkInsert('workout_sessions', workoutSessions);

      console.log('\n✅ Test data seeding completed successfully!');
      console.log('\n📊 SUMMARY:');
      console.log('   - Test User: clienttest (ID: 3)');
      console.log('   - Session Credits: 12 remaining (8 used)');
      console.log('   - Paid Sessions: 6 completed, 2 scheduled');
      console.log('   - Trainer-Led Workouts: 6 logged');
      console.log('   - Solo Workouts: 6 logged');
      console.log('   - Total Workout Sessions: 12');
      console.log('\n🎯 TESTING READY:');
      console.log('   - Login as: clienttest / [password]');
      console.log('   - Test session booking with 12 credits available');
      console.log('   - View workout history (mixed solo/trainer-led)');
      console.log('   - Check analytics charts');
      console.log('   - Test schedule with upcoming sessions\n');

    } catch (error) {
      console.error('❌ Error seeding test data:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      console.log('\n🗑️  Rolling back test data...');

      // Delete workout sessions
      await queryInterface.bulkDelete('workout_sessions', {
        userId: 3
      });

      // Delete sessions
      await queryInterface.bulkDelete('sessions', {
        id: { [Sequelize.Op.between]: [101, 108] }
      });

      // Reset user session credits
      await queryInterface.bulkUpdate(
        'Users',
        { availableSessions: 0 },
        { id: 3 }
      );

      console.log('✅ Test data rollback completed\n');

    } catch (error) {
      console.error('❌ Error rolling back test data:', error);
      throw error;
    }
  }
};
