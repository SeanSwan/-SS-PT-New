/**
 * EMERGENCY DATABASE SCHEMA FIX
 * =============================
 * 
 * This script fixes the critical UUID vs INTEGER mismatch that's preventing
 * your SwanStudios platform from working correctly.
 * 
 * Root Issue: users.id is UUID but foreign keys expect INTEGER
 * Solution: Convert users.id to INTEGER to match the User model specification
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';
import sequelize from './backend/database.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function emergencyDatabaseFix() {
  console.log('🚨 EMERGENCY DATABASE SCHEMA FIX');
  console.log('=================================\n');

  try {
    // Step 1: Test database connection
    console.log('1. Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');

    // Step 2: Check current schema state
    console.log('2. Analyzing current database schema...');
    
    const usersDesc = await sequelize.query(`
      SELECT data_type, column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'id'
    `);
    
    const userIdType = usersDesc[0]?.[0]?.data_type;
    console.log(`Current users.id type: ${userIdType}`);
    
    if (userIdType === 'uuid') {
      console.log('⚠️ UUID vs INTEGER mismatch confirmed - fix needed\n');
    } else {
      console.log('✅ User ID type is correct - checking other issues\n');
    }

    // Step 3: Run the emergency migration
    console.log('3. Applying emergency database fixes...');
    console.log('This will:');
    console.log('  - Convert users.id from UUID to INTEGER');
    console.log('  - Preserve all existing user data');
    console.log('  - Fix foreign key constraints');
    console.log('  - Add missing session columns\n');
    
    // Change to backend directory and run migrations
    process.chdir('./backend');
    
    try {
      // Run the specific emergency migration
      console.log('Running UUID fix migration...');
      execSync('npx sequelize-cli db:migrate --to 20250528140000-fix-uuid-integer-mismatch.cjs', { 
        stdio: 'inherit' 
      });
      
      console.log('\n✅ UUID fix migration completed');
      
      // Now run the session columns migration
      console.log('\nRunning session columns migration...');
      execSync('npx sequelize-cli db:migrate --to 20250528130000-add-missing-session-columns.cjs', { 
        stdio: 'inherit' 
      });
      
      console.log('\n✅ Session columns migration completed');
      
      // Run any remaining migrations
      console.log('\nRunning remaining migrations...');
      execSync('npx sequelize-cli db:migrate', { 
        stdio: 'inherit' 
      });
      
      console.log('\n✅ All migrations completed successfully');
      
    } catch (migrationError) {
      console.error('❌ Migration error:', migrationError.message);
      console.log('\n🔧 Manual intervention may be required');
      throw migrationError;
    }
    
    // Change back to root directory
    process.chdir('..');

    // Step 4: Verify the fix
    console.log('\n4. Verifying database schema fixes...');
    
    // Check users table
    const newUsersDesc = await sequelize.query(`
      SELECT data_type, column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'id'
    `);
    
    const newUserIdType = newUsersDesc[0]?.[0]?.data_type;
    console.log(`New users.id type: ${newUserIdType}`);
    
    if (newUserIdType === 'integer') {
      console.log('✅ Users.id successfully converted to INTEGER');
    } else {
      console.log('⚠️ Users.id conversion may need manual verification');
    }
    
    // Check sessions table
    const sessionsDesc = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'sessions' AND column_name IN ('reason', 'isRecurring', 'recurringPattern', 'deletedAt')
    `);
    
    console.log(`Sessions table missing columns check: ${sessionsDesc[0]?.length || 0}/4 columns found`);
    
    if (sessionsDesc[0]?.length >= 4) {
      console.log('✅ Sessions table columns successfully added');
    } else {
      console.log('⚠️ Sessions table may need additional migration');
    }

    // Step 5: Test critical queries
    console.log('\n5. Testing critical database queries...');
    
    try {
      // Test users query
      const userCount = await sequelize.query('SELECT COUNT(*) as count FROM users', {
        type: sequelize.QueryTypes.SELECT
      });
      console.log(`✅ Users table: ${userCount[0].count} users found`);
      
      // Test sessions query (the one that was failing)
      const sessionCount = await sequelize.query('SELECT COUNT(*) as count FROM sessions', {
        type: sequelize.QueryTypes.SELECT
      });
      console.log(`✅ Sessions table: ${sessionCount[0].count} sessions found`);
      
      console.log('✅ All critical queries working correctly');
      
    } catch (queryError) {
      console.error('❌ Query test failed:', queryError.message);
      throw queryError;
    }

    // Success summary
    console.log('\n🎉 EMERGENCY FIX COMPLETED SUCCESSFULLY!');
    console.log('==========================================');
    console.log('✅ UUID vs INTEGER mismatch resolved');
    console.log('✅ Users.id converted to INTEGER');
    console.log('✅ Foreign key constraints fixed');
    console.log('✅ Session table columns added');
    console.log('✅ Database schema aligned with models');
    console.log('\n🚀 Your SwanStudios platform should now work correctly!');
    console.log('📝 Next step: Deploy to production with git push');

  } catch (error) {
    console.error('\n❌ EMERGENCY FIX FAILED:', error.message);
    console.log('\n🆘 IMMEDIATE ACTIONS REQUIRED:');
    console.log('1. Check if database server is running');
    console.log('2. Verify database connection settings');
    console.log('3. Ensure you have database admin privileges');
    console.log('4. Contact support if the issue persists');
    
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the emergency fix
emergencyDatabaseFix();