'use strict';

const TYPES_WITH_PROFILE_COVERAGE = [
  'client_onboarding',
  'workout_log',
  'nutrition_log',
  'client_data_update',
  'client_profile_coverage_update',
  'frontend_dispatch',
  'clarification',
  'split_plan',
];
const TYPES_WITHOUT_PROFILE_COVERAGE = TYPES_WITH_PROFILE_COVERAGE
  .filter((type) => type !== 'client_profile_coverage_update');

const constraintSql = (types) => `
  ALTER TABLE coach_action_proposals
    ADD CONSTRAINT coach_action_proposals_proposal_type_check
    CHECK (proposal_type IN (${types.map((type) => `'${type}'`).join(',')}))`;

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE coach_action_proposals DROP CONSTRAINT IF EXISTS coach_action_proposals_proposal_type_check',
    );
    await queryInterface.sequelize.query(constraintSql(TYPES_WITH_PROFILE_COVERAGE));
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE coach_action_proposals DROP CONSTRAINT IF EXISTS coach_action_proposals_proposal_type_check',
    );
    await queryInterface.sequelize.query(constraintSql(TYPES_WITHOUT_PROFILE_COVERAGE));
  },
};