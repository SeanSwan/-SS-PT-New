# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 80.8s
> **Files:** docs/ai-workflow/brainstorms/inception-morph-engine-plan-2026-07-08.md
> **Generated:** 7/8/2026, 12:48:04 AM

---

# Data Safety Audit Report
## Inception Canvas / Lens Foundry — Build-Out Plan
**Auditor Role:** Production Data Safety Auditor
**Date:** 2026-07-08
**Severity Scale:** CRITICAL → HIGH → MEDIUM → LOW

---

> **Auditor's Framing Note:** This plan is a *product vision + architecture brainstorm* document, not a technical specification with explicit schema definitions. However, the plan contains enough architectural commitments to derive concrete data-safety risks. Every finding below is derived strictly from plan text. Where the plan is silent on a safety concern that its own architecture implies, that silence is itself flagged as a risk. All findings are treated as if they affect real user data on `sswanstudios.com` in production.

---

## Executive Summary

The plan describes a generative-UI platform with: persistent JSON "Lens documents," a voice/intent pipeline, an audit trail for T3/T4 trust-tier actions, a component registry with promotion workflows, URL-addressable state snapshots, and a "personal data spine." **None of these data structures have defined schemas, size limits, retention policies, or migration strategies in the plan.** The plan explicitly defers these decisions to the Village. That deferral is the primary risk surface.

**Finding count by severity:**
| Severity | Count |
|---|---|
| CRITICAL | 3 |
| HIGH | 4 |
| MEDIUM | 5 |
| LOW | 3 |

---

## Finding 1 — Unbounded Lens JSON Growth

**Severity: CRITICAL**

### What the plan says
> *"first generation is AI-built, then snapshotted to a named deterministic JSON Lens document that loads instantly thereafter"*
> *"each saved Lens state is addressable (`/lens/<name>`); back-button rewinds"*
> *"URLs survive the morph"*

### Derived data structure
The plan implies a `lenses` table (or equivalent document store) with at minimum:

```
lenses
  id            uuid PK
  name          varchar
  owner_id      fk → users
  state_doc     jsonb        ← THE RISK
  version       integer
  created_at    timestamptz
  updated_at    timestamptz
```

The `state_doc` JSONB column holds the entire rendered UI state. The plan also implies version history ("regenerate on demand," "back-button rewinds"), meaning either:
- A `lens_versions` table with one JSONB row per morph event, OR
- An append-only log inside the JSONB itself

**Neither has a defined size limit or row cap.**

### Risk
- A single Lens document could encode 30–60 DOM nodes × component registry metadata × nested theme tokens × API response payloads. At scale, individual documents could reach megabytes.
- "Back-button rewinds" implies version history. Without a cap, a power user who morphs 500 times generates 500 full-state snapshots. At 50KB each, that is 25MB per user in the `lenses` table alone — before any marketplace adoption.
- JSONB columns in PostgreSQL have a 1GB theoretical limit per row but cause severe performance degradation well before that. A table scan on an unindexed JSONB field at this size will cause production query timeouts.
- The plan mentions a **Marketplace** where third parties author Lenses. Marketplace adoption multiplies this unboundedly.

### Recommendations

```sql
-- 1. Hard size constraint at the application layer (Express middleware)
-- Before any INSERT/UPDATE to lenses.state_doc:
const MAX_LENS_BYTES = 512 * 1024; // 512KB hard cap
if (Buffer.byteLength(JSON.stringify(stateDoc)) > MAX_LENS_BYTES) {
  throw new PayloadTooLargeError('Lens document exceeds 512KB limit');
}

-- 2. Separate version history into its own table with a row cap
CREATE TABLE lens_versions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lens_id       uuid NOT NULL REFERENCES lenses(id) ON DELETE CASCADE,
  state_doc     jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES users(id)
);

-- 3. Enforce version cap via trigger
CREATE OR REPLACE FUNCTION enforce_lens_version_cap()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM lens_versions
  WHERE lens_id = NEW.lens_id
    AND id NOT IN (
      SELECT id FROM lens_versions
      WHERE lens_id = NEW.lens_id
      ORDER BY created_at DESC
      LIMIT 50  -- keep last 50 versions per lens
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lens_version_cap
AFTER INSERT ON lens_versions
FOR EACH ROW EXECUTE FUNCTION enforce_lens_version_cap();

-- 4. Index for efficient version queries
CREATE INDEX idx_lens_versions_lens_id_created
  ON lens_versions(lens_id, created_at DESC);
```

**Additionally:** Define a `lens_size_bytes` computed column or materialized value so monitoring dashboards can alert before storage becomes a crisis.

---

## Finding 2 — Trust Layer Audit Log Has No Retention Policy

**Severity: CRITICAL**

### What the plan says
> *"T3/T4 actions (send/file/pay) render as approval-gated controls with audit receipts"*
> *"Trust Layer (port Hermes T0–T4): every generated component carries an effect tier"*
> *"This is the enterprise/compliance moat, especially for legal"*

### Derived data structure
The plan implies an audit/receipt table:

```
trust_audit_log
  id              uuid PK
  session_id      fk → sessions
  user_id         fk → users
  lens_id         fk → lenses
  effect_tier     smallint        -- T0..T4
  action_type     varchar         -- 'send' | 'file' | 'pay'
  payload_snapshot jsonb          ← THE RISK
  approved_by     uuid
  approved_at     timestamptz
  created_at      timestamptz
```

The `payload_snapshot` column is implied by "audit receipts" — you cannot audit what was approved without capturing what was sent. For T4 (pay) actions, this snapshot likely contains financial transaction parameters. For T3 (file), it may contain document content or PII.

### Risk
1. **Unbounded growth:** The plan positions this as an "enterprise/compliance moat." Enterprise customers generate high-volume audit logs. Without a retention policy, this table grows indefinitely. At 1,000 T3/T4 actions/day per enterprise customer × 10 customers × 1KB/row = 3.6GB/year minimum, growing with adoption.
2. **PII in payload snapshots:** If a T3 "send" action captures the message body, or a T4 "pay" action captures billing parameters, the audit log becomes a PII/PCI-adjacent store with no defined handling.
3. **Legal Lens specifically:** The plan calls out law firms as the first customer. Legal T3/T4 actions (file a motion, send a contract) may capture privileged attorney-client content in `payload_snapshot`. Storing this without explicit retention/deletion controls creates legal liability for the platform.
4. **No mention of encryption at rest** for this column despite the sensitivity.

### Recommendations

```sql
-- 1. Separate sensitive payload from metadata
CREATE TABLE trust_audit_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid REFERENCES sessions(id),
  user_id           uuid NOT NULL REFERENCES users(id),
  lens_id           uuid REFERENCES lenses(id),
  effect_tier       smallint NOT NULL CHECK (effect_tier BETWEEN 0 AND 4),
  action_type       varchar(32) NOT NULL,
  -- Store only a hash + metadata, NOT the full payload
  action_hash       bytea NOT NULL,  -- SHA-256 of payload for integrity proof
  action_metadata   jsonb,           -- non-sensitive: action type, timestamp, lens version
  approved_by       uuid REFERENCES users(id),
  approved_at       timestamptz,
  expires_at        timestamptz NOT NULL,  -- MANDATORY retention deadline
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 2. Retention policy: configurable per customer tier
-- Default: 90 days for T0-T2, 7 years for T3-T4 (legal compliance)
-- Implement as a scheduled job, NOT a trigger (avoid lock contention)

-- 3. If full payload must be stored (legal requirement), use pgcrypto
-- payload_encrypted bytea -- AES-256-GCM, key per customer in KMS
-- NEVER store raw PII/privileged content in plaintext JSONB

-- 4. Partition by created_at for efficient purge
CREATE TABLE trust_audit_log (
  -- ... columns above ...
) PARTITION BY RANGE (created_at);
```

**Policy requirement:** The plan MUST define retention periods before the Trust Layer ships. Suggested defaults: T0–T2 = 30 days, T3–T4 = configurable (90 days consumer, 7 years legal). These must be surfaced in the privacy policy before any paying customer uses T3/T4 features.

---

## Finding 3 — Voice/Intent Pipeline: Audio Capture with No Retention or Discard Policy

**Severity: CRITICAL**

### What the plan says
> *"Voice/intent → API orchestration → state document → render. Spoken words route to which APIs fire"*

### Derived data flow
The plan describes a voice input pipeline. This implies:
1. Audio is captured in the browser (MediaRecorder API or equivalent)
2. Audio is transmitted to a backend endpoint or third-party STT service
3. A transcript is produced and used to route API calls
4. The state document is generated from the transcript + API results

**The plan is completely silent on:**
- Whether raw audio is stored or discarded after transcription
- Whether transcripts are stored in the Lens state document or separately
- Retention period for either
- Whether voice data is sent to a third-party STT provider (and which one)
- User consent flow for audio capture
- GDPR/CCPA implications

### Risk
1. **Audio capture without explicit consent UI is a GDPR Article 9 violation** if any health/fitness data is spoken (SwanStudios is a personal training platform — users will speak workout goals, health conditions, injuries).
2. **If transcripts are embedded in `state_doc` JSONB**, they are retained indefinitely (see Finding 1) and may contain PII that the user never intended to persist.
3. **Third-party STT providers** (Google Speech, OpenAI Whisper, etc.) have their own data retention policies. Sending audio to them without disclosing this in the privacy policy is a GDPR/CCPA violation.
4. **SwanStudios context specifically:** A personal training user saying *"I have a torn ACL and I'm 45 years old"* into the voice interface has just created a health record. Under HIPAA-adjacent standards and GDPR Article 9, this is special-category data requiring explicit consent and strict retention limits.

### Recommendations

```typescript
// 1. MANDATORY: Audio must never be persisted to any database
// Enforce at the API layer:

// POST /api/lens/voice-intent
router.post('/voice-intent', async (req, res) => {
  const audioBuffer = req.body.audio; // received as multipart
  
  // Transcribe ONLY — do not store audio
  const transcript = await sttService.transcribe(audioBuffer);
  
  // Immediately discard audio buffer
  // audioBuffer goes out of scope — do NOT write to S3/disk/DB
  
  // Extract intent from transcript
  const intent = await intentParser.parse(transcript);
  
  // Store ONLY the structured intent, NOT the raw transcript
  // unless user has explicitly opted into transcript history
  return res.json({ intent });
});

// 2. If transcript history is a feature, it must be:
//    - Opt-in (not opt-out)
//    - Separately deletable by the user
//    - Excluded from Lens state_doc JSONB
//    - Stored in a dedicated table with retention enforcement

CREATE TABLE voice_intent_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  intent_type   varchar(64) NOT NULL,  -- structured, NOT raw transcript
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL DEFAULT now() + interval '30 days'
);
-- Raw transcript: NEVER stored. Audio: NEVER stored.

// 3. Consent gate — must appear before first voice interaction:
// "This feature uses your microphone. Audio is processed in real-time
//  and immediately discarded. No audio recordings are stored."
// User must affirmatively accept. Store consent timestamp.
```

---

## Finding 4 — Component Registry Promotion Has No Audit Trail or Rollback

**Severity: HIGH**

### What the plan says
> *"(c) Generate new components in a sandbox, promoted into the registry only after review"*
> *"Lens = generate once, replay forever, regenerate on demand"*

### Derived data structure
```
component_registry
  id              uuid PK
  name            varchar
  version         semver/varchar
  source_code     text            ← THE RISK
  sandbox_status  enum('sandbox','review','promoted','retired')
  promoted_by     uuid fk → users
  promoted_at     timestamptz
  lens_id         fk → lenses    -- which lens generated this
```

### Risk
1. **`source_code text` column is unbounded.** A generated React component with inline styles, logic, and test harness could be 50KB+. Multiply by thousands of marketplace submissions.
2. **No rollback mechanism described.** If a promoted component has a bug that breaks production Lenses, there is no described path to revert. Every Lens that references the component by ID is now broken.
3. **No FK integrity between Lens documents and registry components.** If `state_doc` JSONB references a component by name/ID and that component is retired or deleted, the Lens silently breaks. JSONB references are not enforced by PostgreSQL FK constraints.
4. **"Promoted after review" implies a human approval step.** No described locking mechanism means two reviewers could simultaneously promote conflicting versions of the same component.

### Recommendations

```sql
-- 1. Size limit on source_code
ALTER TABLE component_registry
  ADD CONSTRAINT chk_source_code_size
  CHECK (octet_length(source_code) <= 102400); -- 100KB hard cap

-- 2. Immutable versioning — never UPDATE source_code, only INSERT new version
-- Use a composite unique constraint:
ALTER TABLE component_registry
  ADD CONSTRAINT uq_component_name_version UNIQUE (name, version);

-- 3. Soft-retire, never hard-delete promoted components
-- (Lenses referencing them must continue to work)
ALTER TABLE component_registry
  ADD COLUMN retired_at timestamptz,
  ADD COLUMN retired_by uuid REFERENCES users(id),
  ADD COLUMN successor_id uuid REFERENCES component_registry(id);

-- 4. Optimistic lock on promotion to prevent concurrent promotion
ALTER TABLE component_registry
  ADD COLUMN review_lock_token uuid,
  ADD COLUMN review_lock_expires_at timestamptz;

-- Claim lock before review:
UPDATE component_registry
SET review_lock_token = gen_random_uuid(),
    review_lock_expires_at = now() + interval '30 minutes'
WHERE id = $1
  AND (review_lock_token IS NULL OR review_lock_expires_at < now());
-- If 0 rows updated, another reviewer holds the lock.

-- 5. Audit log for promotions
CREATE TABLE component_registry_audit (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id    uuid NOT NULL REFERENCES component_registry(id),
  action          varchar(32) NOT NULL, -- 'promoted','retired','rolled_back'
  actor_id        uuid NOT NULL REFERENCES users(id),
  previous_status varchar(32),
  new_status      varchar(32),
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

---

## Finding 5 — "Personal Data Spine" Is Architecturally Undefined with Maximum Privacy Risk

**Severity: HIGH**

### What the plan says
> *"The Data Spine: local-first + encrypted personal graph vs cloud. Privacy, ownership, sync."*
> *(Listed as Open Decision #5 — explicitly unresolved)*

### Risk
This is listed

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
