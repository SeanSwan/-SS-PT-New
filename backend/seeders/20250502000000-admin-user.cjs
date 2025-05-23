'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * Admin User Seeder
 * Creates a default admin user for the application
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if admin user already exists to avoid duplicates
    const adminExists = await queryInterface.rawSelect('users', {
      where: { username: 'admin' },
      plain: true
    }, ['id']);

    if (adminExists) {
      console.log('Admin user already exists, skipping admin user creation');
      return;
    }

    // Create admin password hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('55555', salt);
    const now = new Date();

    // Create admin user with UUID
    return await queryInterface.bulkInsert('users', [
      {
        id: uuidv4(), // Generate a UUID for the user
        username: 'admin',
        email: 'admin@swanstudios.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        emailNotifications: true,
        smsNotifications: true,
        preferences: JSON.stringify({
          theme: 'dark',
          language: 'en',
          dashboardLayout: 'default'
        }),
        createdAt: now,
        updatedAt: now
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    // Remove the admin user during rollback
    return await queryInterface.bulkDelete('users', { username: 'admin' }, {});
  }
};
