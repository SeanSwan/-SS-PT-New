#!/usr/bin/env node
import { Sequelize, DataTypes } from 'sequelize';

const DATABASE_URL = process.env.DATABASE_URL || process.argv[2];
if (!DATABASE_URL) {
  console.error('Set DATABASE_URL env var or pass as argument');
  process.exit(1);
}

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
