---
name: test-delta-disclosure
description: Fires whenever a turn modifies an existing test — changing an expected value, a count, a matcher, a fixture, or deleting/skipping a case. A pass count that includes assertions you rewrote this turn is not proof of anything. Requires a test-delta table, reported separately from the pass/fail count, classifying each change as RE-ANCHOR or SILENCE. Triggers on any edit to a *.test.*, *_test.*, *.spec.*, conftest, or shared fixture file.
---

# Test-Delta Disclosure

## Why this exists

**2026-08-06.** A builder added migration `0026_outlet_taxonomy` to SwanGuard. Three
existing tests asserted where the *last* migration sits, so all three went red. It edited
all three, re-ran, and reported:

> "All 52 database tests pass."

Every one of those edits was, on inspection, **correct** — appending 0026 genuinely does
move 0025 to second-to-last. The work was good. The *report* was not, because it offered
no way to tell good from bad. The sentence "52 tests pass" was doing two jobs at once:
vouching for 49 tests that passed on their own, and vouching for 3 whose assertions the
author had rewritten minutes earlier so they would.

Those are not the same claim and they cannot share a number.

## The thing this catches

Every edit to an existing test is one of exactly two things:

**RE-ANCHOR** — the contract genuinely changed, and the old assertion encoded the old
contract. Legitimate, expected, often mandatory.

**SILENCE** — the code broke a contract that still holds, and the assertion was moved to
match the break. A bug, now wearing a green checkmark.

**In a diff these are indistinguishable. In a pass count they are invisible.** The only
person who can tell them apart is the author, at the moment of the edit, while the reason
is still in their head. An hour later even the author cannot reliably reconstruct it, and
a reviewer never could. That is why the disclosure must be written *by the author*, *in
the same turn*, and *before* the pass count is claimed as evidence.

The failure mode is not dishonesty. It is a builder in flow: red test → obvious fix →
green → move on. Each step is locally reasonable. The reflex is the danger.

## When this fires

Any turn that modifies a file whose job is to assert. Specifically:

- changing an expected value, a count, a length, an index, or an ordinal
- changing a matcher (`toBe` → `toContain`, tightening or loosening a regex)
- widening a tolerance, a timeout, or a retry
- renaming a test in a way that changes what it claims
- deleting a test, or deleting an assertion inside one
- adding `.skip`, `.only`, `xit`, `@pytest.mark.skip`, `t.Skip()`
- editing a shared fixture, factory, snapshot, or `conftest` that other tests read
- regenerating a snapshot file

**It does not fire** for adding a brand-new test file, or for adding new assertions that
leave every existing one untouched. Net-new coverage needs no disclosure — it is not
standing in for evidence that already existed.

## The disclosure

Report this **separately from, and before, the pass count.**

```
TEST DELTA — 3 existing assertions changed this turn

| File:line                          | Before        | After         | Class     | Why the new assertion is the correct one
|------------------------------------|---------------|---------------|-----------|------------------------------------------
| migrationRunner.test.ts:56          | toHaveLength(25) | toHaveLength(26) | RE-ANCHOR | 0026 was added this slice; the count tracks the registry by design
| newsRssConnectorSchema.test.ts:15   | .at(-1)       | .at(-2)       | RE-ANCHOR | 0025 is no longer last because 0026 was appended after it
| postgres-migration-runner.test.mjs:9| [...'0025']   | [...'0026']   | RE-ANCHOR | same registry, asserted from the script-level loader

Result: 52 passed — 49 unchanged, 3 re-anchored above.
```

**The "why" column is the whole point.** It must stand on its own, without the diff, in
one sentence. If you cannot write that sentence, you have not yet established which of the
two classes you are in — and you must find out before reporting, not after.

**Any row you would classify SILENCE is a STOP.** Do not write it and continue. Silencing
a live contract is a decision above a builder's pay grade: report it, name the contract,
and escalate. If the contract really should change, that is a spec change and it gets said
out loud.

## The rule

> **A pass count that includes assertions you rewrote this turn is not proof.
> Split the number, or do not use it as evidence.**

`52 passed` is a claim about the code. `52 passed, 3 of which I rewrote` is a claim about
the code *and* about your own edits, and only the second one is honest when both are true.

This is the completion-claim law applied to its most common blind spot: proof you
manufactured in the same breath you cited it.

## Anchor on identity, not position

The deeper defect is usually upstream of the edit. These are **position** assertions:

```js
expect(migrations).toHaveLength(26);
expect(migrations.at(-1)).toMatchObject({ version: '0025' });
expect(migrations[25]).toMatchObject({ name: 'outlet_taxonomy' });
```

They break every time the list grows, and the "fix" is always to bump a number — which is
exactly the reflex this skill exists to interrupt. A test that must be edited on every
unrelated append is **training the habit that hides bugs.**

Prefer **identity** assertions, which survive growth and only fail when something real
changed:

```js
expect(migrations.find(m => m.version === '0025')).toMatchObject({
  name: 'news_rss_connector_schema',
});
expect(migrations.map(m => m.version)).toContain('0026');
```

So: **when you find yourself editing a positional assertion, that is a signal the
assertion is wrong, not merely outdated.** Note it in the table's "why" column, and fix
the anchor in the same slice if it is a one-liner. A count that *deliberately* pins the
registry size (a canary against accidental additions) is legitimate — say so in the table,
so the reviewer knows it was a choice.

## Reviewer duty

When reviewing any work that touched tests:

1. **Never accept a bare pass count from a turn that edited tests.** Ask for the table.
   Its absence is a finding on its own, not a formatting nit.
2. Get the ground truth yourself — the author's list may be incomplete:
   ```bash
   git diff --stat -- '*test*' '*spec*' '*conftest*' '*fixture*'
   git diff -- '*test*' | grep -E '^[-+].*(expect|assert|toBe|toEqual|toHaveLength)'
   ```
3. For each row, decide the class **independently** before reading the author's reason.
   Then compare. A disagreement about the class is a blocker, not a nit.
4. Watch for the quiet ones: `.skip` added, an assertion deleted rather than changed, a
   snapshot regenerated, a tolerance widened. These never appear as a red test and never
   change the pass count — they are the only edits that reduce coverage while looking
   like maintenance.
5. Check whether a re-anchored assertion should have been an identity assertion. If the
   same line gets edited every slice, the test is the bug.

## Related

- `scripts/hermes/review.py` — `WORK.md` carries a **Test delta** section, and `review.py
  open` scans the repo for modified test files and warns when the section is empty
- `cross-env-verify` — sibling law: one tool's failure is not a fact about the world.
  This one: one green suite is not a fact about your code
- `.ai-workflow/hermes-inbox/standing-context.md` — "Verification honesty" carries the
  short form of this rule
