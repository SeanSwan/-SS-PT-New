'use strict';

/**
 * Launch Control — register the `postSaveHandoff` flag (Convergence v1 follow-up, 2026-07-21).
 * Adds the workout-completion proof-card surface to the admin flag board
 * (/dashboard/admin/launch-control) so Sean can flip it with no redeploy.
 * Env baseline stays ENABLE_POST_SAVE_HANDOFF (launchControlResolve.envBaseline);
 * this row only makes the switch VISIBLE on the board. Idempotent.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      INSERT INTO flags (flag, label, grp, parent_flag) VALUES
        ('postSaveHandoff', 'Workout completion proof card', 'feature', NULL)
      ON CONFLICT (flag) DO NOTHING;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DELETE FROM flag_overrides WHERE flag = 'postSaveHandoff';`);
    await queryInterface.sequelize.query(`DELETE FROM flags WHERE flag = 'postSaveHandoff';`);
  },
};
