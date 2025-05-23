'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid'); // Add UUID for ID generation

/**
 * Admin User Seeder
 * Creates an initial admin user for application management
 * With temporary password that should be changed after first login
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Hash the admin password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('55555', salt);
    
    // Create timestamp for consistent created/updated dates
    const now = new Date();
    
    // Insert admin user with UUID primary key
    return queryInterface.bulkInsert('users', [{
      id: uuidv4(), // Generate UUID for id field
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@swanstudios.com',
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      emailNotifications: true,
      smsNotifications: true,
      createdAt: now,
      updatedAt: now
    }], {});
  },

  async down(queryInterface, Sequelize) {
    // Remove the admin user by email
    return queryInterface.bulkDelete('users', { 
      email: 'admin@swanstudios.com' 
    }, {});
  }
};