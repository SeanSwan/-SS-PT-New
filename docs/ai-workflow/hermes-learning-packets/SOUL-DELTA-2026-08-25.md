---
title: SOUL.md delta — ten mandatory verification reflexes, from two months of agent reports
date: 2026-08-25
originating_model: claude-fable-5
status: APPLIED — written to WSL ~/hermes2/.hermes/SOUL.md on 2026-08-25 under Sean's
  explicit direction ("make the changes to Hermes"), after a second four-seat panel.
  Backup: ~/hermes2/.hermes/SOUL.md.bak-2026-08-25.
derived_from: docs/ai-workflow/AI-HANDOFF/AI-WEAKEST-LINKS-REVIEW-2026-08-25.md
panel_round_1: Kimi K3 0.72 · Grok 4.6 REJECT 0.71 · DeepSeek V4 Pro REJECT 0.82 · HY3
  REJECT 0.82 · Ox Alpha CONFIRM 0.74 / REJECT 0.82 — produced the 5-reflex subset
panel_round_2: reviewed the 5-reflex subset AGAINST THE REAL SOUL.md (round 1 never saw
  it) + whole-workstream gap sweep. Kimi K3 CONFIRM@82 ($0.03) · Ox Alpha CONFIRM@78
  (Served-header proven) · Grok 4.6 REJECT@84 · GLM 5.3 CONFIRM@82-as-rewritten.
  Unanimous: retitle to "Mandatory verification reflexes", add $?-after-pipe, resolve
  the planner/builder seam, complete the heredoc sigil list, evict the calibration fact
  to a dated protocol file.
---

# What was applied (final text, all seats folded)

Appended to `~/hermes2/.hermes/SOUL.md` — the tree the launcher proves live
(`~/.local/bin/hermes` exports `HERMES_HOME=/home/bigotsmasher/hermes2/.hermes`).
Ten reflexes replacing the five-reflex draft:

1. Positive control before any absence claim (absence without control = UNPROVEN).
2. Scope every claim to the span actually read; name the searched surfaces.
3. Clipped ≠ clean; prove completeness affirmatively (counts), don't infer it.
4. A green instrument is a hint, not a verdict — confirm it can see the failure.
5. No `$`-forms/backticks/backslashes through unquoted heredocs or `-e`/`-c` bodies;
   write the file or quote the delimiter; read back after.
6. `$?` after a pipeline is the last command's status — PIPESTATUS/pipefail/restructure.
7. Validate the test, not the suite: see the new test FAIL first (planner specifies it,
   builder runs it).
8. A fix is where the next bug lives; re-run the ORIGINAL observation; re-verify
   blockers before repeating them.
9. Rulebook edits carry a hand-written RULEBOOK trailer; never `--no-verify` past the
   guard; trailer-less rulebook diffs after a pull are suspect.
10. "Done" means every slice — per-part status on multi-part tasks.

Plus a preamble binding both planner and builder seats, stating the no-hooks fact, and
taking precedence over line 1's "admit uncertainty when appropriate."

## What moved OUT of SOUL.md (panel G7, unanimous)

The Ox/Grok seat-selection calibration fact now lives at
`~/hermes2/.hermes/protocols/seat-calibration-2026-08.md` (created in the same apply),
with seat-behavior notes from this panel. SOUL.md carries one pointer line.

## Round-2 findings that changed the text

- Reflex 5's sigil list was a strict subset of what the repo's own gate blocks — "the
  narrow-read failure living inside the fix for it" (GLM F1, Grok F2). Completed.
- No `$?`-after-pipe reflex despite it being the single most-recurring corpus mechanism
  (all four seats). Added as reflex 6.
- No reflex for the 88% family's actual mechanism (claim wider than the read span) —
  GLM N1. Added as reflex 2.
- Instrument-trust (68% family) uncovered on positive results — Kimi N1. Added as 4.
- Planner/builder cost gate collided with "see the test fail" — Kimi F2/N3, Grok N3.
  Resolved in the preamble and reflex 7.
- First-person memoir voice + embedded dates in a file of "Mandatory … gate" imperatives
  — Grok F1/F5, GLM F2, Ox F1/F2. Retitled, revoiced, dates and tallies stripped.
- RULEBOOK-trailer duty existed as a repo hook but no Hermes reflex — Ox N1 ("the whole
  premise of this exercise, skipped for the governance gate in the same PR"). Added as 9.

## Known drift flagged during the apply (Sean/Hermes to resolve)

`~/.hermes/` is an ORPHAN tree: the launcher points HERMES_HOME at
`~/hermes2/.hermes/`, but the live SOUL.md's `~/.hermes/...` references (PROTOCOL-INDEX,
skills) resolve into the orphan, whose PROTOCOL-INDEX.md differs from the live one and
whose own SOUL.md is a stale Jul-31 draft the runtime never reads. Both trees carry a
`skills/` dir. This split-brain predates this delta and was not repaired here — repairing
identity-file path references is Hermes-side work Sean should direct explicitly.

## Mistakes I made

- **My draft carried the corpus's #1 failure inside its own fix**: reflex 5's sigil list
  omitted `$VAR` and `$(...)` — narrower than the gate it mirrors → caught independently
  by three of four seats → repeat-prevention: reflex 2 itself (scope the claim to the
  full enumerated set; diff prose against the code it describes before shipping).
- **I nearly wrote to the wrong SOUL.md**: memory said hermes2 was the live tree, but
  `get_hermes_home()` defaults to `~/.hermes` and only the launcher's `HERMES_HOME`
  export proves hermes2 → caught by reading the launcher before writing → rule: reflex 1
  applied to write targets (prove the target is live before mutating it).
- **My new probe cried wolf on first fire**: probe 11 flagged 16 pre-guard rulebook
  commits as "bypasses" → caught by live-firing the probe before commit → rule: fire
  every new alarm once against reality before installing it (instrument-check, applied
  to instruments themselves).
- **I wrote a test against a fixture that did not exist** (`REL` for `REAL`) → caught by
  the first test run, not by me → rule: write-then-run in the same breath; an unrun test
  is prose.
- **Wrong stopping rule, repeated from the heredoc-gate slice and already written up
  there**: I again shipped a "final" text (the 5-reflex draft) without a round against
  the artifact it modifies (the real SOUL.md) — round 2 existed only because Sean asked
  for it → highest-signal repeat: a review of a DELTA is not a review of the MERGE; the
  merged context is the artifact.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before recurring? | What stopped it |
|---|---|---|---|
| Prose narrower than the code it mirrors | 1 | yes (narrow-read family, review doc §2) | seat cross-check vs gate source |
| Fix without re-running original observation | 1 (5-draft vs real SOUL) | yes (same doc §5) | Sean-directed round 2 → now reflex 8 |
| New instrument unvalidated (wolf-cry / dead fixture) | 2 | yes (instrument-trust §3) | live-fire before install; test run |
| Wrong write target risk | 0 (near-miss) | yes (path-conv memory) | launcher read (positive control) |

## External-model calibration (round 2, this packet's panel)

Kimi K3 $0.03: 3 findings, all real on verification, rewrite adopted in structure.
Grok 4.6 ~$0.20: 6 findings, all real; one duplicate of GLM. Ox Alpha free: 4 findings
real, 1 (F2 round-count) a factual catch on my own text. GLM 5.3 free: strongest —
sigil-subset catch + claim-scope reflex + count-proof upgrade all adopted. Nothing
disproven on verification this round; zero-cost seats produced ~70% of adopted content.

## Repo-side changes shipped from the same panel (branch feat/gates-fire-report)

- `scripts/gates-fire-report.mjs` (+ tests): the fires.jsonl analyzer — reason-class
  histogram, per-day counts, hatch rate, ENFORCE-READINESS line; empty window says
  "VERIFY THE INSTRUMENT", never "clean" (G5, unanimous ADD).
- drift-check probe 11: trailer-less CLAUDE.md/AGENTS.md commits on origin/main are
  flagged at session start — converts the GitHub-UI-squash bypass into a detected event
  (G6, unanimous). Floored at the guard's ship date to avoid pre-guard alarm fatigue.
- `hook-classify.mjs`: the canonical quoted idiom `node "${CLAUDE_PROJECT_DIR:-.}/…"`
  now resolves instead of joining the blanket quoting decline — 11 permanent UNVERIFIED
  rows per session start was the alarm-fatigue failure the module's own header warns
  about. Both fuzzers hold.
