# Data Safety & Schema Impact — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 85.4s
> **Files:** docs\ai-workflow\AI-HANDOFF\NUTRITION-DECISION-LOGGER-AI-VILLAGE-INPUT-2026-07-09.md
> **Generated:** 7/8/2026, 8:30:00 PM

---

# Data Safety Audit — Nutrition Decision Logger Plan
## SwanStudios Production SaaS — sswanstudios.com
**Auditor Role: DATA SAFETY AUDITOR | Date: 2026-07-09**

---

> **Scope declaration:** This audit derives every finding from the plan document above. No features are assumed beyond what the plan explicitly describes. All findings treat production user data as at risk.

---

## Executive Summary

The plan describes a significant expansion of the nutrition data surface: new write paths, richer JSONB payloads, multi-role access to diary rows, external API proxying, OCR/voice capture, and a new admin review queue system. Several findings rise to **CRITICAL** because they affect data already in production (`DailyMacroLog` rows exist today) or because they describe write paths that are demonstrably broken right now (silent Sequelize no-ops). The plan's phasing is generally sound, but the data-safety gaps must be resolved before any slice ships code.

---

## Finding 1 — Unbounded Growth in `items` JSONB and `nutrientsReported`/`nutrientsCalculated`

**Severity: CRITICAL**

### What the plan says

Phase A explicitly instructs: *"Store source/provenance extras in `items` JSON while the schema is being reviewed."* The `NutritionEntryDraft` contract defines `items: Array<Record<string, unknown>>` with no size bound. `nutrientsReported` and `nutrientsCalculated` are typed as `Record<string, number | null>` — also unbounded. The plan also proposes storing `rawPayloadRef` as an optional string field, which could hold arbitrary payload content.

### Why this is CRITICAL for production

`DailyMacroLog.items` is already a live column. Every capture lane (manual, search, barcode, label-photo, voice, recipe, local produce, repeat) will write to it under Phase A. A single user logging three meals per day for one year at even a modest 5 KB per `items` blob produces ~5 MB per user per year in a single JSONB column — before any provenance extras are added. The plan explicitly says provenance extras go into `items` *while the schema is being reviewed*, meaning this is the intended production path for an indeterminate period. There is no size cap, no item-count limit, no pagination strategy, and no archival plan described anywhere in the document.

The `nutrientsReported`/`nutrientsCalculated` fields compound this: the Free-Brain synthesis correctly identifies these as *"JSON soup"* that reproduces the `proteins_100g`/`proteins`/`protein` chaos already present in `foodScannerRoutes.mjs:495`. An unbounded string-keyed map means a single malformed or adversarial payload could write arbitrarily large nutrient objects into every diary row.

### Specific risks

1. **PostgreSQL row bloat:** JSONB columns with large arrays cause table bloat, vacuum pressure, and index degradation on the `DailyMacroLog` table that every nutrition read path queries.
2. **No read-path pagination on `items`:** The plan describes refreshing Today, Macros, Hydration, and Diary after every save (`S → T` in the flowchart). If `items` grows unbounded, every diary refresh fetches the full JSONB payload.
3. **`rawPayloadRef` is undefined:** The plan lists it as `rawPayloadRef?: string` but never defines whether this is a URL, a hash, a full JSON blob, or a foreign key. If it stores raw OCR or voice transcript payloads inline, a single label-photo entry could be kilobytes.

### Database-safe recommendations

```sql
-- Add a CHECK constraint to cap items array length
ALTER TABLE "DailyMacroLogs"
  ADD CONSTRAINT chk_items_max_length
  CHECK (jsonb_array_length(COALESCE(items, '[]'::jsonb)) <= 50);

-- Add a CHECK constraint to cap total items payload size
ALTER TABLE "DailyMacroLogs"
  ADD CONSTRAINT chk_items_max_bytes
  CHECK (octet_length(items::text) <= 65536); -- 64 KB hard cap
```

```typescript
// NutritionEntryDraft — replace unbounded maps with typed interface
interface NutrientPanel {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  addedSugar: number | null;
  saturatedFat: number | null;
  transFat: number | null;
  cholesterol: number | null;
  extra: Record<string, number>; // escape hatch, validated server-side
}

// Server-side validation before any DailyMacroLog write
const MAX_EXTRA_KEYS = 20;
const MAX_EXTRA_KEY_LENGTH = 64;
if (Object.keys(draft.nutrientsReported.extra).length > MAX_EXTRA_KEYS) {
  throw new ValidationError('nutrientsReported.extra exceeds maximum key count');
}
```

```typescript
// rawPayloadRef must be a reference, never inline content
// Store OCR/voice payloads in object storage; rawPayloadRef = storage key only
type RawPayloadRef = `ocr/${string}` | `voice/${string}` | null;
// Max length: 256 chars (storage key, not content)
```

**Required before Phase A ships:** Add the JSONB size constraints as a migration. Define `rawPayloadRef` as a storage key reference with a 256-character VARCHAR column, not a JSONB field. Replace `Record<string, number | null>` with the typed `NutrientPanel` interface.

---

## Finding 2 — Soft-Delete Integrity: `verified` Flag Is Not a Soft-Delete, But Review Queues Treat It Like One

**Severity: HIGH**

### What the plan says

The plan relies on `verified: false` to mark estimates, AI-generated entries, photo entries, and voice entries as unverified. The admin review queue at `/api/macros/review-queue` (called at `ClientNutritionEstimateReviewPanel.tsx:87`) and the verify action at `/api/macros/client-timeline/:entryId/verify` (`:119`) operate on this flag. Phase C proposes extending this into a full food-data quality queue. The plan also states: *"Promote trainer/admin verification actions into first-class audit events, not silent boolean flips."*

### Why this is HIGH

The plan does not describe any soft-delete mechanism for `DailyMacroLog` rows, but the review queue architecture creates a functional equivalent: rows with `verified: false` are in a pending state that the review queue must correctly filter. The risks are:

1. **No `deletedAt` column described:** If a user deletes a diary entry (a reasonable user action not explicitly scoped out), there is no evidence the plan accounts for excluding deleted rows from the review queue. A trainer reviewing a queue item for a row the client has already deleted would be reviewing phantom data.
2. **`reviewStatus` enum can encode contradictory states:** The Free-Brain synthesis flags that `swan_verified` + `needs_admin_source_review` can coexist. If the review queue filters on `reviewStatus` without a strict state machine, deleted-but-not-excluded rows or rows in impossible states will appear in trainer/admin queues.
3. **Verify action scope:** `PATCH /api/macros/client-timeline/:entryId/verify` — the plan does not specify what columns this PATCH touches. A broad `UPDATE` that sets `verified = true` without also setting `reviewStatus = 'verified'` creates a split-brain state between the two flags.

### Database-safe recommendations

```sql
-- If DailyMacroLog does not already have soft-delete, add it
-- before the review queue is extended
ALTER TABLE "DailyMacroLogs"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_dailymacrologs_deleted_at
  ON "DailyMacroLogs" ("deletedAt")
  WHERE "deletedAt" IS NULL;
```

```javascript
// Every review-queue read path MUST include this filter
// backend/routes/dailyMacroRosterTriageRoutes.mjs
const reviewQueue = await DailyMacroLog.findAll({
  where: {
    deletedAt: null,           // exclude soft-deleted rows
    verified: false,
    reviewStatus: {
      [Op.in]: [
        'needs_client_review',
        'needs_trainer_review',
        'needs_admin_source_review'
      ]
    }
  }
});
```

```typescript
// Define the allowed state machine — document this before any code ships
// Invalid transitions must be rejected at the API layer, not silently accepted
const VALID_REVIEW_TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  'client_confirmed':          ['needs_trainer_review', 'verified'],
  'needs_client_review':       ['client_confirmed'],
  'needs_trainer_review':      ['verified', 'needs_admin_source_review'],
  'needs_admin_source_review': ['verified'],
  'verified':                  [], // terminal — no transitions out
};
```

**Required before Slice 6 ships:** Confirm `DailyMacroLog` has `deletedAt`. Add it if absent. Enforce the state machine at the API layer. The verify PATCH must be an atomic update of both `verified` and `reviewStatus` in a single transaction.

---

## Finding 3 — Storage Cleanup: OCR/Voice/Photo Payloads Have No Defined Lifecycle

**Severity: CRITICAL**

### What the plan says

The plan describes a `label_photo` capture mode that uses Google ML Kit Text Recognition v2, which *"returns text structure and confidence."* The `rawPayloadRef` field in `NutritionEntryDraft` is described as an optional reference to raw source payloads. The `mealPhotoLog.ts:6` file already builds photo/AI estimate payloads for `POST /api/macros`. Voice capture is a live panel in `NutritionWorkspace` today.

### Why this is CRITICAL

The plan never defines:

1. **Where OCR/photo/voice payloads are stored** — inline in JSONB, in object storage (S3/GCS), or discarded after extraction.
2. **What happens to stored payloads when the parent `DailyMacroLog` row is deleted** — there is no cascade or cleanup strategy described.
3. **Retention period** — no TTL, no expiry, no user-facing disclosure.
4. **Whether raw OCR text contains PII** — a photo of a nutrition label from a meal at a named restaurant, or a voice log saying *"I had lunch with [person] at [location]"*, can contain incidental PII beyond nutrition data.

This is a CRITICAL finding because:
- Food logs are health-adjacent data. In jurisdictions with GDPR, CCPA, or HIPAA-adjacent obligations, storing audio transcripts or photos of meals without a defined retention and deletion policy is a compliance liability.
- The Free-Brain synthesis identifies this as a blind spot: *"Neither analyst addressed that food logs, allergens, and health scores are sensitive health-adjacent data."*
- The plan explicitly states voice entries remain `verified: false` — meaning they are stored in the diary indefinitely in an unverified state with no cleanup trigger.

### Database-safe recommendations

```typescript
// Define storage strategy BEFORE label-photo or voice ships
// Option A: Discard raw payload after extraction (recommended for v1)
interface OCRExtractionResult {
  extractedNutrients: NutrientPanel;
  confidence: number; // 0-1
  rawPayloadRef: null; // explicitly null — raw text discarded after extraction
}

// Option B: Store in object storage with TTL (if raw payload needed for review)
interface OCRExtractionResult {
  extractedNutrients: NutrientPanel;
  confidence: number;
  rawPayloadRef: string; // storage key, e.g. "ocr/userId/entryId/2026-07-09"
  rawPayloadExpiresAt: Date; // 30-day TTL maximum
}
```

```javascript
// Cascade cleanup when DailyMacroLog row is deleted
// backend/models/DailyMacroLog.mjs — add hook
DailyMacroLog.addHook('beforeDestroy', async (entry) => {
  if (entry.rawPayloadRef) {
    await storageService.delete(entry.rawPayloadRef);
  }
});

// Also handle soft-delete
DailyMacroLog.addHook('beforeUpdate', async (entry) => {
  if (entry.changed('deletedAt') && entry.deletedAt !== null) {
    if (entry.rawPayloadRef) {
      await storageService.scheduleDelete(entry.rawPayloadRef, { delayDays: 30 });
    }
  }
});
```

```sql
-- If rawPayloadRef is stored in DB, add expiry column
ALTER TABLE "DailyMacroLogs"
  ADD COLUMN IF NOT EXISTS "rawPayloadExpiresAt" TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Scheduled job to clean up expired payloads
-- Run nightly; do not rely on application-layer cleanup alone
```

**Required before label-photo or voice capture ships:** Define the storage strategy explicitly. If raw payloads are stored anywhere (DB, object storage, logs), document the retention period, deletion cascade, and user-facing privacy disclosure. Recommend discarding raw OCR text after nutrient extraction for v1 — store only the extracted `NutrientPanel` and confidence score.

---

## Finding 4 — Sensitive Data Retention: Nutrition Data Is Health-Adjacent PII

**Severity: HIGH**

### What the plan says

The plan captures: food diary entries, allergen information (via `FoodProduct.healthConcerns`), NOVA group scores, health scores, OCR text from food labels, voice meal descriptions, and trainer/admin review notes. The admin review queue gives trainers and admins access to client diary entries. The plan scopes trainer logging for clients as an open question (Open Question #4).

### Why this is HIGH

1. **No data minimization policy:** The plan proposes storing `rawPayloadRef` for OCR and voice. Raw voice transcripts of meal descriptions are PII. Raw OCR from a label photo may capture background text (restaurant names, personal notes written on packaging). The plan does not define what is extracted vs. what is retained.

2. **Allergen data is sensitive health data:** `FoodProduct.healthConcerns` and the proposed allergen field (currently missing from the model — see Finding 5) constitute health information. In many jurisdictions this triggers heightened data protection obligations.

3. **Trainer/admin access to diary rows:** The plan mounts trainer and admin meal-planner routes at `UniversalDashboardLayout.routes.tsx:139/162/188`. The plan does not describe row-level access controls — specifically, whether a trainer can read *any* client's diary or only their assigned clients' diaries.

4. **No described audit log for admin access:** The plan says *"Promote trainer/admin verification actions into first-class audit events"* but this is deferred to Phase C. Until then, admin reads of client diary rows are unlogged.

### Database-safe recommendations

```sql
-- Row-level access control: trainers may only read assigned clients
-- Verify this constraint exists before extending review queue access
-- If not present, add it as a prerequisite to Slice 6

-- Example: trainer_client_assignments table must be checked on every
-- /api/macros/review-queue query
SELECT dlm.* FROM "DailyMacroLogs" dlm
INNER JOIN "TrainerClientAssignments" tca
  ON tca."clientId" = dlm."userId"
  AND tca."trainerId" = :requestingUserId
  AND tca."deletedAt" IS NULL
WHERE dlm."deletedAt" IS NULL
  AND dlm."verified" = false;
```

```typescript
// Minimum retention policy to define before any sensitive data ships
const NUTRITION_DATA_RETENTION = {
  diaryEntries: 'indefinite_until_account_deletion', // must be in privacy policy
  rawOcrPayloads: 'discard_after_extraction',         // recommended
  rawVoiceTranscripts: 'discard_after_extraction',    // recommended
  trainerReviewNotes: '7_years',                      // if used for health coaching
  adminAuditLog: '7_years',
} as const;
```

**Required before any trainer/admin review queue ships:** Verify row-level access controls exist for trainer-to-client relationships. Add audit logging for admin reads

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
