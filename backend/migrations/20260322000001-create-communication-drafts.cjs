'use strict';

/**
 * Migration: Create CommunicationDrafts table
 * AI Village CRITICAL security mandate — AI must draft, not send directly
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if table already exists (idempotent)
    const tableExists = await queryInterface.describeTable('CommunicationDrafts').catch(() => null);
    if (tableExists) {
      console.log('CommunicationDrafts table already exists, skipping creation');
      return;
    }

    await queryInterface.createTable('CommunicationDrafts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      type: {
        type: Sequelize.ENUM('email', 'sms'),
        allowNull: false,
      },
      clientId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      trainerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      subject: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      recipientAddress: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending_approval', 'approved', 'sent', 'rejected'),
        allowNull: false,
        defaultValue: 'pending_approval',
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      approvedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      sentAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      rejectionReason: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // Indexes for efficient queries
    await queryInterface.addIndex('CommunicationDrafts', ['trainerId', 'status']).catch(() => null);
    await queryInterface.addIndex('CommunicationDrafts', ['clientId']).catch(() => null);
    await queryInterface.addIndex('CommunicationDrafts', ['status']).catch(() => null);

    console.log('✅ CommunicationDrafts table created successfully');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('CommunicationDrafts').catch(() => null);
  },
};
