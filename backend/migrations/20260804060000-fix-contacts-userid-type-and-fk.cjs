'use strict';

/**
 * Deep security/drift round 5 (SWA-115, 2026-08-04) — `contacts.userId` was a latent trap.
 *
 * The column is UUID and the model documents it as "UserID as foreign key to User model",
 * but `"Users".id` is INTEGER — the two can never join, and there is no FK constraint to
 * make the mismatch visible. Nothing writes it today (live-verified: 14 rows, 0 non-null),
 * so the bug is dormant: the first code that does the obvious thing —
 * `Contact.create({ ...contactData, userId: req.user.id })` — gets
 * `invalid input syntax for type uuid` and 500s the PUBLIC contact form (lead funnel).
 *
 * Lossless by construction: every existing value is NULL, so `USING NULL` discards nothing.
 * Fail-closed: refuses if any non-null value appears between audit and deploy.
 */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const [t] = await queryInterface.sequelize.query(
        `SELECT to_regclass('public.contacts') AS t`, { transaction });
      if (!t?.[0]?.t) {
        console.log('[contacts-fk] contacts table absent — skip');
        await transaction.commit();
        return;
      }

      const [col] = await queryInterface.sequelize.query(
        `SELECT udt_name FROM information_schema.columns
         WHERE table_schema='public' AND table_name='contacts' AND column_name='userId'`,
        { transaction });
      if (!col?.[0]) {
        console.log('[contacts-fk] contacts."userId" absent — skip');
        await transaction.commit();
        return;
      }
      if (col[0].udt_name === 'int4') {
        console.log('[contacts-fk] already INTEGER — skip (idempotent)');
        await transaction.commit();
        return;
      }

      const [nonNull] = await queryInterface.sequelize.query(
        `SELECT count(*)::int AS n FROM contacts WHERE "userId" IS NOT NULL`, { transaction });
      if (nonNull[0].n > 0) {
        throw new Error(
          `[contacts-fk] REFUSED: ${nonNull[0].n} row(s) hold a non-null uuid "userId"; ` +
          'converting would destroy them. Map them to integer ids by hand first.');
      }

      await queryInterface.sequelize.query(
        `ALTER TABLE contacts ALTER COLUMN "userId" TYPE integer USING NULL`, { transaction });
      await queryInterface.sequelize.query(
        `ALTER TABLE contacts
           ADD CONSTRAINT contacts_userId_fkey FOREIGN KEY ("userId")
           REFERENCES "Users"(id) ON UPDATE CASCADE ON DELETE SET NULL`, { transaction });
      console.log('[contacts-fk] contacts."userId" -> INTEGER + FK to "Users"(id)');

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  // Reverting to UUID would re-create the trap and cannot preserve integer ids.
  // Drop only the constraint; leave the (correct) integer type in place.
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_userId_fkey`);
    console.log('[contacts-fk] rollback: FK dropped; column intentionally left INTEGER');
  },
};
