'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    
    await queryInterface.bulkInsert('notification_settings', [
      {
        name: 'Sean Swan',
        email: 'ogpswan@yahoo.com',
        phone: '+13239968153',
        isActive: true,
        notificationType: 'ALL',
        isPrimary: true,
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'Jasmine Hearon',
        email: 'jasminehearon@gmail.com',
        phone: '+13239944779',
        isActive: true,
        notificationType: 'ALL',
        isPrimary: false,
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'Swan Studios',
        email: 'loveswanstudios@protonmail.com',
        phone: null,
        isActive: true,
        notificationType: 'ALL',
        isPrimary: false,
        createdAt: now,
        updatedAt: now
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('notification_settings', null, {});
  }
};
