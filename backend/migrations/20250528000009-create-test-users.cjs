'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Creating optional test users for SwanStudios platform...');

    try {
      const bcrypt = require('bcryptjs');

      const [existingUsers] = await queryInterface.sequelize.query(`
        SELECT COUNT(*) as count FROM users;
      `);

      console.log(`Current user count: ${existingUsers[0].count}`);

      const seedPassword = process.env.SEED_TEST_USERS_PASSWORD;
      if (!seedPassword) {
        console.log('SEED_TEST_USERS_PASSWORD is not set; skipping optional test-user seed migration.');
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const testPassword = await bcrypt.hash(seedPassword, salt);

      const testUsers = [];
      const testUserEmails = ['admin@test.com', 'trainer@test.com', 'client@test.com', 'user@test.com'];

      for (const email of testUserEmails) {
        const username = email.split('@')[0];
        const [existingUser] = await queryInterface.sequelize.query(`
          SELECT id FROM users WHERE email = '${email}' OR username = '${username}';
        `);

        if (existingUser.length === 0) {
          let userData = {
            password: testPassword,
            isActive: true,
            emailNotifications: true,
            smsNotifications: true,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          switch (email) {
            case 'admin@test.com':
              userData = {
                ...userData,
                firstName: 'Test',
                lastName: 'Admin',
                email: 'admin@test.com',
                username: 'admin',
                role: 'admin',
                phone: '+1-555-0001',
                bio: 'Test Administrator Account - DELETE AFTER TESTING'
              };
              break;

            case 'trainer@test.com':
              userData = {
                ...userData,
                firstName: 'Test',
                lastName: 'Trainer',
                email: 'trainer@test.com',
                username: 'trainer',
                role: 'trainer',
                phone: '+1-555-0002',
                bio: 'Test Trainer Account - DELETE AFTER TESTING',
                specialties: 'Personal Training, Test Workouts',
                certifications: 'Test Certification',
                hourlyRate: 150.00
              };
              break;

            case 'client@test.com':
              userData = {
                ...userData,
                firstName: 'Test',
                lastName: 'Client',
                email: 'client@test.com',
                username: 'client',
                role: 'client',
                phone: '+1-555-0003',
                fitnessGoal: 'Test fitness goals',
                trainingExperience: 'Beginner - Test Account',
                availableSessions: 5,
                points: 100,
                level: 1,
                tier: 'bronze'
              };
              break;

            case 'user@test.com':
              userData = {
                ...userData,
                firstName: 'Test',
                lastName: 'User',
                email: 'user@test.com',
                username: 'user',
                role: 'user',
                phone: '+1-555-0004',
                fitnessGoal: 'General fitness',
                points: 0,
                level: 1,
                tier: 'bronze'
              };
              break;
          }

          testUsers.push(userData);
        } else {
          console.log(`User ${username} already exists, skipping.`);
        }
      }

      if (testUsers.length > 0) {
        await queryInterface.bulkInsert('users', testUsers);
        console.log(`Created ${testUsers.length} test users successfully.`);
      } else {
        console.log('All test users already exist, no new users created.');
      }

      console.log('Test login accounts created with SEED_TEST_USERS_PASSWORD.');
      console.log('Admin: admin@test.com or username: admin');
      console.log('Trainer: trainer@test.com or username: trainer');
      console.log('Client: client@test.com or username: client');
      console.log('User: user@test.com or username: user');
      console.log('Change passwords and delete test users after testing.');
    } catch (error) {
      console.error('Failed to create test users:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('Rolling back test users...');

    try {
      await queryInterface.bulkDelete('users', {
        email: [
          'admin@test.com',
          'trainer@test.com',
          'client@test.com',
          'user@test.com'
        ]
      });
      console.log('Test users removed.');
    } catch (error) {
      console.error('Rollback failed:', error.message);
      throw error;
    }
  }
};
