'use strict';

/**
 * Migration: Add chartVisibility JSONB column to Users table
 * AI Village CRITICAL — privacy-first defaults (all false)
 * Users opt-in to chart sharing during onboarding or settings
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('Users').catch(() => null);
    if (!tableDesc) {
      console.log('Users table not found, skipping');
      return;
    }

    if (tableDesc.chartVisibility) {
      console.log('chartVisibility column already exists, skipping');
      return;
    }

    // Privacy-first: ALL chart types default to hidden
    const defaultVisibility = JSON.stringify({
      weightProgression: false,
      workoutHeatmap: false,
      muscleRadar: false,
      goalProgress: false,
      exerciseRolodex: false,
      strengthProgression: false,
      bodyComposition: false,
      volumeProgression: false,
      sessionFrequency: false,
      nasmProgress: false,
    });

    await queryInterface.addColumn('Users', 'chartVisibility', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: JSON.parse(defaultVisibility),
      comment: 'Privacy controls for which charts are visible on social profile. All default to false (opt-in).',
    });

    console.log('✅ chartVisibility JSONB column added to Users with privacy-first defaults');
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'chartVisibility').catch(() => null);
  },
};
