'use strict';

/**
 * Migration: Create clients_pii Table
 *
 * Creates a secure table to store client personally identifiable information (PII)
 * that was previously stored in plain text markdown files.
 *
 * Security Features:
 * - Encrypted storage for sensitive data
 * - Audit logging for all access
 * - Admin-only access via API
 * - Separate from public-facing client data
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔒 Creating clients_pii table for secure PII storage...');

    await queryInterface.createTable('clients_pii', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      client_id: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'Client ID in format PT-10001'
      },
      real_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Client real name - encrypted at application layer'
      },
      spirit_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Client spirit animal/nature name for privacy'
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'archived'),
        allowNull: false,
        defaultValue: 'active'
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Training start date'
      },
      current_program: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Current training program name'
      },
      special_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Medical conditions, restrictions, special requirements'
      },
      master_prompt_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Path to client master prompt JSON file'
      },
      privacy_level: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'standard',
        comment: 'Privacy level: standard, high, maximum'
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      last_modified_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('clients_pii', ['client_id'], {
      name: 'idx_clients_pii_client_id',
      unique: true
    });

    await queryInterface.addIndex('clients_pii', ['status'], {
      name: 'idx_clients_pii_status'
    });

    await queryInterface.addIndex('clients_pii', ['created_by'], {
      name: 'idx_clients_pii_created_by'
    });

    console.log('✅ clients_pii table created successfully');
    console.log('   Table includes:');
    console.log('   - Secure storage for real names');
    console.log('   - Client ID linkage (PT-10001 format)');
    console.log('   - Spirit names for privacy');
    console.log('   - Medical/special notes');
    console.log('   - Audit trail (created_by, last_modified_by)');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Dropping clients_pii table...');
    await queryInterface.dropTable('clients_pii');
    console.log('✅ clients_pii table dropped');
  }
};
