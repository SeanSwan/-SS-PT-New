'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 EMERGENCY FIX: Converting users.id from UUID to INTEGER...');
    
    try {
      // Step 1: Check current users table structure
      const usersTableDesc = await queryInterface.describeTable('users');
      console.log('Current users.id type:', usersTableDesc.id?.type);
      
      // Step 2: If users.id is UUID, we need to convert it to INTEGER
      if (usersTableDesc.id?.type?.includes('uuid')) {
        console.log('⚠️ Users table has UUID primary key, converting to INTEGER...');
        
        // First, get all existing data
        const existingUsers = await queryInterface.sequelize.query(
          'SELECT * FROM users ORDER BY "createdAt"',
          { type: Sequelize.QueryTypes.SELECT }
        );
        
        console.log(`📊 Found ${existingUsers.length} existing users to preserve`);
        
        // Step 3: Drop all foreign key constraints that reference users.id
        console.log('🔗 Dropping foreign key constraints...');
        
        // Get all foreign key constraints that reference users table
        const foreignKeys = await queryInterface.sequelize.query(`
          SELECT 
            tc.table_name, 
            tc.constraint_name,
            kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage ccu 
            ON ccu.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'users'
            AND ccu.column_name = 'id'
        `, { type: Sequelize.QueryTypes.SELECT });
        
        console.log(`Found ${foreignKeys.length} foreign key constraints to drop`);
        
        // Drop each foreign key constraint
        for (const fk of foreignKeys) {
          try {
            await queryInterface.removeConstraint(fk.table_name, fk.constraint_name);
            console.log(`✅ Dropped constraint ${fk.constraint_name} on ${fk.table_name}`);
          } catch (error) {
            console.log(`⚠️ Could not drop constraint ${fk.constraint_name}: ${error.message}`);
          }
        }
        
        // Step 4: Create a backup table and recreate users with INTEGER id
        console.log('💾 Creating backup and recreating users table...');
        
        // Create backup table
        await queryInterface.sequelize.query('CREATE TABLE users_backup AS SELECT * FROM users');
        console.log('✅ Created users_backup table');
        
        // Drop the original users table
        await queryInterface.dropTable('users');
        console.log('✅ Dropped original users table');
        
        // Recreate users table with INTEGER id (matching the model)
        await queryInterface.createTable('users', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
          },
          firstName: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          lastName: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          email: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
          },
          username: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
          },
          password: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          phone: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          photo: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          role: {
            type: Sequelize.ENUM('user', 'client', 'trainer', 'admin'),
            allowNull: false,
            defaultValue: 'user',
          },
          dateOfBirth: {
            type: Sequelize.DATEONLY,
            allowNull: true,
          },
          gender: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          weight: {
            type: Sequelize.FLOAT,
            allowNull: true,
          },
          height: {
            type: Sequelize.FLOAT,
            allowNull: true,
          },
          fitnessGoal: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          trainingExperience: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          healthConcerns: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          emergencyContact: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          availableSessions: {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: 0,
          },
          specialties: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          certifications: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          bio: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          availableDays: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          availableHours: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          hourlyRate: {
            type: Sequelize.FLOAT,
            allowNull: true,
          },
          permissions: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          isActive: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          lastLogin: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          emailNotifications: {
            type: Sequelize.BOOLEAN,
            allowNull: true,
            defaultValue: true,
          },
          smsNotifications: {
            type: Sequelize.BOOLEAN,
            allowNull: true,
            defaultValue: true,
          },
          preferences: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          points: {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: 0,
          },
          level: {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: 1,
          },
          tier: {
            type: Sequelize.ENUM('bronze', 'silver', 'gold', 'platinum'),
            allowNull: true,
            defaultValue: 'bronze',
          },
          streakDays: {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: 0,
          },
          lastActivityDate: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          totalWorkouts: {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: 0,
          },
          totalExercises: {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: 0,
          },
          exercisesCompleted: {
            type: Sequelize.JSON,
            allowNull: true,
            defaultValue: {},
          },
          refreshTokenHash: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          failedLoginAttempts: {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: 0,
          },
          isLocked: {
            type: Sequelize.BOOLEAN,
            allowNull: true,
            defaultValue: false,
          },
          lastLoginIP: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          registrationIP: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          lastActive: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW,
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW,
          },
          deletedAt: {
            type: Sequelize.DATE,
            allowNull: true,
          }
        });
        
        console.log('✅ Recreated users table with INTEGER id');
        
        // Step 5: Restore data with new INTEGER ids
        if (existingUsers.length > 0) {
          console.log('📥 Restoring user data with new INTEGER ids...');
          
          for (let i = 0; i < existingUsers.length; i++) {
            const user = existingUsers[i];
            const newId = i + 1; // Start from 1
            
            // Insert user with new integer ID
            await queryInterface.sequelize.query(`
              INSERT INTO users (
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
                :id, :firstName, :lastName, :email, :username, :password, :phone, :photo, :role,
                :dateOfBirth, :gender, :weight, :height, :fitnessGoal, :trainingExperience,
                :healthConcerns, :emergencyContact, :availableSessions, :specialties,
                :certifications, :bio, :availableDays, :availableHours, :hourlyRate,
                :permissions, :isActive, :lastLogin, :emailNotifications, :smsNotifications,
                :preferences, :points, :level, :tier, :streakDays, :lastActivityDate,
                :totalWorkouts, :totalExercises, :exercisesCompleted, :refreshTokenHash,
                :failedLoginAttempts, :isLocked, :lastLoginIP, :registrationIP,
                :lastActive, :createdAt, :updatedAt, :deletedAt
              )
            `, {
              replacements: {
                id: newId,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                username: user.username,
                password: user.password,
                phone: user.phone,
                photo: user.photo,
                role: user.role,
                dateOfBirth: user.dateOfBirth,
                gender: user.gender,
                weight: user.weight,
                height: user.height,
                fitnessGoal: user.fitnessGoal,
                trainingExperience: user.trainingExperience,
                healthConcerns: user.healthConcerns,
                emergencyContact: user.emergencyContact,
                availableSessions: user.availableSessions || 0,
                specialties: user.specialties,
                certifications: user.certifications,
                bio: user.bio,
                availableDays: user.availableDays,
                availableHours: user.availableHours,
                hourlyRate: user.hourlyRate,
                permissions: user.permissions,
                isActive: user.isActive !== false,
                lastLogin: user.lastLogin,
                emailNotifications: user.emailNotifications !== false,
                smsNotifications: user.smsNotifications !== false,
                preferences: user.preferences,
                points: user.points || 0,
                level: user.level || 1,
                tier: user.tier || 'bronze',
                streakDays: user.streakDays || 0,
                lastActivityDate: user.lastActivityDate,
                totalWorkouts: user.totalWorkouts || 0,
                totalExercises: user.totalExercises || 0,
                exercisesCompleted: user.exercisesCompleted || {},
                refreshTokenHash: user.refreshTokenHash,
                failedLoginAttempts: user.failedLoginAttempts || 0,
                isLocked: user.isLocked || false,
                lastLoginIP: user.lastLoginIP,
                registrationIP: user.registrationIP,
                lastActive: user.lastActive,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                deletedAt: user.deletedAt
              }
            });
          }
          
          // Reset the auto-increment sequence
          await queryInterface.sequelize.query(
            `SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));`
          );
          
          console.log(`✅ Restored ${existingUsers.length} users with INTEGER ids`);
        }
        
        // Step 6: Clean up backup table
        await queryInterface.sequelize.query('DROP TABLE users_backup');
        console.log('✅ Cleaned up backup table');
        
        console.log('🎉 Successfully converted users.id from UUID to INTEGER');
      } else {
        console.log('✅ Users table already has INTEGER id, no conversion needed');
      }
      
      // Step 7: Now ensure all other tables that reference users have INTEGER foreign keys
      console.log('🔗 Ensuring all foreign keys are INTEGER type...');
      
      // Update sessions table foreign keys if needed
      const sessionsTableDesc = await queryInterface.describeTable('sessions');
      
      if (sessionsTableDesc.userId && sessionsTableDesc.userId.type !== 'INTEGER') {
        console.log('🔧 Converting sessions.userId to INTEGER...');
        await queryInterface.changeColumn('sessions', 'userId', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          }
        });
      }
      
      if (sessionsTableDesc.trainerId && sessionsTableDesc.trainerId.type !== 'INTEGER') {
        console.log('🔧 Converting sessions.trainerId to INTEGER...');
        await queryInterface.changeColumn('sessions', 'trainerId', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          }
        });
      }
      
      if (sessionsTableDesc.cancelledBy && sessionsTableDesc.cancelledBy.type !== 'INTEGER') {
        console.log('🔧 Converting sessions.cancelledBy to INTEGER...');
        await queryInterface.changeColumn('sessions', 'cancelledBy', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          }
        });
      }
      
      console.log('🎉 UUID to INTEGER conversion completed successfully!');
      
    } catch (error) {
      console.error('❌ Error during UUID to INTEGER conversion:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('⚠️ This migration cannot be safely reversed automatically.');
    console.log('Manual intervention required to restore UUID primary keys.');
    // This down migration is intentionally limited as UUID conversion is complex to reverse
  }
};