---
decision: Authorization question CLOSED — 0 vulnerabilities across ~29 hand-traced handlers, the
  prod admin bypass proven dead, and all 5 audit-reader defects fixed. Remaining work is test
  COVERAGE (3 surfaces of 211), not enforcement.
status: open
supersedes: none
extends: SESSION-HANDOFF-AUTHZ-AND-CORPUS-2026-08-14.md
---

# Session Handoff B — Authorization closed, instrument rebuilt, bypass proven dead

**Date:** 2026-08-14 · **Author:** Claude Opus 5 (session `main-s4911ff52`) · **Surface:** vs-claude
**Branch:** `claude/qa-harness-slice0-20260811` (worktree `C:/tmp/ss-qa-harness-slice0`)
**Predecessor:** `SESSION-HANDOFF-AUTHZ-AND-CORPUS-2026-08-14.md` (session `c79ecc69`)
**Detail doc:** `AUTHZ-CONTROLLER-HOP-VERIFICATION-2026-08-14.md` (all evidence, §1-§10)

> **Self-contained.** Read this file, then `.ai-workflow/coordination/*.lane.md`, then act.
> You do not need to read the predecessor handoff unless you want the origin story.

---

## 1. The one-paragraph version

Sean's original concern was that a four-role launch audit walks each role through **its own** pages
and never attempts a crossing — so a 100%-green audit is compatible with total authorization
failure. That concern was correct, and it is now **answered: no authorization vulnerability was
found.** ~29 user-scoped handlers were traced by hand, 57 security tests execute real routers, and
the production admin bypass was proven dead by grepping a real build. What *was* broken was the
measuring instrument: the repo's IDOR audit had **five** defects, four of which made it report
success while describing a world that did not exist. All five are now fixed. **The remaining risk is
not enforcement — it is coverage: only 3 of ~211 handlers have an executed authorization test.**

---

## 2. Where this started vs where it is now

| | Session `c79ecc69` (start) | Now |
|---|---|---|
| Audit scan | 196 route files | **230** (recursive) |
| User-scoped handlers seen | 199 | **211** |
| Flagged unguarded | 7 → 0 (after widening) | **3**, all traced + by-design-public |
| Reader defects known | 1 (`router.use` blindness) | **5 found, 5 fixed** |
| Handlers hand-traced | 4 | **~29** |
| Prod admin bypass | `[UNVERIFIED]` — no build to grep | **PROVEN DEAD** (built + grepped) |
| Cross-role matrix | designed, Kimi-rejected | **still correctly NOT built** |

---

## 3. Lane map — who owns what (read before editing anything)

- **Claude lane (this work):** authorization / IDOR / cross-role. Now largely closed.
- **Codex lane:** dashboard + workout cluster, test-infrastructure repair, dependency upgrades, CI,
  build-identity/deploy verification. Worktree `C:/tmp/sspt-dashboard-hostile-audit-20260814`.
- **Sibling Claude session `main-s2e2f8326`:** owns `backend/scripts/audit-idor-surface.mjs`. It
  implemented every fix in §5 below, in-flight, while this session reviewed. **Coordination worked
  — do not undo it.**

**LIVE COLLISION WARNING.** The audit script changed **three times** underneath this session,
including once after a finished document had been committed describing its state. If you touch it:
re-read immediately before editing, and re-run before trusting any number you quote. An `Edit` call
failed here with "file has been modified since read" — that guard is doing real work in this tree.

---

## 4. The answer on authorization — 0 vulnerabilities

**~29 handlers hand-traced. Zero authorization defects.** Highlights (full table: detail doc §2/§4/§8):

- **Messaging group participants** (`groupController.mjs:129,160`) — the crossing Sean cared about
  ("can user A remove user B from a conversation A does not own?") is closed at **every** branch:
  non-member → 404, plain member → 403, admin-vs-admin → 403, target-is-owner → 403, self → allowed
  (leave). Backed by SQL that genuinely scopes (`cp.user_id = :userId AND cp.deleted_at IS NULL`,
  parameterized) and a role normalizer that **fails closed to `member`**.
- **Badge display** (`badgeController.mjs:368`) — `admin || isOwnProfile`, both IDs through a strict
  parser (rejects `"5abc" "0" "-1" "1e1" "0x5" "5.0" "007" "+5" "٥"`), so `===` is type-safe.
- **Previously-invisible handlers** in unscanned subdirectories — `masterPrompt/privacy.mjs:177
  GET /user-data/:userId` (permission middleware + explicit self-or-admin 403), the three
  `social/groupMembership` writes (`groups.mjs:44 router.use(protect)` + membership/role gates),
  `social/posts.mjs:615` (friendship gate). All guarded.
- **`/users/:id` family** — `adminRoutes:35`, `authRoutes:855,925`, `userManagementRoutes:562,692`.
  All guarded. `authRoutes:855` is worth reading as a model: it documents *why* it string-coerces
  (`req.user.id` is a string, so strict `===` against a `parseInt` result was locking users out of
  their own profile) and tiers attribute exclusion by role.
  **Verified independently:** `authMiddleware.mjs:356-357` sets `req.user = { id: toStringId(user.id), … }`.
  Note the in-source comment cites `authMiddleware.mjs:631`, which is now a **blank line** — the
  claim is true, the line number has drifted. Do not conclude the comment is wrong; re-grep
  `toStringId` instead. This is why the guard belongs in a test, not a comment.

**Disproven hypotheses** (both were escalated to Sean before being checked — that was an error;
both were answerable from the repo): trainers cannot self-assign clients; the `user`→`client` alias
is not a paywall hole.

---

## 5. The instrument story — 5 defects, all fixed

The audit went `7 flagged → 0` the same day someone widened it. A security tool that reaches zero
right after being loosened deserves a probe, so it got one. Five defects:

| # | Defect | Proof | Status |
|---|---|---|---|
| **A** | `handlerBody` = fixed 2200-char slice, no boundary — a guarded handler clears its unguarded neighbour | probe flagged **alone**, cleared **beside a guarded sibling**; 12/182 clearances rested on it, some on a *log line* from a different handler | **FIXED** — bounded at next declaration |
| **B** | CHECK matched a **mention** of `req.user.id`, not a comparison — so `console.log` cleared a handler with zero authz | probe with the actor only in a log line → cleared | **FIXED** — dedicated comparison pass |
| **C** | `routerUseGate(src)` never received the handler offset — a gate *below* a handler would clear it | measured: 0 live instances across 20 files (latent) | **FIXED** — `routerUseGate(src, beforeOffset)` |
| **D** | `readdirSync` **non-recursive** — 196 scanned, **230 existed**; 6 subdirectories incl. all of `social/` never opened | 7 user-scoped handlers absent from the headline entirely | **FIXED** — recursive walk, 230 files |
| **E** | `USER_PARAM` missed the `/users/:id` shape | 5 more handlers invisible | **FIXED** — `\/users?\/:id\b` added |

**A and B were inherited from `origin/main`**, not introduced by the widening — main's copy has the
identical 2200-slice and the same bare-mention patterns. An earlier draft of the review blamed the
sibling session for both; that attribution was **wrong and withdrawn**. What the widening actually
added (controller hop, `router.use` gate, optional-chaining `req.user?.id` — a form used in 89 files)
was a genuine improvement.

**Permanent negative controls now exist:** `backend/tests/api/idorAuditReaderControls.test.mjs`,
**10 tests, passing** — both probe arrangements, the aliased-comparison idiom
(`const requestingUserId = req.user.id; ... String(requestingUserId) !== String(x)`, the dominant
in-repo pattern and the exact false-positive *this session's own detector* suffered from), optional
chaining on both sides, subdirectory reach for Defect D, the `/users/:id` shape — and the sharpest
one: *"every scanned path is a `.mjs` file, so the walk cannot inflate the denominator."* That last
control guards the fix against becoming its own lie, by making a bigger number impossible to fake.

**Current audit state:** `230 scanned · 211 user-scoped handlers · 208 guarded · 3 flagged`.
The 3 are `availability.mjs:44,64` and `encryptionRoutes.mjs:80` — **all three traced and
by-design-public** (trainer booking availability an authenticated client must read; a Signal-style
**public** prekey bundle returning no private material, `keyStoreService.mjs:225-232`). **They belong
in the accepted baseline.** Someone still needs to run `--update-baseline` and commit it.

---

## 6. The production admin bypass — CLOSED (was the last possible launch blocker)

Predecessor §7 item 2 flagged `protected-route.tsx:238-247`, which skips role checks when two
localStorage keys are set, gated on `NODE_ENV === 'development'`. There is **no `define` for
NODE_ENV in `vite.config.ts`**, so elimination in production was `[UNVERIFIED]` — assumed from
Vite's documented default, which is not evidence.

**Built it and grepped the real artifact.** With a positive control first (`localStorage` → 25
files, proving grep works):

| String | Files in `dist/` | Meaning |
|---|---|---|
| `Cleared stale admin bypass` (the dev branch's unique log) | **0** | dev branch eliminated |
| `EMERGENCY FIX` | **0** | same |
| `getItem("bypass_admin_verification")` | **0 reads** | **nothing consumes the flag** |
| `getItem("admin_emergency_mode")` | **0 reads** | same |
| `bypass_admin_verification` | 3 files | 2 are defensive `removeItem` (login/logout); 1 is `EmergencyDashboard` **writing** it |
| sourcemaps | **0** | source not shipped |

`EmergencyDashboard` still *writes* the flags, but **nothing reads them** — dead writes. And the
component itself is routed at `main-routes.tsx:761-766` behind
`<ProtectedRoute allowedRoles={['admin']}>`, with `src/routes/emergencyAdminGate.contract.test.ts`
(2 tests, passing) asserting exactly that.

**Verdict: not exploitable in production.** Residual hygiene only — the dead `setItem` calls should
be deleted so a future reader cannot re-introduce a consumer. Ticket, not a blocker.

---

## 7. What is actually left, ranked

> **Baseline: DONE, nothing owed.** An earlier draft listed re-baselining as item 1. It is already
> committed — `backend/scripts/baselines/idor-surface.json` records `scanned: 211, accepted: 3`, and
> the 3 accepted keys are exactly the by-design-public trio traced in §5
> (`GET /:trainerId`, `GET /:trainerId/slots`, `GET /keys/:userId`). The ratchet is armed correctly:
> those 3 are tolerated, and anything new fails the build.

1. **Executed authz coverage — the real gap.** `clientResourceIdorExecution.test.mjs` is an
   excellent template (real routers via supertest, `it.each` tables, **positive controls**, and a
   non-disclosure assertion `expect(JSON.stringify(res.body)).not.toContain(String(CLIENT_B_ID))`).
   It covers **3 surfaces of ~211**. Extending it is the highest-value security work remaining —
   and the static audit now gives a clean, trustworthy target list to point it at.
2. **Delete the dead bypass writes** in `EmergencyDashboard` (§6).
3. **Rate-limit `GET /api/encryption/keys/:userId`.** It consumes a one-time prekey per call
   (`keyStoreService.mjs:221-223`) with no limiter — any authenticated user can exhaust another
   user's prekey pool. Standard E2EE availability concern. Low severity.
4. **Two pre-existing `main` test failures** (Codex's lane, flagged not fixed per Rule 52) —
   `associationsModelRegistryParity` (`RenewalAlert` in the full-setup literal, missing from the
   early return — schema-drift class) and `phase1bControllers`
   (`<client_reported>strength</client_reported>` vs expected `strength`), plus
   `memberDirectoryLateralProbe` failing at file level. All five files verified **byte-identical to
   `origin/main`**. Checked the first for authz impact: **none** — `requireStaff` is fail-closed and
   mounted before every handler.
5. **Do NOT build the cross-role matrix.** Kimi's rejection stands, and §5's existing tests already
   solve the F2 all-401-reads-as-green defect it was rejected for.

---

## 8. Proof state — read this before repeating any claim

**Established (current-session, reproducible):**
- ~29 handlers traced to their guard with file:line, including the SQL that scopes by actor and the
  fail-closed role default.
- ID parser behavior — probed with **positive and negative controls**.
- All 5 reader defects — root cause read at file:line; A/B/D demonstrated by executable probe;
  C measured (0 live instances); blast radius of A measured by an independent second instrument.
- 8 suites incl. reader controls: **67 tests pass, 0 skipped**, mounting real routers via supertest.
- Reader negative controls: **10 tests pass**.
- Production bypass dead — real build, grep with positive control, 0 reads, 0 sourcemaps.
- `backend/routes/` is **byte-identical to `origin/main`** — so every count here describes the real
  production route surface. **Re-derive both before trusting them; they drift every commit:**
  ```
  git diff --stat origin/main HEAD -- backend/routes/     # empty = the counts here still apply
  git rev-list --left-right --count origin/main...HEAD    # behind <TAB> ahead
  ```
  At the moment of writing: 46 behind / 27 ahead, routes identical. That "27" was "19" two commits
  earlier in this same session — which is exactly why the command, not the number, is the artifact.

**NOT established:**
- **No test has hit *production*.** The suites mock models and `authMiddleware`, so they prove
  authorization *given a correctly-populated `req.user`* — they do **not** prove `protect` populates
  it correctly. That is a genuine hole in the chain and nobody has closed it.
- **208 of 211 handlers were not individually traced** — only the ~29 whose clearance rested on a
  defect, plus the originally-flagged set. The audit is now trustworthy enough to rank them, but a
  clean audit is still not a proof.
- Full `tests/api/` baseline is **2 failed / 2577 passed / 4 skipped** (§7 item 5) — pre-existing.

---

## 9. Standing cautions

- **Branch not pushed.** Owner-gated. Its upstream is misconfigured to `refs/heads/main`, so a bare
  `git push` from this worktree targets the deploy branch. **Safe command:**
  `git push origin claude/qa-harness-slice0-20260811:claude/qa-harness-slice0-20260811`
  then `git branch --unset-upstream`.
- **Verify branches by content, not SHA.** Codex rewrites history here; `git cat-file -e` returns
  success for dangling objects after a rebase.
- **Git Bash lies on `<rev>:<path>`** — use `MSYS_NO_PATHCONV=1` (used throughout this session).
- **Do not report the audit's flags as findings.** Trace each one. It is a ranking tool; its own
  footer says a passing handler is not proven safe, and that is still true after five fixes.
- **Assertions against `verifyClientAccess`-guarded routes must accept 403 OR 404.** The 404 is
  deliberate, to avoid leaking resource existence.
- **Carried from prior sessions:** rotate the Render API key; add the DMARC record (SWA-13).

---

## 10. Commits (all on `claude/qa-harness-slice0-20260811`, all secret-scan CLEAN)

| SHA | What |
|---|---|
| `16d60dde5` | Findings doc — 3 handlers guarded, reader not sound (docs-only) |
| `fe38e3d11` | Six hostile rounds — two corrections + the defect that makes the audit silent (docs-only) |
| `31e28cb3c` | *(sibling)* reader fixes **A+B**, crediting the review |
| `ea70a8290` | *(sibling)* reader fixes **C+D+E** — "the audit was silent about 34 route files and 12 handlers" |
| `3025c475c` | This handoff (first version) |
| *…and later* | corrections to this handoff, the detail doc, and the learning packet — each one a hostile round that found a stale count, a dead citation, or a cross-document disagreement |

**Do not trust this table to be complete** — it was already 8 commits stale once. Current list:
```
git log --oneline origin/main..HEAD
```

**The full artifact set** (read in this order):
1. **This file** — state, what is left, how to act.
2. `docs/ai-workflow/AI-HANDOFF/AUTHZ-CONTROLLER-HOP-VERIFICATION-2026-08-14.md` — all evidence:
   per-handler traces with file:line, the probes, the measured blast radii, the round ledger.
3. `docs/ai-workflow/hermes-learning-packets/20260814-a-control-that-passes-can-still-be-a-decoration.md`
   — the durable lesson. **Read this one even if you are not picking up this lane**: it is about
   negative controls that pass while testing the wrong arrangement, which is not specific to authz.
4. `docs/ai-workflow/hermes-learning-packets/20260814-the-three-recurring-failures-are-one.md` —
   the corpus-wide parent lesson that (3) extends.

**Working tree is clean** apart from one untracked Hermes memo predating this session. Note:
`frontend/dist/` (54 MB) was built during §6 and left in place — it is gitignored, and leaving it
lets the next agent re-run the bypass grep without a rebuild. Delete it freely.

**Two artifacts are NOT in this worktree and never will be — both paths are gitignored
(`.gitignore:462` and `:493`) and machine-local to the main tree.** If you are reading this from
`C:/tmp/ss-qa-harness-slice0`, the relative paths will not resolve. Absolute locations:

- Hermes inbox memo — `C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/.ai-workflow/hermes-inbox/pending/2026-08-14T183000Z-security-the-reader-that-clears-everything.md`
- Review exchange with the sibling session (my REVISE verdict, the withdrawn attribution, and the
  handover of defects C/D/E) — `C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/.ai-workflow/coordination/review-queue.md`

**Consequence worth internalising:** if this branch is ever pushed and picked up on another machine,
**both of those artifacts vanish.** Everything load-bearing was therefore committed into
`docs/ai-workflow/AI-HANDOFF/` on purpose. Do not put a fact you need to survive a machine change
into `.ai-workflow/` — that directory is a local working channel, not a record.

---

## 11. The transferable lesson

Three failure classes dominate this repo's corpus — stale state (31%), fake-green tests (26%),
schema drift (26%). They are **one** failure: *a source of truth that reports success while
describing a world that does not exist.* This session was a live instance of it, inside the tool
built to find security holes.

**What actually worked was never looking harder — it was changing instrument.** Re-reading the
reader would never have found the non-recursive scan; asking *"what does this never look at"* did.
Re-reading a finished document would never have revealed it was two commits stale; re-running it
did. Of eleven hostile rounds, four were clean and cost almost nothing — the price of the six that
were not.

**The operational rule:** before any **count**, **absence claim**, or **presence claim** becomes
load-bearing, re-derive it with a **second instrument of a different shape** and require the two to
agree. **Disagreement is the finding.** And every probe ships a **positive control** — a case that
must succeed — because a probe with only negative cases cannot tell "correctly rejects everything"
from "broken and returns nothing." This session published one broken probe's output before catching
it, which is exactly why the rule is procedural rather than aspirational.
