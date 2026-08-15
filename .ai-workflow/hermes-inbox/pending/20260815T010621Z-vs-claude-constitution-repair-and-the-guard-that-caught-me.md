---
surface: claude-md, agents-md, constitution-guard, skill-advertising, hermes
date: 2026-08-15
agent: vs-claude (claude-opus-5)
branch: claude/constitution-repair-20260814 → main @ 86efcf515
---

# Constitution repair — and the guard that caught its own author

## What happened

`CLAUDE.md` and `AGENTS.md` had become different rulebooks. Not drift — **one commit**.
`10a3e7fa1` shipped two correct edits and silently reverted nine MANDATORY rules out of
CLAUDE.md, reverted rule 46 to a gate retired 2026-07-26, and renumbered 74 → 73 into a
collision. AGENTS.md was untouched and kept them by accident. For ~15 hours Claude and
Codex operated under different law, and the file with FEWER rules was the one the mirror
generator treats as the source of truth.

Now on main: both files carry 81 rules, byte-identical below the marker.

## The thing worth remembering

**Divergence between mirrored files is a signal to INVESTIGATE, never to regenerate.**
The session-start drift advice was "run `sync-agents-mirror.mjs`" — which copies CLAUDE.md
over AGENTS.md and would have made the loss permanent. Divergence here was **bidirectional**:
AGENTS.md was newer in 13 of 17 hunks, CLAUDE.md in 4. A copy in *either* direction destroys
real content. Diff by rule NAME (numbers collide), decide newer per rule, merge deliberately.

**Reading beats diffing for a whole class of defect.** Four real problems were identical in
BOTH files, so no mirror-parity check or diff could ever surface them: a decision chain retired
three weeks earlier, a Tier-B line still naming Codex the final gate, a reference row saying the
same, and a live instruction telling a future agent to `FORCE_RESEED` production data.

## Who did what

- **claude-opus-5 (me)** — diagnosis, merge, guards, verification. Got rule 71 wrong (below).
- **claude-opus-5 (earlier session)** — the diagnosis learning packet `e48969012`, already on
  the branch when I attached. Correct and complementary; I reviewed it before pushing it to main.
- **Kimi K3** — hostile review, SHIP-WITH-CHANGES, 7 findings. Its **D1 was the important one**
  and I had missed it entirely: the guard I wrote did not cover its own founding incident,
  because 10a3e7fa1 damaged rule 46 by reverting the BODY, and only a coincidental rename
  exposed it. Name/number checks are blind to body reversion.

## Skills created or changed

- `scripts/hooks/constitution-guard.mjs` **(created)** — motivated by: no gate existed that could
  see a rule disappear. Blocks removal, silent renumber, body reversion, mirror drift.
- `validate-skill-registry.mjs --check` **(extended)** — motivated by: the routing table advertised
  23 skills while 42 were installed. Existence validation passed the whole time, because
  **existence is not advertisement**. A skill absent from the table never fires.
- `AGENTS.md` header **(amended)** — DO-NOT-EDIT + the "investigate, don't regenerate" warning.

## Mistakes I made

- **I omitted rule 71 from the merge splice list.** I identified it in analysis as one of the
  rules where CLAUDE.md was newer, then wrote `[16, 40, 57, 68]` and dropped it. It would have
  silently deleted the provenance correction stating Opus 5 is independently Fable-tier —
  contradicting Rule 68 and Sean's own designation. **The guard caught it, minutes after I
  added the check Kimi told me to add.** I committed the exact defect class I was repairing.
- **I claimed `rg` returned zero citations when `rg` is not installed.** I piped it to `head`,
  which masked the exit code, and read the empty output as a result. That is the report's own
  dangerous-pattern #2, committed while working *from* that report. Re-ran with grep: 6 hits.
- **My own test silently no-opped.** The "honest edit" test used the wrong case in `.replace()`,
  so the fixture was byte-identical, nothing staged, and the guard "passed" by never running —
  the silent-no-op class, inside the test written to prevent it. Now asserts the fixture changed.
- **My first escape hatch made its own warning unreachable.** I marked the hatch "used" for every
  allowlisted rule regardless of whether it changed, so the stale-override warning was dead code
  and "OVERRIDE ACTIVE" printed for rules nobody touched. Found by its own test.
- **My first guard fail-opened on any git error.** Reasoned "don't block unrelated work"; Kimi
  called it backwards and was right — a clobber guard must not go silent exactly when tooling is
  misbehaving. Now fails closed except on a genuinely absent HEAD.
- **I ran a sanity check whose bash mangled my backticks** and printed "(none = good)" over a
  shell error. I re-ran it rather than bank the false negative — but I nearly did not notice.
- **I almost fired the wrong paid tool.** The sanctioned panel launcher is hard-coded to a
  different project's remits; running it would have billed me for a Newsroom design review of a
  governance file. Caught by reading the launcher instead of trusting its name.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Masked exit code via pipe-to-head/tail | 2 | Yes — inbox report §1b, dangerous-commands table | Redirect to a file, read `$?` separately. Knowing the rule did not stop me; changing the command shape did. |
| False negative from an unvalidated probe | 2 (`rg` absent, backtick mangling) | Yes — Rule 80, report §2a | Run the probe against a known-present control BEFORE believing a negative. |
| Silent no-op edit | 2 (test fixture, near-miss on splice) | Yes — report §1a | Assert a positive post-condition in code; use tools that fail on a missing anchor. |
| Edit tool desynced from disk after an external script wrote the file | 3 | No — new | A **multi-line** Read resyncs it; a 1-line Read does not. Worth knowing. |

**The highest-signal entry:** the first three had all been documented *before* this session, in the
very report I was working from, and I committed them anyway. Writing a lesson down does not
prevent its repeat. Only a changed command shape or a mechanical gate did.

## External-model calibration

**Kimi K3** — 1 call, **$0.0417** actual against a $0.9095 worst-case estimate (~22× over-estimate;
the estimator is a ceiling, not a forecast — consistent with prior calibration). 101s, `finish:stop`.
Of 7 findings: **6 real and actionable** (D1 body-reversion hole, D2 non-expiring hatch, D3
fail-open, D4 mirror-parity is consistency-not-clobber, D6 no per-hunk rationale, D7 no persistence
for the skill table). **D5 was fair but scoped to the packet** — it flagged "7/7 pass" as unsupported,
which was true *of the packet*; the tests did pass in-repo. **Zero hallucinated findings.** Its
highest-value output was D1, which I could not have found by self-review — I had already run
several clean rounds on that guard. Confirms the standing calibration: Kimi is worth most attacking
a *decision or design* before it hardens, not hunting code defects.

## Still open (Sean's call)

1. **The guard is committed but not firing locally.** `core.hooksPath` is an absolute path to the
   main tree's `.githooks`; that tree is ~1933 commits behind and its `pre-commit` has no guard.
   Check: `grep -c constitution-guard "$(git config core.hooksPath)/pre-commit"` → 0 means exposed.
2. **The `drift-check` hook still prescribes the destructive fix** and exists only in unpushed
   local work, so it could not be corrected from a worktree off main.
3. **No CI enforcement.** Pre-commit is bypassable with `--no-verify`; Kimi's Q3 recommends the
   same guard as a required PR check. Per the inbox report §7d, CI here has never successfully run.
