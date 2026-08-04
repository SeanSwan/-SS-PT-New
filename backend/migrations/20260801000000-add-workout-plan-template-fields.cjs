'use strict';

/**
 * S24 (JARVIS blueprint §4.6): additive template fields on workout_plans.
 * - is_template: marks a trainer-owned, client-scrubbed reusable plan.
 * - template_meta: { name, phase, split, weeks, tags[] } — structure only,
 *   PII-scrubbed at the API boundary (scrubPlanTemplate) before persistence.
 * Additive + defaulted → zero impact on existing rows or queries.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('workout_plans', 'is_template', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('workout_plans', 'template_meta', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('workout_plans', 'template_meta');
    await queryInterface.removeColumn('workout_plans', 'is_template');
  },
};
