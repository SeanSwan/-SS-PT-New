import bcrypt from 'bcryptjs';
import { User, Session, Package } from '../models/index.mjs';

/**
 * =============================================================================
 * 🎯 COMPREHENSIVE TEST CLIENT SEEDER
 * =============================================================================
 *
 * Purpose:
 * Creates a realistic test client user ("Sarah TestClient") with a full history
 * of session credits and scheduled sessions. This is essential for testing
 * the Universal Master Schedule system's features.
 *
 * Master Prompt Reference:
 * AI-VILLAGE-MASTER-PROMPT-SCHEDULING-SYSTEM.md (Task 1)
 *
 * -----------------------------------------------------------------------------
 *
 * 🧪 HOW TO USE FOR TESTING
 *
 * 1. Run this seeder:
 *    npx sequelize-cli db:seed --seed 20250101-test-client-comprehensive.mjs
 *
 * 2. Login as the test client:
 *    - Email: testclient@swanstudios.com
 *    - Password: TestClient2025!
 *
 * 3. Navigate to the Client Dashboard Schedule.
 *
 * 4. Verify the following:
 *    - Stats Bar shows:
 *      - Credits Remaining: 15
 *      - Total Allocated: 20
 *      - Sessions Scheduled: 2
 *      - Sessions Completed: 3
 *
 *    - Calendar View:
 *      - A "completed" session from 7 days ago.
 *      - A "confirmed" 60-min session for tomorrow at 10:00 AM.
 *      - A "confirmed" 30-min session for 3 days from now at 2:00 PM.
 *      - A "requested" session for 5 days from now (may not be visible to client yet).
 *      - An "available" session for 7 days from now that the client can book.
 *
 * 5. Test Booking:
 *    - Click the "available" session.
 *    - Confirm booking.
 *    - ✅ Credits should decrement to 14.
 *    - ✅ Scheduled count should increment to 3.
 *
 * 6. Test Cancellation (>24 hours):
 *    - Click the session scheduled for 3 days from now.
 *    - Cancel it.
 *    - ✅ Credits should increment back to 15 (refunded).
 *    - ✅ Scheduled count should decrement to 2.
 *
 * =============================================================================
 */

export const up = async (queryInterface, Sequelize) => {
  const transaction = await queryInterface.sequelize.transaction();
  try {
    // --- 1. Find an existing Trainer/Admin and a Package to assign ---
    const adminTrainer = await User.findOne({
      where: { role: { [Sequelize.Op.in]: ['admin', 'trainer'] } },
      order: [['createdAt', 'ASC']],
      transaction
    });

    if (!adminTrainer) {
      throw new Error('Seeder failed: Could not find an existing admin or trainer to assign sessions to.');
    }

    const trainingPackage = await Package.findOne({
      order: [['createdAt', 'ASC']],
      transaction
    });

    if (!trainingPackage) {
      throw new Error('Seeder failed: Could not find an existing package to assign to the test client.');
    }

    // --- 2. Create the Test Client User ---
    const hashedPassword = await bcrypt.hash('TestClient2025!', 10);
    const [testClient] = await User.findOrCreate({
      where: { email: 'testclient@swanstudios.com' },
      defaults: {
        email: 'testclient@swanstudios.com',
        password: hashedPassword,
        firstName: 'Sarah',
        lastName: 'TestClient',
        role: 'client',
        phone: '555-0123',
        // Session Credits
        totalSessionsAllocated: 20,
        sessionsRemaining: 15,
        sessionsCompleted: 3,
        sessionsScheduled: 2,
        sessionsCancelled: 0,
        // Package Assignment
        packageId: trainingPackage.id,
        packagePurchaseDate: new Date('2025-01-01'),
        packageExpirationDate: new Date('2025-07-01'),
        // Client Details
        fitnessGoals: 'Weight loss and strength training',
        medicalConditions: 'None',
        emergencyContact: {
          name: 'John TestClient',
          phone: '555-0124',
          relationship: 'Spouse'
        },
      },
      transaction
    });

    // --- 3. Create the Test Sessions for this Client ---
    const now = new Date();
    await Session.bulkCreate([
      // 1. Completed Session (Past)
      {
        sessionDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        duration: 60,
        status: 'completed',
        trainerId: adminTrainer.id,
        userId: testClient.id,
        notes: 'Great progress on deadlifts',
        completedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      },
      // Two other completed sessions to match the count
      { sessionDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), duration: 60, status: 'completed', trainerId: adminTrainer.id, userId: testClient.id },
      { sessionDate: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000), duration: 60, status: 'completed', trainerId: adminTrainer.id, userId: testClient.id },

      // 2. Scheduled Session (Tomorrow)
      {
        sessionDate: new Date(new Date().setDate(now.getDate() + 1)).setHours(10, 0, 0, 0),
        duration: 60,
        status: 'confirmed',
        trainerId: adminTrainer.id,
        userId: testClient.id,
      },
      // 3. Scheduled 30-Min Session (3 days from now)
      {
        sessionDate: new Date(new Date().setDate(now.getDate() + 3)).setHours(14, 0, 0, 0),
        duration: 30,
        status: 'confirmed',
        trainerId: adminTrainer.id,
        userId: testClient.id,
        notes: 'Quick form check - upper body',
      },
      // 4. Requested Session (Pending Admin Approval)
      {
        sessionDate: new Date(new Date().setDate(now.getDate() + 5)).setHours(9, 0, 0, 0),
        duration: 60,
        status: 'requested',
        trainerId: null, // Admin needs to assign
        userId: testClient.id,
      },
      // 5. Available Time Slot (Client can book this)
      {
        sessionDate: new Date(new Date().setDate(now.getDate() + 7)).setHours(11, 0, 0, 0),
        duration: 60,
        status: 'available',
        trainerId: adminTrainer.id,
        userId: null,
      },
    ], { transaction });

    console.log('✅ Comprehensive test client and sessions seeded successfully.');
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Seeding test client failed:', error);
    throw error;
  }
};

export const down = async (queryInterface, Sequelize) => {
  const transaction = await queryInterface.sequelize.transaction();
  try {
    const testClient = await User.findOne({ where: { email: 'testclient@swanstudios.com' }, transaction });
    if (testClient) {
      await Session.destroy({ where: { userId: testClient.id }, transaction });
      await User.destroy({ where: { email: 'testclient@swanstudios.com' }, transaction });
    }
    console.log('🗑️ Test client and associated sessions removed.');
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Rolling back test client seeder failed:', error);
    throw error;
  }
};