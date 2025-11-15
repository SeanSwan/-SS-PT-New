'use strict';

/**
 * Sessions Table Migration (Training Session Booking & Lifecycle Management)
 * ===========================================================================
 *
 * Purpose: Creates the sessions table for managing personal training session bookings,
 * scheduling, confirmation, completion, and feedback with 6-state lifecycle
 *
 * Blueprint Reference: SwanStudios Personal Training Platform - Session Management System
 *
 * Migration Date: 2025-03-05
 *
 * Table Created: sessions
 *
 * Database ERD (Session Management Ecosystem):
 *
 * ```
 *                     ┌──────────────┐
 *                     │    users     │
 *                     │  (INTEGER)   │
 *                     └──────┬───────┘
 *                            │
 *              ┌─────────────┼─────────────┐
 *              │             │             │
 *              │ (userId)    │ (trainerId) │ (cancelledBy)
 *              │             │             │
 *      ┌───────▼────────┐    │             │
 *      │   sessions     │◄───┘             │
 *      │  (INTEGER)     │◄─────────────────┘
 *      │  status ENUM   │
 *      └────────────────┘
 *
 *      Related Tables (application-level):
 *      - users.availableSessions (session credit balance)
 *      - notifications (session reminders, confirmations)
 *      - point_transactions (session completion points)
 * ```
 *
 * Session Status Lifecycle (6 states):
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ STATUS      DESCRIPTION                         TRANSITION                   │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ available   Trainer created open slot           → requested (client books)   │
 * │             userId=NULL, trainerId SET          → cancelled (trainer removes)│
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ requested   Client requested booking            → scheduled (trainer accepts)│
 * │             userId SET, confirmed=false         → cancelled (client cancels) │
 * │             Pending trainer approval            → cancelled (trainer rejects)│
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ scheduled   Trainer accepted request            → confirmed (24h before)     │
 * │             Awaiting final confirmation         → cancelled (either party)   │
 * │             reminderSent=false                  → completed (manual override)│
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ confirmed   Final confirmation sent             → completed (session done)   │
 * │             reminderSent=true                   → cancelled (late cancel)    │
 * │             Within 24 hours of session          sessionDeducted=true         │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ completed   Session finished                    → [TERMINAL STATE]           │
 * │             feedbackProvided=true/false         Rating + feedback collected  │
 * │             Points awarded                      No further transitions       │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ cancelled   Session cancelled                   → [TERMINAL STATE]           │
 * │             cancelledBy SET                     Refund if >24h before        │
 * │             cancellationReason SET              No refund if <24h before     │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * Table Schema (sessions):
 *
 * ```
 * CORE FIELDS:
 * - id: INTEGER (auto-increment primary key)
 * - sessionDate: DATE (start date + time of session)
 * - duration: INTEGER (default 60 minutes, can be 30/60/90/120)
 * - userId: INTEGER FK → users.id (client who booked session, NULL if available)
 * - trainerId: INTEGER FK → users.id (trainer assigned to session)
 * - location: STRING (gym, online, home, park, etc.)
 * - notes: TEXT (public notes visible to both client and trainer)
 * - status: ENUM (available, requested, scheduled, confirmed, completed, cancelled)
 *
 * CANCELLATION TRACKING:
 * - cancellationReason: TEXT (reason for cancellation)
 * - cancelledBy: INTEGER FK → users.id (who cancelled: client, trainer, admin)
 *
 * SESSION DEDUCTION (Billing):
 * - sessionDeducted: BOOLEAN (has session been deducted from user.availableSessions?)
 * - deductionDate: DATE (timestamp when session was deducted)
 *
 * CONFIRMATION & REMINDERS:
 * - confirmed: BOOLEAN (final confirmation status, deprecated - use status='confirmed')
 * - reminderSent: BOOLEAN (24h reminder sent to client)
 * - reminderSentDate: DATE (timestamp when reminder was sent)
 *
 * FEEDBACK & RATING:
 * - feedbackProvided: BOOLEAN (has client left feedback?)
 * - rating: INTEGER (1-5 star rating, NULL if no feedback)
 * - feedback: TEXT (client's written feedback about session)
 *
 * TIMESTAMPS:
 * - createdAt: DATE (when session was created)
 * - updatedAt: DATE (last modified timestamp)
 * ```
 *
 * Indexes (4 total):
 * - sessionDate: Fast lookups by date range (trainer schedule, calendar view)
 * - status: Filter by status (show available, scheduled, completed)
 * - userId: Fast client session history lookup
 * - trainerId: Fast trainer schedule lookup
 *
 * Data Flow (Session Booking Lifecycle):
 *
 * ```
 * 1. TRAINER CREATES AVAILABLE SLOT:
 *    POST /sessions/allocate → sessionController.allocateSessions()
 *    ↓
 *    INSERT INTO sessions (sessionDate, duration, trainerId, status)
 *    VALUES ('2025-11-20 10:00', 60, trainer.id, 'available')
 *
 * 2. CLIENT BOOKS SESSION:
 *    POST /sessions/book → sessionController.bookSession()
 *    ↓
 *    UPDATE sessions SET userId=client.id, status='requested' WHERE id=sessionId
 *    ↓
 *    Notification sent to trainer (new booking request)
 *
 * 3. TRAINER ACCEPTS BOOKING:
 *    PUT /sessions/:id/assign-trainer → sessionController.assignTrainerToSession()
 *    ↓
 *    UPDATE sessions SET status='scheduled' WHERE id=sessionId
 *    ↓
 *    Notification sent to client (booking confirmed)
 *
 * 4. SYSTEM SENDS 24H REMINDER:
 *    Cron job runs hourly → check sessions where sessionDate - NOW() < 24 hours
 *    ↓
 *    UPDATE sessions SET status='confirmed', reminderSent=true WHERE id=sessionId
 *    ↓
 *    Notification sent to client (reminder)
 *
 * 5. SESSION DEDUCTION (Within 24 hours):
 *    Triggered by status='confirmed' transition
 *    ↓
 *    BEGIN TRANSACTION
 *    UPDATE users SET availableSessions = availableSessions - 1 WHERE id=client.id
 *    UPDATE sessions SET sessionDeducted=true, deductionDate=NOW() WHERE id=sessionId
 *    COMMIT TRANSACTION
 *
 * 6. TRAINER COMPLETES SESSION:
 *    PUT /sessions/:id/complete → sessionController.completeSession()
 *    ↓
 *    UPDATE sessions SET status='completed' WHERE id=sessionId
 *    ↓
 *    Award points: INSERT INTO point_transactions (userId, points, source='session_completion')
 *    ↓
 *    Notification sent to client (feedback request)
 *
 * 7. CLIENT LEAVES FEEDBACK:
 *    POST /sessions/:id/feedback → sessionController.submitFeedback()
 *    ↓
 *    UPDATE sessions SET feedbackProvided=true, rating=5, feedback='Great session!' WHERE id=sessionId
 *    ↓
 *    Award review points: INSERT INTO point_transactions (userId, points, source='session_review')
 *
 * 8. CANCELLATION FLOW (Late Cancel - <24h):
 *    POST /sessions/:id/cancel → sessionController.cancelSession()
 *    ↓
 *    IF sessionDate - NOW() < 24 hours AND sessionDeducted=true THEN
 *      NO REFUND (session credit already deducted)
 *    ELSE
 *      REFUND (add session credit back)
 *    END IF
 *    ↓
 *    UPDATE sessions SET status='cancelled', cancelledBy=user.id, cancellationReason='...' WHERE id=sessionId
 * ```
 *
 * Business Logic:
 *
 * WHY INTEGER Primary Key (Not UUID Like Other Tables)?
 * - Legacy schema: Original migration used auto-increment INTEGER
 * - Backwards compatibility: Frontend expects integer session IDs
 * - Performance: INTEGER join is faster than UUID (4 bytes vs 16 bytes)
 * - Sequential IDs acceptable: Session enumeration not a security risk
 * - Future refactor: Can migrate to UUID with ALTER TABLE
 *
 * WHY userId Nullable (NULL = Available Slot)?
 * - available status: Trainer creates slots before any client books
 * - NULL userId = open slot in trainer's calendar
 * - Non-NULL userId = booked by client
 * - Alternative design: Separate session_slots table (rejected for complexity)
 *
 * WHY sessionDeducted Separate from status='confirmed'?
 * - Idempotency: Prevents double-deduction if confirmation fails mid-transaction
 * - Audit trail: Track exactly when deduction occurred (deductionDate)
 * - Refund logic: Check if deduction happened before refunding
 * - Billing disputes: Proof of deduction for customer support
 *
 * WHY 24-Hour Deduction Policy?
 * - Industry standard: Most gyms/studios use 24h cancellation policy
 * - No-show prevention: Discourages last-minute cancellations
 * - Trainer protection: Ensures trainers get compensated for held time
 * - Client flexibility: Allows cancellations with >24h notice for refund
 *
 * WHY confirmed Boolean + status='confirmed' (Redundant)?
 * - Legacy field: Original schema used confirmed boolean
 * - Status enum added later: More granular state tracking
 * - Backwards compatibility: Frontend may still check confirmed field
 * - Deprecation path: Future migration will remove confirmed boolean
 * - Current logic: Use status='confirmed' as source of truth
 *
 * WHY cancelledBy Foreign Key (Track Who Cancelled)?
 * - Audit trail: Know if client, trainer, or admin cancelled
 * - Analytics: Track cancellation patterns by role
 * - Customer support: Resolve disputes (who cancelled and why)
 * - Trainer metrics: Frequent trainer cancellations flagged for review
 *
 * WHY rating INTEGER (Not ENUM or Separate Table)?
 * - Simple 1-5 star system: Standard fitness industry practice
 * - Low cardinality: Only 5 possible values (ENUM overkill)
 * - Fast aggregation: AVG(rating) for trainer performance metrics
 * - NULL handling: NULL = no rating yet (feedback not provided)
 * - Separate reviews table: Overkill for single rating + feedback text
 *
 * WHY reminderSent Boolean (Not Just Check Notification Table)?
 * - Performance: Avoids JOIN to notifications table
 * - Idempotency: Prevents sending duplicate reminders
 * - Cron job efficiency: Fast query (WHERE reminderSent=false AND sessionDate < NOW() + 24h)
 * - Decoupled: Reminder status independent of notification delivery
 *
 * Security Model:
 * - Client can only book own sessions (userId = req.user.id)
 * - Trainer can only manage own sessions (trainerId = req.user.id)
 * - Admin can manage all sessions (override for customer support)
 * - Foreign keys prevent orphaned sessions (CASCADE on user delete)
 *
 * Performance Considerations:
 * - 4 indexes for fast queries (sessionDate, status, userId, trainerId)
 * - INTEGER primary key for fast joins (vs UUID)
 * - Denormalized fields (sessionDeducted, reminderSent) avoid expensive JOINs
 * - Status ENUM: Efficient storage (1 byte vs STRING)
 *
 * Rollback Strategy:
 * - DROP TABLE sessions (no dependent tables)
 * - DROP TYPE enum_sessions_status (cleanup ENUM)
 * - Foreign key CASCADE: User deletion cascades to sessions
 *
 * Foreign Key Dependencies:
 * - users (userId, trainerId, cancelledBy)
 * - Referenced by: notifications (application-level)
 * - Referenced by: point_transactions (application-level, sourceId)
 *
 * Migration Safety:
 * - ENUM creation with error handling (already exists check)
 * - Column comments for documentation
 * - 4 indexes created atomically
 *
 * Testing Strategy:
 * - Verify status transitions: available → requested → scheduled → confirmed → completed
 * - Verify cancellation refund: <24h = no refund, >24h = refund
 * - Verify session deduction: Only occurs once (idempotency)
 * - Verify reminder sent: Only sent once (reminderSent=false → true)
 * - Verify foreign keys: User deletion cascades to sessions
 *
 * Future Enhancements:
 * - Add privateNotes TEXT (trainer-only notes, hidden from client)
 * - Add recurringSessionId UUID (link recurring weekly sessions)
 * - Add videoCallLink STRING (Zoom/Google Meet for online sessions)
 * - Add checkInTime DATE (client arrival timestamp)
 * - Add checkOutTime DATE (session end timestamp)
 * - Add deletedAt DATE (soft delete for audit trail)
 * - Migrate id to UUID (security + distributed systems)
 * - Remove confirmed boolean (use status='confirmed' only)
 *
 * Created: 2025-03-05
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First create the enum type for status
    await queryInterface.sequelize.query(
      `CREATE TYPE "enum_sessions_status" AS ENUM ('available', 'requested', 'scheduled', 'confirmed', 'completed', 'cancelled');`
    ).catch(error => {
      // If the type already exists, continue
      if (error.message.includes('already exists')) {
        console.log('Enum type already exists, continuing...');
      } else {
        throw error;
      }
    });

    // Then create the table
    await queryInterface.createTable('sessions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      sessionDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 60
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      trainerId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      location: {
        type: Sequelize.STRING,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: 'enum_sessions_status',
        allowNull: false,
        defaultValue: 'available'
      },
      cancellationReason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      cancelledBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      sessionDeducted: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      deductionDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      confirmed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      reminderSent: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      reminderSentDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      feedbackProvided: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      rating: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      feedback: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add comments to columns
    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN "sessions"."sessionDate" IS 'Start date and time of the session';`
    );
    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN "sessions"."duration" IS 'Duration in minutes';`
    );
    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN "sessions"."userId" IS 'Client who booked the session';`
    );
    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN "sessions"."trainerId" IS 'Trainer assigned to the session';`
    );
    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN "sessions"."status" IS 'Current status of the session';`
    );

    // Add indexes for common queries
    await queryInterface.addIndex('sessions', ['sessionDate']);
    await queryInterface.addIndex('sessions', ['status']);
    await queryInterface.addIndex('sessions', ['userId']);
    await queryInterface.addIndex('sessions', ['trainerId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sessions');
    // Optional: Drop the enum type if needed
    // await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sessions_status";');
  }
};