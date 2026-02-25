#!/usr/bin/env node
import db from '../database.mjs';
import User from '../models/User.mjs';

try {
  await db.authenticate();
  const users = await User.findAll({
    attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'username'],
    order: [['id', 'ASC']]
  });
  console.log('=== ALL USERS ===');
  console.log('ID | Name | Email | Role | Username');
  console.log('-'.repeat(90));
  for (const u of users) {
    console.log(u.id + ' | ' + u.firstName + ' ' + u.lastName + ' | ' + u.email + ' | ' + u.role + ' | ' + u.username);
  }
  console.log('\nTotal: ' + users.length + ' users');
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await db.close();
}
