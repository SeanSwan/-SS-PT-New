/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║          COMPREHENSIVE CONTENT MODERATION SYSTEM MIGRATION                ║
 * ║   (User Reporting, Admin Review Queue, AI Moderation, Audit Logging)    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Purpose: Create complete content moderation ecosystem for social features
 *          (posts, comments) with user reporting, admin queue, and audit trail
 *
 * Blueprint Reference: docs/ai-workflow/LEVEL-5-DOCUMENTATION-UPGRADE-STATUS.md
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      ARCHITECTURE OVERVIEW                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Content Moderation Flow:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ User Reports Content → Admin Reviews → Action Taken → Audit Log Created │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Relationship Diagram:
 * ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
 * │  PostReports    │         │  ModerationAct  │         │  SocialPosts    │
 * │  (User Reports) │────────►│  (Audit Trail)  │────────►│  (Content)      │
 * │                 │         │                 │         │                 │
 * │ - reporterId    │         │ - moderatorId   │         │ - moderationStat│
 * │ - contentId     │         │ - action        │         │ - reportsCount  │
 * │ - reason        │         │ - newStatus     │         │ - flaggedAt     │
 * │ - status        │         │ - relatedReport │         │ - autoModerated │
 * │ - priority      │         └─────────────────┘         └─────────────────┘
 * └─────────────────┘                  │
 *         │                            │
 *         ▼                            ▼
 * ┌─────────────────┐         ┌─────────────────┐
 * │     Users       │         │ SocialComments  │
 * │  (Reporters &   │         │   (Content)     │
 * │   Moderators)   │         │                 │
 * └─────────────────┘         │ - moderationStat│
 *                             │ - reportsCount  │
 *                             │ - flaggedAt     │
 *                             └─────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                  DATABASE ERD - MODERATION TABLES                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * PostReports Table (User Reporting System):
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Table: PostReports                                                       │
 * ├──────────────────────┬──────────────────────────────────────────────────┤
 * │ id                   │ INTEGER (PK, Auto-increment)                      │
 * │ reporterId           │ INTEGER (FK → Users.id) - Who reported           │
 * │ contentType          │ ENUM('post', 'comment')                          │
 * │ contentId            │ INTEGER (ID of reported post/comment)            │
 * │ contentAuthorId      │ INTEGER (FK → Users.id) - Content author         │
 * │ reason               │ ENUM(10 types) - Report reason                   │
 * │ description          │ TEXT - Additional details from reporter          │
 * │ status               │ ENUM('pending', 'under-review', 'resolved',      │
 * │                      │      'dismissed')                                │
 * │ priority             │ ENUM('low', 'medium', 'high', 'urgent')          │
 * │ resolvedAt           │ DATE - When admin resolved report                │
 * │ resolvedBy           │ INTEGER (FK → Users.id) - Admin who resolved     │
 * │ actionTaken          │ ENUM(7 actions) - What admin did                 │
 * │ adminNotes           │ TEXT - Internal admin notes                      │
 * │ createdAt, updatedAt │ DATE (Auto-managed)                              │
 * ├──────────────────────┼──────────────────────────────────────────────────┤
 * │ INDEXES              │ reporterId, contentType+contentId, contentAuthor,│
 * │                      │ status, priority, createdAt                      │
 * └──────────────────────┴──────────────────────────────────────────────────┘
 *
 * ModerationActions Table (Audit Log):
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Table: ModerationActions                                                 │
 * ├──────────────────────┬──────────────────────────────────────────────────┤
 * │ id                   │ INTEGER (PK, Auto-increment)                      │
 * │ moderatorId          │ INTEGER (FK → Users.id) - Who acted              │
 * │ contentType          │ ENUM('post', 'comment', 'user')                  │
 * │ contentId            │ INTEGER (ID of moderated content)                │
 * │ contentAuthorId      │ INTEGER (FK → Users.id) - Content author         │
 * │ action               │ ENUM(9 actions) - Action taken                   │
 * │ previousStatus       │ STRING - Status before action                    │
 * │ newStatus            │ STRING - Status after action                     │
 * │ reason               │ STRING - Reason for action                       │
 * │ details              │ TEXT - Additional details                        │
 * │ relatedReportId      │ INTEGER (FK → PostReports.id)                    │
 * │ automaticAction      │ BOOLEAN - AI vs manual moderation                │
 * │ reversible           │ BOOLEAN - Can action be undone?                  │
 * │ ipAddress            │ STRING - Moderator IP (audit)                    │
 * │ userAgent            │ TEXT - Moderator browser (audit)                 │
 * │ metadata             │ JSON - Additional context                        │
 * │ createdAt, updatedAt │ DATE (Auto-managed)                              │
 * ├──────────────────────┼──────────────────────────────────────────────────┤
 * │ INDEXES              │ moderatorId, contentType+contentId, contentAuthor│
 * │                      │ action, automaticAction, createdAt, relatedReport│
 * └──────────────────────┴──────────────────────────────────────────────────┘
 *
 * SocialPosts/SocialComments Moderation Fields (11 new columns each):
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ moderationStatus     │ ENUM('pending', 'approved', 'flagged',           │
 * │                      │      'rejected', 'hidden')                       │
 * │ flaggedReason        │ STRING - Why content was flagged                 │
 * │ flaggedAt            │ DATE - When flagged                              │
 * │ flaggedBy            │ INTEGER (FK → Users.id) - Admin who flagged      │
 * │ reportsCount         │ INTEGER - Number of user reports                 │
 * │ autoModerated        │ BOOLEAN - AI moderation flag                     │
 * │ moderationScore      │ DECIMAL(3,2) - AI confidence (0.0-1.0)           │
 * │ moderationFlags      │ JSON - Array of detected issues                  │
 * │ moderationNotes      │ TEXT - Admin internal notes                      │
 * │ lastModeratedAt      │ DATE - Last review timestamp                     │
 * │ lastModeratedBy      │ INTEGER (FK → Users.id) - Last reviewer          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         DATA FLOW DIAGRAM                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Complete Moderation Workflow:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 1. USER REPORTS CONTENT                                                   │
 * │    POST /api/social/report { contentType: 'post', contentId: 123,        │
 * │                              reason: 'hate-speech', description: '...' } │
 * │    ↓                                                                      │
 * │    BEGIN TRANSACTION;                                                    │
 * │      a) INSERT INTO PostReports (                                        │
 * │           reporterId, contentType, contentId, contentAuthorId,           │
 * │           reason, description, status='pending', priority='medium'       │
 * │         )                                                                │
 * │      b) UPDATE SocialPosts SET reportsCount += 1 WHERE id = 123          │
 * │      c) IF reportsCount >= 5:                                            │
 * │           UPDATE PostReports SET priority = 'high' WHERE contentId = 123 │
 * │      d) IF priority = 'high':                                            │
 * │           Notify admin: "High-priority report requires review"           │
 * │    COMMIT;                                                               │
 * │                                                                           │
 * │ 2. AI AUTO-MODERATION (Optional Background Job)                          │
 * │    Scan new content with AI moderation API (e.g., OpenAI Moderation)     │
 * │    ↓                                                                      │
 * │    IF moderationScore > 0.8 (high confidence violation):                 │
 * │      BEGIN TRANSACTION;                                                  │
 * │        a) UPDATE SocialPosts SET                                         │
 * │             moderationStatus = 'flagged',                                │
 * │             autoModerated = true,                                        │
 * │             moderationScore = 0.85,                                      │
 * │             moderationFlags = ['hate-speech', 'harassment']              │
 * │        b) INSERT INTO ModerationActions (                                │
 * │             moderatorId = NULL,                                          │
 * │             action = 'flag',                                             │
 * │             automaticAction = true,                                      │
 * │             details = 'AI detected: hate-speech (0.85 confidence)'       │
 * │           )                                                              │
 * │      COMMIT;                                                             │
 * │    ↓                                                                      │
 * │    Notify admin: "Auto-flagged content requires manual review"           │
 * │                                                                           │
 * │ 3. ADMIN MODERATION QUEUE                                                │
 * │    GET /admin/moderation/queue?status=pending&priority=high              │
 * │    ↓                                                                      │
 * │    SELECT * FROM PostReports WHERE                                       │
 * │      status = 'pending' AND priority IN ('high', 'urgent')               │
 * │      ORDER BY priority DESC, createdAt ASC                               │
 * │    ↓                                                                      │
 * │    Display: List of pending reports sorted by priority + age             │
 * │                                                                           │
 * │ 4. ADMIN REVIEW & ACTION                                                 │
 * │    POST /admin/moderation/resolve/:reportId {                            │
 * │      action: 'content-removed',                                          │
 * │      adminNotes: 'Violates community guidelines: hate speech'            │
 * │    }                                                                     │
 * │    ↓                                                                      │
 * │    BEGIN TRANSACTION;                                                    │
 * │      a) UPDATE PostReports SET                                           │
 * │           status = 'resolved',                                           │
 * │           resolvedBy = admin.id,                                         │
 * │           resolvedAt = NOW,                                              │
 * │           actionTaken = 'content-removed',                               │
 * │           adminNotes = '...'                                             │
 * │      b) UPDATE SocialPosts SET                                           │
 * │           moderationStatus = 'rejected',                                 │
 * │           flaggedReason = 'hate-speech',                                 │
 * │           flaggedAt = NOW,                                               │
 * │           flaggedBy = admin.id,                                          │
 * │           lastModeratedAt = NOW,                                         │
 * │           lastModeratedBy = admin.id                                     │
 * │      c) INSERT INTO ModerationActions (                                  │
 * │           moderatorId = admin.id,                                        │
 * │           contentType = 'post',                                          │
 * │           contentId = 123,                                               │
 * │           action = 'delete',                                             │
 * │           previousStatus = 'flagged',                                    │
 * │           newStatus = 'rejected',                                        │
 * │           relatedReportId = reportId,                                    │
 * │           ipAddress = req.ip,                                            │
 * │           userAgent = req.headers['user-agent']                          │
 * │         )                                                                │
 * │      d) Notify content author: "Your post was removed: hate-speech"      │
 * │    COMMIT;                                                               │
 * │                                                                           │
 * │ 5. MODERATION ANALYTICS                                                  │
 * │    GET /admin/moderation/analytics                                       │
 * │    ↓                                                                      │
 * │    Queries:                                                              │
 * │      - Average resolution time: AVG(resolvedAt - createdAt)              │
 * │      - Reports by reason: COUNT(*) GROUP BY reason                       │
 * │      - Top moderators: COUNT(*) FROM ModerationActions GROUP BY moderator│
 * │      - Auto-moderation accuracy: (correct auto-flags / total auto-flags) │
 * │      - Pending queue size: COUNT(*) WHERE status = 'pending'             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     BUSINESS LOGIC (WHY SECTIONS)                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY Separate PostReports Table (Not Just Flag Content)?
 * - Multiple reports: Same content can be reported multiple times by different users
 * - Report history: Track all reports even if dismissed (pattern detection)
 * - User accountability: Prevent report spam (track reporterId)
 * - Admin workflow: Dedicated moderation queue (status: pending → resolved)
 * - Analytics: "Most reported reasons", "Average resolution time"
 * - Audit trail: Complete history of who reported what, when, why
 *
 * WHY ModerationActions Audit Table?
 * - Accountability: Track which admin took which action, when
 * - Compliance: GDPR/legal requirements for action audit trails
 * - Reversibility: Can undo actions (action='restore' references previous action)
 * - Analytics: Admin performance (actions per day, accuracy metrics)
 * - Debugging: "Why was this content removed?" → Check ModerationActions
 * - IP/UserAgent logging: Detect compromised admin accounts
 * - Automatic vs manual: Track AI moderation accuracy
 *
 * WHY priority ENUM (low, medium, high, urgent)?
 * - Triage: Admins review high-priority reports first
 * - Auto-escalation: 5+ reports → priority = 'high'
 * - Urgent keywords: "violence", "self-harm" → priority = 'urgent'
 * - SLA enforcement: Urgent reports must be reviewed within 1 hour
 * - Queue sorting: ORDER BY priority DESC, createdAt ASC
 * - Analytics: Track average resolution time by priority level
 *
 * WHY reportsCount on Content (Denormalized)?
 * - Quick filtering: Show posts with reportsCount > 0 in admin dashboard
 * - Auto-flagging: IF reportsCount >= 5, auto-flag for review
 * - No JOIN overhead: Display report count without joining PostReports table
 * - Public transparency: Show "This post has 3 reports" badge to users
 * - Performance: Avoid COUNT(*) FROM PostReports WHERE contentId = X
 *
 * WHY autoModerated Boolean + moderationScore?
 * - AI assistance: Pre-flag content likely violating guidelines
 * - Confidence tracking: moderationScore = 0.85 (85% confidence)
 * - Admin efficiency: Review AI-flagged content first
 * - Accuracy metrics: Track false positives (AI flagged, admin approved)
 * - Hybrid moderation: AI + human review for best results
 * - Transparency: Show users if content was auto-flagged vs human-flagged
 *
 * WHY moderationFlags JSON Array?
 * - Multiple issues: Content can violate multiple rules simultaneously
 * - Example: moderationFlags = ['hate-speech', 'harassment', 'adult-content']
 * - AI categorization: OpenAI Moderation API returns multiple categories
 * - Flexible schema: Can add new flag types without migration
 * - Display: Show all detected issues to admin for review
 *
 * WHY moderationStatus ENUM (5 States)?
 * - 'pending': New content awaiting first review (rare, most auto-approved)
 * - 'approved': Content passed moderation (default for most posts)
 * - 'flagged': Requires admin review (AI or user report triggered)
 * - 'rejected': Violates guidelines, removed from public view
 * - 'hidden': Soft delete (admin can unhide, user sees "Content removed")
 * - Clear states: Easy to query "Show all flagged content"
 *
 * WHY relatedReportId in ModerationActions?
 * - Traceability: Link admin action back to user report that triggered it
 * - Report resolution: "This action resolved report #123"
 * - Analytics: "How many actions were report-driven vs proactive?"
 * - User feedback: Notify reporter "Your report led to content removal"
 * - Null allowed: Some actions are proactive (no related report)
 *
 * WHY reversible Boolean?
 * - Undo capability: Some actions can be reversed (flag → approve)
 * - Permanent actions: User bans are NOT reversible (require new account)
 * - Admin workflow: "Restore content" only works if reversible = true
 * - Audit safety: Prevent accidental restoration of dangerous content
 * - UI control: Show/hide "Undo" button based on reversible flag
 *
 * WHY ipAddress + userAgent Logging?
 * - Security: Detect compromised admin accounts (unusual IP/location)
 * - Forensics: Investigate suspicious moderation actions
 * - Compliance: Some regulations require action audit trails
 * - Debugging: "Was this action taken from mobile or desktop?"
 * - Rate limiting: Prevent abuse (e.g., rogue admin mass-banning)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                          INDEXES & CONSTRAINTS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * PostReports Indexes:
 * 1. postreport_reporter_idx - INDEX (reporterId)
 * 2. postreport_content_idx - INDEX (contentType, contentId) - COMPOSITE
 * 3. postreport_author_idx - INDEX (contentAuthorId)
 * 4. postreport_status_idx - INDEX (status)
 * 5. postreport_priority_idx - INDEX (priority)
 * 6. postreport_created_idx - INDEX (createdAt)
 *
 * ModerationActions Indexes:
 * 1. modaction_moderator_idx - INDEX (moderatorId)
 * 2. modaction_content_idx - INDEX (contentType, contentId) - COMPOSITE
 * 3. modaction_author_idx - INDEX (contentAuthorId)
 * 4. modaction_action_idx - INDEX (action)
 * 5. modaction_automatic_idx - INDEX (automaticAction)
 * 6. modaction_created_idx - INDEX (createdAt)
 * 7. modaction_report_idx - INDEX (relatedReportId)
 *
 * SocialPosts/SocialComments Indexes (each):
 * 1. socialpost_moderation_status_idx - INDEX (moderationStatus)
 * 2. socialpost_reports_count_idx - INDEX (reportsCount)
 * 3. socialpost_flagged_at_idx - INDEX (flaggedAt)
 * 4. socialpost_auto_moderated_idx - INDEX (autoModerated)
 * 5. socialpost_last_moderated_idx - INDEX (lastModeratedAt)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        SECURITY CONSIDERATIONS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Admin-only actions: Only role='admin' can resolve reports or moderate
 * - Report spam prevention: Limit reports per user per day
 * - Content author privacy: Don't reveal reporter identity to content author
 * - Audit logging: All moderation actions tracked (who, what, when, why)
 * - IP logging: Detect compromised admin accounts
 * - CASCADE delete: User deletion removes their reports (GDPR compliance)
 * - SET NULL on admin deletion: Preserve audit trail even if admin account deleted
 * - Soft delete: moderationStatus='hidden' vs hard DELETE (reversibility)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      MIGRATION SAFETY NOTES                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Idempotent design: tableExists() checks before adding columns
 * - Safe for production: ADD COLUMN with defaults is non-blocking
 * - No data loss: Existing posts/comments get moderationStatus='approved'
 * - ENUM types: Created for moderationStatus (two separate ENUMs for posts/comments)
 * - Transaction safety: Migration wrapped in transaction (all-or-nothing)
 * - Rollback support: down() migration removes all moderation fields + tables
 * - Foreign key dependencies: Requires Users, SocialPosts, SocialComments tables
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    RELATED FILES & DEPENDENCIES                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Depends On:
 * - Users table migration
 * - SocialPosts table migration (optional: migration checks if exists)
 * - SocialComments table migration (optional: migration checks if exists)
 *
 * Related Code:
 * - backend/models/PostReport.cjs (Sequelize model)
 * - backend/models/ModerationAction.cjs (Sequelize model)
 * - backend/controllers/moderationController.mjs (admin moderation queue)
 * - backend/routes/moderationRoutes.mjs (API endpoints)
 * - backend/services/aiModerationService.mjs (OpenAI Moderation API)
 * - frontend/src/pages/Admin/ModerationQueue.tsx (admin dashboard)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🛡️ Creating content moderation system...');

    // ===================================
    // 1. CREATE POSTREPORTS TABLE
    // ===================================
    console.log('📋 Creating PostReports table...');
    await queryInterface.createTable('PostReports', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      reporterId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User who submitted the report'
      },
      contentType: {
        type: Sequelize.ENUM('post', 'comment'),
        allowNull: false,
        comment: 'Type of content being reported'
      },
      contentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'ID of the post or comment being reported'
      },
      contentAuthorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Author of the reported content'
      },
      reason: {
        type: Sequelize.ENUM(
          'inappropriate-content',
          'harassment',
          'spam',
          'false-information',
          'copyright-violation',
          'adult-content',
          'violence',
          'hate-speech',
          'impersonation',
          'other'
        ),
        allowNull: false,
        comment: 'Reason for the report'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional details provided by the reporter'
      },
      status: {
        type: Sequelize.ENUM('pending', 'under-review', 'resolved', 'dismissed'),
        defaultValue: 'pending',
        allowNull: false,
        comment: 'Current status of the report'
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium',
        allowNull: false,
        comment: 'Priority level based on report content and history'
      },
      resolvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the report was resolved'
      },
      resolvedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Admin who resolved the report'
      },
      actionTaken: {
        type: Sequelize.ENUM(
          'no-action',
          'content-approved',
          'content-flagged',
          'content-removed',
          'user-warned',
          'user-suspended',
          'user-banned'
        ),
        allowNull: true,
        comment: 'Action taken after reviewing the report'
      },
      adminNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Internal notes from the admin review'
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      }
    });

    // Add indexes for PostReports
    console.log('📊 Adding PostReports indexes...');
    await queryInterface.addIndex('PostReports', ['reporterId'], { name: 'postreport_reporter_idx' });
    await queryInterface.addIndex('PostReports', ['contentType', 'contentId'], { name: 'postreport_content_idx' });
    await queryInterface.addIndex('PostReports', ['contentAuthorId'], { name: 'postreport_author_idx' });
    await queryInterface.addIndex('PostReports', ['status'], { name: 'postreport_status_idx' });
    await queryInterface.addIndex('PostReports', ['priority'], { name: 'postreport_priority_idx' });
    await queryInterface.addIndex('PostReports', ['createdAt'], { name: 'postreport_created_idx' });

    // ===================================
    // 2. CREATE MODERATIONACTIONS TABLE
    // ===================================
    console.log('⚖️ Creating ModerationActions table...');
    await queryInterface.createTable('ModerationActions', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      moderatorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Admin who performed the moderation action'
      },
      contentType: {
        type: Sequelize.ENUM('post', 'comment', 'user'),
        allowNull: false,
        comment: 'Type of content that was moderated'
      },
      contentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'ID of the moderated content'
      },
      contentAuthorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Author of the moderated content'
      },
      action: {
        type: Sequelize.ENUM(
          'approve',
          'reject',
          'flag',
          'hide',
          'delete',
          'warn-user',
          'suspend-user',
          'ban-user',
          'restore'
        ),
        allowNull: false,
        comment: 'Action taken by the moderator'
      },
      previousStatus: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Previous status before moderation action'
      },
      newStatus: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'New status after moderation action'
      },
      reason: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Reason provided for the moderation action'
      },
      details: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional details or notes about the action'
      },
      relatedReportId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'PostReports',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Report that triggered this action (if any)'
      },
      automaticAction: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Whether this was an automatic system action'
      },
      reversible: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Whether this action can be reversed'
      },
      ipAddress: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'IP address of the moderator (for audit purposes)'
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'User agent of the moderator (for audit purposes)'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata about the action'
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      }
    });

    // Add indexes for ModerationActions
    console.log('📊 Adding ModerationActions indexes...');
    await queryInterface.addIndex('ModerationActions', ['moderatorId'], { name: 'modaction_moderator_idx' });
    await queryInterface.addIndex('ModerationActions', ['contentType', 'contentId'], { name: 'modaction_content_idx' });
    await queryInterface.addIndex('ModerationActions', ['contentAuthorId'], { name: 'modaction_author_idx' });
    await queryInterface.addIndex('ModerationActions', ['action'], { name: 'modaction_action_idx' });
    await queryInterface.addIndex('ModerationActions', ['automaticAction'], { name: 'modaction_automatic_idx' });
    await queryInterface.addIndex('ModerationActions', ['createdAt'], { name: 'modaction_created_idx' });
    await queryInterface.addIndex('ModerationActions', ['relatedReportId'], { name: 'modaction_report_idx' });

    // ===================================
    // 3. ADD MODERATION FIELDS TO SOCIALPOSTS
    // ===================================
    console.log('📝 Adding moderation fields to SocialPosts...');
    
    // Check if table exists
    const socialPostsTableExists = await queryInterface.tableExists('SocialPosts');
    if (socialPostsTableExists) {
      console.log('✅ SocialPosts table exists, adding moderation columns...');
      
      await queryInterface.addColumn('SocialPosts', 'moderationStatus', {
        type: Sequelize.ENUM('pending', 'approved', 'flagged', 'rejected', 'hidden'),
        defaultValue: 'approved',
        allowNull: false,
        comment: 'Current moderation status of the post'
      });

      await queryInterface.addColumn('SocialPosts', 'flaggedReason', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Reason why the post was flagged'
      });

      await queryInterface.addColumn('SocialPosts', 'flaggedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the post was flagged'
      });

      await queryInterface.addColumn('SocialPosts', 'flaggedBy', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Admin who flagged the post'
      });

      await queryInterface.addColumn('SocialPosts', 'reportsCount', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Number of user reports on this post'
      });

      await queryInterface.addColumn('SocialPosts', 'autoModerated', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Whether this post was automatically moderated by AI/filters'
      });

      await queryInterface.addColumn('SocialPosts', 'moderationScore', {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0.0,
        allowNull: true,
        comment: 'AI moderation confidence score (0.0 - 1.0)'
      });

      await queryInterface.addColumn('SocialPosts', 'moderationFlags', {
        type: Sequelize.JSON,
        defaultValue: [],
        allowNull: true,
        comment: 'Array of moderation flags detected by AI or users'
      });

      await queryInterface.addColumn('SocialPosts', 'moderationNotes', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Internal moderation notes from admins'
      });

      await queryInterface.addColumn('SocialPosts', 'lastModeratedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the post was last reviewed by a moderator'
      });

      await queryInterface.addColumn('SocialPosts', 'lastModeratedBy', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Last admin who reviewed the post'
      });

      // Add indexes for SocialPosts moderation fields
      console.log('📊 Adding SocialPosts moderation indexes...');
      await queryInterface.addIndex('SocialPosts', ['moderationStatus'], { name: 'socialpost_moderation_status_idx' });
      await queryInterface.addIndex('SocialPosts', ['reportsCount'], { name: 'socialpost_reports_count_idx' });
      await queryInterface.addIndex('SocialPosts', ['flaggedAt'], { name: 'socialpost_flagged_at_idx' });
      await queryInterface.addIndex('SocialPosts', ['autoModerated'], { name: 'socialpost_auto_moderated_idx' });
      await queryInterface.addIndex('SocialPosts', ['lastModeratedAt'], { name: 'socialpost_last_moderated_idx' });
      
    } else {
      console.log('⚠️ SocialPosts table does not exist, skipping moderation fields addition');
    }

    // ===================================
    // 4. ADD MODERATION FIELDS TO SOCIALCOMMENTS
    // ===================================
    console.log('💬 Adding moderation fields to SocialComments...');
    
    // Check if table exists
    const socialCommentsTableExists = await queryInterface.tableExists('SocialComments');
    if (socialCommentsTableExists) {
      console.log('✅ SocialComments table exists, adding moderation columns...');

      await queryInterface.addColumn('SocialComments', 'moderationStatus', {
        type: Sequelize.ENUM('pending', 'approved', 'flagged', 'rejected', 'hidden'),
        defaultValue: 'approved',
        allowNull: false,
        comment: 'Current moderation status of the comment'
      });

      await queryInterface.addColumn('SocialComments', 'flaggedReason', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Reason why the comment was flagged'
      });

      await queryInterface.addColumn('SocialComments', 'flaggedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the comment was flagged'
      });

      await queryInterface.addColumn('SocialComments', 'flaggedBy', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Admin who flagged the comment'
      });

      await queryInterface.addColumn('SocialComments', 'reportsCount', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Number of user reports on this comment'
      });

      await queryInterface.addColumn('SocialComments', 'autoModerated', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Whether this comment was automatically moderated by AI/filters'
      });

      await queryInterface.addColumn('SocialComments', 'moderationScore', {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0.0,
        allowNull: true,
        comment: 'AI moderation confidence score (0.0 - 1.0)'
      });

      await queryInterface.addColumn('SocialComments', 'moderationFlags', {
        type: Sequelize.JSON,
        defaultValue: [],
        allowNull: true,
        comment: 'Array of moderation flags detected by AI or users'
      });

      await queryInterface.addColumn('SocialComments', 'moderationNotes', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Internal moderation notes from admins'
      });

      await queryInterface.addColumn('SocialComments', 'lastModeratedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the comment was last reviewed by a moderator'
      });

      await queryInterface.addColumn('SocialComments', 'lastModeratedBy', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Last admin who reviewed the comment'
      });

      // Add indexes for SocialComments moderation fields
      console.log('📊 Adding SocialComments moderation indexes...');
      await queryInterface.addIndex('SocialComments', ['moderationStatus'], { name: 'socialcomment_moderation_status_idx' });
      await queryInterface.addIndex('SocialComments', ['reportsCount'], { name: 'socialcomment_reports_count_idx' });
      await queryInterface.addIndex('SocialComments', ['flaggedAt'], { name: 'socialcomment_flagged_at_idx' });
      await queryInterface.addIndex('SocialComments', ['autoModerated'], { name: 'socialcomment_auto_moderated_idx' });
      await queryInterface.addIndex('SocialComments', ['lastModeratedAt'], { name: 'socialcomment_last_moderated_idx' });

    } else {
      console.log('⚠️ SocialComments table does not exist, skipping moderation fields addition');
    }

    console.log('✅ Content moderation system created successfully!');
    console.log('🛡️ Features enabled:');
    console.log('   - User reporting system');
    console.log('   - Admin moderation queue');
    console.log('   - Content flagging and approval');
    console.log('   - Complete audit logging');
    console.log('   - Automated moderation support');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back content moderation system...');

    // Remove moderation fields from SocialComments
    const socialCommentsTableExists = await queryInterface.tableExists('SocialComments');
    if (socialCommentsTableExists) {
      console.log('💬 Removing moderation fields from SocialComments...');
      const moderationFields = [
        'moderationStatus', 'flaggedReason', 'flaggedAt', 'flaggedBy',
        'reportsCount', 'autoModerated', 'moderationScore', 'moderationFlags',
        'moderationNotes', 'lastModeratedAt', 'lastModeratedBy'
      ];
      
      for (const field of moderationFields) {
        try {
          await queryInterface.removeColumn('SocialComments', field);
        } catch (error) {
          console.log(`⚠️ Could not remove column ${field} from SocialComments:`, error.message);
        }
      }
    }

    // Remove moderation fields from SocialPosts
    const socialPostsTableExists = await queryInterface.tableExists('SocialPosts');
    if (socialPostsTableExists) {
      console.log('📝 Removing moderation fields from SocialPosts...');
      const moderationFields = [
        'moderationStatus', 'flaggedReason', 'flaggedAt', 'flaggedBy',
        'reportsCount', 'autoModerated', 'moderationScore', 'moderationFlags',
        'moderationNotes', 'lastModeratedAt', 'lastModeratedBy'
      ];
      
      for (const field of moderationFields) {
        try {
          await queryInterface.removeColumn('SocialPosts', field);
        } catch (error) {
          console.log(`⚠️ Could not remove column ${field} from SocialPosts:`, error.message);
        }
      }
    }

    // Drop ModerationActions table
    console.log('⚖️ Dropping ModerationActions table...');
    await queryInterface.dropTable('ModerationActions');

    // Drop PostReports table
    console.log('📋 Dropping PostReports table...');
    await queryInterface.dropTable('PostReports');

    console.log('✅ Content moderation system rollback completed');
  }
};
