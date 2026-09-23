# 27 — C3 "Repair Reach" completion record

**Status:** COMPLETE — orders 6 and 7 satisfied, with the measured corrections below.
**Round 2 lane:** C3 (`05-slices.md`), orders 6–7.
**Round 2 stop condition:** *"Four named matrix cases pass; incomplete scans cannot assert absence;
full importer list and reference-class behavior checked."* — all satisfied.

---

## 1. What was wrong, measured rather than argued

The first C3 revision passed a **self-authored 8-case matrix** while **three of Astra's four
required cases were failing against the same code**. That is the central lesson of this record and
of Round 2's R2-06: a matrix written by the author of the code tests the author's mental model,
not the contract. Astra's cases are the acceptance evidence, so they replace the self-authored
matrix in the shipped file.

Measured before repair, using Astra's own fixture shapes:

| Case | Required | First revision produced | Verdict |
|---|---|---|---|
| RT-01 | 3 files; 1 static / 1 dynamic / 1 require | 3; 1/1/1 | pass |
| RT-02 | `pkg`=2, **`ghost`=0** | `pkg`=2, **`ghost`=1** | **FAIL — impostor edge** |
| RT-03 | exit **6**, verdict `INCOMPLETE`, `E_PARSE` diagnostic | exit **0**, verdict `DEAD-CANDIDATE`, no diagnostics | **FAIL** |
| RT-04 | `['pages/use.ts']` | `['other/use.ts']` | **FAIL — wrong importer** |

### RT-02 — string-literal impostors

`const text = "import value from 'ghost'"` produced a real edge to `ghost`. This is R2-08's third
named defect. The first revision preserved string bodies so a `//` inside a string could not start
a comment (R2-08 a) — correct — but then ran the specifier regexes **over that preserved text**, so
a fake import inside a string became an edge. Fixing (a) had introduced (c).

### RT-03 — malformed source read as absence

`import {` parsed to zero importers and reported `DEAD-CANDIDATE`. Since zero-importers in a
complete scan is the finding that authorises deletion, this is the dangerous direction: a truncated
file would authorise deleting a live module. Round 2 order 7 requires an explicit `INCOMPLETE`.

### RT-04 — relative specifiers compared as text

R2-08's fourth defect, confirmed exactly. With target `./lib/widget`:

- `pages/use.ts` importing `"../lib/widget"` **could not match** — the strings differ (false negative);
- `other/use.ts` importing `"./lib/widget"` **did match** — but resolves to `other/lib/widget.ts`,
  a different file (false positive).

One textual comparison produced both errors at once.

---

## 2. What was changed

`scripts/intake-reach.mjs`:

1. **`maskStrings(src)`** — one length-preserving pass that blanks every string/template **body**
   and drops comment text. The import *keyword* sits in code position and is never masked; only the
   trailing specifier is blanked, and the original text is recovered from the unmasked source at the
   matched offsets. This satisfies (a) and (c) simultaneously: a `//` in a string cannot hide a real
   import, and a fake import in a string cannot create an edge.
2. **`resolveSpec()` + `targetCandidates()`** — every relative specifier is resolved from its
   importing file (extensions and `/index` variants tried) and compared as an **absolute path**; the
   target is expanded the same way. Raw-text comparison for relative specifiers is gone.
3. **Real parse check via `@babel/parser` 7.28.6** — see §3.
4. **Verdict set now distinguishes three zero-importer outcomes**: `DEAD-CANDIDATE` (complete scan),
   `INDETERMINATE` (unreadable or unresolved inputs), `INCOMPLETE` (source failed to parse).
   Exit `6` whenever the scan is incomplete, `0` otherwise.
5. **`diagnostics[]`** with `{code, path, message}`; codes `E_PARSE`, `E_READ`,
   `E_UNSUPPORTED_SYNTAX`.
6. **Type-only class** — `import type { T } from 'S'` is reported in `typeOnlyCount` and excluded
   from `staticCount`, delivering Round 2's *"type-only references must be separately identifiable"*
   and *"require-only references must not be labeled dynamic imports."*

### Removed: `stripComments` (orphaned machinery)

A mutation proof showed that deleting `stripComments` changed **no test outcome** — `maskStrings`
already stripped comments. It was redundant machinery that *looked* load-bearing, which is a hazard
in a verification tool: a future edit could "tighten comment handling" there while changing no
behaviour, and the operator would believe the tool had been improved. It was removed, and a mutation
now targets the comment-stripping scan inside `maskStrings` instead.

---

## 3. Parser selection — the delegation in `09-tests.md` exercised, and why a heuristic failed

Round 2 PART C delegated the parser choice, bounded by: *"already installed, version-bound,
demonstrated syntax support, no new dependency authorization."*

**Chosen: `@babel/parser` 7.28.6**, already installed at `frontend/node_modules/@babel/parser`
(a frontend devDependency; `frontend/package.json` also pins `@typescript-eslint/parser` and
`typescript`). Verified capability: TypeScript, TSX/JSX, regex literals, nested template
interpolations, and error reporting on truncation.

**Two heuristics were tried first and both failed against real source.** This is recorded because it
is the substantive reason a parser is required rather than a nicety:

| Attempt | Method | Result on `frontend/src` (4578 files) |
|---|---|---|
| 1 | Whole-file brace/paren balance over masked text | **239 false parse errors** |
| 2 | "unterminated final import/export statement" | **21 false parse errors** |
| 3 | `@babel/parser` | **1 diagnostic — and it is a real defect** |

Attempt 1 failed because JavaScript places `{`/`(` in non-code positions that masking does not
remove: regex literals (`/^\s*[=+\-@]/`) and template interpolations
(`` `${x.replace(/"/g,'""')}` ``). Attempt 2 failed because the last *line* of a multi-line
construct is not a complete statement. A checker that fires on valid input is worse than one that
never fires — it trains the operator to ignore the diagnostic, and the one real truncation then
goes unnoticed.

The single remaining diagnostic is a **genuine pre-existing repo defect**:
`frontend/src/components/common/ConstructionBanner.integration.tsx` declares `AppContent` twice
(`(58:6)`). Reported, not repaired — it is outside this package's scope.

**Failure mode is asymmetric by design.** The parser is resolved optionally from this file's own
location; if it cannot be loaded, `detectParseError` returns null and the scan is reported with
`parserAvailable:false` rather than throwing, so the tool still runs in a bare checkout. Files whose
extension this tool cannot adjudicate are marked `E_UNSUPPORTED_SYNTAX` and counted as incomplete —
Round 2 requires unsupported syntax to remain explicitly incomplete, never assumed good.

---

## 4. Verification — Astra's matrix shipped, and a four-way mutation proof

`scripts/intake-reach.regression.test.mjs` now materializes **Astra's Matrix B verbatim** (RT-01 to
RT-04) plus controls RT-05 to RT-08. Result on the shipped code: **8/8 pass**.

Mutation proof (`scripts/.mutation-proof-c3.mjs`, kept as evidence): each fix is removed
individually and the matrix re-run. **Each mutation degrades exactly one named case (7 pass / 1
fail), with all four controls staying green** — proving both that every mechanism is load-bearing
and that the matrix is not over-sensitive.

```
DETECTED  M1 — disable string masking        -> RT-02 fails   (7 pass / 1 fail)
DETECTED  M2 — disable the parse check       -> RT-03 fails   (7 pass / 1 fail)
DETECTED  M3 — revert relative resolution    -> RT-04 fails   (7 pass / 1 fail)
DETECTED  M4 — revert comment stripping      -> RT-08 fails   (7 pass / 1 fail)
RESTORED — pass=8 fail=0
```

Real-corpus smoke, `--root frontend/src` (4578 files, complete scan): `react` → LIVE, 1120
importers (1116 static, 4 dynamic, 114 type-only); `styled-components` → LIVE.

---

## 5. What this does NOT claim

Per Round 2 PART C, this is a **bounded regression result, not product admission**, and the following
remain explicitly open: real caller-path wiring, evidence authenticity, ignored-registry exclusion,
preservation roots/device truth, and the original hand-count populations. The `4/4 + 4/4` target is
a bounded matrix result. Admission remains blocked.
