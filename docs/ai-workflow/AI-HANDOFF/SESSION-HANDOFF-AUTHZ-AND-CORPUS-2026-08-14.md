# Session Handoff — Cross-Role Authz + Hermes Corpus Mining

**Date:** 2026-08-14 · **Author:** Claude Opus 5 (session c79ecc69) · **Surface:** vs-claude
**Branch:** `claude/qa-harness-slice0-20260811` (worktree `C:/tmp/ss-qa-harness-slice0`)
**Status:** Authz question largely ANSWERED. 3 handlers unverified. Branch NOT pushed.

> Self-contained. A fresh session should be able to act from this file alone.
> Read this, then `.ai-workflow/coordination/*.lane.md`, then act.

---

## 1. The one-paragraph version

Sean flagged that the four-role launch audit walks each role through **its own** pages and never
attempts a crossing — so it cannot detect broken access control, and a 100%-green launch audit is
compatible with total authorization failure. That was correct. I designed a cross-role matrix, had
it hostile-reviewed by Kimi K3 (it failed, 4 CRITICAL), then discovered the repo **already has**
an IDOR audit script and six security test files nobody had run this session. Running the existing
tool answered the question in one command: **192 of 199 user-scoped handlers have a visible authz
check.** Of the 7 without, I traced 4 by hand — all 4 are actually guarded. **3 remain unverified.**

**Net: the authorization risk is far smaller than assumed, and the remaining question is 3 handlers
wide, not 37.**

---

## 2. Lane split — Codex is running a parallel audit, DO NOT COLLIDE

**Codex owns** (worktree `C:/tmp/sspt-dashboard-hostile-audit-20260814`, branch
`codex/dashboard-hostile-repair-20260814`, based on current `origin/main`):
dashboard + workout cluster, test-infrastructure repair, dependency upgrades (React Router 6→7,
Sharp 0.35.3), TypeScript gate replacing the 8 GB OOM typecheck, build-identity/deploy verification,
GitHub Actions startup failure, production role journeys.

**Codex's stated remaining blockers:** Actions terminates before creating a job (account
billing/budget suspected, token lacks `user` scope); production serves no build receipt; saved role
states are stale (July 1); authenticated production journeys unproven.

**Codex's lane contains ZERO authorization work.** That is the gap this session covers. Keep it
that way — authz/IDOR/cross-role is the Claude lane; dashboards/workouts/test-infra/CI is Codex's.

---

## 3. What the Hermes corpus actually says (783 memos + 21 packets, mined 2026-08-14)

Sean asked for the recurring issues across ~a month of agent work. Measured, not guessed:

| Recurring class | Files | Share |
|---|---|---|
| **stale state** — branch/doc/session behind reality | 241 | 31% |
| **fake-green / tests that lie** | 204 | 26% |
| **schema drift** | 200 | 26% |
| **unverified claims treated as fact** | 127 | 16% |
| **wrong instrument / tool lied** | 101 | 13% |
| **not-mounted / dormant / orphan surfaces** | 91 | 12% |
| **IDOR / authz** | 90 | 12% |
| **silently skipped tests** | 67 | 9% |

**Interpretation — the top three are one failure, not three.** Every one is a *source of truth
that isn't*: a branch that isn't current, a test that asserts nothing, a model that doesn't match
the DB. In each case something **reported success while describing a world that did not exist.**

**This is what any hostile review here must hunt.** Not "is the code wrong" but "is the thing
telling me the code is right actually looking at the code." Codex's own round found exactly this
shape — a planner test that read source instead of behavior, a skipped security test, suites
reporting empty-as-pass.

**Corroborated live this session, five times:** a SHA existence check that passed on dangling
objects post-rebase; a non-recursive glob that hid 34 route files; a safety property taken from
Vite's documented default instead of evidence; a digit-blind regex inventing a mismatch; and an
IDOR audit script that flags guarded handlers because it can't follow `router.use()`.

**Operational rule that came out of it** (now in the learning packet): before any **count**,
**absence claim**, or **presence claim** becomes load-bearing, re-derive it with a **second
instrument of a different shape** and require the two to agree. Disagreement is the finding.

---

## 4. Authorization state — the actual evidence

**Tool:** `node backend/scripts/audit-idor-surface.mjs` (already existed, added 2026-08-04 under
SWA-134 item 4; read-only, verified no writes/DB mutations before running).

```
route files scanned : 196    user-scoped handlers : 199
show a visible check: 192    NO visible check     : 7
```

| Flagged handler | Verdict | Evidence |
|---|---|---|
| `GET /user/:userId` renewalAlertRoutes:54 (flagged **NEW**) | **GUARDED** | `router.use(protect)` + `router.use(requireStaff)` at :48-49, before all route defs |
| `POST /:userId/movement-screen` clientOnboarding:16 (flagged **SENSITIVE**) | **GUARDED** | authz call present in controller |
| `GET`/`POST /:userId/questionnaire` clientOnboarding:12-13 | **GUARDED** | `resolveQuestionnaireRequest` → `resolveAuthorizedClientRequest({access: ensureClientAccess})` |
| `PUT /user/:userId/:badgeId/display` badgeRoutes:207 | **UNVERIFIED** | — |
| `PATCH /conversations/:id/participants/:userId` messagingRoutes:57 | **UNVERIFIED** | write op on another user's conversation membership |
| `DELETE /conversations/:id/participants/:userId` messagingRoutes:64 | **UNVERIFIED** | as above |

**Audit-script limitation (important, record this):** it matches per-handler middleware and
in-handler checks. It does **not** follow `router.use()` or multi-level controller delegation, so
it false-positives on both patterns — 4 of 7 flags today. Its own header warns of this. **It is a
ranking tool, not a verdict.** Do not report its flags as findings without tracing each one.

**Also disproven this session by reading code** (both were escalated to Sean as questions before I
checked — that was my error, they were answerable from the repo):

- **Trainers cannot self-assign clients.** All four write verbs on `clientTrainerAssignmentRoutes`
  are `protect, adminOnly` (POST `/`, PUT `/:id`, PUT `/trainer/:trainerId/compensation-default`,
  DELETE `/:id`). `/trainer/:trainerId` scopes with
  `requestingUserRole === 'trainer' && String(parsedTrainerId) !== String(requestingUserId)` → 403.
  The "one endpoint defeats the whole guard layer" hypothesis is dead.
- **The `user`→`client` alias is not a paywall hole.** `protected-route.tsx:258` aliases them, but
  repo-wide exactly **one** production route uses `'client'` in its gate and it is
  `['admin','trainer','client']`. Paid gating lives in `requireSubscription`/`requireTier` on the
  backend, which the alias does not touch.

**Existing authz infrastructure a future session must not re-invent:**
`backend/utils/clientAccess.mjs` (`ensureScopedClientAccess`), `backend/middleware/verifyClientAccess.mjs`
(returns **404 not 403** deliberately, to avoid leaking resource existence — assertions must accept
either), plus tests: `clientResourceIdorExecution`, `clientAccessStrictIdParsing`,
`statsRoutesDisclosure`, `sharedDashboardRouteHardening`, `clientNutritionRoutesSecurity`,
`adminOnboardingBaselineAccessGuard`.

**Coverage arithmetic** (published because it was challenged): 230 route files; 55 take
`:userId`/`:clientId`; 25 use `verifyClientAccess`; of those 25, **18** also take params and **7**
do not; 55 − 18 = **37** without that specific guard. The 37 is a *test-target list, not a findings
list* — most use the local `ensureClientAccess` helper instead.

---

## 5. The cross-role matrix design — reviewed, REJECTED, not built

Files (all committed on `claude/qa-harness-slice0-20260811`):
- `docs/ai-workflow/AI-HANDOFF/CROSS-ROLE-AUTHZ-MATRIX-DESIGN-2026-08-14.md`
- `docs/ai-workflow/AI-HANDOFF/AUTHZ-MATRIX-REVISION-1-REVIEW-VERDICT.md`
- `docs/ai-workflow/AI-HANDOFF/KIMI-AUTHZ-MATRIX-REVIEW-2026-08-14.md`

**Kimi K3 found 4 CRITICAL defects**, all one shape — *assertions whose preconditions the design
never created*:

1. **F1** — four auth fixtures (one per role) cannot express a same-role crossing. 5 of 12 rows
   unexecutable, including the P0 user-to-user rows. Skipped cells read green.
2. **F2** — no positive control. Expired fixtures, or a token the request never carries, produce
   all-401 = all-green = nothing asserted.
3. **F4** — no anonymous row. The threat model assumed every attacker holds an account; the
   cheapest one holds none.
4. **F3** — GET-only defers the endpoints that mint privilege. Mass assignment
   (`PUT /api/profile {"role":"admin"}`) was absent from the threat model entirely.

**Verified and DISPROVEN** (2 of 14): the 25+37/55 arithmetic closes; the §5 hazard files are
identical to `origin/main`. Both carried valid methodology criticism I accepted.

**Recommendation (mine, unchanged): do NOT build this matrix now.** The existing audit script plus
targeted tracing answered the question far cheaper. If it is ever built, it belongs as a **CI
monitor**, not a pre-launch gate — and Kimi's architectural point stands: per-route middleware
across 230 files will always leak; the durable fix is object-scoping at the data layer (query-level
scoping / RLS), not a point-in-time matrix.

---

## 6. External model calibration (for routing decisions)

| Model | Result | Cost |
|---|---|---|
| **Kimi K3** (`--effort high`) | 14 findings, 4 Critical, 12 survived verification (10 solid + 2 conditional), 2 disproven. Found a self-contradiction my own 4-round dry loop structurally could not. **Worth it.** | $0.2495 |
| **HY3** (`--effort high`) | **Returned nothing.** Consumed all 60k tokens on internal reasoning, emitted zero visible text, no output file. | ~$0.03 |

**Routing rule:** on a long adversarial document, `--effort high` is not a quality dial — it is a
gamble against `max_tokens` on reasoning-heavy models. Kimi absorbed it (15.8k output); HY3 did not.
Route HY3 low, or route the work to Kimi. (Rule 71 — I set high on both reflexively; that was the
error.) Codex independently hit the same class: one Kimi call lost to a Windows EPERM on save with
no generation ID recoverable.

---

## 7. OWNER-GATED — nothing proceeds on these without Sean

1. **Push `claude/qa-harness-slice0-20260811`.** Never pushed; exists only on this machine.
   **Landmine:** its upstream is misconfigured to `refs/heads/main`, so a bare `git push` from that
   worktree targets the deploy branch. Fails safe today only on `push.default=simple` name mismatch.
   **Safe command:**
   `git push origin claude/qa-harness-slice0-20260811:claude/qa-harness-slice0-20260811`
   then `git branch --unset-upstream`.
2. **`npm run build && grep -rl "bypass_admin_verification" dist/`** — `protected-route.tsx:238-247`
   skips role checks when two localStorage keys are set, gated on `NODE_ENV === 'development'`.
   There is **no `define` for NODE_ENV in the vite config** and no build was available to grep, so
   its elimination in production is **unverified**. Kimi's hardening: grep the **deployed** artifact
   plus sourcemaps, pin the pipeline so it cannot publish a non-production build, and add a
   behavioral probe. **Best answer: delete the bypass.**
3. Carried from prior sessions: **rotate the Render API key**; **add the DMARC record (SWA-13)**.

---

## 8. Next slices, ranked

1. **Trace the 3 unverified handlers** (badgeRoutes:207, messagingRoutes:57/64). ~15 min, free,
   closes the authz question. The messaging pair is the interesting one — can user A remove user B
   from a conversation A does not own?
2. **Fix the audit script's `router.use()` blind spot.** It false-positived on 4 of 7 flags today.
   A tool that cries wolf gets ignored — and it is the only standing authz instrument.
3. **Run `--update-baseline`** after (1). It detected 2 genuine fixes (`POST`/`DELETE
   /users/:userId/block` in messagingRoutes) that are not yet re-recorded.
4. **The `dist/` grep** (owner-gated item 2). Ten seconds, potential launch blocker.
5. **Do NOT build the authz matrix.** See §5.

---

## 9. Proof state — what is and is not established

**Established:** 192/199 handlers carry a visible authz check (tool output); 4 of 7 flags traced to
their guard with file:line; trainer self-assignment impossible (code-read); alias is not a paywall
hole (repo-wide grep); coverage arithmetic derived and published; Kimi's 2 disproven findings
re-derived independently.

**NOT established:** 3 handlers untraced; no test has been run against any live endpoint; the
matrix is not built; **nothing here proves runtime behavior** — every claim is static analysis plus
code reading. A two-user negative test is the only thing that proves an authz claim either way, and
none has been run.

**Commits this session** (all on `claude/qa-harness-slice0-20260811`, all secret-scan CLEAN):
`4c0081ae8` design · `da8b501a0` memo · `c0beeb8f7` learning-packet amendment · `deec33381` review
verdict · `b5146c586` memo update · `94a73224b` fourth-critical fix · `d84c00d44` enumeration fix.

---

## 10. Standing cautions for whoever picks this up

- **Codex is committing and rewriting history in this repo.** A previous session cited six commit
  SHAs for branch verification; a rebase orphaned five of them, and `git cat-file -e` still returned
  success because dangling objects persist. Verify branches by **content**, never by SHA.
- **This `wip/comms-notifications-2026-07-05` tree is 1926 commits behind `origin/main`.** Do not
  audit from it. The harness branch is 5 ahead / 42 behind with `backend/routes` byte-identical to
  main; Codex's worktree is on current main.
- **Do not report the audit script's flags as findings.** Trace each one first (§4).
- **Assertions against `verifyClientAccess`-guarded routes must accept 403 OR 404.** The 404 is
  deliberate. Demanding 403 produces false HARNESS failures against correct code.
