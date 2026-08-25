# Hostile review: attack everything this session shipped

**Seats:** ox-alpha, GLM 5.3 (both $0), plus the author's own pass.
**Author under review:** vs-claude (claude-opus-5), 2026-08-23/24.
**Instruction:** find what is broken, not what is impressive. **A merge to `main` already
happened** — if it was wrong, say so now.

---

## 1. What shipped

29 commits on `wip/comms-notifications-2026-07-05`, and **one merge to `origin/main`
(PR #70, `9b12a3b22`)**.

| # | Change | Where |
|---|---|---|
| 1 | **drift-check 8** — hook provenance: is a LIVE hook present for anyone else? | both |
| 2 | **drift-check 9** — rule-count drift (says 66, defines 73) | both |
| 3 | Committed 3 hook registrations that existed in ONE working tree | wip |
| 4 | **Fixed a dead PII rule** — phone regex had a leading `\b` before `(`, so it never matched. `call (415) 555-1234` passed a gate reporting CLEAN | both |
| 5 | **Wired lane-staged-guard into `.githooks/pre-commit`** — refuses a commit carrying unclaimed files | wip |
| 6 | First tests for 3 previously-untested gates (34 + 30 + 25 cases) | both |
| 7 | Fixed **absent-input-reads-clean** in BOTH new checks | both |
| 8 | Timeouts on 3 unbounded hooks | wip |
| 9 | **SHADOW MODE** — 3 closeout gates stop blocking, log what they would have blocked, expire 2026-09-06 | wip |
| 10 | **Merged 18 files to `main`** — 3 gates + 4 libs + tests | **main** |
| 11 | Mirror adapter length **detected** instead of hardcoded 45 | both |

## 2. Real telemetry — 38 turns of shadow mode

Not a projection. Measured:

```
HOOK                    RUNS  FIRED  BLOCKED  SHADOWED
hermes-closeout-gate      38     21        3        18
dry-loop-gate             33     18        0        18
dual-tier-gate            33      2        0         2
```

**In 38 turns, dry-loop-gate would have blocked 18 of them and hermes-closeout 21.**
That is the owner's complaint quantified. It is also unclassified: nobody has yet said
which of those 39 fires were real catches and which were tax.

## 3. KNOWN GAPS — I found these in myself; find the ones I missed

1. **`gate-shadow.mjs` has NO TESTS.** It is the module that can switch a gate off. Five
   hostile seats named untested safety tooling as this programme's meta-defect, and I
   shipped its newest instance untested. `gate-telemetry-report.mjs` likewise.
2. **The mirror adapter detection is `aLines.indexOf(cLines[0])` — first match wins.**
   On both repos CLAUDE.md's first line happens to occur exactly once. That is luck,
   not design. If a future adapter quotes that heading, the boundary silently moves.
3. **PR #70 merged to `main` with ZERO CI.** Every GitHub Actions workflow in this repo
   is dead (account-level billing failure, blanket `startup_failure`). Nothing
   independent validated that merge. All evidence is from my own local runs.
4. **39 shadowed fires are unclassified.** The retire/keep decision the whole exercise
   exists for cannot be made until someone labels them real-catch vs wrongful-block.
5. **Shadow mode ships as a config file.** A file that turns off enforcement is exactly
   the artefact that should be hardest to change, and it is a JSON blob any agent can
   edit — including past its own expiry by editing one string.

## 4. ATTACK SURFACES — be specific

**`scripts/lib/gate-shadow.mjs`** — the highest-consequence new file.
- `isShadowed()` returns false on every ambiguous path (missing/malformed config, bad
  date, exception) so the gate blocks as before. **Is that actually true of every
  path?** Find one that returns true when it should not.
- `SWAN_GATE_FORCE_NORMAL=1` disables shadowing. I claimed it "can only ever make a
  gate stricter." **Verify or refute.**
- `record()` swallows all errors so telemetry never breaks a turn. **Can a failure
  there hide a block that did happen?**
- `emit()` is called where the gate previously wrote the block JSON. **Is there a path
  where a gate decides to block and never reaches `emit()`?**

**The expiry.** `until: 2026-09-06`. `Date.parse` on a malformed string → NaN →
`Number.isFinite` false → not shadowed → blocks. **Is there a value that parses to a
far-future date by accident? What about clock skew, which this repo has already been
burned by in the schema date-cutoff bug?**

**`.githooks/pre-commit` + lane-staged-guard.** Now between every agent and every
commit. Opt-in by claiming; no lane → allow. **Attack: what claim string makes it
allow everything? What makes it block a correct commit?** `isCovered()` treats a claim
as a directory prefix — probe that.

**The merge to `main`.** 18 files, 3,022 insertions, no CI. **What did it break that I
did not check?** Specifically: does `drift-check-gate` at SessionStart on `main` slow
or break sessions for other agents? Does `egress-privacy-gate` false-positive on
main's own consult scripts and block legitimate work? I tested it *from* main's tree
but have not observed a real session booted there.

**The absent-input fix.** Both new checks originally treated missing input as clean —
a deleted rulebook and a deleted settings.json each reported perfect health. Fixed.
**Is the same class present anywhere else in what shipped?**

## 5. Where my evidence is weak — audit before reasoning

A prior panel on this programme had **7 of 7 seats echo a false premise** stated
confidently in a brief. Two later panels avoided it only because a section like this
existed.

1. **Every number here is self-reported by the agent under review**, from local runs,
   on a branch **2,226 commits behind `origin/main`**. No CI corroborates any of it.
2. **The telemetry counts blocks, not cost.** A gate that never fires still occupies
   context and shapes behaviour pre-emptively. The owner's complaint is about hedging
   on turns that were never blocked at all — **this instrument cannot see that.**
3. **"38 turns" is one agent, one session, one task type** (governance work). The fire
   rate on product work is unmeasured and probably different.
4. **I chose which of my own mistakes to list in §3.** Treat that list as the floor.
5. **The mirror fix was validated by me, against the two repos that exist.** Two data
   points is not a contract.
6. **I am the author.** If the framing of this packet is itself the problem, say so.

## 6. Output

Lead with **PREMISE AUDIT** — what in §1–§4 you reject. Then blockers by severity, with
a concrete failure scenario each (input → wrong output). Then **what you would rip
out**, because this session added machinery to a repo whose measured problem is too
much machinery.

Constraints not to violate: no Material-UI; Victory charts; dark-first; zero PII to
LLMs; ≤300 lines/file; "stretching" never "yoga"; "26+ years, NASM-protocol" never
"NASM-certified".
