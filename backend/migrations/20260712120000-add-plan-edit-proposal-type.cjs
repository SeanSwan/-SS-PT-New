'use strict';

/**
 * Widen the coach_action_proposals proposal_type CHECK to admit 'plan_edit' —
 * Swan Coach proposes field-level edits to a SAVED WorkoutPlan; the trainer
 * approves per item; only the approved subset applies (2026-07-12).
 * Mirrors 20260628073000-add-client-profile-coverage-proposal-type.cjs exactly.
 */
const TYPES_WITH_PLAN_EDIT = [
  'client_onboarding',
  'workout_log',
  'nutrition_log',
  'client_data_update',
  'client_profile_coverage_update',
  'frontend_dispatch',
  'clarification',
  'split_plan',
  'plan_edit',
];
const TYPES_WITHOUT_PLAN_EDIT = TYPES_WITH_PLAN_EDIT
  .filter((type) => type !== 'plan_edit');

const constraintSql = (types) => `
  ALTER TABLE coach_action_proposals
    ADD CONSTRAINT coach_action_proposals_proposal_type_check
    CHECK (proposal_type IN (${types.map((type) => `'${type}'`).join(',')}))`;

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE coach_action_proposals DROP CONSTRAINT IF EXISTS coach_action_proposals_proposal_type_check',
    );
    await queryInterface.sequelize.query(constraintSql(TYPES_WITH_PLAN_EDIT));
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE coach_action_proposals DROP CONSTRAINT IF EXISTS coach_action_proposals_proposal_type_check',
    );
    await queryInterface.sequelize.query(constraintSql(TYPES_WITHOUT_PLAN_EDIT));
  },
};
