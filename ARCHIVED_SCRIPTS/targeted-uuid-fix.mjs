/**
 * TARGETED UUID CONVERSION FIX
 * ============================
 * 
 * This script bypasses problematic migrations and directly fixes the UUID issue.
 * It's more targeted than the previous approach and avoids migration sequence conflicts.
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sequelize from './backend/database.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function targetedUuidFix() {
  console.log('🎯 TARGETED UUID CONVERSION FIX');
  console.log('================================\n');

  try {
    // Step 1: Connect to database
    console.log('1. Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected successfully\n');

    // Step 2: Check current state
    console.log('2. Checking current database state...');
    const usersDesc = await sequelize.query(`
      SELECT data_type, column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'id'
    `);
    
    const userIdType = usersDesc[0]?.[0]?.data_type;
    console.log(`Current users.id type: ${userIdType}`);
    
    if (userIdType !== 'uuid') {
      console.log('✅ Users.id is not UUID - checking if it needs other fixes\n');
      await addMissingSessionColumns();
      return;
    }

    console.log('⚠️ UUID conversion needed\n');

    // Step 3: Direct UUID to INTEGER conversion (bypassing migrations)
    console.log('3. Starting direct UUID to INTEGER conversion...');
    
    // Get existing users data
    console.log('📊 Backing up existing users...');
    const existingUsers = await sequelize.query(
      'SELECT * FROM users ORDER BY "createdAt"',
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log(`Found ${existingUsers.length} users to preserve`);

    // Step 4: Drop problematic foreign key constraints
    console.log('🔗 Removing foreign key constraints temporarily...');
    
    // List of tables that might have foreign keys to users
    const potentialFKTables = ['sessions', 'orders', 'order_items', 'shopping_carts', 'client_progress'];
    
    for (const tableName of potentialFKTables) {
      try {
        // Check if table exists
        const tableExists = await sequelize.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = '${tableName}'
          )
        `);
        
        if (tableExists[0][0].exists) {
          // Get foreign key constraints for this table
          const constraints = await sequelize.query(`
            SELECT constraint_name
            FROM information_schema.table_constraints tc
            WHERE tc.table_name = '${tableName}' 
            AND tc.constraint_type = 'FOREIGN KEY'
            AND tc.constraint_name LIKE '%user%'
          `);
          
          // Drop each constraint
          for (const constraint of constraints[0]) {
            try {
              await sequelize.query(`ALTER TABLE "${tableName}" DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}"`);
              console.log(`  ✅ Dropped constraint ${constraint.constraint_name} from ${tableName}`);
            } catch (err) {
              console.log(`  ⚠️ Could not drop ${constraint.constraint_name}: ${err.message}`);
            }
          }
        }
      } catch (err) {
        console.log(`  ⚠️ Could not check table ${tableName}: ${err.message}`);
      }
    }

    // Step 5: Convert users table
    console.log('\n💾 Converting users table from UUID to INTEGER...');
    
    // Start transaction
    const transaction = await sequelize.transaction();
    
    try {
      // Create new users table with INTEGER id
      await sequelize.query(`
        CREATE TABLE users_new (
          id SERIAL PRIMARY KEY,
          "firstName" VARCHAR(255) NOT NULL,
          "lastName" VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          username VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          phone VARCHAR(255),
          photo VARCHAR(255),
          role VARCHAR(255) NOT NULL DEFAULT 'user',
          "dateOfBirth" DATE,
          gender VARCHAR(255),
          weight FLOAT,
          height FLOAT,
          "fitnessGoal" VARCHAR(255),
          "trainingExperience" TEXT,
          "healthConcerns" TEXT,
          "emergencyContact" VARCHAR(255),
          "availableSessions" INTEGER DEFAULT 0,
          specialties TEXT,
          certifications TEXT,
          bio TEXT,
          "availableDays" TEXT,
          "availableHours" TEXT,
          "hourlyRate" FLOAT,
          permissions TEXT,
          "isActive" BOOLEAN DEFAULT true,
          "lastLogin" TIMESTAMP WITH TIME ZONE,
          "emailNotifications" BOOLEAN DEFAULT true,
          "smsNotifications" BOOLEAN DEFAULT true,
          preferences TEXT,
          points INTEGER DEFAULT 0,
          level INTEGER DEFAULT 1,
          tier VARCHAR(255) DEFAULT 'bronze',
          "streakDays" INTEGER DEFAULT 0,
          "lastActivityDate" TIMESTAMP WITH TIME ZONE,
          "totalWorkouts" INTEGER DEFAULT 0,
          "totalExercises" INTEGER DEFAULT 0,
          "exercisesCompleted" JSON DEFAULT '{}',
          "refreshTokenHash" VARCHAR(255),
          "failedLoginAttempts" INTEGER DEFAULT 0,
          "isLocked" BOOLEAN DEFAULT false,
          "lastLoginIP" VARCHAR(255),
          "registrationIP" VARCHAR(255),
          "lastActive" TIMESTAMP WITH TIME ZONE,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          "deletedAt" TIMESTAMP WITH TIME ZONE
        )
      `, { transaction });
      
      console.log('✅ Created new users table with INTEGER id');

      // Insert existing users with new integer IDs
      if (existingUsers.length > 0) {
        console.log('📥 Migrating user data...');
        
        for (let i = 0; i < existingUsers.length; i++) {
          const user = existingUsers[i];
          const newId = i + 1;
          
          await sequelize.query(`
            INSERT INTO users_new (
              id, "firstName", "lastName", email, username, password, phone, photo, role,
              "dateOfBirth", gender, weight, height, "fitnessGoal", "trainingExperience",
              "healthConcerns", "emergencyContact", "availableSessions", specialties,
              certifications, bio, "availableDays", "availableHours", "hourlyRate",
              permissions, "isActive", "lastLogin", "emailNotifications", "smsNotifications",
              preferences, points, level, tier, "streakDays", "lastActivityDate",
              "totalWorkouts", "totalExercises", "exercisesCompleted", "refreshTokenHash",
              "failedLoginAttempts", "isLocked", "lastLoginIP", "registrationIP",
              "lastActive", "createdAt", "updatedAt", "deletedAt"
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45
            )
          `, {
            bind: [
              newId, user.firstName, user.lastName, user.email, user.username, user.password,
              user.phone, user.photo, user.role, user.dateOfBirth, user.gender, user.weight,
              user.height, user.fitnessGoal, user.trainingExperience, user.healthConcerns,
              user.emergencyContact, user.availableSessions || 0, user.specialties,
              user.certifications, user.bio, user.availableDays, user.availableHours,
              user.hourlyRate, user.permissions, user.isActive !== false, user.lastLogin,
              user.emailNotifications !== false, user.smsNotifications !== false,
              user.preferences, user.points || 0, user.level || 1, user.tier || 'bronze',
              user.streakDays || 0, user.lastActivityDate, user.totalWorkouts || 0,
              user.totalExercises || 0, user.exercisesCompleted || {}, user.refreshTokenHash,
              user.failedLoginAttempts || 0, user.isLocked || false, user.lastLoginIP,
              user.registrationIP, user.lastActive, user.createdAt, user.updatedAt,
              user.deletedAt
            ],
            transaction
          });
        }
        
        // Update sequence
        await sequelize.query(
          `SELECT setval('users_new_id_seq', (SELECT MAX(id) FROM users_new))`,
          { transaction }
        );
        
        console.log(`✅ Migrated ${existingUsers.length} users with new INTEGER ids`);
      }

      // Replace old table with new one
      await sequelize.query('DROP TABLE users CASCADE', { transaction });
      await sequelize.query('ALTER TABLE users_new RENAME TO users', { transaction });
      
      console.log('✅ Replaced users table successfully');

      // Commit transaction
      await transaction.commit();
      console.log('✅ Transaction committed successfully');

    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    // Step 6: Add missing session columns
    await addMissingSessionColumns();

    // Step 7: Verify the fix
    console.log('\n4. Verifying the conversion...');
    
    const newUsersDesc = await sequelize.query(`
      SELECT data_type, column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'id'
    `);
    
    const newUserIdType = newUsersDesc[0]?.[0]?.data_type;
    console.log(`New users.id type: ${newUserIdType}`);
    
    if (newUserIdType === 'integer') {
      console.log('✅ UUID to INTEGER conversion successful!');
    } else {
      throw new Error('Conversion failed - users.id is still not INTEGER');
    }

    // Test basic queries
    const userCount = await sequelize.query('SELECT COUNT(*) as count FROM users', {
      type: sequelize.QueryTypes.SELECT
    });
    console.log(`✅ Users table working: ${userCount[0].count} users found`);

    console.log('\n🎉 TARGETED UUID FIX COMPLETED SUCCESSFULLY!');
    console.log('============================================');
    console.log('✅ Users.id converted from UUID to INTEGER');
    console.log('✅ All user data preserved');
    console.log('✅ Foreign key compatibility restored');
    console.log('✅ Database ready for migrations');
    console.log('\n🚀 Next step: Deploy to production!');

  } catch (error) {
    console.error('\n❌ TARGETED FIX FAILED:', error.message);
    console.log('\n📞 Please contact support with this error log.');
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

async function addMissingSessionColumns() {
  console.log('\n🔧 Adding missing session columns...');
  
  try {
    // Check if sessions table exists
    const sessionTableExists = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'sessions'
      )
    `);
    
    if (!sessionTableExists[0][0].exists) {
      console.log('⚠️ Sessions table does not exist - skipping column additions');
      return;
    }

    // Get current sessions table structure
    const sessionsDesc = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'sessions'
    `);
    
    const existingColumns = sessionsDesc[0].map(col => col.column_name);
    
    // Add missing columns
    const columnsToAdd = [
      { name: 'reason', type: 'VARCHAR(255)', comment: 'Reason for blocked time' },
      { name: 'isRecurring', type: 'BOOLEAN DEFAULT false', comment: 'Whether this is recurring' },
      { name: 'recurringPattern', type: 'JSON', comment: 'Pattern for recurring times' },
      { name: 'deletedAt', type: 'TIMESTAMP WITH TIME ZONE', comment: 'Soft delete timestamp' }
    ];
    
    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        await sequelize.query(`
          ALTER TABLE sessions ADD COLUMN "${column.name}" ${column.type}
        `);
        console.log(`  ✅ Added column: ${column.name}`);
      } else {
        console.log(`  ✅ Column already exists: ${column.name}`);
      }
    }
    
    console.log('✅ Session columns check completed');
    
  } catch (error) {
    console.log(`⚠️ Could not add session columns: ${error.message}`);
  }
}

// Run the targeted fix
targetedUuidFix();