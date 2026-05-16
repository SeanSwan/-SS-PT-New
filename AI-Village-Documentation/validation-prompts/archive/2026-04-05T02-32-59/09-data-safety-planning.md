# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 86.0s
> **Files:** docs/ai-workflow/blueprints/HOMEPAGE-ABOUT-VISION-REFACTOR-2026-04-05.md
> **Generated:** 4/4/2026, 7:32:59 PM

---

# SwanStudios Data Safety Audit Report
## Plan: HOMEPAGE-ABOUT-VISION-REFACTOR-2026-04-05
### Auditor Classification: DATA SAFETY REVIEW

---

## ⚠️ CRITICAL PRELIMINARY FINDING

**This plan is a frontend content/copy refactor — it contains zero database operations, zero API changes, zero file storage modifications, and zero authentication changes.**

The eight data safety questions submitted for review **do not correspond to anything in this plan document.** The questions describe an AI chat system with JSONB message storage, R2 file attachments, voice recording, conversation soft-deletes, and rate limiting — **none of which appear anywhere in the submitted plan.**

This audit must flag this mismatch before proceeding, as reviewing phantom features against a real production system is itself a data safety risk.

---

## AUDIT SECTION 1: MISMATCH ANALYSIS

```
SUBMITTED PLAN SCOPE:
├── Hero section text changes
├── New mission statement section (React component, no data)
├── New "For Trainers" section (React component, no data)
├── "Beyond the Gym" card description updates (static copy)
├── Stats year count correction (static copy)
├── Final CTA text changes (static copy)
├── About page pull quote (static copy)
├── About page bio text updates (static copy)
├── Philosophy pillar text change (static copy)
└── "SwanStudios Promise" section (React component, no data)

QUESTIONS SUBMITTED FOR REVIEW:
├── JSONB conversation message storage ❌ NOT IN PLAN
├── Soft delete on conversations ❌ NOT IN PLAN
├── R2 storage for file attachments ❌ NOT IN PLAN
├── Voice recording storage/privacy ❌ NOT IN PLAN
├── Migration safety / schema changes ❌ NOT IN PLAN
├── Concurrent JSONB write race conditions ❌ NOT IN PLAN
├── Token usage tracking integrity ❌ NOT IN PLAN
└── Rate limiting for sidebar calls ❌ NOT IN PLAN
```

**The questions describe a separate AI chat feature plan that was not included in this submission.**

---

## AUDIT SECTION 2: FINDINGS ON THE ACTUAL PLAN

### Finding 1 — Data Promise vs. Platform Reality
**Rating: HIGH**

```markdown
ISSUE: The plan makes explicit data ownership promises to users:
  - "Your workout history, your progress, your community — it lives
    here permanently and it belongs to you."
  - "Your Data, Your Story" promise card
  - "it becomes irreplaceable over time"

RISK: These are legally and architecturally binding commitments being
made in public-facing marketing copy on a production platform at
sswanstudios.com. If the backend does not currently:
  - Provide data export functionality
  - Have a documented data retention policy
  - Have GDPR/CCPA deletion request handling
  - Back up user data with tested restore procedures

...then publishing these promises creates legal exposure and user
trust liability the moment a real user reads them.

RECOMMENDATION:
Before deploying this copy, verify:
  □ Users can export their own data (GDPR Article 20 — portability)
  □ A privacy policy exists that matches these promises
  □ Data deletion requests can be honored (GDPR Article 17)
  □ "Permanently" is qualified — what happens if SwanStudios shuts down?
  □ Legal review of "belongs to you" language vs. actual license terms
    in your Terms of Service

DATABASE CHECK REQUIRED:
  SELECT table_name, column_name
  FROM information_schema.columns
  WHERE column_name IN ('user_id', 'deleted_at', 'exported_at')
  ORDER BY table_name;

  -- Verify every user-generated content table has proper
  -- user_id foreign keys enabling data portability queries
```

---

### Finding 2 — "Fair Fee ~10% or Less" Published Commitment
**Rating: HIGH**

```markdown
ISSUE: The plan includes in the "For Trainers" section:
  "Fair fees. No surprises."

And in the vision document (which may inform copy):
  "Sean takes a small fair fee (~10% or less) on transactions"

RISK: If the payment processing system (Stripe or equivalent)
currently charges a different fee structure, or if Stripe's own
fees are not factored into the "10% or less" claim, publishing
this creates:
  - FTC deceptive advertising exposure
  - Trainer trust violations if actual fees differ
  - Contractual commitment without legal review

RECOMMENDATION:
  □ Audit current Stripe fee configuration before publishing
  □ Calculate: platform fee + Stripe processing = total trainer cost
  □ Have legal review "fair fees, no surprises" language
  □ Consider: "No hidden fees" is safer than a specific percentage
    if the percentage may change
  □ Ensure trainer agreement/TOS matches whatever is published

DATABASE CHECK:
  -- Verify current fee structure in your payments/transactions table
  SELECT DISTINCT fee_percentage, fee_type, created_at
  FROM trainer_transactions  -- or equivalent table name
  ORDER BY created_at DESC
  LIMIT 10;
```

---

### Finding 3 — 18+ Content Architecture Gap
**Rating: HIGH**

```markdown
ISSUE: The plan explicitly describes:
  "Family-friendly and 18+ content properly separated"
  "Gaming & Streaming — Family and adult content separated"

This is mentioned in the vision as a platform feature, and the
homepage will describe this capability to real users.

RISK: If the database schema does not currently have:
  - content_rating or age_restriction columns on content tables
  - Age verification on user accounts
  - Proper content filtering middleware
  - COPPA compliance for under-13 users

...then advertising this separation to real users (including
potentially minors) before it exists is both a legal risk and
a child safety risk.

RECOMMENDATION:
  □ Do NOT publish 18+ content separation claims until the
    architecture exists
  □ If this is future-state, remove from current homepage copy
  □ Age verification is a legal requirement, not a nice-to-have
  □ COPPA compliance required if any users may be under 13
  □ Consult legal before any adult content platform features

DATABASE CHECK REQUIRED:
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name IN ('users', 'content', 'posts', 'videos')
  AND column_name IN (
    'age_verified', 'date_of_birth', 'content_rating',
    'is_adult_content', 'age_restriction'
  );

  -- If this returns empty: the architecture does not exist yet.
  -- Remove 18+ separation claims from homepage copy immediately.
```

---

### Finding 4 — "Global Trainer Platform" Premature Claims
**Rating: MEDIUM**

```markdown
ISSUE: The plan itself acknowledges this risk in AI Village Review
Question #2: "Is the 'Global Trainer Platform' positioning premature
given the current single-trainer setup?"

The homepage will tell trainers in Amsterdam and Lagos they can
"bring their clients to SwanStudios" and "collect payments."

RISK:
  - International payment collection requires per-country compliance
  - Stripe Connect (or equivalent) has country-specific restrictions
  - Tax reporting obligations vary by jurisdiction
  - If a trainer in Lagos signs up and cannot actually collect
    payments, this is a real user harmed by false advertising

RECOMMENDATION:
  □ Audit Stripe Connect supported countries before publishing
  □ Either qualify the claim ("Available in [X] countries")
    or remove international examples until infrastructure exists
  □ "Any trainer, any city, any country" is a legal commitment
    if a trainer relies on it to build their business here

DATABASE CHECK:
  -- Check if trainer payment infrastructure exists
  SELECT COUNT(*) as trainer_count,
         COUNT(stripe_account_id) as trainers_with_stripe
  FROM trainers  -- or users WHERE role='trainer'
  WHERE created_at > NOW() - INTERVAL '1 year';
```

---

### Finding 5 — Static Copy Changes: Actual Risk Level
**Rating: LOW**

```markdown
ISSUE: The mechanical changes in this plan (text swaps, new React
components with no data fetching) carry minimal data safety risk.

SPECIFIC CHANGES ASSESSED:
  ✓ "7+ Years" → "26+ Years" — No data risk. Verify accuracy.
  ✓ Button label changes — No data risk.
  ✓ Hero headline changes — No data risk.
  ✓ New static sections (Mission, Trainer, Promise) — No data risk
    IF they contain no forms, no data collection, no API calls.
  ✓ Philosophy pillar text change — No data risk.

RECOMMENDATION:
  □ Confirm new sections are purely presentational (no forms)
  □ If "Trainer Sign Up" CTA links to a signup form, audit that
    form's data handling separately
  □ If "Join the Community" CTA creates accounts, audit that flow
  □ Verify no new analytics/tracking pixels are added with these
    sections that weren't previously disclosed in privacy policy
```

---

### Finding 6 — "Never Sell Your Data" Promise vs. Analytics Stack
**Rating: MEDIUM**

```markdown
ISSUE: The plan includes:
  "We will never sell your attention to the highest bidder"
  "Not advertisers" (re: data ownership)
  "never sells you out"

RISK: If the platform currently uses:
  - Google Analytics (sells behavioral data to Google's ad network)
  - Facebook Pixel (sells behavioral data to Meta)
  - Any third-party analytics that monetizes user data
  - Hotjar, FullStory, or similar session recording tools

...then these promises are false at the moment of publication.

RECOMMENDATION:
  □ Audit all third-party scripts currently loaded on sswanstudios.com
  □ Review privacy policy for accuracy against actual data flows
  □ Consider: Plausible Analytics or Fathom (privacy-first alternatives)
    that align with the platform's stated values
  □ If Google Analytics is in use, this must be disclosed and
    the "never sell" language must be qualified

AUDIT COMMAND (check your HTML/bundle):
  grep -r "googletagmanager\|fbq\|hotjar\|clarity\|mixpanel\|segment" \
    frontend/src/ --include="*.ts" --include="*.tsx" --include="*.html"
```

---

## AUDIT SECTION 3: THE EIGHT QUESTIONS — ANSWERED AGAINST CORRECT CONTEXT

Since the questions describe an AI chat system not present in this plan, I will answer them as a **forward-looking audit** for when that system is built, since the vision document implies it will exist.

---

### Q1 — Conversation JSONB Growth
**Rating: CRITICAL (when built)**

```sql
-- PostgreSQL JSONB has a hard limit of 1GB per value.
-- Practical limit for performance: ~1MB before queries degrade.

-- RISK SCENARIO:
-- User sends 500 messages + 10 file attachments (base64 encoded)
-- Each attachment: ~500KB base64 = 5MB per conversation
-- At scale: table bloat, slow sidebar queries, OOM on large fetches

-- SAFE ARCHITECTURE (do not store attachments in JSONB):
-- Option A: Separate messages table (recommended)
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id),
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  token_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_messages_conversation_created
  ON ai_messages(conversation_id, created_at);

-- Option B: If JSONB is kept, enforce size limit at application layer
-- Add CHECK constraint:
ALTER TABLE ai_conversations
  ADD CONSTRAINT messages_size_limit
  CHECK (pg_column_size(messages) < 1048576); -- 1MB hard limit

-- NEVER store file content in JSONB. Store R2 URLs only.
-- Attachment metadata in JSONB: OK (URL, filename, size, mime_type)
-- Attachment content in JSONB: NEVER
```

---

### Q2 — Soft Delete Integrity
**Rating: HIGH (when built)**

```sql
-- VERIFY deleted conversations are excluded from sidebar:

-- UNSAFE query (returns deleted conversations):
SELECT id, title, updated_at FROM ai_conversations
WHERE user_id = $1
ORDER BY updated_at DESC;

-- SAFE query (must include status filter):
SELECT id, title, updated_at FROM ai_conversations
WHERE user_id = $1
  AND status != 'deleted'  -- or: AND deleted_at IS NULL
ORDER BY updated_at DESC
LIMIT 50;  -- Always paginate

-- AUDIT: Search codebase for all conversation list queries
grep -r "ai_conversations\|findAll.*conversation" \
  backend/src/ --include="*.ts" --include="*.js" | \
  grep -v "status.*deleted\|deleted_at"
-- Any result from this grep is a data leak vulnerability

-- Add database-level protection:
CREATE VIEW active_conversations AS
  SELECT * FROM ai_conversations
  WHERE status != 'deleted';
-- Force all application queries through this view
```

---

### Q3 — R2 Storage Cleanup
**Rating: HIGH (when built)**

```markdown
RISK: If conversations are soft-deleted but R2 files are not cleaned up:
  - Storage costs grow unboundedly
  - User data persists after user believes it's deleted (GDPR violation)
  - If hard-deleted without R2 cleanup: orphaned files forever

SAFE ARCHITECTURE:
  1. Never delete R2 files synchronously in request handler
  2. On conversation soft-delete: queue R2 cleanup job
  3. On hard-delete (GDPR request): immediate R2 deletion required
  4. Implement R2 lifecycle rules as safety net (90-day orphan cleanup)
  5. Store R2 object keys in database — never reconstruct from convention

DATABASE REQUIREMENT:
  CREATE TABLE file_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES ai_conversations(id),
    message_id UUID,  -- reference to specific message
    r2_object_key VARCHAR(500) NOT NULL UNIQUE,
    r2_bucket VARCHAR(100) NOT NULL,
    original_filename VARCHAR(255),
    mime_type VARCHAR(100),
    file_size_bytes INTEGER,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,  -- soft delete
    r2_deleted_at TIMESTAMPTZ  -- confirmed R2 deletion
  );
  -- This table is your source of truth for cleanup jobs
```

---

### Q4 — Voice Recording Storage
**Rating: CRITICAL (when built)**

```markdown
RISK CLASSIFICATION: BIOMETRIC DATA
Voice recordings may qualify as biometric data under:
  - CCPA (California) — biometric identifiers
  - BIPA (Illinois) — explicit consent required
  - GDPR (EU) — special category data (Article 9)
  - Texas CUBI, Washington My Health MY Data Act

MANDATORY REQUIREMENTS:
  □ Voice data must NEVER be stored without explicit informed consent
  □ Consent must be granular: "Your voice is sent to Google Gemini
    for transcription and immediately discarded. It is not stored
    by SwanStudios."
  □ If Gemini retains audio: disclose Google's data retention policy
  □ Transcription text (not audio) may be stored as regular message content
  □ Audio buffer must be zeroed/garbage-collected after API call
  □ No logging of audio data — ensure Express request logging
    does not capture multipart audio payloads

IMPLEMENTATION REQUIREMENT:
  // In voice handler — audio must never touch disk
  async function handleVoiceMessage(audioBuffer: Buffer) {
    try {
      const transcript = await gemini.transcribe(audioBuffer);
      return transcript; // Only text leaves this function
    } finally {
      // Explicit buffer clearing
      audioBuffer.fill(0);
    }
  }

  // Privacy policy MUST state:
  // "Voice recordings are transmitted directly to Google Gemini
  //  for transcription. SwanStudios does not store audio recordings.
  //  Google's data handling: [link to Google AI privacy policy]"
```

---

### Q5 — Migration Safety / "Zero Backend Changes"
**Rating: HIGH (when built)**

```markdown
CLAIM

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
