#!/usr/bin/env node
import { Sequelize } from 'sequelize';

// Usage:
//   DATABASE_URL=<url> node unlock-user.mjs <username>
//   node unlock-user.mjs <database_url> <username>

let databaseUrl;
let targetUser;

if (process.env.DATABASE_URL) {
  // Env var mode: DATABASE_URL=<url> node unlock-user.mjs <username>
  databaseUrl = process.env.DATABASE_URL;
  targetUser = process.argv[2];
} else if (process.argv.length >= 4) {
  // Positional mode: node unlock-user.mjs <database_url> <username>
  databaseUrl = process.argv[2];
  targetUser = process.argv[3];
} else {
  console.error('Usage: DATABASE_URL=<url> node unlock-user.mjs <username>');
  console.error('   or: node unlock-user.mjs <database_url> <username>');
  process.exit(1);
}

if (!targetUser) {
  console.error('Error: username is required.');
  console.error('Usage: DATABASE_URL=<url> node unlock-user.mjs <username>');
  process.exit(1);
}

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

try {
  await sequelize.authenticate();
  console.log('Connected to database.');

  // Check current lock status
  const [users] = await sequelize.query(
    `SELECT id, username, email, "isLocked", "failedLoginAttempts" FROM "Users" WHERE username = :username OR email = :username`,
    { replacements: { username: targetUser } }
  );

  if (users.length === 0) {
    console.error(`User "${targetUser}" not found.`);
    process.exit(1);
  }

  const user = users[0];
  console.log(`Found user: ${user.username} (${user.email})`);
  console.log(`  isLocked: ${user.isLocked}`);
  console.log(`  failedLoginAttempts: ${user.failedLoginAttempts}`);

  if (!user.isLocked && (user.failedLoginAttempts || 0) === 0) {
    console.log('Account is already unlocked.');
    process.exit(0);
  }

  // Unlock
  await sequelize.query(
    `UPDATE "Users" SET "isLocked" = false, "failedLoginAttempts" = 0 WHERE id = :id`,
    { replacements: { id: user.id } }
  );

  console.log(`Account unlocked successfully.`);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
} finally {
  await sequelize.close();
}
