// test-db-connection.mjs
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

// Test different common PostgreSQL configurations
const testConfigs = [
  {
    name: 'Config defaults',
    username: process.env.PG_USER || 'swanadmin',
    password: process.env.PG_PASSWORD || 'postgres',
    database: process.env.PG_DB || 'swanstudios',
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432
  },
  {
    name: 'Common postgres user',
    username: 'postgres',
    password: 'postgres',
    database: 'swanstudios',
    host: 'localhost',
    port: 5432
  },
  {
    name: 'Empty password',
    username: 'swanadmin',
    password: '',
    database: 'swanstudios',
    host: 'localhost',
    port: 5432
  }
];

async function testConnection(config) {
  const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
      host: config.host,
      port: config.port,
      dialect: 'postgres',
      logging: false
    }
  );

  try {
    await sequelize.authenticate();
    console.log(`✅ ${config.name}: Connection successful!`);
    console.log(`   Username: ${config.username}, Database: ${config.database}`);
    
    // Test if storefront_items table exists
    const tables = await sequelize.getQueryInterface().showAllTables();
    if (tables.includes('storefront_items')) {
      const [results] = await sequelize.query('SELECT COUNT(*) as count FROM storefront_items');
      console.log(`   Found storefront_items table with ${results[0].count} items`);
    }
    
    await sequelize.close();
    return true;
  } catch (error) {
    console.log(`❌ ${config.name}: ${error.message}`);
    await sequelize.close();
    return false;
  }
}

async function main() {
  console.log('Testing PostgreSQL connections...\n');
  
  for (const config of testConfigs) {
    const success = await testConnection(config);
    if (success) {
      console.log('\n✅ Found working configuration!');
      console.log('To update your .env file, add these lines:');
      console.log(`PG_USER=${config.username}`);
      console.log(`PG_PASSWORD=${config.password}`);
      console.log(`PG_DB=${config.database}`);
      console.log(`PG_HOST=${config.host}`);
      console.log(`PG_PORT=${config.port}`);
      break;
    }
    console.log('');
  }
}

main();
