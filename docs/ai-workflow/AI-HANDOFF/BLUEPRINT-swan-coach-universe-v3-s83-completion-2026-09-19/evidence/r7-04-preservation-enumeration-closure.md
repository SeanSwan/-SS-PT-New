# R7-04 closure — "preservation accepted 29 artefacts with 0/0 verification"

**Finding (Astra Review 7, MED):** the preservation receipt was accepted while verifying nothing.

**Verdict: CLOSED.** Measured, with a control that reproduces the defect.

---

## 1. The defect, reproduced

The shipped `checkPreservation` validated a **prose string**. It regex'd `/(\d+)\/(\d+)/` out of
`method.verified` and passed when the two numbers matched. Measured against the **real** receipt on
2026-09-22:

```
$ node --input-type=module -e "… checkPreservation(doc) …"
verdict: []                          <- ACCEPTED
artifacts on disk: 29 | does the receipt enumerate them? NO — no artifacts list
```

The receipt carried `artifactCount: 29` and `"29/29 preserved artifacts byte-identical to base
blobs"` and **no artefact list at all**. The number counted and the number claimed were the same
number, and neither had ever been compared to a byte on disk. `method.verifier`
(`scripts/coach-completion-tools/c0-verify-snapshot.mjs`) was **never invoked by the gate** — an artefact naming a verifier
nothing runs.

This is the **R7-02 defect class in a second place**: a verdict resting on a string nobody parses.

## 2. What the fix binds

The receipt now **enumerates** its artefacts, and `checkPreservation` checks the enumeration instead
of trusting a sentence:

| Check | The over-claim it removes |
|---|---|
| `artifacts` present, non-empty, every entry names a path | a count with no detail to verify |
| `artifactCount === artifacts.length` | a summary that contradicts its own detail — how "29" survived next to an absent list |
| with `{ root }`: every entry resolves, `sha256` matches disk | a receipt naming artefacts that are not there |
| recorded `rawByteLength` matches the bytes that hashed | R7-11's rule, applied here too |
| a 0-byte artefact is refused | a move that recorded the intent and lost the content |
| `baseBlobsReadable: true` beside all-null `blobSha` is refused | the over-claim returning in machine-readable form |
| no `root` ⇒ an explicit NO ROOT SUPPLIED self-report | a silent pass for bytes nobody read |

`root` is now threaded from `runAll` (`preservation: checkPreservation(preservation, { root })`) —
it had been passed to `bindings` and `candidate` but **omitted here**, which would have left the
strengthened check degrading to the shape test it replaced.

## 3. The enumeration is honest about what it could NOT prove

`scripts/coach-completion-tools/r704-backfill-preservation-inventory.mjs` recorded `blobSha: null` for every entry **on
purpose**. The receipt's own method says the snapshot came from `git cat-file blob <base>:<path>`, so
the tempting fill-in was a per-entry base digest — and that would have been **fabrication**: as of
2026-09-22 the base commit's `docs` subtree is missing from the object store (see
`r7-12-preservation-provenance-unreachable.md`), so no base blob can be produced for comparison.

So the receipt now records:

```
verification: {
  scope:       snapshot files exist, are regular files, and hash to the digests recorded here
  outOfScope:  byte-identity against the base commit blobs CANNOT be performed: the base row is unreadable
  baseBlobsReadable: false
  filesChecked: 29, filesHashed: 29, emptyFiles: 0
}
claimSuperseded: { was: "29/29 preserved artifacts byte-identical to base blobs", why: … }
```

The prose claim is **replaced, not deleted** — it is retained as history beside the reason it can no
longer stand. A weaker check that says it is weaker is evidence; a `29/29` reading as if both halves
were proven is not.

## 4. Verification

| Test | Result |
|---|---|
| LIVE receipt, `{ root }` | `[]` |
| LIVE receipt, no root | the NO ROOT SUPPLIED self-report (not a silent pass) |
| **CONTROL: the pre-fix shape** (count + string, no enumeration) | **REFUSED** — `NO ARTEFACT ENUMERATION … a claim no measurement can contradict is not evidence` |
| CONTROL: count 30 vs 29 listed | REFUSED (`disagrees with its own detail`) |

Three tests in `coach-completion-checkpoint.test.mjs` **encoded the defect** — the first asserted a
*pass* for a receipt with no enumeration. They were updated to the strengthened contract, with the
old shape demoted to a CONTROL that must be refused. A test a strengthened gate breaks because it was
asserting the weak behaviour is not a regression; it is the defect being recorded.

| Suite | Result |
|---|---|
| `coach-completion-checkpoint.test.mjs` | **26 / 26** (was 22; +6, one replaced) |
| `coach-completion-manifest.test.mjs` | **14 / 14** |
| `coach-completion-admission.test.mjs` | **24 / 24** |
| `coach-completion-controller-preservation.test.mjs` | **13 / 13** |
| `runAll` end-to-end, all real receipts | `preservation` **clean**, `candidate` **clean** (383 entries) |
| `backend npm run test:node` | see §6 |

## 5. Rule 4 split

The strengthened gate took `coach-completion-checkpoint.mjs` to **332 lines** against the 300 cap.
Extracted to `scripts/coach-completion-preservation.mjs` — the seam is a real subject boundary: the
checkpoint module asks *"is this package admissible"* across bindings, scope, run-contract and
completeness; this one asks *"are the bytes we claim to have preserved actually preserved"*. They
share `runAll` and `hashSource` and nothing else.

`checkpoint.mjs` **332 → 272**; `preservation.mjs` **88**. Re-exported so no import site changed.

### One honest error on the way, caught by a guard test

The extraction re-exported `checkPreservation` but did not `import` it, and `runAll` **calls** it.
`export … from` re-exports a binding without creating a local one. Six admission tests failed with:

```
ReferenceError: checkPreservation is not defined     (runAll, checkpoint.mjs:241)
```

including the R6-03 guard *"runAll invokes EVERY gate this package exports"* — the guard built for
exactly this class of omission, failing loudly rather than passing an `undefined` around. Fixed by
adding the `import`; **77/77** across the four suites afterwards.

## 6. Live findings surfaced by this closure (recorded, not buried)

`runAll` against the real receipts reported violations that are **not** R7-04 defects. Each was
classified by execution rather than assumed:

1. **`successor: missing predecessor receipt`** — `runAll({ successor })` was called with no
   successor document, so the gate correctly reported it could not run. My fixture's omission.
2. **`controller: missing before/after state`** — `controller-migration-input.json` has
   `keys: taskId, sessionId, repoRoot, authorization, planFiles, slices, carriedCalls,
   previousState`, so `runAll({ controller: <input> })` needs
   `{ before: previousState, after: <input> }` and I passed the whole document. **My adapter error**,
   and the fix is in the CALLER (or `runAll`'s contract), not in the gate — so it is deliberately
   **not** papered over by loosening `checkControllerMigration`.
3. **`bindings:` three sha256 MISMATCHes** on `backend/run-coach-postgres.mjs`, `backend/package.json`
   and `.gitignore`. The third is genuinely mine (`.gitignore` was edited for R7-06); the other two
   are pre-existing drift in a receipt this pass did not touch. Not silently re-baselined.
4. **`candidate:` DRIFTED** entries — the manifest had been built **before** the final two source
   edits. Rebuilt after every edit landed; now **`[]` clean at 383 entries**. This is the gate
   working: it caught a stale manifest that a digest-only or length-only check would each have partly
   missed.

---

*Rule 86 — Hostile Review Archive: `Z:\HostileReviews`. Source review: Astra, Review 7.*
