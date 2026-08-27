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

---

## Cycle 2026-08-13 — `gate-lock.mjs` (post-hostile-review rebuild)

### EQUIVALENT — release-path inode check

- **Mutation:** `if (inoKnown && st.ino !== handle.ino) return false;` → `if (false) ...` in
  `releaseCounterLock`.
- **Observable difference:** none reachable. A lock's identity is its `token`, a per-claim UUID
  written into the file. For the inode check to change the outcome, a *different* file would have to
  carry *our* token — which requires someone copying our lock file byte-for-byte. Every real re-claim
  path (steal, release-then-reacquire, in-place rewrite) mints a new token, and the token comparison
  already refuses those; the new "token mismatch alone blocks release" test proves it does so
  independently of the inode.
- **Why the check stays anyway:** defence in depth, and it is the only guard that would survive a
  future refactor which made tokens non-unique. Cost is one comparison.
- **Verdict:** EQUIVALENT. Excluded from the denominator. Post-adjudication kill rate 12/12 = 1.00.

### NOT equivalent — three mutants that survived round 1 and forced new tests

- `ageMs === null` guard dropped → an **unstattable** lock was treated as stale and stolen from a
  live holder. No test existed. Closed by a `statFn` that throws.
- Release token check dropped → survived because the S2 test passed on the **inode** check alone, so
  the token comparison was never exercised. Closed by rewriting the lock in place (same inode, new
  token).
- `disabledAnnounced.add` dropped → telemetry re-announced on every call, flooding the channel that
  is supposed to be the crash signal. Closed by asserting the count does not grow on repeat calls.

**Invalid mutant, recorded so it is not miscounted as a survivor:** `const sameFile = corpseStat` →
`true && corpseStat` is semantically identical (the rest of the conjunction lives on later lines).
A no-op mutation is not evidence of weak tests; it is evidence of a bad `sed`.

---

## Cycle 2026-08-26 — Swan Coach ownership (`ownership.mutations.mjs`)

### EQUIVALENT — the lane-side trainer-id guard, while the resolver-side guard stands

- **Mutation not added:** removing `if (ctx.user.role === 'trainer' && !toPositiveInteger(ctx.user.id))`
  from `stepResolveClient` on its own.
- **Observable difference:** none, today. `resolveClient` now refuses independently when a
  scope is requested and cannot be computed, so the lane guard's removal changes no outcome
  any test can reach. A single-guard mutation SURVIVES, and a survivor here would read as
  vacuity when it is in fact defence in depth.
- **Why it is kept anyway:** the resolver serves callers outside this lane, and a lane must
  not depend on a shared helper's internals for its own safety. The guard exists against the
  resolver's contract changing — which is a thing that has happened once already this week.
- **What IS pinned:** the resolver half directly, by
  `tests/unit/clientResolverScopeFailClosed.test.mjs` (M44 fires on it alone). Both halves
  together by the compound M42. Only the lane half alone is unobservable.
- **Verdict:** EQUIVALENT while the resolver guard stands. Excluded from the denominator.
  If the resolver guard is ever removed or relaxed, this adjudication expires and the lane
  guard must be pinned directly.

Raised by GLM 5.3 Flash, 2026-08-26: *"M42's compound form is the only pin for either guard."*
Correct at the time. Half of it is now decomposed; this records why the other half is not.
