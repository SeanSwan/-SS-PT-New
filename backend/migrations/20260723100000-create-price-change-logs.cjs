'use strict';

/**
 * Creates price_change_logs — append-only pricing audit trail for the trainer-economics
 * governance layer (Kimi K3 blueprint S1 / §7 ERD).
 *
 * FK storeFrontItemId → storefront_items; changedByUserId → "Users" (PascalCase table gotcha).
 * Append-only is enforced at the MODEL layer (PriceChangeLog.mjs hooks), not by a DB trigger,
 * matching the AiCommandAuditLog precedent — this migration only builds the table + indexes.
 * No updatedAt column (append-only). Reversible: down() drops the table and its ENUM type.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('price_change_logs', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true, allowNull: false },
      storeFrontItemId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'storefront_items', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      changedByUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      changedByRole: { type: Sequelize.STRING(20), allowNull: true },
      oldPrice: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      newPrice: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      source: {
        type: Sequelize.ENUM('manual', 'special', 'floor_clamp', 'special_floor_clamp', 'request', 'shadow'),
        allowNull: false,
      },
      pricingChangeRequestId: { type: Sequelize.INTEGER, allowNull: true },
      wouldHaveClamped: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      context: { type: Sequelize.JSONB, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('price_change_logs', ['storeFrontItemId', 'createdAt'], {
      name: 'price_change_logs_item_createdAt',
    });
    await queryInterface.addIndex('price_change_logs', ['source'], { name: 'price_change_logs_source' });
    await queryInterface.addIndex('price_change_logs', ['wouldHaveClamped'], {
      name: 'price_change_logs_would_have_clamped',
    });
    await queryInterface.addIndex('price_change_logs', ['pricingChangeRequestId'], {
      name: 'price_change_logs_request_id',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('price_change_logs');
    // Drop the ENUM type Postgres created for the source column.
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_price_change_logs_source";');
  },
};
