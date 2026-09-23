# Revision-apply mock soundness probe — 2026-09-21

**Subject:** `backend/services/bridgeSpotlightRevisionApply.mjs`
**Suites under scrutiny:** `backend/tests/bridgeSpotlightRevisionApply.regression.test.mjs` (147 lines, 7 tests),
`backend/tests/bridgeSpotlightOrdering.contract.test.mjs` (203 lines, 10 tests)
**Author of this probe:** the same seat that wrote the R5-03/R5-04 remediation.
**Status:** 🔎 **SOUNDNESS FINDING — no defect. Recorded because the question was asked and answered by measurement, not by reading.**

---

## 1. Why this probe exists

The module's own docblock (lines 35–38) states the `[UNKNOWN]` honestly:

> *"NOT established here, and not claimed: that two concurrent applies on a live PostgreSQL
> serialize correctly. That needs a real database; the contract suite mocks the model, so it
> proves the predicate is constructed and the branch is taken, never that Postgres honours it."*

The live-DB route to closing that is blocked this session (see `R1-REVIEW-ROUND-7-PACKET.md` §6.2).
So the available question is the **weaker but still load-bearing one**:

> *Does the mock let the helper claim a success that PostgreSQL could not have produced?*

That is the **R6-01 defect class** — a green suite whose green does not entail the property. It is
worth asking precisely because R6-01 already happened once in this slice.

The probe drives `applyBridgeSpotlightRevision` **directly**, not through the HTTP harness, so the
mock surface is the same object the unit suite uses. The five shapes are now **permanent cases** in
`bridgeSpotlightRevisionApply.regression.test.mjs` (the `mock soundness` and `R5-03 — the sentinel
survives the whole call` describes), so the measurement is not lost with a temp file. The scratch
drivers were `C:/tmp/r7-probe-falsegreen.mjs` and `C:/tmp/r7-probe-extra.mjs`.

---

## 2. The shapes driven, and the measured result

| # | shape driven | real-DB legality | measured result | verdict |
|---|---|---|---|---|
| **A** | `update` → `[0]` forever; `findByPk` → `{revision:1}` (older than ours=2) | **illegal** — `WHERE revision < 2` *would* match a stored 1, so a real DB cannot report both | **throws** `could not resolve … after 3 attempts (stored revision: 1). Refusing to acknowledge a revision that was not persisted.` | ✅ correct — refuses rather than lies |
| **B** | `update` → `[0]` then `[1]`; `findByPk` → `{revision:1}` | **legal** — an older row appeared after the miss; then our predicate matched | `{"applied":true,"created":false}` (`update=2`, `find=1`) | ✅ the asserted-green path; DB-reachable |
| **C** | `create` → PK conflict; re-check `findByPk` → `{revision:5}` (newer than ours=2) | **legal** — collided with an older delivery, a newer one landed before our re-read | `{"applied":false,"storedRevision":5}` | ✅ no false acknowledgement |
| **D** | sentinel `imageUrl` (`Symbol`) in `values`; happy-path `update` → `[1]` | legal | `imageUrl` **absent** from UPDATE payload; keys = `itemId,revision,retracted,headline` | ✅ R5-03 lost-update fix holds end-to-end |
| **E** | explicit `imageUrl: null` | legal | `imageUrl` **present**, value `null` | ✅ the two intentions stay distinguishable |

---

## 3. The specific worry, stated and then dismissed

The regression suite's mock for shape B is:

```js
const SwanSpotlight = {
  update: vi.fn().mockResolvedValueOnce([0]).mockResolvedValueOnce([1]),
  findByPk: vi.fn().mockResolvedValue({ revision: 1 }),   // FIXED, older than ours
  create: vi.fn(),
};
```

A fixed `findByPk` returning an **older** revision looks like it could let the helper reach
`applied:true` on a re-read that a real DB would have contradicted. It cannot, and the reason is
structural rather than lucky:

* `findByPk` is consulted **only on the miss branch** (line 133), where the helper has already
  learned the conditional write matched nothing. Returning "an older row exists" is exactly the
  legal post-miss shape the R5-01 fix exists to handle, and the helper correctly `continue`s.
* Once `update` returns `[1]`, the loop exits at line 131 and **never consults `findByPk` again**.
  Measured as `find=1` while `update=2` — the second update decided the outcome alone.

So the mock's fixed value is only ever read at the one point where a fixed older value is
DB-reachable. No false green exists on this path.

**Shape A is the control.** It is the *illegal* shape (both statements disagreeing about a stored
row the predicate should have matched), and on it the helper **throws** rather than reporting a
success. That is the strongest available evidence that the helper does not depend on the mock being
generous: give it an inconsistent store and it fails closed.

---

## 5. Mutation record — the new cases can fail

Five cases were added to the regression suite (7 → 12 tests, all green). A case that cannot fail is
decoration, so each load-bearing one was mutation-tested against the module and restored
byte-identical afterwards.

| mutant | change | result |
|---|---|---|
| **M1** | replace the bounded-loop `throw` with `return { applied:false, storedRevision: landed?.revision ?? 0 }` — i.e. acknowledge the unpersisted revision, the exact defect the module exists to prevent | **2 RED** (the new fail-closed case + the pre-existing R5-01 case) |
| **M2** | drop the sentinel-strip destructure so `imageUrl` leaks into the UPDATE payload | **1 RED**, on `omits imageUrl from the UPDATE payload` exactly |
| **M3** | add a `findByPk` call to the success branch, so a re-read can corroborate a hit | **1 RED**, on `consults the re-read ONLY on the miss branch` exactly |

Module hash before and after all three: `c96899c6212bb9f3` — verified identical on restore, and
`git status` confirms the module is unmodified relative to `HEAD`.

**A first attempt at two of these cases failed, and the failures were my test-writing errors, not
module defects** — recorded because the correction is the finding:

* a regex `/could not resolve .* stored revision: 1/` did not match the real message (the text
  between the two anchors contains `(`, short-circuiting the `.* stored` subsequence); fixed to
  `/could not resolve[\s\S]*stored revision: 1/`.
* the shape-C case asserted `create` was called once, but the helper correctly short-circuits at
  the `current.revision >= revision` check **before** reaching `create`. The assertion was
  asserting a path the module rightly avoids; corrected to assert `create` is *not* called.

## 6. What this does and does not establish

**Establishes.** The helper's control flow cannot be induced to report `applied:true` by any mock
shape driven here except one that PostgreSQL can also produce (shape B). The sentinel/explicit-null
distinction survives the full call, not just the `splitImagePayload` unit. An inconsistent store
fails closed.

**Does NOT establish.** That two concurrent applies against a live PostgreSQL serialize correctly.
Nothing here touches a database. **R5-03/R5-04 remain `[UNKNOWN]`.** This probe narrows the
`[UNKNOWN]` from *"the mock might be hiding a false green"* to *"the mock is sound; only the live
serialization claim is untested"* — it does not close it.

**Attribution.** This probe was written by the same seat that wrote the fix. It is therefore
**not an independent review** and must not be filed as one. It is a measurement with a named author,
which is a weaker thing and is labelled as such. The pin and the apply-path both still await a
reviewer that did not write them.

---

## 7. Residual work, unchanged

The live-DB harness remains the only thing that closes R5-03/R5-04: two connections, an interleaving
that lands the older revision between the read and the write, asserting the `WHERE revision < ?`
predicate serializes rather than the mock narrating that it does. It is small and it is blocked on
connection approval, not on design.
