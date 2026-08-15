---
decision: START BY REVIEWING ME. Sean's instruction — the next agent runs a hostile review of
  this session's work through Kimi K3 and HY3 and participates in that review itself. The author
  of the work (Opus 5, session main-s65632ef3) is deliberately EXCLUDED from reviewing it. Only
  after that review is adjudicated does the next slice begin.
status: open
supersedes: none
extends: SESSION-HANDOFF-AUTHZ-EXECUTED-2026-08-14-C.md
---

# Handoff D — review my work first, then take the lane

**Date:** 2026-08-14 · **Author:** Claude Opus 5 (session `main-s65632ef3`) · **Surface:** vs-claude
**Branch:** `claude/qa-harness-slice0-20260811` (worktree `C:/tmp/ss-qa-harness-slice0`)
**Chain:** A → B (`AUTHZ-CLOSED`) → C (`AUTHZ-EXECUTED`) → **D (this file)**

> **Read this file first and completely.** It is self-contained. C has the evidence detail; B has
> the origin story. You do not need A.
>
> **Your first task is not the next slice. It is a hostile review of MY work.** Section 2.

---

## 0. Sean's instruction, in his words

> *"I want you to make sure that the agent does a hostile review on all the work that you've done
> so far first with the Kimi K3 and the HY3… I want the next agent to be a part of the hostile
> review, not you. We're gonna have the other agent do it."*

So: **three reviewers — Kimi K3, HY3, and you.** Not me. I wrote the code; I have already run my
own dry-loop on it and it came back clean, which is exactly the condition under which a builder
stops being a useful reviewer of their own work. Treat my "CLEAN×2" as a claim to falsify, not a
result to inherit.

---

## 1. What this project is, and where it is going

**SwanStudios (SS-PT)** — a production personal-training SaaS on Render (`sswanstudios.com`).
React 18 + TypeScript + styled-components; Node/Express + Sequelize + PostgreSQL. Real paying
clients, real PII, real payments.

**The product loop everything serves:** log the workout → save it → turn it into charts/progress
proof → decide the next training action → make milestones shareable. Trainer-led B2B2C, not a
generic fitness social network.

**Why this lane exists.** Sean's original concern was structural: a four-role launch audit walks
each role through *its own* pages and never attempts a **crossing**. So a 100%-green audit is
fully compatible with total authorization failure. Nobody had ever tried being user A and
reaching user B's data.

**The arc so far:**
- **Session A/B** — answered the question. ~29 handlers hand-traced, **0 authorization
  vulnerabilities found**. Discovered the real problem was the *measuring instrument*: the repo's
  IDOR audit had 5 defects, 4 of which made it report success while describing a world that did
  not exist. All 5 fixed. The production admin bypass was proven dead by grepping a real build.
- **This session (C/D)** — closed B's punch-list and started converting *static clearance* into
  *executed proof*. 8 handlers now genuinely run the attack.
- **Where it is going** — the endpoint is: every user-scoped handler has a test that actually
  attempts the crossing and fails when the guard is removed. We are 8 of ~211 into that, plus 3
  older surfaces. **The single biggest hole is that no test in this repo touches the real
  `protect` middleware** — every authz suite mocks it, so all of them prove authorization *given
  a correct `req.user`*, and none proves `req.user` is correct.

---

## 2. YOUR FIRST TASK — the three-way hostile review

**Scope: every code change I made this session** — 10 files, +1358/−22, spread across 5 commits
on this branch (a 6th, `49ba6b579`, is the sibling session's and is out of scope), plus 2
docs-only commits on the wip branch (§4). The diff below is the authoritative scope; the commit
count is not, because the branch has two authors writing under the same git identity.

### 2a. Run Kimi K3 and HY3

Both scripts live in the **main tree**, not this worktree. Both **dry-run by default**; a live
call needs `--confirm-spend` and is capped at $3.

**⚠ The cwd trap — I hit it, you will too.** The scripts resolve `--document` and `--out` against
`process.cwd()`, and they run from the main tree while the documents you want reviewed live in
**this worktree**. A relative path silently fails to find the file. Use an **absolute** path:

```
cd c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT
node scripts/consult-kimi.mjs \
  --document "C:/tmp/ss-qa-harness-slice0/<packet>.md" \
  --remit "<remit>" --effort high \
  --out "C:/tmp/ss-qa-harness-slice0/docs/ai-workflow/AI-HANDOFF/KIMI-REVIEW-<topic>.md" \
  --confirm-spend
node scripts/consult-hy3-design.mjs   # identical flag set
```

**Verified by dry-run this session** (no spend): with an absolute path the preflight reports
`model=moonshotai/kimi-k3`, `prompt_chars=22110`, `worst_case_usd=$0.9670`, `cap_usd=$3.00`, and
refuses to call without `--confirm-spend`. With a bad path it prints `document not found` and
**exits 1** — I first reported that as exit 0 and was wrong; my pipe was swallowing node's status.
Measure exit codes unpiped.

**⚠⚠ `--remit` IS MANDATORY HERE, NOT OPTIONAL.** Both scripts default to a **design** remit, and
one of them is emphatic about it: `consult-hy3-design.mjs`'s built-in remit opens *"You are Tencent
Hy3, the SwanStudios design-inspiration reviewer. **Give only UI/UX and interaction
suggestions.**"* `consult-kimi.mjs` defaults to *"the SwanStudios front-end and design reviewer"*
and a checklist of touch targets, WCAG contrast and responsive breakpoints. Fire either without
`--remit` and you will spend ~$1 to get a **UI critique of an authorization change**.

Verified safe: both do `options.remit || defaultRemit`, so an explicit `--remit` **fully replaces**
the design text rather than appending to it. Pass a security remit every time. The corpus records
HY3 once *correctly refusing* a design remit it was handed for implementation work — do not rely
on the model to rescue a wrong remit twice.

**Rule 16 applies: these are paid. ASK SEAN before firing.** Memory also carries "Kimi = ONE
review, ask first" — a second call on the same topic needs a fresh yes.

**Build the review packet yourself.** Do not hand them this handoff — hand them the **diff and
the test files**, because the defect classes below are only visible in the code:

```
git diff 1c21f8306..HEAD -- backend/ frontend/   # verified: 10 files, +1358/-22
```
That range is exactly my code surface: 5 new test files, `rateLimiter.mjs` (+43),
`encryptionRoutes.mjs` (+6/-2), `EmergencyDashboard.jsx`, `config.js`, and the new frontend
contract test. Nothing else in `backend/` or `frontend/` moved.

### 2b. The remit to give them

Tell them plainly: *the author claims these tests are mutation-verified and non-decorative;
find where that is false.* Specifically:

1. **Are the mutation probes honest?** I claim I broke each guard and the suite noticed. Is the
   mutation I chose the one that matters, or a strawman? A guard can survive the mutation I
   picked and still be broken another way.
2. **Do the mocks hide the bug?** Every suite stubs `authMiddleware` and the data layer. Ask what
   a real request would do that my stub does not. This is where I am most likely wrong.
3. **`preKeyFetchLimiter` is the riskiest thing I shipped** — it is new middleware on a live E2EE
   route, and it is the only limiter in the repo keyed on something other than IP. Attack the
   `keyGenerator`: memory store growth, key collisions between actors, behaviour when `req.user`
   is absent, what happens to a legitimate group-chat fan-out at 20/hour, and whether 20 is even
   the right number. I picked it by reasoning, not by measurement.
4. **Did I delete something load-bearing?** I removed `window.adminAccess.force()` and four
   `setItem` calls. I checked for readers; check whether I checked well enough.
5. **Is `adminBypassFlagsUnwritten.contract.test.ts` sound?** It is a source scanner. Scanners are
   this session's recurring failure mode — mine already produced one false positive before I fixed
   it. Find the next one.

### 2c. Your own pass — and the standing warning

Do **not** relay their findings to Sean unverified. Rule 30: a reviewer's output is a
**hypothesis**. The corpus records HY3 issuing a false CRITICAL that was real — but caused by the
*sending script's redactor*, not the code. Verify each finding against the actual file before
believing it, and record **findings real vs disproven per model** in your closeout — that
calibration is how the routing table gets learned.

Kimi has twice returned billed-but-empty responses. If that happens, record it as
`error/EMPTY_RESPONSE` **with the cost retained** and do not silently retry into another charge.

---

## 3. What I actually shipped (the thing under review)

### 3a. Executed authz coverage — the audit's 8 weakest clearances

The IDOR audit clears 208 of 211 handlers. Its weakest evidence is the `INDIRECT — controller`
class: to see a guard at all it must follow a function out of the route file into another module.
**Eight handlers rested on that; none executed. Now all 8 do.**

Re-derive the list (do not trust this table):
```
node backend/scripts/audit-idor-surface.mjs --verbose | grep '\[controller '
```

| Endpoint | Suite | Tests |
|---|---|---|
| `PATCH /messaging/conversations/:id/participants/:userId` | `groupParticipantAuthzExecution` | 14 |
| `DELETE /messaging/conversations/:id/participants/:userId` | ″ | ″ |
| `POST /client-onboarding/:userId/questionnaire` | `clientOnboardingAuthzExecution` | 23 |
| `GET  /client-onboarding/:userId/questionnaire` | ″ | ″ |
| `POST /client-onboarding/:userId/movement-screen` | ″ | ″ |
| `PUT  /badges/user/:userId/:badgeId/display` | `badgeConsentAuthzExecution` | 20 |
| `GET  /ai/consent/status/:userId` | ″ | ″ |
| `POST /profile/clients/:clientId/photo` | `clientPhotoUploadAuthzExecution` | 17 |

The messaging pair is **the crossing this whole review opened for** — "can A eject B from a group
A does not own?" — previously answered by reading `groupController`, never by calling it.

**Three asymmetries these suites pin** (invisible in the route files, and the reason the tests
are shaped the way they are):
- a group **admin may EJECT** a member but **may not PROMOTE** one (owner-only) — otherwise an
  admin can self-perpetuate the admin set
- a client may write their own questionnaire but **may not file their own NASM movement screen**
  (`ensureTrainerAccess` passes `allowSelf: false`) — clinical data stays trainer-authored
- an **assigned trainer** may read a client's questionnaire but **may not publish their badge** —
  coaching access is not publication consent

**Mutation results I am claiming** (attack these):

| Mutation | Tests that failed |
|---|---|
| `canRemoveParticipant` → `true` | 4 |
| `canManageParticipantRole` → `true` | 1 (the promote/eject split) |
| onboarding self-ownership comparison disabled | 9 |
| `ensureTrainerAccess` `allowSelf` → `true` | 2 (exactly the self-file pair) |
| badge `canEditDisplay` → `true` | 3 |
| consent client gate removed | 1 |
| prekey `keyGenerator` → actor-only | **1 — the design test; the 429 test still passed** |

That last row is the one I would attack first if I were you. It means the obvious test for a rate
limiter certifies a broken limiter.

### 3b. Dead admin-bypass writes — deleted and pinned

B found 2 writers; there was a **third** (`config.js`'s `window.adminAccess.force()`, whose
console banner still promised "force admin access"). All 3 gone.
`frontend/src/routes/adminBypassFlagsUnwritten.contract.test.ts` now fails CI if one returns.

`protected-route.tsx` is **deliberately untouched** — its read is dev-gated, proven absent from a
production build, and pinned by a sibling contract test (Rule 52). With every writer gone that
branch is unreachable unless a developer hand-types the keys into devtools.

### 3c. Prekey exhaustion — rate limited

`fetchKeyBundle` consumes one of the target's one-time prekeys per call. Now **20/hour per
(actor, target)**. Severity is genuinely **LOW** — Signal degrades gracefully, an empty pool still
returns a usable bundle — and should not be inflated. What justified it is the unbounded
attacker-driven *write*.

---

## 4. Exact state right now

**Branch `claude/qa-harness-slice0-20260811` — 6 commits, NOT pushed:**

| SHA | What |
|---|---|
| `d103344f9` | executed authz tests, 7 of 8 handlers |
| `64efe4afc` | the 8th + correction of `d103344f9`'s own count |
| `89db1f740` | delete 3 dead bypass writers + the pinning contract test |
| `7b76c7f53` | `preKeyFetchLimiter` |
| `49ba6b579` | *(sibling session)* addendum to B |
| `f2da0a935` | handoff C + supersede banner on B |

**Verification as I left it** — re-run all of it, do not inherit it:
- 127/127 across 7 authz suites; 15/15 frontend contract tests
- full `tests/api/`: **2661 collected, 2 failed** — both pre-existing, files byte-identical to
  `origin/main`, **Codex's lane** (`associationsModelRegistryParity`, `phase1bControllers`, plus
  `memberDirectoryLateralProbe` failing at file level)
- audit `230 · 211 · 208 · 3`, exit 0, "no NEW unguarded handler(s)"
- `vite build` OK; dist grep w/ positive control: **0 reads, 0 writes** (was 1), 0 sourcemaps
- Rule 42 both checks empty; secret scan CLEAN on every commit

**Counts you must NOT do arithmetic on.** B published "2577 passed" and I lost three full test
runs trying to reconcile it. Same command, four environments: **2655 / 2648 / 2554 / 2567**
passed, skips moving **4 → 15**. Only the collected total (2661) and the failure count (2) hold
still. `backend/routes/` is **no longer** byte-identical to `origin/main` (the limiter) — the
property B leaned on to argue its counts described production is gone. Re-derive, never cite.

---

## 5. 🚨 Two things only Sean can do — surface these immediately

**1. The Hermes learning corpus exists on ONE MACHINE.** Measured per file against the remote tip
(with `CLAUDE.md` as a positive control proving the probe resolves):
**18 of 26 packets are LOCAL ONLY**, including the commit that landed the 16-packet corpus
(`b57d21d76`) and both of mine. `_schema.json` is on the remote; `scripts/hermes-learning-validate.mjs`
is not. All of it is absent from `origin/main`. **7 unpushed commits** sit on
`wip/comms-notifications-2026-07-05`. Rule 68 calls this corpus durable and machine-independent —
today a disk failure takes 69% of it. *(I got this wrong first: I checked the branch was pushed
and reported the files were. Corrected in the packet.)*

**2. This branch has never been pushed.** Owner-gated, carried from B. Its upstream is
misconfigured to `refs/heads/main`, so a bare `git push` **targets the deploy branch**.
Safe form:
```
git push origin claude/qa-harness-slice0-20260811:claude/qa-harness-slice0-20260811
git branch --unset-upstream
```

Also carried and still open: **rotate the Render API key**; **add the DMARC record (SWA-13)**.

---

## 6. After the review — the ranked list

1. **Whatever the three-way review surfaces.** It outranks everything below.
2. **Close the `protect` gap.** Every authz suite in this repo mocks `authMiddleware`, so none
   proves `protect` populates `req.user` correctly. One integration test through the real
   middleware converts the largest standing assumption in this lane into evidence. **Highest
   value per unit of work.**
3. **Executed coverage for the 21 `router.use`-cleared handlers** — the next tier of weak
   clearance. Exact list (the `[` matters; without it you also get 3 tally lines):
   ```
   node backend/scripts/audit-idor-surface.mjs --verbose | grep '\[router\.use'
   ```
   Mostly `adminClientRoutes` / `adminWorkoutLoggerRoutes`, plus `renewalAlertRoutes.mjs:54`
   behind `requireStaff`. Copy `groupParticipantAuthzExecution` and **mutate the guard** — a
   suite that has not been mutated is not evidence.
4. **Loose id coercion at controller boundaries — latent, not live.** `uploadClientPhoto` runs
   `Number(req.params.clientId)` *before* the guard, so `"0902"`, `"+902"`, `"902.0"`, `"0x386"`,
   `" 902"` are all the same endpoint, and **`"9e2"` silently addresses user 900.** Harmless today
   because the ownership check refuses them anyway. Worth grepping `Number(req.params` repo-wide.
5. **Corpus hygiene:** 15 packets currently FAIL `hermes-learning-validate.mjs` (pre-existing).
6. **Do NOT build the cross-role matrix.** Kimi's rejection stands.

---

## 7. Working conditions in this tree — read before you touch anything

- **You are not alone.** A sibling Claude session commits to **this same branch** (`49ba6b579`
  landed mid-session) and another works the main tree. Re-check `git log` before assuming HEAD is
  yours. Read `.ai-workflow/coordination/*.lane.md` and claim your files.
- **`node_modules` is SHARED.** I emptied this worktree's `backend/node_modules` by junctioning it
  into a throwaway worktree — `git worktree remove --force` followed the junction. Recovering with
  `npm ci` then **broke a sibling session's test runs**, which watched vitest degrade through
  three increasingly-wrong errors while nothing was actually broken. **Never junction
  `node_modules`.** And a vitest failure here is not evidence the toolchain is broken — check
  `ls node_modules/vitest/package.json` and the process count first.
- **Stale `.git/index.lock` will block you.** Cost me 5 minutes. Confirm with **two** instruments
  (`tasklist` and `ps -W`) plus a positive control that the probe sees processes at all, before
  removing it.
- **A trap that restores with `git checkout` discards your own uncommitted edits.** Mine reverted
  a file I had just hand-edited. Restore from a copy.
- **Git Bash lies on `<rev>:<path>`** — use `MSYS_NO_PATHCONV=1`. Used throughout this session.
- **Verify branches by content, not SHA** — Codex rewrites history here.
- **Do not report audit flags as findings.** Trace each one. A passing handler is not proven safe.
- **`verifyClientAccess` routes must accept 403 OR 404** — the 404 is deliberate, to avoid leaking
  resource existence.
- `frontend/dist` (54 MB, gitignored) is left built so you can re-run the bypass grep without a
  rebuild. Delete it freely.

---

## 8. The lesson this lane keeps re-learning — apply it to me

Three probes lied to me in one session, and **each looked exactly like a correct answer**:

1. `grep --include=*.tsx --include=*.ts` returned **zero** bypass writers. Both live in
   `.jsx`/`.js`. The filter I chose *was* the finding.
2. The contract test I wrote to fix that flagged a **guard against** the bypass as the bypass —
   assertion strings and code are the same bytes to a text scan.
3. A test-count comparison across environments where the suite has no stable count.

A fourth, inside the commit describing the third: `git add … | tail -2 && echo "STAGED OK"`
printed **STAGED OK on a failed `git add`**, because `tail` exited 0.

A fifth, while writing *this* handoff: I piped the consult script through `tail` and read
`EXIT=0` on a run that had failed, and was one edit away from writing "the tool exits 0 on a
missing document" into §2a as a defect **for you to act on**. Measured unpiped, it exits 1
correctly. That is the same mistake three times in one session, and the third time it very
nearly manufactured a false finding in a document whose entire purpose is to be trusted.

**The operative rule: every probe carries a positive control — a case that MUST succeed.** A
scanner that silently reads nothing reports the same clean result as a clean codebase. Never emit
a verdict in the same statement as the command that produces it.

**Now turn that on me.** My dry-loop came back `CLEAN×2 (rounds: 23)`. That is a claim made by the
person with the strongest incentive to stop looking. The corpus already contains a packet titled
*"a control that passes can still be a decoration"* — written about this exact codebase, two days
ago, by an agent as confident as I am now.

---

## 9. Artifact map

**Committed, travels with the repo:**
1. **This file** — start here.
2. `SESSION-HANDOFF-AUTHZ-EXECUTED-2026-08-14-C.md` — evidence detail for what I shipped.
3. `SESSION-HANDOFF-AUTHZ-CLOSED-2026-08-14-B.md` — the 5 reader defects, the bypass proof.
4. `AUTHZ-CONTROLLER-HOP-VERIFICATION-2026-08-14.md` — per-handler traces from session B.

**On the wip branch, mostly unpushed (§5):**
5. `docs/ai-workflow/hermes-learning-packets/20260814-the-positive-control-is-the-procedural-form.md`
   — my durable lesson. Read it before reviewing my probes; it is the map of how I fail.
6. `…/20260814-the-instrument-is-part-of-the-system-under-test.md` and
   `…/20260814-a-documented-lesson-is-not-a-fix.md` — the two it extends.

**Gitignored, machine-local, will NOT survive a machine change:**
7. `.ai-workflow/hermes-inbox/pending/20260814T225514Z-vs-claude-authz-executed-and-three-lying-probes.md`
   — my inbox memo, including every mistake I made.
8. `.ai-workflow/coordination/*.lane.md` — who is editing what right now.

**LINEAR: N/A — the Linear MCP is not configured in this session.** Verified two ways:
`LINEAR_API_KEY` unset in the process env, and `.mcp.json` lists only `playwright` and
`swan-scout`. `ToolSearch` for `save_issue`/`save_comment` returned nothing. Five items are owed
to the board the moment it is reachable — they are listed in §6 plus the two Sean-actions in §5.
Do not fabricate an SWA id; capture them properly when the key is set.
