#!/usr/bin/env node

/**
 * 🧹 Clean Duplicate Tables
 * =========================
 * 
 * Removes duplicate table names (users/Users, achievements/Achievements)
 * that are causing confusion in Sequelize
 */

import sequelize from './database.mjs';

console.log('🧹 Clean Duplicate Tables');
console.log('=========================\n');

async function cleanDuplicateTables() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');

    // Check what tables exist
    console.log('📋 Checking existing tables...');
    const [allTables] = await sequelize.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);

    console.log(`Found ${allTables.length} tables\n`);

    // Find case-sensitive duplicates
    const tableNames = allTables.map(t => t.tablename);
    const duplicatePairs = [];

    // Check for specific known duplicates
    const knownDuplicates = [
      { uppercase: 'Users', lowercase: 'users' },
      { uppercase: 'Achievements', lowercase: 'achievements' },
      { uppercase: 'WorkoutSessions', lowercase: 'workoutsessions' },
      { uppercase: 'WorkoutPlans', lowercase: 'workoutplans' },
      { uppercase: 'Exercises', lowercase: 'exercises' }
    ];

    knownDuplicates.forEach(({ uppercase, lowercase }) => {
      const hasUpper = tableNames.includes(uppercase);
      const hasLower = tableNames.includes(lowercase);
      
      if (hasUpper && hasLower) {
        duplicatePairs.push({ keep: uppercase, drop: lowercase });
        console.log(`⚠️ Duplicate found: "${uppercase}" and "${lowercase}"`);
      } else if (hasUpper) {
        console.log(`✅ Only "${uppercase}" exists (correct)`);
      } else if (hasLower) {
        console.log(`⚠️ Only "${lowercase}" exists (should be "${uppercase}")`);
      }
    });

    if (duplicatePairs.length === 0) {
      console.log('✅ No duplicate tables found to clean\n');
      return true;
    }

    console.log('\n🔧 CLEANING DUPLICATES:');
    console.log('=======================\n');

    for (const { keep, drop } of duplicatePairs) {
      try {
        console.log(`🗑️ Dropping table "${drop}"...`);
        
        // First, check if the table has any data
        const [rowCount] = await sequelize.query(`SELECT COUNT(*) as count FROM "${drop}"`);
        const count = parseInt(rowCount[0].count);
        
        if (count > 0) {
          console.log(`   ⚠️ Table "${drop}" has ${count} rows of data`);
          console.log(`   🔄 Migrating data to "${keep}" if needed...`);
          
          // Check if target table exists and has data
          try {
            const [targetCount] = await sequelize.query(`SELECT COUNT(*) as count FROM "${keep}"`);
            const targetRows = parseInt(targetCount[0].count);
            
            if (targetRows === 0 && count > 0) {
              console.log(`   📋 Copying data from "${drop}" to "${keep}"...`);
              await sequelize.query(`INSERT INTO "${keep}" SELECT * FROM "${drop}"`);
              console.log(`   ✅ ${count} rows copied`);
            } else {
              console.log(`   ℹ️ Target table "${keep}" already has ${targetRows} rows, skipping data copy`);
            }
          } catch (copyError) {
            console.log(`   ⚠️ Could not copy data: ${copyError.message}`);
            console.log(`   🛑 Skipping deletion of "${drop}" to preserve data`);
            continue;
          }
        }

        // Drop the duplicate table
        await sequelize.query(`DROP TABLE IF EXISTS "${drop}" CASCADE`);
        console.log(`   ✅ Table "${drop}" dropped successfully`);
        
      } catch (error) {
        console.log(`   ❌ Error dropping "${drop}": ${error.message}`);
        
        if (error.message.includes('does not exist')) {
          console.log(`   ℹ️ Table "${drop}" doesn't exist, nothing to clean`);
        } else {
          console.log(`   ⚠️ Keeping "${drop}" due to error`);
        }
      }
      
      console.log('');
    }

    // Verify cleanup
    console.log('✅ CLEANUP VERIFICATION:');
    console.log('========================\n');

    const [finalTables] = await sequelize.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('Users', 'users', 'Achievements', 'achievements', 'WorkoutSessions', 'workoutsessions')
      ORDER BY tablename;
    `);

    if (finalTables.length > 0) {
      console.log('Remaining tables:');
      finalTables.forEach(t => {
        const isCorrect = ['Users', 'Achievements', 'WorkoutSessions'].includes(t.tablename);
        console.log(`${isCorrect ? '✅' : '⚠️'} ${t.tablename}`);
      });
    } else {
      console.log('No target tables found (they may not exist yet)');
    }

    console.log('\n🎯 Results:');
    console.log(`Cleaned ${duplicatePairs.length} duplicate table pairs`);
    console.log('Database is now ready for clean Sequelize sync\n');

    return true;

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    return false;
  } finally {
    await sequelize.close();
  }
}

async function main() {
  console.log('🧹 Starting duplicate table cleanup...\n');
  
  const success = await cleanDuplicateTables();
  
  if (success) {
    console.log('✅ CLEANUP COMPLETED');
    console.log('====================');
    console.log('Database is ready for clean model sync');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('1. Run: npm run start');
    console.log('2. Check for 43/43 models loaded');
    console.log('3. Verify clean database sync');
  } else {
    console.log('❌ CLEANUP FAILED');
    console.log('==================');
    console.log('Check errors above and try manual cleanup if needed');
  }
}

main();
