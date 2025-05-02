// run-migrations.mjs
// A script to handle running migrations with better error handling

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('========== MIGRATION SCRIPT ==========');
console.log('Working directory:', rootDir);

// Create SequelizeMeta table if it doesn't exist
const createMetaTable = async () => {
  console.log('Checking if SequelizeMeta table exists and creating if necessary...');
  
  const { Sequelize } = await import('sequelize');
  const { default: dbConfig } = await import('../config/config.js');
  
  const config = dbConfig.development;
  const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
      host: config.host,
      port: config.port || 5432,
      dialect: 'postgres',
      logging: console.log
    }
  );
  
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    const [results] = await sequelize.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'SequelizeMeta')"
    );
    
    const tableExists = results[0].exists;
    if (!tableExists) {
      console.log('SequelizeMeta table does not exist. Creating it...');
      await sequelize.query(`
        CREATE TABLE "SequelizeMeta" (
          "name" VARCHAR(255) NOT NULL,
          PRIMARY KEY ("name")
        )
      `);
      console.log('SequelizeMeta table created.');
    } else {
      console.log('SequelizeMeta table already exists.');
      
      // Check if table has content
      const [results] = await sequelize.query('SELECT COUNT(*) FROM "SequelizeMeta"');
      const count = parseInt(results[0].count, 10);
      
      if (count > 0) {
        console.log(`SequelizeMeta table has ${count} entries.`);
        console.log('Clearing SequelizeMeta table to start fresh...');
        await sequelize.query('DELETE FROM "SequelizeMeta"');
        console.log('SequelizeMeta table cleared.');
      } else {
        console.log('SequelizeMeta table is empty.');
      }
    }
    
    await sequelize.close();
    return true;
  } catch (error) {
    console.error('Unable to connect to the database or set up meta table:', error);
    return false;
  }
};

// Run sequelize migrations using spawn
const runMigrations = () => {
  return new Promise((resolve, reject) => {
    console.log('Running migrations...');
    
    const migrationProcess = spawn('npx', [
      'sequelize-cli',
      'db:migrate',
      '--config', 'config/config.js',
      '--migrations-path', 'migrations',
      '--models-path', 'models',
      '--env', 'development',
      '--debug'
    ], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true
    });
    
    migrationProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Migrations completed successfully!');
        resolve();
      } else {
        console.error(`Migration process exited with code ${code}`);
        reject(new Error(`Migration process exited with code ${code}`));
      }
    });
    
    migrationProcess.on('error', (err) => {
      console.error('Error running migrations:', err);
      reject(err);
    });
  });
};

// Main function
const main = async () => {
  try {
    // Step 1: Set up meta table
    const metaSetup = await createMetaTable();
    if (!metaSetup) {
      throw new Error('Failed to set up SequelizeMeta table');
    }
    
    // Step 2: Run migrations
    await runMigrations();
    
    console.log('Database migration process completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration process failed:', error);
    process.exit(1);
  }
};

// Run the script
main();
