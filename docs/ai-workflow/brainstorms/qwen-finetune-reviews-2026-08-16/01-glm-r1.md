# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/qwen-two-brains-finetune-plan-2026-08-16.md
**Tokens:** 7668 in / 17586 out (reasoning: 13256) | total 25254
**Wall:** 281.1s

---

# Hostile Review — Three Local Brains Master Plan

Reviewing unlensed, full-spectrum. Findings ranked CRITICAL → HIGH → MEDIUM → LOW. Every finding carries a corrected design. DISSENT at the end, where I break with both the plan and with what I expect the other reviewers to say.

---

## CRITICAL — these invalidate gates, schedules, or the privacy doctrine as written

### C1. The acceptance gates, as specified, can certify noise
The plan's strongest claim — "promoted only if it beats base+best prompt" — is executed on instrumentation that cannot detect the difference it claims to measure.

- Track A: 80 items, with "zero brand-trap failures" resting on **n=10 traps** and "zero safety regressions" on a similarly thin slice. Zero failures in 10 tells you almost nothing (95% CI on the failure rate runs to ~26%).
- Track C: the design-critique gate is **≥7/10 blinded pairs**. A coin-flip model passes that ~17% of the time (P(X≥7|n=10,p=0.5) ≈ 0.17), and any judge with a voice preference pushes it higher. This gate is statistically void.
- The same 80 evals are reused across training iterations. "Tune until it passes" converts a held-out set into a slow training signal. By iteration three you are evaluating memorization of your own eval.
- **Judge circularity:** Fable generates training data, authors the `ideal` answers, and judges. The tuned model will match the judge's stylistic priors by construction. The plan's own Failure #1 ("feels more on-brand while underperforming") is realized *inside the gate itself*.
- No blinding, no position swap, no paired statistics, no seed variance.

**Corrected design:**
1. Blinded pairwise eval with position swap: each item judged twice (A/B and B/A); disagreement after swap = tie. Judge never sees which arm is tuned.
2. Scale: Track A ≥200 scored items plus ≥40 blind pairs; brand traps ≥50; safety probes ≥50. Track C: ≥40 pairs with swap (80 judgments), pass at ≥65% with sign-test p<0.05, **plus** an objective component — 30 critiques of designs with 3–5 *planted defects* each, defect-recall ≥80% or no promotion regardless of preference score.
3. Two-tier eval bank: a rotating pool (resampled per iteration) and a frozen final holdout touched exactly once, at promotion time.
4. Cross-judge panel: GLM-5.3 and Kimi K3 are already paid consults — use them as independent judges. Human (Sean) adjudicates 20% of disagreements.
5. Paired stats (McNemar or exact sign test) with CIs in every scorecard; 2–3 seeds for the final config, promote on the median.
6. Fable may author data. Fable may not be the sole judge.

### C2. Track B trains against an unmeasured binding constraint
The 8-second budget is deferred to S8, *after* dataset build and training. The arithmetic says it may fail before accuracy ever matters: a 400–600-token end-of-day dump on a 4B q4 model needs prefill before a single output token. On iOS/Metal that's plausibly 2–6s; on an Android CPU it's plausibly 8–20s — **over budget before decode starts**. If the budget fails, the target model changes (Qwen3-1.7B, aggressive quant, KV q8), and with it the dataset difficulty, output-length discipline, and gate thresholds. You would be rebuilding 3–5k rows against the wrong model.

**Corrected design:** Split S8 into S8a (baseline, immediately): name the actual device and OS (the plan never does — this is a blocking unknown), run base Qwen3-4B q4 through llama.rn on that hardware, decompose the budget into prefill/decode/JSON-parse, and publish the numbers *before* S5. Decision rule: prefill >4s on target hardware → drop to 1.7B or re-architect (chunked capture, triage-then-extract). S8b (post-training measurement) stays where it is.

### C3. The strongest cheap baseline for Track B is missing: constrained decoding
llama.rn (llama.cpp) supports GBNF grammar-constrained decoding. That means **JSON schema validity is free at runtime** — no training required. The plan's three-way gate (tuned vs base vs rules-only) omits the arm that actually competes: **base 4B + prompt + grammar**. If that arm matches the tune on validity, the tune's entire value must live in content decisions — attribution discipline, triage, hallucination brakes — and the gate must prove that specific delta. Promoting a tune that beats weak baselines while losing to the free one is the most expensive way to discover grammar-constrained decoding exists.

**Corrected design:** Four-arm gate: tuned+grammar / base+prompt+grammar / base+prompt / rules-only. Train with grammar-compatible outputs and pinned stop tokens; report the tuned-vs-base+grammar delta as *the* headline number. Joint gates, not just F1: field-level F1 with a defined record-matching rule for multi-record dumps, attribution accuracy on explicit cases, hallucinated-attribution rate, **and false-"uncertain" rate** (see H6).

### C4. One 5090, two tenants — the plan never allocates VRAM
Hermes serves `qwen3:30b-a3b` q4_K_M ≈ 17–18GB resident. Track A training (8B NF4 ≈ 5–6GB + LoRA + activations at real context) plus Studio's post-smoke-chat residency plus Track A's planned 32k eval context (≈5GB KV at f16) does not co-fit in 32GB. Day one of S3 is an OOM or, worse, silent eviction mid-eval corrupting a scorecard.

**Corrected design:** A VRAM budget table per activity in the plan; a hard rule — *training runs and 32k-context evals require Hermes down, `ollama stop` in the launcher preflight (U4 becomes: check `nvidia-smi` headroom, kill/pause services, refuse to start under threshold)*; eval serving paused during training; Ollama KV q8_0 for Track A's 32k context.

### C5. Stage 2 shadow mode creates an ungoverned client-data store
Stage 2 logs tuned-local answers "alongside production answers" — i.e., real client turns and generated responses accumulating on the 5090 with no stated encryption, retention, access, or purge policy. The plan's privacy doctrine ("Rule 8 becomes an architecture property") is architecture theater if the shadow lane is the new leak. This is the same class of error the plan correctly refuses to make in Track B.

**Corrected design:** Shadow-log spec before S9: encrypted at rest, gitignored, no PII in filenames, auto-purge ≤30 days, access = Sean only, aggregate-only reporting upward, and an explicit Sean-approval gate before shadow mode touches real traffic. Same discipline class as C1-child-data.

---

## HIGH

### H1. Track C's base model probably doesn't exist as described
The plan expects "a dense mid-size coder" from the Qwen3-Coder family. The Qwen3-Coder line is MoE-centric (480B-A35B; 30B-A3B). "Exact size per catalog check" is a deferral with a wrong prior — you'll discover at S1 that the menu is: Qwen2.5-Coder-14B dense (older gen, strong, trains comfortably), Qwen3-Coder-30B-A3B MoE QLoRA (verify Unsloth MoE support; fits in 32GB but slow and unproven on this stack), or general Qwen3-14B with a coder prompt.

**Fix:** Pre-commit the decision tree at S1: (1) if dense Qwen3-Coder ≤14B exists in catalog → it; (2) else Qwen2.5-Coder-14B-Instruct; (3) MoE 30B-A3B QLoRA only after a smoke-train proves VRAM and loss sanity; (4) general Qwen3-14B as fallback with the honest note that coding deltas will be smaller. No Track C dataset work (SC1) until the base is locked.

### H2. Acceptance is measured on a lossy export — quantization confound
You train NF4+fp16-LoRA, then gate on q4_K_M GGUF. Merged-then-quantized adapters can degrade more than the base's own q4_K_M (no imatrix calibration, different quantization path). Promotions and rejections are being decided on an artifact you never trained.

**Fix:** Two-step gate: (1) accept/reject on the merged bf16 (or q8_0) via Ollama; (2) a quant-drop check — q4_K_M must stay within 3 points of bf16 on the same eval, exported with imatrix calibrated on ~100 in-distribution held-out rows. Quant fails → re-export, not re-train.

### H3. Track A: redaction ≠ anonymization
Regex redaction of approved transcripts strips names, not identity — a distinctive situation ("the client who tore her rotator prepping for the wedding") is identifying after name-swap. The plan treats mining approval as an open question (§12 Q5); it's a gate.

**Fix:** Per-row human sign-off on every mined row (Sean approves the row, not the sanitizer); situation genericization (permute load, timeline, injury, demographics) as a builder transform, not an intention; any row that can't be genericized is dropped. Make this U1 profile validation, same as the banned-token rule.

### H4. One generator feeds train and eval — near-duplicate leakage
Track A and C synthetic rows and their eval `ideals` come from the same generator with the same priors. Phrasal overlap across the split inflates every score.

**Fix:** n-gram/embedding dedupe between train and eval pools at build time (reject eval items with >0.6 similarity to any train row); eval items generated in a separate pass with a different prompt persona, or hand-authored; all trap items hand-approved.

### H5. "Contract freeze" is a noun with no artifact
The plan gates Track B on a freeze it never defines. What freezes — JSON shape only? The record taxonomy? MUST/SHOULD/EXTRA semantics? Attribution rules? Any of those mutating post-training is the same wasted run the gate exists to prevent. Also: the Desk harness is being built *now* — is it validated against the frozen artifact, or the provisional one?

**Fix:** The freeze is a versioned deliverable: one JSON Schema + taxonomy definitions + triage + attribution semantics, semver'd, changelog'd, signed off by the classroom R5 owner. Harness re-validated against it (and regenerated if not). Training rows tagged `contract_version`. Post-freeze drift buffer: runtime prompt injects a contract summary, so additive changes ride the prompt and only breaking changes trigger retrain.

### H6. Track B can win its gate by becoming useless
"Strictly lower hallucinated-attribution rate than base" rewards a model that says `uncertain` on everything. The plan never measures false-uncertainty.

**Fix:** Include explicit-attribution negatives (cases where "uncertain" is the *wrong* answer) at ≥20% of the trap slice; gate jointly on attribution accuracy (explicit cases), hallucination rate (ambiguous cases), and over-flag rate. Also: 5% of the multi-record slice should be 9–15-record stress dumps near the 8k context budget, and the generator's language coverage (names, dialect, any bilingual mix in T's actual classroom) must be confirmed with the classroom team rather than invented.

---

## MEDIUM

### M1. §7 accessibility: three of five behaviors don't belong in weights
"No emoji walls," "one question at a time," "3 sets of 10" formatting are deterministic rules — a system prompt enforces them exactly, cheaply, and *editably*. Only plain-language-on-signal and low-vision description need learned judgment. Also missing: contrast pairs (expert user → technical register), without which 120 rows teach register collapse — plain language for everyone.

**Fix:** Cut the slice to ~60 rows on the two judgment behaviors + contrast pairs; move the deterministic three to the runtime prompt. Add deterministic accessibility checks to `compare-tuned.mjs` (readability formula when plain-language is signaled, number-formatting greps). Before Stage 2: a 3-human accessibility test (one screen-reader user, one older adult). Weights aren't validated for accessibility by an LLM judge.

### M2. No forgetting check, no context-switch rows
A behavior/discipline tune can wreck general capability and Track C can learn to refuse *everything* ("just hardcode it" traps → refuses legitimate hardcoding in test fixtures and scripts).

**Fix:** 50-item general-capability canary per track with a regression tolerance (promote only if canary drop <5 points). Track C: add context-switch rows (plain Node script → no styled-components discipline; legitimate hardcoded constants → comply) and contrast them with the refusal traps.

### M3. The "best system prompt" baseline has no procedure
Undefined: who iterates the prompt, for how long, when it's frozen. A lazy prompt softens the gate; an endless one delays it.

**Fix:** Pre-register a prompt budget (e.g., ≤6 variants, ≤4 hours, scored by the same compare script), frozen before training completes. But see DISSENT D5 on parity.

### M4. Qwen3 is a hybrid-reasoning family — thinking mode is unhandled
Training rows, export template, and Ollama/llama.rn chat templates must agree on thinking-mode handling or you get leaked `<think>` blocks in production JSON and coach replies.

**Fix:** Lock non-thinking mode in training data and export template; add a template round-trip smoke test (Studio → GGUF → Ollama → same message, diff); one eval probe per track for leaked reasoning tokens.

### M5. Stage 3's cost paragraph is the weakest analysis in the doc
The $150–500/mo figure is plausible for one rented GPU and irrelevant: no throughput math (concurrent coaches × tokens/s), no failure story (single GPU = single point of failure; the natural fallback — route to a cloud frontier model — *violates the privacy doctrine the stage exists to serve*; the honest degraded mode is local rules), and the "$0 5090 server" is simultaneously the training rig and Sean's desktop. vLLM on a Windows host means WSL2 — a real ops decision, unstated.

**Fix:** Define degraded mode (rules-only, fail-closed, Hermes precedent) before any Stage-3 pricing. Require a concurrency estimate from real SwanStudios traffic as the Stage-3 entry ticket. Until then Stage 3 stays one paragraph.

### M6. Track A's seven slices at 600–1,200 rows is thin everywhere
Seven behavior families × ~100 rows each, one epoch, ~50–70 optimizer steps. Expect underfit. "Watch loss" is not an instrument.

**Fix:** Consolidate to 4 slices (merge voice/brand + operator style; merge refusals into safety) *or* accept 1,500+ rows after run-1 eval names the weak behaviors. Checkpoint per epoch and eval each checkpoint — promote the best checkpoint, not the last. For Track B's scaffolding-memorization tell (§5.5), make it measurable: split loss into schema-token vs content-token components; schema-token loss → 0 while content loss stays high = diversify templates.

---

## LOW

- **L1.** Banned-string greps are context-blind: a client asking "is this yoga?" must be answerable. Grep = alarm; judge = scorer; ban applies to self-description, not acknowledgment.
- **L2.** Dataset cards (generator, prompt, seed, date, contract_version) to match run cards; one-line license note (Qwen3 Apache-2.0 — commercial use clean).
- **L3.** Model registry: versioned Modelfile tags, a "current brain" pointer, and one-command rollback to the previous promoted model. Absent from the plan entirely.

---

# DISSENT

Where I refuse the consensus I expect to form:

**D1. On synthetic-only (Track B): the plan is right for the wrong reason, and the coming "fixes" are wrong.** Reviewers will attack the synthetic-only law as a data-quality weakness and propose privacy-tech escapes (on-device LoRA, federated anything, "anonymized" real dumps). All wrong. Even with C1 repealed, real dumps are a distribution of *one teacher in one classroom* — training on them overfits T's idiolect and bake in her blind spots. The binding constraint is n=1, not privacy tech. Synthetic-only stands; the real risks are generator homogeneity (H4) and over-flagging (H6), both gate problems, not data-law problems.

**D2. On row counts: the pile-on will be "600 is too small, generate 5k." I dissent.** Small-and-clean before eval evidence is the *correct* doctrine; mass-generating synthetic behavior rows before run 1's scorecard names the weak slices recreates the slop problem the playbook exists to prevent. The eval apparatus (C1) is the bottleneck. Fix the gates, not the row count.

**D3. Track C should not survive this review as scheduled work.** Other reviewers will audit Track C in good faith — base model (H1), gate math (C1) — and leave it in the schedule with patches. Wrong call. It's a mid-session addition with a base model that may not exist, a statistically void promotion gate, and a subjective-judging core. Demote to a design document until Track A ships end-to-end. False symmetry with A and B ("same acceptance law") is the plan's framing error: A and B have objective-ish gates; C has taste.

**D4. §7 contradicts the plan's own Lesson 3.** The plan exiles brand tokens from weights because "facts mutate, weights don't migrate" — then loads accessibility *rules* (deterministic, editable, certain to evolve with WCAG and product voice) into weights as its headline novelty. By the plan's own logic, three of the five §7 behaviors belong in the prompt. Accessibility-in-weights is partly a fine-tune costume worn by prompt engineering.

**D5. Against expected reviewer demand for prompt parity in the gate.** Someone will argue the tuned model deserves its own best-prompt iteration for fairness. No. If the tune needs a bespoke prompt to beat base+best-prompt, the prompt is doing the work and the tune is cargo. The conservative asymmetry is the point of the gate. My fixes to the gate (C1) are about *measurement*, not about relaxing its direction.

**D6. Stage 3 is dead; stop decorating it.** Expect reviewers to engage the cost model seriously. I won't: at any plausible SwanStudios traffic, an 8B assist lane never justifies 24/7 rented GPU plus HA plus the ops surface, and the escalation path to frontier models is load-bearing by the plan's own admission. The end-state is the 5090 plus paid frontier for ambiguity, for years. Everything past Stage 2 should be one paragraph and a decision gate that expects to answer "no."

**One-line verdict:** The factory, sequencing logic, and privacy instincts are sound; the gates as instrumented cannot support the decisions they've been assigned, Track B is aimed at an unmeasured constraint, and Track C shouldn't be on the schedule yet.
