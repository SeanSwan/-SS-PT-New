---
decision: B's punch-list items 2 and 3 are DONE (bypass writes deleted + pinned by a contract
  test, prekey limiter added). Item 1 is ADVANCED, NOT DONE — all 8 controller-hop handlers now
  have EXECUTED mutation-verified authz tests, but ~203 of 211 handlers still have none. Next
  tier is the 21 router.use-cleared handlers; the tail is the 179 cleared route-level.
status: open
supersedes: none
extends: SESSION-HANDOFF-AUTHZ-CLOSED-2026-08-14-B.md
---

# Session Handoff C — the audit's weakest clearances now execute

**Date:** 2026-08-14 · **Author:** Claude Opus 5 (session `main-s65632ef3`) · **Surface:** vs-claude
**Branch:** `claude/qa-harness-slice0-20260811` (worktree `C:/tmp/ss-qa-harness-slice0`)
**Predecessor:** `SESSION-HANDOFF-AUTHZ-CLOSED-2026-08-14-B.md` — still accurate on authorization
findings; **its §7 punch-list and two §8 claims are superseded below.**

> **Self-contained.** Read this, then `.ai-workflow/coordination/*.lane.md`, then act.
> Read B only for the origin story of the five audit-reader defects.

---

## 1. The one-paragraph version

B closed the authorization *question* and left a punch-list. **Two of its items are DONE; the
big one is advanced, not finished.** The two dead admin-bypass write sites are deleted — plus
a **third B did not know about** — and a contract test now fails CI if anyone re-adds one. The
prekey endpoint is rate-limited per (actor, target). And the named next slice landed in part:
**all 8 handlers the IDOR audit could only clear by hopping into a controller now have executed
tests** — 74 tests across 4 suites, plus 6 more for the limiter (80 new in total). Every suite
was mutation-verified rather than merely passing.

**Executed authz coverage remains item 1 on the list.** Eight handlers is the audit's weakest
*category*, not its bulk — ~203 of 211 handlers still have no executed test, and static
clearance still stands in for proof on all of them. This session made the hardest eight real;
it did not close the gap.

---

## 2. What changed since B

| | B (start of this session) | Now |
|---|---|---|
| Punch-list items 2 & 3 | open | **both shipped** |
| Controller-hop handlers with an executed test | 0 of 8 | **8 of 8** (4 new suites) |
| Bypass **writers** in source | 3 (B knew of 2) | **0**, pinned by a contract test |
| Bypass writers in a production build | 1 file | **0** |
| `GET /encryption/keys/:userId` | unlimited | **20/hour per (actor, target)** |
| `backend/routes/` vs `origin/main` | byte-identical | **NO LONGER** — see §5 |

**Commits** (all secret-scan CLEAN, all on `claude/qa-harness-slice0-20260811`):

| SHA | What |
|---|---|
| `d103344f9` | executed authz tests, 7 of the 8 handlers |
| `64efe4afc` | the 8th handler + correction of `d103344f9`'s own count |
| `89db1f740` | delete the dead bypass writes, add the pinning contract test |
| `7b76c7f53` | prekey-exhaustion rate limiter |

Do not trust that table to stay complete — a sibling session also commits here (`49ba6b579`).
Re-derive: `git log --oneline origin/main..HEAD`

**Two different counts of "execution coverage" are in circulation; do not reconcile them.**
B's addendum says "1 execution file → 9", counting *files* whose names match an idor/authz
pattern — which includes pre-existing ones (`bootcampGenerateProfileIdor`,
`cartUserIdCoercionIdor`, `variationRoutesEquipmentIdor`). This document counts *handlers newly
covered* (8). Both are correct about different things. The units are the whole disagreement.

---

## 3. The next slice, delivered — 8 handlers, mutation-verified

The audit clears 208 of 211 handlers. Its **weakest** evidence is the `INDIRECT — controller`
class: to see a guard at all it must follow a function out of the route file into another
module. Eight handlers rest on that, and none executed. They now do.

Re-derive the target list at any time:
```
node backend/scripts/audit-idor-surface.mjs --verbose | grep '\[controller '
```

| Endpoint | Suite |
|---|---|
| `PATCH /messaging/conversations/:id/participants/:userId` | `groupParticipantAuthzExecution` |
| `DELETE /messaging/conversations/:id/participants/:userId` | `groupParticipantAuthzExecution` |
| `POST /client-onboarding/:userId/questionnaire` | `clientOnboardingAuthzExecution` |
| `GET  /client-onboarding/:userId/questionnaire` | `clientOnboardingAuthzExecution` |
| `POST /client-onboarding/:userId/movement-screen` | `clientOnboardingAuthzExecution` |
| `PUT  /badges/user/:userId/:badgeId/display` | `badgeConsentAuthzExecution` |
| `GET  /ai/consent/status/:userId` | `badgeConsentAuthzExecution` |
| `POST /profile/clients/:clientId/photo` | `clientPhotoUploadAuthzExecution` |

The messaging pair is the crossing this whole review opened for — *"can A remove B from a
conversation A does not own?"* — which until now had been answered by **reading** the
controller, never by calling it.

**Each suite pins an asymmetry that is invisible in its route file:**
- a group **admin may EJECT** a member but **may not PROMOTE** one (owner-only) — so an admin
  cannot self-perpetuate the admin set
- a client may write their own questionnaire but **may not file their own NASM movement
  screen** (`ensureTrainerAccess` passes `allowSelf: false`) — clinical data stays trainer-authored
- an **assigned trainer** may read a client's questionnaire but **may not publish their badge**
  — coaching access is not publication consent

**Mutation-verified, not merely passing.** Each guard was broken in turn and the suite had to
notice. This is the part worth copying, because every suite went green the first time it
actually executed — which per B's own learning packet is exactly when a test is most likely to
be decoration. (Only `badgeConsentAuthzExecution` needed a second attempt, and that was a
harness fault, not a test one: `aiRoutes` drags in enough of the AI subsystem that the
`authMiddleware` mock had to cover its whole export surface before anything ran.)

| Mutation | Tests that failed |
|---|---|
| `canRemoveParticipant` → `true` | 4 |
| `canManageParticipantRole` → `true` | 1 (the promote/eject split) |
| onboarding self-ownership comparison disabled | 9 |
| `ensureTrainerAccess` `allowSelf` → `true` | 2 (exactly the self-file pair) |
| badge `canEditDisplay` → `true` | 3 |
| consent client gate removed | 1 |
| prekey keyGenerator collapsed to actor-only | 1 (**the design test**; the 429 test still passed) |

That last row is the sharpest: a limiter keyed on the actor alone still produces 429 on a
burst, so the obvious test would have certified a limiter that breaks group chat. Every
mutation was reverted and the tree verified clean afterwards.

---

## 4. Punch-list items 2 and 3 — both closed

**Item 2 — dead bypass writes. B listed EmergencyDashboard; there was a third writer.**
`config.js` exposed `window.adminAccess.force()`, which wrote both flags and logged
"Admin access bypass flag set" — untrue since the reader was retired. B's grep had not
covered `.js`/`.jsx`. All three writers are gone; `reset()`/`showUser()` stay because
clearing and reporting stale state still helps users carrying flags from an older build.

**`adminBypassFlagsUnwritten.contract.test.ts` is the durable half.** Deleting the writes
fixed today; the test fails CI the day someone adds one back. It asserts no writer exists, no
reader appears outside the two known ones, and no console helper offers to force admin access.

`protected-route.tsx` is deliberately **not** touched: its read is dev-gated, proven absent
from a production build, and pinned by `adminDashboardLocalRecovery.contract.test.ts` (Rule 52).
With every writer gone that branch is unreachable unless a developer hand-types the keys into
devtools.

**Item 3 — prekey exhaustion.** `fetchKeyBundle` consumes one of the target's one-time prekeys
per call. Now 20/hour **per (actor, target)** — deliberately unlike every other limiter in
`rateLimiter.mjs`, which are all per-IP. The attacker is authenticated, so an IP key is both
evadable and harmful (a gym behind one NAT). Severity stays **LOW** and should not be inflated:
Signal degrades gracefully — an empty pool still returns a bundle with `oneTimePreKey: null`
and sessions still establish. What justified the fix is the unbounded attacker-driven *write*.

---

## 5. Two claims in B that are now FALSE — do not carry them forward

**`backend/routes/` is no longer byte-identical to `origin/main`.** `encryptionRoutes.mjs`
differs by 4 lines (the limiter). B used that identity to argue its counts described the real
production surface. Re-derived after the change: **230 scanned / 211 handlers / 208 guarded /
3 flagged, exit 0, "no NEW unguarded handler(s)"** — the ratchet keys on route signature, so
the flagged entry moving `:80`→`:84` did not break it. Re-derive, never cite:
```
node backend/scripts/audit-idor-surface.mjs
git diff --stat origin/main HEAD -- backend/routes/
```

**B's "2 failed / 2577 passed / 4 skipped" is not a number you can do arithmetic on.**
I lost three full test runs trying to reconcile it against mine before measuring the right
thing. Same command, four environments:

| Where | Result |
|---|---|
| this worktree, twice | 2 failed / **2655** passed / 4 skipped / 2661 total |
| same, after a fresh `npm ci` | 2 failed / **2648** passed / **11** skipped / 2661 total |
| detached worktree at the pre-session commit | 2 failed / **2554** passed / **15** skipped / 2571 total |
| with `--exclude` on my files | 2 failed / 2567 passed / 11 skipped / 2580 total |

**Only the collected total (2661) and the failure count (2) are stable.** The passed/skipped
split moves with the environment, and `--exclude` perturbs collection outright. B shipped a
bare passed-count for a suite that does not have a stable one — the same mistake B's §8
corrected for *branch* counts ("ship the command, not the number") and did not apply to
*test* counts. So: **quote the total and the failures; never the passed count.**

The 2 failures are `associationsModelRegistryParity` and `phase1bControllers`, plus
`memberDirectoryLateralProbe` failing at file level. All three byte-identical to `origin/main`,
none touched by any commit here — **Codex's lane, unchanged from B.**

---

## 6. Proof state

**Established this session, reproducible:**
- 8/8 controller-hop handlers execute — target list re-derived from the audit, not memory
- 127 tests green across 7 suites — 4 new authz-execution (74), the new limiter suite (6), and
  the two pre-existing `clientResourceIdorExecution` (37) + `idorAuditReaderControls` (10)
- every guard mutation-verified; every mutation reverted and the tree confirmed clean
- production build re-grepped with a positive control (`localStorage` → 25 files):
  **0 reads, 0 writes, 0 `EMERGENCY FIX`, 0 sourcemaps.** B's build had 1 writing file.
- `vite build` OK; audit exit 0; secret scan CLEAN on all 4 commits
- the limiter's IP-fallback branch probed directly (v7 raises no IPv6 `ValidationError`)

**NOT established — unchanged from B and still the real gap:**
- **No test has hit production.** The suites mock `authMiddleware`, so they prove authorization
  *given a correctly-populated `req.user`* — not that `protect` populates it. Nobody has closed this.
- **~203 of 211 handlers still have no executed test.** The audit's own tally splits the 208
  cleared as **179 route-level + 21 `router.use` + 8 controller-hop**; only the last group is
  done here. The 21 are the next tier, the 179 are the tail. (The three older IDOR suites —
  `bootcampGenerateProfileIdor`, `cartUserIdCoercionIdor`, `variationRoutesEquipmentIdor` —
  cover some of the 179; nobody has mapped which, so "203" is an upper bound on the gap.)
- The `9e2` finding (§7) is a latent sharp edge, not a vulnerability today.

---

## 7. What is actually left, ranked

1. **Executed coverage for the 21 `router.use`-cleared handlers.** The next tier of weak
   clearance now that the controller-hop set is done. Exact target list (verified to emit 21
   handler lines — note the `[` , without it you also get the 3 tally lines):
   ```
   node backend/scripts/audit-idor-surface.mjs --verbose | grep '\[router\.use'
   ```
   Mostly `adminClientRoutes` / `adminWorkoutLoggerRoutes` (admin-gated, so the crossing to
   test is trainer-or-client reaching an admin route), plus `renewalAlertRoutes.mjs:54`
   behind `requireStaff`. Same shape as the four suites landed here — copy
   `groupParticipantAuthzExecution` and mutate the guard to prove the suite is not decoration.
2. **Close the `protect` gap.** Every authz suite in this repo mocks `authMiddleware`. One
   integration test that drives a real token through the real `protect` would convert a large
   standing assumption into evidence. Highest value per unit of work on this list.
3. **Loose id coercion at controller boundaries — latent, worth a sweep.**
   `uploadClientPhoto` does `Number(req.params.clientId)` *before* the guard, so `"0902"`,
   `"+902"`, `"902.0"`, `"0x386"`, `" 902"` are all the same endpoint, and **`"9e2"` silently
   addresses user 900.** Harmless today because the ownership check refuses them anyway — but
   any future "fast path" that skipped that check for a self-looking id would make it live.
   Worth grepping for `Number(req.params` across controllers.
4. **Two pre-existing `main` test failures** — Codex's lane, flagged not fixed (Rule 52).
5. **Do NOT build the cross-role matrix.** Kimi's rejection stands (unchanged from B).

---

## 8. Standing cautions

- **Branch still not pushed.** Owner-gated, carried from B. Its upstream is misconfigured to
  `refs/heads/main`, so a bare `git push` from this worktree targets the deploy branch.
  Safe: `git push origin claude/qa-harness-slice0-20260811:claude/qa-harness-slice0-20260811`
  then `git branch --unset-upstream`.
- **Never junction `node_modules` into a temp worktree.** I linked this worktree's
  `backend/node_modules` into a throwaway worktree to measure a baseline; `git worktree remove
  --force` followed the junction and emptied the real one. Recovered with `npm ci` (gitignored,
  nothing lost) — but the correct move is `npm ci` in the probe worktree, or don't probe.
- **`node_modules` here is SHARED with other live sessions, and my repair broke one of them.**
  The `npm ci` above is the "another agent was installing" in B's addendum: a sibling session
  watched `npx vitest` degrade through a `.vite-temp` race → `Cannot find package 'vitest'` →
  `'vitest' is not recognized`, with `node_modules/vitest` present throughout and 265 node
  processes running. Nothing was broken; I was reinstalling underneath it. **A vitest failure
  in this worktree is not evidence the toolchain is broken** — check `ls
  node_modules/vitest/package.json` and the process count, wait, retry. Full note in B's addendum.
- **A sibling Claude session commits to THIS branch.** `49ba6b579` landed while I was writing
  this file. Re-read and re-check `git log` before assuming HEAD is yours.
- **A trap that restores with `git checkout` will discard your own uncommitted edits.** Mine
  reverted a file I had just hand-edited. Commit first, or restore from a copy.
- Verify branches by content, not SHA — Codex rewrites history here.
- Git Bash lies on `<rev>:<path>` — use `MSYS_NO_PATHCONV=1`.
- Do not report audit flags as findings; trace each one. A passing handler is not proven safe.
- Assertions against `verifyClientAccess` routes must accept **403 OR 404** (404 is deliberate).
- Carried: rotate the Render API key; add the DMARC record (SWA-13).

---

## 9. The transferable lesson

B's lesson was *change instrument, don't look harder.* This session is the same lesson one
level down: **the instrument includes the thing you measure with, and it lies in ways that
look like data.**

Three times in one session a probe produced a confident wrong answer, and each looked
exactly like a right one: a `grep --include=*.tsx --include=*.ts` that missed both real
writers because they live in `.jsx`/`.js`; a contract test that reported a *guard against*
the bypass as the bypass itself, because assertion strings are indistinguishable from code
to a text scan; and a test-count comparison across two environments where the suite does not
have a stable count. None of the three was caught by re-reading. All three were caught by
running a second instrument of a different shape and requiring agreement.

**The rule that would have prevented all three: every probe carries a positive control — a
case that MUST succeed.** A scanner that silently reads nothing reports the same clean result
as a clean codebase. The contract test committed here ships three of them for that reason,
including one asserting its own walker reaches `.js`, `.jsx` and `.tsx` files — the exact
blindness that fooled me twenty minutes earlier.

And the corollary, earned by losing three test runs to it: **when a number cannot be
reconciled, the first hypothesis is that the number is not measurable, not that something
regressed.** Publish the command; publish only the figures that hold still.
