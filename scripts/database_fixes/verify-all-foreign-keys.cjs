// Comprehensive Foreign Key Verification
// ====================================

const { Sequelize } = require('sequelize');
const config = require('./backend/config/config.cjs').development;

async function verifyAllForeignKeys() {
  const sequelize = new Sequelize(config.database, config.username, config.password, config);
  
  try {
    console.log('🔍 COMPREHENSIVE FOREIGN KEY VERIFICATION');
    console.log('=' .repeat(50));
    console.log('');
    
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    console.log('');
    
    // Check users.id type (should be INTEGER)
    console.log('📋 1. Checking users.id type...');
    const [usersInfo] = await sequelize.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id'
    `);
    
    if (usersInfo.length > 0) {
      console.log(`✅ users.id: ${usersInfo[0].data_type}`);
    } else {
      console.log('❌ users.id not found');
      return false;
    }
    
    // Check all columns in sessions table that might reference users
    console.log('');
    console.log('📋 2. Checking sessions table foreign key columns...');
    const [sessionsColumns] = await sequelize.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' 
      AND (column_name = 'userId' OR column_name = 'cancelledBy' OR column_name = 'trainerId')
      ORDER BY column_name
    `);
    
    const expectedType = usersInfo[0].data_type;
    let allMatch = true;
    
    sessionsColumns.forEach(col => {
      const matches = col.data_type === expectedType;
      const status = matches ? '✅' : '❌';
      console.log(`${status} sessions.${col.column_name}: ${col.data_type} ${matches ? '(MATCHES)' : '(MISMATCH!)'}`)
      if (!matches) allMatch = false;
    });
    
    // Check current foreign key constraints
    console.log('');
    console.log('📋 3. Checking existing foreign key constraints...');
    const [constraints] = await sequelize.query(`
      SELECT 
        conname as constraint_name,
        confrelid::regclass as referenced_table,
        a.attname as local_column,
        af.attname as referenced_column
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
      JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
      WHERE c.conrelid = 'sessions'::regclass 
      AND c.contype = 'f'
      ORDER BY conname
    `);
    
    if (constraints.length > 0) {
      console.log('✅ Foreign key constraints found:');
      constraints.forEach(constraint => {
        console.log(`   - ${constraint.constraint_name}: sessions.${constraint.local_column} -> ${constraint.referenced_table}.${constraint.referenced_column}`);
      });
    } else {
      console.log('⚠️ No foreign key constraints found on sessions table');
    }
    
    // Check Enhanced Social Media tables
    console.log('');
    console.log('📋 4. Checking Enhanced Social Media Platform deployment...');
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
        console.log(`   - ${table.table_name}`);
      });
    } else {
      console.log('⚠️ Enhanced Social Media tables not yet deployed');
    }
    
    // Summary
    console.log('');
    console.log('🎯 VERIFICATION SUMMARY');
    console.log('=' .repeat(30));
    
    const usersIdExists = usersInfo.length > 0;
    const sessionsColumnsExist = sessionsColumns.length > 0;
    const foreignKeysExist = constraints.length > 0;
    const socialMediaDeployed = socialTables.length > 0;
    
    console.log(`✅ users.id exists: ${usersIdExists}`);
    console.log(`✅ sessions foreign key columns exist: ${sessionsColumnsExist}`);
    console.log(`✅ All column types match: ${allMatch}`);
    console.log(`✅ Foreign key constraints exist: ${foreignKeysExist}`);
    console.log(`✅ Enhanced Social Media deployed: ${socialMediaDeployed}`);
    
    if (usersIdExists && sessionsColumnsExist && allMatch && foreignKeysExist) {
      console.log('');
      console.log('🎉 ALL FOREIGN KEY CONSTRAINTS PROPERLY CONFIGURED!');
      console.log('🚀 System ready for production deployment');
      
      if (socialMediaDeployed) {
        console.log('🌟 Enhanced Social Media Platform successfully deployed!');
      }
      
      return true;
    } else {
      console.log('');
      console.log('⚠️ Some foreign key issues remain');
      
      if (!allMatch) {
        console.log('🔧 Action needed: Fix column type mismatches');
      }
      if (!foreignKeysExist) {
        console.log('🔧 Action needed: Create missing foreign key constraints');
      }
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  } finally {
    await sequelize.close();
  }
}

// Run verification
verifyAllForeignKeys().then(success => {
  if (success) {
    console.log('');
    console.log('🎊 SUCCESS! All foreign key constraints verified!');
    console.log('');
    console.log('🚀 Ready to start development:');
    console.log('1. cd backend && npm run dev');
    console.log('2. Test Enhanced Social Media features');
    console.log('3. Deploy to production');
  } else {
    console.log('');
    console.log('🔧 Additional fixes needed');
    console.log('Run: FIX-REMAINING-UUID-MISMATCH.bat');
  }
}).catch(error => {
  console.error('💥 Verification script error:', error);
});
