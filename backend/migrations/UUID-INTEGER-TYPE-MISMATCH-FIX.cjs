'use strict';

/**
 * UUID vs INTEGER TYPE MISMATCH FIX
 * =================================
 * This migration fixes the fundamental type incompatibility between
 * sessions.userId (UUID) and users.id (INTEGER) that's preventing
 * foreign key constraints from being created.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 FIXING UUID vs INTEGER TYPE MISMATCH...');
    
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // =========================================
      // 1. DIAGNOSE CURRENT TYPE SITUATION
      // =========================================
      console.log('🔍 Phase 1: Diagnosing current type situation...');
      
      // Check users table id type
      const [usersIdType] = await queryInterface.sequelize.query(`
        SELECT data_type, column_default
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'id' 
        AND table_schema = 'public';
      `, { transaction });
      
      // Check if sessions table exists and its userId type
      const [sessionsExists] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'sessions'
        );
      `, { transaction });
      
      let sessionsUserIdType = null;
      if (sessionsExists[0].exists) {
        const [userIdType] = await queryInterface.sequelize.query(`
          SELECT data_type
          FROM information_schema.columns 
          WHERE table_name = 'sessions' 
          AND column_name = 'userId' 
          AND table_schema = 'public';
        `, { transaction });
        sessionsUserIdType = userIdType[0]?.data_type;
      }
      
      console.log(`Users.id type: ${usersIdType[0]?.data_type || 'NOT FOUND'}`);
      console.log(`Sessions.userId type: ${sessionsUserIdType || 'TABLE NOT FOUND'}`);
      
      // =========================================
      // 2. STANDARDIZE TO INTEGER TYPE
      // =========================================
      console.log('🔧 Phase 2: Standardizing to INTEGER type...');
      
      // Strategy: Convert everything to INTEGER since that's more common
      // and the existing users table is likely already INTEGER
      
      if (usersIdType[0]?.data_type === 'integer') {
        console.log('✅ Users table already has INTEGER id - keeping this standard');
        
        // Check if sessions table exists and has UUID userId
        if (sessionsExists[0].exists && sessionsUserIdType === 'uuid') {
          console.log('🔄 Converting sessions.userId from UUID to INTEGER...');
          
          // First, check if there are any existing sessions
          const [sessionCount] = await queryInterface.sequelize.query(`
            SELECT COUNT(*) as count FROM sessions;
          `, { transaction });
          
          if (sessionCount[0].count > 0) {
            console.log(`⚠️ Found ${sessionCount[0].count} existing sessions - clearing for type conversion`);
            await queryInterface.sequelize.query(`
              TRUNCATE TABLE sessions;
            `, { transaction });
          }
          
          // Drop the userId column and recreate as INTEGER
          await queryInterface.removeColumn('sessions', 'userId', { transaction });
          await queryInterface.addColumn('sessions', 'userId', {
            type: Sequelize.INTEGER,
            allowNull: true, // Will be made required after data migration
            references: {
              model: 'users',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          }, { transaction });
          
          console.log('✅ Sessions.userId converted to INTEGER');
        }
        
      } else if (usersIdType[0]?.data_type === 'uuid') {
        console.log('✅ Users table has UUID id - standardizing other tables to UUID');
        
        // Check if sessions table needs conversion to UUID
        if (sessionsExists[0].exists && sessionsUserIdType === 'integer') {
          console.log('🔄 Converting sessions.userId from INTEGER to UUID...');
          
          // Clear existing sessions for type conversion
          const [sessionCount] = await queryInterface.sequelize.query(`
            SELECT COUNT(*) as count FROM sessions;
          `, { transaction });
          
          if (sessionCount[0].count > 0) {
            console.log(`⚠️ Found ${sessionCount[0].count} existing sessions - clearing for type conversion`);
            await queryInterface.sequelize.query(`
              TRUNCATE TABLE sessions;
            `, { transaction });
          }
          
          // Drop and recreate userId as UUID
          await queryInterface.removeColumn('sessions', 'userId', { transaction });
          await queryInterface.addColumn('sessions', 'userId', {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          }, { transaction });
          
          console.log('✅ Sessions.userId converted to UUID');
        }
        
      } else {
        console.log('⚠️ Users table id type is unclear - creating standardized INTEGER setup');
        
        // Ensure users table has proper INTEGER id
        const [usersTableExists] = await queryInterface.sequelize.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'users'
          );
        `, { transaction });
        
        if (!usersTableExists[0].exists) {
          console.log('🔨 Creating users table with INTEGER id...');
          await queryInterface.createTable('users', {
            id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true
            },
            firstName: {
              type: Sequelize.STRING,
              allowNull: false
            },
            lastName: {
              type: Sequelize.STRING,
              allowNull: false
            },
            email: {
              type: Sequelize.STRING,
              allowNull: false,
              unique: true
            },
            username: {
              type: Sequelize.STRING,
              allowNull: false,
              unique: true
            },
            password: {
              type: Sequelize.STRING,
              allowNull: false
            },
            role: {
              type: Sequelize.ENUM('client', 'trainer', 'admin'),
              defaultValue: 'client'
            },
            createdAt: {
              type: Sequelize.DATE,
              defaultValue: Sequelize.NOW
            },
            updatedAt: {
              type: Sequelize.DATE,
              defaultValue: Sequelize.NOW
            }
          }, { transaction });
        }
      }
      
      // =========================================
      // 3. ENSURE SESSIONS TABLE COMPATIBILITY
      // =========================================
      console.log('🔧 Phase 3: Ensuring sessions table compatibility...');
      
      if (!sessionsExists[0].exists) {
        console.log('🔨 Creating sessions table with proper INTEGER userId...');
        await queryInterface.createTable('sessions', {
          sid: {
            type: Sequelize.STRING,
            primaryKey: true
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          expires: {
            type: Sequelize.DATE,
            allowNull: true
          },
          data: {
            type: Sequelize.TEXT,
            allowNull: true
          },
          createdAt: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW
          },
          updatedAt: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW
          }
        }, { transaction });
        console.log('✅ Sessions table created with INTEGER userId');
      }
      
      // =========================================
      // 4. FIX OTHER TABLES TO MATCH STANDARD
      // =========================================
      console.log('🔧 Phase 4: Ensuring other tables match the standard...');
      
      // Check and fix shopping_carts userId type
      const [shoppingCartsExists] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'shopping_carts'
        );
      `, { transaction });
      
      if (shoppingCartsExists[0].exists) {
        const [cartUserIdType] = await queryInterface.sequelize.query(`
          SELECT data_type
          FROM information_schema.columns 
          WHERE table_name = 'shopping_carts' 
          AND column_name = 'userId' 
          AND table_schema = 'public';
        `, { transaction });
        
        const currentUsersIdType = usersIdType[0]?.data_type || 'integer';
        const targetType = currentUsersIdType === 'uuid' ? 'uuid' : 'integer';
        
        if (cartUserIdType[0] && cartUserIdType[0].data_type !== targetType) {
          console.log(`🔄 Converting shopping_carts.userId to ${targetType.toUpperCase()}...`);
          
          // Clear cart data for type conversion
          await queryInterface.sequelize.query(`TRUNCATE TABLE shopping_carts CASCADE;`, { transaction });
          
          // Recreate userId column with correct type
          await queryInterface.removeColumn('shopping_carts', 'userId', { transaction });
          await queryInterface.addColumn('shopping_carts', 'userId', {
            type: targetType === 'uuid' ? Sequelize.UUID : Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          }, { transaction });
        }
      }
      
      // =========================================
      // 5. VERIFICATION
      // =========================================
      console.log('🔍 Phase 5: Verifying type consistency...');
      
      const [finalUsersIdType] = await queryInterface.sequelize.query(`
        SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'id' AND table_schema = 'public';
      `, { transaction });
      
      const [finalSessionsUserIdType] = await queryInterface.sequelize.query(`
        SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'userId' AND table_schema = 'public';
      `, { transaction });
      
      console.log(`Final users.id type: ${finalUsersIdType[0]?.data_type}`);
      console.log(`Final sessions.userId type: ${finalSessionsUserIdType[0]?.data_type}`);
      
      if (finalUsersIdType[0]?.data_type === finalSessionsUserIdType[0]?.data_type) {
        console.log('✅ Type consistency achieved!');
      } else {
        console.log('⚠️ Types still don\'t match - manual intervention may be needed');
      }
      
      await transaction.commit();
      
      console.log('🎉 UUID vs INTEGER TYPE MISMATCH FIX COMPLETED!');
      console.log('🚀 Ready to proceed with remaining migrations...');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Type mismatch fix failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Reversing type mismatch fixes...');
    // This is a complex rollback - in practice, you might want to 
    // restore from a database backup rather than attempt automated rollback
    console.log('⚠️ Complex rollback - consider restoring from backup if needed');
  }
};
