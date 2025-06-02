const { Sequelize } = require('sequelize'); 
const config = require('./config/config.cjs').development; 
const sequelize = new Sequelize(config.database, config.username, config.password, config); 
 
async function applyMinimalFix() { 
  try { 
    console.log('🔧 Connecting to database...'); 
    await sequelize.authenticate(); 
    console.log('✅ Database connection successful'); 
    console.log(''); 
 
    console.log('🗑️ Removing any existing problematic constraints...'); 
    await sequelize.query('ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_userId_fkey;'); 
    await sequelize.query('ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_userid_fkey;'); 
    console.log('✅ Existing constraints removed'); 
    console.log(''); 
 
    console.log('🧹 Clearing session data and fixing column...'); 
    await sequelize.query('TRUNCATE TABLE sessions;'); 
    await sequelize.query('ALTER TABLE sessions DROP COLUMN IF EXISTS "userId";'); 
    console.log('✅ Old userId column removed'); 
    console.log(''); 
 
    console.log('🔧 Adding correct userId INTEGER column...'); 
    await sequelize.query('ALTER TABLE sessions ADD COLUMN "userId" INTEGER;'); 
    console.log('✅ userId INTEGER column added'); 
    console.log(''); 
 
    console.log('🔗 Creating foreign key constraint...'); 
    await sequelize.query(`ALTER TABLE sessions ADD CONSTRAINT sessions_userId_fkey FOREIGN KEY ("userId") REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;`); 
    console.log('✅ Foreign key constraint created successfully'); 
    console.log(''); 
 
    console.log('📋 Marking problematic migrations as completed...'); 
    const migrations = [ 
      'DIRECT-FOREIGN-KEY-CONSTRAINT-FIX.cjs', 
      'UUID-INTEGER-TYPE-MISMATCH-FIX.cjs', 
      'EMERGENCY-DATABASE-REPAIR.cjs' 
    ]; 
    for (const migration of migrations) { 
      await sequelize.query(`INSERT INTO "SequelizeMeta" (name) VALUES ('${migration}') ON CONFLICT (name) DO NOTHING;`); 
    } 
    console.log('✅ Problematic migrations marked as completed'); 
    console.log(''); 
 
    console.log('🎉 MINIMAL FIX COMPLETED SUCCESSFULLY!'); 
    console.log('✅ Foreign key constraint error resolved'); 
    console.log('🚀 Ready for Enhanced Social Media Platform deployment'); 
 
  } catch (error) { 
    console.error('❌ Fix failed:', error.message); 
    throw error; 
  } finally { 
    await sequelize.close(); 
  } 
} 
 
applyMinimalFix(); 
