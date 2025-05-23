'use strict';

/**
 * User Table Migration
 * Updated to match the User.mjs model's attributes
 * to ensure compatibility with seeders and the model itself
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Use a transaction for atomicity
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('Executing migration: 20250212060728-create-user-table');
      
      // Check if the users table already exists
      const tables = await queryInterface.showAllTables({ transaction });
      if (tables.includes('users')) {
        console.log('Table users already exists. Skipping creation.');
        await transaction.commit();
        return;
      }
      
      // Create users table with all fields from the model
      await queryInterface.createTable('users', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        // Basic personal details
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
        // Contact information
        phone: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        // Profile photo
        photo: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        // Role - supports client, trainer, and admin
        role: {
          type: Sequelize.ENUM('client', 'trainer', 'admin'),
          allowNull: false,
          defaultValue: 'client',
        },
        
        // ========== CLIENT-SPECIFIC FIELDS ==========
        // Physical attributes
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
        // Fitness information
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
        // Purchased sessions
        availableSessions: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0,
        },
        
        // ========== TRAINER-SPECIFIC FIELDS ==========
        // Professional information
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
        // Scheduling information
        availableDays: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        availableHours: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        // Billing information
        hourlyRate: {
          type: Sequelize.FLOAT,
          allowNull: true,
        },
        
        // ========== ADMIN-SPECIFIC FIELDS ==========
        // Administrative permissions
        permissions: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        
        // ========== COMMON FIELDS ==========
        // Account status
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        lastLogin: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        // Communication preferences
        emailNotifications: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        smsNotifications: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        // Misc user settings
        preferences: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        
        // ========== TIMESTAMPS ==========
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        deletedAt: {
          allowNull: true,
          type: Sequelize.DATE,
        },
      }, { transaction });

      console.log('Table users created successfully');
      
      // Create indexes for improved query performance
      await queryInterface.addIndex('users', ['email'], { transaction });
      await queryInterface.addIndex('users', ['username'], { transaction });
      await queryInterface.addIndex('users', ['role'], { transaction });
      await queryInterface.addIndex('users', ['isActive'], { transaction });
      
      console.log('Indexes for users table created successfully');
      
      await transaction.commit();
      console.log('Migration 20250212060728-create-user-table completed successfully');
    } catch (err) {
      await transaction.rollback();
      console.error("Migration 20250212060728-create-user-table failed:", err);
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('Reverting migration 20250212060728-create-user-table...');
      
      // Drop the table
      await queryInterface.dropTable('users', { transaction });
      
      // Drop the ENUM type (if it exists)
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";', { transaction });
      
      await transaction.commit();
      console.log('Migration 20250212060728-create-user-table reverted');
    } catch (err) {
      await transaction.rollback();
      console.error("Rollback for 20250212060728-create-user-table failed:", err);
      throw err;
    }
  },
};