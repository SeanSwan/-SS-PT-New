# MASTER HANDOFF — the hostile-review gate system

**From:** vs-claude (Opus 5), sessions of 2026-08-12 → 2026-08-15
**To:** the next agent · **Supersedes:** `HANDOFF-hostile-review-gate-system-2026-08-13.md`
**Status:** Slice 1 SHIPPED to production. Slices 2–10 and the `claim-integrity` skill NOT started.

---

## 0. READ THIS FIRST — three things before you touch anything

1. **`git fetch` and check divergence.** The working branch is ~1,948 commits behind `origin/main`.
   That single fact caused most of the failures recorded here. Verify every "X doesn't exist" claim
   against `origin/main`, not against the working tree.
2. **Never claim something is missing/broken/clean until you have run the same probe against a
   known-present control.** See §7 — six false claims in one session, five caught by Sean, not by me.
3. **The shipped work is on `origin/main`, not on the working branch.** Build further slices in a
   worktree cut from `origin/main` (§6), not in the stale tree.

---

## 1. Where this started — Sean's complaint

Verbatim intent: hostile reviews declare "nothing left to fix," then the very next reviewer finds
real defects — every time, for months. *"How can I trust any of my code if this happens every single
time?"* He had already written a rule for this (the Dry-Loop Law) and a hook to enforce it, and it
was still happening. He wanted to know why, and to stop being the person who notices.

## 2. What the investigation found

**The gate enforced a string, not a process.** `scripts/hooks/dry-loop-gate.mjs` passed a turn if the
final assistant message matched `/DRY-LOOP:\s*(CLEAN\s*[×x]\s*2|N\/A)/i` plus `/PROOF:\s*\S/i`.
`PROOF: yes` satisfied it. `DRY-LOOP: N/A — <any text>` waived it outright. A genuine six-round loop
and a typed claim were indistinguishable — so everyone downstream believed a check had occurred.
That is worse than no gate.

**But that was not the root cause.** Kimi K3 refuted the first diagnosis: fixing enforcement without
fixing *who reviews* yields "a perfectly enforced loop that still plateaus at the author's ceiling —
you'd have upgraded the lock on an empty room." The real cause: **the searcher, the judge, the
witness and the court reporter are the same mind.** No termination rule that mind executes can exceed
its own beliefs.

**Measured, twice, on this repo's own code:**
- Claude's loop ran to "dry" on swan-scout; Kimi's *first* pass found 17 defects.
- Claude's loop ran 6 rounds on gate-common, scored 1.00 on mutation, declared dry; Kimi's *first*
  pass found a race where **both agents can hold the counter lock simultaneously** — in the module
  whose only job is preventing that.

## 3. The architecture (Kimi K3, committed and on main)

- `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-PART-A-decisions-and-diagrams-2026-08-12.md` — T1–T5
  decisions, architecture, 4 mermaid diagrams (state, sequence, gate flowchart, ER).
- `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-PART-B-wireframes-build-order-slices-2026-08-12.md` —
  ASCII wireframes, 25-file build order, 10 slices with **literal executable acceptance criteria**.

**The core rule:** gate decisions may depend ONLY on (i) hook-written state, (ii) tool-written state,
(iii) git itself. **Agent-written state is a claim, never evidence.**

**Sean's cadence rule (binding):** Kimi opens every hostile-review cycle (round 1), returns every
20th verified round, **and** reviews at every push — whichever comes first; a push anchor resets the
20-round window. Hostile reviews use high-end models only. Precedence on conflict:
`R5 (owner stops being the sensor) > privacy boundary > R1 > R4 > R2 > R3`.

**Build-time landmine:** a Stop hook may **NEVER** invoke `consult-kimi.mjs` synchronously. Stop
hooks cap at 30s; observed Kimi wall times were 219s, 323s, 654s, 894s, 1058s. Paid reviews run at
the push boundary or detached with a sentinel.

### Amendments A1–A6 — these OVERRIDE Parts A/B where they conflict
From `KIMI-REVIEW-false-absence-cascade-2026-08-12.md`:
- **A1** — verdict schema where `CLEAN` is unrepresentable without probe/scope/universe/control/
  precondition fields; tri-state `UNKNOWN` that may never coerce to CLEAN; `universe.N == 0` → UNKNOWN.
- **A2** — freshness moves from **mtime to consumer-checked `subject_sha`**. *"Producers don't
  enforce freshness on themselves; consumers enforce it on producers."*
- **A3** — preconditions as renderable fields (a mutation score with `baseline_green:false` does not
  parse as a number).
- **A4** — `pipefail`/`PIPESTATUS`, status taxonomy `completed|timeout|killed|crash`, temp-then-rename
  writes. **Without A4 every exit-code-based gate in the plan is defeated.**
- **A5** — gate self-qualification: embedded known-bad fixture per invocation, sha identity-pin (a
  gate edited since its last qualifying self-test cannot emit CLEAN).
- **A6** — trust root written only by hooks; hash manifest verified at session start.

## 4. What SHIPPED (verified on origin/main)

**Commit `eb0b464ad`** — 9 files, 2,076 insertions. Re-verified 2026-08-15: all 4 code files still
present on `origin/main` and **untouched** by the 82 commits landed since.

- `scripts/hooks/lib/gate-common.mjs` (270) — telemetry contract, typed JSON I/O, atomic writes,
  disable mechanism, session anchor, `isFreshForSha`.
- `scripts/hooks/lib/gate-lock.mjs` (192) — the counter lock, split out after the CRITICAL findings.
- `gate-common.test.mjs` (15 tests) + `gate-lock.test.mjs` (10 tests).
- `docs/ai-workflow/mutation-equivalents.md` — written adjudications (an "equivalent mutant" claim
  without a written adjudication is an excuse, not a verdict).

**Slice 1 was rebuilt after BOTH reviewers returned DO-NOT-SHIP.** Fixed defects:
- **S1 CRITICAL** — stale-lock steal was TOCTOU; two agents could hold the lock. Fixed with atomic
  rename **plus inode identity binding** — the reviewer's own rename-only fix was incomplete (A
  renames L1 away and creates L2; B then renames L2 away — same bug one step later).
- **S2 CRITICAL** — `releaseCounterLock` unlinked unconditionally, so a slow-but-alive holder deleted
  the *thief's* lock on release. Locks now carry `{pid, token, ts}`; release verifies ownership.
- **S3/D3 HIGH** — `failOpen` discarded the telemetry return, producing a **silent allow**; the
  module was manufacturing the very silence its contract calls the crash signal.
- **S4/D2 HIGH** — `touchSessionStart(new Date(0))` made every artifact ever written "fresh": a
  one-line bypass. Replaced by `stampSessionStart` (clamps backwards, content-bearing). mtime
  freshness demoted to `mtimeLooksFresh` (heuristic); `isFreshForSha` is load-bearing.
- **S5/D1 HIGH** — kill switch was silent and traversable (`isDisabled('../../x')` escaped). Now
  sanitized, lowercased, telemetered once/process, `listDisabled()` added, `SWAN_DISABLE_ROOT`
  supported so markers can live outside agent-writable space.
- **S6 MEDIUM** — `readJsonSafe` collapsed missing/corrupt/unreadable; EACCES read as "no data yet"
  and fell open where the architecture requires fail-closed. Now a discriminated result.
- **S8** — added `writeJsonAtomic` so temp-then-rename is the easy path.

**Windows portability bug found by running the fix:** `fstatSync` reports `dev=1417332449` while
`statSync` reports `dev=0` for the same file, so comparing `dev` made the true owner unable to
release its own lock. **It would have passed on Linux CI.** Token is the identity; inode corroborates;
`dev` is never compared.

## 5. How it was shipped from a stale tree (reusable recipe)

Merging the branch meant 1,128 conflicted files. Instead:
1. **Prove additivity:** `git cat-file -e origin/main:<path>` → 0/8 collisions; `git grep` on main →
   nothing imports them; `render.yaml` `buildCommand` → outside the build path.
2. `git worktree add <dir> -b <branch> origin/main` — a worktree has its **own index**, so another
   agent's lock does not block it and nothing they are doing is disturbed.
3. **Re-qualify there** (both reviewers made this their ship condition): 15/15, 10/10, 4/4
   byte-identical.
4. **Run the target tree's own suite with your files present** — main's six hook suites all passed.
5. Rebase to fast-forward; **re-run tests after the rebase**, not before.
6. **Verify from the remote:** extract blobs back out of `origin/main` and run them.
7. Health-check production with a control (`github.com → 200`) so a network fault can't fake health.
   `sswanstudios.com → 200`, backend `/health → 200`.

## 6. Current state (verified 2026-08-15)

| Fact | Value |
|---|---|
| Shipped commit | `eb0b464ad` on `origin/main`, 4/4 code files intact, untouched by 82 later commits |
| Working branch | `wip/comms-notifications-2026-07-05` — ~1,948 behind / ~136 ahead |
| Render deploy source | `main` only (both services pinned in `render.yaml`) |
| Slice 1 | SHIPPED and re-qualified on main |
| Slices 2–10 | NOT started. Slice 2 = privacy-boundary gate (the only fail-closed component) |
| `claim-integrity` skill | DESIGNED, not built (§8) |
| `scripts/consult-glm.mjs` | tracked locally, **NOT on main** — will be lost unless carried over |
| `ZAI_API_KEY` | SET (GLM reviews are runnable) |

## 7. Traps that cost this session hours — do not rediscover these

- **`MSYS_NO_PATHCONV=1`** before any Windows command taking `/flags` (`reg`, `sc`, `net`, `schtasks`,
  `wmic`) **and** before `git show <rev>:<path>`. Without it `reg query ... /v NAME` returns
  `ERROR: Invalid syntax` and `git show` reports existing files as absent. **This one caused me to
  tell Sean twice that a key he had correctly set was missing.**
- **Never pipe a command whose exit code matters** — `cmd | tail` reports *tail's* status. A Kimi call
  that aborted on timeout was announced as "exit code 0".
- **Never `2>/dev/null` a probe whose negative you intend to believe.** Four occurrences this session;
  the most repeated error class in it.
- **Never `probe || echo "not found"`** — `||` fires on the entire nonzero domain. Use
  `case $? in 0) FOUND;; 1) NOT_FOUND;; *) UNKNOWN;; esac`.
- **Delete a target artifact before regenerating it**, or a leftover impersonates a fresh result.
  Verify freshness (mtime / `subject_sha`), never existence-plus-non-empty.
- **A mutation score against a red baseline is meaningless** — every mutant dies for free. Assert
  green first. I reported 1.00 from a broken run.
- **Escape sequences get literalized between here and disk.** A NUL escape became a real NUL byte
  three times, including inside the comment warning about it. Build control characters from
  `String.fromCharCode(0)`.
- **Two agents share this tree.** Stage and commit in ONE uninterrupted command — my six files were
  swept into another agent's commit in the gap between `git add` and `git commit`. `git commit --only`
  protects tracked files but **cannot commit untracked ones**.

## 8. The `claim-integrity` skill — designed, not built

Packet: `PACKET-claim-integrity-skill-2026-08-13.md`. Two reviews:
- `BLUEPRINT-claim-integrity-skill-KIMI-2026-08-13.md` (40KB) — **build from this**: mermaid
  flowchart, sequence diagram, wireframes, the `SKILL.md` body, file plan, slices.
- `REVIEW-claim-integrity-skill-HY3-2026-08-13.md` — **fold these in first**: 11 uncovered lanes.

Both agree: scope is **claim integrity, not absence** (3 of 7 incidents were positive-signal lies);
enforcement in exactly one Stop hook; **UNKNOWN is a sanctioned output the gate never blocks** (a gate
demanding perfect discharge trains the agent to forge records); mechanistic (not logical)
independence; self-application mandatory or the skill is "a privileged liar" (HY3).

They disagree on the root frame — Kimi says "no representable UNKNOWN"; HY3 says that's the
enforcement invariant but not the root, because I2/I3/I4 were **well-formed invalid-content** claims
(a specific value that was simply false), for which preserving UNKNOWN does nothing. HY3's root:
*instrument-attribution error under closure pressure*. Consequence: police content validity (baseline
green, object identity, write landed, denominator present) as hard as unknown-preservation.

HY3's uncovered lanes, ranked: context-pressure gating; temporal/stale-within-session; metric
denominators; doc-inherited claims; hearsay about other agents; modal/predictive claims; user-intent
claims; write-confirmation; causal attribution; conjunction scope creep; access-denial
disambiguation.

## 9. IMMEDIATE NEXT TASK (Sean's last instruction, not yet done)

**Run a GLM-5.3 hostile review of the shipped Slice 1 work, then apply every fix it justifies.**

```bash
node scripts/consult-glm.mjs \
  --document docs/ai-workflow/AI-HANDOFF/PACKET-slice1-hostile-review-2026-08-13.md \
  --out docs/ai-workflow/AI-HANDOFF/GLM-HOSTILE-slice1-2026-08-15.md \
  --model glm-5.3 --max-tokens 32000 \
  --remit "<explicit hostile CODE review remit — terminal/file surfaces only, no UI/design rubric>"
```

Interface notes (verified): flags are `--document --out --remit --model --max-tokens`; default model
is already `glm-5.3`; **no spend gate** (subscription-billed, but it consumes coding-plan credit);
the transport streams because GLM-5.3 can think for minutes before the first token and Node's fetch
aborts at ~300s otherwise. **Always pass `--remit`** — the Kimi transport's default persona is a UI
design reviewer and produced a touch-target audit of a system with no UI; do not assume GLM differs.
**Delete the `--out` target before running**, and verify freshness + non-empty afterwards.

The packet already contains the full source of both modules plus the 7 hostile questions. Update it
first to reflect the post-fix code (it currently embeds the pre-fix v1 source).

## 10. Then, in order

1. Apply GLM's justified findings; hostile-loop to dry; ship via the §5 worktree recipe.
2. **Carry `scripts/consult-glm.mjs` to main** — it exists only on the working branch today.
3. Build the `claim-integrity` skill (§8), Kimi's blueprint + HY3's lanes.
4. Slices 2–10 from Blueprint Part B, applying amendments A1–A6.
5. Reconcile or retire the working branch: 136 commits of other agents' work have never reached main.

## 11. Sean's owed actions — surface at session start until done

1. **🚨 ROTATE THE RENDER API KEY.** A key-shaped string was a Windows env var *name* (`setx` with
   name/value swapped) and passed through an LLM context. The local variable was deleted and verified
   gone; **only Sean can revoke it at Render.**
2. **DMARC record (SWA-13)** and **Render static-site headers (SWA-93)** remain open.
3. Linear MCP tools are now loading, so the earlier restart appears to have taken effect — verify
   before relying on it.

## 12. How to work here

- Paid reviews: preflight (zero-call) first, report cost, then `--confirm-spend` (Kimi/HY3).
  **Always pass `--remit`.** Raise `SWAN_KIMI_TIMEOUT_MS` — the 900s default killed one call.
  Split large asks into parts and seed part 2 with part 1.
- Hostile rounds use **mechanical vantages only** — locale rerun, golden corpus, mutation run,
  double-parse. Re-reading your own code is not a round.
- Commit per slice locally; push once per batch.
- Close with plain-English first, then technical. Name the next slice every time.
- Emit a Hermes memo at substantial closeouts **with a `## Mistakes I made` section** — repeats are
  the highest-value entry it can contain.
