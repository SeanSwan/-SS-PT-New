'use strict';

/**
 * Users Table Migration (Core Authentication & Multi-Role System)
 * ================================================================
 *
 * Purpose: Creates the foundational users table supporting 3-tier role hierarchy
 * (client, trainer, admin) with role-specific fields, authentication, and soft delete
 *
 * Blueprint Reference: SwanStudios Personal Training Platform - Authentication System
 *
 * Migration Date: 2025-02-12
 *
 * Table Created: users
 *
 * Database ERD (Users as Central Hub):
 *
 * ```
 *                              ┌──────────────┐
 *                              │    users     │ (central authentication table)
 *                              │   (UUID)     │
 *                              │ role ENUM    │
 *                              └──────┬───────┘
 *                                     │
 *                                     │ (referenced by ALL tables)
 *                                     │
 *         ┌───────────────────────────┼───────────────────────────┐
 *         │                           │                           │
 *         │ (userId FK)               │ (trainerId FK)            │ (awardedBy FK)
 *         │                           │                           │
 * ┌───────▼──────────┐        ┌──────▼────────┐         ┌────────▼──────────┐
 * │ workout_sessions │        │   sessions    │         │ point_transactions│
 * │   (UUID)         │        │   (UUID)      │         │     (UUID)        │
 * └──────────────────┘        └───────────────┘         └───────────────────┘
 *
 * ┌──────────────────┐        ┌───────────────┐         ┌───────────────────┐
 * │ client_progress  │        │ notifications │         │ user_achievements │
 * │   (UUID)         │        │   (UUID)      │         │     (UUID)        │
 * └──────────────────┘        └───────────────┘         └───────────────────┘
 *
 * ┌──────────────────┐        ┌───────────────┐         ┌───────────────────┐
 * │ workout_plans    │        │  social_posts │         │   user_rewards    │
 * │   (UUID)         │        │   (UUID)      │         │     (UUID)        │
 * └──────────────────┘        └───────────────┘         └───────────────────┘
 * ```
 *
 * Role Hierarchy (3 tiers):
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ ROLE      PERMISSIONS                           SPECIFIC FIELDS              │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ client    - Book sessions                       - fitnessGoal                │
 * │           - Track workouts                      - trainingExperience         │
 * │           - Earn points/achievements            - healthConcerns             │
 * │           - View own data only                  - availableSessions          │
 * │           - Cannot manage users                 - weight, height, DOB        │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ trainer   - All client permissions              - specialties                │
 * │           - View assigned clients               - certifications             │
 * │           - Create workout plans                - bio                        │
 * │           - Award points (discretionary)        - availableDays/Hours        │
 * │           - Manage session scheduling           - hourlyRate                 │
 * │           - Cannot manage other trainers        - (inherits client fields)   │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ admin     - Full system access                  - permissions JSON           │
 * │           - User management (CRUD)              - (inherits all fields)      │
 * │           - Content moderation                  - Used for super admins      │
 * │           - Gamification settings               - Audit trail tracking       │
 * │           - Analytics dashboard                 - Custom permission sets     │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * Table Schema (users):
 *
 * ```
 * AUTHENTICATION FIELDS:
 * - id: UUID (primary key, prevents enumeration attacks)
 * - email: STRING (unique, authentication identifier)
 * - username: STRING (unique, public identifier)
 * - password: STRING (bcrypt hashed, 10 rounds)
 * - role: ENUM('client', 'trainer', 'admin')
 * - isActive: BOOLEAN (account suspension, soft ban)
 * - lastLogin: DATE (security audit, inactive account cleanup)
 * - deletedAt: DATE (soft delete, GDPR compliance)
 *
 * PERSONAL INFORMATION:
 * - firstName, lastName: STRING
 * - phone: STRING (optional, SMS notifications)
 * - photo: STRING (profile picture URL/path)
 * - dateOfBirth: DATEONLY (age verification, client-specific)
 * - gender: STRING (optional, client-specific)
 *
 * CLIENT-SPECIFIC FIELDS (role='client'):
 * - weight, height: FLOAT (fitness metrics)
 * - fitnessGoal: STRING (weight loss, muscle gain, endurance)
 * - trainingExperience: TEXT (beginner, intermediate, advanced)
 * - healthConcerns: TEXT (injuries, medical conditions)
 * - emergencyContact: STRING (safety requirement)
 * - availableSessions: INTEGER (purchased session credits)
 *
 * TRAINER-SPECIFIC FIELDS (role='trainer'):
 * - specialties: TEXT (NASM OPT, CrossFit, Yoga, etc.)
 * - certifications: TEXT (NASM-CPT, ACE, ISSA, etc.)
 * - bio: TEXT (public profile description)
 * - availableDays: TEXT (scheduling, JSON or comma-separated)
 * - availableHours: TEXT (scheduling, JSON or time ranges)
 * - hourlyRate: FLOAT (billing rate)
 *
 * ADMIN-SPECIFIC FIELDS (role='admin'):
 * - permissions: TEXT (JSON, custom permission sets)
 *
 * COMMON FIELDS (all roles):
 * - emailNotifications: BOOLEAN (marketing, session reminders)
 * - smsNotifications: BOOLEAN (SMS alerts)
 * - preferences: TEXT (JSON, UI settings, timezone, language)
 * - createdAt, updatedAt: DATE (timestamps)
 * ```
 *
 * Indexes (4 total):
 * - email: Fast login lookups (authentication primary path)
 * - username: Alternative login method, public profile lookups
 * - role: Admin dashboard filtering (list all trainers, list all clients)
 * - isActive: Filter active vs suspended accounts
 *
 * Data Flow (User Lifecycle):
 *
 * ```
 * 1. REGISTRATION:
 *    POST /auth/register → authController.register()
 *    ↓
 *    INSERT INTO users (firstName, lastName, email, username, password, role)
 *    VALUES ('John', 'Doe', 'john@example.com', 'johndoe', bcrypt('password'), 'client')
 *
 * 2. LOGIN:
 *    POST /auth/login → authController.login()
 *    ↓
 *    SELECT * FROM users WHERE email='john@example.com' AND isActive=true
 *    ↓
 *    bcrypt.compare(password, user.password)
 *    ↓
 *    UPDATE users SET lastLogin=NOW() WHERE id=user.id
 *    ↓
 *    JWT token issued (15min access + 7day refresh)
 *
 * 3. ROLE PROMOTION (Admin Action):
 *    POST /user-management/promote-to-trainer → userManagementController.promoteToTrainer()
 *    ↓
 *    UPDATE users SET role='trainer' WHERE id=userId
 *
 * 4. ACCOUNT SUSPENSION (Admin Action):
 *    PUT /user-management/:id/suspend → adminClientController.suspendClient()
 *    ↓
 *    UPDATE users SET isActive=false WHERE id=userId
 *
 * 5. SOFT DELETE (GDPR Compliance):
 *    DELETE /user-management/:id → userManagementController.deleteUser()
 *    ↓
 *    UPDATE users SET deletedAt=NOW(), isActive=false WHERE id=userId
 *    ↓
 *    CASCADE to related tables (sessions, workouts, points) based on FK settings
 * ```
 *
 * Business Logic:
 *
 * WHY UUID Primary Key (Not Auto-Increment INTEGER)?
 * - Security: Prevents user enumeration attacks (can't guess /users/1, /users/2)
 * - Distributed systems: No auto-increment conflicts across multiple databases
 * - Data migration: Easy to merge databases without ID collisions
 * - Modern best practice: Aligns with microservices architecture
 * - Privacy: Obscures total user count
 *
 * WHY Role-Specific Fields in Single Table (Not Separate Tables)?
 * - Simplifies authentication: Single table lookup (no JOIN required)
 * - Flexible role switching: Trainer can also be a client (dual roles future)
 * - Easier user management: Admin sees all users in one table
 * - NULL columns acceptable: PostgreSQL handles sparse data efficiently
 * - Performance: Single-table query faster than polymorphic associations
 *
 * WHY Soft Delete (deletedAt) Instead of Hard Delete?
 * - GDPR compliance: Preserve audit trail for deleted accounts
 * - Data integrity: Prevent orphaned foreign key references
 * - Undo capability: Restore accidentally deleted accounts
 * - Analytics: Track churn (deleted accounts over time)
 * - Billing: Preserve transaction history for deleted users
 *
 * WHY isActive Separate from deletedAt?
 * - Account suspension: Temporarily disable account (reversible)
 * - Soft ban: Disable abusive users without deletion
 * - Trial expiration: Deactivate until payment
 * - deletedAt is permanent (GDPR deletion request)
 * - isActive is temporary (admin action, payment issue)
 *
 * WHY availableSessions INTEGER (Not Separate Table)?
 * - Fast balance check: No JOIN required (performance)
 * - Atomic decrement: UPDATE users SET availableSessions = availableSessions - 1
 * - Session booking: Check balance before confirming session
 * - Audit trail: point_transactions table tracks session purchases/deductions
 * - Simplicity: Avoids session_credits join table
 *
 * WHY bcrypt Password Hashing (Implied, Not Stored)?
 * - Industry standard: OWASP recommended password hashing
 * - Slow hashing: 10 rounds (~100ms) prevents brute force
 * - Salted: Each password has unique salt (prevents rainbow tables)
 * - Secure: Resistant to GPU/ASIC attacks
 * - authController.mjs handles hashing (not migration responsibility)
 *
 * WHY TEXT Fields for JSON Data (Not JSONB)?
 * - Backwards compatibility: Sequelize ORM abstracts JSONB vs TEXT
 * - Migration simplicity: TEXT works across all databases (MySQL, Postgres, SQLite)
 * - Application parsing: Frontend expects JSON strings
 * - PostgreSQL auto-detects: Can query as JSON even if stored as TEXT
 * - Future refactor: Easy to migrate TEXT → JSONB with ALTER TABLE
 *
 * WHY email + username Both Unique?
 * - Dual login methods: User can login with email OR username
 * - Public vs private: Username shown publicly, email kept private
 * - Flexibility: Some users prefer username (gamification), others email (business)
 * - Social features: @username mentions in social posts
 * - authRoutes.mjs supports both login methods
 *
 * Security Model:
 * - Authentication: JWT tokens (authController.mjs)
 * - Password hashing: bcrypt 10 rounds (authController.mjs)
 * - Role-based access control (RBAC): authMiddleware.mjs authorize([role])
 * - Soft delete: Preserve data for audit trail
 * - Indexes: Fast lookups prevent timing attacks
 * - isActive: Account suspension capability
 *
 * Performance Considerations:
 * - 4 indexes for fast queries (email, username, role, isActive)
 * - UUID primary key: 16 bytes vs 4 bytes (INTEGER) - acceptable tradeoff
 * - Sparse columns: NULL client fields for trainers (minimal storage overhead)
 * - Single table: No JOIN required for authentication
 * - Soft delete: Adds deletedAt IS NULL filter (index recommended for large datasets)
 *
 * Rollback Strategy:
 * - DROP TABLE users CASCADE (removes all foreign key dependencies)
 * - DROP TYPE enum_users_role (removes ENUM type)
 * - WARNING: Cascades to ALL tables (sessions, workouts, points, etc.)
 * - Backup database before rollback
 *
 * Foreign Key Dependencies (Referenced By):
 * - workout_sessions (userId, trainerId)
 * - sessions (userId, trainerId)
 * - client_progress (userId)
 * - workout_plans (userId, trainerId)
 * - point_transactions (userId, awardedBy)
 * - user_achievements (userId)
 * - user_rewards (userId)
 * - notifications (userId, senderId)
 * - social_posts (userId)
 * - social_comments (userId)
 * - client_trainer_assignments (clientId, trainerId, assignedBy)
 * - (20+ tables total)
 *
 * Migration Safety:
 * - Transaction-wrapped: All operations atomic (rollback on error)
 * - Idempotent: Checks if table exists before creating
 * - Console logging: Debug output for migration tracking
 * - Error handling: Try-catch with rollback on failure
 *
 * Testing Strategy:
 * - Verify ENUM values: INSERT with invalid role should fail
 * - Verify unique constraints: Duplicate email/username should fail
 * - Verify soft delete: deletedAt should NOT hard delete record
 * - Verify indexes: EXPLAIN ANALYZE queries should use indexes
 * - Verify role-specific fields: NULL trainer fields for client role
 *
 * Future Enhancements:
 * - Add organizationId FK (multi-tenant support)
 * - Add twoFactorEnabled BOOLEAN (2FA security)
 * - Add passwordResetToken STRING (forgot password flow)
 * - Add emailVerified BOOLEAN (email confirmation)
 * - Add lastPasswordChange DATE (force password rotation)
 * - Add loginAttempts INTEGER (brute force protection)
 * - Add lockedUntil DATE (account lockout)
 *
 * Created: 2025-02-12
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
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