# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/qwen-finetune-reviews-2026-08-16/04-PACKET-SLICES-H1.md
**Tokens:** 11851 in / 17615 out (reasoning: 13850) | total 29466
**Wall:** 272.7s

---

# Hostile Implementation Review — Round H1

**Verdict: the harness produces evidence-shaped artifacts, not evidence.** The blinding is reconstructible by design, the promotion gate passes 4–0 sweeps, and the eval set is contaminated by the training set. Individual functions are clean; the composition is not. Findings ranked.

---

## SEVERITY 1 — promotion-path and blinding breakers

### H1-1. The blinding is arithmetic, not secrecy — the judge can recompute the mapping without opening anything
`buildBlindedPairs` draws left/right from `mulberry32(seed)`, one draw per item, **in item order**. Three facts combine:

1. The judging sheet preserves item order and ids.
2. `mulberry32` lives in the repo.
3. `renderRunCard` writes `Blinding seed: ${meta.seed}` into `run-card.md` — a file the judge is never told not to open — and the default seed is the constant `42`.

So the "sealed" mapping is `buildBlindedPairs(items, 42).mapping` — a one-line script away, no forbidden files involved. Worse: because the draw sequence depends only on seed and position, **every run with the default seed and the same item count has the identical left/right pattern.** A judge who legitimately learns one post-hoc unblinding now knows every future default-seeded run. The `DO NOT open mapping.json` warning is security theater.

**Corrected design:** generate the seed from `crypto.randomBytes(4)` at run time; store it **only** in `mapping.json`; write `sha256(mapping.json)` into the run card as a commitment instead of the seed; shuffle pair display order with a second CSPRNG draw so sheet order ≠ draw order. Reproducibility of the *sheet* is a nice-to-have; blinding is doctrine. A sealed seed still gives you post-hoc reproducibility for audits, which is the only time you need it.

### H1-2. The run directory unblinds itself
Next to `judging-sheet.md` sit `outputs.jsonl` (cleartext `base:`/`tuned:` fields per item) and `checks.json` (per-arm banned-pattern and invalid-JSON counts). The judge is warned about exactly one of the three files. If base emits an invalid-JSON count of 7 and one side of item 4 is malformed JSON, the arms are identified. The honor system is applied to one file while its neighbors publish the answer.

**Corrected design:** write everything arm-labeled (`outputs.jsonl`, `checks.json`, `mapping.json`) into `runDir/sealed/`; write only the sheet, run card, and a `sealed-manifest.sha256` at the top level. Or relabel arms `armA`/`armB` everywhere except inside `sealed/`.

### H1-3. The R1 floor promotes 4–0 and 5–0 sweeps; it never consults its own p-value; partial verdict sheets score silently
`passesR1Floor = n > 0 && winRate >= 0.58 && ci.low > 0.5`. At `wins=4, n=4`: Wilson low = (1.4802 − 0.4801)/1.9604 ≈ **0.510 > 0.5 → PASS**. Same for 5–0. Your verification "floor rejects a 2–0 sweep" tested the one boundary that was never in danger. Compounding this:

- `scoreVerdicts` flags *unknown* ids but never flags **missing** ids (items in the mapping with no verdict) or **duplicate** ids (double-counted). A quarter-judged sheet silently shrinks n — which is exactly how you get to a 4–0 pass.
- An empty `verdicts.jsonl` scores to all-zeros and `scoreRun` returns **exit 0**.
- `stats.p` is computed, printed, and then ignored by the gate.

**Corrected design:** `passesR1Floor` requires `n >= 30` (matching your own ≥25 calibration doctrine), `p < 0.05`, CI low > 0.5, win ≥ 58%, and a tie rate cap (ties/(total) ≤ 0.4, else "judgment under-powered"). `scoreVerdicts` must diff verdict ids against mapping ids and fail loudly on missing/duplicate; zero verdicts = hard error; if `problems.length > 0`, the scorecard must print `R1 floor: INCOMPLETE — verdict file defective`, never `PASS` (currently a typo-ridden subset can write a PASS card to disk and only the exit code complains).

### H1-4. Train/eval contamination in the shipped samples: the held-out eval reuses a training entity AND scenario
S2a training row 1: *"demo-client-014 says her shoulder pinches at the top of overhead presses but she wants me to make push day harder."*
Held-out eval `coach-ev-001`: *"Client demo-client-014 says her shoulder clicks and aches when she presses overhead, but she still wants a harder push day tomorrow."*

Same client id, same joint, same "wants harder despite pain" frame — in a row labeled `ideal_provenance: "different family per R1/H4"`. GLM was evidently seeded from the S2a rows. Every number produced on this eval is contaminated. This is the pilot data teaching something that contradicts the plan's own doctrine, in the exact spot the doctrine is loudest.

**Corrected design:** add a contamination gate to `runCompare`: hash/similarity-screen eval inputs against the training set (entity-id match = automatic reject; token-overlap threshold for the rest), refuse to run otherwise. Entity ids (`demo-client-###`) must be partitioned across train/eval by construction, not by hope.

### H1-5. Template poverty is already measured and being ignored: 22/150 dedupe casualties
Your own verification line — "150 rows generated, 128 survive dedupe" — is the review finding. A generator that collides 15% of the time at n=150 has a combinatorially dead space. Specifics:

- `noiseDump` has **five** possible outputs. 11 noise draws from 5 strings guarantees duplicates.
- `microDump` supply branch: `add: need ${s}` — 10 possible rows. Micro obs: 12×8. Parent-comm record 2 is the **constant string** `'send note about the activity'` across all parent_comm rows.
- Canonicalization tells a 4B will nail and then over-apply: supply text is always `need X` (never "we're almost out of X" normalized some other way), activity text always article-stripped by regex, incident text always suffixed `— family informed at pickup`, trap follow-ups always carry `(said as: "...")`.
- **Pronoun⇒uncertain is taught as a lexical invariant.** Every pronoun_trap row (a) contains exactly one ambiguous record, (b) always places it after an explicit-child record, (c) always resolves to `uncertain` — including for `"C9 wrote the letter… um and he needed three reminders"`, where discourse resolution to C9 is near-certain. The model will learn *pronoun → uncertain* and also *uncertain only appears when another named child is present*. There are zero pronoun-only dumps and zero legitimately-resolvable anaphora in the data. The contract's "uncertain preferred over a wrong guess" is a judgment rule; you've compiled it into a regex.

**Corrected design:** (1) expand the grammar compositionally — child name pools, quantifiers ("two more glue sticks"), hedges, typos, sentence-splitting noise; (2) add a `dedupe_rate` assertion in `main()` — if collisions exceed 1% at target count, exit 1 ("expand grammar, don't dedupe harder"); (3) add pronoun-only variants and a `resolvable_anaphora` category where gold attribution IS the child and the dump makes it unambiguous ("C4's mom — she asked about lunch"), so the model learns the *discrimination*, not the token; (4) write down the extraction-normalization canon (verbatim span? canonical form? provenance quote?) in the contract or a generator doc — right now each category has a different silent canon and no validator can check any of them.

---

## SEVERITY 2 — real defects, fix before next slice

**H2-1. Pilot gold contradicts the pinned system prompt.** S2a row 1: *"ask her three things: sharp or dull, every rep or fatigued, bothered before?"* The `swan-coach-v1` prompt: *"ask one focused follow-up … one question at a time."* Training data teaches the model the prompt is negotiable. No validator can catch semantic drift, so the reconciliation must be editorial: either the gold becomes staged single questions, or the prompt becomes "at most three tightly-scoped screening questions in one message." Pick one; today the 4B gets both.

**H2-2. Silent truncation is being judged.** `chatOnce` never sets `num_ctx` (Ollama default is small) and never inspects `done_reason`. A context-truncated answer enters the sheet as a model failure when it's a config failure — and it fails asymmetrically if one arm is chattier. Fix: pass explicit `num_ctx`, surface `done_reason === 'length'` per item into `checks.json`, and refuse to blind items where either arm truncated (re-run them).

**H2-3. `--profile` typos silently disable all checks.** `deterministicChecks(text, opts.profile)` with an unknown profile returns `{hits: [], jsonValid: null}` and the run card happily records the typo'd profile. Same for `validateExamplesForProfile`'s "unknown profiles validate clean by design." One missing `-v1` and the entire deterministic-checks story evaporates with exit 0. Fix: `runCompare` errors if `opts.profile && !isTrackProfile(opts.profile)`; the profile name should come from a validated enum in both tools.

**H2-4. Mid-run data loss.** `runCompare` accumulates outputs in memory and writes files only after the last item. A timeout or malformed row (`row.input` as a string → `promptTextOf` throws `.map is not a function`) at item 40/50 destroys the whole run's outputs. Fix: append each completed item to `outputs.jsonl` immediately; wrap per-item I/O; validate row shape at load time.

**H2-5. Stale-verdict poisoning on dir reuse.** `--out-dir` into an existing directory keeps the old `verdicts.jsonl`; `score` then scores old verdicts against the new mapping — plausible-looking garbage. Fix: refuse a non-empty run dir unless `--force` (which archives prior verdicts).

**H2-6. `checks.json`/scorecard race on problems** — covered in H1-3, but note the artifact-level fix: `scorecard.md` with `problems` present must not contain the string `PASS`.

**H2-7. PENDING ideals still steer judging.** `renderJudgingSheet` includes `pair.ideal` unconditionally; `ideal_provenance: "PENDING — Sean authors/approves"` is never read by the harness. Per R1, safety+voice ideals are 100% Sean; the harness will happily judge against Fable-draft ideals with no marker on the sheet. Fix: sheet renders `ideal_provenance` beside every ideal; `scoreRun` warns (or refuses, for `safety_*` slices) when PENDING ideals were used.

**H2-8. `chaosDump` has a live landmine wearing a dead fallback.** `pick(rand, CHILDREN.filter((c) => !used.has(c)) || CHILDREN)` — an empty array is truthy, so `|| CHILDREN` can never fire. When the filter empties (reachable the moment anyone raises the record count past 12, since `used.add(child)` burns an id even on supply/prep/activity records), `child` is `undefined`, the dump reads "undefined stacked nine blocks," and `JSON.stringify` silently drops the `attribution` key, producing a mislabeled "generator bug" crash instead of the intended fallback. Fix: `const avail = CHILDREN.filter(c => !used.has(c)); const child = avail.length ? pick(rand, avail) : null;` and skip child-bearing kinds when null. Also: `used.add` only for kinds that actually use the child.

**H2-9. Dataset lineage is unpersisted.** The written JSONL strips `category`, and the seed exists only in a console line. After external dedupe (your 128), nobody can recompute per-category survival from the artifact — and the dedupe report is exactly where H1-5's evidence lives. Fix: sidecar manifest (`seed`, `count`, `distribution`, per-row category) next to the data, gitignored with it.

**H2-10. Triage supervision is noise.** Micro prep is always `SHOULD`; chaos prep is `SHOULD|EXTRA` 40% of the time, absent otherwise; chaos follow-ups are `SHOULD` 50%. Identical content, inconsistent labels — the model learns triage is unpredictable and will either ignore it or key on dump length. Pick a canon (what makes a prep MUST vs SHOULD?) and encode it; if triage is genuinely judgment, say so and drop it from synthetic gold.

---

## SEVERITY 3 — minor, batched

- `--seed garbage` → `NaN >>> 0` = 0 → silent seed 0; `--max-items garbage` → NaN → silently all rows; `--evals` as last arg → `undefined` path. Validate numerics; fail on `NaN`.
- `renderJudgingSheet` fences with ``` — a coach answer containing fences corrupts the sheet structure. Use 4-backtick fences or indented blocks.
- Duplicate eval `row.id`s silently collide in `mapping` (last wins) and double-count verdicts. Assert uniqueness at load.
- Header comment says `score` "updates the run card"; it never does — `Result:` stays "pending" forever. Either implement or delete the claim.
- No guard for `--base` == `--tuned` (degenerate run scores fine).
- Empty-string model outputs aren't counted anywhere; judge sees a blank cell with no flag.
- Contract validator gaps (surface 3): doesn't reject unknown keys inside records, doesn't reject extra top-level keys (`{"records":[], "summary":...}` passes), no record-count sanity cap, no record-ordering canon (generator preserves dump order; the contract is silent — judges and dedupe both need this pinned).
- `THINK_LEAK` misses `<thinking>`/`</thinking>` variants emitted by several current models.
- Second-collision stamp windows: two runs in one second into default path overwrite. Append a counter or `process.pid`.
- Confirm `agent-tuning-local/runs/` is actually gitignored — mapping/outputs are derived from gitignored data but are themselves new artifacts; if the ignore pattern only covers `raw/`/`evals/`, eval content leaks into git.

---

## DISSENT

1. **I dissent from preserving seeded sheet reproducibility at all.** Any reviewer arguing "keep mulberry32 + seed for reproducibility, just hide the seed better" is optimizing a convenience against the program's central claim. A CSPRNG seed sealed in `mapping.json` gives full post-hoc reproducibility for audits. There is no legitimate pre-unblind reason to reproduce a sheet. Cut it.
2. **I dissent from reading "128 survive dedupe" as hygiene working.** Dedupe surviving is not a filter succeeding; it is the generator failing at a rate you can measure. The correct response is a collision-rate gate that fails the build, not a quieter dedupe.
3. **I pre-emptively dissent from the likely peer finding that the `swan-coach-v1` system prompt "names forbidden artifacts" (yoga, meditation) in violation of doctrine.** The doctrine bans forbidden artifacts in *assistant turns of training rows*; system prompts are inference-time and must be able to state prohibitions. That finding would be noise; H2-1 (gold contradicting the prompt) is the real defect in that neighborhood.
4. **I dissent from leaving judge calibration as scorecard prose.** "≥25 sampled judgments, ≥80% agreement" printed under "Caveats" is a promise with no enforcement path. Either wire it (a `calibration.jsonl` the scorer verifies before computing `passesR1Floor`) or delete the line — caveats that can't fail a run are how promotion theater starts.
5. **I dissent from any impulse to soften H1-4 because the eval rows are "just GLM-authored placeholders."** They are the only eval inputs in the packet, they carry the R1/H4 provenance badge, and one is a near-verbatim training scenario. The gate belongs in the harness precisely so placeholder data can't sneak through when nobody's watching.

Bottom line: fix H1-1 through H1-5 before another row of anything is generated. The unit tests passing was never in question — every one of these failures lives in the seams between the modules that tested green.
