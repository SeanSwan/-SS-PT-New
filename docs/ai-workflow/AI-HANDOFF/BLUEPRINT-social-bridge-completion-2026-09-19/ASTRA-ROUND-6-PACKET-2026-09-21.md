# Astra round 6 — R5-08 (the ban-#50 split) and the R5-03/R5-04 verification

**Commissioned:** 2026-09-21 · **Commit under review:** `fa1744e934a120a7a28f0722f43468829d98d045`
**Ancestor of HEAD:** yes (`6e45e2392f2289f9c48e24d9c7f4dabe1f28c9a4`, 1 commit since)

You are asked to review the SHIPPED code. Everything below is read from the commit, never from the worktree.

---

## 1. What R5-08 asked for

Astra's round-5 review measured three test files over `06-bans.md` #50's 300-line budget:

  bridgeSpotlightOrdering.contract.test.mjs   417
  coachSignalIntegrity.contract.test.mjs      312

(The third, at 408, was the same ordering file measured before a small edit.)

## 2. What was done

| file | before | after |
|---|---|---|
| `bridgeSpotlightOrdering.contract.test.mjs` | 417 | 203 |
| `coachSignalIntegrity.contract.test.mjs` | 312 | 197 |
| `bridgeSpotlightManifest.contract.test.mjs` | — | 180 (new, 10 tests) |
| `coachSignalQuota.contract.test.mjs` | — | 87 (new, 5 tests) |
| `helpers/bridgeSpotlightHarness.mjs` | — | 129 (new) |
| `helpers/coachSignalHarness.mjs` | — | 114 (new) |

The rigs are EXTRACTED, not copied.

## 3. The claim to attack

**No assertion was dropped.** The split is line-count-only. Verified by diffing the sorted `it()`
titles of the split files against the pre-split blob at HEAD; the diff is empty.

  coach:  16 (integrity) + 5 (quota) = 21 = the unsplit count
  bridge: 10 (ordering) + 10 (manifest) = 20 = the unsplit count

**The tests still bite.** A mutation run reintroduces the D1 defect (dropping the ordering
predicate at `services/bridgeSpotlightRevisionApply.mjs:115`) and requires RED.


## 4. The differential proof (assertion set unchanged)

```
$ git show HEAD~1:backend/tests/coachSignalIntegrity.contract.test.mjs | grep "^  it(" | sort
21

$ { grep "^  it(" backend/tests/coachSignalIntegrity.contract.test.mjs
    grep "^  it(" backend/tests/coachSignalQuota.contract.test.mjs; } | sort | diff - <(HEAD versions)
(empty)
```

Same for the bridge pair: 20 = 20, diff empty.

## 5. The mutation proof

**Scope correction (round 6, R6-02).** The run below covers the **four split suites only**
(4 files / 41 tests). It does NOT include
`bridgeSpotlightImageOwnership.regression.test.mjs`, whose 9 tests live in a separate file — so
§7's claim that this run substantiates the R5-03/R5-04 review was wrong. Including it gives
**5 files / 50 tests**. The original run is reported as it happened, not retro-fitted.

```

---

**R6-02 in the reviewer's words:** *"the reported run does not substantiate R5-03/R5-04
verification … The D1 mutation is meaningful for predicate construction … it does not prove
database ordering, image ownership, attachment containment, or coach-quota behavior."*
Accepted. The D1 mutation proves the predicate is **constructed**; the suite proves the branch is
**taken**. Neither proves PostgreSQL honors it under contention. That limit was already recorded
as `[UNKNOWN]`, and the reviewer's distinction between "predicate constructed" and "behavior
verified" is the correct one.

```
ORIGINAL SHA256: c96899c6212bb9f344873548a72bfa7f57a86fb0c5eab9b2ae1881c8457be3f8

--- BASELINE (real code) ---
Test Files  4 passed (4)
Tests  41 passed (41)

--- MUTATION: drop the ordering predicate (the D1 defect) ---
mutated: predicate removed
Test Files  1 failed | 3 passed (4)
Tests  5 failed | 36 passed (41)

restoring...
restored IDENTICAL (c96899c6...)

--- FINAL (real code again) ---
Test Files  4 passed (4)
Tests  41 passed (41)
```

## 6. Commit stat

 .../bridgeSpotlightManifest.contract.test.mjs      | 180 ++++++++++++++++
 .../bridgeSpotlightOrdering.contract.test.mjs      | 236 +--------------------
 .../tests/coachSignalIntegrity.contract.test.mjs   | 159 ++------------
 backend/tests/coachSignalQuota.contract.test.mjs   |  87 ++++++++
 backend/tests/helpers/bridgeSpotlightHarness.mjs   | 129 +++++++++++
 backend/tests/helpers/coachSignalHarness.mjs       | 114 ++++++++++
 6 files changed, 543 insertions(+), 362 deletions(-)

## 7. What the reviewer should attack

1. **Is the split really mechanical?** For every test in the pre-split files, find its counterpart
   in the split files and confirm the assertion body is unchanged — not just the title. The title
   diff is necessary, not sufficient: a body could have been weakened while keeping its name.
2. **Is the shared rig faithful?** The rig moved from suite-local `vi.hoisted` blocks into helpers.
   Check that every mock's default and every `beforeEach` reset moved with it. A reset that was
   dropped changes what a LATER test observes without changing any single test's text.
3. **Does the harness arrangement leak state between the two suites that share it?** Both bridge
   suites import the same helper and call the same installer. If module state is shared, suite
   order could matter. `vitest` isolates by file by default — confirm that is actually in force
   here rather than assumed.
4. **Is `mockUploadPhoto`/`mockFetchDecode` genuinely unused in the manifest suite?** They are
   destructured and `void`-ed to keep the destructure honest. If a manifest test should assert
   against them and does not, that is a coverage gap the move introduced.
5. **R5-03/R5-04 have not been reviewed since landing** at `1708f96e9`. Their suite
   (`bridgeSpotlightImageOwnership.regression.test.mjs`, 230 lines) is committed and this packet
   includes it in the run. Review it.

## 8. Files in scope

``` 
backend/tests/bridgeSpotlightOrdering.contract.test.mjs     203
backend/tests/bridgeSpotlightManifest.contract.test.mjs     180
backend/tests/helpers/bridgeSpotlightHarness.mjs            129
backend/tests/coachSignalIntegrity.contract.test.mjs        197
backend/tests/coachSignalQuota.contract.test.mjs             87
backend/tests/helpers/coachSignalHarness.mjs                114
```

## 9. Honest disclosure — a mistake made on the way here

An earlier attempt at the coach split was **not** a split. It replaced the 21-test suite with 13
tests plus 5, and its own file header claimed *"No assertion was dropped."* Ten tests were gone,
including the DST-boundary, UTC-midnight-window and unique-constraint-race cases. One test also
inverted its meaning: the committed self-signal case deliberately exercised a **string/number id
mismatch** and expected 403; the rewrite set `role: 'client'`, which the route's role guard answers
with 403 *before* the self-signal branch — so it would have passed for a reason unrelated to its
name.

That attempt is discarded. The suites shipped in `fa1744e93` are the HEAD tests, moved verbatim.
The detection method (grep the `it()` count from the HEAD blob, then diff the sorted titles) is the
reason it was caught, and it is the reason claim #1 above is checkable rather than asserted.

**Judge claim #1 adversarially. It was false once in this exact task.**
