// Database Connection Fix Helper
// =============================

const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

async function fixDatabaseConnection() {
  console.log('🔧 DATABASE CONNECTION FIX HELPER');
  console.log('=' .repeat(50));
  console.log('');
  
  // 1. Check current configuration
  console.log('📋 1. Analyzing current configuration...');
  
  const configPath = './backend/config/config.cjs';
  const envBackend = './backend/.env';
  const envRoot = './.env';
  
  console.log('Config file location:', configPath);
  console.log('Backend .env location:', envBackend);
  console.log('Root .env location:', envRoot);
  console.log('');
  
  // 2. Check which .env file exists and is being used
  console.log('📋 2. Checking environment file locations...');
  
  const backendEnvExists = fs.existsSync(envBackend);
  const rootEnvExists = fs.existsSync(envRoot);
  
  console.log(`Backend .env exists: ${backendEnvExists ? '✅ Yes' : '❌ No'}`);
  console.log(`Root .env exists: ${rootEnvExists ? '✅ Yes' : '❌ No'}`);
  
  // The config.cjs loads from '../.env' which means it's looking for .env in the root
  // But the .env file is in the backend directory
  
  if (backendEnvExists && !rootEnvExists) {
    console.log('');
    console.log('🔍 ISSUE FOUND: Environment file path mismatch');
    console.log('   - .env file exists in backend/ directory');
    console.log('   - config.cjs is looking for .env in root directory');
    console.log('   - This means environment variables are not being loaded!');
    console.log('');
    
    console.log('🔧 SOLUTION: Copy .env to root directory');
    try {
      const envContent = fs.readFileSync(envBackend, 'utf8');
      fs.writeFileSync(envRoot, envContent);
      console.log('✅ Successfully copied .env from backend/ to root directory');
      console.log('');
    } catch (error) {
      console.log('❌ Failed to copy .env file:', error.message);
      return false;
    }
  }
  
  // 3. Load configuration and check values
  console.log('📋 3. Loading configuration with environment variables...');
  
  // Clear require cache to reload with new env file
  delete require.cache[require.resolve('./backend/config/config.cjs')];
  
  let config;
  try {
    // Load dotenv manually to ensure it's loaded
    require('dotenv').config({ path: './.env' });
    config = require('./backend/config/config.cjs').development;
    
    console.log('✅ Configuration loaded successfully');
    console.log('');
    console.log('🔧 Database configuration values:');
    console.log(`   Host: ${config.host}`);
    console.log(`   Port: ${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   Username: ${config.username}`);
    console.log(`   Password: ${config.password ? '***SET***' : 'NOT SET'}`);
    console.log('');
    
  } catch (error) {
    console.log('❌ Error loading configuration:', error.message);
    return false;
  }
  
  // 4. Test connection
  console.log('📋 4. Testing database connection...');
  
  const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: config.dialect,
    port: config.port,
    logging: false
  });
  
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    console.log('🎉 Database connection issue resolved!');
    await sequelize.close();
    return true;
    
  } catch (error) {
    console.log('❌ Database connection still failing:', error.message);
    console.log('');
    
    // Provide PostgreSQL setup instructions
    console.log('🔧 POSTGRESQL SETUP REQUIRED');
    console.log('');
    console.log('The database connection is still failing. You need to:');
    console.log('');
    console.log('1. ENSURE POSTGRESQL IS RUNNING:');
    console.log('   - Start PostgreSQL service');
    console.log('   - Check if it\'s running on port 5432');
    console.log('');
    console.log('2. CREATE DATABASE AND USER:');
    console.log('   Connect to PostgreSQL as superuser and run:');
    console.log('');
    console.log('   CREATE USER swanadmin WITH PASSWORD \'Hollywood1980\';');
    console.log('   CREATE DATABASE swanstudios OWNER swanadmin;');
    console.log('   GRANT ALL PRIVILEGES ON DATABASE swanstudios TO swanadmin;');
    console.log('');
    console.log('3. OR USE EXISTING POSTGRESQL SETUP:');
    console.log('   Update the .env file with your existing database credentials');
    console.log('');
    
    await sequelize.close();
    return false;
  }
}

// Run the fix
fixDatabaseConnection()
  .then((success) => {
    console.log('');
    console.log('🎯 CONNECTION FIX SUMMARY');
    console.log('=' .repeat(30));
    
    if (success) {
      console.log('✅ Database connection is now working!');
      console.log('');
      console.log('🚀 Ready to run the foreign key fix:');
      console.log('1. node fix-cancelled-by-column.cjs');
      console.log('2. cd backend && npx sequelize-cli db:migrate');
      console.log('3. npm run dev');
    } else {
      console.log('❌ Database connection still needs manual setup');
      console.log('');
      console.log('📋 Next steps:');
      console.log('1. Set up PostgreSQL with the required user and database');
      console.log('2. Run this script again to test the connection');
      console.log('3. Once connection works, run the foreign key fix');
    }
  })
  .catch((error) => {
    console.error('💥 Fix script error:', error.message);
  });
