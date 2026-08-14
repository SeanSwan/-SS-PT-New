# Mutation-equivalent adjudications

Blueprint Part A §1-T3(c) / S7 require that mutants surviving the harness are adjudicated **in
writing** before a kill rate is reported. Without this, "equivalent mutant" becomes a verbal escape
hatch that quietly lowers the 0.80 floor to whatever the author needs it to be.

**Rules for this file**
- One entry per surviving mutant, with the exact mutation, why it is unobservable, and the date.
- "Equivalent" means *no possible test can distinguish it*, or the distinguishing input is
  unreachable in practice (e.g. requires exact wall-clock equality across two syscalls).
- "Hard to test" is **not** equivalent. If a test could exist, the mutant counts as SURVIVED and
  drags the kill rate down until the test is written.
- Post-adjudication kill rate = killed / (valid mutants − adjudicated equivalents).

---

## Cycle 2026-08-12 — `scripts/hooks/lib/gate-common.mjs` (Slice 1)

### EQUIVALENT — stale-lock TTL boundary off-by-one

- **Mutation:** `ageMs <= staleMs` → `ageMs < staleMs` in `acquireCounterLock`.
- **Observable difference:** only when `ageMs === staleMs` **exactly** — a lock whose age is
  120,000.000 ms at the instant `Date.now()` is sampled.
- **Why unreachable:** `ageMs` is computed as `Date.now() - statSync(lockPath).mtimeMs`, so hitting
  exact equality requires the wall clock to land on a specific millisecond between two syscalls. A
  test cannot pin it: setting the lock's mtime to `Date.now() - 120000` and then calling the
  function introduces an unavoidable δ of at least one scheduling quantum, making the observed age
  `staleMs + δ`. Passing a custom `staleMs` has the same race.
- **Behavioural stakes if wrong:** at the exact boundary, one reading calls the lock contended and
  the other reclaims it. Both are defensible; the next call one millisecond later reclaims either
  way, so the system converges identically.
- **Verdict:** EQUIVALENT. Excluded from the denominator.

### KILLED after adjudication — freshness boundary `>=` vs `>`

- **Mutation:** `statSync(path).mtimeMs >= start` → `> start` in `isFreshThisSession`.
- **Initially survived**, and was NOT ruled equivalent: unlike the TTL case, both mtimes are set
  explicitly from the same `Date` in the test, so exact equality is deterministic and testable.
- **Action taken:** the inclusive boundary is now an asserted contract — an artifact stamped at
  exactly session start counts as fresh (test 14). The boundary was accidental before; it is chosen
  now.
- **Verdict:** real coverage gap, closed. Counts as killed.
