'use strict';

/**
 * Creates `locations` — the first-class facility entity for the gym-operations spine (SWA-74).
 *
 * WHY: everything gym-operational (classes, memberships, check-ins, door access, reporting) scopes
 * to a physical site. Before this, `sessions.location` was free text, which cannot be joined,
 * filtered, or reported on, and makes multi-site impossible.
 *
 * ADDITIVE AND REVERSIBLE BY DESIGN: `sessions.locationId` is added as a NULLABLE FK alongside the
 * existing free-text `sessions.location`, which is deliberately left untouched. Existing rows keep
 * working with locationId = NULL. Backfill is a separate later migration, so this one can be rolled
 * back without touching any pre-existing data.
 *
 * `opensAt`/`closesAt` are nullable wall-clock strings consumed by a later door-access slice.
 * NULL means "no hours restriction" — an explicit allow, not an accident.
 *
 * FK target is the PascalCase `"Users"` table where relevant (none here yet); a stale lowercase
 * `users` table exists in production and must never be referenced.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('locations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      name: { type: Sequelize.STRING(150), allowNull: false },
      slug: { type: Sequelize.STRING(150), allowNull: false },
      addressLine1: { type: Sequelize.STRING(255), allowNull: true },
      addressLine2: { type: Sequelize.STRING(255), allowNull: true },
      city: { type: Sequelize.STRING(100), allowNull: true },
      region: { type: Sequelize.STRING(100), allowNull: true },
      postalCode: { type: Sequelize.STRING(20), allowNull: true },
      country: { type: Sequelize.STRING(2), allowNull: false, defaultValue: 'US' },
      phone: { type: Sequelize.STRING(50), allowNull: true },
      timezone: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: 'America/Los_Angeles',
        comment: 'IANA zone. Class start times are stored as local wall-clock + this zone.',
      },
      opensAt: {
        type: Sequelize.STRING(5),
        allowNull: true,
        comment: "Wall-clock 'HH:mm' in this location's timezone. NULL = no hours restriction.",
      },
      closesAt: {
        type: Sequelize.STRING(5),
        allowNull: true,
        comment: "Wall-clock 'HH:mm' in this location's timezone. NULL = no hours restriction.",
      },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      metadata: { type: Sequelize.JSONB, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      deletedAt: { type: Sequelize.DATE, allowNull: true },
    });

    // Partial unique: a soft-deleted location must not block reusing its slug.
    await queryInterface.addIndex('locations', ['slug'], {
      name: 'locations_slug_unique_active',
      unique: true,
      where: { deletedAt: null },
    });
    await queryInterface.addIndex('locations', ['isActive'], { name: 'locations_isActive' });

    await queryInterface.addColumn('sessions', 'locationId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'locations', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('sessions', ['locationId'], { name: 'sessions_locationId' });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('sessions', 'sessions_locationId');
    await queryInterface.removeColumn('sessions', 'locationId');
    await queryInterface.dropTable('locations');
  },
};
