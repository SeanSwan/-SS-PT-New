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

(async () => {
  try {
    // Check specific tables
    const tablesToCheck = ['workout_sessions', 'WorkoutPlans', 'WorkoutPlanDays', 'workout_exercises', 'muscle_groups'];
    console.log('Checking specific tables:');

    for (const tableName of tablesToCheck) {
      const [exists] = await sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = '${tableName}'
        )
      `);
      const existsBool = exists[0].exists;
      console.log(`  - ${tableName}: ${existsBool ? '✅ EXISTS' : '❌ MISSING'}`);
    }

    // Also check all tables
    const [allTables] = await sequelize.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log('\nAll tables in database:');
    allTables.forEach(row => {
      console.log(`  - ${row.table_name || row}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
})();