# Seed — V3 Blueprint Hostile Review (first Kimi/HY3 exposure; both seats 401'd out of the V3 panel)

## What you are reviewing
The DOCUMENT you received is the V3 UX/wireframes blueprint for SwanStudios' dictation-first Swan Coach. It is one of four V3 artifacts produced after a 7-round review chain (GPT audit → panel → Fable verification → Kimi meta-review → GPT counter-review → Kimi/HY3/Fable adjudication → V3 synthesis via 12-seat AI Village + Fable). You two were SUPPOSED to be in the V3 panel but your seats failed with auth errors and were not retried — V3's design content has never been seen by you until now. Verdict wanted: APPROVE / APPROVE-WITH-CHANGES / REJECT on the V3 blueprint, plus your findings.

## V3's binding decisions (from its index doc, condensed)
1. Extend `coach_action_proposals` for reviewed writes; no parallel ActionRun table.
2. Reads/navigation ephemeral and permission-checked; no universal ledger for symmetry.
3. Write truth: preview → explicit Apply → durable save → read-back receipt; no optimistic "Saved."
4. NO durable raw utterance/audio until a separately approved retention contract (Slice 11, default disabled).
5. Onboarding: ACCESS FIRST, onboarding VOLUNTARY; one shared draft for guided conversation and form.
6. Context to models: allowlisted, de-identified minimum; narrative is quoted evidence, never instruction.
7. Payments/auth/destructive never in the voice lane; T4 human-run.
8. One Coach runtime, three presentations (Quiet Rail / Thumb Dock / Command Room); controls render once at the affected record.
9. Motion: inline SNAP for ordinary saves; Crystallize ONLY for an authoritative completed workout/PR.
10. Release: hotfixes first, certification gate before migrations, expand/contract schema changes.

## V3's 12 slices (condensed)
S0 doc evidence-lock (two clean rounds) · S1 trainer block-time authz hotfix · S2 staff onboarding fullName hotfix · S3 honest Logger ack (`saved|kept_local|failed|needs_review`) + client-safe context, code-only · S4 minimal one-SHA release certification WITH falsification proof (plant a failing fixture, prove the gate fails) · S5 F13 + onboarding field dictionary (every wizard field mapped-or-intentionally-unmapped) + de-id allowlist + injection delimiters · S6 workout-form idempotency (endpoint-native key, expand→dual→unique invariant after census) · S7 onboarding atomic lifecycle (transaction + outbox; invariant chosen after read-only census) · S8 proposal authority hardening (actor/subject/approver matrix, idempotency, preview hash, one-time approval consumption, lease/fence, reconciler) · S9 voice-first presentations (CoachRuntimeV3 + 3 presentations, flag-gated) · S10 cross-shell runtime adoption (provider above both shells; delete neither) · S11 durable utterance/audio — separately authorized, default OFF. Parallel money-path lane: webhook inventory only.

## Receiving agent's fresh verification (ground truth, run today)
- All cited SHAs exist. V3 pin `610295f`; diff from audit base = 11 files (QA-db, coordination tooling) — claim TRUE at pin time.
- BUT origin/main has ALREADY moved past the pin (2 commits): `backend/models/DailyWorkoutForm.mjs` — the EXACT table S6 targets — got an index fix (model indexes cited camelCase attribute names against snake_case columns; table could not be created on a fresh DB; production unaffected because it never syncs). V3's "re-pin before editing" caveat proven necessary within hours. Schema-drift disease class confirmed on the idempotency target table.
- Design Brain ancestry claims TRUE: all six files exist on origin/main (`design.md`, `typography-grid.md` with B7, `motion.md`, `components.md`, `qa-gates.md`, `adapters/product-surfaces.md`); all five claimed commits exist.
- Receipt spot-checks at pin: `sessions.mjs:2064` block route raw-body TRUE; `dailyWorkoutFormRoutes.mjs:611` POST `/` TRUE.
- Panel receipt honest: 12/14 Village seats, Fable synthesis $1.13, total $1.33 under $5.10 cap, your two 401s disclosed with presence-only diagnostics, no retries.

## Probes (attack these specifically; do not limit yourself)
P1 — "Access first, onboarding voluntary" quietly REVERSES the owner's stated vision ("onboarding is where I pour all my data so we can build customized workouts"). For a trainer-led B2B2C where the trainer runs onboarding with the client, is voluntary-first right, or does it starve program generation of the data that differentiates the product? Who should decide this, and what should the default be?
P2 — "No durable utterance until a retention contract" (S11 default-off) vs the lost-words problem: a failed save keeps the DRAFT on device, but the raw transcript is discarded after parsing — a wrong parse + failed save still loses what the trainer actually said. Is device-kept draft sufficient, or should minimal transcript retention (e.g., session-scoped, encrypted, TTL) ship earlier?
P3 — S8 adds lease owner/expiry, fencing token, preview hash, one-time approval consumption, reconciler. An earlier adjudication killed lease/fence machinery as enterprise cosplay for this deployment; V3 re-admits it as "Option-A-grade hardening" inside the SAME table. Proportionate for multi-step operations, or complexity re-creep? What is the minimal subset for single-step applies (the 90% case)?
P4 — Slice order: S5 (safety-critical F13/field-dictionary repair, no schema change) is sequenced AFTER S4 (CI gate). Its gate does not actually require S4. Should S5 run parallel to S1-S3 hotfixes given injuries-to-AI is a safety defect?
P5 — The v2 chain required a per-day TRUST LEDGER ("did today's logs land?" — every write listed with input mode and read-back status). V3 shows per-record receipts only; the day-level view appears DROPPED. Real gap or acceptable descope?
P6 — Crystal Ledger vs Guided Refraction vs Command Plane: is the recommendation right? Judge the three directions, the wireframes, state copy, and 320-430px live-session ergonomics (HY3: this is your lane — trainer mid-set, phone in one hand).
P7 — Anything the whole 8-round chain STILL hasn't surfaced.

## Output format
`## VERDICT` (one line + per-binding-decision ACCEPT/MODIFY/REJECT list) · `## FINDINGS` (numbered, severity-tagged, concrete) · `## PROBE ANSWERS` (P1-P7) · `## TOP 5 CHANGES TO V3 BEFORE HANDOFF` (each with a one-line acceptance proof). Never invent file paths or line numbers; mark inference [INFERENCE]; do not soften.
