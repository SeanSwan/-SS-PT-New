---
decision: Reconcile the CLAUDE.md/AGENTS.md split caused by 10a3e7fa1, recording a per-hunk rationale so a wrong call stays auditable
status: shipped
supersedes: none
---

# Constitution Merge — Per-Hunk Decision Log (2026-08-14)

Kimi K3 hostile review, finding **D6**: *"The 13/4 hunk split was adjudicated by a
human reading. There is no recorded per-hunk rationale artifact. If the 4-vs-13 call
was wrong on even one hunk, the error is now in both files and, per §3's own logic,
invisible to diffing forever."*

That is correct, and this file is the remedy. Every adjudication below is recorded so
a future reviewer can overturn any single one without re-deriving the whole merge.

## Method

- Compared by rule **NAME**, not number — the numbers had collided (Proof-Before-Done
  was 73 in one file and 74 in the other), so number-keyed comparison returns nonsense.
- A **length heuristic was explicitly rejected** as the tie-breaker. Every one of the 9
  body differences was read before adjudication.
- The mojibake hypothesis for the four small deltas was **tested and disproved**
  (0 hits for `â€"`, `â€™`, `â€œ`, `Ã©`, `â†’` in both files) before treating them as content.
- Base = AGENTS.md mirror body (won 13 of 17 hunks); CLAUDE.md's 4 winning rule blocks
  spliced in by a script that refuses to write on a missing anchor or a no-op splice.

## Adjudications

| # | Subject | Winner | Why |
|---|---|---|---|
| 1 | Four-C router: rule count + skill count | **AGENTS** | CLAUDE hardcoded "66 MANDATORY rules" and "20 `.claude/skills/`". Both were false (81 and 42). AGENTS had already removed the hardcoded counts in favour of runtime discovery. Rule 75 (Trailhead-Truth). |
| 2 | Rule 16 — AI Village cost | **CLAUDE** | CLAUDE carries the receipts-corrected figure ("Ten distinct recorded runs", 11 files, `latest/` duplication noted). AGENTS held a 194-char stub. CLAUDE is strictly newer. |
| 3 | Rule 40 — design router | **CLAUDE** | +852 chars: the taste-ceiling doctrine (8–12 concept breadth pass, Extreme Macro-Journey, C13). Purely additive over the AGENTS text. |
| 4 | Rule 46 — review gate | **AGENTS** | AGENTS has the Kimi Hostile-Review Gate (amended 2026-07-26, Fable retired as routine decider). CLAUDE had been reverted to the superseded 3-Brain/Fable loop. **This was a reversion, not a deletion** — and is exactly why check 3 was later added to the guard. |
| 5 | Rule 57 — dual-tier summary | **CLAUDE** | CLAUDE retains the "ENFORCED (added 2026-08-03)" paragraph naming `dual-tier-gate.mjs`. AGENTS lost the enforcement note. |
| 6 | Rule 64 — grill-me pipeline order | **AGENTS** | AGENTS routes through Rule 78 mode classification + wayfinder. Coherent only once Rule 78 is restored; CLAUDE's line predates Rule 78. |
| 7 | Rule 65 — strategy pipeline order | **AGENTS** | Same reason as #6. |
| 8 | Rule 66 — prompt-watcher routing | **AGENTS** | Same reason as #6. |
| 9 | Rule 68 — Hermes learning source gate | **CLAUDE** | +3,859 chars. CLAUDE has "Fable 5, Opus 5, and Kimi K3" (Sean 2026-08-10) plus the 2026-08-13 packet schema. AGENTS still said "Fable ONLY", which contradicts Sean's own later designation. |
| 10 | Rule 73 — ADW Discipline | **AGENTS** | Present only in AGENTS; deleted from CLAUDE by `10a3e7fa1`. Restored. Proof-Before-Done consequently moves back 73 → 74. |
| 11 | Rules 75–81 | **AGENTS** | Seven rules present only in AGENTS: Trailhead-Truth, Create-With-Context, Dead-File Quarantine, Agent Workflow Mode Router, Tests Can Encode The Bug, Second-Vantage Verification, Test-Delta Disclosure. Restored. |
| 12 | Design handoff rule 6 | **AGENTS** | Amended 2026-07-25: Gemini is context, not authority; Kimi K3 / Opus 5 hold design authority. CLAUDE held the pre-amendment text. |
| 13 | Co-Orchestrator Hierarchy | **AGENTS** | Reflects Fable's retirement and Kimi as standard Final Reviewer. CLAUDE still named Fable FINAL DECIDER, contradicting the restored Rule 46. |
| 14 | Swan Visual Operating System heading | **AGENTS** | AGENTS de-dated the heading and dropped the stale "documented count = 23". |
| 15 | Skills tables | **AGENTS** | AGENTS carries `create-with-context`, `swan-gate`, `cost-guard`, `wayfinder`, `goal-contract`, etc. CLAUDE listed 23 of 42. |
| 16 | Storefront reseed instruction | **AGENTS** | ⚠ Live production hazard. CLAUDE still instructed a future agent to run `FORCE_RESEED=true` against the storefront seeder. AGENTS carries the 2026-08-04 retraction of exactly that. Non-negotiable. |
| 17 | Seedance skills | **AGENTS** | CLAUDE routed to `seedance-swan-workout-video` and `seedance-swan-cinematic-video`, **neither of which exists**. AGENTS names the unified `seedance-swan-video`, which does. |

## Adjudications made by reading, that no diff could have surfaced

These were **identical in both files**, so mirror-parity and diff-based review would
have called them healthy forever. Found only by reading for self-contradiction.

| Subject | Change | Why |
|---|---|---|
| Fusion synthesis judge | Replaced "Final Decider chain (Fable→Opus/Claude→Codex)" with the Rule 46 gate | Named a chain retired 2026-07-26; directly contradicted the restored Rule 46 in the same document. |
| Tier 3 Village judge | "Opus/Fable synthesis judge" → "Opus 5 synthesis judge; Fable only on Sean's explicit per-run request" | Same staleness class (Rule 53 adjacent sweep). |
| Tier 3 chain closer | "closed by the Decider chain" → "closed by the Rule 46 gate" | Same. |

## Additions beyond the merge

- 4 skills neither file advertised: `agent-lane`, `lesson-recall`, `design-dialogue`, `stale-check`.
- Evidence-gates section relabelled (2) → (3) to include `stale-check`.

## Verification

81 rules in both files · 0 missing either direction · 0 number mismatches · 0 body
differences · mirror `--check` OK · 0 unadvertised skills (was 18) · 0 phantom skill
references (was 2) · 0 stale decider references · valid UTF-8, no mojibake, no CRLF.

## What to overturn this with

If any row above is wrong, fix the rule in `CLAUDE.md`, regenerate the mirror, and
amend this table with the reason. Do **not** hand-edit `AGENTS.md` below the marker.
