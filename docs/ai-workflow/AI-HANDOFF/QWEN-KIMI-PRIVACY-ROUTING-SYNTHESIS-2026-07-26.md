# Qwen -> Kimi Privacy Routing: Opus-First Review Synthesis

**Date:** 2026-07-26  
**Status:** REVIEW COMPLETE — EXTERNAL CLIENT-DATA ROUTE NOT APPROVED  
**Decision owner:** Sean / SwanStudios  
**Safety owner:** Swan Studios Hive Brain (not Psi Brain)  
**Frozen packet SHA-256:** `6cdbbc7ad1766c249d12306096848c473af2f8fce9861e0c04587afac0b05f45`

## Plain-English Decision

Build the local privacy foundation, but do not connect real client cases to Kimi yet.

The useful architecture is:

1. Swan constructs a new case from an explicit field allowlist.
2. Local Qwen can summarize or classify that bounded case, but it is not the privacy authority.
3. A second deterministic scanner validates the outbound case and fails closed.
4. Swan's Hive Brain applies NASM rules, exercise permissions, pain red flags, and output validation.
5. A trainer approves pain-sensitive or materially changed programming.
6. Kimi remains disabled for real client cases until a blinded evaluation and privacy/legal gates prove a material benefit over local Qwen with full private context.

Raw pain photos, video, audio, filenames, URLs, storage keys, and metadata must never be sent to Kimi. Local vision may produce bounded observations, but those observations still pass through the deterministic gateway and Hive Brain.

## Review Chain Integrity

| Stage | Model | Input | Output | Completion evidence |
|---|---|---|---|---|
| Opus first pass | `anthropic/claude-opus-5` | Frozen review packet | `OPUS-QWEN-KIMI-PRIVACY-REVIEW-COMPLETE-2026-07-26.md` | 2,578 input / 15,969 output tokens; clean ending; below 40,000 ceiling |
| Kimi second pass | `moonshotai/kimi-k3` | Same frozen packet plus complete Opus review | `KIMI-QWEN-PRIVACY-SECOND-PASS-COMPLETE-2026-07-26.md` | 6,552 input / 8,841 output tokens; clean ending; below 40,000 one-run ceiling |

Approximate review cost: Opus `$0.4121`; Kimi `$0.1523`; total `$0.5644`.

The earlier 16,000-token Opus artifact is superseded. The runner now defaults standalone Opus deep reviews to 40,000 tokens and rejects outputs whose provider reports a length stop or whose completion reaches the configured ceiling.

## Repository-Grounded Findings

### 1. Current de-identification is blacklist-oriented, not constructive allowlisting

- `backend/services/deIdentificationService.mjs:64-81` declares `SAFE_FIELD_PATHS`, but the function does not build a new object from that list.
- `backend/services/deIdentificationService.mjs:167-168` deep-clones the entire source payload.
- `backend/services/deIdentificationService.mjs:214-230` deletes known direct identifiers and pattern-redacts strings.
- `backend/services/deIdentificationService.mjs:243-260` returns the remaining cloned object when any recognized training context exists.

Therefore, newly added or unexpected fields can survive unless they match a deletion path or a narrow email/phone/SSN pattern. The current `SAFE_FIELD_PATHS` constant is documentation, not enforcement.

### 2. A stable client identifier is currently put into the supposedly anonymous label

- `backend/controllers/aiWorkoutController.mjs:432-434` passes the database user ID to `deIdentify`.
- `backend/services/deIdentificationService.mjs:182-183` can turn that ID into `Client #<id>`.

A stable database ID is a pseudonym, not de-identification. The outbound case needs a single-use random case token that cannot be joined back by the provider.

### 3. Pain and other sensitive free text can reach external providers

- `backend/controllers/aiWorkoutController.mjs:515-531` loads active pain records.
- `backend/controllers/aiWorkoutController.mjs:563-593` loads waiver health history and raw movement-analysis objects.
- `backend/controllers/aiWorkoutController.mjs:640-654` passes those sources to the unified-context builder.
- `backend/services/ai/contextBuilder.mjs:321-369` copies pain description, aggravating movements, relieving factors, AI notes, and exact onset date into pain constraints.
- `backend/controllers/aiWorkoutController.mjs:663-686` attaches those derived contexts to `serverConstraints`.
- `backend/services/ai/promptBuilder.mjs:40-97` serializes both the de-identified payload and all server constraints into the provider prompt.

This means de-identifying only `masterPromptJson` does not prove that the complete outbound prompt is de-identified. Every supplemental context must pass the same constructive gateway.

### 4. The active route is external-provider-first and has no local Qwen/Kimi implementation

- `backend/routes/aiRoutes.mjs:15-35` registers OpenAI, Anthropic, Gemini, and Venice adapters.
- `backend/services/ai/providerRouter.mjs:61-67` defaults to `openai, anthropic, gemini, venice`.
- `backend/controllers/aiWorkoutController.mjs:714-721` sends the assembled request through that router.

No local Qwen adapter, Kimi adapter, outbound privacy gateway, or queue-on-local-unavailability behavior is implemented in this caller chain today.

### 5. Hive Brain ownership is a requirement, not yet a mechanical boundary

A runtime search across `backend`, `frontend`, and `scripts` found no `HiveBrain`/`PsiBrain` boundary in this path. The controller does derive NASM constraints before generation (`backend/controllers/aiWorkoutController.mjs:454-473`) and validates provider output afterward (`backend/controllers/aiWorkoutController.mjs:775-809`), but those are not an explicit Hive-only authority boundary.

Implementation must create a named, testable Hive Brain validation contract. Psi Brain must have no import, adapter registration, route, or fallback access to this client-training pipeline.

## Opus Verdict

**REVISE.** Opus rejected external routing as currently scoped. It supported a deterministic constructive gateway, local processing, safety triage, strict output schemas, auditability, and human approval. It found the external model's incremental benefit unproven after strong minimization and treated provider policy claims as insufficient without contracts, jurisdiction, retention, security, and incident-response evidence.

## Kimi Verdict and Corrections

**REVISE.** Kimi agreed the external route must remain dark and added three important corrections:

1. The decisive evaluation is not Kimi versus Qwen on the same minimized prompt. It is external Kimi with minimized context versus local Qwen with full private context.
2. Kimi has a conflict of interest in judging whether Kimi should be used. Provider self-assessment is inadmissible; Swan must run a blinded human evaluation.
3. If an external lane ever survives, it should be a rare, consented, batch-released second opinion—not an automatic fallback and not the routine question-answering brain.

## Four-Arm Evidence Gate

Before reconsidering any external route, run blinded cases across:

| Arm | Processing | Context |
|---|---|---|
| A | Deterministic Tier 0 rules | Structured Swan facts |
| B | Local Qwen | Full private context |
| C | Local Qwen | Minimized outbound-shaped context |
| D | External candidate | Same minimized context as C |

The shipping comparison is D versus B. D must show a pre-registered, practically meaningful improvement with no regression in contraindication handling, red-flag escalation, unsupported medical claims, NASM compliance, exercise allowlist compliance, privacy leakage, or trainer correction burden.

## Approved Build Sequence

### Phase 0 — Privacy and safety contract

- Define a versioned `swan_training_case_v1` schema using constructive field selection.
- Use single-use case tokens; exclude database IDs and stable pseudonyms.
- Reject unknown keys, unbounded strings, prompt instructions, exact dates where buckets suffice, rare quasi-identifier combinations, URLs, filenames, storage keys, and metadata.
- Define red-flag and trainer-approval rules before any model call.

### Phase 1 — Local-only path

- Add a local Qwen adapter with explicit health checks, timeout, concurrency limit, and queue behavior.
- Keep deterministic Swan rules authoritative.
- Apply the outbound privacy gateway even when the model is local so the same contract can be tested.
- If local Qwen is unavailable, queue or use deterministic Tier 0; never bypass the gateway to a cloud provider.

### Phase 2 — Pain media, local only

- Add authenticated upload controls, consent text, type/size/duration limits, malware/content validation, metadata stripping, encrypted object storage, retention/deletion controls, and access audit receipts.
- Run media analysis locally.
- Persist bounded observations and confidence, not a diagnostic claim.
- Never place raw media in an external-model prompt.

### Phase 3 — Blinded evaluation

- Build the four-arm corpus and trainer rubric.
- Include normal cases, sparse-data cases, adversarial free text, pain/red-flag cases, and rare combinations that stress re-identification risk.
- Keep model/provider identity hidden from graders.

### Phase 4 — External lane only if every gate passes

- Obtain applicable privacy/legal review and provider contract controls.
- Require explicit scoped consent, kill switch, budget cap, audit receipt, no automatic fallback, and batch release.
- Keep the lane disabled by default and limited to cases that meet a deterministic complexity trigger.

## Explicit Non-Goals

- Do not treat Qwen as the sole privacy filter.
- Do not send a renamed client ID, exact dates, raw notes, or rare combinations externally.
- Do not route raw pain media externally.
- Do not make Kimi the default site brain or an outage fallback.
- Do not let a model override Hive Brain safety rules or exercise permissions.
- Do not represent model output as diagnosis or treatment.
- Do not connect this pipeline to Psi Brain.

## Final Recommendation

Proceed with Phases 0-2 as a local-first Swan Studios Hive Brain program. Keep Kimi disabled for real client data. Reconsider a narrowly scoped external second-opinion lane only after the four-arm evaluation proves it adds enough value over local Qwen with full private context to justify the privacy, legal, operational, and safety burden.

This is an architecture and product-safety recommendation, not a legal determination. Applicable counsel and contracts remain required before regulated client data is sent to any external provider.