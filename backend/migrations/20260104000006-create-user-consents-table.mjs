/**
 * User Consents Table Migration (AI Usage Disclaimer Tracking)
 * ===========================================================
 *
 * Purpose: Creates the UserConsents table for tracking user acceptance of
 * AI usage disclaimers and liability waivers
 *
 * Blueprint Reference: SwanStudios Unified AI Backend Implementation Plan v1.0
 *
 * Migration Date: 2026-01-04
 *
 * Table Created: UserConsents
 *
 * Database ERD:
 * ```
 *      ┌──────────────────────┐                    ┌──────────────────────┐
 *      │ Users                │◄───────────────────│ UserConsents         │
 *      │   (UUID)             │  (userId FK)       │   (UUID)              │
 *      └──────┬───────────────┘                    └──────┬───────────────┘
 *             │                                           │
 *             │ (grantedBy)                               │ (consentId)
 *             │                                           │
 *      ┌──────▼───────────────┐                    ┌──────▼───────────────┐
 *      │ Users                │                    │ ConsentTypes         │
 *      │   (UUID)             │                    │   (ENUM)             │
 *      └──────────────────────┘                    └──────────────────────┘
 * ```
 *
 * Consent Types:
 * - ai_usage: AI workout/nutrition disclaimer acceptance
 * - data_processing: General data processing consent
 * - marketing: Marketing communications consent
 * - third_party: Third-party service integrations
 * - research: Participation in research studies
 *
 * Data Flow (Consent Management):
 * ```
 * 1. USER FIRST USE:
 *    access AI feature → check consent → show disclaimer modal
 *
 * 2. CONSENT CAPTURE:
 *    user accepts → create consent record → allow feature access
 *
 * 3. CONSENT TRACKING:
 *    store version + timestamp → audit trail → legal compliance
 *
 * 4. CONSENT MANAGEMENT:
 *    user profile → view/manage consents → withdraw if desired
 *
 * 5. COMPLIANCE AUDITS:
 *    admin dashboard → consent analytics → GDPR compliance reports
 * ```
 *
 * Indexes (4 total):
 * - userId: User's consent history
 * - consentType: Filter by consent type
 * - grantedAt: Chronological consent tracking
 * - grantedBy: Admin consent granting history
 *
 * Business Logic:
 *
 * WHY consentType ENUM Field?
 * - Standardized consent categories for legal compliance
 * - Different consent requirements for different features
 * - Audit trail categorization
 * - GDPR lawful basis tracking
 *
 * WHY version Field?
 * - Track which version of disclaimer was accepted
 * - Support disclaimer updates requiring re-consent
 * - Legal compliance (prove user saw current version)
 * - Version-specific consent validation
 *
 * WHY grantedBy Foreign Key (Optional)?
 * - Track admin-granted consents (for minors, etc.)
 * - Audit trail for consent granting
 * - Parental consent scenarios
 * - SET NULL on delete (preserve consent history)
 *
 * WHY ipAddress Field?
 * - Geographic consent validation
 * - Fraud prevention (consent from expected location)
 * - Legal compliance (consent location tracking)
 * - Audit trail enhancement
 *
 * WHY userAgent Field?
 * - Device/browser consent tracking
 * - Fraud detection (unusual consent patterns)
 * - Technical audit trail
 * - Support troubleshooting
 *
 * Security Model:
 * - User-specific consent access (own consents only)
 * - Admin read access (all consents for compliance)
 * - Immutable consent records (no updates allowed)
 * - Audit trail protection
 *
 * Performance Considerations:
 * - 4 indexes for common queries (user, type, date, admin)
 * - Consent type indexing for feature gating
 * - User-specific queries for access control
 * - Version checking for disclaimer updates
 *
 * Rollback Strategy:
 * - DROP TABLE UserConsents (consent records can be recreated)
 * - May affect feature access if consents are required
 *
 * Dependencies:
 * - Users table (userId and grantedBy foreign keys)
 *
 * Created: 2026-01-04
 * Part of: Phase 1 Gamification Foundation (AI Disclaimer System)
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('UserConsents', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    consentType: {
      type: Sequelize.ENUM(
        'ai_usage',
        'data_processing',
        'marketing',
        'third_party',
        'research'
      ),
      allowNull: false
    },
    version: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: '1.0',
      comment: 'Version of the consent/disclaimer accepted'
    },
    grantedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    },
    ipAddress: {
      type: Sequelize.STRING,
      allowNull: true,
      validate: {
        isIP: true
      },
      comment: 'IP address where consent was granted'
    },
    userAgent: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Browser/device user agent string'
    },
    grantedBy: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Admin who granted consent (for parental/minor consents)'
    },
    metadata: {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Additional consent context (feature accessed, etc.)'
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false
    }
  });

  // Add unique constraint to prevent duplicate consents of same type/version
  await queryInterface.addConstraint('UserConsents', {
    fields: ['userId', 'consentType', 'version'],
    type: 'unique',
    name: 'unique_user_consent_type_version'
  });

  // Add indexes for performance
  await queryInterface.addIndex('UserConsents', ['userId']);
  await queryInterface.addIndex('UserConsents', ['consentType']);
  await queryInterface.addIndex('UserConsents', ['grantedAt']);
  await queryInterface.addIndex('UserConsents', ['grantedBy']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('UserConsents');
}