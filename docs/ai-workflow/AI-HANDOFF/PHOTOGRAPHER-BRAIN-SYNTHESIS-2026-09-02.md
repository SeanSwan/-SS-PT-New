---
decision: "Photographer Brain — synthesis of GLM 5.3 + GLM 5.3-flash consults into a single build direction; the product is the decision layer + audit trail, not a Topaz wrapper"
status: open
supersedes: none
---

# Photographer Brain — Consult Synthesis (SWA-233)

**Date:** 2026-09-02
**Sources:** `PHOTOGRAPHER-BRAIN-GLM-53.md` (25,840 out / 17,357 reasoning / 796s),
`PHOTOGRAPHER-BRAIN-GLM-53-FLASH.md` (19,804 out / 12,083 reasoning / 570s).
Both served the requested model (no substitution), both complete (no truncation).
**Packet:** `docs/ai-workflow/brainstorms/photographer-brain-consult-2026-09-02.md`

> Both replies are **input, not verdict** (Rule 30). Everything below marked
> `[VERIFIED]` was checked in-session by me; everything marked `[CONSULT]` is
> their claim, unverified.

---

## 0. What I verified against their `[UNSURE]` flags

| Claim | Both models said | What I found |
|---|---|---|
| Topaz Photo AI CLI controllability | Both flagged `[UNSURE]`; flash asserted its auto mode is "an unauditable black box… you can't tell it hit SNR 32 dB and stop" and recommended defaulting to the **open** path | **`[VERIFIED]` — partly wrong.** `tpai` exposes per-parameter flags including `--denoise_strength`, `--sharpen_model`, `--upscaling_factor`, plus `--parallel_jobs`, `--backup_originals`, `--preserve_structure`, `--dry_run`. A third-party Python wrapper (`topyaz`) documents the surface better than Topaz does. Topaz **is** pinnable per-image → flash's core objection is weakened, though "granularity may not reach SNR-target precision" stands until spiked. ⚠️ Do not confuse with `topaz.sh` — that is Aserto's authorization CLI, an unrelated product |
| Pratik Naik's YouTube volume | flash: `[UNSURE]`; 5.3: High | **`[VERIFIED]`** — own channel, 752k views on one skin-retouching video, 55k on advanced hair retouching. 5.3 was right; flash was over-cautious |
| Cullen Kelly as color-doctrine authority | Both: High | **`[VERIFIED]`** — active channel, 100k / 66k / 48k view range on grading-doctrine videos |
| A YouTube authority on grading **darker skin tones** | **Both refused to name one**, explicitly flagged the gap rather than inventing | Not verified — **treat as a real corpus gap.** Both independently recommend building the locus ground truth *from measured images across Fitzpatrick I–VI*, not from one personality. Two models refusing to invent the same name is strong signal the gap is real |

---

## 1. Where they agree (high confidence — build on this)

1. **~80% feasible; a human owns the last 20% indefinitely.** Framing that survives contact with reality: *"an automated senior first-pass with an audit trail,"* never *"an automated final."*
2. **The ceiling is INTENT and IDENTITY, not measurement or execution.** Is this dark frame mood or mistake? Are these under-eyes a lighting artifact or this person's face? Neither is a pixel question. Every diagnosis needs an escape clause and a defer path.
3. **The machine already beats an average working pro** on: WB under mixed light, ISO-corroborated denoise params, output-sharpening math, raw-headroom clipping calls, and — by a wide margin — **batch consistency across a 200–400 frame set** (humans drift from fatigue; machines don't).
4. **"Do nothing" must be a first-class legal edit.** Without it the system is Lightroom Auto with extra steps. Both name this independently.
5. **Operation order is near-identical** and is where artifacts are born (see §3).
6. **Never average expert taste.** Route to ONE school/persona per project; personalise *within* it. Averaging manufactures exactly the mediocre look being avoided.
7. **Corpus → retrieval context at decision time** (both picked option (b) independently). Not a rule base (combinatorial explosion, brittle), not fine-tuning (transcripts have no input→output pixel pairs — you'd train on hallucinated supervision).
8. **Eye-bag doctrine is identical:** reduce ≤ ~35–50% of measured ΔL*, **luminance-only dodge inside the tear-trough polygon, zero high-frequency smoothing, never blur, never clone, never generative-fill.** Blurring *volume* (actual puffiness) is the instant-fake read. **Catchlights are protected pixels** — killing them kills likeness.
9. **The verifier is the product, and Goodharting it is the top risk.** A metric-weak naturalness check means every other layer amplifies failure and ships the plastic look behind a green dashboard.
10. **A golden eval set is missing from the brief entirely** — both flagged this unprompted as the single most under-specified thing.
11. **Same stack**, essentially: rawpy/LibRaw + RawTherapee CLI, InsightFace (detect + ArcFace identity), BiSeNet face-parsing, MediaPipe FaceMesh (tear-trough polygons), SAM2, MODNet, NAFNet/Restormer, local Qwen2.5-VL, pgvector in the existing Postgres, Node → Python worker.
12. **Topaz is not the product.** It is three nodes in a DAG. The defensible thing is the decision layer + audit trail.

---

## 2. Where they conflict (Sean decides)

| # | Conflict | 5.3 | flash | My call |
|---|---|---|---|---|
| C1 | **Grain position** | Step 12 — grain **after** sharpening, matched to measured input σ (±30%) | "Output sharpen strictly last; anything after sharpening creates halos" | **5.3 is right.** Grain is additive noise, not a contrast operation — it cannot create halos. Flash's "strictly last" rule is over-broad. Sharpen last *among contrast ops*, then grain |
| C2 | **Topaz posture** | In the pipeline; wins on high-ISO chroma noise + **motion deblur** (no good open equivalent) | Default open path; Topaz **opt-in only** for motion blur and big upscales | My `[VERIFIED]` finding weakens flash's premise (params *are* pinnable). Lean 5.3, but keep flash's discipline: **every Topaz output goes through the verifier afterward**, because its autopilot can violate the caps |
| C3 | **VLM size** | Qwen2.5-VL-**32B** AWQ (~20GB) | Qwen2.5-VL-**7B**, 72B optional | Start 7B. 32B contends with Topaz for VRAM and the VLM is not being asked for parameters anyway — only genre confirmation, rationale text, and a rubric check |
| C4 | **Label source** | Explicit pairwise A/B on variants of the same raw | **Implicit:** at client volume nobody clicks A/B — harvest Sean's *own corrections* in Lightroom as a parameter diff = labeled negative per op | **flash wins decisively.** This is the best single insight in either document. Explicit pairwise for hard/tie cases only |
| C5 | **Set coherence priority** | Slice 6 | First-class, not slice 9 — "clients perceive set coherence more than any single-image brilliance" | **flash's reasoning is stronger** even though its own build order contradicts it (it lists set coherence as slice 9). A single image is the wrong unit of analysis for a working photographer's actual deliverable |
| C6 | **Personalisation volume** | ~50 coarse / ~300 usable / ~1000+ conditional | ~150–300 measurable / ~500 stable | Compatible ranges; both are estimates. Plan for ~300 before expecting anything |

---

## 3. The operation order (merged — this is the load-bearing part)

Each stage consumes information produced by earlier stages and **destroys information needed by later ones**. Order violations are where artifacts are born.

1. **Intent gate** — scene class, ambiguity check. May exit here with "do nothing" or escalate to Sean.
2. **Geometric / optical** (lens profile, straighten, CA) — all masks and measurements assume rectified geometry.
3. **White balance** (scene-referred, linear) — casts bias every downstream mask and curve.
4. **Raw exposure / highlight recovery** — recovery only works pre-tone-curve; after it, clipped is clipped.
5. **Denoise** — *before* any tone stretching. Lifting shadows first amplifies noise into structures the denoiser then "protects." And sharpened noise becomes permanent structure.
6. **Global tone** (filmic/sigmoid — protects highlights without the HDR look).
7. **Global color grade** — grade depends on the finished luminance distribution; skin hue shifts under tone moves, so protect skin *after* tone settles.
8. **Local tone shaping** (subject relight, background pull) — deltas relative to the finished global base.
9. **Cleanup heal** (dust, blemish, distractions via LaMa) — after denoise (healing noise patches fails), before smoothing.
10. **Skin: frequency separation + low-frequency corrections** — including the eye-bag dodge.
11. **Eye / lash / brow detail** — local, capped, catchlights protected.
12. **Upscale (≤2× portraits), then output-size sharpening** — never sharpen then resize.
13. **Grain** — restores the texture statistics denoise destroyed, matched to measured input σ.
14. **Verify → repair ladder** (max 2 bounded loops), then deliver + audit log.

---

## 4. The naturalness verifier (merged metric set)

Ratios are engine-independent and authoritative; slider-unit caps are Lightroom-approximate and must be recalibrated per engine.

| Signature | Pass | Reject |
|---|---|---|
| Skin pore-band energy retained (3–8px band-pass, skin mask, after/before) | ≥ 0.65 | < 0.5 |
| Skin chroma variance (plastic tell) — σ(hue) in skin | ≥ ~4° | < 2–3° |
| Halo / gradient sign-reversal within 3px of strong edges | none beyond original's own count | any new reversal > 3–5% of edge step |
| Local:global contrast ratio (HDR tell) | ≤ 1.4× input | > 1.6× |
| Background:subject sharpness ratio (flattened-DoF tell) | preserved within −30% | bg approaches subject |
| Sclera median L* | below scene white, a* ≥ ~6 | ≥ scene white, or a* < 6 = dead white |
| **Noise-floor flatness** (flash, unique) | Poisson σ-vs-luminance slope preserved | flat curve at high ISO = machine tell → re-inject grain |
| Tear-trough HF energy retained | ≥ 0.9 | < 0.8 |
| Identity — ArcFace cosine(before, after) | above empirically calibrated floor | significant drop → revert |

Three layers, not one: **(1)** the deterministic metric vector above → auto-dialback ladder at strengths `[1.0, 0.7, 0.5, 0.3]`; **(2)** a small trained artifact discriminator bootstrapped from parameter-sweep overprocessing of ~200 natural gold images; **(3)** a **paid monthly pro audit panel** — 30 images, blind A/B against Sean's manual edit and a deliberately-overcooked decoy. *Without (3) the verifier Goodharts and the project quietly ships the AI look.* Budget it from day one.

---

## 5. The best insight in either document

**5.3, unprompted:** *the corpus priority in the brief is inverted.*

> YouTube pros define the **professional envelope** — caps, orders, doctrine. **Sean's own 26 years of keepers are the taste ground truth**: smaller, pixel-attached, and already proven learnable by his existing taste-brain system. Mine his archive first; YouTube calibrates the bounds, his catalog personalises within them.

Paired with flash's reframe: *"Kill the phrase 'brain of a top photographer.' The corpus reaches educators who talk on camera, not the best working retouchers. What's being built is a grounded, self-checking decision system with personas — which is better, because it's auditable and it converges on Sean rather than on the average of YouTube's algorithm."*

**Corollary neither states outright:** transcripts are performative and hindsight-biased ("I'm just going to…" hides 40 undo steps) and carry **zero pixels**. Their real value is **negative rules** — "don't pull clarity here" — which flash correctly notes are higher-signal than actions, and which map directly onto the caps table.

---

## 6. Correctness points that must not be lost

- **Never chase an absolute skin L\* target across skin tones — it whitens dark skin.** Measure relative to *this capture's* baseline. Use **ITA°** (Individual Typology Angle) to classify skin into bands and set per-band targets (flash's contribution; 5.3 states the failure mode). Both land on the same requirement from opposite directions.
- **Three different things live under the eye** and need different treatment: periorbital *shadow* from overhead light (lighting artifact, may reduce ~50%); structural *tear trough* (anatomy — reduce its shadow ≤30%, never its geometry); *pseudoherniation* (actual volume — **do not blur; blurring volume is the instant-fake read**).
- **Never auto-remove moles, scars, or freckles.** Temporary lesions only, ≤1.5% face area. Everything else is identity and ethics — flag for human.
- **Generative pixels on faces: OFF by default.** GFPGAN/CodeFormer are the #1 source of the AI look. If ever enabled, fidelity weight ≤0.2 and human-flagged.
- **Conflict is signal, not noise** (flash): rules where ≥3 independent experts agree → the **constitution** (universal technical floor). Rules where experts contradict → a **style axis** (contrast posture, saturation posture, warmth bias, retouch aggressiveness). The style axes *are* the personalisation dimensions. Constitution clamps; taste moves inside it, never through it.
- **Magnitude calibration trick** (5.3): educators who *say numbers* ("shadows +20") calibrate the lexical buckets ("a touch" ≈ ≤10% of range) for the ones who don't. Build the lexicon **per-speaker**, not global.
- **Emit Adobe `.xmp`** as a first-class output so results round-trip into Lightroom. This is how Imagen AI and Aftershoot actually deliver, and it is what pro peers will accept.

---

## 7. Market calibration `[CONSULT]`

5.3: Imagen AI, Aftershoot, Retouch4me, and Evoto already exist, and none of them clear "top pro" — they clear **"competent junior."** That is the empirical ceiling calibration, not a reason not to build. The differentiator available here is the **audit trail + convergence on one person's taste**, which none of them offer.

---

## 8. Merged build order

**Spike 0 (week 1, before anything else) — the two things that can kill this:**
- **0a.** Topaz `tpai` strength controllability end-to-end on 20 diverse raws. `[VERIFIED]` the flags exist; unverified whether granularity reaches SNR-target precision. ~2 hours to answer.
- **0b.** Manual retouch prototype on 10 faces — hand-set tear-trough dodge, measure ΔL* before/after, validate the target band against Sean's own hand edits. **This is the riskiest path in the whole product** (flash), because "same person, but subtly wrong" is the one failure a photographer audience never forgives.

1. **Measurement + diagnosis only, no editing** ("image doctor"). Raw in → measurements JSON + plain-English diagnosis. **Done when:** on 20 images Sean knows cold, diagnosis matches his read on the 5 core axes ≥16/20, < 5s/image. *Visible value in days.*
2. **Constitution auto-grade** — WB, exposure, clipping, lens/geometry, denoise under caps → 16-bit TIFF + `.xmp`. **Done when:** blind A/B beats Lightroom Auto ≥ 60% on 100 real images. **Ship the change-memo UI here, not last** (flash) — the memo is what makes personalisation, rule grounding, and trust possible.
3. **Verifier v1** wired to the dialback ladder. **Done when:** injected over-processing (clarity +40, skin blur) is caught and auto-reduced; clean edits pass ≥95%.
4. **Sean's own archive mined first** (5.3's inversion) — his keepers are the taste ground truth.
5. **Corpus v0** — 10 channels → extraction schema → 300+ snippets → grounding evals. **Done when:** ≥50 constitution candidates with ≥2 independent sources; ≥20 pass grounding.
6. **Retouch path v1** (post-0b) — face parsing, tear-trough doctrine, caps, ArcFace guard. **Done when:** 10 before/afters rated *"same person, better rested"* ≥8/10 by Sean.
7. **Personalisation loop** — implicit labels from Sean's Lightroom corrections (C4) + style axes.
8. **Set coherence** — promoted per C5.

---

## 9. Failure modes (merged; flash's #3 is the one 5.3 missed)

1. **The last-20% tar pit.** Weeks 1–6 feel like magic; then the queue is 90% unique edge cases, pass rate plateaus ~75%, and it becomes the auto-button it was built to replace. *Month-1 sign:* fix queue dominated by categories never seen twice; rule additions stop moving the pass rate.
2. **Goodhart on naturalness.** Verifier passes what pros reject (thresholds tuned on one skin type / one lighting family); ships the AI look with green dashboards. *Month-1 sign:* verifier-vs-Sean's-judgment disagreement > 20%, or hand-patching thresholds more than weekly.
3. **Orchestration tax** *(flash only — and the most likely real killer)*. The brain is 10% of the work; gluing raw dev, masks, Topaz, ComfyUI, queue and UI is 90%. Latency lands at minutes per image, field cases (backlit, low light, groups) need manual rescue, Sean misses a deadline and goes back to 3 minutes in Lightroom. *Month-1 sign:* week 3, end-to-end single-image time > 2 min with no downward trend; more hours debugging Topaz flags than tuning taste.
4. **Taste mud.** Mined rules averaged across contradictory schools → 2016-Instagram mediocrity, indistinguishable from a preset pack. *Month-1 sign:* school configs fail to reproduce their namesake looks; contradictions on identical conditions > 30%.

---

## 10. Legal `[CONSULT — unverified, needs review before commercial use]`

- **FLUX.1-dev weights are non-commercial.** SDXL-inpaint is the safe default.
- **Some InsightFace model variants are research-only.**
- **YouTube ToS on bulk transcript storage and reuse.** Mining transcripts into internal rules is one thing; redistributing mined rules as product content is another. Decide the line before the corpus exists.

---

## Sources

- [topyaz · PyPI](https://pypi.org/project/topyaz/)
- [twardoch/topyaz · GitHub](https://github.com/twardoch/topyaz)
- [CLI settings for Topaz Photo AI — Topaz Community](https://community.topazlabs.com/t/cli-settings-for-topaz-photo-ai/44642)
- [Command Line — documented options? — Topaz Community](https://community.topazlabs.com/t/command-line-documented-options/64122)
