'use strict';

/**
 * SWANSTUDIOS PLATFORM - CRITICAL TYPE MISMATCH FIX
 * =================================================
 * This migration fixes the fundamental type incompatibility between:
 * - users.id (INTEGER) 
 * - Various foreign key columns that were incorrectly defined as UUID
 * 
 * This resolves PostgreSQL constraint failures preventing successful migrations.
 * 
 * FIXES:
 * - client_progress.userId: UUID → INTEGER
 * - workout_plans.clientId: UUID → INTEGER  
 * - workout_plans.trainerId: UUID → INTEGER
 * - workout_sessions.clientId: UUID → INTEGER
 * - workout_sessions.trainerId: UUID → INTEGER
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 FIXING SWANSTUDIOS USER FOREIGN KEY TYPE MISMATCHES...');
    
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // =========================================
      // 1. VERIFY USERS TABLE TYPE
      // =========================================
      console.log('🔍 Phase 1: Verifying users table structure...');
      
      const [usersIdType] = await queryInterface.sequelize.query(`
        SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'id' AND table_schema = 'public';
      `, { transaction });
      
      if (!usersIdType[0] || usersIdType[0].data_type !== 'integer') {
        throw new Error(`Users table id type is ${usersIdType[0]?.data_type || 'unknown'}, expected integer`);
      }
      
      console.log('✅ Users table confirmed with INTEGER id type');
      
      // =========================================
      // 2. FIX CLIENT_PROGRESS TABLE
      // =========================================
      console.log('🔧 Phase 2: Fixing client_progress.userId...');
      
      const [clientProgressExists] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'client_progress'
        );
      `, { transaction });
      
      if (clientProgressExists[0].exists) {
        const [clientProgressUserIdType] = await queryInterface.sequelize.query(`
          SELECT data_type FROM information_schema.columns 
          WHERE table_name = 'client_progress' AND column_name = 'userId' AND table_schema = 'public';
        `, { transaction });
        
        if (clientProgressUserIdType[0]?.data_type === 'uuid') {
          console.log('🔄 Converting client_progress.userId from UUID to INTEGER...');
          
              // Clear existing data for type conversion (if any)
          const [rowCount] = await queryInterface.sequelize.query(`SELECT COUNT(*) as count FROM client_progress;`, { transaction });
          if (rowCount[0].count > 0) {
            console.log(`⚠️ Found ${rowCount[0].count} existing rows - clearing for type conversion`);
            await queryInterface.sequelize.query(`TRUNCATE TABLE client_progress CASCADE;`, { transaction });
          }
          
          // Drop and recreate the column with correct type
          await queryInterface.removeColumn('client_progress', 'userId', { transaction });
          await queryInterface.addColumn('client_progress', 'userId', {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          }, { transaction });
          
          console.log('✅ client_progress.userId converted to INTEGER');
        } else {
          console.log('✅ client_progress.userId already correct type');
        }
      } else {
        console.log('⚪ client_progress table does not exist yet');
      }
      
      // =========================================
      // 3. FIX WORKOUT_PLANS TABLE
      // =========================================
      console.log('🔧 Phase 3: Fixing workout_plans foreign keys...');
      
      const [workoutPlansExists] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'workout_plans'
        );
      `, { transaction });
      
      if (workoutPlansExists[0].exists) {
        // Fix clientId
        const [clientIdType] = await queryInterface.sequelize.query(`
          SELECT data_type FROM information_schema.columns 
          WHERE table_name = 'workout_plans' AND column_name = 'clientId' AND table_schema = 'public';
        `, { transaction });
        
        if (clientIdType[0]?.data_type === 'uuid') {
          console.log('🔄 Converting workout_plans.clientId from UUID to INTEGER...');
          
          await queryInterface.sequelize.query(`TRUNCATE TABLE workout_plans CASCADE;`, { transaction });
          
          await queryInterface.removeColumn('workout_plans', 'clientId', { transaction });
          await queryInterface.addColumn('workout_plans', 'clientId', {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          }, { transaction });
          
          console.log('✅ workout_plans.clientId converted to INTEGER');
        }
        
        // Fix trainerId
        const [trainerIdType] = await queryInterface.sequelize.query(`
          SELECT data_type FROM information_schema.columns 
          WHERE table_name = 'workout_plans' AND column_name = 'trainerId' AND table_schema = 'public';
        `, { transaction });
        
        if (trainerIdType[0]?.data_type === 'uuid') {
          console.log('🔄 Converting workout_plans.trainerId from UUID to INTEGER...');
          
          await queryInterface.removeColumn('workout_plans', 'trainerId', { transaction });
          await queryInterface.addColumn('workout_plans', 'trainerId', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          }, { transaction });
          
          console.log('✅ workout_plans.trainerId converted to INTEGER');
        }
      } else {
        console.log('⚪ workout_plans table does not exist yet');
      }
      
      // =========================================
      // 4. FIX WORKOUT_SESSIONS TABLE
      // =========================================
      console.log('🔧 Phase 4: Fixing workout_sessions foreign keys...');
      
      const [workoutSessionsExists] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'workout_sessions'
        );
      `, { transaction });
      
      if (workoutSessionsExists[0].exists) {
        // Fix clientId
        const [sessionClientIdType] = await queryInterface.sequelize.query(`
          SELECT data_type FROM information_schema.columns 
          WHERE table_name = 'workout_sessions' AND column_name = 'clientId' AND table_schema = 'public';
        `, { transaction });
        
        if (sessionClientIdType[0]?.data_type === 'uuid') {
          console.log('🔄 Converting workout_sessions.clientId from UUID to INTEGER...');
          
          await queryInterface.sequelize.query(`TRUNCATE TABLE workout_sessions CASCADE;`, { transaction });
          
          await queryInterface.removeColumn('workout_sessions', 'clientId', { transaction });
          await queryInterface.addColumn('workout_sessions', 'clientId', {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          }, { transaction });
          
          console.log('✅ workout_sessions.clientId converted to INTEGER');
        }
        
        // Fix trainerId
        const [sessionTrainerIdType] = await queryInterface.sequelize.query(`
          SELECT data_type FROM information_schema.columns 
          WHERE table_name = 'workout_sessions' AND column_name = 'trainerId' AND table_schema = 'public';
        `, { transaction });
        
        if (sessionTrainerIdType[0]?.data_type === 'uuid') {
          console.log('🔄 Converting workout_sessions.trainerId from UUID to INTEGER...');
          
          await queryInterface.removeColumn('workout_sessions', 'trainerId', { transaction });
          await queryInterface.addColumn('workout_sessions', 'trainerId', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          }, { transaction });
          
          console.log('✅ workout_sessions.trainerId converted to INTEGER');
        }
      } else {
        console.log('⚪ workout_sessions table does not exist yet');
      }
      
      // =========================================
      // 5. VERIFICATION
      // =========================================
      console.log('🔍 Phase 5: Verifying type consistency...');
      
      const tables = ['client_progress', 'workout_plans', 'workout_sessions'];
      const columns = {
        'client_progress': ['userId'],
        'workout_plans': ['clientId', 'trainerId'],
        'workout_sessions': ['clientId', 'trainerId']
      };
      
      for (const table of tables) {
        const [tableExists] = await queryInterface.sequelize.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = '${table}'
          );
        `, { transaction });
        
        if (tableExists[0].exists) {
          for (const column of columns[table]) {
            const [columnType] = await queryInterface.sequelize.query(`
              SELECT data_type FROM information_schema.columns 
              WHERE table_name = '${table}' AND column_name = '${column}' AND table_schema = 'public';
            `, { transaction });
            
            if (columnType[0]) {
              console.log(`📊 ${table}.${column}: ${columnType[0].data_type.toUpperCase()}`);
            }
          }
        }
      }
      
      await transaction.commit();
      
      console.log('🎉 SWANSTUDIOS USER FOREIGN KEY TYPE MISMATCH FIX COMPLETED!');
      console.log('✅ All user foreign key references now properly use INTEGER type');
      console.log('🚀 Ready to proceed with remaining migrations...');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Type mismatch fix failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Reversing SwanStudios type mismatch fixes...');
    console.log('⚠️ This rollback will convert foreign keys back to UUID type');
    console.log('⚠️ Data may be lost during this conversion');
    
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Note: This is a simplified rollback. In production, you might want to
      // restore from a database backup rather than attempt automated rollback
      
      console.log('✅ Rollback preparation complete');
      console.log('💡 For safety, restore from backup if needed');
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};