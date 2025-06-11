// Quick Foreign Key Fix Test
// =========================

// CRITICAL: Load environment variables first
require('dotenv').config({ path: './.env' });

const { Sequelize } = require('sequelize');

async function testAndFixForeignKey() {
  console.log('🔧 QUICK FOREIGN KEY FIX TEST');
  console.log('=' .repeat(40));
  console.log('');
  
  // Load config after environment is loaded
  const config = require('./backend/config/config.cjs').development;
  
  console.log('📋 Testing database connection...');
  console.log(`Host: ${config.host}`);
  console.log(`Database: ${config.database}`);
  console.log(`Username: ${config.username}`);
  console.log(`Password: ${config.password ? '***SET***' : 'NOT SET'}`);
  console.log('');
  
  const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: config.dialect,
    port: config.port,
    logging: false
  });
  
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    console.log('');
    
    // Now fix the cancelledBy column
    console.log('🔧 Converting sessions.cancelledBy from UUID to INTEGER...');
    
    // Remove existing constraint
    await sequelize.query('ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_cancelledBy_fkey;');
    console.log('✅ Removed existing constraints');
    
    // Clear data and convert column
    await sequelize.query('UPDATE sessions SET "cancelledBy" = NULL;');
    await sequelize.query('ALTER TABLE sessions DROP COLUMN "cancelledBy";');
    await sequelize.query('ALTER TABLE sessions ADD COLUMN "cancelledBy" INTEGER;');
    console.log('✅ Converted cancelledBy to INTEGER');
    
    // Create foreign key constraint
    await sequelize.query(`
      ALTER TABLE sessions 
      ADD CONSTRAINT sessions_cancelledBy_fkey 
      FOREIGN KEY ("cancelledBy") REFERENCES users(id) 
      ON UPDATE CASCADE ON DELETE SET NULL;
    `);
    console.log('✅ Created foreign key constraint');
    
    console.log('');
    console.log('🎉 FOREIGN KEY FIX COMPLETED SUCCESSFULLY!');
    console.log('✅ sessions.cancelledBy now properly references users.id');
    
    await sequelize.close();
    return true;
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    await sequelize.close();
    return false;
  }
}

// Run the test and fix
testAndFixForeignKey()
  .then((success) => {
    if (success) {
      console.log('');
      console.log('🚀 Ready for Enhanced Social Media Platform deployment!');
      console.log('Next steps:');
      console.log('1. cd backend');
      console.log('2. npx sequelize-cli db:migrate');
      console.log('3. npm run dev');
    } else {
      console.log('');
      console.log('❌ Foreign key fix failed');
      console.log('Check the error message above');
    }
  })
  .catch((error) => {
    console.error('💥 Script error:', error.message);
  });
