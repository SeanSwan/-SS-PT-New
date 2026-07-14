'use strict';

/**
 * Migration: Per-Trainer Default Compensation
 * ===========================================
 * Trainer-level defaults on "Users" (camelCase columns, matching the
 * table's convention). New client-trainer assignments inherit these when
 * the admin doesn't specify compensation explicitly, so an employed
 * trainer doesn't need per-assignment setup for every new client.
 *
 * Steps are individually guarded (DO blocks) so safe-migrate's
 * whole-migration "already exists" stamping can never half-apply.
 */

module.exports = {
  async up(queryInterface) {
    const sql = (q) => queryInterface.sequelize.query(q);

    await sql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'Users' AND column_name = 'defaultCompensationMode') THEN
          ALTER TABLE "Users" ADD COLUMN "defaultCompensationMode" VARCHAR(20) NOT NULL DEFAULT 'revenue_share';
        END IF;
      END $$;
    `);

    await sql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'Users' AND column_name = 'defaultFlatSessionRate') THEN
          ALTER TABLE "Users" ADD COLUMN "defaultFlatSessionRate" DECIMAL(10,2) NULL;
        END IF;
      END $$;
    `);

    console.log('✅ Users: default compensation columns added');
  },

  async down(queryInterface) {
    const sql = (q) => queryInterface.sequelize.query(q);
    await sql(`ALTER TABLE "Users" DROP COLUMN IF EXISTS "defaultFlatSessionRate"`);
    await sql(`ALTER TABLE "Users" DROP COLUMN IF EXISTS "defaultCompensationMode"`);
    console.log('✅ Users: default compensation columns removed');
  }
};
