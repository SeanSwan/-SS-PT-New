// backend/scripts/setup-sqlite-fallback.mjs
import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.dirname(__dirname);

// Create SQLite database path
const sqlitePath = path.join(backendDir, 'data', 'swanstudios.sqlite');

async function setupSQLiteFallback() {
  console.log('🔄 Setting up SQLite fallback database...\n');
  
  // Ensure data directory exists
  const dataDir = path.dirname(sqlitePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✅ Created data directory');
  }
  
  // Create SQLite connection
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: sqlitePath,
    logging: (msg) => console.log(`[SQLite]: ${msg}`),
  });
  
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ SQLite connection established successfully');
    
    // Create backup of current database.mjs
    const databaseFilePath = path.join(backendDir, 'database.mjs');
    const backupPath = path.join(backendDir, 'database.mjs.backup');
    
    if (fs.existsSync(databaseFilePath) && !fs.existsSync(backupPath)) {
      fs.copyFileSync(databaseFilePath, backupPath);
      console.log('✅ Created backup of database.mjs');
    }
    
    // Create temporary SQLite database configuration
    const sqliteConfig = `/**
 * Swan Studios - SQLite Fallback Database Configuration
 * ====================================================
 * TEMPORARY CONFIGURATION - Switch back to PostgreSQL when available
 */

import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlitePath = path.join(__dirname, 'data', 'swanstudios.sqlite');

console.log('⚠️  Using SQLite fallback - Install PostgreSQL for production');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: sqlitePath,
  logging: (msg) => console.log(\`[SQLite]: \${msg}\`),
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// Export Sequelize Op (operators)
export const Op = Sequelize.Op;

export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ SQLite database connection established');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to SQLite database:', error.message);
    return false;
  }
};

// Test connection when this module is imported
testConnection();

export default sequelize;
`;
    
    // Write temporary SQLite configuration
    fs.writeFileSync(databaseFilePath, sqliteConfig);
    console.log('✅ SQLite configuration applied');
    
    console.log('\n✨ SQLite fallback setup complete!');
    console.log(`📍 Database file: ${sqlitePath}`);
    console.log('\n⚡ Next steps:');
    console.log('1. Run: npm install sqlite3');
    console.log('2. Start your server: npm run dev');
    console.log('3. After installing PostgreSQL, restore with: mv database.mjs.backup database.mjs');
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error setting up SQLite:', error);
    throw error;
  }
}

setupSQLiteFallback().catch(console.error);