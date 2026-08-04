'use strict';

/**
 * SWA-105 Slice 8 — attendance log-back.
 * One JSONB column on bootcamp_class_log:
 *   attendance: {
 *     recordedAt: ISO string,
 *     attendees:  [{ userId: number } | { guest: string }],
 *     workoutFormIds: number[]   // the DailyWorkoutForm rows this created
 *   }
 * NULL = attendance never recorded. Presence = recorded exactly once — the
 * service treats a second submission as an idempotent no-op, which is why
 * this is one column and not a join table: the class is the unit of record,
 * and "who was there" is immutable history once written.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('bootcamp_class_log');
    if (!table.attendance) {
      await queryInterface.addColumn('bootcamp_class_log', 'attendance', {
        type: Sequelize.JSONB,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('bootcamp_class_log');
    if (table.attendance) {
      await queryInterface.removeColumn('bootcamp_class_log', 'attendance');
    }
  },
};
