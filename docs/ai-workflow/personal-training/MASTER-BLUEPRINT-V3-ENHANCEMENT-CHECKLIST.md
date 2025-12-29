# 🔍 MASTER BLUEPRINT V3.0 - ENHANCEMENT CHECKLIST
## Analysis of AI Feedback vs Current Implementation

**Date**: November 4, 2025
**Current Version**: v3.0.0 (21,500 lines)
**Status**: ⚠️ NEEDS CRITICAL ENHANCEMENTS

---

## 📊 EXECUTIVE SUMMARY

The Master Blueprint v3.0 is **comprehensive and well-structured**, but is missing several **critical backend requirements** identified by Roo Code (backend specialist) and additional schema refinements from Gemini.

**Overall Assessment**:
- ✅ **UI/UX Layer**: Excellent (Twilio workflows, iPad PWA, voice commands)
- ✅ **AI Village Layer**: Comprehensive (multi-AI consensus, routing)
- ⚠️ **Data Layer**: Missing critical backend architecture
- ❌ **Security Layer**: Insufficient anti-fraud and compliance measures
- ❌ **Business Logic Layer**: Missing subscription flows and payment processing

**Verdict**: **85% Complete** - Requires 15% critical backend enhancements before implementation.

---

## 🚨 CRITICAL GAPS (MUST ADD BEFORE IMPLEMENTATION)

### ❌ GAP 1: PII Separation in Database Schema

**Current State in v3.0**:
```json
{
  "client_profile": {
    "basic_info": {
      "name": "John Doe",  // ← PII stored in same JSON as training data
      "age": 35,
      "blood_type": "O+",
      "emergency_contact": { ... }
    }
  }
}
```

**Problem**:
- PII (name, DOB, emergency contact) stored alongside non-sensitive data in single JSON blob
- Violates data minimization principle (GDPR Article 5)
- If training data is exposed, PII is also exposed
- No column-level encryption for sensitive fields

**Roo Code's Recommendation**:
```sql
-- SEPARATE TABLES FOR PII vs NON-PII

-- Table 1: Encrypted PII (restricted access)
CREATE TABLE client_profile_pii (
  client_id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  blood_type VARCHAR(10),
  emergency_contact JSONB NOT NULL,
  phone_number TEXT,
  email TEXT,

  -- Encryption metadata
  encrypted_at TIMESTAMP DEFAULT NOW(),
  encryption_key_id VARCHAR(50), -- Reference to KMS key

  -- Access control
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_accessed_at TIMESTAMP,
  accessed_by VARCHAR(100) -- Track who accessed PII
);

-- Enable Row-Level Security
ALTER TABLE client_profile_pii ENABLE ROW LEVEL SECURITY;

-- Only trainers can access their own clients' PII
CREATE POLICY trainer_pii_access ON client_profile_pii
  FOR SELECT
  USING (client_id IN (
    SELECT client_id FROM trainer_client_assignments WHERE trainer_id = current_user_id()
  ));

-- Table 2: Non-sensitive training data (wider access)
CREATE TABLE client_profile_training (
  client_id UUID PRIMARY KEY,
  age INTEGER, -- Age only, not DOB (less sensitive)
  height_inches INTEGER,
  weight_lbs DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,2),
  training_goals JSONB,
  injury_history JSONB,
  training_history JSONB,

  -- NO PII in this table
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AI systems only access this table (no PII)
GRANT SELECT ON client_profile_training TO ai_service_role;
REVOKE SELECT ON client_profile_pii FROM ai_service_role;
```

**Impact of Not Fixing**:
- GDPR non-compliance (potential €20M fine or 4% annual revenue)
- HIPAA non-compliance if storing health data (potential $50K per violation)
- Security vulnerability (single breach exposes all data)
- No audit trail for PII access

**Action Required**:
- [ ] Add Section 2.5 to Master Blueprint: "PII Separation Architecture"
- [ ] Update database schema to separate `client_profile_pii` and `client_profile_training` tables
- [ ] Add KMS encryption for PII table
- [ ] Implement row-level security policies
- [ ] Add audit logging for all PII access
- [ ] Update AI Village configuration to NEVER access PII table

**Estimated Effort**: 8-10 hours

---

### ❌ GAP 2: Consent Storage in Database (Not Just Docs)

**Current State in v3.0**:
```json
{
  "consent_framework": {
    "consent_obtained_date": "2024-08-01T00:00:00Z",
    "consent_version": "3.0",
    "data_collection_consent": {
      "medical_history": true,
      "photo_analysis": true,
      "wearable_integration": true
    }
  }
}
```

**Problem**:
- Consent stored in Master Prompt JSON (not auditable)
- No version tracking (what did consent v2.0 say?)
- No signature/proof of consent
- No opt-out workflow
- Cannot demonstrate compliance in audit

**Roo Code's Recommendation**:
```sql
-- Consent Tracking Table (Audit Trail)
CREATE TABLE client_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_profile_pii(client_id),

  -- Consent details
  consent_version VARCHAR(10) NOT NULL, -- '3.0'
  consent_type VARCHAR(50) NOT NULL, -- 'data_collection', 'ai_processing', 'third_party_sharing'
  consent_granted BOOLEAN NOT NULL,
  consent_text TEXT NOT NULL, -- Full text of what user agreed to

  -- Proof of consent
  ip_address INET,
  user_agent TEXT,
  signature_base64 TEXT, -- If using digital signature
  consent_method VARCHAR(20), -- 'web_form', 'email', 'paper', 'verbal'

  -- Timestamps
  granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP, -- Some consents expire after 1 year
  revoked_at TIMESTAMP,
  revoked_reason TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for compliance queries
CREATE INDEX idx_consents_client_type ON client_consents(client_id, consent_type, consent_granted);

-- Consent Version History (Store full text)
CREATE TABLE consent_versions (
  version VARCHAR(10) PRIMARY KEY, -- '3.0'
  effective_date DATE NOT NULL,
  full_text TEXT NOT NULL,
  summary TEXT,
  changes_from_previous TEXT,
  requires_re_consent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Example query: "Did this client consent to AI processing?"
SELECT consent_granted, granted_at, consent_version
FROM client_consents
WHERE client_id = 'uuid-here'
  AND consent_type = 'ai_processing'
  AND revoked_at IS NULL
ORDER BY granted_at DESC
LIMIT 1;

-- Example query: "Who needs to re-consent after v3.0 update?"
SELECT c.client_id, c.consent_version, c.granted_at
FROM client_consents c
WHERE c.consent_type = 'data_collection'
  AND c.consent_version < '3.0'
  AND c.revoked_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM client_consents c2
    WHERE c2.client_id = c.client_id
      AND c2.consent_type = 'data_collection'
      AND c2.consent_version >= '3.0'
  );
```

**Impact of Not Fixing**:
- Cannot prove consent in legal dispute
- GDPR Article 7 non-compliance (consent must be demonstrable)
- No audit trail for compliance officers
- Cannot handle consent revocation properly

**Action Required**:
- [ ] Add Section 7.5 to Master Blueprint: "Consent Database Architecture"
- [ ] Create `client_consents` table schema
- [ ] Create `consent_versions` table schema
- [ ] Add consent capture API endpoints
- [ ] Add consent revocation workflow
- [ ] Store IP address, user agent, timestamp on consent
- [ ] Add "Download My Consents" feature (GDPR Article 15)

**Estimated Effort**: 6-8 hours

---

### ❌ GAP 3: JSON Schema Validation for Master Prompts

**Current State in v3.0**:
```json
{
  "schema_version": "3.0.0",
  "schema_url": "https://swanstudios.com/schemas/client-master-prompt-v3.json",
  // ... rest of JSON
}
```

**Problem**:
- No actual JSON Schema file provided
- No validation on writes (can write invalid data)
- No versioning enforcement (can claim v3.0 but use v2.0 structure)
- No required field enforcement

**Roo Code's Recommendation**:
```typescript
// 1. Create formal JSON Schema file
// File: backend/schemas/client-master-prompt-v3.schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://swanstudios.com/schemas/client-master-prompt-v3.json",
  "title": "Client Master Prompt v3.0",
  "type": "object",
  "required": ["schema_version", "meta", "client_profile"],

  "properties": {
    "schema_version": {
      "type": "string",
      "pattern": "^3\\.\\d+\\.\\d+$",
      "description": "Must be 3.x.x (semantic versioning)"
    },

    "meta": {
      "type": "object",
      "required": ["prompt_version", "client_id", "created_date", "last_updated"],
      "properties": {
        "prompt_version": { "type": "string", "pattern": "^3\\.\\d+\\.\\d+$" },
        "client_id": { "type": "string", "format": "uuid" },
        "created_date": { "type": "string", "format": "date-time" },
        "last_updated": { "type": "string", "format": "date-time" },
        "last_updated_by": { "type": "string" },
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
            "age": { "type": "integer", "minimum": 13, "maximum": 120 },
            "height_inches": { "type": "integer", "minimum": 36, "maximum": 96 },
            "weight_lbs": { "type": "number", "minimum": 50, "maximum": 600 },
            "body_fat_percentage": { "type": "number", "minimum": 3, "maximum": 60 }
          }
        }
      }
    }
  }
}

// 2. Validation middleware (Express.js)
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

// Load schema
const schema = require('./schemas/client-master-prompt-v3.schema.json');
const validate = ajv.compile(schema);

// Middleware
export function validateMasterPrompt(req, res, next) {
  const valid = validate(req.body);

  if (!valid) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'SCHEMA_VALIDATION_FAILED',
        message: 'Master Prompt does not match v3.0 schema',
        details: validate.errors
      }
    });
  }

  next();
}

// 3. Use in API routes
router.post('/clients/:clientId/master-prompt', validateMasterPrompt, async (req, res) => {
  // At this point, we KNOW the data is valid
  const masterPrompt = req.body;
  await saveMasterPrompt(req.params.clientId, masterPrompt);
  res.json({ success: true });
});

// 4. Version enforcement
export function enforceSchemaVersion(requiredVersion: string) {
  return (req, res, next) => {
    const schemaVersion = req.body.schema_version;

    if (!schemaVersion) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_SCHEMA_VERSION', message: 'schema_version is required' }
      });
    }

    if (!schemaVersion.startsWith(requiredVersion)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INCOMPATIBLE_SCHEMA_VERSION',
          message: `Expected v${requiredVersion}.x, got v${schemaVersion}`
        }
      });
    }

    next();
  };
}

// Usage:
router.post('/clients/:clientId/master-prompt',
  enforceSchemaVersion('3'),
  validateMasterPrompt,
  async (req, res) => { ... }
);
```

**Impact of Not Fixing**:
- Data corruption (invalid JSON stored in DB)
- Runtime errors when AIs parse malformed JSON
- Versioning chaos (mixing v2.0 and v3.0 structures)
- No contract enforcement between frontend and backend

**Action Required**:
- [ ] Create complete JSON Schema file for v3.0
- [ ] Add Section 2.7 to Master Blueprint: "JSON Schema Validation Architecture"
- [ ] Implement Ajv validation middleware
- [ ] Add schema version enforcement
- [ ] Add schema validation to ALL write endpoints
- [ ] Create schema migration guide (v2.0 → v3.0)

**Estimated Effort**: 10-12 hours

---

### ❌ GAP 4: Event-Driven Architecture with Outbox Pattern

**Current State in v3.0**:
- Twilio SMS workflows described as synchronous
- No mention of async processing
- No event pipeline

**Problem**:
```typescript
// CURRENT DESIGN (Synchronous - BAD for scale)
async function sendMorningCheckIn(clientId) {
  const client = await db.getClient(clientId);
  const message = generateCheckInMessage(client);

  // ❌ Blocks until Twilio responds (could take 2-5 seconds)
  await twilioClient.messages.create({
    to: client.phone,
    body: message
  });

  // ❌ If Twilio fails, entire request fails
  // ❌ No retry logic
  // ❌ No dead letter queue
}
```

**Roo Code's Recommendation (Event-Driven Architecture)**:
```typescript
// EVENT-DRIVEN DESIGN (Async - GOOD for scale)

// 1. Define Events
interface MorningCheckInScheduledEvent {
  eventType: 'morning_checkin_scheduled';
  eventId: string;
  timestamp: string;
  payload: {
    clientId: string;
    scheduledFor: string; // ISO 8601
    timezone: string;
  };
}

// 2. Outbox Pattern (Ensures at-least-once delivery)
// Database table: outbox
CREATE TABLE outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  event_id UUID NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_for TIMESTAMP NOT NULL,
  processed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_outbox_pending ON outbox(status, scheduled_for) WHERE status = 'pending';

// 3. Publish event to outbox (fast, synchronous)
async function scheduleMorningCheckIn(clientId: string) {
  const event: MorningCheckInScheduledEvent = {
    eventType: 'morning_checkin_scheduled',
    eventId: uuidv4(),
    timestamp: new Date().toISOString(),
    payload: {
      clientId,
      scheduledFor: '2025-11-04T07:00:00-08:00',
      timezone: 'America/Los_Angeles'
    }
  };

  // ✅ Fast DB write (returns in <10ms)
  await db.query(
    'INSERT INTO outbox (event_type, event_id, payload, scheduled_for) VALUES ($1, $2, $3, $4)',
    [event.eventType, event.eventId, event.payload, event.payload.scheduledFor]
  );

  // User request completes immediately (no waiting for Twilio)
  return { success: true, eventId: event.eventId };
}

// 4. Background worker processes outbox (async)
class OutboxProcessor {
  async processEvents() {
    while (true) {
      // Fetch pending events (lock with FOR UPDATE to prevent duplicate processing)
      const events = await db.query(`
        SELECT * FROM outbox
        WHERE status = 'pending'
          AND scheduled_for <= NOW()
        ORDER BY scheduled_for ASC
        LIMIT 10
        FOR UPDATE SKIP LOCKED
      `);

      for (const event of events) {
        try {
          // Mark as processing
          await db.query(
            'UPDATE outbox SET status = $1, updated_at = NOW() WHERE id = $2',
            ['processing', event.id]
          );

          // Process event
          await this.handleEvent(event);

          // Mark as completed
          await db.query(
            'UPDATE outbox SET status = $1, processed_at = NOW(), updated_at = NOW() WHERE id = $2',
            ['completed', event.id]
          );

        } catch (error) {
          // Retry logic
          const retryCount = event.retry_count + 1;

          if (retryCount >= event.max_retries) {
            // Move to dead letter queue
            await db.query(
              'UPDATE outbox SET status = $1, retry_count = $2, error_message = $3, updated_at = NOW() WHERE id = $4',
              ['failed', retryCount, error.message, event.id]
            );

            // Alert trainer
            await this.alertTrainer(event, error);
          } else {
            // Retry with exponential backoff
            const backoffSeconds = Math.pow(2, retryCount) * 60; // 2min, 4min, 8min
            await db.query(`
              UPDATE outbox
              SET status = 'pending',
                  retry_count = $1,
                  scheduled_for = NOW() + INTERVAL '${backoffSeconds} seconds',
                  error_message = $2,
                  updated_at = NOW()
              WHERE id = $3
            `, [retryCount, error.message, event.id]);
          }
        }
      }

      // Sleep 5 seconds before next poll
      await sleep(5000);
    }
  }

  async handleEvent(event) {
    switch (event.event_type) {
      case 'morning_checkin_scheduled':
        return this.sendMorningCheckIn(event.payload);
      case 'evening_checkin_scheduled':
        return this.sendEveningCheckIn(event.payload);
      case 'photo_analysis_requested':
        return this.analyzePhoto(event.payload);
      default:
        throw new Error(`Unknown event type: ${event.event_type}`);
    }
  }

  async sendMorningCheckIn(payload) {
    const client = await db.getClient(payload.clientId);
    const message = generateCheckInMessage(client);

    // ✅ Now failures are retried automatically
    await twilioClient.messages.create({
      to: client.phone,
      body: message
    });
  }
}

// 5. Start worker (separate process or container)
const worker = new OutboxProcessor();
worker.processEvents();
```

**Benefits**:
- ✅ Fast user requests (no waiting for Twilio)
- ✅ Automatic retries with exponential backoff
- ✅ Dead letter queue for failed events
- ✅ Scalable (add more workers for higher throughput)
- ✅ Transactional guarantee (event saved in same DB transaction)

**Impact of Not Fixing**:
- Slow user requests (waiting for Twilio)
- No retry logic (SMS failures are permanent)
- System fails when Twilio is down
- Cannot scale (single-threaded processing)

**Action Required**:
- [ ] Add Section 8.5 to Master Blueprint: "Event-Driven Architecture"
- [ ] Create `outbox` table schema
- [ ] Implement outbox processor worker
- [ ] Update Twilio workflows to use events
- [ ] Add dead letter queue alerts
- [ ] Add monitoring dashboard for event processing

**Estimated Effort**: 12-16 hours

---

### ❌ GAP 5: Subscription & Checkout Flows for AI Add-Ons

**Current State in v3.0**:
- Pricing tiers defined ($175/$300/$500)
- No mention of how users purchase tiers
- No subscription management
- No proration logic

**Problem**: The blueprint describes WHAT to charge but not HOW to charge it.

**User Decision (APPROVED)**:
- ✅ Use **Stripe Payment Links** initially (fastest, safest)
- ✅ Custom SwanStudios store checkout = Phase 2 (perfect it later)
- ✅ This gets subscriptions live IMMEDIATELY while store is refined

**Roo Code's Recommendation (Simplified - Stripe Payment Links)**:
```typescript
// ============================================
// PHASE 1: STRIPE PAYMENT LINKS (Immediate)
// ============================================

// 1. Create Stripe Payment Links (Done in Stripe Dashboard)
// No coding required! Just create 3 payment links:

const STRIPE_PAYMENT_LINKS = {
  tier_1: {
    name: 'Silver AI Wing - AI Foundation',
    monthlyPrice: 50,
    paymentLinkUrl: 'https://buy.stripe.com/test_xxxxx1', // ← Created in Stripe Dashboard
    stripePriceId: 'price_ai_foundation_monthly',
    features: ['Weekly check-ins', 'Basic tracking', 'Monthly reports']
  },
  tier_2: {
    name: 'Golden AI Flight - AI Mastery',
    monthlyPrice: 125,
    paymentLinkUrl: 'https://buy.stripe.com/test_xxxxx2', // ← Created in Stripe Dashboard
    stripePriceId: 'price_ai_mastery_monthly',
    features: ['Daily check-ins', 'Wearables', 'Multi-AI insights']
  },
  tier_3: {
    name: 'Rhodium AI Royalty - AI Elite',
    monthlyPrice: 200,
    paymentLinkUrl: 'https://buy.stripe.com/test_xxxxx3', // ← Created in Stripe Dashboard
    stripePriceId: 'price_ai_royalty_monthly',
    features: ['Photo analysis', 'Voice commands', 'Priority support']
  }
};

// 2. Simple UI Component (Link Buttons)
const AITierCard = ({ tier }) => {
  return (
    <Card>
      <h3>{tier.name}</h3>
      <Price>${tier.monthlyPrice}/month</Price>
      <FeatureList>
        {tier.features.map(feature => <li key={feature}>{feature}</li>)}
      </FeatureList>

      {/* Simple link button - redirects to Stripe checkout */}
      <Button
        as="a"
        href={tier.paymentLinkUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Subscribe Now
      </Button>
    </Card>
  );
};

// 3. Database Schema (Simplified - Track Subscriptions)
CREATE TABLE client_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_profile_pii(client_id),

  -- Subscription details
  tier VARCHAR(20) NOT NULL, -- 'tier_1', 'tier_2', 'tier_3'
  status VARCHAR(20) NOT NULL, -- 'active', 'canceled', 'past_due', 'trialing'

  -- Stripe references
  stripe_subscription_id VARCHAR(100),
  stripe_customer_id VARCHAR(100),

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

// 4. How to Create Payment Links (Stripe Dashboard)
/*
STEP-BY-STEP:

1. Go to Stripe Dashboard → Products → Add Product
   - Product name: "Silver AI Wing - AI Foundation"
   - Price: $50/month (recurring)
   - Add description and features

2. Click "Create Payment Link"
   - Enable customer portal (for cancellations)
   - Add success/cancel redirect URLs:
     - Success: https://swanstudios.com/dashboard?subscription=success&tier=tier_1
     - Cancel: https://swanstudios.com/pricing?canceled=true

3. Add metadata (for webhook tracking):
   - tier: tier_1
   - product: personal_training_ai

4. Enable trial period: 7 days

5. Copy payment link: https://buy.stripe.com/test_xxxxx1

6. Repeat for Tier 2 and Tier 3

DONE! No coding required. Just paste links into UI.
*/

// 5. Webhook Handler (Stripe Events - Still Needed)
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle event
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
  }

  res.json({ received: true });
});

async function handleCheckoutCompleted(session) {
  const { clientId, tier } = session.metadata;
  const subscription = await stripe.subscriptions.retrieve(session.subscription);

  // Save to database
  await db.query(`
    INSERT INTO client_subscriptions
    (client_id, tier, status, stripe_subscription_id, stripe_customer_id, monthly_price_usd,
     billing_cycle_start, current_period_start, current_period_end)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [
    clientId,
    tier,
    subscription.status,
    subscription.id,
    subscription.customer,
    subscription.items.data[0].price.unit_amount / 100,
    new Date(subscription.created * 1000),
    new Date(subscription.current_period_start * 1000),
    new Date(subscription.current_period_end * 1000)
  ]);

  // Send confirmation email
  await sendEmail(clientId, 'subscription_activated', { tier, trialEnd: subscription.trial_end });
}

// 6. Upgrade/Downgrade Flow (Phase 1: Manual via Customer Portal)
/*
For now, users upgrade/downgrade via Stripe Customer Portal:
1. Enable Customer Portal in Stripe Dashboard
2. Add link to dashboard: "Manage Subscription"
3. Users can upgrade, downgrade, cancel themselves
4. Webhook captures changes automatically

Phase 2 (Later): Build custom upgrade flow in SwanStudios store
*/

const ManageSubscriptionButton = () => {
  return (
    <Button
      onClick={async () => {
        // Create Customer Portal session
        const response = await fetch('/api/stripe/create-portal-session', {
          method: 'POST'
        });
        const { url } = await response.json();
        window.location.href = url; // Redirect to Stripe portal
      }}
    >
      Manage Subscription
    </Button>
  );
};

// Backend endpoint for Customer Portal
router.post('/stripe/create-portal-session', async (req, res) => {
  const userId = req.user.id;
  const customer = await db.query(
    'SELECT stripe_customer_id FROM client_subscriptions WHERE client_id = $1',
    [userId]
  );

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.stripe_customer_id,
    return_url: `${process.env.APP_URL}/dashboard`
  });

  res.json({ url: session.url });
});

// ============================================
// PHASE 2: CUSTOM SWANSTUDIOS STORE (Later)
// ============================================
// Once store is perfected, add:
// - Custom checkout UI
// - In-app upgrade/downgrade
// - Real-time subscription status
// - Proration previews
// - Seamless UX

// But for Phase 1: Payment Links = FASTEST & SAFEST
```

**Impact of Not Fixing**:
- No way for users to actually purchase AI tiers
- Manual payment processing (not scalable)

**Action Required (Phase 1 - Stripe Payment Links)**:
- [ ] Create 3 Stripe Products in Dashboard (Tier 1, 2, 3)
- [ ] Create 3 Payment Links in Stripe Dashboard
- [ ] Add simple link buttons to frontend (3 cards with "Subscribe Now")
- [ ] Create `client_subscriptions` table schema
- [ ] Implement webhook handler (capture subscription events)
- [ ] Add "Manage Subscription" button (redirects to Stripe Customer Portal)
- [ ] Test end-to-end (subscribe, upgrade, cancel)

**Action Required (Phase 2 - Custom Store Checkout - LATER)**:
- [ ] Build custom checkout UI in SwanStudios store
- [ ] Add in-app upgrade/downgrade flows
- [ ] Add proration preview
- [ ] Add real-time subscription status
- [ ] Perfect the UX

**Estimated Effort (Phase 1)**: 6-8 hours (vs 16-20 hours for custom checkout)
**Estimated Effort (Phase 2)**: 12-16 hours (when store is ready)

---

### ❌ GAP 6: Rate Limiting by Endpoint Class

**Current State in v3.0**:
- No mention of rate limiting
- Safety protocols exist for pain >5/10 escalation
- No API abuse prevention

**Problem**:
```typescript
// Without rate limiting:
// Malicious user could spam:
POST /twilio/checkin-response (1000 requests/second)
POST /photo-upload (100 photos/minute)
POST /ai-village/query (500 AI queries/minute → $$$)
```

**Roo Code's Recommendation**:
```typescript
// 1. Rate Limiting Tiers (by endpoint sensitivity)
const RATE_LIMITS = {
  // Read-only endpoints (lenient)
  'GET /api/clients/:id': {
    windowMs: 60 * 1000, // 1 minute
    max: 100 // 100 requests per minute
  },

  // Write endpoints (moderate)
  'POST /api/clients/:id/sessions': {
    windowMs: 60 * 1000,
    max: 30 // 30 workout sessions per minute (reasonable)
  },

  // Expensive endpoints (strict)
  'POST /api/ai-village/query': {
    windowMs: 60 * 1000,
    max: 10, // 10 AI queries per minute (costs $$$)
    message: 'AI query limit exceeded. Please wait before asking again.'
  },

  'POST /api/photo-upload': {
    windowMs: 60 * 1000,
    max: 5, // 5 photos per minute (Gemini Vision API is expensive)
    skipSuccessfulRequests: false,
    skipFailedRequests: true // Don't count 400 errors against limit
  },

  // Twilio webhooks (very strict - prevent spam)
  'POST /api/twilio/checkin-response': {
    windowMs: 60 * 1000,
    max: 2, // Only 2 check-in responses per minute (morning + evening)
    message: 'Too many check-in responses. Please wait.'
  }
};

// 2. Implementation (using express-rate-limit + Redis)
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redisClient = new Redis(process.env.REDIS_URL);

function createRateLimiter(config) {
  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:' // Rate limit keys prefix
    }),
    windowMs: config.windowMs,
    max: config.max,
    message: config.message || 'Too many requests, please try again later.',
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,
    skipSuccessfulRequests: config.skipSuccessfulRequests || false,
    skipFailedRequests: config.skipFailedRequests || false,

    // Custom key generator (rate limit per user)
    keyGenerator: (req) => {
      return req.user?.id || req.ip; // Use user ID if authenticated, else IP
    }
  });
}

// 3. Apply to routes
const aiQueryLimiter = createRateLimiter(RATE_LIMITS['POST /api/ai-village/query']);
router.post('/ai-village/query', aiQueryLimiter, async (req, res) => { ... });

const photoUploadLimiter = createRateLimiter(RATE_LIMITS['POST /api/photo-upload']);
router.post('/photo-upload', photoUploadLimiter, async (req, res) => { ... });

// 4. Global rate limiter (backup)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes per user
  message: 'Too many requests from this account. Please try again later.'
});

app.use('/api', globalLimiter);

// 5. Custom rate limiting for trainer vs client
function tierBasedRateLimiter(req, res, next) {
  const user = req.user;

  // Trainers get higher limits
  if (user.role === 'trainer') {
    req.rateLimit = { max: 500 }; // 500/min for trainers
  } else if (user.tier === 'tier_3') {
    req.rateLimit = { max: 100 }; // 100/min for tier 3 clients
  } else if (user.tier === 'tier_2') {
    req.rateLimit = { max: 50 }; // 50/min for tier 2 clients
  } else {
    req.rateLimit = { max: 20 }; // 20/min for tier 1 clients
  }

  next();
}
```

**Impact of Not Fixing**:
- API abuse (users spam expensive endpoints)
- High AI API costs (unlimited queries)
- Service degradation (malicious traffic slows system)
- No protection against DDoS

**Action Required**:
- [ ] Add Section 10.5 to Master Blueprint: "Rate Limiting Architecture"
- [ ] Install express-rate-limit + rate-limit-redis
- [ ] Define rate limits for all endpoints
- [ ] Implement tier-based limits (tier 3 gets higher limits)
- [ ] Add rate limit headers in responses
- [ ] Monitor rate limit violations (alert if user hits limit frequently)

**Estimated Effort**: 4-6 hours

---

### ❌ GAP 7: Cultural Sensitivity for Spirit Names

**Current State in v3.0**: Not mentioned in blueprint (but exists in pilot program plan)

**Problem**: Pilot program uses "Spirit Names" like "Golden Hawk", "Silver Crane" which could be seen as cultural appropriation of Native American naming traditions.

**Roo Code's Recommendation**:
```typescript
// NEUTRAL NAMING SYSTEM (No cultural appropriation risk)

// Option A: Nature-Inspired (No spiritual connotation)
const NATURE_ALIASES = [
  'Alpine Pine', 'Canyon Stone', 'Forest River', 'Mountain Oak',
  'Ocean Wave', 'Prairie Wind', 'Glacier Peak', 'Desert Sand'
];

// Option B: Galaxy-Swan Theme (Matches app branding)
const GALAXY_SWAN_ALIASES = [
  'Nebula Swan', 'Stellar Swan', 'Cosmic Swan', 'Aurora Swan',
  'Eclipse Swan', 'Constellation Swan', 'Meteor Swan', 'Orbit Swan'
];

// Option C: Simple ID System (Most neutral)
const SIMPLE_ALIASES = [
  'Client Alpha', 'Client Beta', 'Client Gamma', 'Client Delta'
];

// RECOMMENDED: Galaxy-Swan Theme
// - Aligns with SwanStudios branding
// - No cultural sensitivity issues
// - Sounds premium/exclusive
// - Easy to remember
```

**Action Required**:
- [ ] Update Pilot Program Plan to use Galaxy-Swan aliases
- [ ] Add cultural sensitivity note to Master Blueprint
- [ ] Update CLIENT-REGISTRY.md with new alias system

**Estimated Effort**: 1-2 hours

---

## ✅ WHAT'S ALREADY EXCELLENT IN v3.0

### ✅ 1. Master Prompt Schema Structure
- Complete, well-organized JSON schema
- Formal versioning with change log
- ISO 8601 date formats
- Comprehensive client profile data

### ✅ 2. Twilio Workflows
- Detailed morning/evening check-in flows
- Safety check protocols (pain >5/10 escalation)
- Photo quality gates with retake logic
- Voice-to-text transcription

### ✅ 3. iPad PWA Specification
- Offline-first architecture (IndexedDB)
- Voice command library (20+ commands)
- One-tap workout logging UI
- Real-time sync strategy

### ✅ 4. AI Village Multi-AI Consensus
- Clear role definitions (Claude, MinMax, Gemini, ChatGPT)
- Query routing logic
- Confidence scoring
- Conflict detection
- Human escalation rules

### ✅ 5. Safety Protocols
- Comprehensive red flags list (chest pain, severe breathing, etc.)
- Pain management protocol (1-3, 4-5, 6+)
- Medical disclaimer language
- Escalation workflows

### ✅ 6. Implementation Roadmap
- 3-phase rollout (12 weeks)
- Week-by-week task breakdown
- Acceptance criteria
- ROI analysis (7,400% annual ROI)

---

## 📊 SUMMARY: WHAT NEEDS TO BE ADDED

| Enhancement | Priority | Effort | Status in v3.0 |
|-------------|----------|--------|----------------|
| **PII Separation in DB** | 🔴 CRITICAL | 8-10h | ❌ Missing |
| **Consent DB Storage** | 🔴 CRITICAL | 6-8h | ❌ Missing |
| **JSON Schema Validation** | 🔴 CRITICAL | 10-12h | ⚠️ Mentioned, not implemented |
| **Event-Driven Architecture** | 🔴 CRITICAL | 12-16h | ❌ Missing |
| **Subscription Flows (Stripe Links)** | 🔴 CRITICAL | 6-8h | ❌ Missing ✅ SIMPLIFIED |
| **Rate Limiting** | 🟡 HIGH | 4-6h | ❌ Missing |
| **Cultural Sensitivity** | 🟡 HIGH | 1-2h | ⚠️ Needs update |

**Total Additional Effort**: 47-62 hours (~6-8 working days)
**Savings from Stripe Links**: 10-12 hours saved (vs custom checkout)

---

## 🎯 RECOMMENDED ACTION PLAN

### Phase 0A: Critical Backend Enhancements (Before Phase 1)

**Week -2 (Before Implementation Starts)**:
- [ ] Day 1-2: Create PII separation schema + KMS encryption setup
- [ ] Day 3: Create consent tracking schema
- [ ] Day 4-5: Create JSON Schema v3.0 file + validation middleware

**Week -1**:
- [ ] Day 1-3: Implement outbox pattern + event processor
- [ ] Day 4: Create Stripe Payment Links (3 products) in Stripe Dashboard ← FAST!
- [ ] Day 5: Add subscription webhook handler + database tracking
- [ ] Day 6: Add rate limiting to all endpoints
- [ ] Day 7: Update pilot program with Galaxy-Swan aliases

**Deliverables**:
- ✅ PII separation implemented and tested
- ✅ Consent tracking live with audit trail
- ✅ JSON Schema validation enforced on all writes
- ✅ Event-driven architecture for Twilio workflows
- ✅ Stripe subscriptions live (test mode)
- ✅ Rate limits applied to all endpoints

**Then proceed with original Phase 1 (Foundation) from Master Blueprint.**

---

## 📝 DOCUMENT UPDATES NEEDED

### 1. Create New Sections in Master Blueprint v3.0

**Add Section 2.5**: "PII Separation Architecture"
- Database schema (pii vs non-pii tables)
- KMS encryption
- Row-level security policies
- Audit logging

**Add Section 2.7**: "JSON Schema Validation Architecture"
- Complete JSON Schema v3.0 file
- Ajv validation middleware
- Version enforcement
- Migration guides

**Add Section 7.5**: "Consent Database Architecture"
- Consent tracking table schema
- Consent version history
- Opt-out workflows
- Compliance queries

**Add Section 8.5**: "Event-Driven Architecture"
- Outbox pattern
- Event processor design
- Retry logic with exponential backoff
- Dead letter queue

**Add Section 9.5**: "Subscription Management & Payment Flows"
- Stripe integration
- Checkout flows
- Upgrade/downgrade with proration
- Cancellation workflows

**Add Section 10.5**: "Rate Limiting Architecture"
- Rate limit configuration
- Tier-based limits
- Redis-backed rate limiting
- Monitoring and alerts

### 2. Update Existing Sections

**Section 3 (Twilio Workflows)**:
- Change from synchronous to event-driven
- Add outbox pattern references
- Update code examples

**Section 6 (Consent Framework)**:
- Add database storage section
- Add audit trail queries
- Add opt-out workflow

**Section 10 (Implementation Roadmap)**:
- Add "Phase 0A: Backend Enhancements" (Week -2 to -1)
- Update Phase 1 to reference completed backend work

---

## 🚀 NEXT STEPS

1. **User Approval**: Review this enhancement checklist and approve additions
2. **Choose Implementation Path**:
   - Option A: Update Master Blueprint v3.0 now (add 7 sections) → then implement
   - Option B: Implement Phase 0A enhancements → update docs as we go
   - Option C: Create "Master Blueprint v3.1" with all enhancements → supersede v3.0

3. **Assign Work**:
   - Roo Code: Backend enhancements (PII, consent, events, subscriptions, rate limiting)
   - Claude Code: Update Master Blueprint documentation
   - MinMax v2: Review UX implications of new flows (subscription checkout, consent modals)

4. **Timeline**:
   - Phase 0A (Backend): 2 weeks
   - Phase 1 (Foundation): 4 weeks (original timeline)
   - **Total**: 6 weeks to production-ready system

---

## ✅ APPROVAL REQUIRED

**Question for User**: How would you like to proceed?

**Option A** (Fastest):
- Implement Phase 0A enhancements first (2 weeks)
- Update Master Blueprint to v3.1 after implementation
- Start Phase 1 with completed backend

**Option B** (Most Thorough):
- Update Master Blueprint to v3.1 NOW (add all 7 sections)
- Send v3.1 to all AIs for final review
- Begin implementation after approval

**Option C** (Hybrid):
- Create "Phase 0A Implementation Spec" (20-page focused doc)
- Keep Master Blueprint v3.0 as-is (for reference)
- Send Phase 0A spec to Roo Code immediately

**Recommended**: **Option C (Hybrid)** - Fastest path to implementation without cluttering the already-comprehensive v3.0 blueprint.

---

**END OF ENHANCEMENT CHECKLIST**

**Master Blueprint v3.0 Status**: 85% Complete → Needs 15% Backend Enhancements

**Critical Path**: Fix 7 gaps → Ready for production

**Total Additional Effort**: 57-74 hours (7-9 days)
