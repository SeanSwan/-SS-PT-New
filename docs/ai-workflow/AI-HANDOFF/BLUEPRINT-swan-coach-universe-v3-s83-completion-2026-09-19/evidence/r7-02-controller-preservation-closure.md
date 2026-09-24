# R7-02 closure — "the live repair detects only some forms of loss"

**Finding (Astra Review 7, HIGH):** the controller-preservation gate reported more confidence than it
had. It compared slice **counts**, id **sets**, and top-level **keys**, and Astra measured that six
further mutations were all **admitted** (`[]`) by the shipped checker.

**Verdict: CLOSED.** Measured, not asserted — see the mutation matrix below.

---

## 1. The root cause was structural, and that is why the earlier fix did not generalise

The gate had a per-slice field loop that called `beforeById.get(afterSlice.id)`. For the C→S
vocabulary migration the **active** ids are `C0…C5` while the **historical** ids are `S83…S90`:

```
active     : C0, C1, C2, C3, C4, C5
historical : S83, S84, S85, S86, S87, S88a, S88b, S89, S90
OVERLAP    : (NONE — the loop body never runs)
```

Every lookup returned `undefined`, every iteration hit `if (!prior) continue`, and **the loop body
never executed on the one migration it was written to police.** A join is only as good as the key
overlap it happens to have. The fix therefore does not add more per-field checks to that loop — it
replaces the join with **content equality against an object the checker is already holding**, which
has no such failure mode.

## 2. What changed

`scripts/coach-completion-controller-preservation.mjs` (new module — see §4) now verifies, for a
migration that RE-SCOPES history:

| Check | Why a count/key check could not see the attack |
|---|---|
| `after.origin.state` **deep-equals** the predecessor | content shrunk inside a surviving key; object emptied while the key survives; value nulled |
| `after.origin.events` **prefix-equals** the predecessor's events, element by element | equal-count replacement of event bodies (`.length` is preserved exactly) |
| active slices non-empty when the predecessor had slices | both sides gutted together — every check compared the two gutted values to each other |
| `origin.scopeCorrections`, **if declared**, names real predecessor and active slice ids | a declared-but-wrong mapping was trusted |

`deepDiffs` reports at most N differences and treats `null` as a value distinct from a missing key.

### Validated-if-declared, not mandated — and this correction was forced by measurement

My **first** attempt mandated a top-level `scopeMapping` and thereby **refused the real, correct v9
migration** (1 violation). The control caught it. Two measured facts corrected the design:

1. `scopeCorrections` in the real state lives **three levels deep** inside a nested historical
   snapshot (`origin.state.origin.state.origin.scopeCorrections`, 31 entries) and is **absent** at the
   level a migration checker can legitimately read. Demanding it there invents a requirement the
   supported state does not carry.
2. The real 9→6 change replaces **every** id. That is a vocabulary migration, and it is exactly what
   the `explicit-migration` event exists to authorise — so total id replacement is **not** the defect.

A gate that refuses the correct artefact is not a stricter gate, it is a broken one. An undeclared
mapping stays legal (the event is the authority); a **declared-but-wrong** mapping is a violation.

### Scoping, measured (2026-09-22)

The block was first written **unconditionally** and broke four long-standing admission tests
(`not ok 9 / 16 / 19 / 22`) with `[ 'controller: origin.state is MISSING …' ]` where `[]` was
required. That was **my** error, not the tests': a uniform-size *passing* fixture has no `origin`,
because a pair with nothing to hide has nothing to declare. Demanding a snapshot there converts
"no migration claimed" into "a migration failed to prove itself".

The requirement belongs to the case that exists *because of* the snapshot — the one that re-scopes
history. So the block runs **iff the active slice set shrank**. The two checks that are **not**
optional (`origin` carries the prior events at all; an `explicit-migration` event is recorded) stay
outside the guard, because they predate R7-02 and are what keeps the non-shrinking path honest.

## 3. The mutation matrix — measured against the shipped function

`scripts/coach-completion-tools/r702-mutation-probe.mjs`. `before` is the TRUE predecessor; `origin.state` is the **migration's
claim** about it, and the attack is that the claim is falsified so it agrees with the migration's own
content. (Mutating only the `before` copy leaves the two consistent and proves nothing — the mistake
my first probe made.)

```
CONTROL (honest migration)                                             -> []
allowedFiles: ["a","b"] -> ["a"] in the claimed snapshot                caught (1)
frozen: {file:"hash"}   -> {} in the claimed snapshot                   caught (1)
digest: "digest"        -> null in the claimed snapshot                 caught (1)
predecessor slice REPLACED (same count)                                 caught (2)
equal-count replacement of event bodies                                 caught (2)
predecessor gutted to almost-empty                                      caught (5)
authorization rewritten in the claimed snapshot                         caught (1)

mutations admitted: 0/7
```

Before the fix this same probe admitted **5 of the 6** mutations Astra listed.

The **honest control** is first on purpose: Astra's verdict was *"Closure must bind the repaired
invariant, not one selected example,"* and a refusal set alone is satisfied by a gate that refuses
everything.

### The real state, used as a control against my own over-refusal

`scripts/coach-completion-tools/r702-real-probe.mjs`:
```
CONTROL: declared predecessor -> v9 violations: 0 (expected 0)
```
Note the correct predecessor is what v9 **declares** (`origin.state` — 216 events / 9 slices), **not**
`workflow-state-v8.json` on disk, which is a **later** snapshot (219 events / 10 slices) and would
measure the probe's mistake rather than the gate's behaviour.

Two further pre-existing checks were corrected while here, both because a strict form could only ever
pass for an artefact that had hidden something:

* `after.origin.events.length === before.events.length` was **wrong in the only direction that costs a
  false positive** — a migration is entitled to append to its own history (the real v9 appends
  `explicit-migration`). It is now a **presence** requirement; the deep prefix comparison is what
  proves the history was carried **unchanged**. A length check is neither necessary (the prefix check
  subsumes it) nor sufficient (an equal-count replacement passes it).
* `checkControllerMigration` still refuses a **missing** origin, because `checkCandidateManifest`
  independently requires it on the migration-input artefact.

## 4. Rule 4 split (why this is a new module)

The R7-02 fix took `coach-completion-admission.mjs` to **343 lines** against Rule 4's 300 cap. The
seam is a real subject boundary and not a line-count dodge:

* `coach-completion-admission.mjs` asks *"may a successor start?"* — **133 lines**.
* `coach-completion-controller-preservation.mjs` asks *"did a controller migration preserve what it
  must?"* — **267 lines**.

They share a caller and nothing else. `checkControllerMigration` + `deepDiffs` are **re-exported**
from `coach-completion-checkpoint.mjs`, so **no import site changed** — verified, not assumed:
`ALL 15 PRE-EXISTING/ADDED EXPORTS RESOLVE (15 checked)`.

## 5. Verification

| Suite | Result |
|---|---|
| `coach-completion-controller-preservation.test.mjs` | **13 / 13** |
| `coach-completion-admission.test.mjs` | **24 / 24** (the 4 previously failing are green) |
| `coach-completion-manifest.test.mjs` | **14 / 14** |
| `coach-completion-checkpoint.test.mjs` | **22 / 22** |
| `backend npm run test:node` | **314 / 314, 0 fail** |
| `deepDiffs` / gate export chain | all 15 resolve |

## 6. A NEW finding produced by this closure (R7-11)

The control pass for R7-06 — "a tampered field must be caught" — returned `[]` for a mutated
`rawByteLength`, where a violation was expected. Rather than report that as a defect on sight, I
established **which** of two opposite things was true. Measured
(`scripts/coach-completion-tools/r711-manifest-byte-probe.mjs`, baseline `[]`):

```
(a) LENGTH-ONLY LIE  -> ADMITTED []     <-- nothing compared rawByteLength
(b) REAL DRIFT       -> CAUGHT          <-- "DRIFTED since the manifest was built"
```

So the digest verification **does** read disk (the `[]` was not a false green), and the length was
**decorative**: its only two occurrences in the gate source were a *presence* test and a report
string, neither comparing it to anything.

**R7-11: a self-contradictory manifest.** The C0 contract is *"raw current-byte identity"* —
`rawByteLength` **and** `sha256`, describing the same bytes. A manifest whose length and digest
disagree is self-contradictory, and the **length is the field a human reads**: a review that checked
it against a tree would conclude the wrong thing about how much changed. A digest-only check also
cannot distinguish a 0-byte file from a file that failed to write.

Fixed by returning `byteLength` from `hashSource` **from the same buffer that was hashed** (a second
`statSync` would reintroduce the two-sources-of-one-fact problem) and comparing it. A length-only
disagreement is reported as its own **named** violation, because the two have different fixes: drift
means **rebuild**, a wrong length means the record was wrong when it was written.

Bound by tests 12–14 of the manifest suite, proved **load-bearing** by mutation: deleting exactly the
comparison block turns **precisely** tests 13 and 14 red and nothing else; restoring it returns
14/14.

---

*Rule 86 — Hostile Review Archive: `Z:\HostileReviews`. Source review: Astra, Review 7.*
