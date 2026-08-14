---
surface: security / launch-readiness
task: Cross-role authorization matrix — design (not built)
author_model: claude-opus-5
date_utc: 2026-08-14T02:45:00Z
status: design committed, external review in flight
---

# Cross-role authz matrix design + four instrument defects in one session

## What happened

The four-role launch-readiness Playwright audit walks each role through **its own** pages and never
attempts a crossing. It is therefore structurally incapable of detecting broken access control
(OWASP A01). A 100%-green launch audit is compatible with total authorization failure. Owner
identified this gap; design written to close it.

Design committed as `4c0081ae8` on `claude/qa-harness-slice0-20260811`. Not built. Sent to Kimi K3
and HY3 for hostile review before implementation.

## Who did what

- **claude-opus-5 (me)** — verified the prior session's artifacts existed, measured authz coverage,
  wrote the design, ran a 4-round dry loop against my own work, found and corrected three of my own
  errors. Cost: subscription, $0 marginal.
- **Kimi K3 + HY3** — hostile review of the design, in flight at time of writing. Owner-authorized,
  one call each, `--confirm-spend`, $3 cap per script. Calibration pending; record it when they land.
- **codex** — working a separate worktree (`C:/tmp/sspt-dashboard-hostile-audit-...`) with active
  file locks. No overlap with my lane. Also rebased a shared branch, which orphaned the SHAs a
  previous session had cited (see below).

## Verified facts worth carrying

- Roles are `admin | trainer | client | user` (`frontend/src/routes/protected-route.tsx:125-126`).
- **230** backend route files; **55** take `:userId`/`:clientId`; **25** use `verifyClientAccess`;
  **37** gap. Identical on HEAD and `origin/main` (`git diff HEAD origin/main -- backend/routes/`
  is empty). The 37 are a **test-target list, not a findings list** — most will be legitimately
  admin-only or self-scoped.
- `verifyClientAccess` returns **404, not 403** on cross-user access (lines 166/201/206, verified in
  code not comment) — deliberate, to avoid leaking resource existence. Any assertion demanding 403
  will produce false HARNESS failures against correct code.
- `protected-route.tsx:258` aliases `user` → `client`. A free `user` satisfies any
  `allowedRoles={['client']}` gate. Owner decision pending: intended, or a paywall hole.
- `clientTrainerAssignmentRoutes.mjs` is in the gap. If a trainer can create their own assignment
  row, they mint access to any client and every downstream `verifyClientAccess` correctly returns
  "allowed" — **one endpoint that can defeat the whole guard layer.**
- Socket layer is a genuine blind spot: `socket.io ^4.8.1`, auth in `backend/socket/`. Express
  middleware does not run there.

## Skills created or changed

None. The lesson below is procedural and belongs to existing discipline (validate-the-instrument),
not a new skill. Resisting the urge to mint a skill per lesson — the existing one already covers it
and a second overlapping entry weakens both.

## Mistakes I made

- **My coverage measurement used a non-recursive shell glob** (`backend/routes/*.mjs`), which hid
  **34 subdirectory route files** — including the entire `social/` family (posts, friendships,
  group membership). Reported 33 files with full confidence; the true number is 37. Caught in
  dry-loop round 2 by re-measuring with `git grep` (which recurses). Had this shipped, the matrix
  would have been built with the social surface — the most likely home of user-to-user IDOR —
  entirely absent, and would have reported full coverage of its own target list.
- **I rated user→user crossings P2** on the reasoning that "user surfaces are the least
  privileged." Wrong: privilege level is not data sensitivity. Private posts and social graph are
  PII. Corrected to P0. This error was *caused by* the first one — with `social/` invisible, the
  user tier looked empty of anything worth stealing.
- **I asserted a safety property with no evidence.** Claimed the dev-mode localStorage role-check
  bypass (`protected-route.tsx:238-247`) was dead code in production "verified — do not report."
  I had taken it from Vite's documented default `NODE_ENV` replacement, not from this repo: there
  is no `define` in the vite config and no `dist/` to grep. Downgraded to a required empirical
  check (`npm run build && grep -rl "bypass_admin_verification" dist/`).
- **My round-4 verification regex was digit-blind** (`[A-Za-z/]+\.mjs`), splitting
  `gamificationV1Routes.mjs` at the `1` and reporting a phantom mismatch. A false *positive* —
  I nearly "fixed" a document that was already correct.
- **I initially objected to pushing the harness branch on stale-tree grounds that were wrong.**
  I read "1926 commits behind" from the session-start hook and attached it to the harness branch;
  it described a different branch. The harness branch is 5 ahead / 42 behind with identical
  routes to main. I did check before acting, but I voiced the objection before checking.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before recurring? | What actually stopped it |
|---|---|---|---|
| Trusted a tool's scope without validating it | **4** (SHA check by prior session; my glob; my NODE_ENV assumption; my round-4 regex) | **YES — the existing "validate the instrument before believing a negative" packet, and the prior session's own SHA writeup hours earlier** | Nothing yet has stopped it. Each instance was caught by *re-deriving the same fact with a different instrument*, never by remembering the rule. |

**This is the highest-signal entry here.** The lesson was already documented and was repeated four
times in one session, twice by me *after* reading it. That proves the write-up is not a fix. The
correction that survives is procedural, not resolutional: **"be careful with tools" changes
nothing; "before any count or absence claim, re-derive it with a second, differently-shaped
instrument and require the two to agree" is executable.** Note also the class is wider than the
existing packet says — it covers false *positives* (round-4 regex) and false *counts*, not only
false negatives. The existing packet's title under-scopes the failure.

## External-model calibration

Kimi K3 and HY3 in flight; findings-real-vs-disproven and cost to be appended when they return.
Both were given an identical adversarial remit so the two verdicts stay independent and comparable.

## Owner-gated items

1. Push `claude/qa-harness-slice0-20260811` (never pushed; harness exists only on this machine).
   Its upstream is misconfigured to `refs/heads/main` — a bare `git push` there targets the deploy
   branch. Fails safe today on `push.default=simple` name mismatch only.
2. Is the `user`→`client` alias intended, or a paywall hole?
3. Can trainers self-serve their own client assignments?
4. `npm run build && grep -rl "bypass_admin_verification" dist/` — ten seconds, gates a potential
   browser-side admin bypass.
