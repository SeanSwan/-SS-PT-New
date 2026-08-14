# HANDOFF — Hostile-review gate system + claim-integrity skill

**From:** vs-claude (Opus 5), session of 2026-08-12/13 · **To:** the next agent
**Read time target:** 5 minutes. This file is self-contained; you should not need the prior chat.

---

## 0. START HERE — do these three things before anything else

1. **`git fetch` and check divergence.** The prior session ran ~1,858 commits behind `origin/main`
   and that single fact caused most of its failures. `git rev-list --left-right --count
   origin/main...HEAD`.
2. **Read §4 (tree decision) before writing any code.** Building on the stale branch is the open
   question; do not continue Slice 2 until it is settled.
3. **Treat every artifact from the prior session as UNVERIFIED.** They are stamped. See §6.

---

## 1. What we are building and why

**Problem (owner's words):** hostile reviews declare "nothing left to fix," then the very next
reviewer finds real defects — every time, for months. The owner has been the error-detector all day
and wants that role automated away.

**Root cause found:** the existing `scripts/hooks/dry-loop-gate.mjs` enforces a **string**, not a
process. Its entire check is that the final assistant message matches
`/DRY-LOOP:\s*(CLEAN\s*[×x]\s*2|N\/A)/i` plus `/PROOF:\s*\S/i`. `PROOF: yes` satisfies it;
`DRY-LOOP: N/A — <any text>` waives it. A real six-round loop and a typed claim are
indistinguishable — so everyone downstream believes a check occurred.

**Deeper cause (Kimi, ratified):** self-review has a hard ceiling. "No termination rule the authoring
mind executes can exceed its own beliefs." Measured: Claude's loop ran to "dry" on a tool; Kimi's
*first* pass on the same code found 17 defects.

**The architectural fix:** gate decisions may depend ONLY on (i) hook-written state, (ii) tool-written
state, (iii) git itself. **Agent-written state is a claim, never evidence.**

## 2. The plan (authored by Kimi K3, committed)

- `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-PART-A-decisions-and-diagrams-2026-08-12.md` — T1–T5
  decisions, architecture, 4 mermaid diagrams (state, sequence, gate flowchart, ER).
- `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-PART-B-wireframes-build-order-slices-2026-08-12.md` —
  ASCII wireframes, 25-file build order, 10 numbered slices with **literal** acceptance commands.
- Supporting reviews: `KIMI-REVIEW-dry-loop-process-*`, `KIMI-REVIEW-of-architecture-packet-*`,
  `KIMI-REVIEW-false-absence-cascade-*` (the last is the most important — see §3).

**Owner's cadence rule (binding):** Kimi opens every hostile-review cycle (round 1), returns every
20th verified round, **and** reviews at every push — whichever comes first; a push anchor resets the
20-round window. Precedence on conflict: `R5 (owner stops being the sensor) > privacy boundary > R1 >
R4 > R2 > R3`.

**Build-time landmine (do not forget):** a Stop hook may **never** invoke `consult-kimi.mjs`
synchronously. Stop hooks cap at 30s; observed Kimi wall times were 219s, 654s, 894s. Paid reviews
run at the push boundary or detached with a sentinel.

## 3. The amendments that supersede parts of the plan

A later hostile review (`KIMI-REVIEW-false-absence-cascade-2026-08-13`) amended the blueprint. These
**override** Parts A/B where they conflict:

- **A1** — a verdict schema where `CLEAN` is unrepresentable without probe/scope/universe/control/
  precondition fields. Tri-state `UNKNOWN` that may never coerce to CLEAN. `universe.N == 0` → UNKNOWN.
- **A2** — freshness moves from **mtime to consumer-checked `subject_sha`**. "Producers don't enforce
  freshness on themselves; consumers enforce it on producers."
- **A3** — preconditions as renderable fields (a mutation score with `baseline_green:false` does not
  parse as a number).
- **A4** — crash tax: `pipefail`/`PIPESTATUS`, status taxonomy `completed|timeout|killed|crash`
  recorded into the artifact, temp-then-rename writes. **Without A4 every exit-code-based gate in the
  plan is defeated.**
- **A5** — gate qualification: embedded known-bad fixture per invocation, canary self-test on gate
  write, sha identity-pin (a gate edited since its last qualifying self-test cannot emit CLEAN).
- **A6** — trust-root integrity: verdicts/counters written only by hooks, hash manifest verified at
  session start.

## 4. THE OPEN DECISION — tree reconciliation (blocks Slice 2)

**State:** branch `wip/comms-notifications-2026-07-05`, ~1,858 behind / ~104 ahead of `origin/main`.

- `git merge-tree --write-tree origin/main HEAD` → exit 1, **1,128 conflicted paths**.
- All 10 files of commit `ed65bd909` are **net-new** to main → **0 collisions** on cherry-pick.
- Other agents commit to this branch concurrently (one hit *"restore 728 lines my own commit deleted
  by sweeping a dirty index"* today). Codex works in a separate worktree.

**Recommended (not yet approved by owner):** `git worktree add` a fresh tree from `origin/main`,
cherry-pick `ed65bd909` into it, continue there. Zero conflicts, zero disruption to the shared tree,
and main's real gates present. **Kimi recommended merge-over-rebase but did not know the conflict
mass was 1,128 files** — weigh that.

**Why it matters beyond convenience:** hooks execute from the working tree. Audited, control-validated:

| Hook | Status this session |
|---|---|
| `lesson-recall-gate.mjs` | on main, **absent here → never ran** |
| `frontend-guards.mjs` | on main, **absent here → never ran** |
| `hermes-inbox-reminder.mjs` | on main, **absent here → never ran** |
| `hermes-closeout-gate`, `dry-loop-gate`, `linear-sync-gate` | ran **non-main** versions all session |
| `drift-check-gate`, `db-blast-radius-gate` | local-only (main lacks them) |

The anti-repeat mechanism was missing from the tree where a lesson was repeated within the hour.

## 5. Current build state

**Slice 1 — COMMITTED as `ed65bd909`, verdict RE-OPENED as UNVERIFIED.**
`scripts/hooks/lib/gate-common.mjs` (~215 lines) + `gate-common.test.mjs` (14 tests).
Provides: telemetry contract (one line per gate run — allow, block, or crash, so silence becomes the
crash signal), O_EXCL counter lock w/ 120s stale TTL, file-based disable mechanism,
`isFreshThisSession` (contract: **UNKNOWN is never fresh**).

Proven at the time: `RESULT: PASS (14/14)` from committed blobs; acceptance block + S10 rollback
drill reproduced literally; mutation kill rate 1.00 post-adjudication vs 0.80 floor on a
verified-green baseline; secret scan clean.

**Why re-opened:** "slice complete" is itself an absence claim ("no remaining work"), produced on the
stale tree with instruments since proven faulty. Must be re-qualified post-reconciliation.
`docs/ai-workflow/mutation-equivalents.md` holds the written adjudication of the one equivalent mutant.

**Slices 2–10 — NOT STARTED**, deliberately. Slice 2 is the privacy-boundary gate (the only
fail-closed component).

## 6. Quarantined artifacts — do NOT ingest as wisdom

Three Hermes memos in `.ai-workflow/hermes-inbox/pending/` carry an `UNVERIFIED — QUARANTINED`
banner (`20260812T200500Z-*`, `20260813T041500Z-*`, `20260813T045500Z-*`). Their findings may be
true; their evidentiary basis is not qualified. Re-verify on the reconciled tree before promoting.
Note the inbox has ~100 undrained memos.

**One memo supersedes another:** `20260813T041500Z` states the probe "fails silently in Git Bash" —
that is the symptom. The cause (in `20260813T045500Z`) is MSYS path conversion rewriting `/flag`
arguments.

## 7. Platform traps that cost this session hours

- **`MSYS_NO_PATHCONV=1`** before any Windows command taking `/flags` (`reg`, `sc`, `net`,
  `schtasks`, `wmic`) **and** before `git show <rev>:<path>`. Without it, `reg query ... /v NAME`
  returns `ERROR: Invalid syntax`, and `git show` reports existing files as absent.
- **Never pipe a command whose exit code matters** — `cmd | tail` reports *tail's* status. Redirect
  to a file and echo `$?`, or use `PIPESTATUS`.
- **Never `2>/dev/null` a probe whose negative you intend to believe** — the error text is the only
  thing distinguishing "the world is empty" from "my instrument is broken."
- **Never `probe || echo "not found"`** — `||` fires on the entire nonzero domain. Use
  `case $? in 0) FOUND;; 1) NOT_FOUND;; *) UNKNOWN;; esac`.
- **Delete a target artifact before regenerating it**, so a stale file cannot impersonate a fresh one.
- **A mutation score requires a green baseline first**, else every mutant dies for free.

## 8. The `claim-integrity` skill — designed, NOT YET BUILT

Two independent reviews landed. Read both; they were commissioned with different jobs and they
**converge on the design while disagreeing on the root frame**, which is the useful part.

- `BLUEPRINT-claim-integrity-skill-KIMI-2026-08-13.md` — the build spec (40KB): mermaid flowchart,
  sequence diagram, ASCII wireframes, the complete `SKILL.md` body, file-by-file plan, numbered
  slices with literal acceptance commands. **Build from this.**
- `REVIEW-claim-integrity-skill-HY3-2026-08-13.md` — adversarial second opinion (11KB) that supplies
  the lanes Kimi's spec does not cover. **Fold these in before building.**

**Settled design (both agree):**
- Scope is **claim integrity, not absence** — 3 of the 7 incidents (I1/I3/I4) were *positive-signal
  lies*, so an absence-only skill catches under half. Dual polarity: `ABSENT_RX` + `DONE_RX`.
- **Enforcement lives in exactly one place: a Stop hook** (`claim-integrity-gate.mjs`). Kimi's
  correction of my E1 is the sharpest line in either review: *"a script the agent MUST call is still
  prose enforcing prose."* The script is the record-format authority; only the gate makes a claim
  unsendable.
- **UNKNOWN is a sanctioned output the gate never blocks.** Both independently warn that a gate
  demanding perfect discharge trains the agent to *forge records*. Make honesty the cheap path.
- **Mechanistic independence** — ≥2 records with ≥2 *distinct mechanism tags*. Two channels sharing a
  broken MSYS pattern are one channel twice.
- **E6 rejected as written by both**: session-entry qualification is a network tax that audits the
  wrong moment (I7 wasn't a session-entry failure — the hook did its job and was ignored).
  Replaced by **claim-time** repo checks: fetch inside the probe, record `origin_sha`/`behind`/
  `fetched_at`; fetch failure → UNKNOWN; and if `behind > 0`, worktree-local evidence (`ls`, `test -f`)
  is **insufficient mechanism** for an absence claim — the probe must hit the ref.
- **Self-application is mandatory** (E5): claims about the system itself carry `scope.type:"system"`,
  and the gate ships `--self-test` that must block a synthetic trigger transcript. HY3's phrasing:
  without it the skill becomes *"a privileged liar."*
- Gate fails **open** on internal error, logging `kind:"gate_error"` and counting it in the SLO — a
  gate that deadlocks a session teaches the owner to delete the gate.

**Where they disagree (decide before building):** Kimi's root frame is "no representable UNKNOWN."
HY3 rejects that as the *root* while keeping it as the *enforcement invariant*, arguing I2/I3/I4 were
not coercion at all — they were **well-formed, invalid-content** claims (a specific value that was
simply false), for which preserving UNKNOWN does nothing. HY3's root: *instrument-attribution error
under closure pressure*. Practical consequence: the skill must police **content validity** (baseline
green, object identity, write landed, denominator present) as hard as it polices unknown-preservation.
HY3 looks right here; Kimi's own spec already leans that way by adopting dual polarity.

**Lanes HY3 adds that Kimi's spec does not cover — fold in before building** (ranked):
1. **Context-pressure gating** — strictest at closeout / low remaining context, because that is
   precisely when the failures happen (I1 is the archetype).
2. **Temporal / stale-within-session** — a claim true at T1 is false at T2. Re-discharge at moment of
   use for mutable external state. *(This session: a lock verified stale was gone 40 min later; the
   branch drifted 67 commits mid-session; another agent committed 17 times.)*
3. **Metric disclosure** — any ratio ships N, D and baseline validity; `D=0` or red baseline → UNKNOWN,
   not a number.
4. **Documentation-inherited claims** — a doc is a claim by a past author, not ground truth.
5. **Hearsay / other agents' work** — cite the observable artifact, never another agent's self-report.
6. **Modal/predictive claims** ("won't break") — undischargeable; must downgrade to "found no evidence
   in scope S".
7. **User-intent claims** — never assert intent as fact; frame as interpretation. Prevents destructive
   action justified by a false intent claim.
8. **Write-confirmation** — after any write, re-read from the canonical path and confirm by hash.
9. **Causal attribution** — requires a controlled flip or an explicit "inferred, not observed" tag.
10. **Conjunction scope creep** — "the system is clean" must enumerate members checked.
11. **Access-denial disambiguation** — "cannot access X" is usually a broken probe, not a capability fact.

**Adoption rules (HY3, non-negotiable if this is to survive):** blocking not advisory; automatic
trigger the agent cannot elect to skip; one-command discharge (5 steps → forged records); precise
copy-pasteable block message naming the exact trigger word; low false-positive trigger set ("I'm done
for now" must not block, or the hook gets disabled in week one); SLO with a real denominator
(escaped-unqualified / total claims) since the owner misses some too.

Spend this session: ~$1.55 of paid review (Kimi ×6 ≈ $1.54, HY3 ×1 = $0.0054).
**Operational note:** two Kimi calls ran 894.9s and 1058.9s — both would have died at the 900s
default. Always raise `SWAN_KIMI_TIMEOUT_MS`.

## 9. Owner-owed actions (surface these at session start)

1. **🚨 ROTATE THE RENDER API KEY.** A key-shaped string was a Windows env var *name* (`setx` with
   name/value swapped) and passed through an LLM context. The local variable was deleted and
   verified gone; **only the owner can revoke it at Render.** Remind until confirmed.
2. **Restart Claude Code fully** so `LINEAR_API_KEY` (present in `HKCU\Environment`) reaches the MCP
   server and `scripts/linear-cli.mjs` — Windows fixes a process's environment at launch.
3. **Approve the tree reconciliation** (§4).
4. Standing: the DMARC record (SWA-13) and Render static-site headers (SWA-93) remain open.

## 10. Working agreement that produced good results

- Paid reviews: preflight (zero-call) first, report cost, then `--confirm-spend`. Always pass
  `--remit`; the default persona is a UI design reviewer and will produce a touch-target audit of a
  system with no UI.
- Raise `SWAN_KIMI_TIMEOUT_MS` (default 900s is too low — one call took 894.9s) and split large asks
  into parts, seeding part 2 with part 1.
- Hostile rounds use **mechanical vantages only** (locale rerun, golden corpus, mutation run,
  double-parse). Re-reading your own code is not a round.
- Commit per slice locally; push once per batch (Rule 70).
