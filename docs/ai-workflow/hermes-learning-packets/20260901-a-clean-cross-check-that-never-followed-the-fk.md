---
title: "A clean cross-check that never followed the FK — audits grade where they looked"
packet: a-clean-cross-check-that-never-followed-the-fk
date: 2026-09-01
originating_model: claude-fable-5
tier: fable-tier
tier_basis: "claude-fable-5 is the running session model (Fable 5, Final Decider); provenance first-hand"
surface: PLAUD ingestion pipeline audit; external-audit calibration; Rule 29 drift tables
decision: "A schema cross-check must trace value provenance (what UUID/entity actually flows into the column), not just name-level caller-field-vs-column existence. And an external audit's grade distribution maps its attention, not the risk."
privacy: "No secrets, no client data. Route/service paths and column names only."
status: draft
models_used:
  - model: claude-fable-5
    role: hostile reviewer of an external audit, blueprint author, Final Decider
    did: "Ran three codebase maps; re-verified subagent headline claims by direct file read; found F1 (FK value-provenance bug) and F2 (unhandled source string) that the external audit and its own schema cross-check missed; wrote the zero-decision rebuild blueprint"
    cost: subscription (flat rate)
  - model: gpt (ChatGPT seat, Sean-driven)
    role: original auditor (input under review)
    did: "Produced the PLAUD ops audit: real catches (unpinned CLI, PLAUD-merge lineage duplication, connector silent death, test-isolation defect, ABC vocabulary, soft-hold design) and real misses (both approval-path defects, both missing product engines, egress/consent gap, multi-trainer scope contradiction)"
    cost: subscription (Sean's seat)
skills_touched:
  - id: rule-29 (schema cross-check artifact)
    change: sharpened
    failure: "A drift table of caller-field -> column -> match passes while the VALUE written is another entity's UUID. Name-level cross-checks cannot see value-provenance drift; the check must ask 'what does the code put in this column, and does the FK target contain that entity?'"
  - id: rule-30 (subagent/external output is a hypothesis)
    change: applied, held
    failure: "None this session — the near-miss it prevents: the external audit's 'no drift found' verdict would have been inherited into the blueprint if its cross-check format had been trusted."
---

# A clean cross-check that never followed the FK

An external GPT audit of the PLAUD pipeline included a schema cross-check section and declared
"no caller/model field drift was found in the audited paths." It graded the write path 78/100 and
data safety 87/100, and framed the remaining work as UI simplification.

The audited path contains a guaranteed foreign-key violation: `adminWorkoutLoggerController.mjs:127`
writes `serviceResult.formId || serviceResult.sessionId` — and the service returns only `sessionId`,
a `workout_sessions` UUID — into `approved_workout_form_id UUID REFERENCES daily_workout_forms(id)`.
Every column name matches. Every field exists. The **value** belongs to a different table. A
name-level drift table goes green on exactly this bug.

Second miss in the same seam: the frontend sends `source: 'plaud_merge_segment'`; the backend
branches on the exact string `'plaud_merge'` and the segment string appears nowhere in backend/ —
so the per-segment path silently skips approval bookkeeping. A grep for the *literal source values a
caller sends* would have caught it in seconds.

## Who did what

Fable ran the maps, re-verified both defects by direct read before citing them (Rule 30), and wrote
the blueprint. The GPT seat did honest, useful ops work — its CLI-pinning, lineage-duplication,
silent-death, and vocabulary findings were adopted with credit — and was structurally blind twice:
its cross-check format could not see value-provenance drift, and its grade weights put 87/100 on
"data safety" over a pipeline that ships unredacted client audio to a third-party model with no
consent gate while a consent framework sits unused in the same repo.

## Skills created or changed

Rule 29's drift-table procedure gains a required row-level question: for every FK/identifier column
a caller writes, name the expression that produces the value and the table that value's entity lives
in. `caller field -> real column -> match` becomes `caller expression -> value entity -> FK target ->
match`. Without it the artifact certifies spelling, not correctness.

## Mistakes I made
- Globbed `*laud*` for the PLAUD file inventory; it matched `.claude/` and returned skill files. Caught on first read of the output. Fix: grep real path tokens and exclude dot-dirs.
- Two ORIENT-gate blocks (missing block, then over-budget ASK) because I initialized the orientation ledger only after the hook complained. Fix is procedural: init the ledger when claiming the lane, before the first substantive reply.
- Zero repeats of previously-written-up lessons detected this session.

## Error → fix → repeat ledger
- Glob-too-wide (`*laud*` matched `.claude/`): occurred 1×, caught same turn, not previously written up. Procedural fix: path-token grep with dot-dir exclusion.
- ORIENT-ledger-late: occurred 2× (block absent, then field over budget) in one session before stabilizing. Previously written up? The orient gate itself is the written-up mechanism — the gate WORKED (blocked both). Correction that survives: `node scripts/orient.mjs --init --pid <task>` belongs in the same breath as `lane.mjs claim`.

## External-model calibration
- **GPT audit seat:** ~7 findings adopted as real (CLI pinning, lineage dup, silent connector death, test isolation, ABC vocabulary, soft-hold, E2E scenario list). ~5 disproven or inverted on verification (schema cross-check "clean", data-safety 87 despite ungated audio egress + plaintext at rest, single-owner scope vs stated multi-trainer vision, "residual" framing of a guaranteed-failure approval path, UI metrics unverifiable). Routing lesson: use this seat for ops/connector/UX-vocabulary passes; never accept its schema or security grades without value-level re-verification.
