import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './backend/.env' });

console.log('🔍 Checking sessions table structure...');

const sequelize = new Sequelize(
  process.env.PG_DB || 'swanstudios',
  process.env.PG_USER || 'swanadmin', 
  process.env.PG_PASSWORD || 'postgres',
  {
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function checkSessionsTable() {
  try {
    console.log('📡 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Check if sessions table exists
    const [tableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions'
      );
    `);
    
    if (!tableExists[0].exists) {
      console.log('❌ Sessions table does not exist');
      return;
    }
    
    console.log('✅ Sessions table exists');

    // Check all columns in sessions table
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Sessions table columns:');
    columns.forEach((col, index) => {
      const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(not null)';
      console.log(`  ${index + 1}. ${col.column_name} - ${col.data_type} ${nullable}`);
    });

    // Specifically check for deletedAt column
    const [deletedAtExists] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' 
      AND column_name = 'deletedAt';
    `);
    
    if (deletedAtExists.length > 0) {
      console.log('\n✅ deletedAt column EXISTS in sessions table');
    } else {
      console.log('\n❌ deletedAt column MISSING from sessions table');
      console.log('   This explains the "column Session.deletedAt does not exist" error');
    }

    // Check which migrations have been run
    const [migrationsRun] = await sequelize.query(`
      SELECT name FROM "SequelizeMeta" ORDER BY name;
    `);
    
    console.log('\n📝 Migrations that have been run:');
    const sessionsMigrations = migrationsRun.filter(m => 
      m.name.includes('session') || m.name.includes('deletedat')
    );
    
    if (sessionsMigrations.length > 0) {
      sessionsMigrations.forEach(migration => {
        console.log(`  ✓ ${migration.name}`);
      });
    } else {
      console.log('  ⚠️ No sessions-related migrations found in SequelizeMeta');
    }

    // Check total number of records in sessions table
    const [count] = await sequelize.query(`SELECT COUNT(*) as count FROM sessions;`);
    console.log(`\n📊 Total sessions records: ${count[0].count}`);

  } catch (error) {
    console.error('❌ Error checking sessions table:', error.message);
    if (error.message.includes('relation "sessions" does not exist')) {
      console.log('💡 The sessions table itself does not exist - run migrations first');
    }
  } finally {
    await sequelize.close();
  }
}

checkSessionsTable();