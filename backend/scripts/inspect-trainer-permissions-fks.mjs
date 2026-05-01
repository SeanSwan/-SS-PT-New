#!/usr/bin/env node
import 'dotenv/config';
import sequelize from '../database.mjs';

async function main() {
  await sequelize.authenticate();
  const [fks] = await sequelize.query(
    `SELECT
       tc.constraint_name,
       kcu.column_name,
       ccu.table_name AS foreign_table_name,
       ccu.column_name AS foreign_column_name
     FROM information_schema.table_constraints AS tc
     JOIN information_schema.key_column_usage AS kcu
       ON tc.constraint_name = kcu.constraint_name
     JOIN information_schema.constraint_column_usage AS ccu
       ON ccu.constraint_name = tc.constraint_name
     WHERE tc.table_name = 'trainer_permissions' AND tc.constraint_type = 'FOREIGN KEY'`
  );
  console.log('FKs on trainer_permissions:');
  console.log(JSON.stringify(fks, null, 2));

  // Check whether user 98 exists in lowercase users vs PascalCase Users
  const [usersLower] = await sequelize.query(`SELECT id, email FROM users WHERE id = 98 LIMIT 1`).catch(() => [[]]);
  const [usersPascal] = await sequelize.query(`SELECT id, email FROM "Users" WHERE id = 98 LIMIT 1`).catch(() => [[]]);
  console.log(`\nuser 98 in lowercase 'users': ${usersLower.length > 0 ? 'FOUND' : 'NOT FOUND'}`);
  console.log(`user 98 in PascalCase '"Users"': ${usersPascal.length > 0 ? 'FOUND' : 'NOT FOUND'}`);

  await sequelize.close();
}
main().catch((e) => { console.error(e?.message || e); process.exit(1); });
