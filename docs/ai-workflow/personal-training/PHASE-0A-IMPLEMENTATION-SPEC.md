# 🚀 PHASE 0A: BACKEND FOUNDATIONS IMPLEMENTATION SPEC
## Critical Backend Enhancements Before Phase 1

**Target Audience**: Roo Code (Backend Specialist)
**Timeline**: 2 weeks (10 working days)
**Priority**: CRITICAL - Must complete before Phase 1 (Foundation)

---

## 📋 EXECUTIVE SUMMARY

This spec covers **7 critical backend enhancements** that must be implemented before starting Phase 1 of the Personal Training Master Blueprint v3.0.

**Why Phase 0A?**
- Master Blueprint v3.0 is 85% complete
- Missing 15% are critical backend requirements
- These enhancements enable secure, scalable, compliant system
- Estimated effort: 47-62 hours (~6-8 working days with buffer)

**After Phase 0A completion**: Proceed with Phase 1 (Foundation) from Master Blueprint v3.0.

---

## 🎯 DELIVERABLES CHECKLIST

### Critical (Must Have)
- [ ] **1. PII Separation in Database** (8-10h)
- [ ] **2. Consent Tracking System** (6-8h)
- [ ] **3. JSON Schema Validation** (10-12h)
- [ ] **4. Event-Driven Architecture** (12-16h)
- [ ] **5. Stripe Payment Links Integration** (6-8h)

### High Priority (Should Have)
- [ ] **6. Rate Limiting** (4-6h)
- [ ] **7. Cultural Sensitivity Updates** (1-2h)

**Total Estimated Effort**: 47-62 hours

---

## 🔴 CRITICAL DELIVERABLE #1: PII SEPARATION IN DATABASE

**Problem**: Currently, PII (names, DOB, emergency contacts) is stored in same JSON as training data, violating GDPR data minimization.

**Goal**: Separate PII into encrypted table with row-level security.

### Database Schema

```sql
-- ============================================
-- PII TABLE (Encrypted, Restricted Access)
-- ============================================

CREATE TABLE client_profile_pii (
  client_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Personal Identifiable Information
  full_name TEXT NOT NULL,
  preferred_name TEXT,
  date_of_birth DATE NOT NULL,
  blood_type VARCHAR(10),
  phone_number TEXT,
  email TEXT UNIQUE NOT NULL,

  -- Emergency Contact
  emergency_contact JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Structure: { name: string, relationship: string, phone: string }

  -- Address (if needed)
  address JSONB,
  -- Structure: { street: string, city: string, state: string, zip: string }

  -- Encryption Metadata
  encrypted_at TIMESTAMP DEFAULT NOW(),
  encryption_key_id VARCHAR(50), -- Reference to AWS KMS key

  -- Audit Trail
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_accessed_at TIMESTAMP,
  accessed_by VARCHAR(100), -- User ID who accessed PII

  -- Soft Delete (GDPR Right to Deletion)
  deleted_at TIMESTAMP,
  deletion_reason TEXT
);

-- Indexes
CREATE INDEX idx_pii_email ON client_profile_pii(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_pii_phone ON client_profile_pii(phone_number) WHERE deleted_at IS NULL;

-- Row-Level Security
ALTER TABLE client_profile_pii ENABLE ROW LEVEL SECURITY;

-- Policy: Trainers can only see their assigned clients' PII
CREATE POLICY trainer_pii_access ON client_profile_pii
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id
      FROM trainer_client_assignments
      WHERE trainer_id = current_setting('app.current_user_id')::uuid
    )
  );

-- Policy: Admins see all
CREATE POLICY admin_pii_access ON client_profile_pii
  FOR ALL
  USING (
    current_setting('app.current_user_role') = 'admin'
  );

-- ============================================
-- NON-PII TABLE (Training Data, Wider Access)
-- ============================================

CREATE TABLE client_profile_training (
  client_id UUID PRIMARY KEY REFERENCES client_profile_pii(client_id) ON DELETE CASCADE,

  -- Demographics (Aggregated, Less Sensitive)
  age INTEGER NOT NULL, -- Age only, not DOB
  gender VARCHAR(20),
  height_inches INTEGER,
  weight_lbs DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,2),
  bmi DECIMAL(4,2),

  -- Training Information
  training_goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  training_start_date DATE,
  years_training_experience INTEGER,

  -- Medical (Non-Identifying)
  injury_history JSONB DEFAULT '[]'::jsonb,
  movement_screen JSONB DEFAULT '{}'::jsonb,
  current_medications JSONB DEFAULT '[]'::jsonb,
  supplements JSONB DEFAULT '[]'::jsonb,
  allergies JSONB DEFAULT '[]'::jsonb,

  -- Wearable Data
  wearable_device VARCHAR(50), -- 'whoop', 'oura', 'garmin'
  wearable_integration_active BOOLEAN DEFAULT FALSE,

  -- Training Tier
  training_tier VARCHAR(20), -- 'tier_1', 'tier_2', 'tier_3'
  session_rate_usd DECIMAL(7,2),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_training_tier ON client_profile_training(training_tier);
CREATE INDEX idx_training_age_gender ON client_profile_training(age, gender);

-- Grant AI systems access to training data ONLY (no PII)
REVOKE ALL ON client_profile_pii FROM ai_service_role;
GRANT SELECT ON client_profile_training TO ai_service_role;
```

### Access Control Functions

```typescript
// backend/services/pii-access.service.ts

import { db } from '../db';
import { auditLog } from './audit.service';

export class PIIAccessService {
  /**
   * Access PII with automatic audit logging
   */
  async getClientPII(clientId: string, accessedBy: string, reason: string) {
    // Log access attempt
    await auditLog.log({
      action: 'PII_ACCESS',
      resource: 'client_profile_pii',
      resourceId: clientId,
      userId: accessedBy,
      reason,
      timestamp: new Date()
    });

    // Fetch PII
    const pii = await db.query(`
      UPDATE client_profile_pii
      SET last_accessed_at = NOW(),
          accessed_by = $2
      WHERE client_id = $1
        AND deleted_at IS NULL
      RETURNING *
    `, [clientId, accessedBy]);

    if (!pii) {
      throw new Error('Client not found or access denied');
    }

    return pii;
  }

  /**
   * Soft delete PII (GDPR Right to Deletion)
   */
  async deleteClientPII(clientId: string, deletedBy: string, reason: string) {
    await db.query(`
      UPDATE client_profile_pii
      SET deleted_at = NOW(),
          deletion_reason = $2,
          updated_at = NOW()
      WHERE client_id = $1
    `, [clientId, reason]);

    await auditLog.log({
      action: 'PII_DELETED',
      resource: 'client_profile_pii',
      resourceId: clientId,
      userId: deletedBy,
      reason,
      timestamp: new Date()
    });
  }

  /**
   * Get non-PII training data (AI-safe)
   */
  async getClientTrainingData(clientId: string) {
    // No audit required - not PII
    return db.query(`
      SELECT * FROM client_profile_training
      WHERE client_id = $1
    `, [clientId]);
  }
}
```

### Migration Script

```sql
-- migrations/001_separate_pii_from_training.sql

-- Step 1: Create new tables
-- (Run schema creation above)

-- Step 2: Migrate existing data from master_prompt JSON to new tables
INSERT INTO client_profile_pii (client_id, full_name, preferred_name, date_of_birth, email, phone_number, emergency_contact)
SELECT
  id AS client_id,
  data->'client_profile'->'basic_info'->>'name' AS full_name,
  data->'client_profile'->'basic_info'->>'preferred_name' AS preferred_name,
  (data->'client_profile'->'basic_info'->>'date_of_birth')::date AS date_of_birth,
  data->'client_profile'->'basic_info'->>'email' AS email,
  data->'client_profile'->'basic_info'->>'phone' AS phone_number,
  data->'client_profile'->'basic_info'->'emergency_contact' AS emergency_contact
FROM master_prompts
WHERE data->'client_profile'->'basic_info' IS NOT NULL;

INSERT INTO client_profile_training (client_id, age, gender, height_inches, weight_lbs, training_goals, injury_history)
SELECT
  id AS client_id,
  (data->'client_profile'->'basic_info'->>'age')::integer AS age,
  data->'client_profile'->'basic_info'->>'gender' AS gender,
  (data->'client_profile'->'basic_info'->>'height_inches')::integer AS height_inches,
  (data->'client_profile'->'basic_info'->>'weight_lbs')::decimal AS weight_lbs,
  data->'client_profile'->'training_goals' AS training_goals,
  data->'client_profile'->'training_history'->'injury_history' AS injury_history
FROM master_prompts
WHERE data->'client_profile' IS NOT NULL;

-- Step 3: Verify data migration
SELECT
  (SELECT COUNT(*) FROM client_profile_pii) AS pii_count,
  (SELECT COUNT(*) FROM client_profile_training) AS training_count,
  (SELECT COUNT(*) FROM master_prompts) AS original_count;

-- Step 4: Backup original data
CREATE TABLE master_prompts_backup AS SELECT * FROM master_prompts;
```

### Acceptance Criteria

- [ ] PII and training data stored in separate tables
- [ ] Row-level security policies active
- [ ] AI service role CANNOT access PII table
- [ ] Audit logging captures all PII access attempts
- [ ] Soft delete implemented (GDPR compliance)
- [ ] Migration script tested with sample data

---

## 🔴 CRITICAL DELIVERABLE #2: CONSENT TRACKING SYSTEM

**Problem**: Consent currently stored in JSON (not auditable, no version tracking).

**Goal**: Database-backed consent tracking with full audit trail.

### Database Schema

```sql
-- ============================================
-- CONSENT TRACKING
-- ============================================

CREATE TABLE consent_versions (
  version VARCHAR(10) PRIMARY KEY, -- '3.0', '3.1', etc.
  effective_date DATE NOT NULL,
  full_text TEXT NOT NULL,
  summary TEXT,
  changes_from_previous TEXT,
  requires_re_consent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE client_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_profile_pii(client_id) ON DELETE CASCADE,

  -- Consent Details
  consent_version VARCHAR(10) NOT NULL REFERENCES consent_versions(version),
  consent_type VARCHAR(50) NOT NULL, -- 'data_collection', 'ai_processing', 'third_party_sharing', 'wearable_integration'
  consent_granted BOOLEAN NOT NULL,

  -- Proof of Consent
  ip_address INET,
  user_agent TEXT,
  consent_method VARCHAR(20), -- 'web_form', 'email', 'paper', 'verbal'
  signature_data TEXT, -- Base64 signature if digital signing used

  -- Timestamps
  granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP, -- Some consents expire
  revoked_at TIMESTAMP,
  revoked_reason TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure one active consent per type per client
  CONSTRAINT unique_active_consent UNIQUE (client_id, consent_type, consent_version)
    WHERE revoked_at IS NULL
);

-- Indexes
CREATE INDEX idx_consents_client_type ON client_consents(client_id, consent_type, consent_granted);
CREATE INDEX idx_consents_version ON client_consents(consent_version);
CREATE INDEX idx_consents_expires ON client_consents(expires_at) WHERE expires_at IS NOT NULL AND revoked_at IS NULL;
```

### API Endpoints

```typescript
// backend/routes/consent.routes.ts

import { Router } from 'express';
import { ConsentService } from '../services/consent.service';

const router = Router();
const consentService = new ConsentService();

/**
 * POST /api/consent/grant
 * Grant consent for a specific type
 */
router.post('/grant', async (req, res) => {
  const {
    clientId,
    consentType,
    consentVersion,
    consentGranted
  } = req.body;

  const consent = await consentService.grantConsent({
    clientId,
    consentType,
    consentVersion,
    consentGranted,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    consentMethod: 'web_form'
  });

  res.json({ success: true, consent });
});

/**
 * POST /api/consent/revoke
 * Revoke consent (GDPR Right to Withdraw Consent)
 */
router.post('/revoke', async (req, res) => {
  const { clientId, consentType, reason } = req.body;

  await consentService.revokeConsent(clientId, consentType, reason);

  res.json({ success: true, message: 'Consent revoked successfully' });
});

/**
 * GET /api/consent/:clientId
 * Get all consents for a client (for GDPR data export)
 */
router.get('/:clientId', async (req, res) => {
  const consents = await consentService.getClientConsents(req.params.clientId);
  res.json({ success: true, consents });
});

/**
 * GET /api/consent/check/:clientId/:consentType
 * Check if client has valid consent for a type
 */
router.get('/check/:clientId/:consentType', async (req, res) => {
  const { clientId, consentType } = req.params;
  const hasConsent = await consentService.hasValidConsent(clientId, consentType);
  res.json({ success: true, hasConsent });
});

export default router;
```

### Service Implementation

```typescript
// backend/services/consent.service.ts

import { db } from '../db';

export class ConsentService {
  async grantConsent(data: {
    clientId: string;
    consentType: string;
    consentVersion: string;
    consentGranted: boolean;
    ipAddress: string;
    userAgent: string;
    consentMethod: string;
  }) {
    // Check if consent version exists
    const version = await db.query(
      'SELECT * FROM consent_versions WHERE version = $1',
      [data.consentVersion]
    );

    if (!version) {
      throw new Error(`Consent version ${data.consentVersion} not found`);
    }

    // Revoke any existing active consent for this type
    await db.query(`
      UPDATE client_consents
      SET revoked_at = NOW(),
          revoked_reason = 'Replaced by new consent',
          updated_at = NOW()
      WHERE client_id = $1
        AND consent_type = $2
        AND revoked_at IS NULL
    `, [data.clientId, data.consentType]);

    // Insert new consent
    const consent = await db.query(`
      INSERT INTO client_consents
      (client_id, consent_version, consent_type, consent_granted, ip_address, user_agent, consent_method)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      data.clientId,
      data.consentVersion,
      data.consentType,
      data.consentGranted,
      data.ipAddress,
      data.userAgent,
      data.consentMethod
    ]);

    return consent;
  }

  async revokeConsent(clientId: string, consentType: string, reason: string) {
    await db.query(`
      UPDATE client_consents
      SET revoked_at = NOW(),
          revoked_reason = $3,
          updated_at = NOW()
      WHERE client_id = $1
        AND consent_type = $2
        AND revoked_at IS NULL
    `, [clientId, consentType, reason]);
  }

  async hasValidConsent(clientId: string, consentType: string): Promise<boolean> {
    const consent = await db.query(`
      SELECT consent_granted
      FROM client_consents
      WHERE client_id = $1
        AND consent_type = $2
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY granted_at DESC
      LIMIT 1
    `, [clientId, consentType]);

    return consent?.consent_granted === true;
  }

  async getClientConsents(clientId: string) {
    return db.query(`
      SELECT
        c.*,
        v.full_text AS consent_full_text,
        v.summary AS consent_summary
      FROM client_consents c
      JOIN consent_versions v ON c.consent_version = v.version
      WHERE c.client_id = $1
      ORDER BY c.granted_at DESC
    `, [clientId]);
  }
}
```

### Seed Data (Consent Version 3.0)

```sql
-- Insert consent version 3.0
INSERT INTO consent_versions (version, effective_date, full_text, summary, requires_re_consent)
VALUES (
  '3.0',
  '2025-11-04',
  'FULL CONSENT TEXT HERE (from Master Blueprint Section 7)',
  'Consent for AI-powered personal training system including data collection, AI processing, third-party AI services (OpenAI, Google, Anthropic), wearable integration, photo analysis, and voice transcription.',
  TRUE
);
```

### Acceptance Criteria

- [ ] Consent versions stored in database
- [ ] Client consents tracked with full audit trail (IP, user agent, timestamp)
- [ ] Consent grant/revoke APIs implemented
- [ ] Consent check middleware for protected routes
- [ ] GDPR data export includes all consents

---

## 🔴 CRITICAL DELIVERABLE #3: JSON SCHEMA VALIDATION

**Problem**: No actual JSON Schema file exists, no validation on writes.

**Goal**: Formal JSON Schema v3.0 file with Ajv validation middleware.

### JSON Schema File

Create: `backend/schemas/client-master-prompt-v3.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://swanstudios.com/schemas/client-master-prompt-v3.json",
  "title": "Client Master Prompt v3.0",
  "description": "Complete master prompt schema for AI-powered personal training system",
  "type": "object",
  "required": ["schema_version", "meta", "client_profile"],

  "properties": {
    "schema_version": {
      "type": "string",
      "pattern": "^3\\.\\d+\\.\\d+$",
      "description": "Semantic version (must be 3.x.x)"
    },

    "meta": {
      "type": "object",
      "required": ["prompt_version", "client_id", "created_date", "last_updated"],
      "properties": {
        "prompt_version": {
          "type": "string",
          "pattern": "^3\\.\\d+\\.\\d+$"
        },
        "client_id": {
          "type": "string",
          "format": "uuid"
        },
        "created_date": {
          "type": "string",
          "format": "date-time"
        },
        "last_updated": {
          "type": "string",
          "format": "date-time"
        },
        "last_updated_by": {
          "type": "string"
        },
        "change_log": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["version", "date", "changes"],
            "properties": {
              "version": { "type": "string" },
              "date": { "type": "string", "format": "date-time" },
              "changes": { "type": "string" },
              "updated_by": { "type": "string" }
            }
          }
        },
        "effective_date": {
          "type": "string",
          "format": "date-time"
        },
        "confidentiality_level": {
          "type": "string",
          "enum": ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        },
        "hipaa_compliant": {
          "type": "boolean"
        },
        "data_retention_years": {
          "type": "integer",
          "minimum": 1,
          "maximum": 50
        }
      }
    },

    "client_profile": {
      "type": "object",
      "required": ["basic_info", "training_tier"],
      "properties": {
        "basic_info": {
          "type": "object",
          "required": ["age", "height_inches", "weight_lbs"],
          "properties": {
            "age": {
              "type": "integer",
              "minimum": 13,
              "maximum": 120,
              "description": "Age only (not DOB for privacy)"
            },
            "gender": {
              "type": "string",
              "enum": ["Male", "Female", "Non-binary", "Prefer not to say"]
            },
            "height_inches": {
              "type": "integer",
              "minimum": 36,
              "maximum": 96
            },
            "weight_lbs": {
              "type": "number",
              "minimum": 50,
              "maximum": 600
            },
            "body_fat_percentage": {
              "type": "number",
              "minimum": 3,
              "maximum": 60
            },
            "bmi": {
              "type": "number",
              "minimum": 10,
              "maximum": 60
            }
          }
        },

        "training_tier": {
          "type": "object",
          "required": ["tier", "tier_name", "session_rate_usd"],
          "properties": {
            "tier": {
              "type": "string",
              "enum": ["Tier 1", "Tier 2", "Tier 3"]
            },
            "tier_name": {
              "type": "string"
            },
            "session_rate_usd": {
              "type": "number",
              "minimum": 50,
              "maximum": 1000
            },
            "sessions_per_week": {
              "type": "integer",
              "minimum": 1,
              "maximum": 7
            }
          }
        }
      }
    }
  }
}
```

### Validation Middleware

```typescript
// backend/middleware/schema-validation.middleware.ts

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { Request, Response, NextFunction } from 'express';
import masterPromptSchema from '../schemas/client-master-prompt-v3.schema.json';

const ajv = new Ajv({
  allErrors: true,
  strict: true,
  validateFormats: true
});

addFormats(ajv);

// Compile schema once at startup
const validateMasterPrompt = ajv.compile(masterPromptSchema);

export function validateMasterPromptMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const valid = validateMasterPrompt(req.body);

  if (!valid) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'SCHEMA_VALIDATION_FAILED',
        message: 'Master Prompt does not match v3.0 schema',
        details: validateMasterPrompt.errors
      }
    });
  }

  next();
}

export function enforceSchemaVersion(requiredMajorVersion: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const schemaVersion = req.body.schema_version;

    if (!schemaVersion) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SCHEMA_VERSION',
          message: 'schema_version is required'
        }
      });
    }

    if (!schemaVersion.startsWith(`${requiredMajorVersion}.`)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INCOMPATIBLE_SCHEMA_VERSION',
          message: `Expected v${requiredMajorVersion}.x.x, got v${schemaVersion}`
        }
      });
    }

    next();
  };
}
```

### Usage in Routes

```typescript
// backend/routes/master-prompt.routes.ts

import { Router } from 'express';
import { validateMasterPromptMiddleware, enforceSchemaVersion } from '../middleware/schema-validation.middleware';

const router = Router();

router.post(
  '/clients/:clientId/master-prompt',
  enforceSchemaVersion('3'), // Require v3.x.x
  validateMasterPromptMiddleware, // Validate against JSON Schema
  async (req, res) => {
    // At this point, we KNOW the data is valid
    const masterPrompt = req.body;

    await saveMasterPrompt(req.params.clientId, masterPrompt);

    res.json({ success: true });
  }
);

export default router;
```

### Acceptance Criteria

- [ ] Complete JSON Schema v3.0 file created
- [ ] Ajv validation middleware implemented
- [ ] Schema version enforcement (reject v2.x)
- [ ] All master prompt write endpoints use validation
- [ ] Validation errors return clear, actionable messages

---

## 🔴 CRITICAL DELIVERABLE #4: EVENT-DRIVEN ARCHITECTURE (OUTBOX PATTERN)

**Problem**: Twilio workflows are synchronous (slow, no retry logic).

**Goal**: Async event processing with automatic retries and dead letter queue.

### Database Schema

```sql
-- ============================================
-- OUTBOX PATTERN (Event Queue)
-- ============================================

CREATE TABLE outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  event_id UUID NOT NULL UNIQUE,
  payload JSONB NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Scheduling
  scheduled_for TIMESTAMP NOT NULL,
  processed_at TIMESTAMP,

  -- Error Tracking
  error_message TEXT,
  last_error_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_outbox_pending ON outbox(status, scheduled_for)
  WHERE status = 'pending';

CREATE INDEX idx_outbox_processing ON outbox(status, updated_at)
  WHERE status = 'processing';

CREATE INDEX idx_outbox_failed ON outbox(status)
  WHERE status = 'failed';
```

### Event Types

```typescript
// backend/types/events.ts

export type EventType =
  | 'morning_checkin_scheduled'
  | 'evening_checkin_scheduled'
  | 'photo_analysis_requested'
  | 'ai_query_submitted'
  | 'subscription_activated'
  | 'subscription_canceled';

export interface BaseEvent {
  eventType: EventType;
  eventId: string;
  timestamp: string;
  payload: any;
}

export interface MorningCheckInEvent extends BaseEvent {
  eventType: 'morning_checkin_scheduled';
  payload: {
    clientId: string;
    scheduledFor: string; // ISO 8601
    timezone: string;
  };
}
```

### Outbox Service

```typescript
// backend/services/outbox.service.ts

import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

export class OutboxService {
  /**
   * Publish event to outbox (fast, synchronous)
   */
  async publish(event: {
    eventType: string;
    payload: any;
    scheduledFor?: Date;
  }) {
    const eventId = uuidv4();

    await db.query(`
      INSERT INTO outbox (event_type, event_id, payload, scheduled_for)
      VALUES ($1, $2, $3, $4)
    `, [
      event.eventType,
      eventId,
      JSON.stringify(event.payload),
      event.scheduledFor || new Date()
    ]);

    return { eventId };
  }

  /**
   * Fetch pending events (for worker processing)
   */
  async fetchPendingEvents(limit: number = 10) {
    return db.query(`
      SELECT * FROM outbox
      WHERE status = 'pending'
        AND scheduled_for <= NOW()
      ORDER BY scheduled_for ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    `, [limit]);
  }

  /**
   * Mark event as processing
   */
  async markProcessing(eventId: string) {
    await db.query(`
      UPDATE outbox
      SET status = 'processing', updated_at = NOW()
      WHERE event_id = $1
    `, [eventId]);
  }

  /**
   * Mark event as completed
   */
  async markCompleted(eventId: string) {
    await db.query(`
      UPDATE outbox
      SET status = 'completed', processed_at = NOW(), updated_at = NOW()
      WHERE event_id = $1
    `, [eventId]);
  }

  /**
   * Mark event as failed (with retry logic)
   */
  async markFailed(eventId: string, error: Error) {
    const event = await db.query(
      'SELECT retry_count, max_retries FROM outbox WHERE event_id = $1',
      [eventId]
    );

    const retryCount = event.retry_count + 1;

    if (retryCount >= event.max_retries) {
      // Max retries reached - move to failed permanently
      await db.query(`
        UPDATE outbox
        SET status = 'failed',
            retry_count = $2,
            error_message = $3,
            last_error_at = NOW(),
            updated_at = NOW()
        WHERE event_id = $1
      `, [eventId, retryCount, error.message]);
    } else {
      // Retry with exponential backoff
      const backoffSeconds = Math.pow(2, retryCount) * 60; // 2min, 4min, 8min

      await db.query(`
        UPDATE outbox
        SET status = 'pending',
            retry_count = $2,
            scheduled_for = NOW() + INTERVAL '${backoffSeconds} seconds',
            error_message = $3,
            last_error_at = NOW(),
            updated_at = NOW()
        WHERE event_id = $1
      `, [eventId, retryCount, error.message]);
    }
  }
}
```

### Event Processor Worker

```typescript
// backend/workers/outbox-processor.worker.ts

import { OutboxService } from '../services/outbox.service';
import { TwilioService } from '../services/twilio.service';
import { GeminiService } from '../services/gemini.service';

export class OutboxProcessor {
  private outboxService = new OutboxService();
  private twilioService = new TwilioService();
  private geminiService = new GeminiService();

  async start() {
    console.log('Outbox processor started');

    while (true) {
      try {
        const events = await this.outboxService.fetchPendingEvents(10);

        for (const event of events) {
          await this.processEvent(event);
        }

        // Sleep 5 seconds before next poll
        await this.sleep(5000);
      } catch (error) {
        console.error('Outbox processor error:', error);
        await this.sleep(10000); // Sleep longer on error
      }
    }
  }

  private async processEvent(event: any) {
    try {
      // Mark as processing
      await this.outboxService.markProcessing(event.event_id);

      // Handle event based on type
      switch (event.event_type) {
        case 'morning_checkin_scheduled':
          await this.handleMorningCheckIn(event.payload);
          break;
        case 'evening_checkin_scheduled':
          await this.handleEveningCheckIn(event.payload);
          break;
        case 'photo_analysis_requested':
          await this.handlePhotoAnalysis(event.payload);
          break;
        default:
          throw new Error(`Unknown event type: ${event.event_type}`);
      }

      // Mark as completed
      await this.outboxService.markCompleted(event.event_id);

    } catch (error) {
      // Mark as failed (will retry if retries remain)
      await this.outboxService.markFailed(event.event_id, error);
      console.error(`Event ${event.event_id} failed:`, error);
    }
  }

  private async handleMorningCheckIn(payload: any) {
    const { clientId, scheduledFor, timezone } = payload;
    await this.twilioService.sendMorningCheckIn(clientId);
  }

  private async handlePhotoAnalysis(payload: any) {
    const { clientId, photoUrl } = payload;
    const analysis = await this.geminiService.analyzePhoto(photoUrl);
    // Save analysis to database
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start worker (separate process or container)
if (require.main === module) {
  const worker = new OutboxProcessor();
  worker.start();
}
```

### Usage Example

```typescript
// Before (Synchronous - BAD)
async function scheduleCheckIn(clientId: string) {
  // Blocks for 2-5 seconds waiting for Twilio
  await twilioClient.messages.create({ ... });
}

// After (Event-Driven - GOOD)
async function scheduleCheckIn(clientId: string) {
  // Returns in <10ms
  await outboxService.publish({
    eventType: 'morning_checkin_scheduled',
    payload: { clientId, scheduledFor: '2025-11-05T07:00:00Z', timezone: 'America/Los_Angeles' }
  });

  // User request completes immediately
  return { success: true, message: 'Check-in scheduled' };
}
```

### Acceptance Criteria

- [ ] Outbox table created
- [ ] Outbox service with publish/fetch/complete/fail methods
- [ ] Event processor worker running in background
- [ ] Automatic retry logic with exponential backoff
- [ ] Dead letter queue for permanently failed events
- [ ] Twilio workflows use events (no more sync calls)

---

## 🔴 CRITICAL DELIVERABLE #5: STRIPE PAYMENT LINKS INTEGRATION

**Problem**: No way for users to purchase AI tier subscriptions.

**Goal**: Simple Stripe Payment Links + webhook tracking (custom checkout later).

### Step 1: Create Payment Links (Stripe Dashboard)

```
NO CODING REQUIRED - Use Stripe Dashboard:

1. Go to Stripe Dashboard → Products → Add Product
   Name: "Silver AI Wing - AI Foundation"
   Price: $50/month (recurring)
   Description: "Weekly AI check-ins, basic progress tracking, monthly reports"

2. Click "Create Payment Link"
   - Enable Customer Portal (for self-service cancellations)
   - Success URL: https://swanstudios.com/dashboard?subscription=success&tier=tier_1
   - Cancel URL: https://swanstudios.com/pricing?canceled=true
   - Add metadata:
     * tier: tier_1
     * product: personal_training_ai
   - Enable 7-day free trial

3. Copy Payment Link: https://buy.stripe.com/test_xxxxx1

4. Repeat for Tier 2 ($125/month) and Tier 3 ($200/month)

DONE! No backend coding needed for checkout.
```

### Step 2: Database Schema

```sql
CREATE TABLE client_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_profile_pii(client_id),

  -- Subscription Details
  tier VARCHAR(20) NOT NULL, -- 'tier_1', 'tier_2', 'tier_3'
  status VARCHAR(20) NOT NULL, -- 'active', 'canceled', 'past_due', 'trialing'

  -- Stripe References
  stripe_subscription_id VARCHAR(100) UNIQUE,
  stripe_customer_id VARCHAR(100),
  stripe_price_id VARCHAR(100),

  -- Billing
  monthly_price_usd DECIMAL(10,2) NOT NULL,
  billing_cycle_start DATE NOT NULL,
  current_period_start DATE NOT NULL,
  current_period_end DATE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  -- Trial
  trial_start DATE,
  trial_end DATE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  canceled_at TIMESTAMP
);

CREATE INDEX idx_subscriptions_client ON client_subscriptions(client_id, status);
CREATE INDEX idx_subscriptions_stripe ON client_subscriptions(stripe_subscription_id);
```

### Step 3: Webhook Handler

```typescript
// backend/routes/webhooks/stripe.webhook.ts

import { Router } from 'express';
import express from 'express';
import Stripe from 'stripe';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

router.post('/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature']!;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }

    res.json({ received: true });
  }
);

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { clientId, tier } = session.metadata!;
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

  // Save to database
  await db.query(`
    INSERT INTO client_subscriptions
    (client_id, tier, status, stripe_subscription_id, stripe_customer_id,
     monthly_price_usd, billing_cycle_start, current_period_start, current_period_end,
     trial_start, trial_end)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
    clientId,
    tier,
    subscription.status,
    subscription.id,
    subscription.customer,
    subscription.items.data[0].price.unit_amount! / 100,
    new Date(subscription.created * 1000),
    new Date(subscription.current_period_start * 1000),
    new Date(subscription.current_period_end * 1000),
    subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
    subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
  ]);

  // Send confirmation email
  await sendEmail(clientId, 'subscription_activated', { tier });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  await db.query(`
    UPDATE client_subscriptions
    SET status = $2,
        current_period_start = $3,
        current_period_end = $4,
        updated_at = NOW()
    WHERE stripe_subscription_id = $1
  `, [
    subscription.id,
    subscription.status,
    new Date(subscription.current_period_start * 1000),
    new Date(subscription.current_period_end * 1000)
  ]);
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  await db.query(`
    UPDATE client_subscriptions
    SET status = 'canceled',
        canceled_at = NOW(),
        updated_at = NOW()
    WHERE stripe_subscription_id = $1
  `, [subscription.id]);
}

export default router;
```

### Step 4: Frontend Integration (Simple Link Buttons)

```typescript
// frontend/src/components/AITierCard.tsx

import { FrostedCard } from './FrostedCard';
import { Button } from './Button';

const STRIPE_PAYMENT_LINKS = {
  tier_1: 'https://buy.stripe.com/test_xxxxx1', // Replace with real link
  tier_2: 'https://buy.stripe.com/test_xxxxx2',
  tier_3: 'https://buy.stripe.com/test_xxxxx3'
};

export const AITierCard = ({ tier }) => {
  return (
    <FrostedCard>
      <h3>{tier.name}</h3>
      <Price>${tier.monthlyPrice}/month</Price>

      <FeatureList>
        {tier.features.map(feature => (
          <li key={feature}>✓ {feature}</li>
        ))}
      </FeatureList>

      {/* Simple link button - redirects to Stripe */}
      <Button
        as="a"
        href={STRIPE_PAYMENT_LINKS[tier.id]}
        target="_blank"
        rel="noopener noreferrer"
      >
        Subscribe Now
      </Button>
    </FrostedCard>
  );
};
```

### Step 5: Customer Portal (for Upgrades/Cancellations)

```typescript
// backend/routes/stripe/portal.routes.ts

router.post('/stripe/create-portal-session', async (req, res) => {
  const userId = req.user.id;

  const sub = await db.query(
    'SELECT stripe_customer_id FROM client_subscriptions WHERE client_id = $1 AND status = $2',
    [userId, 'active']
  );

  if (!sub) {
    return res.status(404).json({ error: 'No active subscription found' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${process.env.APP_URL}/dashboard`
  });

  res.json({ url: session.url });
});

// Frontend:
<Button onClick={async () => {
  const res = await fetch('/api/stripe/create-portal-session', { method: 'POST' });
  const { url } = await res.json();
  window.location.href = url;
}}>
  Manage Subscription
</Button>
```

### Acceptance Criteria

- [ ] 3 Stripe Payment Links created (Tier 1, 2, 3)
- [ ] Payment links added to frontend UI
- [ ] Webhook endpoint implemented
- [ ] Subscription events saved to database
- [ ] Customer Portal link working
- [ ] End-to-end tested (subscribe → upgrade → cancel)

---

## 🟡 HIGH PRIORITY DELIVERABLE #6: RATE LIMITING

**Goal**: Protect expensive endpoints from abuse.

### Implementation

```typescript
// backend/middleware/rate-limit.middleware.ts

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redisClient = new Redis(process.env.REDIS_URL);

export const RATE_LIMITS = {
  // AI queries (expensive)
  aiQuery: rateLimit({
    store: new RedisStore({ client: redisClient, prefix: 'rl:ai:' }),
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 queries per minute
    message: 'Too many AI queries. Please wait before asking again.'
  }),

  // Photo uploads (expensive)
  photoUpload: rateLimit({
    store: new RedisStore({ client: redisClient, prefix: 'rl:photo:' }),
    windowMs: 60 * 1000,
    max: 5, // 5 photos per minute
    message: 'Too many photo uploads. Please wait.'
  }),

  // Twilio webhooks (prevent spam)
  twilioWebhook: rateLimit({
    store: new RedisStore({ client: redisClient, prefix: 'rl:twilio:' }),
    windowMs: 60 * 1000,
    max: 2, // 2 responses per minute (morning + evening)
    message: 'Too many check-in responses. Please wait.'
  }),

  // General API
  general: rateLimit({
    store: new RedisStore({ client: redisClient, prefix: 'rl:general:' }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes
    message: 'Too many requests. Please try again later.'
  })
};

// Usage in routes:
router.post('/ai-village/query', RATE_LIMITS.aiQuery, async (req, res) => { ... });
router.post('/photo-upload', RATE_LIMITS.photoUpload, async (req, res) => { ... });
```

### Acceptance Criteria

- [ ] Rate limiting middleware installed
- [ ] Redis-backed rate limiting (not in-memory)
- [ ] Different limits for different endpoint types
- [ ] Rate limit headers in responses
- [ ] Monitoring/alerting for frequent violators

---

## 🟡 HIGH PRIORITY DELIVERABLE #7: CULTURAL SENSITIVITY UPDATES

**Goal**: Replace "Spirit Names" with "Galaxy-Swan" themed aliases.

### Updates Required

```typescript
// OLD (potentially appropriative):
const SPIRIT_NAMES = [
  'Golden Hawk', 'Silver Crane', 'Thunder Phoenix', 'Mountain Bear'
];

// NEW (Galaxy-Swan themed):
const GALAXY_SWAN_ALIASES = [
  'Nebula Swan', 'Stellar Swan', 'Cosmic Swan', 'Aurora Swan',
  'Eclipse Swan', 'Constellation Swan', 'Meteor Swan', 'Orbit Swan',
  'Pulsar Swan', 'Quantum Swan', 'Radiant Swan', 'Supernova Swan'
];
```

### Files to Update

- [ ] `docs/ai-workflow/personal-training/PILOT-PROGRAM-PLAN.md`
- [ ] `docs/ai-workflow/personal-training/CLIENT-REGISTRY.md`
- [ ] Backend: Alias generation function

### Acceptance Criteria

- [ ] All "Spirit Names" replaced with "Galaxy-Swan" aliases
- [ ] Cultural sensitivity note added to docs
- [ ] Alias generation aligns with SwanStudios branding

---

## ✅ FINAL CHECKLIST

**Before Starting Phase 1**:

- [ ] All 7 deliverables completed
- [ ] Database migrations run successfully
- [ ] All acceptance criteria met
- [ ] Code reviewed and tested
- [ ] Documentation updated

**Ready for Phase 1?** Yes / No

---

## 📞 NEXT STEPS

1. **Review this spec** - Confirm priorities and timeline
2. **Assign to Roo Code** - Send this spec for implementation
3. **Set up check-ins** - Daily stand-ups during Phase 0A
4. **Track progress** - Use checklist above
5. **After Phase 0A**: Begin Phase 1 (Foundation) from Master Blueprint v3.0

**Estimated Timeline**: 10 working days (2 weeks with buffer)

---

**END OF PHASE 0A IMPLEMENTATION SPEC**

**Status**: Ready for Implementation
**Owner**: Roo Code (Backend Specialist)
**Next**: Send this spec to Roo Code to begin Phase 0A
