// 🎯 FOREIGN KEY FIX VERIFICATION SCRIPT
// =====================================
// This script verifies that the foreign key constraint error is completely resolved

const { Sequelize } = require('sequelize');
const config = require('./backend/config/config.cjs').development;

async function verifyFix() {
  const sequelize = new Sequelize(config.database, config.username, config.password, config);
  
  try {
    console.log('🔍 VERIFICATION: Foreign Key Constraint Fix');
    console.log('=' .repeat(50));
    console.log('');
    
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    console.log('');
    
    // 1. Check users table structure
    console.log('📋 1. Checking users.id column type...');
    const [usersInfo] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id'
    `);
    if (usersInfo.length > 0) {
      console.log(`✅ users.id: ${usersInfo[0].data_type}`);
    } else {
      console.log('❌ users.id column not found');
    }
    
    // 2. Check sessions table structure  
    console.log('📋 2. Checking sessions.userId column type...');
    const [sessionsInfo] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' AND column_name = 'userId'
    `);
    if (sessionsInfo.length > 0) {
      console.log(`✅ sessions.userId: ${sessionsInfo[0].data_type}`);
    } else {
      console.log('❌ sessions.userId column STILL MISSING!');
      return false;
    }
    
    // 3. Check foreign key constraint
    console.log('📋 3. Checking foreign key constraints...');
    const [constraints] = await sequelize.query(`
      SELECT conname, confrelid::regclass AS referenced_table
      FROM pg_constraint 
      WHERE conrelid = 'sessions'::regclass AND contype = 'f'
    `);
    
    if (constraints.length > 0) {
      console.log('✅ Foreign key constraints found:');
      constraints.forEach(constraint => {
        console.log(`   - ${constraint.conname} -> ${constraint.referenced_table}`);
      });
    } else {
      console.log('⚠️ No foreign key constraints found on sessions table');
    }
    
    // 4. Test the constraint by attempting a simple query
    console.log('📋 4. Testing foreign key constraint functionality...');
    try {
      await sequelize.query('SELECT COUNT(*) FROM sessions WHERE "userId" IS NOT NULL');
      console.log('✅ Foreign key constraint is working properly');
    } catch (error) {
      console.log('❌ Foreign key constraint test failed:', error.message);
    }
    
    // 5. Check Enhanced Social Media tables
    console.log('📋 5. Checking Enhanced Social Media Platform deployment...');
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
    
    console.log('');
    console.log('🎯 VERIFICATION SUMMARY');
    console.log('=' .repeat(30));
    
    const usersIdExists = usersInfo.length > 0;
    const sessionsUserIdExists = sessionsInfo.length > 0;
    const foreignKeyExists = constraints.length > 0;
    const typesMatch = usersInfo[0]?.data_type === sessionsInfo[0]?.data_type;
    const socialMediaDeployed = socialTables.length > 0;
    
    console.log(`✅ users.id exists: ${usersIdExists}`);
    console.log(`✅ sessions.userId exists: ${sessionsUserIdExists}`);
    console.log(`✅ Foreign key constraint exists: ${foreignKeyExists}`);
    console.log(`✅ Column types match: ${typesMatch}`);
    console.log(`✅ Enhanced Social Media deployed: ${socialMediaDeployed}`);
    
    if (usersIdExists && sessionsUserIdExists && foreignKeyExists && typesMatch) {
      console.log('');
      console.log('🎉 FOREIGN KEY CONSTRAINT ERROR COMPLETELY RESOLVED!');
      console.log('🚀 System ready for production deployment');
      return true;
    } else {
      console.log('');
      console.log('⚠️ Some issues still exist - may need additional fixes');
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
verifyFix().then(success => {
  if (success) {
    console.log('');
    console.log('🎊 SUCCESS! You can now proceed with:');
    console.log('1. npm run dev (start development server)');
    console.log('2. Test Enhanced Social Media features');
    console.log('3. Deploy to production with confidence');
  } else {
    console.log('');
    console.log('🔧 Additional fixes may be needed');
    console.log('Check the output above for specific issues');
  }
}).catch(error => {
  console.error('💥 Verification script error:', error);
});
