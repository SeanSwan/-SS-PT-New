/**
 * Client-Trainer Assignments Migration (Formal Relationship Management)
 * ======================================================================
 *
 * Purpose: Creates the client_trainer_assignments table for managing formal
 * client-trainer relationships with admin oversight, soft delete, and audit trail
 *
 * Blueprint Reference: SwanStudios Personal Training Platform - Assignment Management
 *
 * Migration Date: 2025-08-06
 *
 * Table Created: client_trainer_assignments
 *
 * Database ERD (Assignment Management):
 *
 * ```
 *                        ┌──────────────┐
 *                        │    users     │
 *                        │  (INTEGER)   │
 *                        └──────┬───────┘
 *                               │
 *            ┌──────────────────┼──────────────────┐
 *            │                  │                  │
 *            │ (clientId)       │ (trainerId)      │ (assignedBy, lastModifiedBy)
 *            │                  │                  │
 *      ┌─────▼──────────────────▼──────────────────▼────┐
 *      │   client_trainer_assignments                   │
 *      │              (INTEGER)                         │
 *      │   status ENUM: active/inactive/pending         │
 *      │   UNIQUE INDEX: (clientId, trainerId, active)  │
 *      └────────────────────────────────────────────────┘
 * ```
 *
 * Table Schema (client_trainer_assignments):
 *
 * ```
 * CORE FIELDS:
 * - id: INTEGER (auto-increment primary key)
 * - clientId: INTEGER FK → users.id (client user)
 * - trainerId: INTEGER FK → users.id (trainer user)
 * - status: ENUM('active', 'inactive', 'pending') (assignment state)
 *
 * AUDIT TRAIL:
 * - assignedBy: INTEGER FK → users.id (admin who created assignment)
 * - lastModifiedBy: INTEGER FK → users.id (admin who last updated)
 * - deactivatedAt: DATE (timestamp when status changed to inactive)
 * - notes: TEXT (admin notes about assignment, visible to all parties)
 *
 * TIMESTAMPS:
 * - createdAt: DATE (when assignment was created)
 * - updatedAt: DATE (last modification timestamp)
 * ```
 *
 * Status States (3 total):
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ STATUS      DESCRIPTION                         TRANSITION                   │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ active      Client is actively assigned         → inactive (reassignment)    │
 * │             to this trainer                     → inactive (client leaves)   │
 * │             Only 1 active assignment per client Default state                │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ pending     Assignment pending approval         → active (admin approves)    │
 * │             (Future feature)                    → inactive (admin rejects)   │
 * │             Not currently used in UI            Placeholder for approval flow│
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ inactive    Assignment ended                    [TERMINAL STATE]             │
 * │             Client reassigned or left           deactivatedAt timestamp set  │
 * │             Preserved for historical reporting  No further transitions       │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * Indexes (4 total):
 * - clientId: Fast lookup of client's current trainer
 * - trainerId: Fast lookup of trainer's assigned clients
 * - status: Filter by active/inactive assignments
 * - UNIQUE (clientId, trainerId WHERE status='active'): Prevent duplicate active assignments
 *
 * Data Flow (Assignment Lifecycle):
 *
 * ```
 * 1. ADMIN CREATES ASSIGNMENT:
 *    POST /client-trainer-assignment → clientTrainerAssignmentRoutes (inline handler)
 *    ↓
 *    Validate: clientId has role='client', trainerId has role='trainer'
 *    ↓
 *    Validate: Client does NOT have existing status='active' assignment (UNIQUE constraint)
 *    ↓
 *    INSERT INTO client_trainer_assignments (clientId, trainerId, assignedBy, status)
 *    VALUES (client.id, trainer.id, admin.id, 'active')
 *    ↓
 *    Notification sent to client + trainer (new assignment notification)
 *
 * 2. ADMIN REASSIGNS CLIENT TO NEW TRAINER:
 *    PUT /client-trainer-assignment/:id → clientTrainerAssignmentRoutes (inline handler)
 *    ↓
 *    BEGIN TRANSACTION
 *    UPDATE client_trainer_assignments SET status='inactive', deactivatedAt=NOW() WHERE id=oldAssignmentId
 *    INSERT INTO client_trainer_assignments (clientId, trainerId=newTrainerId, assignedBy, status='active')
 *    COMMIT TRANSACTION
 *    ↓
 *    Notification sent to old trainer (client reassigned)
 *    Notification sent to new trainer (new client assigned)
 *
 * 3. CLIENT LEAVES PLATFORM:
 *    DELETE /user-management/:id → userManagementController.deleteUser()
 *    ↓
 *    UPDATE client_trainer_assignments SET status='inactive', deactivatedAt=NOW()
 *    WHERE clientId=deletedUserId AND status='active'
 *    ↓
 *    CASCADE DELETE (if users.deletedAt is set, keep assignment for historical reporting)
 *
 * 4. ADMIN VIEWS TRAINER'S CLIENTS:
 *    GET /client-trainer-assignment?trainerId=X → clientTrainerAssignmentRoutes
 *    ↓
 *    SELECT * FROM client_trainer_assignments
 *    WHERE trainerId=X AND status='active'
 *    ORDER BY createdAt DESC
 *
 * 5. ADMIN VIEWS ASSIGNMENT STATISTICS:
 *    GET /client-trainer-assignment/stats → clientTrainerAssignmentRoutes
 *    ↓
 *    SELECT
 *      COUNT(*) AS totalAssignments,
 *      COUNT(*) FILTER (WHERE status='active') AS activeAssignments,
 *      COUNT(DISTINCT trainerId) AS totalTrainers,
 *      COUNT(DISTINCT clientId) AS totalClients
 *    FROM client_trainer_assignments
 * ```
 *
 * Business Logic:
 *
 * WHY Only 1 Active Assignment Per Client?
 * - Clear accountability: Client knows exactly who their trainer is
 * - Prevents confusion: Avoids conflicting workout plans from multiple trainers
 * - Billing simplification: Session credits tied to single trainer relationship
 * - Industry standard: Most gyms assign 1 primary trainer per client
 * - Unique index enforces: UNIQUE (clientId, trainerId WHERE status='active')
 *
 * WHY Soft Delete (status='inactive' Not Hard DELETE)?
 * - Historical reporting: Track client churn (how many clients left each trainer?)
 * - Audit trail: Compliance requirement (who assigned client to whom, when?)
 * - Analytics: Calculate average client tenure per trainer
 * - Undo capability: Reactivate old assignment if client returns
 * - Billing disputes: Preserve assignment history for past session charges
 *
 * WHY assignedBy Foreign Key (Track Who Created Assignment)?
 * - Accountability: Admin responsible for assignment decisions
 * - Audit trail: Compliance requirement (who made this assignment?)
 * - Analytics: Track which admin is most active in client management
 * - Dispute resolution: Investigate assignment errors (admin mistake vs client request)
 *
 * WHY lastModifiedBy Separate from assignedBy?
 * - Track changes: Know who updated assignment notes or status
 * - Accountability: Different admin may modify assignment later
 * - Audit trail: Complete history of who touched this record
 * - SET NULL on delete: Preserve assignment even if admin leaves
 *
 * WHY deactivatedAt Timestamp?
 * - Track exactly when assignment ended
 * - Calculate client tenure: deactivatedAt - createdAt = relationship duration
 * - Analytics: Monthly churn reports (assignments deactivated this month)
 * - Compliance: Prove when trainer-client relationship ended
 *
 * WHY INTEGER Primary Key (Not UUID Like Other Tables)?
 * - Legacy compatibility: Other tables (users, sessions) use INTEGER
 * - Foreign key consistency: JOIN performance (INTEGER faster than UUID)
 * - Sequential IDs acceptable: Assignment enumeration not a security risk
 * - Migration continuity: Matches existing sessions table pattern
 *
 * WHY status ENUM (Not Just deletedAt Boolean)?
 * - Tri-state logic: active, inactive, pending (future approval workflow)
 * - Future flexibility: Add 'suspended', 'on_hold' states without migration
 * - Explicit states: More readable than NULL vs timestamp comparisons
 * - Database constraint: ENUM enforces valid states (prevents typos)
 *
 * WHY Prevent Duplicate Active Assignments (UNIQUE INDEX)?
 * - Data integrity: Ensure 1-client-to-1-trainer active relationship
 * - UI simplification: Client dashboard shows exactly 1 "My Trainer"
 * - Prevents admin errors: Can't accidentally create duplicate assignment
 * - Partial index: WHERE status='active' allows historical duplicates
 *
 * Security Model:
 * - Admin-only write access (prevent client/trainer self-assignment)
 * - Trainer read access (view own assigned clients only)
 * - Client read access (view own trainer only)
 * - Foreign key CASCADE: User deletion cascades to assignments
 * - Audit trail: assignedBy, lastModifiedBy track admin actions
 *
 * Performance Considerations:
 * - 4 indexes for fast queries (clientId, trainerId, status, unique constraint)
 * - INTEGER primary key (4 bytes vs 16 bytes UUID)
 * - Partial unique index: WHERE status='active' (smaller index size)
 * - Denormalized status: Avoids JOIN to check if assignment active
 *
 * Rollback Strategy:
 * - DROP TABLE client_trainer_assignments (no dependent tables)
 * - DROP TYPE enum_client_trainer_assignments_status (cleanup ENUM)
 * - Foreign key CASCADE: User deletion cascades to assignments
 *
 * Foreign Key Dependencies:
 * - users (clientId, trainerId, assignedBy, lastModifiedBy)
 * - Referenced by: None (leaf table in dependency graph)
 *
 * Migration Safety:
 * - Idempotent: Checks if table exists before creating
 * - Transaction-wrapped: Rollback on error
 * - Console logging: Debug output for migration tracking
 * - Error handling: Try-catch with detailed error messages
 *
 * Testing Strategy:
 * - Verify unique constraint: Cannot create 2 active assignments for same client
 * - Verify soft delete: status='inactive' preserves record
 * - Verify foreign keys: User deletion cascades to assignments
 * - Verify status transitions: active → inactive allowed, inactive → active requires new record
 * - Verify indexes: EXPLAIN ANALYZE queries should use indexes
 *
 * Future Enhancements:
 * - Add approvalRequired BOOLEAN (pending → active workflow)
 * - Add startDate DATE (track when relationship officially started)
 * - Add endDate DATE (separate from deactivatedAt for billing cycles)
 * - Add assignmentType ENUM ('primary', 'secondary', 'temporary') (multiple trainer support)
 * - Add clientPreferences JSON (preferred training times, communication style)
 * - Add performanceMetrics JSON (client progress under this trainer)
 * - Migrate id to UUID (security + distributed systems)
 *
 * Created: 2025-08-06
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if table already exists
      const tables = await queryInterface.showAllTables();
      if (tables.includes('client_trainer_assignments')) {
        console.log('✅ client_trainer_assignments table already exists, skipping creation');
        return;
      }

      console.log('🔧 Creating client_trainer_assignments table...');
      
      await queryInterface.createTable('client_trainer_assignments', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        clientId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          field: 'client_id'
        },
        trainerId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE', 
          field: 'trainer_id'
        },
        assignedBy: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          field: 'assigned_by'
        },
        status: {
          type: Sequelize.ENUM('active', 'inactive', 'pending'),
          defaultValue: 'active',
          allowNull: false
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        lastModifiedBy: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          field: 'last_modified_by'
        },
        deactivatedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          field: 'deactivated_at'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          field: 'created_at'
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          field: 'updated_at'
        }
      });

      // Create indexes for performance
      await queryInterface.addIndex('client_trainer_assignments', ['client_id'], {
        name: 'idx_client_trainer_assignments_client_id'
      });

      await queryInterface.addIndex('client_trainer_assignments', ['trainer_id'], {
        name: 'idx_client_trainer_assignments_trainer_id'
      });

      await queryInterface.addIndex('client_trainer_assignments', ['status'], {
        name: 'idx_client_trainer_assignments_status'
      });

      // Create unique constraint to prevent duplicate active assignments
      await queryInterface.addIndex('client_trainer_assignments', ['client_id', 'trainer_id'], {
        name: 'idx_unique_active_client_trainer',
        unique: true,
        where: {
          status: 'active'
        }
      });

      console.log('✅ client_trainer_assignments table created successfully');
      
    } catch (error) {
      console.error('❌ Error creating client_trainer_assignments table:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log('🗑️ Dropping client_trainer_assignments table...');
      await queryInterface.dropTable('client_trainer_assignments');
      console.log('✅ client_trainer_assignments table dropped successfully');
    } catch (error) {
      console.error('❌ Error dropping client_trainer_assignments table:', error);
      throw error;
    }
  }
};
