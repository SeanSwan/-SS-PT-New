import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(projectRootDir, '.env') });

const sequelize = new Sequelize(
  process.env.PG_DB || 'swanstudios',
  process.env.PG_USER || 'swanadmin',
  process.env.PG_PASSWORD || 'Hollywood1980',
  {
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function checkTables() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    const [results] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('\n📋 Tables in database:');
    results.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Check for specific missing tables
    const missingTables = [
      'Users', 'Achievements', 'WorkoutPlans', 'WorkoutSessions',
      'MuscleGroups', 'Equipment', 'WorkoutPlanDays', 'WorkoutExercises'
    ];

    console.log('\n🔍 Checking for missing parent tables:');
    for (const table of missingTables) {
      const [exists] = await sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = '${table.toLowerCase()}'
        )
      `);
      const existsBool = exists[0].exists;
      console.log(`  - ${table}: ${existsBool ? '✅ EXISTS' : '❌ MISSING'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkTables();