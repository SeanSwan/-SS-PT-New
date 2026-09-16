'use strict';

/**
 * Creates durable lifecycle receipts for encrypted trainer credential uploads.
 * Pending objects expire after 24 hours in application code and are physically
 * deleted by trainerCredentialCleanupWorker. Attached records are retained as
 * application evidence and cannot be silently orphaned by FK cascades.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('trainer_credential_uploads', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        kind: {
          type: Sequelize.ENUM('insurance', 'certification'),
          allowNull: false,
        },
        storageKey: {
          type: Sequelize.STRING(500),
          allowNull: false,
          unique: true,
        },
        byteSize: { type: Sequelize.INTEGER, allowNull: false },
        status: {
          type: Sequelize.ENUM('uploading', 'pending', 'deleting', 'attached'),
          allowNull: false,
          defaultValue: 'uploading',
        },
        expiresAt: { type: Sequelize.DATE, allowNull: true },
        cleanupClaimedAt: { type: Sequelize.DATE, allowNull: true },
        attachedApplicationId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'trainer_applications', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, { transaction });

      await queryInterface.addIndex('trainer_credential_uploads', ['userId', 'status'], {
        name: 'trainer_credential_uploads_owner_status',
        transaction,
      });
      await queryInterface.addIndex('trainer_credential_uploads', ['status', 'expiresAt'], {
        name: 'trainer_credential_uploads_expiry',
        transaction,
      });
      await queryInterface.addIndex('trainer_credential_uploads', ['attachedApplicationId'], {
        name: 'trainer_credential_uploads_application',
        transaction,
      });
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('trainer_credential_uploads', { transaction });
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_trainer_credential_uploads_kind";',
        { transaction },
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_trainer_credential_uploads_status";',
        { transaction },
      );
    });
  },
};
