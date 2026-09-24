# R5-08 runner scope gap — CLOSED by appending S91

**Raised:** 2026-09-21 (Astra R5-08). **Resolved:** 2026-09-21, operator decision, same day.
**Finding:** `evidence/r5-08-scope-finding.md`
**Decision:** Sean, 2026-09-21 — *"Append a bounded slice."* Option (a) of the two the finding named.

## What was done

A tenth slice, `S91-GUARDED-RUNNER-SURFACE`, was appended to the schema-4 controller state
`tmp/coach-completion-20260921/workflow-state-v8.json`. It owns 11 paths: the 6 the finding named
plus the 5 that belong to the same surface and which the finding did **not** name —
`coachTargetMarker.mjs`, `coachTestDatabase.mjs`, `coach-completion-checkpoint.mjs`, its test, and
`backend/package.json`. Those 5 are included because leaving them out would reproduce the original
defect in miniature: a surface that is partly invisible is still partly invisible.

State hashes: **superseded** — the first append produced `6ab7161b34198d70…`, which Astra Review-6
showed is an **INVALID** state (`slices=10`, `scopes=9`). See "CORRECTION — the first append was
invalid" below. Current state: `351b794810f0c5fa…`. Backups at `workflow-state-v8.json.pre-S91` and
`workflow-state-v8.json.pre-recovery`.

## Why an append is the legal shape

`checkControllerMigration` (`scripts/coach-completion-checkpoint.mjs:163-178`) is **one** of the
authorities — the other is the supported controller's own guard, and I checked only the first.
Line 170 bounds *shrink* (`after.slices.length < before.slices.length`) and never growth.
`authorization.allowAdditionalSlices` was already `true`. So no new permission was needed and no
guard field was touched: taskId, sessionId, calls, policyHash, cadence, and every pre-existing
slice and event are byte-identical to the pre-append state — verified, not asserted.

**What that paragraph got wrong.** "Legal shape" was established against
`checkControllerMigration` alone. The supported tooling imposes a **second** invariant this file
never mentions — that `slices[i]` and `scopes[i]` are **positionally paired** — and the first
append violated it. Checking one authority and calling the write legal is the same error this
whole arc keeps producing: the guard you did not enumerate is the one that fires.

## CORRECTION — the first append was invalid (Astra Review-6, R6-05 / R6-10)

The state this file originally certified as clean was **rejected by the supported controller**:

```
workflow.mjs status … → exit 1: override slice scope or status changed
S91 in scopes: false | S91 in slices: true   (slices=10, scopes=9)
```

Mechanism, quoted from `workflow-override-evidence.mjs:83-87` — an **index-paired** guard:

```js
for (const [i, slice] of state.slices.entries()) {
  if (!isDeepStrictEqual(slice.allowedFiles, state.scopes[i]?.files) || slice.id !== state.scopes[i]?.id
      || !isDeepStrictEqual(slice.files, [...new Set([...slice.allowedFiles, ...(state.scopes[i].planFiles || state.planFiles)])])
      || !['build','tested','approved'].includes(slice.status)) fail('override slice scope or status changed');
}
```

At `i=9`, `state.scopes[9]` is `undefined`. `workflow-override.mjs:95-110` — the supported append —
writes `scopes`, `slices`, `contractDigest` **and** history **together**; my script wrote `slices` +
`events` and omitted `scopes`. The invalid state is preserved at
`tmp/coach-completion-20260921/incident-invalid-v8/workflow-state-v8-INVALID-6ab7161b.json`
(sha256 `6ab7161b34198d7039b0c4ccc3da746981f6785479328fa93cfd6e360e23a34e`, matching the hash Astra
computed from a separate process).

**A second defect found during the repair, and it was pre-existing.** Diffing v7 against v8 before
rebuilding showed the **v7 → v8 migration itself** had dropped `digest`, `frozen` and
`reviewDisposition` from slices S83–S87 and demoted each `tested` → `build` — erasing the record that
they were ever tested. Running that diff *before* the rebuild is the only reason it was not
overwritten a second time. All 15 fields were restored from v7 and corroborated against
`override-frozen`/`override-tested` entries in the event log.

Recovery: `tmp/recover-controller-v8.mjs`. `slices=10 scopes=10 events=219`; the index-pair invariant
holds for **every** slice; S83–S87 restored to `tested`; `checkControllerMigration(v7 → v8)` → `[]`.

## THE `origin` TRAP — two wrong attempts, both recorded

`origin.events` is a **frozen snapshot of the predecessor**, and line 173 demands **equality**,
not "at least":

```js
if (after.origin?.events?.length !== be.length) out.push('controller: origin does not carry the full prior event history');
//                                                            ^^ be = before.events
```

For v8, `origin.events` holds **216** events — which is `v7.events` (216), **not** `v8.events` (217).

**Attempt 1 — extended `origin.events` with the new event.** Produced
`origin.events` 217 vs `v7.events` 216 → violation. The guard's message *"does not carry the full
prior event history"* reads as if origin were too SHORT; it fired because origin was too LONG.
Fix: leave `origin` byte-identical. `events` grows; `origin.events` does not.

**Attempt 2 — kept the fix but validated against the wrong baseline.** I checked
`before = v8.pre-S91, after = v8+S91`, which demands `origin.events` (216) ===
`v8.pre-S91.events` (217). **That can never hold**, so the script's self-check was structurally
incapable of passing and refused a correct write. The same false invariant was repeated in
`tmp/verify-s91.mjs`, which failed a check for the same reason.

**Controlled probe that settled it** — identical slice and event appended; the only variable is
`origin`; baseline correctly set to v7:

| `origin` handling | verdict |
|---|---|
| left untouched | **CLEAN** |
| extended with the new event | `origin does not carry the full prior event history` |

**Rule established:** validate an append against **the predecessor that `origin` snapshots** (v7
for v8), never against the pre-append state. Both wrong attempts are recorded here and in the
script's comments rather than deleted, because the failure is instructive: I asserted a guard
message meant the opposite of what it said, twice, and only a controlled probe caught it.

## Verification — and what the first version of it did NOT check

`tmp/verify-s91.mjs` reported **24/24 ALL CLEAN** against the state that Astra then showed to be
**invalid**. It is not that the checks were wrong — most were genuine and still pass. It is that
**the set of checks was chosen from the fields I had thought about** (`slices`, `events`, `origin`,
`calls`, `cadence`) and never from **what the supported guard reads**. The guard reads
`scopes[i]` against `slices[i]` positionally; `scopes` was not in my list at all, so the one
invariant that failed was the one invariant nothing asserted.

**This is the fourth instance of the same failure class in this arc, and the first where the
consequence was a broken artifact rather than a wrong sentence.** A verifier written by the same
agent that wrote the change shares its blind spots by construction.

Now checks, after the correction:

- S91 present in **both** `slices` and `scopes`, at the **same index**;
- the supported index-pair guard passes for **every** slice — `allowedFiles === scopes[i].files`,
  `id === scopes[i].id`, `files === unique(allowedFiles + planFiles)`, status in
  `build|tested|approved`;
- every pre-existing slice byte-identical to v7, including the `digest` / `frozen` /
  `reviewDisposition` fields the v7 → v8 migration had dropped;
- taskId / sessionId / policyHash / cadence / calls / allowAdditionalSlices all unchanged;
- `checkControllerMigration({before: v7, after: v8})` → **no violations**;
- `origin.events` still snapshots v7 exactly (216) and was **not** extended;
- the 6 finding paths each resolve to an owner, and to S91 specifically;
- `checkScope` admits a runner edit under S91 and still refuses an unrelated path.

Four negative sentinels prove the guard can fail. Three fire correctly. **The fourth does not, and
that is a real finding — see below.**

## Correction: my first sentinel was wrong, not the guard

The initial negative sentinel compared the **pre-append** state (9 slices) against a mutant with
S91 removed (also 9). Nothing had shrunk, so the guard correctly stayed silent — and I first read
that as "the guard cannot detect a dropped slice." Wrong. Re-run with `before` set to the
**post-append** state, dropping S91 fires `controller: slice history shrank` immediately. The
sentinel was defective; the guard is sound for that case. Both versions are kept in
`tmp/verify-s91.mjs`, the wrong one commented, rather than deleted.

## NEW FINDING — the guard is blind to `allowedFiles` being emptied

Confirmed with the **correct v7 baseline** so no other violation can confound the result:

```js
const h = structuredClone(v8);
h.slices = h.slices.map(s => s.id === 'S91-GUARDED-RUNNER-SURFACE' ? { ...s, allowedFiles: [] } : s);
checkControllerMigration({ before: v7, after: h });   // -> NONE
```

Re-measured verbatim, because the earlier version of this probe was run without a control and the
result is only meaningful with one:

```
v7 (216 events) -> v8 untouched (218 events)        -> []            # control: clean
v7             -> v8 with S91.allowedFiles = []     -> []            # the blind spot
v8.pre-append  -> v8 with S91.allowedFiles = []     -> ["controller: origin does not carry
                                                         the full prior event history"]
```

The third row is the trap. Using the pre-append state as the baseline emits an **`origin` message**
that has nothing to do with ownership — it fires because `origin` snapshots v7 (216) and the baseline
holds 217. Reading that string as "the guard noticed something about the hollowing" would be wrong:
`origin.events` is byte-identical across all three rows. **Only the `v7` row isolates the variable**,
and there the guard is silent. The sentinel in `tmp/verify-s91.mjs:82` therefore asserts on the
*content* of the messages (`!/allowedFiles|own/i`) rather than on their count.

The same holds when S91 is replaced wholesale by a slice of the same `id` with
`allowedFiles: []`. `checkControllerMigration` inspects `slices.length` and nothing inside a slice,
so a future migration could strip S91's ownership while preserving the array length and the guard
would report clean — leaving the surface unowned again.

**This is the R5-08 defect class recursing one level up.** R5-08 was "the runner has no owner and
the guard cannot see it." This is "the owner record can be erased and the guard cannot see that
either." It is also the shape of R4-03: a fact present in the structure (`allowedFiles`) that no
decision consults.

**Not fixed here.** Fixing it means changing a guard in the middle of a review cycle, and the
change needs its own hostile pass — the guard is what proves everything else. The concrete
proposal for the next hardening round: assert that for every slice `id` present in both states,
`allowedFiles` does not shrink.

## What this closes, and what it does not

**Closes:** `evidence/coverage-mapping.json#unresolved[2]` and `[3]` — "which slice may touch the
runner files" and "resolve the runner scope gap." C1's acceptance criteria and C1's owned scope now
intersect on the runner surface.

**Does not claim:** that the R3–R5 runner fixes were previously invalid (they were each
mutation-proven; see `RUNNER-HARDENING-NOTES.md`), or that S91 is *implemented* — it is
`status: "scoped-not-started"` with `round: 0`. This makes the ownership boundary match the work
already done; it starts no new work.

## The verifier was fixed and the fix was mutation-tested

`tmp/verify-s91.mjs` now asserts the supported index-pair invariant (§4b). A green check is worth
nothing on its own — the previous version was also green — so the fix was **mutation-tested**: the
original defect was re-planted (S91 dropped from `scopes`) and the new block run against it.

```
lengths: scopes=9 slices=10
paired: false
reason: index 9: slice "S91-GUARDED-RUNNER-SURFACE" vs scopes[9] "undefined"
=> the corrected verifier catches it
```

**28 checks, ALL CLEAN on the recovered state; the same block reports FAIL on the defect it was
written to catch.** A check that does not fail on the defect it names is not a check — which is the
whole lesson of this section, applied to the fix for it.

Two further assertions were changed rather than deleted, and both changes are corrections:
- `S91.files === S91.allowedFiles` → **superset**. The supported shape is
  `files = unique(allowedFiles + planFiles)`; the equality assertion encoded my invalid shape.
- `every pre-existing slice is byte-identical` → **identical to v7, not to `.pre-S91`.** The old
  baseline was itself damaged; keeping it would have frozen the v7 → v8 loss in place as expected.
