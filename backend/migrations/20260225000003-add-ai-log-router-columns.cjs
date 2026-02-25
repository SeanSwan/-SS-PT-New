'use strict';

/**
 * Migration: Add Phase 3 router columns to ai_interaction_logs
 *
 * Adds:
 *   - promptVersion (STRING) — tracks which prompt template version was used
 *   - tokenUsage (JSONB) — structured token usage + estimated cost
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('ai_interaction_logs').catch(() => null);
    if (!tableInfo) {
      console.log('[Migration] ai_interaction_logs table does not exist yet — skipping column additions');
      return;
    }

    if (!tableInfo.promptVersion) {
      await queryInterface.addColumn('ai_interaction_logs', 'promptVersion', {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Prompt template version (e.g. "1.0.0")',
      });
    }

    if (!tableInfo.tokenUsage) {
      await queryInterface.addColumn('ai_interaction_logs', 'tokenUsage', {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Structured token usage: { inputTokens, outputTokens, totalTokens, estimatedCostUsd }',
      });
    }
  },

  async down(queryInterface) {
    const tableInfo = await queryInterface.describeTable('ai_interaction_logs').catch(() => null);
    if (!tableInfo) return;

    if (tableInfo.tokenUsage) {
      await queryInterface.removeColumn('ai_interaction_logs', 'tokenUsage');
    }
    if (tableInfo.promptVersion) {
      await queryInterface.removeColumn('ai_interaction_logs', 'promptVersion');
    }
  },
};
