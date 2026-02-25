#!/usr/bin/env node
import { Sequelize } from 'sequelize';

const DATABASE_URL = process.env.DATABASE_URL;
const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

try {
  await sequelize.authenticate();

  // Get all tables (case-sensitive names)
  const [tables] = await sequelize.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
  );
  console.log('=== ALL TABLES ===');
  for (const t of tables) {
    console.log('  ' + t.tablename);
  }

  // For each table that might have user references, check columns
  const candidates = tables.map(t => t.tablename).filter(n =>
    !n.startsWith('pg_') && n !== 'SequelizeMeta'
  );

  console.log('\n=== USER FK COLUMNS ===');
  for (const tbl of candidates) {
    const [cols] = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND (column_name ILIKE '%user%' OR column_name ILIKE '%client%' OR column_name ILIKE '%trainer%' OR column_name = 'orderId')",
      { bind: [tbl] }
    );
    if (cols.length > 0) {
      const colNames = cols.map(c => c.column_name).join(', ');
      console.log('  ' + tbl + ': ' + colNames);
    }
  }
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await sequelize.close();
}
