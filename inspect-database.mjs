/**
 * DATABASE INSPECTION TOOL
 * =========================
 * 
 * This script analyzes the current database state in detail
 * to understand exactly what needs to be fixed.
 */

import sequelize from './backend/database.mjs';

async function inspectDatabase() {
  console.log('🔍 DATABASE INSPECTION TOOL');
  console.log('============================\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // 1. Check users table structure
    console.log('1. USERS TABLE ANALYSIS:');
    console.log('========================');
    
    const usersExists = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      )
    `);
    
    if (usersExists[0][0].exists) {
      // Get users table structure
      const usersStructure = await sequelize.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);
      
      console.log('Users table columns:');
      usersStructure[0].forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      
      // Check users.id specifically
      const userIdInfo = usersStructure[0].find(col => col.column_name === 'id');
      console.log(`\n⚠️ CRITICAL: users.id is ${userIdInfo?.data_type?.toUpperCase()} type`);
      
      // Get sample user data
      const sampleUsers = await sequelize.query('SELECT * FROM users LIMIT 2', {
        type: sequelize.QueryTypes.SELECT
      });
      
      console.log(`\nSample user data (${sampleUsers.length} users found):`);
      sampleUsers.forEach((user, i) => {
        console.log(`  User ${i + 1}:`);
        console.log(`    id: ${user.id} (${typeof user.id})`);
        console.log(`    email: ${user.email}`);
        console.log(`    role: ${user.role}`);
        console.log(`    created: ${user.createdAt}`);
      });
      
    } else {
      console.log('❌ Users table does not exist!');
    }

    // 2. Check sessions table structure
    console.log('\n\n2. SESSIONS TABLE ANALYSIS:');
    console.log('============================');
    
    const sessionsExists = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'sessions'
      )
    `);
    
    if (sessionsExists[0][0].exists) {
      const sessionsStructure = await sequelize.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'sessions'
        ORDER BY ordinal_position
      `);
      
      console.log('Sessions table columns:');
      sessionsStructure[0].forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
      
      // Check for missing columns
      const sessionColumns = sessionsStructure[0].map(col => col.column_name);
      const requiredSessionColumns = ['reason', 'isRecurring', 'recurringPattern', 'deletedAt'];
      const missingSessionColumns = requiredSessionColumns.filter(col => !sessionColumns.includes(col));
      
      if (missingSessionColumns.length > 0) {
        console.log(`\n⚠️ Missing session columns: ${missingSessionColumns.join(', ')}`);
      } else {
        console.log('\n✅ All required session columns present');
      }
      
      // Check foreign key columns
      const userIdCol = sessionsStructure[0].find(col => col.column_name === 'userId');
      const trainerIdCol = sessionsStructure[0].find(col => col.column_name === 'trainerId');
      
      if (userIdCol) {
        console.log(`sessions.userId type: ${userIdCol.data_type}`);
      }
      if (trainerIdCol) {
        console.log(`sessions.trainerId type: ${trainerIdCol.data_type}`);
      }
      
    } else {
      console.log('❌ Sessions table does not exist!');
    }

    // 3. Check foreign key constraints
    console.log('\n\n3. FOREIGN KEY CONSTRAINTS:');
    console.log('============================');
    
    const foreignKeys = await sequelize.query(`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (ccu.table_name = 'users' OR tc.table_name LIKE '%user%')
    `);
    
    if (foreignKeys[0].length > 0) {
      console.log('Foreign key constraints involving users:');
      foreignKeys[0].forEach(fk => {
        console.log(`  ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } else {
      console.log('✅ No foreign key constraints found (they may have been dropped)');
    }

    // 4. Check migration state
    console.log('\n\n4. MIGRATION STATE:');
    console.log('===================');
    
    const migrationTableExists = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'SequelizeMeta'
      )
    `);
    
    if (migrationTableExists[0][0].exists) {
      const migrations = await sequelize.query(
        'SELECT name FROM "SequelizeMeta" ORDER BY name',
        { type: sequelize.QueryTypes.SELECT }
      );
      
      console.log(`Completed migrations (${migrations.length}):`);
      migrations.forEach(m => {
        console.log(`  - ${m.name}`);
      });
    } else {
      console.log('❌ SequelizeMeta table does not exist!');
    }

    // 5. Summary and recommendations
    console.log('\n\n5. SUMMARY & RECOMMENDATIONS:');
    console.log('==============================');
    
    if (usersExists[0][0].exists) {
      const userIdType = await sequelize.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'id'
      `);
      
      const idType = userIdType[0][0]?.data_type;
      
      if (idType === 'uuid') {
        console.log('❌ CRITICAL ISSUE: users.id is UUID, needs conversion to INTEGER');
        console.log('   Recommended action: Run robust UUID conversion fix');
      } else if (idType === 'integer') {
        console.log('✅ GOOD: users.id is INTEGER (correct type)');
      } else {
        console.log(`⚠️ UNUSUAL: users.id is ${idType} type`);
      }
    }
    
    if (sessionsExists[0][0].exists) {
      const sessionColumns = await sequelize.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'sessions'
      `);
      
      const cols = sessionColumns[0].map(col => col.column_name);
      const missing = ['reason', 'isRecurring', 'recurringPattern', 'deletedAt'].filter(col => !cols.includes(col));
      
      if (missing.length > 0) {
        console.log(`❌ ISSUE: Missing session columns: ${missing.join(', ')}`);
        console.log('   Recommended action: Add missing columns');
      } else {
        console.log('✅ GOOD: All session columns present');
      }
    }

    console.log('\n🎯 NEXT STEPS:');
    console.log('===============');
    
    const userIdType = await sequelize.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'id'
    `).then(r => r[0][0]?.data_type).catch(() => null);
    
    if (userIdType === 'uuid') {
      console.log('1. 🚨 CRITICAL: Run RUN-ROBUST-UUID-FIX.bat to convert UUID to INTEGER');
      console.log('2. Then test the platform functionality');
      console.log('3. Deploy to production if successful');
    } else if (userIdType === 'integer') {
      console.log('1. ✅ Users.id type is correct (INTEGER)');
      console.log('2. Check if session columns need to be added');
      console.log('3. Test platform functionality');
      console.log('4. Deploy to production if working');
    } else {
      console.log('1. ⚠️ Investigate unusual users.id type');
      console.log('2. May need custom database fix');
    }

  } catch (error) {
    console.error('❌ Inspection failed:', error.message);
  } finally {
    await sequelize.close();
  }
}

inspectDatabase();