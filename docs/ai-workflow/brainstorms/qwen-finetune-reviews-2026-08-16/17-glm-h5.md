# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/qwen-finetune-reviews-2026-08-16/16-PACKET-SLICES-H5.md
**Tokens:** 11484 in / 25333 out (reasoning: 22377) | total 36817
**Wall:** 396.1s

---

# H5 HOSTILE REVIEW — attack the H4 fixes

**Verdict: NOT DRY.** One H4 fix contains a self-inflicted regression that breaks its own feature in the most common case, and two others are incomplete against their ledger claims. Details below, proofs traced through the shipped source.

---

## MAJOR

### M1. H4-3 refusal guard fires on the directory *it just created* — `--force` is broken on every fresh or empty out-dir

Trace `run --force --out-dir <path>` where `<path>` does not exist (or exists empty):

1. First guard skipped: `existsSync(runDir)` false (or `length === 0`).
2. `mkdirSync(sealedDir, { recursive: true })` — **creates `runDir` and `runDir/sealed/`**.
3. Force guard: `!existsSync(run-card.md)` ✔ true, `!existsSync(sealed/mapping.json)` ✔ true, `readdirSync(runDir).length > 0` — the dir now contains `['sealed']` → **true**.
4. `throw '--force refused: … does not look like a run dir … wrong --out-dir?'`

So `--force` now throws on a **brand-new path** and on an **existing empty dir**. It only works on dirs that already contain `run-card.md` or `sealed/mapping.json`. The feature "reset and rerun" is unusable in its most ordinary invocation.

Why the smoke missed it: the H4-3 smokes used *pre-populated* dirs only (a junk dir, a real run dir). A junk-dir smoke cannot distinguish "refuses junk" from "refuses everything" — it passed for the wrong reason. Missing smokes: `--force` on nonexistent dir, `--force` on empty dir, `--force` on crashed-run dir (see M2).

**Fix:** snapshot pre-existing state before mutating: `const preExisting = existsSync(runDir) ? readdirSync(runDir) : [];` — use it for both the non-force guard and the force-refusal signature. This also fixes the embedded secondary defect that the refusal *pollutes the "wrong" dir* with a `sealed/` entry before throwing (mutate-then-refuse).

### M2. H4-3 × K2/H2-4 interaction: a crashed run dir is unrecoverable, and recovery requires the manual destruction H4-3 exists to prevent

What a mid-run crash leaves: `mkdirSync(sealed)` ran, `outputs.jsonl` was appended incrementally (H2-4's whole point), but `run-card.md`, `sealed/mapping.json`, `checks.json`, `judging-sheet.md` are all **end-of-run** writes. Crashed dir = `{ sealed/outputs.jsonl }` exactly.

- Without `--force`: "run dir is not empty — stale verdicts would poison scoring … Use a fresh dir or **--force**."
- With `--force`: fails the run-dir signature (no card, no mapping) → "**--force refused** … wrong --out-dir?"

Dead end. The error message actively directs the user into the refusal, and the only recovery is `rm -rf` on the partial outputs — the exact destruction the "SUPERSEDE, never destroy — outputs are the expensive artifact" doctrine was written to eliminate. The supersede loop is even *ready* to rename `outputs.jsonl`; the guard just refuses to recognize the one dir shape crashes produce.

**Fix:** include `sealed/outputs.jsonl` (or "sealed/ containing anything") in the looks-like-a-run-dir signature. Add the crashed-dir `--force` smoke.

### M3. H4-5 is incomplete: any `--train` run of ANY profile still hard-depends on the classroom contract's presence and version

`contaminationGate` iterates `entityRegexes()` **unconditionally**, and `entityRegexes()` calls `loadClassroomContract()` unconditionally. `loadClassroomContract` throws on ENOENT and on version mismatch. Therefore:

```
run --base A --tuned B --profile swan-coach-v1 --train coach.jsonl
```

dies if `contracts/classroom-extract.contract.json` is missing or bumped — and the contract is literally named `0.0.0-provisional`; a bump is an anticipated, planned event. When it happens, every coach and coder comparison with `--train` bricks until code is edited.

The ledger claims "coach/coder runs … no longer depend on the classroom contract's presence or version." That is true only for runs *without* `--train` — and `--train` is precisely the path that exercises the gate. Import-time coupling became gate-time coupling, which for gated runs is total.

**Fix** (author must choose deliberately, because F1 says check every namespace):
- classroom profile ⇒ derive the child-id namespace, fail closed (current behavior, correct there);
- non-classroom profile ⇒ catch the load failure, proceed with the demo-client namespace only, and print an explicit warning that the classroom namespace was NOT checked because the contract is unreadable.

Either way, today's state is wrong in code *and* wrong against the ledger claim.

### M4. The rebuilt hex regex misses non-first-token value hexes — `border: 1px solid #ccc` passes

The positive lookbehind is `(?<=[:='"`,(]\s*)` — the `#hex` must sit immediately (modulo whitespace) after `: = ' " \` , (`. It does not contain `)`, and it does not contain word characters. Consequences, all **unflagged** today:

- `border: 1px solid #ccc;` (char before whitespace is `d`)
- `box-shadow: 0 0 4px #000;`, `outline: 1px dashed #999`, `text-shadow: 0 1px 0 #fff`
- `background: url(plate.png) #fff;` (`)` before the whitespace — not in the class)

These are among the most common hardcoded-hex shapes in real CSS. The 9-fixture matrix asserts gradient-first-arg, url forms, spaced href, multiline var — **not one fixture places the hex beyond the first token of a value or after a closing paren**, so the hole is invisible to the suite.

**Fix (conservative, two parts):**
1. Unambiguous: add `)` to the value class → `[:='"`,()]`.
2. A second alternative for word-char-preceded hex *followed by a declaration terminator*: `(?<=[\w)\]]\s+)#(?:hex…)\b(?=\s*[;})!])`. Terminators exclude `,` and `{` and `:`, which keeps selectors safe: `a #face, #beef {}` (`#face` followed by `,`; `#beef` preceded by `,`), `#face:hover`, `#face {` all stay unflagged. Write the red fixtures (`border: 1px solid #ccc`, `box-shadow: 0 0 4px #000`) and the selector controls *first*, then ship the branch. If the author judges the ambiguity unresolvable, part 1 alone is still mandatory.

---

## MINOR

### m1. The supersede list omits `run-card.md` — a stale `Result: floor PASS` survives a `--force` rerun that crashes again

The fix's own comment: "every stale derived artifact must leave the reader's path." `run-card.md` — the one artifact carrying the Result line readers trust — is not superseded; it is only overwritten at *successful* run end. Crash mid-rerun and the dir holds: old run-card claiming PASS + superseded outputs + fresh partial outputs + no new card. Exactly the poison scenario H2-5/H4-3 guard against. One-line fix: add `[runDir, 'run-card.md']` to the loop.

### m2. H4-6's whitespace doctrine applied to itself inconsistently: `var()` got `\s*`, url/href got the magic `\s{0,8}`

Nine spaces — or two newlines plus indentation — inside `url( … )` legal CSS defeats the exemption and false-positives. No fixture tests the 8/9-space boundary, so the cap is unjustified as well as arbitrary. Also `href={"#fade"}` and `` href={`#face-${id}`} `` (JSX expression container: `{` between `=` and the quote) bypass the href exemption entirely and flag. Fix: `\s*` in all three exemptions (the engines are identical — JS supports variable-length lookbehind, as the var() exemption already proves); allow `=\s*\{?\s*["'`]` in the href lookbehind. Or document why 8.

### m3. The INCOMPLETE path drops the PROBE marker

`stats.incomplete` → `Result: INCOMPLETE — defective verdict file` — no `PROBE (unpinned judge)` prefix even when `/Judge: <pin/` matched. F2's doctrine is that the marker lives in the artifact; it vanishes on exactly the runs most likely to be re-read and re-judged. Self-heals on a later successful rescore, hence minor — but it's a one-line fix: prefix the INCOMPLETE line too.

### m4. The dataset helper silently accepts an explicitly-passed unknown `--profile` — the exact silent-vanishing H2-3 fixed in the sibling

`build --profile swan-coach-v2` (typo) → `reportProfileValidation` → `isTrackProfile` false → returns 0 → **zero track validation, zero complaint, clean exit**. compare-tuned throws on the identical input because "deterministic checks would silently vanish (H2-3)." The two siblings hold opposite policies on the same flag. Fix: keep default `'swan-codex'` working, but throw when `--profile` was *explicitly* passed and is unknown.

---

## What held under attack (for the record)

- **H4-4**: traced every write call-site in `build` — nothing touches `--out` or `latest-sources.jsonl` before validation passes; the rejected-evidence path is a fresh stamped file. Solid.
- **H4-8/K2**: `--count` as the final argv token → `Number(undefined)` → NaN → throws; unknown-flag throw retained. Solid.
- **H4-7 main path**: marker derived from card text, not the flag — correct in both directions. Only m3's branch leaks.
- **K4**: the dead `existsSync` guard is gone.
- **var() exemption**: holds under `var( --x , #fff )`, multiline, uncapped token names; hex inside a gradient nested in a fallback still flags, consistent with H4-1 doctrine.
- **Lazy entityRegexes**: verified no top-level contract load remains in any of the three files — `help`, doctor, and test imports are genuinely decoupled. The residue is M3's gate path only.

---

## MANDATORY DISSENT

1. **I am NOT raising "build should run core `validateTrainingExamples` before write"** under H4-4's no-poisoned-bytes doctrine. `validate` is a separate, doctor-routed command and prior rounds accepted that split; re-litigating adjudicated design in a fix-attack round is scope creep. (If the author wants it, it's a two-line addition — but its absence is not a new defect.)
2. **I pulled back on M4.** My first instinct was to demand declaration-scope parsing; that's disproportionate and would import its own false positives. The proposed second branch still carries residual risk (quote-terminated values, e.g. `alt="solid #face"`-shaped strings, if quotes are added to the terminator set) — which is why I demand red fixtures plus selector controls *before* the branch ships, and why `)`-in-class is the non-negotiable minimum.
3. **I am NOT counting `querySelector('#face')` flagging.** The quote has been in the value class since F6; H4 didn't touch it, and in coder-design rows "don't use hex-spelling identifiers" is defensible doctrine. Calling it an H4 defect would be a false finding.
4. **On M3, a defender could argue fail-closed-everywhere is correct under F1.** My rebuttal: even granting that, the ledger sentence is false as written, and the failure surfaces as a raw ENOENT/version-mismatch with no hint that `--train` caused it. Code or claim must change; both being wrong is not an option.
5. **Not counted as findings**: the `runCardPath2` naming residue, same-second same-pid supersede-stamp collisions, absent range checks on `--count`/`--temperature` (finite-check was the adjudicated scope). Real but trivial; listing them as findings would dilute the ledger.

---

**Bottom line: NOT DRY.** M1 is a hard regression (`--force` throws on fresh and empty dirs — its primary use case), M2 makes crashed runs manually-deletable-only in direct violation of the supersede doctrine, M3's decoupling claim is demonstrably false for every `--train` run, and M4 leaves the most common hardcoded-hex shape in CSS unflagged with no fixture covering it. Fix the four majors (m1–m4 while you're in there), add the four missing smokes/fixtures — fresh-dir `--force`, empty-dir `--force`, crashed-run-dir `--force`, non-first-token hex — and resubmit for H6.
