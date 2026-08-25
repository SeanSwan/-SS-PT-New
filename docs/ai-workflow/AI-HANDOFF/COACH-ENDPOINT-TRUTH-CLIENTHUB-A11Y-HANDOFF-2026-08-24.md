# HANDOFF — Swan Coach endpoint truth + Client Hub accessibility
**Written:** 2026-08-24 · **By:** Opus 5 · **For:** Sean, and the next agent on any surface
**Branch:** `claude/coach-endpoint-truth-v2-20260824` @ `c699c8e6c` — pushed, **NOT merged, NOT deployed, NOT human-reviewed**
**Merge-base:** `9b12a3b22` · **Linear:** SWA-64
**Supersedes:** `DASHBOARD-CONVERGENCE-SWAN-COACH-HANDOFF-2026-08-23.md` (its §4.2 is retracted — see §2)

---

## 0. READ THIS FIRST — five things that will cost you a day

1. **The primary working tree is ~2,230 commits behind `origin/main`.**
   `c:\Users\BigotSmasher\Desktop\quick-pt\SS-PT` sits on `wip/comms-notifications-2026-07-05`.
   Nothing fixed there reaches production. This work was done in a worktree off
   `origin/main` at `c:/tmp/swan-p1a`. Run `git rev-list --count HEAD..origin/main` before
   trusting any file.

2. **`main` is moving fast — 15+ commits landed during this session.** Another agent is
   active. Re-fetch before every rebase decision, and expect your branch to fall behind
   between verification and merge.

3. **EVERY GitHub Actions gate is dead.** Blanket `startup_failure` across all workflows
   and all event types, including `schedule` — that is account-level (exhausted minutes or
   a billing block), not a workflow bug. **No CI will validate anything you merge.**
   Only github.com/settings/billing fixes it. Until then local verification is the *only*
   gate, so run the full suites, not a scoped subset.

4. **`tsc --noEmit` OOMs at 8GB.** Use `NODE_OPTIONS=--max-old-space-size=12288`, redirect
   to a file, and read `$?` directly. **Never pipe it to `tail`/`grep`** — you will read the
   pipe's exit code. This bit twice: a `grep -c` returning 1 for a zero count made a
   background task report "failed" when tsc had exited 0 with zero errors.

5. **Never `git stash pop` without confirming your own stash was created.** The stash stack
   is **repo-wide, shared across every worktree**. A clean tree means `git stash -u` creates
   nothing, and the following `pop` grabs *another session's* stash. That happened here: it
   dumped a foreign "trial merge B" into the tree mid-test-run and produced five conflicts.
   Recovery: `git checkout HEAD -- <files>` (a `reset --hard` is blocked by the
   irreversible-git-gate, correctly). A conflicted pop **keeps** the stash entry, so nothing
   was lost. Corollary: **never mutate the tree while a test run is in flight** — it
   contaminated a full suite run and produced 9 phantom failures.

---

## 1. What this workstream was for

Sean, 2026-08-22:
> "My components are in sync… I don't want two different components for the same thing…
> put the best component to win logically… and I want Swan Coach to be really smart and be
> the driver — manipulate the UI and the UX and log stuff and just do stuff just by telling it."

Two workstreams: **(A)** component convergence across admin ↔ trainer dashboards, and
**(B)** Swan Coach as an operator that drives the UI by voice. This session advanced the
groundwork for both and closed the P1 defect the previous handoff had left open.

---

## 2. THE HEADLINE — the previous handoff's top-ranked action was built on a false premise

The 2026-08-23 handoff ranked this as the day-one job:

> Build a contract test asserting, for every registry command, `roleRequired` ⊆ the
> middleware on its **actual mounted route**.

**I did not build it, because implementing it disproved it.** This is the single most
important thing to carry forward.

### Why the premise fails

`endpoint` is **declarative metadata**. Nothing dispatches on it. Execution selects a
service dispatcher by command **TYPE** (`commandDispatcher.mjs:347` `hasDispatcher`), never
by issuing an HTTP request to the app's own route. The route's middleware therefore never
runs for the Coach lane, so the two sides of the proposed law are never connected.

A repo-wide grep found exactly four consumers of `command.endpoint`, none of which dispatch:

| Consumer | What it does |
|---|---|
| `commandExecutor.mjs:512` | copies it into the destructive-op record |
| `destructiveOperations.mjs:34` | HMAC-signs it into the audit payload |
| `aiCommandRoutes.mjs:284` | `frontendEvent \|\| endpoint` as a response label — structurally unreachable, since every FRONTEND_DISPATCH command has a `frontendEvent` (now asserted) |
| `hermesCommands.mjs:12` | **a comment written by another author saying "Does NOT use command.endpoint for execution — endpoint is informational only"** |

That last row is independent in-repo corroboration that predates this session.

### The motivating example was backwards, not merely unproven

The handoff said a trainer using `schedule_session` "passes Coach's gate then eats a 403.
Fail-closed, so not a security hole." In fact the command is **wired**:
`dispatchScheduleSession` (`scheduleWriteDispatchers.mjs:113`) calls `assertTrainerOrAdmin(ctx)`
and pins `trainerId` to `ctx.user.id` for trainers. No route is contacted, no 403 exists, and
trainer access is deliberate and correctly scoped. **Nine of the ten flagged commands are
wired the same way.** Building the harness faithfully would have shipped a contract failing
ten correct-by-design commands, carrying the authority of a red test suite.

### The tell, before the proof

**Ten findings that were all the same shape**, eight of them from the same router. A real
drift sweep across 139 heterogeneous commands does not return one uniform failure mode.
Uniformity in a finding set is evidence about your *method*, not about the code.

### The transferable lesson

A plan hands you a task **and a premise**. The task is visible; the premise is the unwritten
sentence nobody states because it seems obvious ("the endpoint field is the execution path").
Cost asymmetry decides the order: testing this premise was one grep and two file reads —
about four minutes. Discovering it late cost the harness. Never discovering it would have
cost a permanent false law in the suite.

**A well-evidenced plan is harder to question, not easier** — its citations answer "is this
real?" convincingly while leaving "does this matter?" untouched. Every file:line in that
section was accurate; the conclusion still did not follow.

---

## 3. What shipped (15 commits)

### 3.1 Endpoint-truth contract + mount-resolved route extractor

`endpoint` is HMAC-signed into destructive-operation audit payloads, so an endpoint naming a
route that was never mounted points a forensic reviewer at fiction. That is worth locking,
and it is provable without semantic guessing.

**Files:** `backend/tests/helpers/{routeTable,sourceScan,roleGates}.mjs` (split three ways
for the 300-line cap), `backend/tests/api/aiCommandEndpointRouteTruth.contract.test.mjs`.

The extractor models what Express actually does: mount order (first match wins),
`router.use()` applying only to routes declared *after* it, one router mounted at several
prefixes, and stacked role gates **intersecting**. It resolves `app.use()` prefixes and joins
them to router paths (Rule 31). The tail-matching approach the prior handoff warned about —
which produced ~23 false positives — is not used.

**Five commands named routes that do not exist. One was a real error and is fixed:**
`set_availability` now declares `PUT /api/availability/:trainerId`, a real route whose gate
matches its declared roles. The remaining four are pinned with reasons, and the pin fails if
one *starts* resolving, so the list must be pruned rather than rot.

### 3.2 Client Hub accessibility — the P1 the prior handoff left open

The live hub was less accessible than the unmounted legacy view it replaced, and after that
view was deleted the guarantee was enforced by nothing.

| | Before | Now |
|---|---|---|
| Loading | `<LoadingPulse>Loading clients...</LoadingPulse>` — no role, no live region, silent to screen readers | `LiveRegion` announces it; `ContentArea` carries `aria-busy` |
| Error | *"Check your connection and reload the page."* | Real `Retry` button (44px, focus-visible) wired to `loadClients()` |

`ErrorNote` already supported `onRetry`; the hub simply never passed it. `loadClients()`
already cleared `loadError` on success and reset `loading` in a `finally`, so no hook changes
were needed.

**`components/ui/LiveRegion.tsx` is new and reusable.** It encodes two non-obvious rules that
every future async surface needs and would otherwise re-derive wrongly:
- **Render it unconditionally, swap `message`.** A region that mounts already containing its
  text is unreliably announced.
- **Keep it outside any `aria-busy` ancestor.** ARIA 1.2 lets assistive tech defer changes
  inside a busy subtree until busy clears — and a loading announcement nested in the
  container that is busy-while-loading gets deferred, then lost when the node unmounts.

Both rules are documented at the definition, not in a commit message.

### 3.3 Dead weight removed

- 31-file legacy `TrainerDashboard/ClientManagement/` tree (unmounted; two live contracts
  were coupled to it **by path**, so they were re-pointed first, not deleted).
- `dashboard-tabs.ts` 241 → 120 lines (three tab configs + two types, zero external importers).
- `AI_ACTION_PERMISSIONS` / `isAIActionAllowed` — deleted, with Sean's go-ahead. See §5.
- Two dead lazy exports.

### 3.4 Governance truth

`CLAUDE.md` + `AGENTS.md` said *"20 commands live, commandDispatcher.mjs 214 lines"* — four
months stale. Corrected to 139 registered / 112 wired / 391 lines, mirror verified in sync.

---

## 4. The GLM-5.3 hostile review — what landed, what did not, and why that matters

Ten findings. The calibration is more useful than the verdict.

### Landed and fixed (4)

1. **The aria-busy fix defeated itself.** My first version put the live region on the pulse
   *inside* the busy `ContentArea` — deferral-then-drop, the exact loss I had moved it to
   avoid, relocated one level up. Fixed by hoisting `LiveRegion` outside.
2. **Silent sub-mount drops.** Route subtrees the extractor could not follow were `continue`d
   without a trace. Now all four give-up paths record to `unresolved`, and a contract pins
   the exact set of six. **Two were invisible before** (`social/groups.mjs:279`,
   `adminRoutes.mjs:67`). Each was checked by hand against the pinned absences — all mount
   under `/api/plaud/*`, social groups, or admin-clients, so none can host the pinned paths.
3. **`ROLE_GATES` could rot silently.** `unknownGates` catches new middleware names but not a
   *known* gate whose implementation changed. Delete the admin override from `authorize()`
   and every ceiling silently becomes wrong. Now bound to the middleware source.
4. **A false security argument in my own comment.** See §5.

### Refuted — and both are my fault, not the reviewer's (2)

- **"`timingSafeEqual` throws on a client-controlled signature → DoS."** The operation comes
  from a server-side `pendingOps` Map (the signature is always server-generated), and the
  call is **already inside a try/catch** at `destructiveOperations.mjs:164`.
- **"Assertions masked by known-failing files."** The new contract file is not in the baseline.

Both rest on context my brief excerpted away. **A hostile reviewer given lines 30–45 of a
200-line file will invent the guard that lives at line 164.** The lesson is not "GLM
hallucinates" — it is that *excerpt boundaries are part of the question you asked*.

### Its best finding, which I did NOT fix

> `roleRequired` is hand-authored per command. 112 dispatchers are wired. You read three.
> Nothing you shipped tests that a dispatcher denies a below-role caller.

**This is correct and it is the honest next slice.** I refuted the harness's *framing* and
shipped an existence contract; the underlying authorization property remains untested. The
right harness was never "compare to route middleware" — it is *"invoke each dispatcher with a
below-role user and expect denial."*

---

## 5. Open findings — your call, not mine

1. **`AI_ACTION_PERMISSIONS` is now deleted.** It had zero production consumers (only a
   `vi.mock` stub) while labelled *"AI Village CRITICAL — prevents AI prompt injection from
   escalating privileges."*
   **Correction I had to make to my own note:** I first wrote that deletion was safe because
   "the first gate already covers it." That was wrong. `stepRBAC` answers **WHO** is calling
   and is satisfied trivially by an injected instruction riding an authenticated session; the
   deleted matrix was shaped to answer **WHAT the lane may be made to do**. The honest claim
   is narrower — *the control never ran, so deleting it removes nothing that was protecting
   anyone*. Action-shape containment currently rests on the intent classifier, the capability
   gate, per-dispatcher scoping, and the `not_wired` default, **none of which were designed
   as an anti-injection boundary.** If you want that boundary, build it in the command lane
   against the real command types, with tests.

2. **What `endpoint` should say for the 4 lane-internal commands.** They have no REST route,
   so any value is invented. Registry-wide convention call, not a per-row fix.

3. **Three branches now carry this work** — `fix/p1a-dead-myclientsview-export`,
   `claude/coach-endpoint-truth-clienthub-a11y-20260823`, and the current
   `claude/coach-endpoint-truth-v2-20260824`. I rebased twice and **did not force-push**
   (Rule 45), so each rebase needed a new name. A force-push would discard only my own
   superseded commits and would be tidier — **that is your call, and I will not do it
   unprompted.** The first two are superseded and can be deleted.

4. **Whole-source-tree scan tests are load-fragile.** `canonical-surface-names`,
   `tokenDiscipline`, `noForbiddenTrainingLanguage` and others walk ~5,400 files against a
   5000ms default timeout and intermittently exceed it — a *different* set fails each run,
   and one failed at 7005ms even in isolation. **Verified not mine:** my branch has 5,362
   files under `frontend/src` vs main's 5,391, so these walks are strictly *cheaper* here.
   Worth a `testTimeout` bump or a cached file list; not fixed in this pass (Rule 37).

5. **Two pre-existing flakes** — `memberDirectoryLateralProbe` (backend) and
   `AdminViewAsWrapper` — pass in isolation, did not recur across repeated full runs.

---

## 6. Verification — and what it does not prove

**Final state, on the exact committed HEAD:**
- `tsc --noEmit` true exit **0**, **0 errors** (12GB heap, redirected not piped)
- `vite build` exit **0**
- **Full backend suite: failing-file set BYTE-IDENTICAL to `known-failing-baseline.json`**
  (23 files, recorded 2026-08-19). Zero regressions and zero accidental fixes — compared as
  *sets*, not counts, because 23-vs-23 would hide a swap.
- **Full frontend suite: 1584 files / 8025 tests pass** (achieved on three separate runs;
  see §5.4 for the load-fragile scans that intermittently time out).
- **All new assertions mutation-tested** — break the law, confirm non-zero exit, restore,
  verify byte-identical with `diff -q`.
- Secret scan **CLEAN** on every changed file; pre-commit hex/token/palette guards clean.

**What it does not prove** (stated because silence reads as coverage):
- No dispatcher-authorization coverage — §4's best finding.
- No browser journey. The a11y fix is proven by a behavioural jsdom test asserting the real
  invariant (exactly one `aria-busy` region; the announcer is **not** contained by it; the
  visible loading text **is**), not by a real screen reader.
- The extractor does not model cross-mount middleware inheritance. Documented in its header.
  Direction matters: it can only make a ceiling too **permissive**, never too restrictive, so
  it cannot manufacture a false absence — and existence is all the shipped contract asserts.
- **Local verification is the only gate right now** — see §0.3.

---

## 7. Recommended next slice

**Dispatcher authorization harness.** For each wired command, invoke its dispatcher with a
below-role actor and assert denial. That is the property the retracted parity harness was
reaching for, tested where the gate actually lives. It reduces risk on the existing
139-command surface rather than adding surface, and it is the one thing a hostile reviewer
and I independently agree is missing.

Then, in order: sidebar renderer convergence (produces the shared route registry a voice
navigation lane needs) → Swan Coach navigation lane.

---

## 8. Where the evidence lives

| Artifact | Path |
|---|---|
| GLM-5.3 hostile review | `docs/ai-workflow/AI-HANDOFF/GLM-HOSTILE-REVIEW-ENDPOINT-TRUTH-2026-08-24.md` |
| The brief that produced it | `docs/ai-workflow/AI-HANDOFF/HOSTILE-BRIEF-GLM-ENDPOINT-TRUTH-2026-08-24.md` |
| Prior handoff (§4.2 retracted) | `docs/ai-workflow/AI-HANDOFF/DASHBOARD-CONVERGENCE-SWAN-COACH-HANDOFF-2026-08-23.md` |
| Durable learning packet | `docs/ai-workflow/hermes-learning-packets/20260823-an-inherited-plans-premise-is-the-first-thing-to-test.md` |
| Hermes inbox memo | `.ai-workflow/hermes-inbox/pending/20260823T120000Z-*.md` |

---

## 9. Process notes that will save you a rework

- **Mutation-test every assertion you write or re-point.** One of mine passed while asserting
  nothing: a windowed regex (`export const authorize[\s\S]{0,600}?…`) spilled past the end of
  the function into neighbouring middleware, so deleting the thing it guarded left it green.
  A `bodyOf()` slice is what made it able to fail. **A guard that cannot fail is worse than no
  guard** — it converts an unchecked area into one that looks checked.
- **A guard must not match its own documentation.** This happened to me **three times in one
  session**: `not.toContain('aria-busy="true"')` failed on the comment explaining why
  `aria-busy` is wrong; then a comment naming a banned CSS declaration tripped the contract
  banning it. Match structurally, and when a file both bans a literal and explains the ban,
  never name the literal in prose.
- **Validate the instrument before believing a negative.** The extractor silently dropped a
  file's only route because a regex literal containing quotes (`/[&<>"']/g`) put the scanner
  into a string state it never left. A grep-vs-parser count caught it. That guard is now a
  permanent test — the difference between a lesson that *runs* and a lesson that is merely
  *written down*.
- **Before deleting a file, grep for its PATH, not just its symbols.** Contract tests and
  fixtures couple to files by path without importing them. That is how a "dead" 31-file tree
  turned out to be load-bearing for two live contracts.
- **An inherited "verified" claim is a hypothesis.** The prior handoff said
  `ClientSelfOnboardingWizard` had "verified zero refs." It is used at `routeComponents.tsx:178`
  — *in the same file*. Only a same-file grep stopped me deleting live code.
- **Verify `git branch --show-current`; never infer it.** `git branch -f` moves a pointer, it
  does not switch branches. Two commits landed on the wrong branch and were caught only
  because a push said "Everything up-to-date" while the count disagreed.
