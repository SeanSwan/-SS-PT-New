'use strict';

/**
 * S1.1 (nutrition blueprint 2026-08-04): per-client nutrition targets — the
 * adherence denominator /api/macros/summary never had. One active row per user
 * (partial unique index = race-safe without btree_gist); history via
 * supersession, so effective ranges cannot overlap by construction.
 * FK targets "Users" (canonical PascalCase table — rule 58).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('nutrition_targets')) {
      await queryInterface.createTable('nutrition_targets', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        dailyCalories: { type: Sequelize.INTEGER, allowNull: true },
        proteinGrams: { type: Sequelize.DECIMAL(6, 2), allowNull: true },
        carbsGrams: { type: Sequelize.DECIMAL(6, 2), allowNull: true },
        fatGrams: { type: Sequelize.DECIMAL(6, 2), allowNull: true },
        fiberGrams: { type: Sequelize.DECIMAL(6, 2), allowNull: true },
        sodiumLimitMg: { type: Sequelize.INTEGER, allowNull: true },
        hydrationTargetLiters: { type: Sequelize.DECIMAL(4, 2), allowNull: true },
        effectiveFrom: { type: Sequelize.DATEONLY, allowNull: false },
        effectiveTo: { type: Sequelize.DATEONLY, allowNull: true },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'draft' },
        source: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'manual' },
        createdBy: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Users', key: 'id' },
        },
        activatedBy: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'Users', key: 'id' },
        },
        activatedAt: { type: Sequelize.DATE, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      });
      await queryInterface.addIndex('nutrition_targets', ['userId', 'status']);
      await queryInterface.addIndex('nutrition_targets', ['userId', 'effectiveFrom']);
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS nutrition_targets_one_active_per_user
        ON nutrition_targets ("userId")
        WHERE status = 'active'
      `);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('nutrition_targets');
  },
};
