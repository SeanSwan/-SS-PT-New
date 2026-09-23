# Packet — Hostile Review of GPT-5.6's Counter-Review of the SwanStudios Master Prompt

> **Date:** 2026-08-12 · **Repo truth:** `origin/main` (verifications below run fresh today)
> **You are reviewing a REVIEW.** Attack it. Do not defer to it. Do not defer to the document it attacked either.

## 0. YOUR JOB

A four-round review chain produced a builder-facing master prompt for SwanStudios (production PT SaaS: React 18/TS/styled-components + Node/Express/Sequelize/PostgreSQL on Render; roles admin/trainer/client; dictation-first Swan Coach vision; every AI write behind an explicit Apply). An external GPT-5.6 reviewer then returned the counter-review in §2 with verdict "SEND BACK WITH MAJOR CORRECTIONS."

Deliver, in order:
1. `## VERDICT` — is GPT's counter-review substantially correct? Which of its 10 corrections do you ACCEPT / MODIFY / REJECT? One line each, severity-tagged.
2. `## WHERE GPT IS WRONG OR OVERREACHING` — numbered, concrete. GPT made confident claims too; find the ones that are unsupported, overscoped, or would slow the owner's dictation-first goal without adding safety.
3. `## WHAT EVERYONE STILL MISSED` — the whole chain: original panel, the hostile verifier, Kimi's meta-review, GPT. What is still unexamined? (Prior misses found late: onboarding→generation link broken by field-name mismatches; a service-abstraction hiding questionnaire persistence; prompt-injection via free-text intake.)
4. `## FINAL BUILD-ORDER RULING` — given ALL corrections, the first 5 concrete work items you would hand a builder, each with a one-line acceptance proof. The owner's stated top priority is dictation-first workout logging + onboarding; the deployment reality is UNKNOWN (see V3).
Rules: never invent file paths/line numbers — cite only from §1 evidence or say [INFERENCE]; no new runtime dependencies; no Next.js; do not soften.

## 1. FRESH VERIFICATION EVIDENCE (run today against origin/main — treat as ground truth)

All of GPT's load-bearing factual claims were checked by the receiving agent before this packet was written. Results:

| # | GPT claim | Verdict | Evidence |
|---|---|---|---|
| V1 | The prior reviewer's F14 ("staff /api/onboarding writes masterPromptJson but no questionnaire row") is FALSE — a service abstraction persists the questionnaire | **GPT CORRECT** | `onboardingController.mjs:139` and `:206` call `persistCompletedOnboardingQuestionnaire`; helper at `backend/services/onboardingCompletionPersistenceService.mjs:38` does `findOne({where:{userId}, order createdAt DESC})` → `existing.update(...)` else `.create(...)`. The prior verifier grepped for the literal string `ClientOnboardingQuestionnaire.create` and concluded absence — a false-absence from string-matching instead of call-graph tracing. |
| V2 | The helper is non-transactional and race-prone | **GPT CORRECT** | Helper takes no transaction param; no unique constraint on `userId` (normal index only per model/migration); concurrent submits can create duplicate "current" rows. |
| V3 | "Single instance / no Redis" cannot be asserted from the repo | **GPT CORRECT** | `render.yaml:9-11`: "This file is currently INERT: no Render service is managed by it… It reads as authoritative and is not. Verify against the live dashboard." Redis service refs exist at `:107-112` alongside the warning. Instance count is unknowable from repo. |
| V4 | A durable encrypted action system already exists; a new `pending_action` table would duplicate it | **GPT CORRECT** | `backend/services/ai/coachActionProposalService.mjs`: header "Converts model-emitted action blocks into encrypted approval proposals. The model prepares drafts; deterministic services own final writes"; statuses PENDING/APPLYING/APPROVED/APPLIED/REJECTED/FAILED (`:20-27`); 9 proposal types incl. workout_log, nutrition_log, plan_edit (`:29-39`); `encryptPayload` (`:11,197`); review tokens (`coachActionProposalApprovalService.mjs:69,83`); atomic claim `claimPendingProposal` = conditional `UPDATE coach_action_proposals SET status='APPLYING' WHERE id=… AND status='PENDING' RETURNING id` (`coachActionProposalPersistenceService.mjs:41-60`); `applied_result_json` stored plaintext in the row (`:30-33`). |
| V5 | `yes()` helper accepts only exact lowercase `'yes'` | **GPT CORRECT** | `onboardingMasterPromptBuilder.mjs:22`: `const yes = (value) => value === 'yes';` |
| V6 | Two master-prompt schema versions coexist | **GPT CORRECT** | `onboardingMasterPromptBuilder.mjs:206` stamps `version: '3.0'`; `masterPromptBuilder.mjs:241` stamps `version: '5.0'`. |
| V7 | Only four specialized GitHub workflows; no full-app release gate | **GPT CORRECT** | `.github/workflows/`: ai-eval-gate, bodymap-validation, docs-check, swan-lens-guards. Nothing builds both apps / migrates clean DB / boots / smoke-tests roles / replays Stripe. |

Also previously verified and NOT in dispute: admin wizard sends firstName/lastName vs backend `fullName` guard (400 before any persistence); wizard field `injuries` vs transform key `pastInjuries` (+ `doctorClearance` vs `doctorCleared`) drops onboarding safety data from the AI context; the workout-generation controller separately loads pain entries, waiver records, movement analyses (so "AI never sees injuries" was an overstatement — the onboarding CONTRACT is broken, other safety sources exist); de-identification is a denylist that removes direct identifiers while intentionally preserving injuries/pain/health training context; voice workout submission acks success before the un-awaited save; client Coach terminal hardcodes a context clients are forbidden to use (deterministic 403, defaultOpen); trainer block-time endpoint takes trainerId from the body on the live router while the guarded copy sits on a shadowed dead router; confirmation Map is in-process with an unset-in-prod signing key.

## 2. THE DOCUMENT UNDER REVIEW — GPT-5.6's counter-review, verbatim

VERDICT: "SEND BACK WITH MAJOR CORRECTIONS. Do not hand the master prompt to a builder unchanged."

Its 10 corrections, condensed faithfully:

C1 — F14 is factually wrong (see V1/V2). Real staff-path finding: blocking fullName contract mismatch; after that's fixed, both artifacts persist, but persistence is non-atomic and the questionnaire upsert races (no unique userId constraint). Replace F14 with that.

C2 — Do NOT create a new `pending_action` table. The repo already has coach_action_proposals + coach_intake_items + coach_intake_events (encrypted payloads, lifecycle statuses, review tokens, atomic claim, applied results, event trail). Right architecture: gap-analysis first, then EXTEND/generalize the proposal system (add action family, entity id+version, expiry, idempotency key, verification status/evidence, retention) and migrate the legacy in-memory pendingOps into it. A second action table = two state machines, two approval systems, two receipt systems, ambiguity over which is authoritative.

C3 — Remove the "single Render instance, no Redis" hard constraint (see V3). Correct standard: PostgreSQL transactions, unique constraints, conditional updates, idempotency — safe on one OR multiple instances; don't require Redis, don't assume its absence.

C4 — The privacy rule "Zero PII to LLMs; client IDs and roles only" contradicts the personalization requirement (goals, injuries, pain, history MUST reach the model). Correct rule: no direct identifiers; minimum-necessary consented de-identified training/safety context via an explicit ALLOWLISTED provider payload; provider retention documentation; audio/transcript boundary (text redaction after cloud STT does not protect audio already sent); salted/ephemeral aliases; explicit consent for health-sensitive context; auditable outbound-field list.

C5 — Injury finding is real but overstated ("the AI never sees injuries" — other safety sources exist: pain entries, waivers, movement analyses). AND underspecified: renaming fields is not enough. Free-text `medicalConditions/medications/injuries/bloodPressure/doctorClearance`; `yes()` rejects "Yes"; wizard collects dateOfBirth while v3 builder reads age. Fix = one shared structured intake schema (PAR-Q style: booleans+unknown, InjuryIntake[], MovementLimitation[], clearance enum) consumed by form, validation, persistence, Coach extraction, and generation.

C6 — Root cause is schema fragmentation: v3.0 transform vs v5.0 fallback builder with different shapes (client vs clientProfile, training vs fitnessBackground, health.injuries vs painAndInjuries). Promote to first-class migration: one canonical versioned ClientTrainingContext with validators, adapters, provenance, backfill.

C7 — Prompt-injection boundary missed by the whole chain: free-text intake reaches model context; de-identification ≠ instruction sanitization. Require structured fields, untrusted-data delimiters, client-text-is-evidence-never-instruction, injection tests, deterministic safety filters independent of model output.

C8 — Release verification cannot be the final slice (see V7). First implementation work = full release gate: frozen deps, build+typecheck both apps, clean-DB migration, backend boot, role smoke tests, characterization tests (onboarding contract, workout save/replay, schedule authz, Stripe signed-event replay), one required commit status.

C9 — The master prompt grants one agent too much authority (verify+decide+implement+migrate+commit+push+deploy+certify, "no clarifying questions") while containing unresolved OWNER decisions (UserDashboardV3 fate, canonical workout route, deterministic-builder-consumes-onboarding?, backfill?, Stripe URL set, instance count). Split: (A) read-only verification charter → findings, failing characterization tests, proposed architecture, owner decision list; (B) separately-approved PR-sized implementation slices with rollback, no production push without approval.

C10 — Misc: Apply gates should follow the ACTION (any AI-originated mutation, voice OR typed), not the input method. Don't permanently forbid webhook consolidation — inventory event types, add idempotency+coverage tests, then a proven canonical dispatcher may be safer than five raw-body paths. sessionStorage is not an offline strategy (plaintext, dies with tab; use server-synced drafts online + minimized encrypted IndexedDB offline + purge on logout/account-switch/role-switch + visible conflict reconciliation). The proposal table's `applied_result_json` is plaintext JSON that may carry health data — define retention/minimization before making it the universal receipt store. Severity recalibration: P0 = currently exploitable authz / unsafe generation / payment loss / active privacy breach; P1 = broken core workflow, false save receipt, non-durable confirmation; P2 = orphans, messaging, cleanup. Corrected build order: Stage 0 production-truth verification (live Render services, instance count, Stripe endpoint set) + release gate + characterization tests → Stage 1 small defects (fullName, client Coach context, await-before-success, block-time ownership, role-aware route, cart preflight, signing key) → Stage 2 canonical onboarding schema + injection controls → Stage 3 truthful workout persistence + idempotency + conflict handling → Stage 4 unify action system on coach_action_proposals → Stage 5 dictation (voice-to-draft first) + one runtime across shells → Stage 6 program/schedule/store/payments certification.

## 3. KNOWN WEAKNESSES TO PROBE (do not limit yourself to these)

- GPT demands "verify actual Render services, instance count, Stripe dashboard endpoints" as Stage 0 — those require OWNER dashboard access, not agent repo access. Is gating all P0 hotfixes (an exploitable authorization defect!) behind owner ops-verification and a full CI build defensible? What is the minimal Stage 0 that doesn't leave a known-exploitable endpoint live for weeks?
- GPT's C2 extension sketch: coach_action_proposals scopes claim/approval to `created_by_user_id` (creator approves own proposal). An app-wide action system needs an authorization model for who may approve what, per role — GPT never addresses it. Real gap?
- GPT's "encrypted IndexedDB offline" — client-side encryption with a client-held key: what does it actually defend against, and is the complexity worth it versus minimization + short retention?
- GPT positions its C8 release gate as Stage 0 AND its C9 charter as read-only — but building characterization tests and CI is itself implementation work. Internal tension?
- Is GPT's severity scale right that a false save receipt (trainer believes a workout saved when it didn't) is P1 not P0 for a coaching product whose core loop is the workout record?
- Everyone (GPT included) keeps reasoning statically. What SHOULD be executed, and in what environment, before any of this is trusted?
