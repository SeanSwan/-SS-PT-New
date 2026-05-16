'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    const primaryEmail = process.env.PRIMARY_NOTIFICATION_EMAIL;
    if (!primaryEmail) {
      console.log('PRIMARY_NOTIFICATION_EMAIL is not set; skipping default notification settings seed.');
      return;
    }

    const notificationRows = [
      {
        name: process.env.PRIMARY_NOTIFICATION_NAME || 'Primary Admin',
        email: primaryEmail,
        phone: process.env.PRIMARY_NOTIFICATION_PHONE || null,
        isActive: true,
        notificationType: 'ALL',
        isPrimary: true,
        createdAt: now,
        updatedAt: now
      },
      {
        name: 'Swan Studios',
        email: process.env.STUDIO_NOTIFICATION_EMAIL || primaryEmail,
        phone: null,
        isActive: true,
        notificationType: 'ALL',
        isPrimary: false,
        createdAt: now,
        updatedAt: now
      }
    ];

    const secondaryEmail = process.env.SECONDARY_NOTIFICATION_EMAIL;
    if (secondaryEmail) {
      notificationRows.splice(1, 0, {
        name: process.env.SECONDARY_NOTIFICATION_NAME || 'Secondary Admin',
        email: secondaryEmail,
        phone: process.env.SECONDARY_NOTIFICATION_PHONE || null,
        isActive: true,
        notificationType: 'ALL',
        isPrimary: false,
        createdAt: now,
        updatedAt: now
      });
    }

    await queryInterface.bulkInsert('notification_settings', notificationRows, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('notification_settings', null, {});
  }
};
