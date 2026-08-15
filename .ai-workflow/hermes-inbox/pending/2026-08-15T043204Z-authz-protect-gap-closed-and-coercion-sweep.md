# Hermes inbox — the protect gap is closed, and the coercion sweep found nothing (for good reasons)

**When:** 2026-08-15 UTC · **Surface:** vs-claude, worktree `C:/tmp/ss-qa-harness-slice0`
**Branch:** `claude/qa-harness-slice0-20260811` (still NOT pushed) · **Agent:** Claude Opus 5, session `main-seae22129`

## What happened

Two slices Sean named after the three-way review.

**1. The `protect` gap — closed.** ~211 user-scoped handlers authorize from `req.user.id` and
`req.user.role`; every authz suite in the repo stubbed the middleware that populates them, so all
of them proved authorization *given* a correct `req.user` and none proved `req.user` is correct.
26 tests now execute the real thing — real jsonwebtoken sign and verify, real secret resolution,
real token-type and account-state gates. Only the User model and WaiverRecord are mocked: the mock
is the *database*, not the auth logic.

The property that matters most and was untested: **`role` is re-read from the DB row, never taken
from the token.** A token claiming `role: 'admin'` for a client yields `client`. Without that,
every role check in the codebase is forgeable by anyone who can mint a token.

Also newly pinned: `req.user.id` is a string (four of five existing suites stub a number);
refresh-as-access rejected; expired / foreign-secret / tampered tokens rejected; deactivated and
locked accounts 403; and the impersonation branch, which `waiverGate.mjs:131` uses to skip the
signed-waiver requirement outright.

**2. The id-coercion sweep — no live bypass.** Three independent reasons: the repo already owns a
strict parser (`parseStrictPositiveInteger`, `/^[1-9]\d*$/`); `checkTrainerClientRelationship`
already rejects params/body disagreement and pins the authorized id — the exact defence the prekey
limiter needed, written before it; and where handlers pass raw strings to `findByPk` on integer
PKs, the Postgres cast either agrees or errors.

Commits: `717e5ec4f`, `de460580e`, `77b3a33bc`.

## Decisions worth carrying

- **Did not harden `authorizeResourceAccess`** even though it is the one structurally weak guard
  (authorizes a `parseInt`ed id, pins nothing, 12+ live routes re-read the param). Making it
  strict turns `'0902'` into a 400 on live auth routes. Traced every consumer; none uses
  `Number()`, so nothing is exploitable today. Sean's call.
- Second time this session I have declined to ship a defensible hardening on a live auth path.
  That is deliberate, not timidity: a reviewer widening scope into behaviour changes is how a
  review becomes an outage.

## Mistakes I made

- **My own suite contained a decorative test, one commit after I criticised another agent for
  exactly that.** I asserted `alg:none` proves the JWT algorithm pinning. It does not —
  jsonwebtoken v9 refuses unsigned tokens by itself, so deleting `algorithms: ['HS256']` from
  `protect` left all 15 tests green. Caught only because I mutated my own suite. Replaced with an
  HS512-signed-with-the-correct-secret token, which only the pinning can refuse.
- **I mislabelled my own probe output.** Printed "(empty = not called in protect's body)" beneath
  a grep that had returned a hit. `protect` *does* call `requireLinkedWaiver` — it delegates its
  final `next()` to the waiver gate. Caught on re-read, not by the label. The label was written
  before the output existed, which is the whole defect: **a pre-written conclusion is not a
  reading of the result.**
- **The sweep Sean asked for could not have found what it was looking for.** `Number(req.params` /
  `parseInt(req.params` returns 48 sites and misses **212** destructured reads
  (`const { userId } = req.params`) — the more dangerous class, since those carry the raw string
  onward with no normalization at all. I ran the requested grep first and would have reported a
  clean result I had not earned.
- Earlier in the session: a file-scoped grep I nearly reported repo-wide, a hypothesis published
  ahead of its test, `tail -25` truncating my own evidence, `echo "EXIT=$?"` after a pipe, and a
  packet "validated" against the wrong directory while the file count coincidentally matched.

## External-model calibration

No paid models called this slice. The Kimi/HY3 calibration from the review slice stands: Kimi
$0.3198 (6 of 7 checked findings real, 1 fabricated source quote), HY3 $0.0133 (2 of 2 real,
underestimated severity). HY3 remains the better first call for security review on a diff.

## Still Sean's

1. **The branch has never been pushed.** `git push origin claude/qa-harness-slice0-20260811:claude/qa-harness-slice0-20260811`
2. **18 of 26 Hermes learning packets exist only on this machine.**
3. Carried: rotate the Render API key; add the DMARC record (SWA-13).
