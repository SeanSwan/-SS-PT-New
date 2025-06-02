// Fix for sessions.cancelledBy UUID vs INTEGER mismatch
// ====================================================

// CRITICAL: Load environment variables first
require('dotenv').config({ path: './.env' });

const { Sequelize } = require('sequelize');
const config = require('./backend/config/config.cjs').development;

async function fixCancelledByColumn() {
  const sequelize = new Sequelize(config.database, config.username, config.password, config);
  
  try {
    console.log('🔧 FIXING sessions.cancelledBy UUID vs INTEGER MISMATCH');
    console.log('=' .repeat(60));
    console.log('');
    
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    console.log('');
    
    // Check current cancelledBy column type
    console.log('🔍 Checking sessions.cancelledBy column type...');
    const [cancelledByInfo] = await sequelize.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' AND column_name = 'cancelledBy'
    `);
    
    if (cancelledByInfo.length > 0) {
      console.log(`Current sessions.cancelledBy type: ${cancelledByInfo[0].data_type}`);
      
      if (cancelledByInfo[0].data_type === 'uuid') {
        console.log('🔧 Converting sessions.cancelledBy from UUID to INTEGER...');
        
        // Remove existing foreign key constraint if it exists
        console.log('🗑️ Removing existing foreign key constraint...');
        await sequelize.query('ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_cancelledBy_fkey;');
        
        // Clear any existing data that might cause issues
        console.log('🧹 Clearing cancelledBy data...');
        await sequelize.query('UPDATE sessions SET "cancelledBy" = NULL;');
        
        // Drop and recreate the column as INTEGER
        console.log('🔄 Converting column type...');
        await sequelize.query('ALTER TABLE sessions DROP COLUMN "cancelledBy";');
        await sequelize.query('ALTER TABLE sessions ADD COLUMN "cancelledBy" INTEGER;');
        
        // Create the foreign key constraint
        console.log('🔗 Creating foreign key constraint...');
        await sequelize.query(`
          ALTER TABLE sessions 
          ADD CONSTRAINT sessions_cancelledBy_fkey 
          FOREIGN KEY ("cancelledBy") REFERENCES users(id) 
          ON UPDATE CASCADE ON DELETE SET NULL;
        `);
        
        console.log('✅ sessions.cancelledBy successfully converted to INTEGER');
      } else {
        console.log('✅ sessions.cancelledBy is already INTEGER type');
      }
    } else {
      console.log('⚠️ sessions.cancelledBy column not found');
    }
    
    // Check for any other UUID columns that might need fixing
    console.log('');
    console.log('🔍 Checking for other UUID columns in sessions table...');
    const [allColumns] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' 
      AND data_type = 'uuid'
      AND column_name != 'id'
    `);
    
    if (allColumns.length > 0) {
      console.log('⚠️ Found other UUID columns that may need conversion:');
      allColumns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
      console.log('');
      console.log('💡 These columns may need to be converted to INTEGER if they reference users.id');
    } else {
      console.log('✅ No other UUID columns found in sessions table');
    }
    
    console.log('');
    console.log('🎉 CANCELLED-BY COLUMN FIX COMPLETED!');
    console.log('✅ UUID vs INTEGER mismatch resolved');
    console.log('🚀 Ready to retry migrations');
    
    return true;
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the fix
fixCancelledByColumn()
  .then(success => {
    if (success) {
      console.log('');
      console.log('🎊 SUCCESS! cancelledBy column fixed!');
      console.log('');
      console.log('📋 Next steps:');
      console.log('1. cd backend');
      console.log('2. npx sequelize-cli db:migrate');
      console.log('3. npm run dev');
    }
  })
  .catch(error => {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  });
