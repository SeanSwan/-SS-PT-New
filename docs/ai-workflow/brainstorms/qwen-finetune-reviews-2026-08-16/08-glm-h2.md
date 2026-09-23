# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/qwen-finetune-reviews-2026-08-16/07-PACKET-SLICES-H2.md
**Tokens:** 16318 in / 24192 out (reasoning: 21194) | total 40510
**Wall:** 351.2s

---

# H2 HOSTILE REVIEW — attack of the H1 fixes

**Verdict up front: NOT DRY.** Five genuine findings (2 MEDIUM, 3 LOW). Nothing HIGH: I could not construct a path where the current code silently promotes a bad model or unblinds itself without an operator error. Everything else on the fix ledger was attacked and held. Findings are ranked; corrected designs are concrete.

---

## K1 — MEDIUM: the S2-2 fix still ships one anaphoric trap. "that same kiddo from yesterday" *resolves* to the named child, but gold says `uncertain`

**The fix being attacked:** "two-record traps now DESCRIPTIVE-refs-only (bare he/she next to one named child was resolvable — your S2-2)."

**Evidence.** `pronounTrapDump`, two-record branch:

```js
const descriptiveRefs = PRONOUN_REFS.filter((r) => r !== 'she' && r !== 'he');
```

`PRONOUN_REFS` = `['the little guy…', 'she', 'he', 'that same kiddo from yesterday', 'the one who loves the trucks', 'our friend from the blue table', 'the new friend']`. The filter removes the syntactic pronouns but keeps **`that same kiddo from yesterday`** — and "same" is an explicit anaphoric operator. Generated text: *"C7 stacked nine blocks ok so that same kiddo from yesterday refused to nap again today."* The natural-language reading is unambiguous: "that same kiddo" asserts identity with the just-mentioned discourse entity, C7. Gold: `attribution: "uncertain"`.

This directly collides with `resolvableAnaphoraDump` branch 2 (*"C3 stacked nine blocks but then she…"* → gold = C3). The model now receives: weak continuation pronoun → resolve; **stronger** explicit anaphor → don't resolve. That is worse than the ambiguity S2-2 removed — it's a contradiction, at ~1.2% of rows (6% two-record branch × 1/5 ref choice ≈ 60 poisoned rows at n=5000).

I checked the other three surviving descriptives and they are genuinely ambiguous (C7's morning temperament, truck affinity, table assignment, and newness are all unknowable from the dump) — the defect is exactly one string.

The regression test "two-record traps descriptive-only" passes anyway, because it asserts the *letter* of the fix (no bare `she`/`he`), not the *semantic property* (non-bindable referent). See DISSENT.

**Corrected design.** Exclude anaphoric operators from the two-record branch; keep this ref in the pronoun-only branch, where there is no in-dump antecedent and `uncertain` is correct:

```js
const BINDING_REFS = new Set(['she', 'he', 'that same kiddo from yesterday']);
const descriptiveRefs = PRONOUN_REFS.filter((r) => !BINDING_REFS.has(r));
// pronoun-only branch keeps full PRONOUN_REFS — no antecedent exists there
```

Update the regression test to assert semantics: maintain an explicit allowlist of non-binding descriptives and assert the two-record branch draws only from it.

---

## K2 — MEDIUM: `--force` re-run poisons the sealed dir two ways — appended duplicate outputs, and stale verdicts silently scored against the *new* mapping

**The fixes being attacked:** the non-empty-dir refusal (stale verdicts would poison scoring) and incremental `outputs.jsonl` appends.

**(a) Append corruption.** The run loop has **no resume logic** — `for (const row of items)` re-queries every item unconditionally. The only path that ever reaches an existing `outputs.jsonl` is crash → re-run → `--force`, and that path *appends*: the file ends up with rows 1–50 (old) followed by rows 1–100 (new). There is no non-corrupting use of append-to-existing under the current code. Consequences: `sealed/outputs.jsonl` — permanent evidence — contains duplicates/stale generations, and `pendingIdeals` at score time is inflated (it counts the duplicated rows).

**(b) The silent one.** `--force` overwrites `mapping.json` with a fresh seed but leaves `verdicts.jsonl` in place. If the eval set and truncation behavior are unchanged, the id sets match, so `scoreVerdicts` finds no unknown/missing ids — and unblinds the *old* judgments via the *new* mapping. Left in mapping 1 ≠ left in mapping 2; the win/loss tallies are reassigned at random and **the scorecard renders a clean, floor-evaluable result from garbage**. This is precisely the H2-5 threat model, re-opened by that fix's own escape hatch. Trigger: re-run with `--force`, then score without re-judging ("outputs barely changed, just re-score") — plausible operator behavior.

**Corrected design.** Since every run regenerates all items, `--force` must reset, not append:

```js
if (opts.force) {
  writeFileSync(outputsPath, '', 'utf8');                 // regenerate-all semantics
  const stale = join(runDir, 'verdicts.jsonl');
  if (existsSync(stale)) renameSync(stale, `${stale}.stale-${stamp}`); // quarantine, warn loudly
}
```

Belt-and-suspenders: refuse to overwrite an existing `mapping.json` while a live `verdicts.jsonl` sits beside it (require the quarantine first).

---

## K3 — LOW: the pending-ideal predicate is implemented twice, differently — the hard gate is the weaker of the two

**Fix attacked:** S3-5 (refuse empty/PENDING ideals without `--allow-unidealized`).

Run gate: `/^PENDING/i.test(ideal_provenance)` — anchored. Scorecard count: `/PENDING/i.test(o.idealProvenance)` — unanchored. A provenance of `"author draft — PENDING Sean"` passes the run gate as fully idealized, then the scorecard prints the ⚠ pending-ideals warning for it — the gate and the card disagree about the same row. The unanchored version exists precisely because someone anticipated mid-string PENDING; only the lenient copy made it into the gate.

**Corrected design.** One shared predicate, and unify on the *stricter* (unanchored) reading since the gate's job is to block unapproved ideals:

```js
export const isPendingProvenance = (s) => /PENDING/i.test(String(s ?? ''));
```

Use it in both `runCompare` and `scoreRun`.

---

## K4 — LOW: the 4-backtick fence fix is defeated by 4-backtick model output — which is idiomatic for exactly one of your three profiles

**Fix attacked:** "4-backtick sheet fences (model output containing ``` cannot break the sheet)."

A coder-profile answer that demonstrates *nested* fenced code — the standard way to show a fenced block inside a fenced block is an outer 4-backtick fence — breaks the sheet exactly the way the fix was meant to prevent. The threat model was "model output must not break sheet structure"; the fix moved the threshold by one instead of closing the class.

**Corrected design.** Adaptive fence per pair (CommonMark rule):

```js
const fenceFor = (...texts) => {
  const runs = texts.join('').match(/`+/g) ?? [];
  return '`'.repeat(Math.max(4, Math.max(0, ...runs.map((r) => r.length)) + 1));
};
```

Apply to prompt/ideal/left/right per item (or use `~~~` with the same adaptive rule over tilde runs).

---

## K5 — LOW: the S3-4 apostrophe fix misses the typographic apostrophe — the variant LLMs emit by default

**Fix attacked:** "ai_self_description catches apostrophe forms."

Pattern: `/\bi(?: a|')m an ai\b/i` — straight quote only. `"I’m an AI coach"` (U+2019) passes. This pattern runs both on authored training rows and, via `deterministicChecks`, on live model output at eval; curly apostrophes are the dominant form in model prose, so the hygiene counter undercounts on the exact arm where self-description leaks matter.

**Corrected design.** `/\bi(?: a|['\u2019])m an ai\b/i`. One character class.

---

## Attacked and held (so the ledger knows what was re-verified)

- **Blinding (H1-1/S1-1):** seed path, commitment one-wayness, Fisher–Yates correctness, no arm signal in sheet/run-card; `winnerArm` recomputation correct in both mapping orientations. Held.
- **Floor (H1-3/S2-3/S4-6):** all four defect classes (unknown/duplicate/invalid/missing) render INCOMPLETE — I traced every path including "only occurrence is an invalid verdict" and the redundant double-filter in the missing-id logic (works, just inelegant). Sign test verified in log-space including the n≈10³ subnormal-tail case; Wilson correct; CI-low>0.5 dominates minN=30 harmlessly. Held.
- **Validator (S1-2/S4-2/S4-4/S4-9):** primitive/array records, extra keys, 20-cap, C0/C007/C1000, post-validation caching, `var()` lookbehind (variable-length lookbehind is legal in JS; nested `var(--a,var(--b,#fff))` correctly exempt). Held.
- **Generator mechanics (H1-5/S4-3):** rejection sampling, >1% gate, cumulative sampler sums to exactly 1.0, dead child-pool fallback now unreachable (count≤8 < pool 12) and harmless, manifest lineage, gold cleanliness (no triage, no "said as", typos live in dump not gold). Held except K1.
- **Alternation, truncation exclusion, unidealized gate, degenerate-run and unknown-profile refusals, strict parser, run-card judge pin.** Held except K2/K3.
- **Pilot rows:** ≤3 bundled screening, conditions/meds before plan guidance, log-in-file, no banned terms, no retired hex. Held.

---

## DISSENT (mandatory)

1. **Against the test suite, on GLM's side of the ledger:** "29/29 tests" is being used as a quality signal it cannot supply. The "two-record traps descriptive-only" regression asserts the syntactic exclusion of `she`/`he` — K1 survives it, and would survive any test written against the filter instead of the linguistic property. Two more of my findings (K3, K4) are also invisible to the suite: predicate drift between gate and card, and fence length. The suite verifies the *implementation* of each fix, not the *defeat condition* of the defect class the fix targeted. Until regressions are written as "construct the defeating input, assert it fails," each round's fixes will ship with exactly this kind of one-string residue.
2. **FABLE ruling on triage: I attacked it and I concur.** Triage is workload-context judgment; a type→triage lookup baked into weights would be an enumerable rule masquerading as judgment, which violates the program's own doctrine. Residual risk worth naming: with zero triage supervision, base-model triage priors pass through untouched — acceptable only because the inference guard enforces the value set and real-data phases own the calibration. If triage quality ever becomes load-bearing before then, this ruling must be revisited, not extended.
3. **FABLE ruling on the generator: concur, with one objection on enforcement.** The deferral to R5 evidence is the right adjudication of my "kill it" position — but "no training run occurs before that evidence exists" is process-only. Nothing mechanical prevents a disposable-probe file from being pointed at by a future training config. The manifest, contract-version warnings, and H4 reminder are good friction; the missing piece is that the provisional-contract marker should be machine-checkable by whatever training entrypoint eventually exists (e.g., trainer refuses `contract: *provisional` manifests outright). Cheap now, expensive to retrofit.
4. **On the OPEN pre-sheet PII lint:** it is disclosed, so it is not a finding — but the judging sheet is the one place a *human* touches raw prompt+output text, and it is currently written before the planned lint runs. The lint should land before the next judge round, not before "some future sheet write."

---

## Nits (explicitly not findings — recording them so the next round knows they were seen, not missed)

- `gen-classroom-dumps` manifest hardcodes `'classroom-extract@0.0.0-provisional'` instead of importing `EXPECTED_CONTRACT_VERSION` — will silently lie after a version bump.
- `pendingIdeals` at score counts truncated items that were never judged.
- ~0.003% of resolvable-anaphora rows can pair "all by herself" with pronoun "he" (grammar-agreement noise; may never occur at realistic counts).
- `--help` (as opposed to bare help) exits 1.
- `ENTITY_RE` contamination scanning only covers `demo-client-\d+` — correct for current tracks since classroom rows carry no entity ids and are eval-barred by H4, but worth remembering if a third track appears.

**Bottom line: fix K1 and K2 before the next generator build or any judged run respectively; K3–K5 are one-liners that can ride along. After that, this round's honest answer may well be DRY.**
