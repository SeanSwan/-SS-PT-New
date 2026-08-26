# HANDOFF — Swan Coach endpoint truth + Client Hub a11y
**Written:** 2026-08-25 · **By:** Opus 5 · **For:** the next agent, any surface
**Branch:** `claude/coach-endpoint-truth-v2-20260824` @ `6498ac5aa` — pushed, **NOT merged, NOT deployed, NOT human-reviewed**
**Linear:** SWA-64
**Supersedes:** `COACH-ENDPOINT-TRUTH-CLIENTHUB-A11Y-HANDOFF-2026-08-24.md` and the 2026-08-23 dashboard-convergence handoff (its §4.2 is retracted — see §2)

> **SUPERSEDED 2026-08-26 by `COACH-OWNERSHIP-HANDOFF-2026-08-26.md`.** §5.1 (dispatcher
> authorization) is DONE — below-role denial is proven over all 303 pairs, and the ownership
> question it could not reach has since been answered, closing two live cross-tenant holes.
> Read the newer handoff for current state; this file remains accurate as the record of what
> that session found and why.

---

## 0. READ THIS FIRST — six traps that will cost you a day

1. **The primary working tree is ~2,230 commits behind `origin/main`.**
   `c:\Users\BigotSmasher\Desktop\quick-pt\SS-PT` sits on `wip/comms-notifications-2026-07-05`.
   Nothing fixed there reaches production. This work lives in a worktree off `origin/main`
   at `c:/tmp/swan-p1a`. Run `git rev-list --count HEAD..origin/main` before trusting a file.

2. **`main` moves fast** — 15+ commits landed mid-session, twice. Re-fetch before every
   rebase decision and expect to fall behind between verification and merge.

3. **EVERY GitHub Actions gate is dead.** Blanket `startup_failure` across all workflows
   and all event types including `schedule` — account-level (billing), not a workflow bug.
   **Nothing validates a merge right now.** Local verification is the only gate, so run the
   full suites, never a scoped subset. Fix at github.com/settings/billing.

4. **`tsc --noEmit` OOMs at 8GB.** Use `NODE_OPTIONS=--max-old-space-size=12288`, redirect
   to a file, read `$?` directly. **Never pipe it** — you read the pipe's exit code. A
   `grep -c` returning 1 for a zero count made a background task report "failed" while tsc
   had exited 0 with zero errors.

5. **Never `git stash pop` without confirming your own stash was created.** The stash stack
   is **repo-wide across every worktree**. A clean tree means `git stash -u` creates nothing
   and the following `pop` grabs *another session's* stash — that happened, dumping a
   foreign "trial merge B" into the tree mid-test-run and producing five conflicts.
   Recovery is `git checkout HEAD -- <files>` (`reset --hard` is blocked by the
   irreversible-git-gate, correctly). A conflicted pop KEEPS the stash entry, so nothing is
   lost. **Corollary: never mutate the tree while a test run is in flight** — it
   contaminated a full suite run and produced nine phantom failures.

6. **`git branch -f` does NOT switch branches.** It moves a pointer. I lost commits to the
   wrong branch **twice**, including committing the handoff that documents this trap.
   **Run `git branch --show-current` immediately before any commit that follows a
   `branch -f` / `checkout` / rebase.** A push saying "Everything up-to-date" while the
   unpushed count disagrees is the symptom.

---

## 1. What this workstream is for

Sean, 2026-08-22:
> "My components are in sync… I don't want two different components for the same thing…
> and I want Swan Coach to be really smart and be the driver — manipulate the UI and the
> UX and log stuff and just do stuff just by telling it."

Two lanes: **(A)** component convergence across admin ↔ trainer dashboards, **(B)** Swan
Coach as a voice-driven operator. This branch does groundwork for both and closes the P1
accessibility defect the earlier handoff left open.

---

## 2. THE HEADLINE — a prior handoff's top-ranked task rested on a false premise

The 2026-08-23 handoff ranked this first:

> assert, for every registry command, `roleRequired` ⊆ the middleware on its actual
> mounted route.

**I refused to build it, because implementing it disproved it.** Carry this forward.

`endpoint` is **declarative metadata**. Nothing dispatches on it. Execution selects a
service dispatcher by command **TYPE** (`commandDispatcher.mjs:347`), never by issuing an
HTTP request to the app's own route — so the route's middleware never runs for the Coach
lane and the two sides of the proposed law never meet.

Four consumers exist repo-wide, none of which dispatch:

| Consumer | Role |
|---|---|
| `commandExecutor.mjs:512` | copies it into the destructive-op record |
| `destructiveOperations.mjs:34` | HMAC-signs it into the audit payload |
| `aiCommandRoutes.mjs:284` | `frontendEvent \|\| endpoint` as a label — unreachable, since every FRONTEND_DISPATCH command has a `frontendEvent` (asserted) |
| `hermesCommands.mjs:12` | a comment by another author: *"endpoint is informational only"* |

The motivating example was **backwards**, not merely unproven. The handoff said a trainer
using `schedule_session` "eats a 403." The command is wired: `dispatchScheduleSession`
(`scheduleWriteDispatchers.mjs:113`) calls `assertTrainerOrAdmin(ctx)` and pins `trainerId`
to `ctx.user.id`. No route is contacted. Nine of ten flagged commands are the same.

**This claim is now permanently asserted** (`aiCommandEndpointRouteTruth.contract.test.mjs`,
"no client-side surface can turn a command endpoint into an HTTP request") because all three
panel seats attacked it on the same ground: my original evidence was a **backend-only grep**
while `/api/ai-command/commands` hands a command list to the browser. Verified: the response
picks fields explicitly and `endpoint` is not among them; `getCommandExecutionLane` returns
only lane metadata; no frontend file reads `.endpoint` off a command. Mutation-tested by
serializing `endpoint` into the response — the assertion fires.

**The lesson:** a plan hands you a task *and a premise*. Testing this premise cost one grep
and two file reads. Discovering it late cost the harness. Never discovering it would have
put a permanent false law in the suite. The tell arrived first: **ten findings all of the
same shape**, eight from one router. Uniformity in a finding set is evidence about your
method, not the code.

---

## 3. What shipped (21 commits)

**Endpoint-truth contract + mount-resolved route extractor** —
`backend/tests/helpers/{routeTable,sourceScan,roleGates}.mjs`,
`backend/tests/api/aiCommandEndpointRouteTruth.contract.test.mjs` (12 assertions).
`endpoint` is HMAC-signed into destructive-op audit payloads, so an endpoint naming a route
that was never mounted points a forensic reviewer at fiction. Five commands did that; one
was a plain factual error and is **fixed** (`set_availability` → `PUT
/api/availability/:trainerId`); four are pinned with reasons and the pin fails if one starts
resolving.

**Client Hub accessibility** — roster loading was silent to screen readers and the error
path said *"reload the page"* on a hub whose container already had `loadClients()`.
Now `components/ui/LiveRegion.tsx` (reusable) + a real 44px Retry button.

**Dead weight** — 31-file unmounted legacy tree, `dashboard-tabs.ts` 241→120,
`AI_ACTION_PERMISSIONS` (zero consumers), two dead lazy exports.

**Governance truth** — CLAUDE.md/AGENTS.md said *"20 commands, 214 lines"*; corrected to
139 registered / 112 wired / 391 lines.

---

## 4. Three hostile-review rounds — and the calibration that matters more than the verdicts

**Round 1 (GLM-5.3 solo)** — 4 landed, 2 refuted. **Both refutations were my fault**: I
pasted 15 lines of a 200-line file and the reviewer correctly reasoned about code whose
guard sat 120 lines below the excerpt. *Excerpt boundaries are part of the question you ask.*

**Round 2 (Ox Alpha + GLM-5.3 + HY3, full files)** — 8 landed, 2 refuted, near-zero waste.
The brief shipped complete files for the five most defect-prone units plus an explicit
"do not spend findings here" list.

**The free seat (Ox Alpha, $0.0000) was strongest for the second consecutive round.**
HY3 cost $0.0077. GLM is subscription. Findings that landed:

- **The matcher was unsound in the exact direction its header said it could not be.**
  `segments()` ran a query-strip over ROUTE patterns, so `/user/:id?` silently became
  `/user/:id`; and `*` was treated as one segment when Express compiles it to `(.*)`.
  Both manufacture false absences. Fixed and verified across 12 cases.
- **An unknown gate read as "public."** `roleCeiling` returned `allowedRoles:null,
  authRequired:false` for unclassifiable middleware — indistinguishable from ungated. Rows
  now carry `ceilingUnknown`, and the number it exposes is the finding: **903 of 1672 rows
  (54%)** contain a middleware this table cannot classify.
- **Three of eight gates were bound to nothing** (`requireAdmin` et al. live in
  `adminMiddleware.mjs`, which no assertion read).
- **A factual error in my own comment** — it claimed all six unresolved entries mount under
  plaud/groups/admin-clients; `authRoutes.mjs:368` is under `/api/auth` and is path-scoped
  middleware, not a sub-mount at all.
- **A stale comment contradicting its own assertion** in the a11y test.
- Two parser blind spots (`.route()` chaining, non-`router` identifier) **pinned** rather
  than left unknown.

### The most useful thing in this section

**A convergent panel recommendation is still a hypothesis.** Ox and GLM independently
proposed changing the zero-route guard from `parsed === 0` to `parsed < naive`. A probe
found a live shortfall — `workoutRoutes.mjs`, naive 14 vs parsed 13 — which looks like
proof they were right. **It is not.** The missing route sits inside a `/* REMOVED */`
block: the parser is correct and the *naive grep* is the naive one. Shipping their fix
would have failed the suite immediately on legitimate code.

Also refuted: `toHaveTextContent('')` was called "very likely vacuous." jest-dom **throws**
a usage error on that form rather than passing, and swapping to `toBeEmptyDOMElement()`
kept the test green — the region genuinely empties. The assertion form was weak (now
strict); the feared defect did not exist.

---

## 5. Open — your call, not mine

1. **No dispatcher-authorization coverage.** `roleRequired` is hand-authored per command,
   112 dispatchers are wired, I read three. **Nothing tests that a dispatcher denies a
   below-role caller.** This is the real version of the retracted harness and is the
   **recommended next slice**: invoke each dispatcher with a below-role actor, expect denial.
2. **`request_plan_adjustment` is wired AND `requiresConfirmation: true`**, so its
   allowlisted fictional endpoint *is* HMAC-signed into a real audit record — the exact
   case the blueprint claims to prevent, carved out by the allowlist. The blueprint now
   states this limit honestly. Closing it needs a registry-wide decision on what `endpoint`
   means for a lane-internal command.
3. **`allowedRoles` is untrustworthy for 54% of rows.** Do not build an authz claim on it
   until `ceilingUnknown` is far smaller.
4. **Merge/deploy decision**, given every CI gate is dead (§0.3).
5. **Three branches carry this work** — I rebased twice and would not force-push (Rule 45),
   so each rebase needed a new name. A force-push would discard only my own superseded
   commits and is tidier; that is your call.
6. **Whole-tree scan tests are load-fragile** — ~5,400-file walks against a 5000ms default.
   A *different* set times out each run; all pass in isolation. Verified not caused by this
   branch (5,362 files here vs 5,391 on main, so the walks are cheaper). Worth a
   `testTimeout` bump.

---

## 6. Verification — and what it does not prove

- `tsc --noEmit` true exit **0**, **0 errors**; `vite build` exit **0**
- **Full backend: failing-file set BYTE-IDENTICAL to `known-failing-baseline.json`**
  (23 files), compared as **sets** — 23-vs-23 would hide a swap
- **Full frontend: 1584 files / 8025 tests pass**
- Every new assertion **mutation-tested**, each restored byte-identical (`diff -q`)
- Secret scan CLEAN on every changed file

**Not proven** (stated because silence reads as coverage):
- **Dispatcher authorization** — §5.1.
- **No real screen reader.** The a11y fix is proven by a jsdom test asserting the real
  invariant (exactly one `aria-busy` region; announcer NOT inside it; loading text IS), not
  by assistive tech.
- **Set-comparison cannot see reason-drift** (GLM's sharpest methodology finding): a file
  already in the failing baseline could start failing for a *new* reason and the set stays
  identical. To close it, diff failure *messages*, not filenames.
- **Cross-mount middleware inheritance** is not modelled. Direction is documented: it can
  only make a ceiling too permissive, never too restrictive, so it cannot manufacture a
  false absence — and existence is all the contract asserts.

---

## 7. Process notes that will save you a rework

- **Mutation-test every assertion, and mutate the ANCHOR as well as the target.** I shipped
  **three** vacuous assertions this workstream, each inside the fix for the previous one:
  a regex window that spilled past its function; a slice returning `''` on a missing anchor;
  a negative matching one spelling. The third was caught only because a panel named the
  evasion. **A guard that cannot fail is worse than no guard** — it converts an unchecked
  area into one that looks checked. The repo already had `tests/helpers/sliceBetween.mjs`
  for exactly this; use it (Rule 18).
- **A guard must not match its own documentation.** This happened **three times in one
  session** — a `not.toContain('aria-busy="true"')` failing on the comment explaining why
  aria-busy is wrong, and a comment naming a banned CSS declaration tripping the contract
  banning it. Match structurally; never name the banned literal in prose in the same file.
- **Validate the instrument before believing a negative.** The extractor silently dropped a
  file's only route because a regex literal containing quotes (`/[&<>"']/g`) put the scanner
  into a string state it never left. A grep-vs-parser count caught it, and that guard is now
  a permanent test — the difference between a lesson that *runs* and one merely written down.
- **Before deleting a file, grep for its PATH, not just its symbols.** Contract tests couple
  to files by path without importing them. That is how a "dead" 31-file tree turned out to
  be load-bearing for two live contracts.
- **An inherited "verified" claim is a hypothesis.** The prior handoff said
  `ClientSelfOnboardingWizard` had "verified zero refs." It is used at
  `routeComponents.tsx:178` — *in the same file*.
- **Escaping `\n`/`\b` through a heredoc into JS repeatedly produced literal newlines and
  backspace characters.** Four separate syntax errors. Use `String.fromCharCode(10)` or
  `String.raw`, and `node --check` after every generated edit.

---

## 8. Where the evidence lives

| Artifact | Path |
|---|---|
| Panel round 2 (Ox / GLM / HY3) | `docs/ai-workflow/AI-HANDOFF/panel-2026-08-25/` |
| Round-2 brief (full files) | `docs/ai-workflow/AI-HANDOFF/HOSTILE-BRIEF-PANEL-ROUND2-2026-08-25.md` |
| Round-1 GLM review + brief | `docs/ai-workflow/AI-HANDOFF/GLM-*-2026-08-24.md` |
| Durable learning packet | `docs/ai-workflow/hermes-learning-packets/20260823-an-inherited-plans-premise-is-the-first-thing-to-test.md` |
| Hermes inbox memo | `.ai-workflow/hermes-inbox/pending/20260823T120000Z-*.md` |
| Prior handoff (superseded) | `docs/ai-workflow/AI-HANDOFF/COACH-ENDPOINT-TRUTH-CLIENTHUB-A11Y-HANDOFF-2026-08-24.md` |
