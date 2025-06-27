import pkg from 'sequelize';
const { Sequelize, QueryTypes } = pkg;
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * SWANSTUDIOS PLATFORM - DATABASE DIAGNOSTIC SCRIPT
 * =================================================
 * This script examines the SwanStudios database schema to identify:
 * 1. Type mismatches between users.id and userId foreign keys
 * 2. Hybrid backend architecture conflicts (MongoDB vs Sequelize)
 * 3. Known P0 issues: WorkoutSession, Exercise/WorkoutExercise mismatches
 * 
 * Run with: node check-current-db-state.mjs
 */

const sequelize = new Sequelize(
    process.env.PG_DB || 'swanstudios',
    process.env.PG_USER || 'swanadmin',
    process.env.PG_PASSWORD,
    {
        host: process.env.PG_HOST || 'localhost',
        port: process.env.PG_PORT || 5432,
        dialect: 'postgres',
        logging: false // Suppress SQL logs for cleaner output
    }
);

async function checkDatabaseTypes() {
    try {
        console.log('🔍 DATABASE TYPE DIAGNOSTIC STARTING...\n');
        
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection successful\n');

        // ====================================
        // 1. CHECK USERS TABLE
        // ====================================
        console.log('📋 USERS TABLE ANALYSIS:');
        console.log('========================');
        
        const usersTableExists = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            ) as exists;
        `, { type: QueryTypes.SELECT });

        if (!usersTableExists[0].exists) {
            console.log('❌ Users table does not exist!');
            console.log('🔧 This needs to be created first before other migrations can succeed.\n');
        } else {
            // Get users table structure
            const usersColumns = await sequelize.query(`
                SELECT 
                    column_name,
                    data_type,
                    column_default,
                    is_nullable,
                    character_maximum_length
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND table_schema = 'public'
                ORDER BY ordinal_position;
            `, { type: QueryTypes.SELECT });

            const usersId = usersColumns.find(col => col.column_name === 'id');
            
            if (usersId) {
                console.log(`✅ Users table exists`);
                console.log(`📊 users.id type: ${usersId.data_type.toUpperCase()}`);
                console.log(`📊 users.id default: ${usersId.column_default || 'none'}`);
                
                // Check if it's UUID or INTEGER
                const primaryKeyType = usersId.data_type === 'uuid' ? 'UUID' : 
                                     usersId.data_type === 'integer' ? 'INTEGER' : 
                                     usersId.data_type.toUpperCase();
                
                console.log(`🎯 PRIMARY KEY STANDARD: ${primaryKeyType}\n`);
            } else {
                console.log('❌ Users table exists but has no id column!\n');
            }
        }

        // ====================================
        // 2. CHECK FOREIGN KEY TABLES
        // ====================================
        console.log('📋 FOREIGN KEY ANALYSIS:');
        console.log('=========================');

        const tablesToCheck = [
            'sessions',
            'shopping_carts', 
            'orders',
            'food_scan_history',
            'notifications',
            'cart_items',
            // SwanStudios Platform specific tables
            'exercises',
            'workout_exercises', 
            'workout_plans',
            'user_achievements',
            'user_rewards',
            'user_milestones',
            'point_transactions'
        ];

        const foreignKeyReport = [];

        for (const tableName of tablesToCheck) {
            // Check if table exists
            const tableExists = await sequelize.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = '${tableName}'
                ) as exists;
            `, { type: QueryTypes.SELECT });

            if (!tableExists[0].exists) {
                foreignKeyReport.push({
                    table: tableName,
                    status: 'TABLE_NOT_EXISTS',
                    userIdType: null,
                    issue: 'Table does not exist yet'
                });
                continue;
            }

            // Check for userId column
            const userIdColumn = await sequelize.query(`
                SELECT 
                    column_name,
                    data_type,
                    is_nullable
                FROM information_schema.columns 
                WHERE table_name = '${tableName}' 
                AND column_name = 'userId'
                AND table_schema = 'public';
            `, { type: QueryTypes.SELECT });

            if (userIdColumn.length === 0) {
                foreignKeyReport.push({
                    table: tableName,
                    status: 'NO_USERID_COLUMN',
                    userIdType: null,
                    issue: 'Table exists but no userId column found'
                });
                continue;
            }

            const userIdType = userIdColumn[0].data_type;
            let status = 'UNKNOWN';
            let issue = null;

            // Compare with users.id type (if users table exists)
            if (usersTableExists[0].exists && usersColumns.find(col => col.column_name === 'id')) {
                const usersIdType = usersColumns.find(col => col.column_name === 'id').data_type;
                
                if (userIdType === usersIdType) {
                    status = 'TYPE_MATCH';
                } else {
                    status = 'TYPE_MISMATCH';
                    issue = `userId is ${userIdType.toUpperCase()} but users.id is ${usersIdType.toUpperCase()}`;
                }
            }

            foreignKeyReport.push({
                table: tableName,
                status,
                userIdType: userIdType.toUpperCase(),
                issue
            });
        }

        // Display foreign key report
        foreignKeyReport.forEach(report => {
            const statusIcon = report.status === 'TYPE_MATCH' ? '✅' :
                             report.status === 'TYPE_MISMATCH' ? '❌' :
                             report.status === 'TABLE_NOT_EXISTS' ? '⚪' :
                             report.status === 'NO_USERID_COLUMN' ? '⚠️' : '❓';
            
            console.log(`${statusIcon} ${report.table}`);
            if (report.userIdType) {
                console.log(`   └─ userId type: ${report.userIdType}`);
            }
            if (report.issue) {
                console.log(`   └─ Issue: ${report.issue}`);
            }
        });

        // ====================================
        // 3. CHECK MIGRATION STATUS
        // ====================================
        console.log('\n📋 MIGRATION STATUS:');
        console.log('====================');

        const migrationTableExists = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'SequelizeMeta'
            ) as exists;
        `, { type: QueryTypes.SELECT });

        if (migrationTableExists[0].exists) {
            const completedMigrations = await sequelize.query(`
                SELECT name FROM "SequelizeMeta" ORDER BY name;
            `, { type: QueryTypes.SELECT });

            console.log(`✅ SequelizeMeta table exists`);
            console.log(`📊 Completed migrations: ${completedMigrations.length}`);
            
            if (completedMigrations.length > 0) {
                console.log(`📊 Latest migration: ${completedMigrations[completedMigrations.length - 1].name}`);
                
                // Show last 5 migrations
                const recentMigrations = completedMigrations.slice(-5);
                console.log('\n🕒 Recent migrations:');
                recentMigrations.forEach(migration => {
                    console.log(`   - ${migration.name}`);
                });
            }
        } else {
            console.log('⚪ SequelizeMeta table does not exist (no migrations run yet)');
        }

        // ====================================
        // 4. SWANSTUDIOS HYBRID BACKEND ANALYSIS
        // ====================================
        console.log('\n📋 SWANSTUDIOS HYBRID BACKEND ISSUES:');
        console.log('=====================================');

        // Check for known P0 Exercise/WorkoutExercise ID mismatch
        const exerciseTableExists = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'exercises'
            ) as exists;
        `, { type: QueryTypes.SELECT });

        const workoutExerciseTableExists = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'workout_exercises'
            ) as exists;
        `, { type: QueryTypes.SELECT });

        if (exerciseTableExists[0].exists && workoutExerciseTableExists[0].exists) {
            const exerciseIdType = await sequelize.query(`
                SELECT data_type FROM information_schema.columns 
                WHERE table_name = 'exercises' AND column_name = 'id' AND table_schema = 'public';
            `, { type: QueryTypes.SELECT });

            const workoutExerciseIdType = await sequelize.query(`
                SELECT data_type FROM information_schema.columns 
                WHERE table_name = 'workout_exercises' AND column_name = 'exerciseId' AND table_schema = 'public';
            `, { type: QueryTypes.SELECT });

            if (exerciseIdType[0] && workoutExerciseIdType[0]) {
                const exerciseType = exerciseIdType[0].data_type.toUpperCase();
                const workoutExerciseType = workoutExerciseIdType[0].data_type.toUpperCase();
                
                console.log(`📊 exercises.id type: ${exerciseType}`);
                console.log(`📊 workout_exercises.exerciseId type: ${workoutExerciseType}`);
                
                if (exerciseType !== workoutExerciseType) {
                    console.log('❌ P0 ISSUE CONFIRMED: Exercise/WorkoutExercise ID type mismatch!');
                    console.log(`   └─ exercises.id is ${exerciseType} but workout_exercises.exerciseId is ${workoutExerciseType}`);
                } else {
                    console.log('✅ Exercise/WorkoutExercise ID types match');
                }
            }
        } else {
            console.log('⚪ Exercise/WorkoutExercise tables not yet created');
        }

        // Check for WorkoutSession (should be MongoDB, not in PostgreSQL)
        const workoutSessionInPG = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'workout_sessions'
            ) as exists;
        `, { type: QueryTypes.SELECT });

        if (workoutSessionInPG[0].exists) {
            console.log('⚠️  WARNING: workout_sessions table found in PostgreSQL!');
            console.log('   └─ Per architecture, WorkoutSession should be MongoDB-only');
        } else {
            console.log('✅ No workout_sessions in PostgreSQL (correct - should be MongoDB)');
        }

        // ====================================
        // 5. SUMMARY & RECOMMENDATIONS
        // ====================================
        console.log('\n📋 DIAGNOSTIC SUMMARY:');
        console.log('======================');

        const typeMatches = foreignKeyReport.filter(r => r.status === 'TYPE_MATCH').length;
        const typeMismatches = foreignKeyReport.filter(r => r.status === 'TYPE_MISMATCH').length;
        const missingTables = foreignKeyReport.filter(r => r.status === 'TABLE_NOT_EXISTS').length;

        console.log(`✅ Type matches: ${typeMatches}`);
        console.log(`❌ Type mismatches: ${typeMismatches}`);
        console.log(`⚪ Missing tables: ${missingTables}`);

        if (typeMismatches > 0) {
            console.log('\n🔧 RECOMMENDED ACTIONS:');
            console.log('1. Create a corrective migration to fix type mismatches');
            console.log('2. Backup any important data before running fixes');
            console.log('3. Consider clearing affected tables if data is not critical');
            
            const mismatchedTables = foreignKeyReport.filter(r => r.status === 'TYPE_MISMATCH');
            mismatchedTables.forEach(table => {
                console.log(`   - Fix ${table.table}.userId type mismatch`);
            });
        } else if (missingTables === foreignKeyReport.length) {
            console.log('\n✅ GOOD NEWS: No type mismatches found!');
            console.log('🔧 Issue might be in the migration execution order or syntax.');
        } else {
            console.log('\n✅ EXCELLENT: All existing tables have matching types!');
        }

        console.log('\n🎯 SWANSTUDIOS PLATFORM NEXT STEPS:');
        console.log('1. Address any database type mismatches identified above');
        console.log('2. Ensure hybrid backend architecture is properly separated:');
        console.log('   - WorkoutSession.mjs should remain MongoDB-only');
        console.log('   - associations.mjs should not reference MongoDB models');
        console.log('3. Fix Exercise/WorkoutExercise ID type alignment if needed');
        console.log('4. Resume frontend TypeScript cleanup (484 errors remaining)');
        console.log('5. Fix system environment: Git config + Python installation');
        
        console.log('\n🎯 DIAGNOSTIC COMPLETE');

    } catch (error) {
        console.error('❌ Diagnostic failed:', error.message);
        
        if (error.message.includes('connect')) {
            console.log('\n🔧 CONNECTION TROUBLESHOOTING:');
            console.log('1. Ensure PostgreSQL is running');
            console.log('2. Check database credentials in .env file');
            console.log('3. Verify database exists and user has proper permissions');
        }
    } finally {
        await sequelize.close();
    }
}

// Run the diagnostic
checkDatabaseTypes();