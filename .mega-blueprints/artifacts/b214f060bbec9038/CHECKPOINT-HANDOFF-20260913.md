# CHECKPOINT HANDOFF — Rolodex / Workout Planner / Bootcamp / Sprint repair

**Written:** 2026-09-13 · **Checkpoint, NOT completion.** Work is saved to git so it cannot be lost; the
items in §5 are still open.

**Read this file first.** It is the index. The authoritative artifacts it points at are all committed
alongside it.

> **What "checkpoint" means here.** Everything is verified *local and tested*. Nothing is deployed,
> nothing is migrated, and the branch is **not** merged to `main`. Where a claim rests on a command,
> the command and its expected output are given in §6 so you can re-derive it rather than trust it.

---

## 1. Where everything is

| what | path |
|---|---|
| **Canonical checkout** (worktree) | `C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-luna-01a098de-20260913` |
| **Branch** | `codex/rolodex-luna-01a098de` |
| **Baseline this branched from** | `c0cbe538d` ("Merge PR #118: reviewed selective fixes and Render startup repair") |
| **Remote** | `origin` → `https://github.com/SeanSwan/-SS-PT-New.git` |
| **Evidence packet** (all receipts, ledger, probes) | `.mega-blueprints/artifacts/b214f060bbec9038/` |
| **The full chronological record** | `.mega-blueprints/artifacts/b214f060bbec9038/execution-ledger.md` (~1 860 lines) |
| **The authoritative requirements register** | `.mega-blueprints/artifacts/b214f060bbec9038/H01-H30-DISPOSITION-20260913.md` |
| **The readiness receipt** | `.mega-blueprints/artifacts/b214f060bbec9038/READINESS-RECEIPT-20260913.md` |
| **Live status file** | `.mega-blueprints/artifacts/b214f060bbec9038/CONTINUATION-STATUS-20260913e.md` (see §7 — `…d` and earlier are superseded) |
| **Slice summaries S01–S08** | `.mega-blueprints/artifacts/b214f060bbec9038/s0N-summary.md` (+ `s0N-architecture.md`) |
| **The two contracts driving the work** | `docs/ai-workflow/blueprints/agent-ready-workout-planner-2026-09-06/13-server-repair-contract.md` (R-H## items) and `14-frontend-repair-contract.md` (FE## items) |
| **The audit register that named H01–H30** | `docs/ai-workflow/blueprints/agent-ready-workout-planner-2026-09-06/15-audit-findings-and-fix-register.md` |

**Important:** the packet's `*.log` files are **gitignored** (`.gitignore:191`), so the logs the
receipts cite are **local-only and are NOT in this commit**. The `.md`, `.json`, `.mjs`, `.ts`, `.tsx`
and `.patch` evidence files ARE committed. If you need a cited log, look on this machine; if it is
gone, re-run the command in §6 and compare the numbers.

---

## 2. State at the checkpoint (all re-derived, not remembered)

```
backend suite      npx vitest run (from backend/)        10349 passed / 6 skipped / 1247 files / exit 0
frontend suite     npx vitest run (from frontend/)         8491 passed / 1644 files / exit 0
frontend types     node --max-old-space-size=16384 ./node_modules/typescript/bin/tsc --noEmit --pretty false   exit 0, ZERO errors
real PostgreSQL    S06_INTEGRATION_READY=true npx vitest run --config vitest.integration.config.mjs           5/5 (H02 persistence)
packet gates       FRESHNESS_OK · MARKDOWN_TABLES_OK · ENCODING_SCAN_OK · BOOT_GATE_OK · DRIFT_AUDIT_OK
rule-42 exposure   backend 68 untracked / 27 modified · frontend 49 untracked / 48 modified
controller state   preserved byte-identically, SHA256 93a9e7becbda69c92a02e4fa957f2c100a27d3b32dd020ccf30139b1bafd7f26
```

---

## 3. What was accomplished

**H-register rows — every row that was ever in question is resolved with evidence:**

* **H16** BUILT (rendered-PDF floor/rounds) · **H17** BUILT (SprintPlanner keyboard, dialog focus, `aria-pressed`) · **H23** BUILT (one runner clock per run session).
* **H19 MET — the largest piece of this work.** Three clauses, and clause 1 needed **two** fixes:
  1. *family allocation*: `Math.ceil` per family then `slice` dropped whole families (lunge and core vanished from an 8-exercise full_body day). Fixed with floor+remainder plus a top-up pass.
  2. *the top-up stranded deeper ranks*: `takeFrom(cat, 1)` bounded selection **before** the dedupe filter, and `selectExercises` re-ranks from the top on every call, so a re-ask returned the already-chosen picks and the day stayed short. Fixed with a per-family `takenPerFamily` tally so the re-ask requests `alreadyTaken + shortfall`.
  3. *stored pattern beats label*, but only within the family vocabulary — a stored pattern like `legs` names no single family, so trusting it would strand those exercises.
  4. *session-scoped recent window* (`recentSessionKeys`), replacing `slice(-7)` of one flat array.
* **H24, H25** — found **ALREADY MET** in code this packet never touched.
* **H26** — landed at **both** seams: the Brain seam validates day type against the shared `DAY_TYPES` (the same enum the Sprint create/update contracts import), bounds the headcount, and puts movement-pattern ID / recent boolean / setup bucket on the wire.
* **H27** — landed (`AbortSignal` + second options argument, abort on deadline, per-process occupancy slot with a bounded grace release).

**S-slices:** S03 done previously · S04's last remainder repaired (the logger's virtualized row renders the compact thumbnail, `aria-hidden`, with the test helper rescoped to `data-testid="exercise-row-name"`) · S05 and S07 IMPLEMENTATION VERIFIED · S06's integration proof re-run against real PostgreSQL at 5/5 · S08's two remainders carry passing coverage.

**Three hostile reviews, three real defects — all found in code written in this session:**
1. A **permanent occupancy wedge**: `unsettledOptionalBrainOps` was released only on provider settlement, so one never-settling adapter disabled the Brain for the whole process. Fixed (grace release + single-release guard + `AbortController` moved before the increment), regression-tested with the never-settling provider the suite had previously avoided.
2. A **bounded-grace deviation** (see §5 item 2) plus a **test that was blind to the guard it protected** — it passed on a guard-stripped copy. A second test now detects it.
3. The **short-day defect** in the generator (H19 clause 1 above), found via its own counterexample.

---

## 4. Tooling you will need (and its traps)

All five gates are **CWD-independent** and refuse loudly outside the packet:

```
node .mega-blueprints/artifacts/b214f060bbec9038/preflight-freshness.mjs   # freshness; --record after gates
node .mega-blueprints/artifacts/b214f060bbec9038/markdown-table-check.mjs
node .mega-blueprints/artifacts/b214f060bbec9038/drift-audit.mjs
node .mega-blueprints/artifacts/b214f060bbec9038/encoding-scan.mjs
node .mega-blueprints/artifacts/b214f060bbec9038/boot-gate.mjs
```

**Protocol order is GATES → `--record` → RECEIPT.** Editing a source file after running a gate
invalidates the ordering the manifest exists to protect, even when the content is restored
byte-identically (the mtime moves, and the ordering clause checks mtimes). Symptom: `STALE: no
<area> gate log postdates the newest source file`. Fix: re-run that area's gate, then `--record`,
then cite the gate the tool names.

**Traps this session hit repeatedly — do not repeat them:**

* `npx vitest run --reporter=basic` **runs zero tests** and looks like a pass. Use `dot` or `verbose`.
* `` `$text.Split($eol) `` binds to the **char-array** overload: it splits CRLF into two, and rejoining doubles every line break. Use `[regex]::Split($t, "\r?\n")` or leave line endings alone.
* PowerShell single-quoted strings need `''` for an apostrophe; `\"` is **not** an escape. **Use a here-string (`@'…'@`) for every code edit** — that has worked every time.
* .NET's `$` does **not** match before `\r`, so `(?m)^import .*$` finds nothing in a CRLF file.
* A **bare Node script** importing service modules can reach `DATABASE_URL`. Registry contents may only be read through vitest with `variationEngine.mjs` mocked.
* `frontend/tsconfig.json` **excludes** `**/*.test.ts(x)` — a green suite never proved the source compiled; that is what the explicit `tsc` gate is for.
* A `spawn EPERM` from the harness is **atomic**: nothing was written. Verify, then retry shorter.

---

## 5. OPEN ITEMS — start here

**1. A REAL DEFECT in the trainer-facing quality-gate report (found by the last review, NOT fixed).**
My top-up loop asks each family once per `while` iteration, and every `selectExercises` call appends a
gate-report entry (`workoutBuilderService.mjs:364-372`), which `generateWorkout` **sums over entries**
(`:903-906`) and flat-maps with a 20-item cap (`:910-912`). So a re-ask **double-counts exclusions**.
Executed pair on the current bytes:

```
CURRENT: day=12  "10 exercise(s) excluded during selection — 10 for safety (…)"
                 details: lunge_1…lunge_5 ;; lunge_1…lunge_5    ← the same 5 listed twice
HEAD:    day=10  "5 exercise(s) excluded during selection — 5 for safety (…)"
```

Only five lunge exercises exist and were excluded; "10" is false. Repeats can also crowd the 20-item
cap and push other families' reasons out of view. **Fix:** dedupe the gate report **per family**
(replace-by-category, or append only when that family's rejection set changed) at `:364-372`.
**Then add the assertion my tests lack** — nothing asserts the exclusion count or detail uniqueness,
and `tests/unit/exerciseSelectionSafetyFailsafes.test.mjs:146-148` still passes with "10 exercise(s)"
for 5 distinct exclusions. **Then** re-run the backend suite and all five gates and re-record.

**2. R-H27's bounded grace needs a PRODUCT DECISION (yours, Sean).** The review measured
`maxLive = 2` concurrent provider operations after a grace release with an adapter that ignores the
abort, while R-H27's text says *"retain that occupancy until settlement"*. Unbounded retention and
never-wedging are mutually exclusive, so one must give. Verified fact that shapes the options:
**no adapter consumes the `signal`** (a search across `backend/services` for `(prompt, options)` finds
only the unrelated `appendSwanCoachPlanningGuidance`), so the abort is currently **decorative** and the
grace is the only working containment. Options A (amend the text), B (accept with the contradiction
recorded), C (mandate `signal`; a provider-integration slice) — with costs and the recommendation
(A now, C separately) — are in the **DECISION REQUIRED** block of the disposition.

**3. The pre-commit audit is incomplete for the FRONTEND.** Rule 42's two commands cover `backend/`
only, while this tree holds **49 untracked and 48 modified frontend files**. Proven, not theoretical:
`frontend/src/components/WorkoutLogger/NASMExerciseRolodex.list.tsx` is untracked and is imported by
the tracked-and-modified `NASMExerciseRolodex.tsx:24`, so `git add -u` alone would ship an import
pointing at a missing file. Run both rule-42 commands against `frontend/` too. (This checkpoint commit
adds everything, so the exposure is closed *for this commit* — keep the audit for future ones.)

**4. A pre-existing, registry-data-dependent way to repeat an exercise in a day.** Two registry entries
**sharing one key** yield that key twice; two *different* keys for the same exercise also both appear
(names are key-derived). Reproduced under **both** current code and HEAD, so it is not a regression —
but no fixture exercises it, so no test guards it. Worth a fixture plus either a decision or a guard.

**5. Bounded, reported-not-fixed, observation:** the shared novelty budget is decremented *before* my
filter discards already-chosen re-picks, so a unit can be spent on a pick that is then dropped. The
reviewer could not turn it into a short, long or duplicate day.

**6. The generator review never issued a formal verdict** — it was **closed on evidence** (six rounds,
no new finding) after delivering items 1 and 4. If you want an independent eye on the tally
bookkeeping *as code* (not behaviour), that is the remaining value.

---

## 6. How to re-verify everything

```bash
# backend
cd backend && npm test                                  # expect 10349 passed / 6 skipped / 1247 files, exit 0

# frontend (the plain tsc heap-OOMs at exit 134 — the heap flag is required)
cd frontend && npx vitest run                           # expect 8491 passed / 1644 files
node --max-old-space-size=16384 ./node_modules/typescript/bin/tsc --noEmit --pretty false   # expect exit 0, 0 errors

# real PostgreSQL (fixture: port 55089, db rolodex_s06_test — see §7)
cd backend && S06_INTEGRATION_READY=true npx vitest run --config vitest.integration.config.mjs   # expect 5/5

# the five packet gates (from anywhere inside the packet)
node .mega-blueprints/artifacts/b214f060bbec9038/preflight-freshness.mjs     # FRESHNESS_OK
node .mega-blueprints/artifacts/b214f060bbec9038/markdown-table-check.mjs    # MARKDOWN_TABLES_OK
node .mega-blueprints/artifacts/b214f060bbec9038/encoding-scan.mjs           # ENCODING_SCAN_OK
node .mega-blueprints/artifacts/b214f060bbec9038/boot-gate.mjs               # BOOT_GATE_OK
node .mega-blueprints/artifacts/b214f060bbec9038/drift-audit.mjs             # DRIFT_AUDIT_OK
```

**Worked scenarios worth keeping** (all executed, all in the ledger):

| scenario | before | after |
|---|---|---|
| `full_body`, count 8, `excludedMuscles:['quads']` (lunge empty) | 7 exercises | **8** |
| depth curve, counts 6/8/12/20/30/40/50 | 5,7,10,17,25,34,42 | **6,8,12,20,30,40,50** |
| synthetic pool of 7 with one family holding 3 | 5 of 7 | **7 of 7** |
| 30-deep registry, lunge empty, count 12 | 10 of 12 | **12 of 12** |

---

## 7. Hazards, housekeeping, and stale files

* **The owned PostgreSQL fixture is STILL RUNNING**: pid **79488**, port **55089**, database
  `rolodex_s06_test`. It was left up for the integration proof (now done). Safe to stop.
* **`git stash list` holds 5 stashes belonging to OTHER branches** (badge-forge, coach-cc-v2,
  gemini-key-fix, four-surface-command-center, main). Unrelated to this work; left untouched. Do not
  pop them in a tree this dirty — that is a merge, not a read.
* **Superseded status files**: `CONTINUATION-STATUS-20260913.md` (and `…a/b/c/d`) contain rows that
  later rounds disproved (e.g. "S04/S05–S08 NOT STARTED"). `CONTINUATION-STATUS-20260913e.md` is the
  live one, and its **CLOSEOUT STATUS** block (appended round 189) is the entry point.
* **Stale-claim class, corrected five times:** the receipt's rows age independently, and a row citing
  an old command's output looks identical to one citing today's. Every numeric row now names its log;
  keep that convention.
* **The repository boundary**: HEAD is the baseline `c0cbe538d`; this checkpoint commit is the only
  commit on the branch. **Do not push to `main`** — that triggers Render auto-deploy (rule 13). The
  checkpoint was pushed as the **branch** only.

---

## 8. The session's most useful lesson, recorded for whoever continues

**Written explanations were the least reliable artifact produced.** Six times a belief recorded in the
ledger was overturned by a measurement (rounds 145, 179, 195, 197, 198, 204) — including one where I
asked a reviewer about duplicates while `unique=` sat unread in output I had already printed. Every
correction came from **running** something, never from rereading.

Two habits are worth carrying:

1. **Sort every unknown into "cheap to resolve by looking" versus "genuinely open."** The H26/H27
   requirement text, the "NOT STARTED" S04 claims, and the stashes were each a five-minute check that
   closed a listed item; the product decision in §5.2 is the genuine kind.
2. **Treat a test that goes red for a plausible reason as a FINDING, not an obstacle.** The permanent
   occupancy wedge lived for sixteen rounds because the suite caught it, the mechanism was written
   into a comment, and the *fixture* was changed instead of the code. The reviewer found nothing that
   had been missed — it found what had been written down and walked past.

And one about the review loop: **do not close it on your own measurements.** The loop was declared
"dry by measurement" one round before an independent review found §5.1.
