# SwanStudios Local-Qwen to External-Kimi Privacy Routing Proposal

**Status:** architecture proposal for hostile review; no implementation authorization
**Scope:** model routing for workout planning, pain-aware recommendations, and optional media-derived observations
**Privacy boundary:** this packet contains no client record, media, credential, stable identifier, or real health fact

## Decision being considered

Use local Qwen for private extraction, summarization, and routine workout decisions. Escalate only difficult anonymous training cases to Kimi K3. Swan's deterministic privacy gateway, Hive Brain rules, output validators, and trainer approval remain authoritative.

This is explicitly Swan Studios Hive Brain architecture. It must not route through Psi Brain.

## Proposed flow

1. Read private Swan client/workout/pain/media data inside the trusted environment.
2. Build a new object from a deterministic field allowlist. Do not clone the source object and delete known identifiers.
3. Optionally let local Qwen convert allowlisted facts into a structured anonymous training case.
4. Run a second deterministic outbound privacy and prompt-injection scan.
5. Send only the anonymous case to Kimi when a deterministic escalation policy says the case is complex enough.
6. Validate Kimi's structured output against Swan Hive Brain NASM constraints, allowed exercise IDs, pain rules, and output schema.
7. Require trainer approval for pain-sensitive programming and material plan changes.
8. If local Qwen is unavailable, never bypass the privacy gateway. Deterministically construct the safe case, queue the request, or use a local fallback.

## Example external case

```json
{
  "caseToken": "single-use-random-token",
  "goal": "hypertrophy",
  "nasmPhase": "strength_endurance",
  "experience": "intermediate",
  "sessionsPerWeek": 4,
  "recentAdherencePercent": 78,
  "performanceTrends": [
    {
      "exerciseId": "canonical-exercise-id",
      "loadTrend": "plateau",
      "repsInReserve": "1-2"
    }
  ],
  "constraints": [
    {
      "bodyRegion": "right_knee",
      "severity": 4,
      "aggravatingPatterns": ["deep_knee_flexion"],
      "durationBucket": "2_to_4_weeks"
    }
  ],
  "availableEquipment": ["dumbbells", "cable", "bench"],
  "allowedExerciseIds": ["canonical-id-a", "canonical-id-b"],
  "requiredOutputSchema": "swan_workout_recommendation_v1"
}
```

The values above are fabricated examples, not client data.

## Never send externally

- Database user/client IDs or stable pseudonyms.
- Names, email, phone, date of birth, address, account identifiers, or precise location.
- Exact workout or appointment timestamps when relative buckets suffice.
- Raw intake answers, trainer notes, chat transcripts, or other free text.
- Rare occupation, location, condition, or demographic combinations that increase singling-out risk.
- Raw pictures, videos, audio, faces, tattoos, voices, backgrounds, filenames, URLs, EXIF, or storage keys.
- Client-authored instructions that could become prompt injection.
- Secrets, credentials, auth headers, internal infrastructure identifiers, or signed asset URLs.

## Pain image/video rule

Raw pain media remains inside the trusted environment. A local vision-capable model may emit only bounded observations such as body region, movement pattern, visible asymmetry, uncertainty, and confidence. Those observations must be schema-validated, privacy-scanned, treated as non-diagnostic, and subject to trainer review. If the local model cannot safely process the media, the external Kimi route is not a fallback for the raw asset.

## Current repository claims to challenge

- `backend/controllers/aiWorkoutController.mjs` already invokes de-identification before an AI call and resolves NASM constraints separately.
- `backend/services/deIdentificationService.mjs` removes known fields and scans text, but its current copy-then-remove shape is closer to blacklist de-identification than a strict outbound allowlist.
- Swan's zero-PII-to-LLMs rule remains binding even when a provider advertises no training on API data or zero-data-retention routing.
- De-identification is not equivalent to replacing a name with `Client-47`; stable IDs, exact dates, media, and unusual fact combinations can permit re-identification.

## Required architectural controls

- Versioned allowlist schema and data-flow contract.
- One-time, non-linkable case tokens with short expiry and no cross-request reuse.
- Field-level provenance so outputs can be traced to allowed facts without retaining external prompt bodies.
- K-anonymity or minimum-cohort/generalization rules for rare categorical combinations where applicable.
- Deterministic prompt-injection neutralization for any client-authored source.
- Egress logs containing metadata and policy result only, never prompt bodies or client facts.
- Provider allowlist, contractual/privacy review, region/retention controls, timeout, circuit breaker, and kill switch.
- Strict structured output schema, exercise-ID allowlist, NASM/pain policy validator, and fail-closed rejection.
- Evaluation set covering privacy leakage, re-identification, unsafe programming, hallucinated facts, adversarial notes, and local-model outage.
- Clear routing rubric defining routine-local versus external-escalation cases.

## Questions for Opus first, then Kimi

1. Is this architecture defensible under Swan's zero-PII rule, and what claims are too strong?
2. What re-identification channels remain even after the proposed allowlist?
3. Should local Qwen be permitted to summarize before the deterministic gateway, after it, or both?
4. What minimum information does Kimi actually need to outperform a capable local model on difficult workout decisions?
5. Which cases must never use an external model, even after de-identification?
6. How should pain-aware and media-derived observations be governed without implying diagnosis?
7. What outage, latency, provider, logging, and horizontal-scaling failures are missing?
8. What tests and launch gates are required before one real client case can traverse this route?
9. Is Kimi materially better than local Qwen for this task after context minimization, or does the external route add more risk than value?
10. Provide a revised architecture and an explicit SHIP, REVISE, or REJECT verdict.