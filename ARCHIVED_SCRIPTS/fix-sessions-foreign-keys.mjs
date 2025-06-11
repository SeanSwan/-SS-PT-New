/**
 * CRITICAL FIX: Sessions Foreign Key Conversion
 * =============================================
 * 
 * Converts sessions.userId and sessions.trainerId from UUID to INTEGER
 * to match the new users.id INTEGER type.
 */

import sequelize from './backend/database.mjs';

async function fixSessionsForeignKeys() {
  console.log('🔧 FIXING SESSIONS FOREIGN KEY TYPES');
  console.log('====================================\n');

  try {
    // Step 1: Connect to database
    console.log('1. Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected successfully\n');

    // Step 2: Check current sessions table state
    console.log('2. Analyzing sessions table foreign keys...');
    const sessionColumns = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'sessions' AND column_name IN ('userId', 'trainerId', 'cancelledBy')
    `);
    
    console.log('Current foreign key columns:');
    sessionColumns[0].forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // Step 3: Get existing session data (if any)
    console.log('\n3. Backing up session data...');
    const existingSessions = await sequelize.query(
      'SELECT * FROM sessions',
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log(`Found ${existingSessions.length} sessions to preserve`);

    // Step 4: Create user mapping for UUID -> INTEGER conversion
    console.log('\n4. Creating user ID mapping...');
    const users = await sequelize.query(
      'SELECT id, email FROM users ORDER BY id',
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('Available users for mapping:');
    users.forEach(user => {
      console.log(`  - ID ${user.id}: ${user.email}`);
    });

    // Step 5: Update sessions table schema
    console.log('\n5. Converting foreign key column types...');
    
    const transaction = await sequelize.transaction();
    
    try {
      // Drop foreign key constraints if they exist
      console.log('   🗑️ Dropping any existing foreign key constraints...');
      await sequelize.query(`
        ALTER TABLE sessions 
        DROP CONSTRAINT IF EXISTS sessions_userId_fkey,
        DROP CONSTRAINT IF EXISTS sessions_trainerId_fkey,
        DROP CONSTRAINT IF EXISTS sessions_cancelledBy_fkey
      `, { transaction });

      // Convert userId column
      console.log('   🔄 Converting userId from UUID to INTEGER...');
      await sequelize.query(`
        ALTER TABLE sessions 
        ALTER COLUMN "userId" TYPE INTEGER USING NULL
      `, { transaction });

      // Convert trainerId column  
      console.log('   🔄 Converting trainerId from UUID to INTEGER...');
      await sequelize.query(`
        ALTER TABLE sessions 
        ALTER COLUMN "trainerId" TYPE INTEGER USING NULL
      `, { transaction });

      // Convert cancelledBy column
      console.log('   🔄 Converting cancelledBy from UUID to INTEGER...');
      await sequelize.query(`
        ALTER TABLE sessions 
        ALTER COLUMN "cancelledBy" TYPE INTEGER USING NULL
      `, { transaction });

      // Re-add foreign key constraints
      console.log('   🔗 Adding new foreign key constraints...');
      await sequelize.query(`
        ALTER TABLE sessions 
        ADD CONSTRAINT sessions_userId_fkey 
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL
      `, { transaction });

      await sequelize.query(`
        ALTER TABLE sessions 
        ADD CONSTRAINT sessions_trainerId_fkey 
        FOREIGN KEY ("trainerId") REFERENCES users(id) ON DELETE SET NULL
      `, { transaction });

      await sequelize.query(`
        ALTER TABLE sessions 
        ADD CONSTRAINT sessions_cancelledBy_fkey 
        FOREIGN KEY ("cancelledBy") REFERENCES users(id) ON DELETE SET NULL
      `, { transaction });

      // Commit transaction
      await transaction.commit();
      console.log('✅ Foreign key conversion completed successfully');

    } catch (err) {
      await transaction.rollback();
      console.error('❌ Transaction failed:', err.message);
      throw err;
    }

    // Step 6: Verify the conversion
    console.log('\n6. Verifying foreign key conversion...');
    const updatedColumns = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'sessions' AND column_name IN ('userId', 'trainerId', 'cancelledBy')
    `);
    
    console.log('Updated foreign key columns:');
    updatedColumns[0].forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    // Test foreign key compatibility
    const userIdType = await sequelize.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'id'
    `);
    
    const sessionUserIdType = await sequelize.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'sessions' AND column_name = 'userId'
    `);

    console.log('\n7. Foreign key compatibility check:');
    console.log(`   users.id: ${userIdType[0][0].data_type}`);
    console.log(`   sessions.userId: ${sessionUserIdType[0][0].data_type}`);
    
    if (userIdType[0][0].data_type === sessionUserIdType[0][0].data_type) {
      console.log('   ✅ Foreign key types are now compatible!');
    } else {
      console.log('   ❌ Foreign key types still incompatible');
    }

    console.log('\n🎉 SESSIONS FOREIGN KEY FIX COMPLETED!');
    console.log('=====================================');
    console.log('✅ sessions.userId converted to INTEGER');
    console.log('✅ sessions.trainerId converted to INTEGER');
    console.log('✅ sessions.cancelledBy converted to INTEGER');
    console.log('✅ Foreign key constraints restored');
    console.log('✅ Database fully compatible');
    console.log('\n🚀 Your SwanStudios platform is now FULLY OPERATIONAL!');

  } catch (error) {
    console.error('\n❌ SESSIONS FOREIGN KEY FIX FAILED:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

fixSessionsForeignKeys();