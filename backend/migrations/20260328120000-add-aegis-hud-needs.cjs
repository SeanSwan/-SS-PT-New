/**
 * ============================================================================
 * MIGRATION: Add Aegis HUD Needs System to Gamification
 * PURPOSE: Stores RPG-style needs bars (Athletic, Recovery, Social, Discipline, Vitality)
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS DOES: Adds JSONB needsState column to Gamification table for the
 * Aegis HUD feature. Needs decay over time and are replenished by user actions.
 * Also adds jobClass column for the upcoming Job System feature.
 */

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('Gamifications').catch(() => null);
    if (!tableInfo) {
      console.log('[Migration] Gamifications table does not exist yet — skipping Aegis HUD columns');
      return;
    }

    // Add needsState JSONB column
    if (!tableInfo.needsState) {
      await queryInterface.addColumn('Gamifications', 'needsState', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {
          athletic:   { value: 50, lastUpdated: new Date().toISOString() },
          recovery:   { value: 50, lastUpdated: new Date().toISOString() },
          social:     { value: 50, lastUpdated: new Date().toISOString() },
          discipline: { value: 50, lastUpdated: new Date().toISOString() },
          vitality:   { value: 50, lastUpdated: new Date().toISOString() },
        },
        comment: 'Aegis HUD needs state — 5 RPG needs bars with decay timestamps',
      });
      console.log('[Migration] Added needsState column to Gamifications');
    }

    // Add lastNeedsCalculation for optimization
    if (!tableInfo.lastNeedsCalculation) {
      await queryInterface.addColumn('Gamifications', 'lastNeedsCalculation', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last time needs decay was calculated and persisted',
      });
      console.log('[Migration] Added lastNeedsCalculation column to Gamifications');
    }

    // Add jobClass for upcoming Job System feature
    if (!tableInfo.jobClass) {
      await queryInterface.addColumn('Gamifications', 'jobClass', {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: null,
        comment: 'FFXIV-style job class: paladin, monk, ranger, white_mage, dark_knight',
      });
      console.log('[Migration] Added jobClass column to Gamifications');
    }

    // Add moodlet for inline profile badge
    if (!tableInfo.currentMoodlet) {
      await queryInterface.addColumn('Gamifications', 'currentMoodlet', {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'neutral',
        comment: 'Current moodlet derived from needs state: energized, recovering, social_butterfly, focused, drained, etc.',
      });
      console.log('[Migration] Added currentMoodlet column to Gamifications');
    }
  },

  async down(queryInterface) {
    const tableInfo = await queryInterface.describeTable('Gamifications').catch(() => null);
    if (!tableInfo) return;

    if (tableInfo.needsState) await queryInterface.removeColumn('Gamifications', 'needsState');
    if (tableInfo.lastNeedsCalculation) await queryInterface.removeColumn('Gamifications', 'lastNeedsCalculation');
    if (tableInfo.jobClass) await queryInterface.removeColumn('Gamifications', 'jobClass');
    if (tableInfo.currentMoodlet) await queryInterface.removeColumn('Gamifications', 'currentMoodlet');
  },
};
