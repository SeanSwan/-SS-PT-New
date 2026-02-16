#!/usr/bin/env node
/**
 * promote-owners.mjs
 * One-time script to promote owner accounts to admin role.
 *
 * Usage:
 *   DATABASE_URL=<conn_string> node backend/scripts/promote-owners.mjs
 *   -- or --
 *   node backend/scripts/promote-owners.mjs <DATABASE_URL>
 *
 * Safe to run multiple times — skips accounts already set to admin.
 */
import { Sequelize } from 'sequelize';

const DATABASE_URL = process.env.DATABASE_URL || process.argv[2];
if (!DATABASE_URL) {
  console.error('Set DATABASE_URL env var or pass as argument');
  process.exit(1);
}

const OWNER_EMAILS = [
  'ogpswan@yahoo.com',
  'loveswanstudios@protonmail.com',
];

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false,
});

try {
  await sequelize.authenticate();
  console.log('Connected to database.\n');

  for (const email of OWNER_EMAILS) {
    const [rows] = await sequelize.query(
      'SELECT id, "firstName", "lastName", email, role FROM "Users" WHERE email = :email',
      { replacements: { email } }
    );

    if (rows.length === 0) {
      console.log(`[SKIP] ${email} — account not found in database`);
      continue;
    }

    const user = rows[0];
    if (user.role === 'admin') {
      console.log(`[OK]   ${email} — already admin (id=${user.id})`);
      continue;
    }

    await sequelize.query(
      'UPDATE "Users" SET role = \'admin\' WHERE id = :id',
      { replacements: { id: user.id } }
    );
    console.log(`[DONE] ${email} — promoted from "${user.role}" to "admin" (id=${user.id})`);
  }

  console.log('\nFinished.');
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
} finally {
  await sequelize.close();
}
