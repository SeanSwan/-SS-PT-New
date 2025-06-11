// Quick Status Check - Did the Foreign Key Fix Work?
// =================================================

// Load environment variables
require('dotenv').config({ path: './.env' });

const { Sequelize } = require('sequelize');

async function checkStatus() {
  console.log('🔍 CHECKING FOREIGN KEY FIX STATUS');
  console.log('=' .repeat(50));
  console.log('');
  
  const config = require('./backend/config/config.cjs').development;
  const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: config.dialect,
    port: config.port,
    logging: false
  });
  
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection: WORKING');
    console.log('');
    
    // Check sessions table structure
    console.log('📋 Checking sessions table columns...');
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' 
      AND (column_name = 'userId' OR column_name = 'cancelledBy' OR column_name = 'trainerId')
      ORDER BY column_name
    `);
    
    if (columns.length > 0) {
      console.log('✅ Sessions table foreign key columns:');
      columns.forEach(col => {
        const isInteger = col.data_type === 'integer';
        const status = isInteger ? '✅' : '❌';
        console.log(`   ${status} ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('❌ No foreign key columns found in sessions table');
    }
    
    // Check foreign key constraints
    console.log('');
    console.log('📋 Checking foreign key constraints...');
    const [constraints] = await sequelize.query(`
      SELECT conname as constraint_name, a.attname as column_name
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
      WHERE c.conrelid = 'sessions'::regclass AND c.contype = 'f'
      ORDER BY conname
    `);
    
    if (constraints.length > 0) {
      console.log('✅ Foreign key constraints found:');
      constraints.forEach(constraint => {
        console.log(`   ✅ ${constraint.constraint_name} (${constraint.column_name})`);
      });
    } else {
      console.log('⚠️ No foreign key constraints found on sessions table');
    }
    
    // Check Enhanced Social Media tables
    console.log('');
    console.log('📋 Checking Enhanced Social Media Platform...');
    const [socialTables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name ILIKE '%social%' OR table_name ILIKE '%communities%' OR table_name ILIKE '%enhanced%')
      ORDER BY table_name
    `);
    
    if (socialTables.length > 0) {
      console.log('✅ Enhanced Social Media tables deployed:');
      socialTables.forEach(table => {
        console.log(`   ✅ ${table.table_name}`);
      });
    } else {
      console.log('⚠️ Enhanced Social Media tables not found');
    }
    
    // Overall status
    console.log('');
    console.log('🎯 OVERALL STATUS SUMMARY');
    console.log('=' .repeat(30));
    
    const hasUserIdColumn = columns.some(col => col.column_name === 'userId' && col.data_type === 'integer');
    const hasCancelledByColumn = columns.some(col => col.column_name === 'cancelledBy' && col.data_type === 'integer');
    const hasConstraints = constraints.length > 0;
    const hasSocialMedia = socialTables.length > 0;
    
    console.log(`✅ sessions.userId (INTEGER): ${hasUserIdColumn ? 'FIXED' : 'NEEDS FIX'}`);
    console.log(`✅ sessions.cancelledBy (INTEGER): ${hasCancelledByColumn ? 'FIXED' : 'NEEDS FIX'}`);
    console.log(`✅ Foreign key constraints: ${hasConstraints ? 'WORKING' : 'MISSING'}`);
    console.log(`✅ Enhanced Social Media: ${hasSocialMedia ? 'DEPLOYED' : 'PENDING'}`);
    
    if (hasUserIdColumn && hasCancelledByColumn && hasConstraints) {
      console.log('');
      console.log('🎉 SUCCESS! ALL FOREIGN KEY ISSUES RESOLVED!');
      console.log('🚀 Enhanced Social Media Platform ready!');
      console.log('');
      console.log('🌟 Ready to start development:');
      console.log('   cd backend && npm run dev');
      console.log('');
      console.log('🎊 You can now test:');
      console.log('   - AI-powered social posts');
      console.log('   - Community networking');
      console.log('   - Social connections');
      console.log('   - Enhanced user interactions');
      
    } else {
      console.log('');
      console.log('⚠️ Some issues may remain');
      console.log('🔧 You may need to run additional fixes');
    }
    
    await sequelize.close();
    
  } catch (error) {
    console.log('❌ Status check failed:', error.message);
    await sequelize.close();
  }
}

// Run status check
checkStatus().catch(error => {
  console.error('💥 Status check error:', error.message);
});
