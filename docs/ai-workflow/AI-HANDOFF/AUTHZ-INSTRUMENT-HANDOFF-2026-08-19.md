# Handoff — Horizontal Authorization: the instrument, what it proves, and what it cannot

**Date:** 2026-08-19 · **Author:** Claude Opus 5 (session `main-s2e2f8326`)
**Worktree:** `C:/tmp/ss-qa-harness-slice0` · **Branch:** `claude/qa-harness-slice0-20260811`
**Position:** 51 behind / **1 ahead** of `origin/main` — the 1 is unpushed and matters (§1).

> Self-contained. Read this, run the three commands in §0, then start at §6.
> **Attack this document; do not inherit it.** Two of its predecessors carried claims that were
> true when written and false by the time they were read.

---

## 0. Verify before you trust — three commands, ~40 seconds

Do not take any number in this file on faith. Every one drifts.

```bash
cd C:/tmp/ss-qa-harness-slice0/backend
node scripts/audit-idor-surface.mjs        # the instrument. exit 0 = no NEW findings vs baseline
npx vitest run tests/api/idorAuditReaderControls.test.mjs   # MUST say 16 passed, never "no tests"
npx vitest run 2>&1 | grep -E "\(0 test\)|Test Files"       # the open class — see §5
```

**If the middle command says `Tests  no tests`, stop and read §1 before anything else.** That is
not a missing file; it is the failure mode this whole lane exists to catch, and it presents as
silence rather than as an error.

Verify the branch by **content, not SHA**. This branch has been rebased at least twice; SHAs cited
in older handoffs are orphaned, and `git cat-file -e` still returns success for them because
dangling objects persist. Use:

```bash
git show origin/main:backend/scripts/audit-idor-surface.mjs | grep -c GUARD_CALLEE   # expect 3
```

---

## 1. START HERE — one unpushed commit restores 16 dead security controls

`9dc9ea35a fix(authz-audit): drop the shebang — it had silently killed all 16 controls`

**On `origin/main` right now, the control suite for the authorization instrument runs ZERO tests.**
The reader corrections themselves ARE on main (verified by content above). The shebang is also
still on main, and that is what kills the controls.

**Mechanism.** Vitest's esbuild transform rejects a `#!` line in an **imported** module. It reports
that as `(0 test)` against the *importing* file, not as an error in the guilty one. So the CLI kept
working perfectly under `node` — 230 files, 211 handlers, 190 clear — while every control that
exists to stop that reader from over-clearing was silently absent. Neither file had changed: the
original blob diffs byte-identical to HEAD ignoring CR. **The toolchain moved under a file that was
already correct.**

Nothing invokes the script as `./audit-idor-surface.mjs`; `npm run audit:idor` and `audit-all.mjs`
both spawn it with `node`. The shebang bought nothing and cost the controls.

**Recommended first action:** push this one commit. It is a single file, no runtime surface, no
migration, and it turns 16 security controls back on.

```bash
git push origin claude/qa-harness-slice0-20260811:claude/qa-harness-slice0-20260811
git branch --unset-upstream     # its upstream is misconfigured to refs/heads/main
```

⚠ **Never use a bare `git push` from this worktree** — the upstream points at `main`, which is
deploy-linked and runs `npm run migrate:production`.

---

## 2. What the instrument is, and what it is NOT

`backend/scripts/audit-idor-surface.mjs` is a **static reader**, not a prover. For every route
handler whose path carries a user-identifying param, it asks: is there visible evidence that this
caller is bound to this resource?

**Current output (re-derive it; do not quote this table):**

| | |
|---|---|
| route files scanned | 230 |
| user-scoped handlers | 211 |
| show a visible check | 190 |
| accepted backlog | 21 |

**Read the backlog correctly.** It went 3 → 21 deliberately. The reader stopped awarding clearances
it could not justify. **No authorization vulnerability has been found by anyone in this lane** —
roughly 29 handlers were hand-traced and every one was guarded. The 21 are handlers whose guard the
*reader* cannot see, not handlers that lack one.

**Structural limits, stated so nobody re-discovers them:**
- It cannot follow a guard into the service layer. One hop route→controller, plus `export {} from`
  barrel resolution. A controller delegating to a service still reports unguarded.
- A handler it PASSES is not proven safe. Only a two-user negative test proves that.
- The app connects to Postgres as the table owner, which **bypasses RLS** — so the application
  layer is currently the only authorization enforcement in the system.

---

## 3. The five defects fixed in the reader, and why each mattered

Kept because each is a shape that will recur, not a line that was wrong.

1. **A role gate is not an ownership gate.** `clientOnly` on `GET /:clientId/pain-log` stops
   trainers and admins — not the other clients, which is the whole attack. `authorize(['client'])`,
   `requireSubscription`, `requireTier`, `requireFeature` were all clearing. Split into
   `STAFF_GATE_NAME` (trusted across users) vs the rest; inline `authorize(...)` is decided by its
   **argument**, not its name.
2. **A sink denylist is an inverted allowlist.** It excluded `console.log` and cleared on every
   other callee, so `auditLog('read', req.user.id, req.params.userId)` cleared a handler with zero
   authorization — and this codebase writes actor-attributed logging diligently, so the incentive
   was inverted along with the list. Replaced with a `GUARD_CALLEE` allowlist.
3. **The comparison was never required to involve the param.** `req.user.role === 'client'` cleared
   `/users/:id`. Now the param must be the other operand, through up to **two** alias hops, because
   the real idiom is `const { clientId } = req.params` → `parseStrictPositiveInteger(clientId)` →
   `String(requestingUserId) !== String(parsedClientId)`.
4. **`expandSpreads` captured to the first `]`** — nested inside `authorize(['trainer','admin'])` —
   truncating the array immediately before `verifyClientAccessByUserId(...)`, the only member that
   binds the param. Eight of the most sensitive handlers were defended three ways and it read a
   fragment. **This bug was old and invisible because a second defect masked it:** the blind
   `authorize\s*\(` cleared those handlers anyway.
5. **`router.use` read only the first identifier**, missing `router.use(protect, adminOnly)`.

**The generalisable one:** when tightening a check produces a burst of new failures, read them as a
map of what the old looseness was covering — not as a regression to tune away. I nearly widened the
new check to silence eight true positives, which would have restored two defects and called it a fix.

---

## 4. What is proven, and what is assumed

**Proven** — 16 controls, each locking a case that was live; every one verified red under a
grep-confirmed mutation before being trusted. Two end-to-end negative probes (a bare
`req.params.userId` read under `router.use(protect)`; a guardless controller behind a barrel
re-export) are still flagged, so the clearance count is detection and not blindness.

**NOT proven — say this out loud in any report:**
- **Nothing here proves runtime behaviour.** It is static analysis plus code reading.
- Executed authorization tests cover a small fraction of 211 handlers and **mock the auth
  middleware** — they prove authorization *given* a correctly-populated `req.user`, never that
  authentication populates it correctly.
- The concrete fail-open shape that architecture cannot see:
  `String(req.user?.id) === String(req.params.userId)` evaluates `"undefined" === "undefined"` →
  **true** for an unauthenticated request to `/users/undefined/...`. Optional chaining is confirmed
  in 89 files. Whether such a route exists is **unverified**.

---

## 5. OPEN — 18 backend test files contribute ZERO tests

Found while sweeping for the class behind §1. **Not mine, not fixed, and the highest-leverage
cleanup available**, because a suite reporting 0 tests is worse than one that fails: the file list
still says it ran.

Derive the current list rather than trusting this one — it drifts:

```bash
cd backend && npx vitest run 2>&1 | grep "(0 test)"          # the zero-test files
grep -rl "from 'node:test'" tests/ | wc -l                    # the dominant cause
```

At the time of writing that was **18 zero-test files**: the large majority import from `node:test`
while sitting in a directory vitest globs, and **2** (`adminWorkoutLoggerHistoryDate`,
`editWorkoutDateParsing`) die on a separate `default.defi…` import error and are undiagnosed. Note
the `node:test` grep also returns 18 across `tests/`, which is **not** the same set — some globbed,
some not — so do not treat the two 18s as the same number, as I nearly did.

The `node:test` class was raised in the coordination review queue days ago by another agent and is still open. Three options were offered there — port to vitest, exclude `node:test`
files from the vitest glob, or add a separate `npm run test:node`. **The choice belongs to whoever
owns that lane**, which is why I did not make it for them.

Full suite when written: `Test Files 23 failed | 1153 passed`, `Tests 8 failed | 9300 passed`.

---

## 6. Next slices, ranked — start at the top

1. **Push `9dc9ea35a`** (§1). One file, restores 16 controls on main. Minutes.
2. **Executed two-user negative harness, parameterized from the reader's own inventory.** Boot the
   app with **real** JWT verification — no mocked `protect`, since the mocked tests are structurally
   incapable of seeing the §4 population failure — seed user A, user B, and a trainer assigned to A
   only; for each route in the emitted inventory, request A's `:userId` with B's token and assert
   403 **or 404** (`verifyClientAccess` returns 404 deliberately, to avoid leaking existence —
   demanding 403 produces false failures against correct code). Start with the SENSITIVE-ranked
   rows. **This is the only thing that converts "190 cleared" from a claim into evidence.**
   Its precondition — that the inventory be corrected first — is now satisfied.
3. **Resource-shaped IDOR is outside the instrument entirely.** `/photos/:id`, `/orders/:id`,
   `/measurements/:id` — where the param names a *thing* whose owner must be resolved through the
   row — is the canonical attack in a training SaaS. **251 such handlers exist**, against the 211
   audited. The headline describes a self-defined subset roughly half the size of the uncounted one.
   Separate inventory, not a tweak.
4. **The baseline accepts a key, not a behaviour.** Keyed on `verb|route|file`, so an accepted
   handler can be edited to return private material and the ratchet stays green. Observed live: an
   accepted endpoint moved `:80 → :84 → :150` while its acceptance never re-reviewed. Add a content
   hash to accepted entries.
5. **Split the reader into library + CLI.** `wc -l backend/scripts/audit-idor-surface.mjs` → **590**
   against a Rule 4 cap of 300, and the §1 defect is a direct consequence of one file being both an
   import target and an executable. Splitting fixes the cap violation and the defect class together.
6. **Resolve the 18 zero-test files** (§5) with the owning lane.

---

## 7. Owner-gated — needs Sean, not an agent

1. **`GET /keys/:userId` (prekey bundle).** External review escalated this twice: if unauthenticated
   it is an anonymous **user-enumeration oracle** (differential 404); if unthrottled, repeated
   fetches **drain a target's one-time prekeys**, degrading their E2EE to unsigned-prekey fallback —
   an availability attack on confidentiality infrastructure through a "public" endpoint. A limiter
   landed (`fa5556ceb`, `cab3eee2b`); **confirm it counts victims and that the endpoint requires auth.**
2. **Rotate the Render API key** (exposed 2026-08-12; only Sean can revoke it).
3. **DMARC record (SWA-13)** — standing request, gates nurture-arming and booking email.

---

## 8. Coordination state

- Ledger lives in the MAIN repo, resolved via `git rev-parse --git-common-dir` — it is NOT at
  `./.ai-workflow/coordination/` from this worktree, so that relative path will 404 on you (a
  previous handoff in this lane shipped exactly that dead pointer). Reach it with
  `node scripts/lane.mjs digest` from **this worktree**
  (in the main tree `scripts/lane.mjs` is missing and `scripts/lib/lane.mjs` throws
  `ERR_MODULE_NOT_FOUND` on `lib/lib/lane-core.mjs` — broken there, working here).
- **Talk to peers in the ledger's `review-queue.md`** (path per the bullet above). It is a channel, not a notice board (Rule 67 R1b). Read
  their commits and any `SESSION-HANDOFF-*` before forming a plan (R1c) — a peer's committed finding
  has already overridden a recommendation in this lane once.
- The `AGENTS.md` / `CLAUDE.md` mirror hazard flagged earlier **has been resolved** by another
  agent (`f17502bf9 docs(constitution): the mirror is retired`). The old warning is obsolete;
  the drift-check advice was also rewritten to stop recommending a destructive sync.

## 9. Model calibration for whoever reviews this

| Model | What it is good for here | Cost |
|---|---|---|
| **kimi-k3** | **Category** defects — the axis you conflated, the predicate you inverted. Found all three S1s that 12 rounds of Claude self- and peer-review missed. | ~$0.21/review |
| **GLM-5.3** | Heavily used by the parallel lane this week with real yield (15 of 18 findings applied on one pass). Cheap. | low |
| **HY3** | Returned **nothing** twice on long adversarial documents at high effort. | avoid, or route low |
| **Peer Claude** (Rule 67 R7) | **Implementation** defects — unbounded windows, missed files, wrong offsets. Highest yield per dollar available. | free |

**Use the free peer lane first. Escalate to Kimi when you need the category checked, not the code.**
