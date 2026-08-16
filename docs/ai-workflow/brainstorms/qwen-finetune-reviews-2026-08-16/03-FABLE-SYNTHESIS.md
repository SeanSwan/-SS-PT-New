# Round 1 — GLM 5.3 + Kimi K3 hostile review: Fable synthesis

**Date:** 2026-08-16 · Unlensed, full-spectrum, DISSENT-mandatory · **Cost:** GLM $0 (subscription, 281s, 17,586 out) + Kimi **$0.1684** (258s, 9,689 out)
**Target:** `../qwen-two-brains-finetune-plan-2026-08-16.md` (three-track version, commit `41df84580`)
**Replies:** `01-glm-r1.md` · `02-kimi-r1.md`

## 0. Headline

**Both models, independently, destroyed the measurement layer while ratifying the strategy.** The convergent verdict: the factory, the sequencing logic, the contract-freeze instinct, the synthetic-only child-data law, and tokens-out-of-weights all survive; **every acceptance gate as I specified it was statistically incapable of detecting the failure it exists to catch.** The ≥7/10 blinded gate passes a coin-flip model ~17% of the time — both models computed the same number without seeing each other. My gates were slot machines wearing lab coats.

Second convergent kill: **I scheduled the cheapest, most decision-lethal measurement (base Qwen3-4B latency on T's actual phone) *after* the two expensive slices it should gate.** The tune cannot change latency; the base model + quant + hardware determine it; it can be measured this week for $0.

## 1. Verified findings — I checked each against the plan text myself

| # | Finding | Found by | My verdict |
|---|---|---|---|
| V1 | Gates statistically void (n=80/n=10 zero-tolerance/≥7-of-10 ≈ p 0.17 under null) | both, independently, same math | **CONFIRMED** — binomial arithmetic checks |
| V2 | Judge circularity: one model family generates train rows, authors eval `ideal`s (provenance unspecified in §3.3 — true), and judges | both | **CONFIRMED** |
| V3 | 8s on-device budget sequenced at S8, after S5/S6 spend; plan never names T's device/OS | both | **CONFIRMED** — and classroom R5 records the phone as Android 14, which the plan omitted |
| V4 | Missing baseline arm: llama.cpp GBNF grammar-constrained decoding makes JSON validity free at runtime; four-arm gate required | GLM | **CONFIRMED** capability; adopted |
| V5 | VRAM co-tenancy never budgeted: Hermes `qwen3:30b-a3b` holds ~25GB resident of 32GB (memory record — worse than GLM's 17–18GB estimate); training + 32k eval cannot co-fit | GLM | **CONFIRMED** — day-one OOM without a preflight |
| V6 | Stage-2 shadow logging writes client context to the training workstation, ungoverned — violates the plan's own doctrine | both | **CONFIRMED** |
| V7 | Contract "freeze" has no artifact (no versioned schema, no hash pinning, no harness re-validation) | both | **CONFIRMED** |
| V8 | Track C correction rows would name retired Galaxy-Swan tokens in training data — teaching the palette to forbid it | Kimi | **CONFIRMED** self-own in §4-C.3 |
| V9 | Enumerable rules (banned strings, TTS numbers, MUI, css``) trained into weights when a deterministic inference-time guard layer is strictly better | both | **CONFIRMED** — doctrine extension: *verifiable rules in code; judgment in weights* |
| V10 | Qwen3-Coder line is MoE-centric; "dense mid-size coder" prior likely wrong; need a pre-committed base decision tree | GLM | **CONFIRMED** per known family shape; verify at catalog |
| V11 | Quantization confound: gating on q4_K_M export tests an artifact never trained; need bf16 gate + quant-drop check (±3 pts, imatrix) | GLM | **CONFIRMED** |
| V12 | "Strictly lower hallucinated-attribution than base" is gameable by answering `uncertain` always; false-uncertain rate unmeasured | GLM (Kimi adjacent) | **CONFIRMED** |
| V13 | DPO signal thrown away: failure corrections are chosen/rejected pairs, flattened to SFT; vault playbook's DPO taxonomy unused | Kimi | **CONFIRMED** |
| V14 | T can dictate dumps about *fictional* children in her real voice — privacy-legal register capture the synthetic-only law does not forbid; crown-jewel dev/eval corpus | Kimi | **CONFIRMED** — compatible with the law (eval/dev only, never train) |
| V15 | Qwen3 hybrid thinking-mode: `<think>` leakage into production JSON/coach replies unless template locked + round-trip smoke test | GLM | **CONFIRMED** risk |
| V16 | §10 said FIRED while §11's heading still said "staged, not fired" — contradiction I introduced when marking the round fired mid-session | Kimi | **CONFIRMED** — my assembly error, same class as my classroom-R5 packet error |
| V17 | Redaction ≠ anonymization for mined transcripts; distinctive situations identify after name-swap; per-row human sign-off required | GLM | **CONFIRMED** |
| V18 | Accessibility slice: 3 of 5 behaviors are deterministic render/prompt rules; no accessibility eval existed; "accessible by default" overclaim | both | **CONFIRMED** — slice cut to judgment behaviors + contrast pairs, eval added |

## 2. Where the two models disagree — and my rulings

1. **Track C's fate.** GLM (D3): demote to design doc until Track A ships — taste-gated, base uncertain, mid-session addition. Kimi (2.3): run the cheap base+context baseline first and pre-register a kill criterion (≥80% of rubric ceiling → shrink to DPO-only or kill). **Ruling: both.** Track C is demoted from scheduled dataset work to *design + one cheap experiment*: SC0 (base+context baseline on the 100-eval set) runs any time; SC1/SC2 are blocked on (a) Track A shipped end-to-end AND (b) SC0 showing real headroom. Sean directed Track C to exist; it exists as a gated bet, not scheduled work.
2. **Stage 3.** GLM (D6): dead for years, stop decorating; 5090 + paid frontier for ambiguity is the end-state. Kimi (3.6): costs low-balled, workstation-as-server unexamined. **Ruling: GLM's frame adopted** — Stage 3 collapses to a single decision-gate paragraph that expects "no"; Kimi's workstation/availability critique becomes Stage-2 entry criteria.
3. **Row counts.** Both *pre-dissented against the other* attacking dataset size, and both landed the same place: size is fine; provenance monoculture is the problem. **Ruling:** counts stand; multi-generator + dedupe + human-authored eval ideals are the fix (V2, H4).
4. **Prompt parity.** GLM (D5): the tune gets no bespoke prompt — asymmetry is the gate's point. Kimi (1.1): the baseline prompt must be dev-tuned and frozen with stated provenance. **Ruling: both, no tension** — baseline prompt gets a pre-registered budget (≤6 variants, ≤4h, dev-set only, frozen before training ends); tuned arm runs bare.

## 3. Binding amendments (R1) — applied to the plan as a supersession block

1. **Eval layer rebuilt (V1/V2):** dev/frozen-eval split; Track A ≥200 paired prompts, ≥50 brand traps, ≥50 safety probes; blinded pairwise with position swap; paired stats (sign test/McNemar) + bootstrap CI in every scorecard; promotion = win ≥58% AND CI>50% overall AND on the safety slice; Track C (if ever unblocked) ≥30–40 pairs at ≥20/30 (p≈0.05) + planted-defect recall ≥80%; eval ideals for safety/voice = Sean-authored/approved 100%; eval inputs from a different model family than train-row generator; n-gram dedupe train↔eval (>0.6 similarity rejected); judge pinned (model+version+rubric hash) + ≥25-judgment human audit per run, <80% Sean-agreement → rubric rebuilt; cross-judge on disagreements; canary set (50 general-capability items, <5-pt drop) per track.
2. **S8a immediately (V3):** measure base Qwen3-4B (+1.7B fallback) q4 via llama.rn on T's actual phone (Android 14) — prefill/decode/parse decomposition, cold+warm, 3 quant levels — **before S5.** Prefill >4s → re-target (1.7B / chunked capture / triage-then-extract).
3. **Four-arm Track B gate (V4/V12):** tuned+grammar / base+prompt+grammar / base+prompt / rules-only; headline = tuned-vs-base+grammar delta; joint gates: field-F1 under a pre-registered record-matching spec, explicit-attribution accuracy, hallucinated-attribution ≤1% absolute, false-uncertain rate with ≥20% explicit-attribution negatives in traps; 9–15-record stress dumps at ~5% of the slice; on-device eval by T on her real dumps is a **promotion gate**, not an option.
4. **VRAM law (V5):** per-activity VRAM budget table; launcher preflight (U4) checks `nvidia-smi` headroom, stops/pauses Ollama-Hermes before training or 32k evals, refuses to start under threshold.
5. **Shadow-log spec (V6):** redacted at write time by the existing sanitizer, encrypted at rest, gitignored vault, no PII in filenames, ≤30-day auto-purge, Sean-only access, aggregate-only reporting, explicit Sean gate before real traffic. Stage-2 entry additionally requires the availability/security paragraph (workstation reality: Windows Update, daily-driver, 575W).
6. **Freeze artifact (V7):** freeze = versioned JSON Schema + taxonomy + triage + attribution semantics, semver + hash; `classroom-extract` profile refuses to build against any other hash; harness re-validated against the frozen version; rows tagged `contract_version`; additive drift rides the runtime prompt, breaking drift triggers regen of affected slices only.
7. **Guard layer (V8/V9):** deterministic inference-time filter (banned strings, hex-vs-token lint, MUI import check, TTS-number rewriter, retired-token blocklist) built once in the serving path; correction rows reference retired tokens **abstractly only** — forbidden artifacts never appear in assistant turns; weights keep only non-enumerable judgment.
8. **Track C re-gated (ruling 1):** SC0 baseline experiment added; SC1/SC2 blocked on Track A shipping + SC0 headroom; base-model decision tree pre-committed (dense Qwen3-Coder ≤14B → else Qwen2.5-Coder-14B-Instruct → MoE 30B-A3B only after smoke-train → generalist Qwen3-14B last); regression traps ≥40.
9. **DPO phase 2 (V13):** per track, failure-correction pairs preserved as chosen/rejected; ORPO/DPO pass after SFT v1, same eval gate.
10. **T-voice corpus (V14):** T dictates fictional-children dumps on her device; text exported; used as dev/eval crown jewel, never trained.
11. **Promotion mechanics (V11/V15 + registry):** accept/reject on merged bf16; q4_K_M must hold within 3 pts (imatrix-calibrated); thinking-mode locked non-thinking in data + template with a Studio→GGUF→Ollama round-trip smoke test + leaked-`<think>` probe; versioned Modelfile registry with champion/challenger tags and one-command rollback (folds into U5/U6).
12. **Mined-transcript gate (V17):** per-row Sean sign-off + situation genericization as a builder transform; un-genericizable rows dropped. (§12 Q5 is hereby a gate, not a question.)
13. **Accessibility slice (V18):** cut to ~60 rows (plain-language-on-signal, low-vision description) + expert-register contrast pairs; deterministic behaviors move to the runtime prompt + `compare-tuned.mjs` checks (readability formula, number-format greps); 30-prompt accessibility eval added; human accessibility test (screen-reader user, older adult) before Stage 2.
14. **Program-level metrics (Kimi program gap):** each track declares what promotion *buys* (Track A: privacy architecture + cost/interaction; Track B: T's review minutes saved at ≤1% hallucination; Track C: reviewer-quality per watt) in its run card, so the program can't succeed at the wrong thing.

## 4. Dissents kept on the record (not adopted as amendments, but binding context)

- **Kimi D3:** Track B is highest-value *conditional on the human review loop being solved* — a better extractor feeding a bulk-accepting reviewer counts a hallucinated world more efficiently. Carried into Track B's framing.
- **Kimi D5 / GLM D5-adjacent:** "design judgment in weights" is really *taste-distillation with a shelf life*; expect Track C to need retraining more often than its siblings.
- **GLM D1:** even without the privacy law, real-dump training would overfit one teacher's idiolect — the binding constraint is n=1, not privacy tech. The synthetic-only law is doubly right.
- **GLM D6:** Stage 3 expects "no" at any plausible traffic. The end-state for years is 5090 + paid frontier for ambiguity.

## 5. Calibration

| Model | Cost | Convergent criticals | Unique verified value | Disproven/overreached |
|---|---|---|---|---|
| **GLM 5.3** | $0.00 | V1 V2 V3 V6 V7 V9 | grammar-decoding arm (V4), VRAM co-tenancy (V5), quant confound (V11), false-uncertain gaming (V12), thinking-mode leak (V15), redaction≠anonymization (V17), base-model decision tree (V10) | VRAM estimate low (17–18GB vs ~25GB actual — direction right, magnitude short) |
| **Kimi K3** | $0.1684 | V1 V2 V3 V6 V7 V9 | judge-circularity framing sharpest (V2), T-voice fictional corpus (V14), DPO-signal-thrown-away (V13), retired-token self-own (V8), §10/§11 contradiction (V16), program-level metric gap | none found on verification |

Six criticals found independently by both models with matching arithmetic. Neither needed a lens. Round 1 is **dry-worthy on convergence**; no round 2 planned unless the amended plan changes materially. $0.17 total spend.
