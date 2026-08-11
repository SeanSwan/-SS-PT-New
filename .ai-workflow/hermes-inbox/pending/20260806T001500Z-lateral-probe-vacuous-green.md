# A security probe that passed 6/6 while every endpoint was crashing

**When:** 2026-08-06 · **Surface:** backend member-directory authz
**Agent:** Claude Opus 5 (terminal, VS Code) · **Tier:** sub-Fable → working memo only, NOT the durable corpus

## What happened

Closed the last open launch-audit gap: a two-session lateral-access probe asking
whether an authenticated member can read another member's contact details. It
now passes 7/7 and is mutation-proved. Getting there exposed a defect in my own
test, not in the product.

## Transferable facts

1. **"Tests the controller" and "tests what a request reaches" are DIFFERENT
   claims.** Every prior guard on these projections imported the controller and
   called it directly. That cannot detect route shadowing, a sibling router
   answering first, or middleware repopulating `req.user`. A hardened controller
   nothing routes to is not a fix. Boot the real app and drive real HTTP.

2. **A mock must simulate the mechanism the fix relies on.** These controllers
   withhold PII via a Sequelize `attributes` allow-list — the columns are never
   selected. A mock ignoring `attributes` reports leaks that cannot happen; one
   returning pre-stripped rows passes regardless of controller behaviour. The
   mock must APPLY the projection the way the database does.

3. **A "no X in the response" assertion is satisfied by an error body.** This is
   the vacuous-green trap in its purest form: no data means no PII means green.
   Any absence-assertion needs a paired presence-assertion — require HTTP 200 AND
   the subject actually present in the payload, then assert the forbidden fields
   are missing.

4. **A probe where everything 403s proves nothing either.** Pair it with a test
   showing the same stack still serves a privileged role, so blanket refusal
   cannot masquerade as protection.

## Mistakes I made

- **Shipped a probe that passed 6/6 while every endpoint returned 500.** My mock
  returned plain objects; the controllers call `.toJSON()`; the handler threw;
  four "no PII leaked" assertions were satisfied by an error body. I caught it
  only by reading stderr instead of the pass count.
- **This is the THIRD time in one session a test passed or failed for a reason
  unrelated to what it claimed to test.** Earlier: a mutation aimed at the wrong
  line "passed"; a comment of mine containing `*/` broke a file so its mutation
  "failed" on a parse error. Same root habit — trusting the pass/fail bit instead
  of reading the output. This repeat is the highest-signal entry here.
- **Lost three long test runs to unverified working directory.** One silently ran
  against a different branch; one against the whole repo including DB-dependent
  integration tests. ~45 minutes. Fix: pin the directory inside every long
  command and assert the branch before running.
- **Piped two full suites through `tail`**, discarding the failure lists the runs
  existed to produce — then repeated it after already being bitten.
- **Called a finding "real, not a stale test" before locating the cause.** The
  equipment picker looked removed; it had been deliberately replaced by a better
  component. Diagnose before characterising.

## External-model calibration

None consulted this session.
