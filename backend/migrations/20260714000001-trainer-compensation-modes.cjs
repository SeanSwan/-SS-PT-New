'use strict';

/**
 * Migration: Employed-Trainer Compensation Modes
 * ==============================================
 * Implements mode (b) of the trainer revenue model (dashboard audit
 * 2026-07-13 §7.3): employed trainers paid a flat per-session rate
 * (~$50) while the client pays full price.
 *
 * 1. client_trainer_assignments gains:
 *    - compensation_mode  'revenue_share' (default, today's behavior)
 *                         | 'per_session_flat'
 *    - flat_session_rate  DECIMAL(10,2), required by service logic when
 *                         mode = per_session_flat
 * 2. trainer_commissions gains the per-session earning lane:
 *    - order_id becomes nullable (flat earnings have no order)
 *    - session_id (nullable, unique when set — idempotency anchor so a
 *      session can never accrue twice)
 *    - earning_type 'purchase_share' (default) | 'session_flat'
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('client_trainer_assignments', 'compensation_mode', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'revenue_share',
      comment: 'revenue_share (percentage at purchase) | per_session_flat (employed, $/completed session)'
    });

    await queryInterface.addColumn('client_trainer_assignments', 'flat_session_rate', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Flat $ paid to trainer per completed session when compensation_mode=per_session_flat'
    });

    await queryInterface.changeColumn('trainer_commissions', 'order_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Order for purchase_share earnings; null for session_flat earnings'
    });

    await queryInterface.addColumn('trainer_commissions', 'session_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Completed session for session_flat earnings (idempotency anchor)'
    });

    await queryInterface.addColumn('trainer_commissions', 'earning_type', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'purchase_share',
      comment: 'purchase_share (rev-share at purchase) | session_flat (employed per-session)'
    });

    await queryInterface.addIndex('trainer_commissions', ['session_id'], {
      name: 'idx_trainer_commissions_session_id_unique',
      unique: true,
      where: { session_id: { [Sequelize.Op.ne]: null } }
    });

    console.log('✅ Trainer compensation modes: columns + unique session index added');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('trainer_commissions', 'idx_trainer_commissions_session_id_unique');
    await queryInterface.removeColumn('trainer_commissions', 'earning_type');
    await queryInterface.removeColumn('trainer_commissions', 'session_id');
    // Restore NOT NULL only when no null rows exist — otherwise down() would
    // be permanently un-runnable once session_flat earnings accumulate.
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM trainer_commissions WHERE order_id IS NULL) THEN
          ALTER TABLE trainer_commissions ALTER COLUMN order_id SET NOT NULL;
        ELSE
          RAISE NOTICE 'order_id has NULL rows - skipping SET NOT NULL';
        END IF;
      END $$;
    `);
    await queryInterface.removeColumn('client_trainer_assignments', 'flat_session_rate');
    await queryInterface.removeColumn('client_trainer_assignments', 'compensation_mode');
    console.log('✅ Reverted trainer compensation modes');
  }
};
