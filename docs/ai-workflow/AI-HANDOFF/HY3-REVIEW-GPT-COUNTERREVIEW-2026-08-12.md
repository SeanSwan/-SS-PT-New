# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/KIMI-HY3-PACKET-GPT-COUNTERREVIEW-2026-08-12.md
**Seed:** (none)
**Tokens:** 3113 in / 5859 out | **Cost:** ~$0.0035 | **Wall:** 41.6s | **finish_reason:** stop

---

## VERDICT

GPT-5.6’s counter-review is substantially correct on factual ground truth (V1–V7) but overreaches on sequencing, severity, and scope. Corrections ranked:

C1 — ACCEPT (P1): F14 false per V1/V2; real defect is fullName contract break + non-atomic questionnaire race.  
C2 — MODIFY (P1): accept no-dupe table, but GPT fails to specify role-based approval authorization model for extended proposal system.  
C3 — ACCEPT (P2): repo cannot assert single instance/Redis per V3; constraint must be removed.  
C4 — ACCEPT (P1): “zero PII” contradicts personalization; allowlisted de-identified training context is correct.  
C5 — ACCEPT (P1): injury overstatement fixed; shared structured intake + yes() fix needed per V5.  
C6 — ACCEPT (P1): schema fragmentation real per V6; canonical ClientTrainingContext warranted.  
C7 — ACCEPT (P1): prompt-injection via free-text intake missed by all prior; controls mandatory.  
C8 — MODIFY (P0 must not block): release gate needed, but gating P0 authz hotfixes behind owner ops/CI leaves users exploited for weeks.  
C9 — MODIFY (P1): split read-only charter good, but characterization tests are implementation work, not read-only; internal tension unaddressed.  
C10 — MODIFY (P2): Apply-follows-action correct; sessionStorage caveat correct; encrypted IndexedDB offline is overkill vs minimization + short retention.

## WHERE GPT IS WRONG OR OVERREACHING

1. **Gating P0 behind owner dashboard (C8 Stage 0)** — GPT demands live Render instance count, Stripe endpoint set, and full CI before any fix. This leaves the verified live authz defect (trainer block-time endpoint takes trainerId from body on live router; client Coach terminal hardcoded forbidden context) exploitable for weeks. Operational sequencing (angle b): protect users this week with repo-only hotfixes now; owner verification runs parallel.

2. **Severity calibration on false save receipt is WRONG** — GPT tags false workout-save acknowledgement as P1. For a coaching product whose core loop is the trusted workout record (angle c), a trainer believing a session saved when it didn’t corrupts the primary data asset. That is P0, not P1.

3. **C4 consent/alias/audio boundary overreach** — Demanding salted/ephemeral aliases, explicit health-consent UX, and audio-boundary controls as immediate correctives slows the owner’s dictation-first MVP on a 320–430px gym-floor viewport (angle a). Minimal structured delimiters + de-id allowlist suffice for this week.

4. **C2 extension sketch is under-specified to the point of unsafe** — GPT says extend coach_action_proposals but never addresses who may approve what per role. V4 shows existing lifecycle but [INFERENCE] creator-approves-own pattern would let a client self-approve a workout_log. That is an authorization gap, not a finished correction.

5. **C8 full release gate as Stage 0 is program-building, not user-protecting** — Building both apps, clean-DB migration, Stripe replay is months of work. Owner priority is dictation-first logging + onboarding; GPT’s ordering sacrifices the core product to CI theater.

6. **C10 encrypted IndexedDB offline overreach** — Client-held key encryption defends only against local device theft; for sporadic gym connectivity, server-synced drafts + purge-on-logout is cheaper and sufficient. GPT adds client crypto complexity with no quantified threat.

7. **C5/C6 demand full PAR-Q canonical migration before any dictation** — Voice-to-draft can ship using fixed yes() and field adapters now. GPT overstates upfront unification as blocker for the owner’s top priority.

## WHAT EVERYONE STILL MISSED

- **No dynamic execution**: the entire chain (panel, verifier, Kimi, GPT) reasoned statically from code grep. Nobody booted the app, replayed a voice submit, or concurrency-tested the questionnaire upsert. [INFERENCE] from absence of runtime evidence in packet.
- **320–430px responsive UX void**: onboarding wizard and dictation surface unspecified for small viewport. Trainers on gym floor cannot use assumed desktop layouts (angle a).
- **Dictation input normalization beyond yes()**: STT outputs “Yes.”, “Yeah”, “Yep” — yes() rejects all; no one tied this to the dictation loop breaking onboarding completion.
- **De-identification source-field integrity**: denylist preserves injuries/pain, but if onboarding maps injuries→pastInjuries wrongly, the preserved health context may be empty. No verification that denylist reads corrected field.
- **Action approval authorization model**: who (admin/trainer/client) may approve which of the 9 proposal types? GPT’s C2 ignores; original chain ignored.
- **Shadowed dead router cleanup**: guarded block-time copy sits on dead router; nobody ruled it must be deleted to prevent regression.
- **Confirmation Map signing key**: unset-in-prod noted, but no rotation/injection strategy beyond “set key.”
- **No characterization test for voice-to-draft at 375px** nor offline conflict reconciliation UX spec.

## FINAL BUILD-ORDER RULING

First 5 concrete work items for builder; owner priority dictation-first + onboarding; deployment unknown (V3); no new deps; no Next.js; no soften.

1. **Hotfix live trainer block-time router to derive trainerId from auth context, not body.**  
   Acceptance: scripted request with trainer A token + body trainer B id returns 403/owned-only; cross-account schedule write impossible.

2. **Make voice workout submission await coach_action_proposals persistence before success ack (no new deps).**  
   Acceptance: injected DB failure mid-voice-submit shows no success toast and leaves PENDING proposal row for explicit Apply.

3. **Normalize yes() to accept trimmed/lowercased truthy and map wizard dateOfBirth→age.**  
   Acceptance: unit test yes('Yes.')===true; onboarding dictation at 375px completes without stall.

4. **Unify onboarding→generation field contract: adapt v3/v5 builders to one canonical ClientTrainingContext (injuries/pain/fullName mapped).**  
   Acceptance: integration test posts onboarding with injuries and asserts generation controller receives them (no dropped safety data).

5. **Ship dictation-first trainer UI for 320–430px using existing proposal Apply gate (voice-to-draft).**  
   Acceptance: on 375px viewport, trainer dictates workout, sees structured draft with explicit Apply, zero horizontal overflow, zero new dependencies.
