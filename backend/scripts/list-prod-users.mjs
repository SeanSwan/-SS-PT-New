#!/usr/bin/env node
import { Sequelize, DataTypes } from 'sequelize';

import { assertDevDatabaseUrlAllowed } from '../utils/devDatabaseUrlGuard.mjs';
const DATABASE_URL = process.env.DATABASE_URL || process.argv[2];
if (!DATABASE_URL) {
  console.error('Set DATABASE_URL env var or pass as argument');
  process.exit(1);
}

// H-06: this script builds its own connection and bypasses database.mjs —

// enforce the same guard so a hosted DATABASE_URL from a non-production

// context is an explicit act, never a silent one.

assertDevDatabaseUrlAllowed('list-prod-users');

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

try {
  await sequelize.authenticate();
  const [users] = await sequelize.query(
    'SELECT id, "firstName", "lastName", email, role, username FROM "Users" ORDER BY id ASC'
  );
  console.log('=== PRODUCTION USERS ===');
  console.log('ID | Name | Email | Role');
  console.log('-'.repeat(90));
  for (const u of users) {
    console.log(u.id + ' | ' + u.firstName + ' ' + u.lastName + ' | ' + u.email + ' | ' + u.role);
  }
  console.log('\nTotal: ' + users.length + ' users');
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await sequelize.close();
}
