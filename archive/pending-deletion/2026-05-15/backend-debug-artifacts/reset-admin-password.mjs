/**
 * Reset admin password utility
 * Usage: node reset-admin-password.mjs "YourNewPasswordHere"
 */
import { Sequelize } from 'sequelize';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const newPassword = process.argv[2];
if (!newPassword || newPassword.length < 8) {
  console.log('Usage: node reset-admin-password.mjs "YourNewPasswordHere"');
  console.log('Password must be at least 8 characters.');
  process.exit(1);
}

const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres', logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

const hash = await bcrypt.hash(newPassword, 12);
await seq.query('UPDATE "Users" SET password = :hash WHERE username = \'SeanSwan\'', { replacements: { hash } });
const [users] = await seq.query('SELECT password FROM "Users" WHERE username = \'SeanSwan\'');
const match = await bcrypt.compare(newPassword, users[0].password);
console.log(match ? '✅ Password updated successfully for SeanSwan' : '❌ Verification failed');
await seq.close();
