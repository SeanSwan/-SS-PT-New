# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/qwen-finetune-reviews-2026-08-16/10-PACKET-SLICES-H3.md
**Tokens:** 19632 in / 16526 out (reasoning: 14491) | total 36158
**Wall:** 251.5s

---

# H3 HOSTILE REVIEW — verdict: **NOT DRY**

The H2 ledger claims K2 is implemented. The shipped source disagrees. One ledger item is verifiably absent, one gate fails open, and F6's regex has demonstrable false positives. Everything else I attacked held.

---

## H3-1 (MAJOR — ledger/code mismatch): The K2 `--force` reset does not exist in the code

The ledger states: *"`--force` now RESETS — truncates `outputs.jsonl` and quarantines stale `verdicts.jsonl` to `.stale-<stamp>`."* The packet's NOTE says to check that implementation for holes. There is no implementation to check.

In `scripts/compare-tuned.mjs`, `runCompare` contains exactly this force-related logic:

```js
if (existsSync(runDir) && readdirSync(runDir).length > 0 && !opts.force) {
  throw new Error(`run dir ${runDir} is not empty ...`);
}
```

…then `const outputs = [];` and, per item, `appendFileSync(outputsPath, ...)`. There is **no truncation of `outputs.jsonl`**, **no `unlinkSync`/`renameSync`**, and the strings `.stale`, "quarantine", and "reset" appear nowhere in this file. The only "stale" in the file is in the pre-existing error message. Grep-level verifiable.

**Concrete poison path** (`run --out-dir D --force` on a used dir, same eval file — the normal rerun case):

1. `sealed/outputs.jsonl` keeps run-1 rows; run-2 rows are **appended** (the exact "appended-duplicate" path K2 claimed to close). `scoreRun` then reads this doubled file for `pendingIdeals` and `sliceById`.
2. `verdicts.jsonl` from run 1 survives untouched at the top level.
3. `mapping.json`, `run-card.md`, `judging-sheet.md` are all overwritten — so they are *internally consistent*. **F7 cannot fire**: `cardCommitment === mappingCommitment(mappingRaw)` by construction.
4. Old verdict ids are the same ids (same eval file), so `scoreVerdicts` finds no unknowns, no duplicates, valid values — and resolves `left`/`right` against the **new** random assignment. Roughly a coin-flip per item, the arm attribution is silently inverted. The output is a complete, clean-looking scorecard that can even **pass the statistical floor**. H1-3's defect screen never triggers because the file isn't defective — it's misattributed.

This is the single worst surviving defect across all three rounds: silent, promotion-relevant, and directly under a ledger line claiming it's closed. Fix per the ledger: on `--force`, truncate `sealed/outputs.jsonl` before the loop and rename any existing `verdicts.jsonl` to `verdicts.jsonl.stale-<stamp>` (stamp already has second resolution + pid, so collisions are a non-issue).

## H3-2 (MODERATE): `score` fails OPEN when `run-card.md` is missing — both the judge-pin gate and F7 vanish

```js
const runCardText = existsSync(...) ? readFileSync(...) : '';
if (/Judge: <pin/.test(runCardText) && !opts.allowUnpinnedJudge) { throw ... }
const cardCommitment = runCardText.match(/sealed\): ([0-9a-f]{64})/)?.[1];
if (cardCommitment && cardCommitment !== mappingCommitment(mappingRaw)) { throw ... }
```

Delete `run-card.md` from a run dir and **both** regexes simply don't match: no pin requirement, no commitment check, scoring proceeds and writes a scorecard. F7's own error message names the threat ("the mapping was swapped or the dir was reused") — and the cheapest possible tamper (removing the card, or dropping in a hand-built dir) bypasses it entirely, as does the S4-7 judge-pin gate. There is no legitimate cardless run: `runCompare` always writes one and `scoreRun`'s design updates it. Fix: `score` must **require** `run-card.md` (throw if absent). Fail-closed, three lines.

## H3-3 (MINOR): F6's value-position lookbehind admits `"`/`(`/`,` — and the var() exemption still misses two whitespace shapes

The ledger claims "any-width whitespace in the var() lookbehind"; only post-**comma** whitespace is covered:

```js
/(?<!var\(--[\w-]{1,64},\s*)(?<=[:=('"`,]\s*)#(?:...)/i
```

Demonstrable false positives (all fail the build loudly — safe direction, but they block legitimate coder rows):

- `<a href="#cafe">` — `"` is in the prefix class, `cafe` is 4 valid hex, `"` is a boundary → flagged as hardcoded hex. Same for `#face`, `#added`, `#decade`; SVG `url(#fade)` via `(`. The selector case (`#cafe {`) is genuinely fixed — I verified the lookbehind rejects it — but attribute/URL references to hex-spelling ids reintroduce the same false-positive class one token over.
- `var( --token, #fff)` (space after paren) and `var(--token , #fff)` (space before comma): the negative lookbehind requires `var\(--[\w-]{1,64},` with no interior whitespace, so these legal CSS spellings are **not exempted** and get flagged — while the H2 fix's stated goal was exactly to exempt required var() fallbacks.

Not promotion-critical, but it is a real precision gap in the fix as described, with concrete repros.

## Nits (real, low, bundled)

- **Contract duplication:** `ENTITY_RES` hardcodes `\bC(?:[1-9][0-9]{0,2})\b` while the contract defines `attribution.childIdPattern` — a second source of truth for a contract-owned rule. This is the identical defect class as the GLM manifest nit fixed this round (`EXPECTED_CONTRACT_VERSION` import). A contract pattern change silently stales the contamination gate. Derive the regex from the contract.
- **Failed-build residue:** `.rejected` is un-stamped — a second failed build overwrites the first quarantine. And `reports/latest-sources.jsonl` is written *before* profile validation and never cleaned, so a failed build still leaves the full poisoned example set on disk in a `.jsonl` a trainer could point at — against the fix's own stated principle ("must not leave a poisoned dataset where a trainer can find it").

## What I attacked and could not break

F1 (entity namespaces, manifest refusal, boundary behavior of the C-regex incl. `C1000`/`AC1` non-matches), F2 (`--audit-seed 0` correctly flagged via `!== null`; `??` preserves seed 0), F3 (strict args incl. missing numeric values → exit 1), F4 (differential computed and rendered), F5 (both casings at every real read site), F7 regex-vs-card text alignment, K1 (checked every `NON_BINDING_REFS` string against the actual OBSERVATIONS/FOLLOW_UPS pools — no accidental coreference; "that same kiddo"/bare pronouns correctly confined to the no-antecedent branch), K3 (predicate identical in both sites), K4 (fence ≥ longest run + 1, floor 4, verified no content can contain its own fence), K5 (`’` present), the torture self-check (8/8 makers map to distinct validator rules; quarantine extension; `rowsFailing` math), and the two self-caught fixes (`readFileSync` now imported; `.rejected` + emptying exercised). All held.

---

## DISSENT (mandatory)

I dissent against my own H3-2 severity, and partially against calling H3-1 "silent": a counterargument exists that H1-3's verdict-integrity screen already nets most stale-verdict scenarios, since any rerun that appends verdicts trips duplicate-id INCOMPLETE, and any eval-file change trips unknown/missing ids — the silent path requires the judge to *not* re-judge an already-judged sheet, which a disciplined operator wouldn't do. On that reading, only the same-eval/no-rejudge cell of the matrix is poisoned, and H3-2 requires deliberate deletion of a file every run creates.

I reject that counter, on the grounds that the poisoned cell is the **default rerun workflow** (`--force` exists precisely to rerun into a dir; nobody re-judges a sheet they already judged), and a gate that fails open on the easiest tamper isn't a gate. But if the maintainer rates operator discipline above fail-closed design, H3-2 drops to nit and H3-1 remains the sole blocker — still not DRY.

**Bottom line:** NOT DRY. H3-1 is a claimed-but-absent fix with a promotion-relevant silent poison path; H3-2 is a two-line fail-closed correction; H3-3 and the nits are honest minor cleanups. Fix H3-1 and H3-2 and this is plausibly the last substantive round.
