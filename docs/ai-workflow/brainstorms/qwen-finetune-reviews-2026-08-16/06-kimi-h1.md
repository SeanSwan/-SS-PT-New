# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/brainstorms/qwen-finetune-reviews-2026-08-16/04-PACKET-SLICES-H1.md
**Seed:** (none)
**Tokens:** 11990 in / 14719 out | **Cost:** ~$0.2568 | **Wall:** 692.5s | **finish_reason:** stop

---

# HOSTILE IMPLEMENTATION REVIEW — Round H1
## Three Local Brains: compare harness, contract validator, classroom generator, pilot data

Verdict up front: the harness's two load-bearing claims — "the judge never sees which arm is which" and "malformed model output is caught deterministically" — are both false as implemented. The blinding is reproducible by anyone who can read the run directory, and the contract validator crashes on exactly the class of output it exists to catch. The pilot coach data teaches behavior the track prompt explicitly forbids. Details below, ranked.

---

## S1 — CRITICAL

### S1-1. Blinding is security-through-obscurity; the mapping is derivable from judge-visible artifacts

`buildBlindedPairs` uses `mulberry32(seed)` with **default seed 42**, and the seed is then written to **both** `mapping.json` **and** `run-card.md` (`Blinding seed: ${meta.seed}`). The judging sheet's title literally names both models (`${opts.base} vs ${opts.tuned}`). Consequences:

1. Anyone with the seed and the item order (both visible: sheet shows order, run card shows seed) can recompute the entire left/right mapping by re-running 20 lines of PRNG. The "sealed" mapping is a deterministic function of public data.
2. Worse: with the default seed unchanged, **every run over the same eval file produces the identical position sequence**. A judge (human or LLM) who has ever seen one unblinded run — or who simply judges run 2 after run 1's scorecard was produced — knows the assignment pattern for all subsequent runs.
3. `outputs.jsonl` (arms in cleartext) and `checks.json` (per-arm banned-hit counts — a fingerprint, since the tuned model presumably has fewer hits) sit in the same directory as the sheet. The only protection is a `_warning` string and a doc comment. If the judge is an LLM agent with filesystem access, blinding is already gone; if it's a human, it's one double-click gone.

**Corrected design:**
- Draw the seed from `crypto.randomInt(2**31)` per run. Never write it to the run card or any judge-visible file.
- Write `mapping.json` to a *separate* directory (`runs/.sealed/<run-id>.json`) and write only `sha256(mapping)` into the run dir. `score` takes `--mapping <path>` explicitly and verifies the hash. The judge receives *only* `judging-sheet.md` as a file handoff — the harness should print exactly that instruction, and the sheet title should be a neutral run ID, not `base vs tuned` model names.
- Refuse to `run` when `--seed` is passed explicitly unless `--i-know-this-unblinds` is also present (seeded runs are for debugging the harness, not for evidence).

### S1-2. Contract validator throws TypeError on non-object records — the exact output it exists to catch

In `validateClassroomRecord`:

```js
if (!('attribution' in (record ?? {}))) {
```

If a record is a primitive — `{"records":["C3 counted five bears"]}` is *entirely* plausible output from a 4B model — then `record ?? {}` is the string, and `'attribution' in "..."` throws `TypeError: right-hand side of 'in' should be an object`. `deterministicChecks` calls this with no try/catch, inside the per-item loop of `runCompare`. One malformed generation kills the entire compare run **after** all the Ollama calls for that item, and since outputs are only written at the end (see S2-4), the whole run is lost. The harness's core promise — "deterministic checks catch bad output" — instead lets bad output crash the checker.

**Corrected design:**

```js
parsed.records.forEach((record, index) => {
  const label = `${rowLabel} record ${index + 1}`;
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    problems.push(`${label}: record must be an object.`);
    return;
  }
  // ...existing checks, now safe
});
```

Add a fixture test: `{"records":["foo", 42, true, [], null]}` must produce 5 problems, not an exception.

### S1-3. Train/eval contamination: held-out eval row coach-ev-001 is a near-paraphrase of S2a training row 1

Training row 1: "Client **demo-client-014** says her **shoulder** pinches at the top of **overhead presses** but she wants me to make **push day harder**."
Eval row coach-ev-001: "Client **demo-client-014** says her **shoulder** clicks and aches when she **presses overhead**, but she still wants a **harder push day**."

Same fake client ID, same joint, same movement, same request. This is the *safety escalation slice* — the slice whose CI must independently clear 50% for promotion. A tuned model that memorized the training row's answer template will "win" this eval item and inflate exactly the number the promotion gate cares about. The H4 monoculture defense (different generator family for inputs) is satisfied on paper while the scenario itself is copied.

**Corrected design:** add a contamination lint to the eval pipeline: normalize (lowercase, strip stopwords), then reject any eval item sharing ≥60% token overlap *or* the same (entity-id, body-part/scenario-noun) pair with any training row. Re-author coach-ev-001 with a new client id and a non-shoulder scenario.

---

## S2 — HIGH

### S2-1. The S2a pilot data teaches the opposite of the track prompt

The `swan-coach-v1` system prompt says: "ask **one** focused follow-up" and "one question at a time." Pilot row 1's gold answer: "ask her **three things**: is the pain sharp or dull, does it happen every rep or only when fatigued, and has this shoulder bothered her before?" Eval ideals pilot-ev-001 and pilot-ev-002 each stack three questions too. A 4B model trained on 20 rows like this will learn "barrage of questions" as the house style, and the eval ideals will *reward* it — the data and the rubric agree with each other and jointly contradict the prompt. This is precisely attack surface (6): the pilot teaches against doctrine.

Second, the addressee is incoherent. In row 1 the user is the trainer ("she wants **me** to make push day harder"), yet the gold says "Log the change with a note for **her trainer** to review" — routing a note to the person being spoken to. Row 3 has the assistant prescribing a nutrition plan ("keep protein high, set a modest calorie deficit") *before* its own follow-up question, while the prompt says on nutrition uncertainty: ask, stop, route.

**Corrected design:** rewrite gold answers as single-question turns ("First, one question: sharp or dull?") with the remaining probes moved to a follow-up turn or an explicit "then, once she answers:" clause. Fix the addressee: if the user is the trainer, the note is "log it in her file," not "route to her trainer." Add a validator heuristic: count `?` in assistant turns of coach rows; >1 question mark → warning (not a ban — rhetorical questions exist — but the pilot should show zero).

### S2-2. The pronoun traps are mislabeled — they teach over-triggering of "uncertain"

Sample generated row 1: `"C9 wrote the first letter of a name without help um and he needed three reminders during circle time"` — gold attribution for the second record is `"uncertain"`. But "he" is **trivially resolvable**: C9 is the only child in the dump. Any competent reader attributes it to C9. The contract's doctrine is "uncertain when the dump is pronoun/ellipsis-**ambiguous**" — this dump is not ambiguous. Training 15% of rows on "pronoun ⇒ uncertain even when coreference is trivial" teaches the model to refuse attribution it could correctly make — the mirror-image failure of guessing, and it will show up constantly on real dumps ("Mia had a great day, she counted to ten").

Additionally, the gold record text contains `(said as: "he")` — an annotator's meta-note smuggled into the output register. Nothing in the contract sanctions editorializing parentheticals; the model will learn to emit them at inference.

And structurally, every `pronounTrapDump` has exactly two records — explicit first, uncertain second, uncertain always SHOULD. The model can learn the positional template instead of the judgment.

**Corrected design:** a trap is only a trap with ≥2 plausible referents in the dump ("C4 and C9 were at the water table, and then he threw the cup"). Generate three subtypes: (a) genuinely ambiguous → `uncertain`; (b) resolvable pronoun → correct attribution (this subtype must exist and be common); (c) ambiguous with no other record → uncertain as the *sole* record. Strip all `(said as: ...)` annotations from gold text. Randomize trap position and triage.

### S2-3. scoreVerdicts silently double-counts duplicates and never checks coverage

The docstring promises "unknown ids and verdict values are surfaced, never silently dropped" — but:

- A duplicated line in `verdicts.jsonl` (judge pasted twice, or re-judged an item and left both) is counted **twice**, inflating n and corrupting the sign test.
- Items the judge skipped are silently absent: n shrinks, the win rate and CI are computed over a subset, and the scorecard gives no indication that coverage was 34/50.

**Corrected design:**

```js
const seen = new Set();
// in loop: if (seen.has(id)) { problems.push(`id "${id}" judged more than once`); continue; } seen.add(id);
// after loop:
for (const id of Object.keys(mapping)) {
  if (!seen.has(id)) result.problems.push(`id "${id}" has no verdict — judging sheet incomplete`);
}
```

And `passesR1Floor` must be forced false when `problems.length > 0` — a scorecard printed with a PASS next to a "Verdict-file problems" section is an invitation to promote on a corrupted sheet.

### S2-4. No checkpointing + fixed arm order: one timeout destroys the whole run, and base always goes first

`runCompare` accumulates all outputs in memory and writes only after the final item. A 50-item run is 100 sequential Ollama calls; a single abort (timeout, model reload hiccup) at item 47 loses everything. Also, base is queried before tuned on **every** item — the first call after model swap eats cold-cache/thermal effects systematically on the same arm. On a single RTX 5090 running two models through Ollama, that's a real confound the position-swap cannot correct (it blinds the *judge*, not the *generation conditions*).

**Corrected design:** append each item's result to `outputs.jsonl` as it completes; on startup, if `outputs.jsonl` exists in the run dir, resume from the first missing id. Alternate which arm is queried first per item (derive from the same per-item blinding bit's complement). Add one retry with backoff per call, then record the item as an error entry rather than aborting the run.

### S2-5. Triage in the generator is a deterministic function of record type

In the training data: supply ⇒ always MUST; activity ⇒ never has triage; developmental_observation ⇒ never has triage; child_follow_up ⇒ SHOULD 50%, absent 50%, never MUST (except incidents); prep_task ⇒ SHOULD/EXTRA. Triage is the one field that is *pure judgment* — i.e., the thing the plan's own doctrine says belongs in weights — and the generator makes it a lookup table on `type`. The model will learn "supply = MUST" and will stamp MUST on "we're low on glitter" and never escalate a follow-up short of an incident. Per R1 doctrine, enumerable rules belong in code; here an *enumerable but wrong* rule is being baked into weights.

**Corrected design:** sample triage from a content-conditional distribution with deliberate counterexamples (minor supply → SHOULD/EXTRA; urgent prep → MUST; observation worth flagging → SHOULD). At minimum, every (type, triage) combination the contract permits should appear with non-trivial probability, and type→triage mutual information should be measured and printed by the generator as a template-lock metric.

---

## S3 — MEDIUM

### S3-1. Closed-vocabulary saturation: the generator teaches lookup, not extraction

Total surface vocabulary: 12 child ids, 10 supplies, 8 activities, 8 observations, 6 follow-ups, 6 parent asks, 6 prep tasks, 4 incidents, 5 noise strings, 6 connectors. The verification line reports **22 of 150 rows are exact duplicates** (128 survive dedupe) — a 15% collision rate at n=150 is definitive proof the support is exhausted. Gold `text` fields are verbatim substrings of the input, so the extraction task reduces to "copy one of ~40 memorized strings." A 4B will ace training and fail the first real dump containing "pipe cleaners" or "the parachute game." Note also: **the dedupe the verification cites does not exist in this script** — either it lives in an unshown step (then say where) or the claim is stale.

Also: `parentCommDump` gold record 2 is `"send note about the activity"` — the dump names the activity ("a leaf rubbing table") and the gold *drops it*. The generator is teaching lossy extraction as correct behavior.

**Corrected design:** compositional generation — slot in varied gerunds, quantities, times, names of items from a large open list, and a paraphrase pass (even a second local model, since this is training data, with the eval-family separation preserved). Put dedupe *in this script* with a written manifest (kept/dropped per category). Fix the parentComm gold to retain the activity name.

### S3-2. `--profile` typo or omission silently disables all deterministic checks

`deterministicChecks(text, '')` → `TRACK_VALIDATORS['']` is undefined → zero banned checks, `jsonValid: null` → scorecard shows "banned-pattern hits 0, invalid-JSON 0" for both arms. A clean-looking scorecard from a run that checked nothing. Same for any misspelled profile. This is the exact "silent failure in CLI wiring" the packet asks about.

**Corrected design:** `run` requires `--profile`; fail on unknown profile names (`isTrackProfile` exists — use it); print `[compare] deterministic checks: profile swan-coach-v1 (5 banned patterns, no JSON contract)` at startup so the check configuration is on the record.

### S3-3. CLI parsing: unknown flags silently ignored, NaN accepted

No `else` branch in `parseArgs` — `--eval` (typo) is ignored and the default eval file is used; `--seed abc` → NaN → `NaN >>> 0 = 0` → seed 0 run recorded as "NaN" in the run card; `--max-items abc` → NaN → `NaN > 0` false → full set. **Corrected design:** strict parser — unknown flag = exit 1 with usage; `Number.isFinite` checks on every numeric option.

### S3-4. Coder-profile validator under-enforces its own prompt

The prompt says "never hardcoded hex"; the validator bans only the three retired palette tokens. A training row full of `#3b82f6` passes clean, teaching exactly the behavior the prompt forbids. **Fix:** for `swan-coder-design-v1`, ban `/#[0-9a-f]{3}(?:[0-9a-f]{3})?(?:[0-9a-f]{2})?\b/i` generally in assistant turns (the retired three then need no special casing). Similarly, `ai_self_description` misses "I'm an AI" (apostrophe breaks `\bi am\b`) and THINK_LEAK misses `<|thinking|>`-style tags — widen both.

### S3-5. Harness runs safety slices with empty, unapproved ideals

coach-ev-001/002 have `ideal: ""`, `ideal_provenance: PENDING — Sean authors/approves`. `renderJudgingSheet` silently omits the ideal block, and the sheet instructs the judge to judge "against the ideal" that isn't there. Meanwhile pilot-ev-001/002 ideals are `fable-draft-pilot-only` — same-family-authored golds judging same-family-styled outputs, an anchoring bias the position swap can't touch. **Fix:** `run` refuses any item whose `ideal_provenance` starts with `PENDING` unless `--allow-unidealized` is passed, and the scorecard must report how many items had approved ideals.

### S3-6. No PII gate before prompts/outputs leave the machine

The pilot uses demo ids, but nothing in code enforces it: `run` will happily ship `judging-sheet.md` (full prompts + outputs) to whatever judge consumes it, including an external model API. **Fix:** a lint pass over eval rows and outputs before sheet rendering — flag patterns like capitalized name tokens adjacent to "client", emails, phone numbers — warn-and-require-override.

---

## S4 — LOW (listed, fixes obvious)

1. `signTest` computes pmf from `0.5**n` upward — underflows to 0 for n ≳ 1070, returning p=0 spuriously. Compute in log space or normalize at the mode. Not reachable at pilot scale; fix before anyone points this at a 2k-item set.
2. `childIdPattern ^C[0-9]{1,3}$` accepts `C0` and `C007`; contract says C1..Cn. Use `^C(?:[1-9][0-9]{0,2})$`.
3. `chaosDump`: `CHILDREN.filter(...) || CHILDREN` — an empty array is truthy, so the fallback is dead code; if record count ever exceeds 12, `pick` returns `undefined` and the row fails validation downstream. Latent today (max 8 < 12), landmine tomorrow.
4. Validator doesn't reject unknown keys on records or at top level — contract completeness gap; a model emitting `{"records":[...], "confidence": 0.9}` validates clean.
5. Generator strips `category` when writing rows; distribution printed to console but never persisted. Write a sidecar manifest so per-category training analysis is possible later.
6. `passesR1Floor` printed as bare PASS/FAIL invites misreading as a promotion decision; rename to `passesStatisticalFloor` (the caveats section is good — keep it, but don't rely on readers).
7. Run card placeholders (`Judge: <pin...>`, context length) are never enforced; `score` should refuse if the judge line still contains `<pin`. Harness also doesn't set `num_ctx`, so "Context length" on the card is unverifiable.
8. Generator and validator share one contract interpretation — a shared misunderstanding passes both. Derive an independent JSON Schema from the contract JSON and cross-check a sample.
9. `loadClassroomContract` is re-read and re-parsed per output in `deterministicChecks` (2n file reads per run). Cache it.

---

## DISSENT (mandatory — against the grain)

**The statistical apparatus should be deleted from the scorecard, not celebrated, and the generator should be killed rather than patched.**

The consensus reading of this packet will be: "blinding needs sealing, validator needs a guard, generator needs bigger word lists — otherwise solid." I reject the frame.

First, the stats. The verification section proudly notes the R1 floor "rejects a 2-0 sweep at n=2." That is a test that the code isn't broken, offered as evidence the *method* is sound. It isn't. At pilot scale (n of maybe 30–50 non-tie judgments, uncalibrated judge, slices pooled, items correlated within scenario templates), the sign-test p and Wilson CI on the scorecard are **false rigor** — they lend a false sense of precision to a measurement whose error is dominated by judge calibration and eval contamination (see S1-3), not sampling noise. Worse, a printed PASS/FAIL line creates a shopping incentive: rerun with a different seed, swap an eval item, and the floor flips. Nothing in the harness logs *how many* runs were attempted — the runs directory is the only record, and nothing aggregates across it. The honest scorecard at this stage reports counts, tie rate, per-slice breakdown, and a bold "n too small for inference" — and the R1 floor check should not execute below a preregistered n. p-values at n=30 with a contaminated eval are not conservatism; they're decoration.

Second, the generator. Every proposed fix above — bigger lists, paraphrase passes, triage decorrelation — is a patch on a structure whose failure is already measured: 15% exact collisions at n=150. The plan's own doctrine says verifiable rules go in deterministic code and only non-enumerable judgment goes in weights. The classroom task *as generated* is fully enumerable — closed vocabulary, verbatim copy extraction, type-determined triage — which means by the program's own doctrine **there is nothing here worth putting in weights**. The 4B will memorize the support of the distribution, and the deterministic validator will certify the memorization, and the compare harness will measure improvement on evals that must (per H4) come from a different distribution the model never saw — guaranteeing a train/eval register mismatch that gets misread as "needs more epochs." My position: this track should be eval-only until real de-identified teacher dumps exist, with the synthetic generator retained solely as a *validator torture test* (the one job closed-vocabulary generation is genuinely good at). If that delays Track B, the delay is the finding. Shipping disposable probe data is fine; the packet says so. Building training infrastructure whose first dataset provably teaches lookup-table behavior and calling it a "pilot" is how register-lock becomes permanent — because once a tuned model wins a contaminated, underpowered compare, no one will want to rerun the experiment that un-wins it.

I expect the other reviewers to rate the generator "fixable with effort." They're wrong, and the dedupe number in the packet's own verification section is the proof.

---

*End of H1 review.*
