# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/brainstorms/qwen-finetune-reviews-2026-08-16/07-PACKET-SLICES-H2.md
**Seed:** (none)
**Tokens:** 16460 in / 7129 out | **Cost:** ~$0.1563 | **Wall:** 194.7s | **finish_reason:** stop

---

# HOSTILE REVIEW — ROUND H2 (Reviewer 1 of 2)

Attack surface: the H1 fixes only. I verified the sign-test log-space math, the floor logic, the blinding commitment chain, the validator hardening, and the generator's rejection sampling before writing anything below. Findings are ranked; each has a corrected design.

---

## F1 — HIGH: The contamination gate does not cover the id namespace where contamination is actually declared fatal

**What the fix claims (ledger H1-4):** "entity ids partitioned (train 0xx / eval 1xx, remapped, zero overlap) + --train gate refusing shared ids."

**What the code does:**
```js
const ENTITY_RE = /demo-client-\d+/g;
```
The gate only matches `demo-client-N`. But the standing caveat in the generator — "generator rows may NEVER be evals (H4 monoculture)" — is about the **classroom Track B entity space, `C1..C12`**. Those ids appear verbatim in every generator row's gold JSON and would appear verbatim in any classroom eval. Run this tomorrow:

```
node scripts/compare-tuned.mjs run --profile classroom-extract-v1 \
  --evals classroom-evals.jsonl --train gen-classroom-dumps.jsonl
```

If the eval author (contrary to doctrine) derived evals from generator output, the gate passes silently — `C7` in train and `C7` in eval is not a `demo-client-\d+`. The single most dangerous contamination path for this program (synthetic train leaking into the eval that decides promotion) is the one the gate cannot see. The console reminder at generator exit is not a control; it's a wish.

**Corrected design:**
```js
const ENTITY_RES = [/demo-client-\d+/g, /\bC(?:[1-9][0-9]{0,2})\b/g];
function contaminationGate(evalRows, trainPath) {
  const trainText = readFileSync(trainPath, 'utf8');
  for (const re of ENTITY_RES) {
    const trainIds = new Set(trainText.match(re) ?? []);
    const overlaps = new Set();
    for (const row of evalRows)
      for (const id of JSON.stringify(row).match(re) ?? [])
        if (trainIds.has(id)) overlaps.add(id);
    if (overlaps.size) throw new Error(/* as today */);
  }
}
```
Better still: since the generator *always* writes a manifest sidecar, add a hard rule — if `--train` points at a file whose sibling `.manifest.json` exists (i.e., it is generator output), and `--profile` is `classroom-extract-v1`, refuse outright regardless of id overlap. Generator output is never a legitimate contamination reference for a classroom eval; it's the contaminant itself.

---

## F2 — MEDIUM: `--audit-seed` marks the console, not the evidence

The H1-1 fix warns on stdout: "⚠ --audit-seed makes the blinding REPRODUCIBLE — debug/audit runs only, never evidence." Then nothing. The run card, the scorecard, and `sealed/mapping.json` carry no marker that the blinding seed was operator-chosen. Six weeks from now, a run dir produced with `--audit-seed 7` is byte-for-byte indistinguishable from a CSPRNG run — same commitment format, same card fields, same "floor PASS" line. The warning evaporates with the terminal scrollback; the artifacts persist and are promotable.

The whole point of H1-1 was that blinding integrity must be *auditable from artifacts*, not from memory.

**Corrected design:** stamp `auditSeed: true` into `mapping.json`, add a run-card line `Blinding: CSPRNG | AUDIT-SEED (not evidence)`, and have `renderScorecard` prepend `⚠ THIS RUN USED A REPRODUCIBLE BLINDING SEED — DEBUG/AUDIT ONLY, NOT PROMOTION EVIDENCE` when the flag is present in the sealed mapping. `scoreRun` already reads mapping.json; the plumbing exists.

---

## F3 — MEDIUM: The generator's arg parser was left unhardened while the harness got the strict-parser fix

compare-tuned.mjs (post-H1): `else throw new Error(\`unknown argument "${arg}"\`)`.
gen-classroom-dumps.mjs (post-H1): silently ignores anything unrecognized.

```
node scripts/gen-classroom-dumps.mjs --count 5000 --seed 1234 --oupt /tmp/x.jsonl
```
`--oupt` is swallowed; the build writes 5000 rows to the default path and prints success. Worse, a typo'd flag that *is* numeric-shaped (`--seed` consumed but `--countt 5000` ignored) produces a build whose manifest confidently records `requested: 150` while the operator believes 5000. The lineage manifest — the H1 fix whose entire purpose is provenance — will faithfully record the wrong provenance.

**Corrected design:** mirror the harness: `else { console.error(\`[gen-classroom] unknown argument "${argv[i]}"\`); process.exit(1); }`. This is four lines and is the same fix H1 already blessed one directory over.

---

## F4 — MEDIUM-LOW: Truncation exclusion can silently bias the paired comparison

The S3-6 fix excludes `done_reason === 'length'` items from the sheet and reports them. Good as far as it goes. But exclusion is only unbiased if truncation is arm-symmetric. If the tuned model is chattier (a common fine-tune outcome) and truncates on 6 of 30 items vs base's 0, the sheet silently drops exactly the items where tuned was worst, `n` shrinks, and the win rate is computed over the survivorship-filtered remainder. The scorecard prints `truncated 6` under "Deterministic checks" but the floor math never sees it, and nothing forces a human to notice the differential before promotion.

**Corrected design:** in `scoreRun`, compute `truncDelta = |truncatedBase - truncatedTuned|` from checks.json (it already counts per-arm truncation) and add to `renderScorecard`'s "Gates this scorecard does NOT clear" section: a hard line `truncation differential N (base X vs tuned Y) — promotion blocked if N > 0 until re-run at higher --num-ctx`. Even better: treat any item where exactly one arm truncated as a scored loss for that arm rather than an exclusion; truncation *is* a quality outcome.

---

## F5 — LOW: Provenance field schema split defeats two of the S3-5 guards

- Eval rows are read with snake_case: `row.ideal_provenance` (runCompare gate, outputs record).
- `buildBlindedPairs` and `scoreRun` read camelCase: `item.idealProvenance`, `o.idealProvenance`.

The harness-written outputs.jsonl bridges the two, so the happy path works. But an eval file authored with camelCase (`{"ideal": "...", "idealProvenance": "PENDING — draft"}`) bypasses the unidealized gate (checks `r.ideal_provenance` → undefined → passes), gets recorded with `idealProvenance: ''`, and then bypasses the scorecard's PENDING warning (tests the recorded empty string). Both S3-5 guards have the same hole, from opposite sides.

**Corrected design:** one accessor, used everywhere:
```js
const provenanceOf = (r) => String(r.ideal_provenance ?? r.idealProvenance ?? '');
```
Plus a `validateRow` extension warning when both spellings appear in one eval file.

---

## F6 — LOW: `HEX_OUTSIDE_VAR` over- and under-fires at the edges

```js
const HEX_OUTSIDE_VAR = /(?<!var\(--[\w-]{1,64},\s{0,4})#[0-9a-f]{3,8}\b/i;
```

1. `{3,8}` admits 5- and 7-digit strings (`#abcde` is not a CSS color; flagging it is harmless but mislabeled as "hardcoded hex").
2. False positive: CSS id selectors composed of hex letters — `#face { }`, `#cafe { }`, `#added { }` — are flagged as hardcoded colors. Coder rows reviewing legitimate selector diffs will trip the alarm and get culled from training data for a non-violation.
3. The exemption requires ≤4 spaces after the comma; `var(--brand,     #fff)` (5 spaces) is flagged despite being exactly the house-rule-6 pattern the regex exists to protect.

**Corrected design:** `#[0-9a-f]{3}\b|#[0-9a-f]{4}\b|#[0-9a-f]{6}\b|#[0-9a-f]{8}\b` (valid lengths only), `\s*` in the lookbehind, and require the match to be preceded by `:` or whitespace-after-`:` heuristics — or simpler: only match when the char before `#` is not part of a selector context (check preceding non-space char is `:` or `=`). At minimum, fix (1) and (3); (2) needs a test fixture with `#cafe`/`#face` id selectors asserting no-hit.

---

## F7 — LOW: Score never re-verifies the blinding commitment

The run card carries `mappingCommitment` (H1-1), but `scoreRun` reads `sealed/mapping.json` and never hashes it against the card. A sealed mapping swapped between run and score (accidental `--force` reuse, sync race, or malice) unblinds verdicts against the wrong assignment and produces a clean-looking scorecard. One line closes it: read the card, extract the commitment, compare to `mappingCommitment(readFileSync(...))`, throw on mismatch.

---

## DISSENT (mandatory)

**I dissent from the packet's framing of the FABLE "kill the generator" ruling as adequately deferred — but only on one narrow point.** Deferring the train-vs-eval-only decision until the R5 evidence exists is correct; manufacturing a training decision before the spike data would be worse. However, the ruling as implemented leaves the generator's *defensive* value asymmetric: the validator now rejects unknown keys, caps records, and requires exact `attribution` forms, but the generator's grammar **never produces near-miss invalid outputs** — no row with a slightly-wrong key, a 21-record dump, or a `C0` attribution. That means the validator's new hard checks (S1-2, S4-2, S4-9 fixes) are themselves only ever exercised by the hand-written 5-problem fixture, not by the generator's volume. The generator should gain a `--emit-invalid N` mode producing N deliberately contract-violating rows per build, so every new validator rule gets volume-tested the day it lands, not the day a model happens to violate it. This does not contradict the ruling — it strengthens the generator's declared role as validator-torture-test, which the ruling explicitly preserved.

I **affirm** the triage ruling (S2-5): gold omitting triage while the prompt permits it is the right encoding of "judgment stays out of weights," and the contract's `_triage_note` documents it where a future contributor will actually see it.

I also note for the record: the `missing`-verdict computation in `scoreVerdicts` (the `!verdicts.some(v => v.id===id && v.verdict==='tie')` clause) is dead code — ties are added to `seen` before the tie branch — but it is *harmlessly* dead and I decline to file it as a finding.

---

## VERDICT

**NOT DRY.** Seven findings: one high (F1 — contamination gate blind to the C-id namespace where monoculture contamination is the declared fatal risk), two medium (F2 unmarked audit-seed artifacts, F3 unhardened generator parser corrupting the new lineage manifest), one medium-low (F4 truncation survivorship bias), three low (F5, F6, F7). All are concrete, all attack H1 fixes specifically, none require re-litigating disclosed known gaps (the pre-sheet PII lint remains correctly OPEN and I did not count it).
