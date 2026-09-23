---
decision: V3 FINAL RULING — GPT's approve-with-amendments directive RATIFIED with a two-item restoration rider (A7, A8); D1/D2 recorded as owner-ratified; Gate 0 re-pin note updated to 36d240f8d
status: open
supersedes: none
---

# Swan Coach V3 — Final Ruling (Fable Decider Record)

> **Date:** 2026-08-12 · **Decider:** Claude Fable 5, ratifying · **Input:** GPT-5.6's final review (relayed by Sean with "this is what should be the latest and final"), which itself accepted the unanimous Fable/Kimi/HY3 APPROVE-WITH-AMENDMENTS adjudication.

## 1. Ruling

**GPT's final directive is RATIFIED as the governing V3 amendment order, with the restoration rider in §3.** Its factual claims verify; its amendment list strengthens ours in six places; its D1/D2 decisions match the unanimous reviewer recommendation and are recorded as **owner-ratified** (Sean relayed the ruling as final — that relay is the ratification; if Sean did NOT intend to ratify D1/D2, say so and they reopen).

Verified this session [all VERIFIED]:
- `1041eb4d4` content exactly as GPT described: schema-verifier false-missing fix + explicit `to_regclass('public.daily_workout_forms')` check (`scripts/qa/qa-schema.mjs:106`); predecessor `b4454d418` = DailyWorkoutForm index snake_case fix + 274-line QA schema tooling.
- **Main has ALREADY moved past GPT's cited SHA** — now `36d240f8d` (+2 media-sync commits; no bound surface touched). Third staleness demonstration in 24h. Gate 0 must re-pin at execution time, exactly as GPT's amendment 6 mandates — including against its own citation.
- Two new Gate-0 inputs landed with those commits: `backend/scripts/audit-schema-drift.mjs` (new drift-audit tool — belongs in the Gate-0 checklist alongside `scripts/qa/`) and two migration-chain decision docs (`MIGRATION-CHAIN-DECISION-PACKET-2026-08-12.md`, `KIMI-MIGRATION-CHAIN-VERDICT-2026-08-12.md`) from a parallel agent — S6/S7's migration work must read them before writing any migration.

## 2. Cross-map — GPT's 8 amendments vs the adjudication's 8

| Adjudication | GPT directive | Status |
|---|---|---|
| A1 Gate-0 binds role defaults | #1 + #8 (config-encoded role→default matrix) | **CARRIED, strengthened** |
| A2 no optimistic "Saved" | #2 (full 8-state + 7-branch machine; Saved = saved_verified only) | **CARRIED, strengthened** |
| A3 complete copy matrix | #4/#6 (adds ambiguous-client, low-confidence, unit-conflict, expired-token, already-applied) | **CARRIED, strengthened — absorbs our advisory F14/G4 items** |
| A4 fail-closed evidence lock | #5/#6 (bound-surface commit invalidates the gate) | **CARRIED** |
| A5 draft tenancy | #3 (six-field tuple + revocation + "Clear drafts from this device") | **CARRIED, strengthened** |
| A6 transcript recovery buffer | #4 (2h TTL — tighter than our 24h ceiling; text-only; never model training) | **CARRIED, strengthened** |
| A7 S5 into the hotfix wave | — | **DROPPED IN RELAY — restored in §3** |
| A8 day-level trust rollup | "operational history" prose only, not binding | **DROPPED IN RELAY — restored in §3** |
| (advisory F11 control authority) | #5 canonical action card owns all controls | **PROMOTED to binding — adopted** |
| (advisory small-screen/landscape) | #7 (360px + landscape + keyboard acceptance) | **PROMOTED to binding — adopted** |

Root cause of the two drops: GPT could not read the adjudication file and worked from my chat summary, whose plain-English section compressed the eight amendments into five. The compression was mine. The restoration below closes it.

## 3. Restoration rider (binding, additive to GPT's directive)

**R1 (= A7): Slice reorder.** S5 — the injury/field-dictionary safety repair — runs parallel with the S1–S3 hotfix wave. It is code-only, has no S4 dependency, and repairs the worst defect class this product can ship (client-reported injuries never reaching program generation). S4's falsification-proof certification remains the hard gate for the first schema-touching slice (S6+). Slice index must show: S0 → {S1,S2,S3,S5} → S4 → S6+.
  *Proof: slice index shows S5 in the hotfix wave; no schema-touching slice reachable before S4 passes.*

**R2 (= A8): Day-level trust rollup.** A derived, read-only "Today: X verified / Y pending / Z kept-local" strip in Command Room (+ per-record history filter), sourced entirely from existing receipt records — input mode and read-back status per write. No new write path, no new table. This is the owner's standing "did today's logs land?" requirement; per-record receipts answer a different question.
  *Proof: Command Room wireframe includes the strip sourced from receipt states only.*

## 4. Adopted improvements GPT added beyond the adjudication

- The **programReady contract** (D1): server-calculated; requires goal, health screening, injuries/pain/limitations, clearance-when-applicable, experience, equipment/location, availability, consent. Distinct from `profileComplete`; safety fields block, optional lifestyle fields do not. Generic examples viewable but never assignable/schedulable/savable as the client's program. Trainer-led onboarding is the expected primary path with dictate → mark-unknowns → secure continuation link → trainer review → programReady approval.
- The **D2 activation-trigger list** (multi-instance writes, background workers, cross-process claims, measured race incident, replay pressure, unresolvable multi-device conflicts) — dormant lease/fence columns permitted only as nullable, migration-tested, never justifying a second action system.
- The **saved_unverified / verifying** split with honest interim copy ("Saved response received — verifying…").
- The **role-default matrix as configuration**, not prose: client→crystal_ledger, onboarding→guided_coach, trainer/admin→command_room.

## 5. What the V3 agent must return before builder authorization (GPT's list, unchanged, plus rider)

Revised blueprint · amended state machine · exact Gate-0 checklist (now including `scripts/qa/*`, `backend/scripts/audit-schema-drift.mjs`, and the migration-chain decision docs) · role-default matrix · draft/transcript tenancy + retention contract · D1 programReady contract · D2 dormant-concurrency triggers · diff against the CURRENT origin/main at execution time (36d240f8d is already stale-in-waiting) · first PR-sized slice with executable acceptance tests · **R1 slice-index reorder · R2 Command Room rollup wireframe**.

No production push, migration execution, feature enablement, or builder handoff during the amendment pass.
