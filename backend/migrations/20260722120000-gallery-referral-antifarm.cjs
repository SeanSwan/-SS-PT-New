'use strict';

/**
 * Gallery referral anti-farming (hostile-survey fix #1, 2026-07-22).
 * Additive + safe: adds a normalized-phone column, backfills it from the existing referral_phone, and creates
 * a PARTIAL unique index on (visitor_id, event_id, referral_phone_norm). This kills the fake-formatting dedup
 * bypass at the DB level; the per-visitor lifetime CREDIT cap is enforced in the route. No data is deleted;
 * down() fully reverses. Partial index (WHERE norm IS NOT NULL) tolerates any legacy row the backfill missed.
 */
module.exports = {
  async up(queryInterface) {
    const sql = queryInterface.sequelize;
    await sql.query(`ALTER TABLE gallery_referrals ADD COLUMN IF NOT EXISTS referral_phone_norm VARCHAR(20);`);
    await sql.query(
      `UPDATE gallery_referrals
          SET referral_phone_norm = regexp_replace(referral_phone, '\\D', '', 'g')
        WHERE referral_phone_norm IS NULL;`,
    );
    await sql.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_gallery_referral_dedup
         ON gallery_referrals (visitor_id, event_id, referral_phone_norm)
         WHERE referral_phone_norm IS NOT NULL;`,
    );
  },

  async down(queryInterface) {
    const sql = queryInterface.sequelize;
    await sql.query(`DROP INDEX IF EXISTS uq_gallery_referral_dedup;`);
    await sql.query(`ALTER TABLE gallery_referrals DROP COLUMN IF EXISTS referral_phone_norm;`);
  },
};
