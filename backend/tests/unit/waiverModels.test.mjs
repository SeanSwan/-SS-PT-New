/**
 * waiverModels - Phase 5W-B Model Tests
 * ======================================
 * Tests for waiver schema model definitions, migration export shape,
 * and runtime validator behavior.
 *
 * Sections A-G: Structural (getAttributes/getTableName inspection)
 * Sections H-J: Runtime validators (direct validator function calls)
 */
import { describe, it, expect } from 'vitest';
import WaiverVersion from '../../models/WaiverVersion.mjs';
import WaiverRecord from '../../models/WaiverRecord.mjs';
import WaiverRecordVersion from '../../models/WaiverRecordVersion.mjs';
import WaiverConsentFlags from '../../models/WaiverConsentFlags.mjs';
import PendingWaiverMatch from '../../models/PendingWaiverMatch.mjs';
import AiConsentLog from '../../models/AiConsentLog.mjs';

// ── Section A: WaiverVersion ────────────────────────────────────────

describe('WaiverVersion model definition', () => {
  it('1 - has correct table name', () => {
    expect(WaiverVersion.getTableName()).toBe('waiver_versions');
  });

  it('2 - has correct model name', () => {
    expect(WaiverVersion.name).toBe('WaiverVersion');
  });

  it('3 - defines required attributes', () => {
    const attrs = WaiverVersion.getAttributes();
    const fields = [
      'id', 'waiverType', 'activityType', 'version', 'title', 'htmlText',
      'markdownText', 'textHash', 'effectiveAt', 'retiredAt', 'requiresReconsent',
      'createdByUserId', 'createdAt', 'updatedAt',
    ];
    for (const field of fields) {
      expect(attrs).toHaveProperty(field);
    }
  });

  it('4 - waiverType enum includes expected values', () => {
    const values = WaiverVersion.getAttributes().waiverType.values;
    expect(values).toEqual(['core', 'activity_addendum', 'ai_notice']);
  });

  it('5 - activityType enum includes contract values', () => {
    const values = WaiverVersion.getAttributes().activityType.values;
    expect(values).toEqual(['HOME_GYM_PT', 'PARK_TRAINING', 'SWIMMING_LESSONS']);
  });

  it('6 - has compound unique index on type/activity/version', () => {
    const idx = WaiverVersion.options.indexes.find((i) => i.name === 'waiver_versions_type_activity_version_unique');
    expect(idx).toBeDefined();
    expect(idx.unique).toBe(true);
    expect(idx.fields).toEqual(['waiverType', 'activityType', 'version']);
  });

  it('7 - has timestamps enabled', () => {
    expect(WaiverVersion.options.timestamps).toBe(true);
  });

  it('8 - has associate function defined', () => {
    expect(typeof WaiverVersion.associate).toBe('function');
  });
});

// ── Section B: WaiverRecord ─────────────────────────────────────────

describe('WaiverRecord model definition', () => {
  it('9 - has correct table name', () => {
    expect(WaiverRecord.getTableName()).toBe('waiver_records');
  });

  it('10 - has correct model name', () => {
    expect(WaiverRecord.name).toBe('WaiverRecord');
  });

  it('11 - defines required attributes', () => {
    const attrs = WaiverRecord.getAttributes();
    const fields = [
      'id', 'userId', 'fullName', 'dateOfBirth', 'email', 'phone', 'status', 'source',
      'activityTypes', 'signatureData', 'signedAt', 'ipAddress', 'userAgent',
      'submittedByGuardian', 'guardianName', 'guardianTypedSignature', 'metadata',
      'createdAt', 'updatedAt',
    ];
    for (const field of fields) {
      expect(attrs).toHaveProperty(field);
    }
  });

  it('12 - userId is nullable and references Users', () => {
    const attr = WaiverRecord.getAttributes().userId;
    expect(attr.allowNull).toBe(true);
    expect(attr.references).toEqual({ model: 'Users', key: 'id' });
  });

  it('13 - status defaults to pending_match', () => {
    expect(WaiverRecord.getAttributes().status.defaultValue).toBe('pending_match');
  });

  it('14 - source enum includes contract values', () => {
    const values = WaiverRecord.getAttributes().source.values;
    expect(values).toEqual(['qr', 'header_waiver', 'admin_tablet', 'in_app']);
  });

  it('14b - status enum includes revoked', () => {
    const values = WaiverRecord.getAttributes().status.values;
    expect(values).toEqual(['pending_match', 'linked', 'superseded', 'revoked']);
  });

  it('15 - has expected indexes', () => {
    const indexes = WaiverRecord.options.indexes;
    expect(indexes.find((i) => i.name === 'waiver_records_userId')).toBeDefined();
    expect(indexes.find((i) => i.name === 'waiver_records_email')).toBeDefined();
    expect(indexes.find((i) => i.name === 'waiver_records_phone')).toBeDefined();
    expect(indexes.find((i) => i.name === 'waiver_records_status')).toBeDefined();
    expect(indexes.find((i) => i.name === 'waiver_records_dob_email')).toBeDefined();
    expect(indexes.find((i) => i.name === 'waiver_records_dob_phone')).toBeDefined();
  });

  it('16 - has timestamps enabled', () => {
    expect(WaiverRecord.options.timestamps).toBe(true);
  });

  it('17 - has associate function defined', () => {
    expect(typeof WaiverRecord.associate).toBe('function');
  });
});

// ── Section C: WaiverRecordVersion ──────────────────────────────────

describe('WaiverRecordVersion model definition', () => {
  it('18 - has correct table name', () => {
    expect(WaiverRecordVersion.getTableName()).toBe('waiver_record_versions');
  });

  it('19 - defines required attributes', () => {
    const attrs = WaiverRecordVersion.getAttributes();
    const fields = ['id', 'waiverRecordId', 'waiverVersionId', 'accepted', 'acceptedAt', 'createdAt', 'updatedAt'];
    for (const field of fields) {
      expect(attrs).toHaveProperty(field);
    }
  });

  it('20 - has FK refs and unique compound index', () => {
    const attrs = WaiverRecordVersion.getAttributes();
    expect(attrs.waiverRecordId.references).toEqual({ model: 'waiver_records', key: 'id' });
    expect(attrs.waiverVersionId.references).toEqual({ model: 'waiver_versions', key: 'id' });

    const idx = WaiverRecordVersion.options.indexes.find(
      (i) => i.name === 'waiver_record_versions_record_version_unique',
    );
    expect(idx).toBeDefined();
    expect(idx.unique).toBe(true);
    expect(idx.fields).toEqual(['waiverRecordId', 'waiverVersionId']);
  });

  it('21 - has timestamps and associate function', () => {
    expect(WaiverRecordVersion.options.timestamps).toBe(true);
    expect(typeof WaiverRecordVersion.associate).toBe('function');
  });

  it('21b - accepted defaults to false', () => {
    expect(WaiverRecordVersion.getAttributes().accepted.defaultValue).toBe(false);
  });
});

// ── Section D: WaiverConsentFlags ───────────────────────────────────

describe('WaiverConsentFlags model definition', () => {
  it('22 - has correct table name', () => {
    expect(WaiverConsentFlags.getTableName()).toBe('waiver_consent_flags');
  });

  it('23 - waiverRecordId is PK and no id field exists', () => {
    const attrs = WaiverConsentFlags.getAttributes();
    expect(attrs).not.toHaveProperty('id');
    expect(attrs.waiverRecordId.primaryKey).toBe(true);
    expect(attrs.waiverRecordId.autoIncrement).toBeUndefined();
  });

  it('24 - defines contract-compliant consent flag fields', () => {
    const attrs = WaiverConsentFlags.getAttributes();
    const fields = [
      'waiverRecordId', 'aiConsentAccepted', 'liabilityAccepted',
      'mediaConsentAccepted', 'guardianAcknowledged', 'createdAt', 'updatedAt',
    ];
    for (const field of fields) {
      expect(attrs).toHaveProperty(field);
    }
    // Ensure old field names are NOT present
    expect(attrs).not.toHaveProperty('mediaReleaseAccepted');
    expect(attrs).not.toHaveProperty('guardianAccepted');
    expect(attrs).not.toHaveProperty('guardianName');
    expect(attrs).not.toHaveProperty('guardianRelationship');
    expect(attrs.aiConsentAccepted.type.constructor.name).toBe('BOOLEAN');
  });

  it('25 - has timestamps and associate function', () => {
    expect(WaiverConsentFlags.options.timestamps).toBe(true);
    expect(typeof WaiverConsentFlags.associate).toBe('function');
  });
});

// ── Section E: PendingWaiverMatch ───────────────────────────────────

describe('PendingWaiverMatch model definition', () => {
  it('26 - has correct table name and required fields', () => {
    expect(PendingWaiverMatch.getTableName()).toBe('pending_waiver_matches');
    const attrs = PendingWaiverMatch.getAttributes();
    const fields = [
      'id', 'waiverRecordId', 'candidateUserId', 'confidenceScore',
      'matchMethod', 'status', 'reviewedByUserId', 'reviewedAt', 'createdAt', 'updatedAt',
    ];
    for (const field of fields) {
      expect(attrs).toHaveProperty(field);
    }
  });

  it('27 - has FK refs, contract-compliant status enum, and indexes', () => {
    const attrs = PendingWaiverMatch.getAttributes();
    expect(attrs.waiverRecordId.references).toEqual({ model: 'waiver_records', key: 'id' });
    expect(attrs.candidateUserId.references).toEqual({ model: 'Users', key: 'id' });
    expect(attrs.reviewedByUserId.references).toEqual({ model: 'Users', key: 'id' });
    expect(attrs.status.defaultValue).toBe('pending_review');
    expect(attrs.status.values).toEqual(['pending_review', 'auto_linked', 'approved', 'rejected']);

    const idx = PendingWaiverMatch.options.indexes;
    expect(idx.find((i) => i.name === 'pending_waiver_matches_waiverRecordId')).toBeDefined();
    expect(idx.find((i) => i.name === 'pending_waiver_matches_candidateUserId')).toBeDefined();
    expect(idx.find((i) => i.name === 'pending_waiver_matches_status')).toBeDefined();
  });

  it('28 - has timestamps and associate function', () => {
    expect(PendingWaiverMatch.options.timestamps).toBe(true);
    expect(typeof PendingWaiverMatch.associate).toBe('function');
  });
});

// ── Section F: AiConsentLog ─────────────────────────────────────────

describe('AiConsentLog model definition', () => {
  it('29 - has correct table name and required fields', () => {
    expect(AiConsentLog.getTableName()).toBe('ai_consent_logs');
    const attrs = AiConsentLog.getAttributes();
    const fields = [
      'id', 'userId', 'action', 'sourceType', 'sourceId', 'actorUserId',
      'reason', 'metadata', 'createdAt', 'updatedAt',
    ];
    for (const field of fields) {
      expect(attrs).toHaveProperty(field);
    }
  });

  it('30 - action/sourceType enums and sourceId nullability are correct', () => {
    const attrs = AiConsentLog.getAttributes();
    expect(attrs.action.values).toEqual(['granted', 'withdrawn', 'override_used']);
    expect(attrs.sourceType.values).toEqual(['ai_privacy_profile', 'waiver_record', 'admin_override']);
    expect(attrs.sourceId.allowNull).toBe(true);
  });

  it('31 - has FK refs, indexes, timestamps, and associate function', () => {
    const attrs = AiConsentLog.getAttributes();
    expect(attrs.userId.references).toEqual({ model: 'Users', key: 'id' });
    expect(attrs.actorUserId.references).toEqual({ model: 'Users', key: 'id' });

    const idx = AiConsentLog.options.indexes;
    expect(idx.find((i) => i.name === 'ai_consent_logs_userId')).toBeDefined();
    expect(idx.find((i) => i.name === 'ai_consent_logs_sourceType_sourceId')).toBeDefined();

    expect(AiConsentLog.options.timestamps).toBe(true);
    expect(typeof AiConsentLog.associate).toBe('function');
  });
});

// ── Section G: Migration consistency ────────────────────────────────

describe('Migration consistency', () => {
  it('32 - original migration file exists and exports up/down', async () => {
    const migration = await import('../../migrations/20260227000001-create-waiver-tables.cjs');
    expect(typeof migration.default.up).toBe('function');
    expect(typeof migration.default.down).toBe('function');
  });

  it('32b - reconciliation migration file exists and exports up/down', async () => {
    const migration = await import('../../migrations/20260227000002-reconcile-waiver-tables.cjs');
    expect(typeof migration.default.up).toBe('function');
    expect(typeof migration.default.down).toBe('function');
  });
});

// ── Section H: WaiverVersion cross-field validator (runtime) ────────

describe('WaiverVersion — activityType ↔ waiverType cross-field validation', () => {
  const validator =
    WaiverVersion.getAttributes().activityType.validate.activityTypeMatchesWaiverType;

  it('V1 - rejects non-null activityType when waiverType is core', () => {
    const ctx = { waiverType: 'core' };
    expect(() => validator.call(ctx, 'HOME_GYM_PT')).toThrow('activityType must be null');
  });

  it('V2 - rejects non-null activityType when waiverType is ai_notice', () => {
    const ctx = { waiverType: 'ai_notice' };
    expect(() => validator.call(ctx, 'PARK_TRAINING')).toThrow('activityType must be null');
  });

  it('V3 - rejects null activityType when waiverType is activity_addendum', () => {
    const ctx = { waiverType: 'activity_addendum' };
    expect(() => validator.call(ctx, null)).toThrow('activityType is required');
  });

  it('V4 - accepts HOME_GYM_PT + activity_addendum combination', () => {
    const ctx = { waiverType: 'activity_addendum' };
    expect(() => validator.call(ctx, 'HOME_GYM_PT')).not.toThrow();
  });

  it('V5 - accepts null activityType + core combination', () => {
    const ctx = { waiverType: 'core' };
    expect(() => validator.call(ctx, null)).not.toThrow();
  });
});

// ── Section I: WaiverRecord email-or-phone validator (runtime) ──────

describe('WaiverRecord — emailOrPhoneRequired model-level validation', () => {
  const validator = WaiverRecord.options.validate.emailOrPhoneRequired;

  it('V6 - rejects record with both email and phone null/empty', () => {
    const ctx = { email: null, phone: null };
    expect(() => validator.call(ctx)).toThrow('At least one of email or phone is required');
  });

  it('V7 - accepts record with email only (phone null)', () => {
    const ctx = { email: 'test@example.com', phone: null };
    expect(() => validator.call(ctx)).not.toThrow();
  });

  it('V8 - accepts record with phone only (email null)', () => {
    const ctx = { email: null, phone: '555-1234' };
    expect(() => validator.call(ctx)).not.toThrow();
  });

  it('V9 - accepts record with both email and phone', () => {
    const ctx = { email: 'test@example.com', phone: '555-1234' };
    expect(() => validator.call(ctx)).not.toThrow();
  });
});

// ── Section J: PendingWaiverMatch confidenceScore validator (runtime) ──

describe('PendingWaiverMatch — confidenceScore validation', () => {
  const validator = PendingWaiverMatch.getAttributes().confidenceScore.validate.isInRange;

  it('V10 - rejects confidenceScore < 0', () => {
    expect(() => validator(-0.1)).toThrow('confidenceScore must be between 0 and 1');
  });

  it('V11 - rejects confidenceScore > 1', () => {
    expect(() => validator(1.5)).toThrow('confidenceScore must be between 0 and 1');
  });

  it('V12 - accepts confidenceScore = 0.85 (within range)', () => {
    expect(() => validator(0.85)).not.toThrow();
  });
});

// NOTE: CHECK constraints (chk_wv_activity_type, chk_wr_contact_required,
// chk_pwm_confidence) are DB-layer enforcement tested via integration/smoke
// tests in Phase 5W-C (public waiver API) against a live database.
// Unit tests validate the equivalent model-layer validators above.
