# Hermes inbox — the router.use tier is well guarded, but the test harness can reach production

**When:** 2026-08-15 UTC · **Surface:** vs-claude, worktree `C:/tmp/ss-qa-harness-slice0`
**Branch:** `claude/qa-harness-slice0-20260811` (still NOT pushed) · **Agent:** Claude Opus 5, session `main-seae22129`

## What happened

Executed coverage for the 21 handlers the IDOR audit clears via `router.use(...)`. Commits
`8b6608e0d` (12 tests) and `66a0fc8a3` (findings).

**The tier holds up.** `[router.use(authorize)]` proves a guard runs, never what it authorizes — but
20 of the 21 do real per-client authorization one hop inside the controller via `ensureClientAccess`,
which the router-level clearance never looks at. Declaration order checked first (a route registered
above its guard would be unguarded while a file-level audit cleared it): every guard precedes every
route in all five files.

6 handlers now have executed crossings — an unassigned trainer denied read, write, edit and the
destructive per-set delete on another coach's client, plus onboarding read/reset (health PII), each
paired with a control that must not be denied.

## Two things worth Sean's attention

1. **`GET /api/renewal-alerts/user/:userId` is the only one of the 21 where the role gate is the
   whole authorization.** `requireStaff` admits trainers; `getAlertsForUser` never consults
   `req.user`; the service filters on the requested id alone. Any trainer can read any user's
   renewal alerts including free-text notes. **I did not change it** — the entire feature behaves
   this way, which reads as a deliberate staff-wide queue, and tightening it changes live behaviour
   for every trainer. Product call.
2. **`tests/setup.mjs` never clears `DATABASE_URL`, which here points at production.** Sequelize
   connects lazily so most suites never notice. Any test reaching a real transaction connects for
   real — mine did, and failed only because no password was in that shell. Reported, not fixed:
   the fix touches every suite and `sqlite3` is not installed (installing it would rewrite the
   shared `node_modules` a sibling session is using).

## Mistakes I made

- **A second decorative test of my own, in as many slices.** My id-spelling test used an
  *unassigned* trainer, who gets 403 whether the parser is strict or loose — so loosening the real
  guard left it green. Rewritten to use the assigned trainer on their own client, where the outcome
  actually diverges. Mutation caught it; review would not have.
- **`sed` and `perl` each silently failed to apply a mutation, and I nearly believed the result.**
  A green run after a no-op mutation looks exactly like a surviving mutation. I was one step from
  rewriting a perfectly good test to chase a hole that did not exist. New rule: grep the changed
  line and read it back before believing any mutation run.
- **I nearly reported a critical cross-tenant vulnerability that does not exist.** I grepped for
  scoping using five guessed helper names, got nothing, and concluded three onboarding handlers and
  four workout-logger handlers were unguarded. The real helper is `ensureClientAccess` — not in my
  guess-list. Two route files and a controller were each settled in one read after three failed
  greps. **Under ~150 lines, read the file; do not guess identifiers.**
- **The secret scanner caught me twice** — a fake `postgres://` literal in my own test file, then
  again in the comment explaining why I had removed it.

That is seven broken-probe instances this session. Every one caught by a control or a read, none by
intuition.

## External-model calibration

None called this slice. Prior calibration stands: Kimi K3 $0.3198 (6/7 checked findings real, one
fabricated source quote); Tencent HY3 $0.0133 (2/2 real, severity underestimated). HY3 first for
security review on a diff.

## Still Sean's

1. **The branch has never been pushed** — `git push origin claude/qa-harness-slice0-20260811:claude/qa-harness-slice0-20260811`
2. **18 of 26 Hermes learning packets exist only on this machine.**
3. Carried: rotate the Render API key; add the DMARC record (SWA-13).
