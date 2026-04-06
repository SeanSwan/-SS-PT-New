'use strict';

/**
 * Migration: Create E2EE Key Bundle Tables
 * Phase 11 — E2EE Encryption
 *
 * Creates tables for Signal Protocol key exchange:
 * - e2ee_key_bundles: Identity keys + signed prekeys per user/device
 * - e2ee_one_time_prekeys: Consumable one-time prekeys
 * - Adds is_encrypted flag to messages table
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ---------------------------------------------------------------
    // 1. E2EE Key Bundles
    // ---------------------------------------------------------------
    await queryInterface.createTable('e2ee_key_bundles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      device_id: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      identity_public_key: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Base64-encoded Curve25519 identity public key',
      },
      signed_prekey_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      signed_prekey_public: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Base64-encoded signed prekey public',
      },
      signed_prekey_signature: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Signature of signed prekey by identity key',
      },
      registration_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // Unique constraint: one bundle per user per device
    await queryInterface.addIndex('e2ee_key_bundles', ['user_id', 'device_id'], {
      unique: true,
      name: 'idx_e2ee_bundles_user_device',
    });

    await queryInterface.addIndex('e2ee_key_bundles', ['user_id', 'is_active'], {
      name: 'idx_e2ee_bundles_user_active',
    });

    // ---------------------------------------------------------------
    // 2. E2EE One-Time PreKeys
    // ---------------------------------------------------------------
    await queryInterface.createTable('e2ee_one_time_prekeys', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      bundle_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'e2ee_key_bundles', key: 'id' },
        onDelete: 'CASCADE',
      },
      prekey_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      public_key: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Base64-encoded one-time prekey public',
      },
      is_used: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('e2ee_one_time_prekeys', ['bundle_id', 'is_used'], {
      name: 'idx_e2ee_prekeys_bundle_used',
    });

    // ---------------------------------------------------------------
    // 3. Add E2EE columns to messages table (if it exists)
    // ---------------------------------------------------------------
    try {
      const tableInfo = await queryInterface.describeTable('messages');

      if (!tableInfo.is_encrypted) {
        await queryInterface.addColumn('messages', 'is_encrypted', {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          comment: 'Whether this message is E2EE encrypted',
        });
      }

      if (!tableInfo.encryption_protocol) {
        await queryInterface.addColumn('messages', 'encryption_protocol', {
          type: Sequelize.STRING(32),
          allowNull: true,
          comment: 'Encryption protocol version (e.g., signal-v1)',
        });
      }

      if (!tableInfo.sender_device_id) {
        await queryInterface.addColumn('messages', 'sender_device_id', {
          type: Sequelize.STRING(64),
          allowNull: true,
          comment: 'Device that sent this encrypted message',
        });
      }
    } catch (err) {
      // messages table may not exist yet — that's fine
      console.log('[Migration] messages table not found, skipping E2EE columns:', err.message);
    }
  },

  async down(queryInterface) {
    // Remove message columns first
    try {
      await queryInterface.removeColumn('messages', 'sender_device_id');
      await queryInterface.removeColumn('messages', 'encryption_protocol');
      await queryInterface.removeColumn('messages', 'is_encrypted');
    } catch (err) {
      console.log('[Migration] Could not remove message columns:', err.message);
    }

    await queryInterface.dropTable('e2ee_one_time_prekeys');
    await queryInterface.dropTable('e2ee_key_bundles');
  },
};
