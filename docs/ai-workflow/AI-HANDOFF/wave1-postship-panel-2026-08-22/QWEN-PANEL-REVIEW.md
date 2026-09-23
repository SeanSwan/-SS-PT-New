# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/WAVE1-SHIPPED-AUDIT-PACKET-2026-08-22.md
**Tokens (Ollama):** 37244 in / 1295 out | **Wall:** 165.3s | **done_reason:** stop

---
## VERDICT
REVISE — The shipped diff contains a live authorization bypass in the `create` scope that allows relationship-lane users to inject arbitrary strangers into new threads, and a data-leak in the de-identification layer where `health.conditions` is forwarded despite being explicitly listed as withheld in the consent copy.

## BLOCKERS
1. **P0 — `create` scope bypass via `adminIds`**: `requireMessagingAccess.mjs:142-150` (create scope) validates `req.body.participantIds` but **does not** validate `req.body.adminIds`. The `assertRequestedParticipantsAllowed` helper (line 82-92) correctly checks both, but the `create` scope path (line 142-150) manually extracts only `participantIds` and never calls `assertRequestedParticipantsAllowed`. A relationship-lane client can create a thread with `participantIds: [trainerId]` (valid) and `adminIds: [strangerId]` (unvalidated), handing the stranger admin rights and full message history. The `conversation` scope (line 168-172) correctly calls `assertRequestedParticipantsAllowed`, but `create` does not. **Fix**: Replace the manual extraction in `create` scope with a call to `assertRequestedParticipantsAllowed(req, counterparties, actorId)`.

2. **P0 — `health.conditions` forwarded despite consent copy claiming it is withheld**: `deIdentificationService.mjs:366-372` gates keys matching `/(sleep|stress|supplement)/i` but **not** `conditions`. The consent copy (`aiConsentCopy.ts:118-122`) explicitly states "medical conditions that affect exercise" are shared, but the `AI_CONSENT_PROTECTIONS` bullet "Removed before sending" (line 108-112) lists "supplements, sleep and stress data" as withheld — it does **not** list conditions. However, the `AiConsentScreen.tsx:691` inline bullet says "Medications, surgeries, occupation, date of birth, insurance details, supplements, sleep, and stress data are never sent" — conditions are **not** in this list, so they are implicitly forwarded. The `TRAINING_SAFETY_PATHS` (line 75-88) explicitly protects `health.conditions` and `health.medicalConditions`, so they are **forwarded**. This is correct per owner ruling, but the consent copy in `aiConsentCopy.ts:118-122` says "medical conditions that affect exercise" are shared, which is accurate. **No defect here** — I retract this. The copy and code agree.

3. **P1 — `lifestyle.sleepHours` still forwarded in some paths**: `deIdentificationService.mjs:366-372` gates keys matching `/(sleep|stress|supplement)/i`. The key `sleepHours` contains "sleep", so it **is** gated. The test `aiPrivacy.test.mjs:240-242` asserts `sleepHours` is `undefined`. **No defect here** — I retract this.

4. **P1 — `stripGatedHealthFields` does not recurse into arrays**: `deIdentificationService.mjs:280-295` iterates `Object.keys(node)` and recurses into objects, but **not** into arrays. If a gated field is nested inside an array (e.g., `health.notes: ["I have high stress"]`), the key `notes` does not match the pattern, so the array is not recursed into, and the string value containing "stress" is forwarded. The `scanAndRedactPII` (line 369) redacts email/phone patterns but **not** arbitrary sensitive keywords. **Fix**: Recurse into arrays in `stripGatedHealthFields`, or add a value-level scan for gated keywords.

## ATTACKS
- **Correctness**: The `create` scope bypass (Blocker 1) is a happy-path-only logic error — the code assumes `participantIds` is the only vector for adding users, but `adminIds` is a second vector that is not validated. The `stripGatedHealthFields` array non-recursion (Blocker 4) is a null/undefined/type mismatch — it assumes all nested data is in objects, not arrays.
- **Security**: The `create` scope bypass is an IDOR/authorization failure — a client can add a stranger to a thread they do not have a relationship with. The array non-recursion is a data-leak — sensitive data in array values is forwarded to the LLM provider.
- **Data-truth / schema drift**: None found. The `conversation_participants` table is correctly queried with snake_case columns. The `client_trainer_assignments` table is correctly queried with quoted camelCase columns.

## HIGHEST RISK
The `create` scope bypass (Blocker 1) is the most dangerous item because it allows a live paying client to inject an arbitrary stranger into a new thread, exposing message history and granting admin rights. The cheapest concrete way to de-risk it before ship is to replace the manual `participantIds` extraction in the `create` scope (line 142-150) with a call to `assertRequestedParticipantsAllowed(req, counterparties, actorId)`, which already correctly validates both `participantIds` and `adminIds`.

## CONFIDENCE
I could not verify whether `adminIds` is actually used in the `create` path by the controller (`createConversation`). The diff shows the middleware does not validate it, but I did not see the controller code to confirm it writes `adminIds` to the database. I also could not verify whether `health.notes` or similar free-text fields are actually populated in production, so the array non-recursion (Blocker 4) may be theoretical. Evidence that would settle it: the `createConversation` controller code and a sample production payload showing whether gated keywords appear in array values.
