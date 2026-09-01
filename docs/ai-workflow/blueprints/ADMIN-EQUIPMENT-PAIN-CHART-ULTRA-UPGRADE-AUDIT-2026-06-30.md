# Admin Equipment + Pain Charts Ultra Upgrade Audit

**Date:** 2026-06-30  
**Branch:** `audit/admin-equipment-pain-chart-ultra-upgrade-2026-06-30`  
**Scope:** Administration dashboard `Equipment` workspace and `Pain Charts` / body-map workspace in `SeanSwan/-SS-PT-New`.

## Executive summary

The current Admin dashboard has real surfaces for both requested tabs:

- `Equipment` is mounted under the Training workspace at `/dashboard/admin/equipment` and renders `EquipmentManagerPage`.
- `Pain Charts` is mounted under the Training workspace at `/dashboard/admin/body-map` and renders the BodyMap system.

The Equipment Manager already has a strong foundation: location profiles, camera/gallery upload, multiple-photo queueing from library uploads, auto-retry, AI scan review, manual fallback, and pending approval. The core limitation is that the scanner is architected as a single-object scanner. The prompt explicitly asks for the primary/largest equipment when multiple pieces are visible, the parser intentionally collapses arrays to the first item, the backend route creates one pending `EquipmentItem`, and the frontend approval modal reviews one item at a time.

The Pain Charts system also has a real foundation: front/back body map, client/trainer modes, active pain entries, protected routes, and client privacy stripping for trainer-only fields. The main gaps are active-only UX, limited history/trends, drift risk between frontend body-region definitions and backend allowed regions, limited validation for pain entry fields, no structured red-flag/safety guidance, and no first-class workout-planning constraint output.

This blueprint defines the next implementation target: **Equipment Scanner V2: multi-item inventory recognition** and **Pain Charts V2: safer, history-aware, workout-planning-aware pain intelligence**.

---

## Non-negotiables

1. **No private user data in vision prompts.** Only the uploaded equipment photo and non-identifying scanner instructions should be sent to the model.
2. **AI results remain review-gated.** Every detected item must be pending until a trainer/admin approves, rejects, edits, or merges it.
3. **No medical diagnosis.** Pain Charts must remain a tracking and training-modification tool, not a diagnostic tool.
4. **Staff privacy boundaries stay intact.** Clients should never receive trainer-only notes, AI generation notes, or private assessment findings.
5. **Mobile-first.** Phone camera and phone photo-library flows must remain easy, fast, and forgiving.
6. **Backward compatibility.** Existing `/api/equipment-profiles/:id/scan` consumers should not break while V2 is introduced.

---

## Current Equipment Manager: what works

- Location profiles are already part of the product mental model.
- Default profiles exist for common training environments.
- Camera and gallery inputs are separated, which is correct for mobile UX.
- Gallery uploads can queue multiple photos.
- Failed scans preserve the original photo and offer retry/manual fallback.
- AI scan results are not auto-approved.
- Exercise mappings are created as unconfirmed AI suggestions.

## Current Equipment Manager: critical gaps

### 1. The scanner is single-object by design

Current behavior asks the model to identify one item, then stores one pending equipment item. This is why a gym photo with a rack, dumbbells, bench, cables, and plates can collapse into only one result.

### 2. The parser drops multi-item arrays

If Gemini returns an array or an `items` array, the normalization helper currently selects the first object. This makes multi-item model behavior impossible to capture even when the model tries to provide it.

### 3. The frontend approval flow assumes one detected item

The scan response sets one `showApproval` item, and the approval modal is one-item-only. This prevents the ideal flow: upload one photo, review multiple detected equipment candidates, approve selected items, merge duplicates, and add missing items.

### 4. Duplicate handling is too weak

Manual adds check exact-name duplicates. AI scan results can create duplicate pending items because there is no canonical equipment key, alias matching, quantity merge, or profile-level duplicate suggestion.

### 5. Rate limiting is in-memory

The current in-memory scan limit is good for local/dev, but it will reset on deploys and will not coordinate across multiple Node processes or instances.

### 6. Scanner confidence is underused

Confidence exists, but there is no confidence-driven UX: green/yellow/red review bands, possible-item staging, duplicate warnings, or batch approval gates.

---

## Equipment Scanner V2 target behavior

### Product behavior

A trainer/admin should be able to upload a photo from a phone or computer and get a useful inventory pass from one image.

Example image: a gym corner with a dumbbell rack, bench, cable stack, kettlebells, plates, and bands.

Expected result:

- Detect each clearly visible piece of workout equipment.
- Return up to 12 candidates per image.
- Show confidence, category, quantity, and bounding box for each candidate.
- Let trainer approve all, approve selected, edit labels/categories, reject false positives, merge with existing items, and manually add missing items.
- Never auto-approve.

### Scanner response schema

```json
{
  "schemaVersion": "equipment_scan_v2",
  "promptVersion": "equipment-multi-inventory-v1",
  "imageQuality": "good | acceptable | poor",
  "sceneSummary": "Short neutral summary of visible training equipment.",
  "items": [
    {
      "clientTempId": "item_1",
      "suggestedName": "Dumbbell Rack",
      "category": "dumbbell",
      "equipmentKind": "free_weight_storage",
      "resistanceType": "dumbbell",
      "quantity": 1,
      "confidence": 0.88,
      "visibility": "clear | partial | inferred",
      "boundingBox": { "x": 0.12, "y": 0.35, "w": 0.42, "h": 0.28 },
      "alternateNames": ["Hex Dumbbells", "Dumbbell Storage Rack"],
      "suggestedExercises": ["Dumbbell Bench Press", "Goblet Squat", "Dumbbell Row"],
      "movementPatterns": ["push", "pull", "squat", "hinge", "carry"],
      "targetMuscles": ["chest", "back", "legs", "shoulders", "arms"],
      "safetyNotes": "Use trainer review for exact load range and quantity.",
      "dedupeKey": "dumbbell_rack",
      "needsHumanReview": true,
      "reasoning": "Visible rows of hex dumbbells on a rack."
    }
  ],
  "possibleItems": [],
  "outOfScopeObjects": []
}
```

### Confidence thresholds

- `>= 0.82`: Create a pending item with a green confidence indicator.
- `0.55 - 0.81`: Create a pending item with a yellow review indicator.
- `< 0.55`: Keep as a possible candidate unless the trainer explicitly adds it.
- Any item with `visibility: inferred` must require explicit review and cannot be included in batch approve by default.

### Gemini prompt V2

```text
You are Swan Coach Vision, an expert fitness-equipment inventory assistant for a premium personal training platform.

Goal: identify EVERY clearly visible piece of workout or gym equipment in the image, not just the primary object.

Return ONLY valid JSON matching this schema:
{
  "schemaVersion": "equipment_scan_v2",
  "promptVersion": "equipment-multi-inventory-v1",
  "imageQuality": "good | acceptable | poor",
  "sceneSummary": "short neutral scene summary",
  "items": [
    {
      "suggestedName": "specific generic equipment name",
      "category": "one of: barbell, dumbbell, kettlebell, cable_machine, resistance_band, bodyweight, machine, bench, rack, cardio, foam_roller, stability_ball, medicine_ball, pull_up_bar, trx, other",
      "equipmentKind": "more specific subtype, e.g. squat_rack, adjustable_bench, smith_machine, treadmill, dumbbell_rack",
      "resistanceType": "one of: bodyweight, dumbbell, barbell, cable, band, machine, kettlebell, other",
      "quantity": 1,
      "confidence": 0.0,
      "visibility": "clear | partial | inferred",
      "boundingBox": { "x": 0.0, "y": 0.0, "w": 0.0, "h": 0.0 },
      "alternateNames": [],
      "suggestedExercises": [],
      "movementPatterns": [],
      "targetMuscles": [],
      "safetyNotes": "short non-medical usage/safety note",
      "dedupeKey": "normalized_snake_case_name",
      "needsHumanReview": true,
      "reasoning": "short visual evidence"
    }
  ],
  "possibleItems": [],
  "outOfScopeObjects": []
}

Rules:
- Detect up to 12 visible equipment items.
- Include dumbbells, racks, benches, barbells, plates, kettlebells, cable machines, cardio machines, bands, mats, boxes, medicine balls, stability balls, TRX/suspension trainers, pull-up bars, sleds, battle ropes, and common selectorized machines.
- Do not identify people, logos, brands, clothing, mirrors, walls, lights, or non-training furniture as equipment.
- If multiple dumbbells are on one rack, return one item named "Dumbbell Rack" and set quantity to 1 unless individual dumbbell pairs are clearly countable and useful to inventory.
- If a bench is visible in front of a rack, return both "Weight Bench" and the rack/cage if each is clearly visible.
- If uncertain between two equipment types, choose the best generic label and include alternatives.
- Use "possibleItems" for uncertain or partially obscured objects below 0.55 confidence.
- Use "items": [] only when no workout equipment is visible.
```

---

## Equipment backend implementation plan

### Service changes

Add new helpers without deleting V1 behavior:

- `buildEquipmentScanPromptV2()`
- `parseEquipmentScanResponseV2(rawText)`
- `normalizeRawScanItems(raw)`
- `scanEquipmentImageMulti(imageBuffer, mimeType, context)`
- `buildEquipmentDedupeKey(candidate)`
- `matchExistingEquipment(candidate, existingItems)`

The current `scanEquipmentImage()` can become a V1 wrapper around the V2 result by returning the highest-confidence item. The route can expose both legacy and V2 output.

### Route response

Keep legacy shape:

```json
{
  "success": true,
  "item": { "id": 123 },
  "scanResult": { "suggestedName": "Dumbbell Rack" }
}
```

Add V2 shape:

```json
{
  "success": true,
  "scanSession": { "id": 77, "itemCount": 5, "photoUrl": "..." },
  "items": [{ "id": 123 }, { "id": 124 }],
  "candidates": [],
  "item": { "id": 123 },
  "scanResult": { "suggestedName": "Dumbbell Rack" }
}
```

This lets the old frontend continue working while the new frontend can use `items` and `scanSession`.

### Data model upgrade

Recommended new table: `EquipmentScanSession`

- `id`
- `profileId`
- `trainerId`
- `sourcePhotoUrl`
- `originalFilename`
- `imageHash`
- `model`
- `promptVersion`
- `schemaVersion`
- `imageQuality`
- `sceneSummary`
- `itemCount`
- `candidateCount`
- `acceptedCount`
- `rejectedCount`
- `latencyMs`
- `createdAt`
- `updatedAt`

Recommended new table: `EquipmentScanCandidate`

- `id`
- `scanSessionId`
- `equipmentItemId` nullable
- `candidateIndex`
- `suggestedName`
- `category`
- `equipmentKind`
- `resistanceType`
- `quantity`
- `confidence`
- `visibility`
- `boundingBox`
- `alternateNames`
- `suggestedExercises`
- `movementPatterns`
- `targetMuscles`
- `dedupeKey`
- `duplicateOfItemId` nullable
- `status`: `pending | approved | rejected | merged | possible`
- `rawCandidate`
- `trainerCorrections`
- `reviewedById`
- `reviewedAt`

Minimal migration option: store `scanSessionId`, `scanItemIndex`, `equipmentKind`, and `visibility` on `EquipmentItem`, and keep rich V2 candidate data inside `aiScanData`. This is faster but weaker for analytics.

### Deduping behavior

Before creating a new pending item, compare candidate against active items in the same profile.

- Exact canonical match: suggest merge/increment quantity.
- Alias match + category match: suggest merge.
- High similarity but different category: require review.
- Low confidence duplicate: do not auto-create; create possible candidate.

### Rate limiting

Replace in-memory `scanRateMap` with Postgres or Redis-backed counters:

- key: `equipment_scan:{trainerId}:{yyyy-mm-dd-hh}`
- limit by role and environment.
- store `remainingScans` and `resetAt` in error responses.

---

## Equipment frontend implementation plan

### New scan review tray

Replace the one-item approval modal with a batch review tray.

Core layout:

1. Top: source image preview with optional bounding boxes.
2. Middle: detected item cards.
3. Bottom action bar: `Approve selected`, `Reject selected`, `Review later`, `Add missing item`.

Each candidate card should include:

- checkbox
- editable equipment name
- category select
- resistance type select
- quantity input
- confidence badge
- duplicate/merge warning if detected
- suggested exercise chips
- bounding-box focus button

### Mobile UX

- Keep one primary button: `Swan Coach Scan`.
- On mobile, show camera first and `Photo Library` second.
- Batch review should be a bottom sheet with sticky action bar.
- Every control must stay at least 44px tall.
- Trainers should be able to approve all obvious items in two taps.

### Empty-state upgrade

Current empty-state copy should become operational:

- "Take a wide photo of the gym corner or upload several close-ups. Swan Coach will list equipment it can clearly see. You will review before anything is added."

### Accuracy feedback loop

When a trainer edits name/category/resistance type, record the correction in `EquipmentScanCandidate.trainerCorrections`. This data becomes the training signal for future prompt/taxonomy improvements.

---

## Current Pain Charts: what works

- BodyMap supports trainer/admin mode and client mode.
- Staff can target a selected client through global client context.
- Clients can self-report only for their own data.
- Client-facing responses strip trainer-only fields.
- The form captures useful programming inputs: pain level, type, side, description, onset, aggravating movements, relieving factors, trainer notes, AI notes, and postural syndrome.

## Current Pain Charts: critical gaps

1. The main page fetches only active entries, so resolved history and trends are hidden.
2. Frontend and backend body-region definitions can drift because backend uses a hard-coded allowed-region set.
3. Backend validation is too thin for side, pain type, postural syndrome, date format, and text lengths.
4. Client route permissions allow clients to resolve own entries, but the UI hides resolve in client mode.
5. There is no red-flag safety prompt for severe, numbness, tingling, trauma, progressive symptoms, or pain outside normal training discomfort.
6. There is no structured workout-planning output such as avoid movements, modify movements, warm-up priorities, and caution regions.
7. The UX is active-entry focused, not timeline/history focused.

---

## Pain Charts V2 target behavior

### Product behavior

Pain Charts should help trainers make safer programming decisions without pretending to diagnose. It should answer:

- What hurts right now?
- How severe is it?
- What movements aggravate it?
- What movements help?
- Is it improving, stable, or getting worse?
- What should Swan Coach avoid, modify, or warm up around when generating workouts?

### UX additions

- Client selector / selected-client header when used from Admin.
- Active / Resolved / Timeline tabs.
- Severity trend sparkline by body region.
- "Needs trainer review" badge for high-risk reports.
- Follow-up reminders: `check again next session`, `review before workout generation`.
- Client-safe resolution flow: "Mark as feeling better" -> trainer/admin review, or update backend to explicitly disallow client resolve.

### Safety copy

For severe pain, numbness, tingling, recent trauma, progressive symptoms, or symptoms outside ordinary workout soreness, show a calm non-diagnostic message:

> This may need professional review before training is progressed. SwanStudios can track it and modify workouts, but this is not a medical diagnosis.

### Structured workout constraint object

Generate and store a trainer-reviewable object:

```json
{
  "riskBand": "mild | moderate | high",
  "avoidMovements": ["overhead pressing"],
  "modifyMovements": ["push-ups", "bench press"],
  "warmupPriorities": ["thoracic mobility", "scapular control"],
  "cautionRegions": ["right_shoulder"],
  "swanCoachPromptSnippet": "Client reports right shoulder pain 7/10 aggravated by overhead pressing. Avoid overhead pressing today; use pain-free horizontal push alternatives and add thoracic/scapular prep. Not a diagnosis."
}
```

This should be generated from structured fields and trainer reviewed before being injected into workout generation.

### Data model additions

Add to pain entries or a companion table:

- `riskBand`
- `requiresTrainerReview`
- `followUpAt`
- `lastCheckedAt`
- `resolvedById`
- `resolutionNote`
- `workoutConstraintJson`
- `redFlagAcknowledgedAt`
- `trainerReviewedAt`

### Backend validation upgrades

- Validate `side` against `left | right | center | bilateral`.
- Validate `painType` against the shared pain-type enum.
- Validate `posturalSyndrome` against `upper_crossed | lower_crossed | none`.
- Validate ISO date for `onsetDate`.
- Cap text lengths and strip unsafe control characters.
- Centralize body-region constants in a shared JSON/module used by both frontend and backend.

---

## Implementation order

### Phase 1 — Equipment scanner backend V2

1. Add V2 prompt, parser, normalizer, and tests.
2. Add scan-session/candidate persistence or minimal V2 fields.
3. Update scan route to create multiple pending items while preserving legacy `item` and `scanResult` response.
4. Add dedupe suggestions.
5. Move scan rate limit to DB/Redis.

### Phase 2 — Equipment scanner frontend V2

1. Add `scanEquipmentV2` response typing.
2. Replace one-item approval modal with batch review tray.
3. Add bounding-box overlay and candidate focus.
4. Add approve selected / reject selected / merge duplicate / add missing item actions.
5. Add scanner accuracy feedback capture.

### Phase 3 — Pain Charts V2

1. Add active/resolved/timeline UX.
2. Fix client resolve mismatch.
3. Add shared constants and backend validation.
4. Add safety/red-flag guidance and trainer review badges.
5. Add workout constraint generator and planner integration.

### Phase 4 — QA + production hardening

1. Add API tests for scanner multi-detection and pain-entry validation.
2. Add frontend tests for camera/gallery upload, multi-candidate review, client privacy, and pain chart mode behavior.
3. Add admin metrics: scan success rate, avg items per scan, edit rate, false-positive rate, rejected candidates, and top corrected labels.

---

## Acceptance criteria

### Equipment Scanner V2

- Uploading one image with dumbbell rack, bench, cable machine, kettlebell, and plates returns multiple candidates.
- The scanner no longer chooses only the largest/primary equipment by design.
- Existing single-item frontend consumers continue to work.
- Trainer can approve selected candidates and reject false positives.
- Low-confidence objects are clearly marked and not batch-approved by default.
- Duplicate items are surfaced as merge/increment suggestions.
- Camera capture on phone and gallery upload from phone/computer both still work.
- No private user data is sent to Gemini.

### Pain Charts V2

- Admin/trainer can select a client and see active + resolved pain history.
- Client can self-report pain without seeing trainer-only fields.
- Severe/numbness/tingling/progressive symptoms show calm non-diagnostic safety guidance.
- Pain entries generate trainer-reviewable workout constraints.
- Body-region validation cannot drift between frontend and backend.
- Client resolve behavior is consistent between frontend and backend.

---

## Recommended first code pass

Build the scanner in this order:

1. `equipmentScanSupport.mjs`: add V2 prompt/parser/normalizer without deleting V1 exports.
2. `equipmentScanService.mjs`: add `scanEquipmentImageMulti()` and make `scanEquipmentImage()` call it and return the best single item for legacy behavior.
3. `equipmentRoutes.mjs`: create pending items for each approved-confidence candidate, return both legacy `item` and new `items` array.
4. `useEquipmentAPI.ts`: add optional `items`, `scanSession`, and candidate types.
5. `EquipmentManagerPage.tsx`: display batch review tray when `items.length > 1`.

Build Pain Charts second:

1. Centralize body-region constants.
2. Add `getAll()` timeline toggle to BodyMap.
3. Add validation enums to backend controller.
4. Add client-safe resolve or backend permission cleanup.
5. Add workout constraint generation and trainer review gate.
