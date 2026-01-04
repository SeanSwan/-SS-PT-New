'use strict';

/**
 * Migration: Create Trainer Commissions Table
 * Purpose: Track commission splits for trainer sales and lead attribution
 * Features:
 * - Platform leads: 55% business / 45% trainer
 * - Resign leads: 50% business / 50% trainer
 * - Trainer-brought leads: 20% business / 80% trainer
 * - Loyalty bump: +5% to trainer after 100 sessions
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('trainer_commissions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      // Relationships
      order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Associated order for this commission'
      },

      trainer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Trainer receiving commission'
      },

      client_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Client who made the purchase'
      },

      package_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'storefront_items',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Storefront package purchased'
      },

      // Lead Source & Attribution
      lead_source: {
        type: Sequelize.ENUM('platform', 'trainer_brought', 'resign'),
        allowNull: false,
        comment: 'Origin of client: platform (business lead), trainer_brought (trainer sourced), resign (renewal)'
      },

      is_loyalty_bump: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'True if +5% loyalty bonus applied (packages >100 sessions)'
      },

      // Session Tracking
      sessions_granted: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Total sessions granted in this order'
      },

      sessions_consumed: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Sessions consumed (updates as client books sessions)'
      },

      // Financial Data
      gross_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Total package price before tax'
      },

      tax_amount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00,
        allowNull: false,
        comment: 'Tax amount (charged or absorbed)'
      },

      net_after_tax: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Final amount after tax (gross + tax if charged, gross if absorbed)'
      },

      // Commission Split Rates (stored as percentages)
      commission_rate_business: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        comment: 'Business commission percentage (e.g., 55.00 for 55%)'
      },

      commission_rate_trainer: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        comment: 'Trainer commission percentage (e.g., 45.00 for 45%)'
      },

      // Commission Split Amounts (dollar values)
      business_cut: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Business commission amount in dollars'
      },

      trainer_cut: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Trainer commission amount in dollars'
      },

      // Payout Tracking
      paid_to_trainer_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when trainer was paid (null = unpaid)'
      },

      payout_method: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'How trainer was paid (e.g., "Stripe Connect", "Manual Check")'
      },

      payout_reference: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'External reference ID (e.g., Stripe payout ID)'
      },

      // Audit Fields
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Indexes for performance
    await queryInterface.addIndex('trainer_commissions', ['order_id'], {
      name: 'idx_trainer_commissions_order_id'
    });

    await queryInterface.addIndex('trainer_commissions', ['trainer_id'], {
      name: 'idx_trainer_commissions_trainer_id'
    });

    await queryInterface.addIndex('trainer_commissions', ['client_id'], {
      name: 'idx_trainer_commissions_client_id'
    });

    await queryInterface.addIndex('trainer_commissions', ['lead_source'], {
      name: 'idx_trainer_commissions_lead_source'
    });

    await queryInterface.addIndex('trainer_commissions', ['paid_to_trainer_at'], {
      name: 'idx_trainer_commissions_paid_at'
    });

    console.log('✅ Created trainer_commissions table with commission tracking');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('trainer_commissions');
    console.log('✅ Dropped trainer_commissions table');
  }
};
