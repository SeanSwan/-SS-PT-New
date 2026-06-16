'use strict';

/**
 * Add a nullable leadId to automation_logs so the nurture engine can target captured
 * Leads (not just Users/clients). Soft reference (no FK constraint) + index — keeps
 * the migration safe across environments. Idempotent + reversible.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('automation_logs').catch(() => null);
    if (!table) return; // table not created in this env yet; model sync will include leadId
    if (!table.leadId) {
      await queryInterface.addColumn('automation_logs', 'leadId', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
    try {
      await queryInterface.addIndex('automation_logs', ['leadId'], { name: 'automation_logs_lead_id_idx' });
    } catch (err) {
      // index already exists — safe to ignore
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeIndex('automation_logs', 'automation_logs_lead_id_idx');
    } catch (err) {
      // index absent — safe to ignore
    }
    const table = await queryInterface.describeTable('automation_logs').catch(() => null);
    if (table && table.leadId) {
      await queryInterface.removeColumn('automation_logs', 'leadId');
    }
  },
};