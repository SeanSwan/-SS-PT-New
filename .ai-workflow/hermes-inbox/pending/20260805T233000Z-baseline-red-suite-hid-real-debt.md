# A permanently-red test suite was hiding real debt

**When:** 2026-08-05 · **Surface:** frontend test baseline, admin dashboard
**Agent:** Claude Opus 5 (terminal, VS Code) · **Tier:** sub-Fable → working memo only, NOT the durable corpus

## What happened

After the 5-lane launch audit landed, `main` had 4 red frontend tests. All 4 had
been red long enough to become scenery. None was a product defect — but one was
hiding three real violations.

## Transferable facts

1. **A hand-maintained file list in a contract test only ever covers what someone
   remembered to add.** The destructive-action contract named 3 files. One had been
   deleted, so the suite died on ENOENT *before asserting anything* — a safety
   contract that was not running. Sweeping the real surface from disk (676 files)
   immediately found 3 native-confirm calls outside the list. Fix: discover from
   disk, freeze pre-existing debt in an explicit allowlist, and add a test that
   fails when an allowlisted file *stops* offending so the list can only shrink.
   Same lesson as the member-directory guard earlier this session.

2. **Source-grep tests have one specific bypass: commented-out code still matches.**
   Verified by mutation, not theory. Fix: strip comments before matching — but
   deliberately NOT mid-line `//`, because that eats everything after a URL inside
   a string literal and deletes the text an assertion looks for. That trades a
   visible bypass for an invisible false PASS. The sanitiser must never be able to
   break the test it protects.

3. **A test can be green on CI and red only on Windows.** Assertions matching
   multi-line snippets with a literal `\n` fail against sources git checks out as
   `\r\n`. Invisible to whoever wrote it. Normalise on read.

4. **A frozen exact-array assertion cannot express an ordering contract.** It fails
   on every legitimate addition, and its only repair is re-anchoring to whatever
   the code now says — which defends nothing. Pin the guarantee (X leads) plus
   required members instead.

## Mistakes I made

- **Aimed a mutation at the wrong line.** Replaced the first `: null` in a route
  file; the asserted expression was untouched, so the mutation "passed" and briefly
  looked like evidence of a weak test. A mutation that does not hit the target
  proves nothing. Re-aimed at the exact pinned expression → failed correctly.
- **Broke a test file with my own explanatory comment** containing a literal `*/`,
  which closed the block early. Its mutation then "failed as required" — but on a
  parse error, not the assertion. A failure for the wrong reason is not proof.
  Caught only because I read the failure text instead of the pass/fail bit.
- **Piped two full suites through `tail`**, discarding the failure list I ran them
  to get — then did it a second time after already being bitten. Cost two ~14-min
  runs.
- **Reported a scoped run as the full gate**: quoted a `tests/api` result (~2.1k
  tests) as the backend gate when the real suite is ~8.5k. Corrected in-session.
- **Started a full suite in the wrong worktree** after the shell cwd silently moved
  to another branch. Now guard every long run with an explicit branch check.
- **Called a finding "real, not a stale test" before finding the cause.** The
  equipment picker looked removed; it had been deliberately replaced by a better
  component. Diagnose before characterising.

## Still open (product work, not cleanup)

Three destructive actions still use the raw browser confirm popup instead of a
branded dialog: product-variant delete, campaign archive, client workout-plan
action. Frozen in the allowlist; needs converting.

## External-model calibration

None consulted this turn.
