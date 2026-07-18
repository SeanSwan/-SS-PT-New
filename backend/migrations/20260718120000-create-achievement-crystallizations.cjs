'use strict';

/**
 * Dashboards v2 (Slice-3) — achievement_crystallizations.
 *
 * Records that a user "crystallized" an achievement (the Crystallize moment) and under which world.
 * ADDITIVE, reversible-by-design: `down` is a NO-OP (per KIMI-DASHBOARDS §6.3 — never drop; crystallizations
 * persist across a v2 flag flip so re-enabling loses no data). FKs reference the PascalCase canonical tables
 * ("Users", "Achievements") per the dual users/"Users" gotcha. Idempotency via UNIQUE(userId, achievementId).
 * PII: userId is the numeric id only — no names/emails stored here.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT to_regclass('public.achievement_crystallizations') AS t`,
        { transaction },
      );
      if (existing?.[0]?.t) {
        await transaction.commit();
        return; // already created — idempotent migration
      }

      await queryInterface.createTable(
        'achievement_crystallizations',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false,
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'Users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          achievementId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'Achievements', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          worldKey: {
            type: Sequelize.STRING(64),
            allowNull: false,
            defaultValue: 'default',
          },
          crystallizedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW'),
          },
          createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
          updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        },
        { transaction },
      );

      await queryInterface.addConstraint('achievement_crystallizations', {
        fields: ['userId', 'achievementId'],
        type: 'unique',
        name: 'achievement_crystallizations_user_achievement_unique',
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  // Reversibility is by feature flag, NOT by dropping this table (§6.3). Down is intentionally a no-op.
  async down() {
    return Promise.resolve();
  },
};
