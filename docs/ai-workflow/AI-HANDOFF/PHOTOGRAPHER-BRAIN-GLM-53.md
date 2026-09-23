# GLM Consult

**Requested:** `glm-5.3`
**Served:** `glm-5.3`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 2752 in / 25840 out (reasoning: 17357) | total 28592
**Wall:** 795.7s

---

## VERDICT
Real at ~80%: a bounded-genre "strong first-pass retoucher with consistent taste" is buildable on this hardware this year, and the existing taste-loop architecture transfers. The ceiling is not measurement or execution — it's **intent** (what this specific image is *for*) and **identity calls** (feature-vs-flaw on a human face), which no current model makes reliably; a human stays on the last 20% indefinitely. The single biggest risk is **Goodhart on the naturalness verifier**: if the "would a pro notice" check is metric-weak, every other layer amplifies failure and ships the plastic look with a green dashboard. Also, be honest about the market evidence: Imagen AI, Aftershoot, Retouch4me, and Evoto already exist and none of them clear "top pro" — they clear "competent junior." That's your empirical ceiling calibration, not a reason not to build.

---

## Q1 FEASIBILITY

| Decision class | Machine today | vs. avg working pro | vs. top pro |
|---|---|---|---|
| WB / exposure / cast correction to measured neutral | Better | Better | Comparable |
| Noise estimation → denoise params | Better (σ estimation doesn't fatigue) | Better | Comparable |
| Batch consistency (200-image wedding, one skin-tone anchor) | **Far better** | Better | Better — pros fail at this from fatigue |
| Dust spots, CA, vignette, horizon, lens correction | Better (near-solved) | Better | Comparable |
| Tone placement (face vs background separation, specular protection) | ~Equal | Comparable | Worse |
| Skin retouch amount per feature | Worse | Worse | Much worse |
| Color grade *intent* (mood, palette identity, brand fit) | Not available | Worse | Much worse |
| Feature-vs-flaw calls (scar, freckles, character wrinkle, tear trough depth) | Not available | Worse | Much worse |
| "When to do nothing" | Poor — will always edit | Comparable | Worse |

**The ceiling, precisely:** the machine is a *measurer and executor*, not a *taster*. It can be taught professional *enforcement* (caps, orders, consistency, verification) — that's deterministic engineering. It cannot be taught professional *judgment about purpose*: whether this gray flat sky should stay moody or be lifted; whether this client's under-eyes are a lighting artifact or their face; whether this frame is the campaign hero or a filler. Those stay human. The product framing that survives contact with reality: **"an automated senior first-pass with an audit trail," never "an automated final."**

Decisions a machine already beats an average pro on: objective cast detection (pros eyeball WB; gray-world + deep-prior agreement with ΔE confidence beats eyeballing), ISO-corroborated noise param selection, blink/blur technical culling, cross-set color anchoring, remembering a 26-year taste profile without drift.

---

## Q2 DECISION ARCHITECTURE

**Pipeline:** `raw → measure → diagnose → plan (ordered, capped, provenance-tagged) → execute (raw stage → raster stage) → verify → repair ladder → deliver + audit log`. Two-pass execution is mandatory: raw-stage global ops render a 16-bit TIFF, pixel ops (Topaz/retouch) run on that TIFF, a final grade trim can follow.

### Measurement layer

Everything below is computed before any decision. Output is a versioned JSON (`measurements@v1`) persisted per image.

| Domain | Method / tool | Fields |
|---|---|---|
| True clipping | Raw histogram pre-demosaic (rawpy/libraw) — JPEG histograms lie by ~0.3 EV | `clip_hl_pct, clip_sh_pct` per channel |
| Exposure | Median L*, p5/p95, midpoint placement, EXIF ExposureBias | `ev_offset_subject, ev_offset_scene` |
| White balance | Gray-world + white-patch + gamut-mapping (Forsyth); agreement = confidence, disagreement = "ambiguous light" flag; deep option: Afifi et al. Deep White-Balance Editing | `illuminant_K, tint, cast_vector ΔE00, confidence` |
| Colorimetry | OKLab / CIELAB via `colour-science`; k=5 palette clusters | `palette[], gamut_edge_dist` |
| Skin | InsightFace/RetinaFace detect + 106-pt landmarks; MediaPipe iris; BiSeNet face-parsing (CelebAMask-HQ) → skin/sclera/lip/brow/hair masks | `skin_pct_frame, skin_centroid a*b*, skin_L_med, skin chroma σ` |
| Skin locus check | Distance of skin centroid to per-Fitzpatrick locus (a* ≈ 8–28, b* ≈ 12–35 across types — **approximate, calibrate from own corpus**) | `skin_locus_ΔE00, hue_rot_deg` |
| Face vs scene | Face L* vs scene midtone; subject/background L & chroma distance via SAM2/Depth-Anything-v2 subject mask | `subj_bg_separation_stops` |
| Eyes | Sclera L*, sclera b*, catchlight present/count, iris L* | `sclera_L, iris_L` |
| Noise | Immerkær σ in flat patches; separate luminance vs chroma (a*b* σ in skin flats); plot vs luminance; corroborate with EXIF ISO + per-camera prior | `σ_lum, σ_chroma vs L curve` |
| Blur | Per-region Laplacian energy; FFT smear axis (linear = motion, isotropic = defocus); subject:bg gradient-energy ratio (the DoF tell) | `blur_type, sharp_ratio` |
| Specular/hotspots | L>245 & low-sat % per face region | `forehead_hotspot_pct` |
| Scene/genre | SigLIP zero-shot over candidate labels + embedding as retrieval key | `genre, genre_scores` |
| Optics | lensfunpy lookup per lens: expected CA/vignette/distortion | prior corrections |
| Metadata | ISO, ss, aperture, flash, body, lens | feeds noise/DoF/flash priors |
| Already-processed check | Saturation histogram shape, 8-bit banding on gradients | `double_process_flag` |
| Portrait gate | If face skin < ~2% of frame → portrait rules off | boolean |

### Diagnosis layer
Measurements become typed claims: `{claim, evidence, confidence, severity 0–3, candidate_ops[]}`.

| Measurement → | Diagnosis (examples) |
|---|---|
| Face median L* 0.7 EV below zone target (relative to *this capture's* baseline, **not an absolute skin-brightness target — never chase absolute skin L* across skin tones, it whitens dark skin**) | "subject underexposed ~0.7 EV" |
| Cast vector ΔE00 ≈ 6 toward green, illuminant ambiguous | "green cast consistent with fluorescent bounce (med conf)" |
| Subject/bg separation −1.3 stops, bg brighter | "subject sinks into background" |
| σ_lum ≈ 6/255 in face shadows @ ISO 6400 prior | "ISO-6400-class luminance noise, chroma-dominant" |
| Forehead specular 1.8% of face | "hotspots" |
| Skin locus ΔE00 4.5 toward red | "skin off-locus toward red" |
| Linear FFT smear, 15° | "camera motion ~8 px" (→ Sharpen-type op, not NR) |

Severity drives ordering and the "do nothing" escape: if no claim ≥ severity 1, plan = pass-through. **The ability to not edit is a feature most auto-systems lack.**

### Prescription layer (with operation ORDER and why)

Plan object = ordered ops, each `{op, params, cap_binds, school_provenance, grounding_score}`. Order is fixed; only params vary:

1. **Geometric** (rotate, crop, lens via lensfun) — changes the sampling grid; everything downstream assumes it.
2. **WB** — all hue/skin-locus logic assumes a neutral illuminant reference.
3. **Raw exposure/gain** — anchor the midtone before contrast; also feeds NR (NR needs exposure-stable data).
4. **Denoise** (Topaz or open, on linear/16-bit data) — *before* sharpening, always: sharpened noise becomes permanent structure.
5. **Global tone/contrast** (filmic/sigmoid tone mapping to protect highlights without the HDR look) — contrast on the anchored midtone.
6. **Global color grade** (palette move, split-tone, LUT at low opacity) — grade depends on final luminance distribution, so after tone.
7. **Local tone shaping** (subject relight, background pull, gradients) — local deltas relative to finished global base.
8. **Cleanup heal** (dust, blemish, distractions via LaMa) — after NR (healing noise patches fails), before smoothing.
9. **Skin: frequency separation + low-freq corrections** — after color, at output-relevant resolution; smoothing must not shift grade.
10. **Eye/lash/brow detail** — after skin; local, capped.
11. **Upscale (if any) then output-size sharpening** — sharpening is sized to output; never sharpen then resize.
12. **Grain** — last, restores texture statistics destroyed by NR/smoothing; matched to measured input noise σ (±30%).

Justification in one line each above; the general principle: **each stage consumes information produced by earlier stages and destroys information needed by later ones — order violations are where artifacts are born** (sharpen→NR locks noise; grade→NR misreads noise as texture; skin→upscale smooths at the wrong scale).

### Execution layer

| Op class | Engine | Note |
|---|---|---|
| Raw develop (WB, exposure, tone, grade) | **RawTherapee CLI with generated .pp3 profiles** (plain text, stable, template-able) or darktable-cli + generated .xmp. Full-control alternative: rawpy → linear float TIFF → numpy/colour-science curves. | Darktable sidecar generation is fiddly; pp3 is the cleaner automation surface. Also emit **Adobe .xmp** as an output format so results round-trip into Lightroom — this is how Imagen/Aftershoot deliver, and it's what pro peers will actually accept. |
| Denoise / motion & defocus deblur / upscale | **Topaz Photo AI CLI (`tpai`) / Gigapixel CLI**, watched-folder pattern | Verify current flag surface before relying on it — historically the CLI exposes autopilot + limited toggles, not per-image fine params [UNSURE on exact 2025 flag set]. Where fine control is needed and unavailable → open substitutes via ComfyUI: NAFNet/Restormer/SwinIR (denoise), Real-ESRGAN / 4x-UltraSharp (upscale). Topaz still genuinely wins on high-ISO chroma noise and *motion deblur* (open equivalents are weak). |
| Segmentation / masks | SAM2 + BiSeNet face-parsing + MediaPipe iris landmarks + Depth Anything v2 + rembg | All local, all fit trivially in VRAM. |
| Healing / distractions | LaMa (big-lama) via IOPaint headless server | Excellent on spots/wires/exit signs; never inside face identity zones without flag. |
| FS / D&B / curves | numpy + scipy on 16-bit TIFF (deterministic, auditable, no service dependency) | This is your own code — good. D&B via luminance-masked curve layers. |
| Face "recovery" | **GFPGAN/CodeFormer exist but default OFF.** Cap fidelity weight ≤ 0.2 if ever enabled; verify identity (below). | Face restoration models are the #1 source of the AI look. |

### Self-critique / stopping rule
Every op is parameterized by strength `s ∈ [0,1]`. After execution the verifier (Q3) computes its metric vector on the output. Repair ladder:

```
for s in [1.0, 0.7, 0.5, 0.3]: render raster-stage ops at s → if verify(s): accept
else: drop offending op, re-run, flag image for human review
```
Plus an **improvement floor**: if predicted perceptual delta < human JND (ΔE00 < 1.0, contrast delta < 2%), skip the op entirely. Raw-stage ops only re-run if the failing metric implicates them (e.g., new clipping). Every decision is logged: the audit trail is the product.

---

## Q3 NATURALNESS GUARDRAILS

### Measurable over-processing signatures

| Signature | Computation | Natural / pass | Reject |
|---|---|---|---|
| Skin pore-band energy loss | RMS of 3–8 px band-pass (wavelet/FFT) in skin regions, after/before | ≥ 0.65 | < 0.5 |
| FFT slope flattening | 1/f^α slope change in 8–32 px band on skin | ≤ 25% change | > 40% |
| Skin chroma variance collapse (plastic) | std(a*,b*) after/before in skin | ≥ 0.6 | < 0.4 |
| Unnatural skin chroma | mean C*ab and hue shift vs input | ΔC ≤ +10%, Δh ≤ ±2° | C* > ~32 [approx], Δh > ±4° |
| Halo / gradient reversal at edges | L* profile perpendicular to strong edges; look for overshoot ring and negative lobe on smooth side | overshoot ≤ 1.3× plateau | bright ring or dark lobe > 2 L* beyond edge |
| Local/global contrast inflation (HDR tell) | ratio RMS(∇L, 8px) / std(L, 64px) vs input | ≤ 1.4× | > 1.6× |
| "Everything equally sharp" | subject:bg gradient-energy ratio vs input ratio | ratio preserved within −30% | bg sharpness approaches subject (flattened DoF) |
| Sclera luminance | sclera mask median L* | ≤ ~86 [approx] | ≥ ~90 or b* < 3 (dead white) |
| Watercolor texture loss | HF retention in foliage/hair/fabric regions | ≥ 0.55 | < 0.45 |
| Jaw/hair rim ghost | luminance band 1–3 px outside subject mask after local contrast | none detectable | band ΔL > 3 |
| Tear-trough HF loss | HF energy in trough mask after/before | ≥ 0.9 | < 0.8 |
| Identity drift | ArcFace cosine(before, after) vs same-identity baseline | ≥ ~0.95× of self-similarity baseline | significant drop [absolute values embedding-version-dependent — calibrate] |

All thresholds are calibratable constants in one config file; the *ratios* are engine-independent truth, the slider-unit caps below are not.

### Hard caps table (operation | safe range | never exceed | why)

| Operation | Safe | Never exceed | Why |
|---|---|---|---|
| Auto global exposure (raw) | ±1.0 EV | ±1.5 EV | Beyond = capture error; needs HDR merge, not grading |
| Shadow lift | ≤ +1.0 EV portrait | +2.0 EV | Noise + flatness; the HDR read |
| Highlight pull | ≤ −1.0 EV | never take catchlight/specular below ~240/255 | Dead eyes; plastic sheen |
| Midtone gamma | 0.9–1.15 | 0.85–1.25 | Outside = tone-mapped look |
| Clarity/local contrast (portrait) | ≤ +10 Lr-units | +20 | Halos + exaggerated pores |
| Dehaze | ≤ +10 | +20 | Halo + orange skin |
| Global saturation | ≤ +8 | +15 | Gamut clip; fake |
| Skin chroma lift | ≤ +10% rel. | +20% | Sunburn read |
| Skin hue rotation | ≤ ±2° | ±4° | Health/race shift — identity adjacent |
| WB aesthetic warmth | ≤ +300K portrait | +500K | Fake golden hour |
| FS blur radius | ~0.15–0.3% of image height at output res | 0.5% | Watercolor |
| HF retention during smoothing | ≥ 70% | < 60% = reject | Plastic |
| Blemish auto-removal | temporary lesions only, ≤ 1.5% face area | **never auto-remove moles/scars/freckles — flag for human** | Identity + ethics |
| Eye-bag depth reduction | ≤ 35% | 50% (human-approved only) | Identity loss (see doctrine) |
| D&B cumulative on face | ±0.4 EV | ±1.0 EV | "Relit" face read |
| Iris brighten | ≤ +0.5 EV | +0.8 EV | Demon eyes |
| Sclera brighten | ≤ +0.3 EV, keep b* ≥ 3 | never pure white | Chiclet/dead read |
| Teeth yellow reduction (b*) | ≤ 40% | 60%; keep b* ≥ 4 | Chiclets |
| USM sharpen (portrait, output-size) | amount ≤ 120%, radius 0.6–1.2 px, threshold 2–4 | 200% | Crunch; iris-ring artifacts |
| Topaz Sharpen strength | ≤ 40/100 [approx] | 60 | Halo generation |
| Topaz Denoise strength | σ-derived, ≤ 50/100 [approx] | 75 | Chroma smearing → watercolor |
| Upscale | ≤ 2× | 4× (print only) | Invented texture |
| Generative pixels on faces | **off by default** | CodeFormer ≤ 0.2 fidelity, human-flagged | The AI look, identity |
| Liquify | off by default | ≤ 2% displacement | Ethics + identity |
| Added grain | 8–16 Lr-units, matched to measured σ loss | 30 | Simulated-noise weirdness |

*Units are Lightroom/darktable-approximate; recalibrate each engine on a test chart. Ratios and energy metrics above are unit-free and authoritative.*

### Identity preservation / eye-bag doctrine

The most dangerous op in the product. Doctrine:

1. **Attribute cause before treating.** Three different things live under the eye: (a) *periorbital shadow* from overhead/narrow light — lighting artifact, may be reduced up to ~50%; (b) *structural tear trough* — anatomy, reduce ≤ 30%, and only its *shadow*, never its geometry; (c) *pseudoherniation (actual puffiness)* — volume, **do not blur; blurring volume is the instant-fake read**. Only reduce the small cast shadow *under* the bulge, slightly.
2. **Technique:** frequency-separate; treat **only the low-frequency luminance dip** of the trough — dodge it with a feathered, low-opacity soft-light pass, ≤ 35% depth reduction. **Zero high-frequency smoothing in the trough.** Preserve the medial→lateral gradient (the natural fade). Never clone, never heal the crease itself.
3. **Reduce, never remove.** If the trough shadow reads at 100% depth, target 65–70%. The lid–cheek junction shadow is what makes a face read as a skull with volume; delete it and you get the filler face.
4. **Machine honesty:** cause attribution (lighting vs anatomy) requires light-direction estimation and is unreliable → default to the conservative 30% cap and offer a human-confirm gate for anything deeper. Also never touch periorbital area if face is small in frame (< ~600 px face height) — the detail isn't there to work with; upscaling first doesn't create honest texture.

### The "would a pro notice" verifier

Concrete, buildable, three layers:

1. **Metric vector** (the table above), computed per region at 100%-zoom-equivalent sampling. Any red → auto-dial-back ladder (Q2). This is the primary gate; it's deterministic, fast (<2 s on 5090), and regression-testable.
2. **Trained artifact discriminator.** Bootstrap: take 200 natural gold images, generate overprocessed versions via parameter sweeps (smoothing ×5 levels, clarity ×5, Topaz strengths ×5, upscale+oversharpen), train a small ResNet18 binary natural/overprocessed. Calibrate threshold so the false-negative rate on ~200 **pro-labeled** pairs (pay 2–3 working photographers for one labeling day) is < 10%. Retrain quarterly. This catches what hand-written metrics miss; it will drift, hence the human panel.
3. **Monthly pro audit, paid.** 30 images, blind A/B (system vs. Sean's manual edit vs. deliberately-overcooked decoy), "which was machine-edited?" If pros detect the machine edit > ~35% of the time on non-hero images, thresholds are wrong. **Without this panel, the verifier Goodharts and the project quietly ships the AI look.** Budget it from day one.

---

## Q4 DISTILLING THE PHOTOGRAPHERS

Adversarial note first: **the corpus is worth less than the brief implies.** Teaching narration is performative, hindsight-biased ("I'm just going to…" hides the 40 undo steps), and carries **zero pixels**. It's a rule-mining source for *caps, orders, and rationales* — which is genuinely valuable — not a source of executable parameter policy. Treat it accordingly.

### Who (named, with their authority domain)

| Name / channel | Authority on | Confidence |
|---|---|---|
| Pratik Naik (Solstice Retouch) | High-end commercial portrait retouch; skin philosophy, "don't blur," eye-bag restraint | High |
| Peter Coulson | Fashion/portrait, opinionated natural-skin doctrine, moody grades | High |
| Natalia Taffarel | World-class dodge & burn / light-shaping retouch theory (much content via Retouching Academy rather than her own channel) | Medium |
| Piximperfect (Unmesh Dinda) | Canonical *technique* (FS, D&B, curves mechanics); huge structured corpus; educator, not campaign-level taste — weight lower for taste | High (as source) |
| Phlearn (Aaron Nace) | Same class as above: technique bounds, param demonstrations | High (as source) |
| Lindsay Adler | Commercial portraiture genre conventions, corrective color, skin across tones | High |
| Calvin Hollywood | Portrait D&B and European high-contrast grade school | High |
| Michael Woloszynowicz (Vibrant Shot) | Color grading + retouch integration (older corpus, still excellent) | High |
| Joey L. | Cinematic/commercial color, moody environmental portrait | Medium (older tutorials) |
| Cullen Kelly | Grading *doctrine* (density, don't-crush, protect contrast) — colorist not photographer, exactly the taste discipline needed | High |
| Waqas Qazi | Pro colorist craft, skin-tone placement, film emulation | High |
| Pye Jirsa / SLR Lounge | Wedding/event volume workflow, cross-set consistency doctrine | High |
| Nigel Danson, Thomas Heaton | Landscape grading *with explicit restraint rationale* ("subtle is better") — gold for naturalness caps | High |
| Daniel Kordan, Michael Shainblum | Technical landscape/astro grading walkthroughs | High |
| Manny Ortiz | Simple explicit default rules for portrait speedlight work | High |
| Irene Rudnyk | Styled feminine portrait grade/retouch walkthroughs | Medium |
| Dani Diamond | Natural-light portrait, minimal-retouch skin doctrine | Medium |
| Jake Hicks | Gelled portrait color, skin-tone-on-color doctrine (mostly paid courses) | Medium |
| Frank Doorhof | Calibration/measurement-first workflow (gray target, color management) — feeds the measurement layer's worldview | High |
| Sean Tucker, Ted Forbes | Taste philosophy, not slider-level — schema seed only | High (as philosophy) |
| Chris Tarantino, Sef McCullough | Beauty/commercial retouch legends — mostly paid-course presence | Low [UNSURE on free YouTube depth] |
| **Authority on grading darker skin tones via YouTube** | — | **[UNSURE — I will not invent a name.]** Mitigate: mine Adler's darker-skin episodes + Retouching Academy material, and build the locus ground truth *from data* (curated images across Fitzpatrick I–VI measured in Lab), not from one personality. |

### Extraction schema

Structured record per teaching moment (LLM structuring pass over transcript windows, keyed to timestamps):

```json
{
  "id": "…", "photographer": "Pratik Naik", "video": "…", "t_start": 842, "t_end": 897,
  "authority_tags": ["retouch:portrait"], "genre_context": "beauty, studio",
  "condition": {"raw_predicate": "tear_trough_shadow_depth>med", "spoken": "her under-eyes are distracting here"},
  "action": {"op": "reduce_tear_trough", "tool": "soft_light_dodge", "direction": "down"},
  "magnitude": {"spoken": "slightly", "bucket": 2, "stated_value": null, "normalized": 0.25},
  "rationale": "keep the structure of the face",
  "constraint": "never touch the crease itself",
  "warns_against": "if you blur it she stops looking tired-her",
  "order_note": "after color, before sharpening",
  "confidence": 0.8, "requires_grounding": true
}
```
**Magnitude calibration trick:** the educators who *say numbers* ("shadows +20") calibrate the lexical buckets ("a touch" ≈ ≤10% of range, "a bit" 10–20%, "most of the way" 40–70%) for the ones who don't. Build the lexicon per-speaker, not global. If the tool surface can also grab a **video frame at the timestamp**, attach it — that converts ungrounded rules into weakly-grounded ones and is worth fighting for [if frame capture isn't available, rules stay text-only until grounded against the benchmark].

### Handling expert disagreement

**Never average parameters across schools. Averaging expert taste is precisely how you manufacture the mediocre look.** Concretely:

- Cluster rules into **schools** by authority lineage: e.g., *High-end D&B* (Taffarel/Naik: sculpt light, minimal smoothing), *Clean commercial* (Adler: corrected, bright, symmetric), *Moody fashion* (Coulson: crushed blacks are legitimate), *Volume wedding* (Jirsa: consistency > perfection), *Landscape restraint* (Danson/Heaton), *Cinematic* (Kelly/Qazi/Joey L.).
- At runtime, **hard routing**: genre classifier + user profile selects ONE school per project. No soft parameter mixing across schools mid-image. Personalization interpolates *within* a school only.
- Conflicts inside a school become soft constraints with evidence weights (stated numbers + visible outcome > rhetoric). "Always/never" statements go to the **caps layer**, which dominates taste rules absolutely: taste moves within caps, never through them.
- Contradiction audit is a build-time report: any condition where schools disagree >30% on action = confirmed multi-school, not a bug to resolve.

### Grounding mined rules against real pixels

- **Benchmark set:** 200 raws spanning Fitzpatrick I–VI, ISO 100–12800, natural/flash/mixed light, ≥5 genres, plus synthetic injections (known −0.7 EV underexposure, known +400 mired cast, added Gaussian/mixture noise) where ground truth is exact.
- A rule is **admitted** if: (a) it fires when its predicate holds (precision ≥ 70%), (b) blind A/B (rule-on vs rule-off) wins ≥ 55% preference or improves a panel metric, (c) it **never** violates a Q3 cap on any benchmark image.
- Rules carry evidence counters and decay; low hit-rate or repeated verifier failures → auto-retire. Nothing mined from speech influences output until it passes this gate.

### Primary use of the corpus (pick one, defend)

**(b) Retrieval context for the decision model at decision time** — with a graduation path: high-confidence grounded rules get compiled into the deterministic school config (fast path, no model call); retrieval stays live for edge cases and, critically, for **provenance display** ("shadow lift capped at +0.8 EV — Naik 14:22, grounded 41/45 images, verifier-clean").

Why not (a) pure rule base: combinatorial explosion; conditions never fully cover reality; brittle. Why not (c) fine-tuning: transcripts have no input→output pixel pairs; you'd be training on hallucinated supervision — the most expensive way to get confident wrongness. Why not more exotic: auditability *is* the product's trust mechanism, and retrieval preserves it.

---

## Q5 STACK RECOMMENDATION

| Layer | Recommendation | Notes |
|---|---|---|
| VLM (local) | **Qwen2.5-VL-32B-Instruct AWQ** via vLLM sidecar (~20 GB, fits 5090 32 GB with headroom); drop to 7B if running concurrent with Topaz GPU jobs | Use for: genre/scene confirmation, condition description, rationale text, *secondary* artifact check. **Do not** ask it for parameters — VLMs hallucinate slider values. Cloud VLM only for offline corpus structuring (amortized, not per-image); per-image stays local. |
| Faces / landmarks / iris | InsightFace (detect + ArcFace for identity verify) + MediaPipe Face Mesh (iris) | |
| Segmentation | BiSeNet face-parsing (skin/sclera/lip/hair), SAM2 (subject/generic), Depth Anything v2 (separation), rembg (fast subject cutout) | All exist as ComfyUI nodes or trivial FastAPI wraps |
| Measurement / colorimetry | Python: rawpy, numpy/scipy, scikit-image, OpenCV, `colour-science`, lensfunpy | CPU-bound, deterministic, no GPU contention |
| Raw develop / grading | **RawTherapee CLI + generated .pp3** (primary automation surface), darktable-cli as alternate; rawpy+numpy for full-control paths; **emit Adobe .xmp** as an output artifact for Lr round-trip | |
| Retouch raster ops | Own numpy FS/D&B/curves; LaMa via IOPaint for heal/distraction; no generative models on faces by default | |
| Topaz | Photo AI CLI (`tpai`) + Gigapixel CLI on watched folders | Genuinely wins: high-ISO chroma denoise, **motion deblur** (no good open equivalent), small-face upscale, throughput. Does not win: param-level scripting, color, masking, consistency. Verify CLI flag surface in week 1 [UNSURE on current exact flags]; plan B = settings templates + watched folders; plan C = open substitutes. |
| Orchestration | Node orchestrator (existing patterns) + FastAPI measurement/verify service + ComfyUI as model worker + Topaz watcher + PostgreSQL (measurements/claims/plans/rules/schools/verdicts/preferences as jsonb, versioned) | Keep every intermediate 16-bit TIFF; they're the regression corpus. |
| VRAM discipline | Sequence jobs: VLM ↔ Topaz not concurrently; ~32B AWQ + BiSeNet + SAM2 fit, Topaz wants its own window | |

---

## Q6 PERSONALISATION

The proven kept/rejected + pairwise pattern transfers — **but the judging object changes**. Novel-image generation made accept/reject natural; here the strong signal is **pairwise A/B of variants of the same raw**, which is a cleaner experiment (same content, only the edit differs). Never-show-twice doesn't transfer literally; its correct analogue is a **variant-diversity floor** (see below).

Mechanics:
- Brain emits N variants per image (school × strength ladder × 1 deliberate exploration variant).
- Sean's picks feed a **Bradley–Terry / Thurstone model over (measurement-bucket, parameter-delta) pairs** — i.e., learn *response curves* (e.g., preferred shadow-lift as a function of measured shadow depth), not "images Sean likes." Keep the feature space small (~50 measurement archetypes) or you'll never converge.
- Volume: **~50 pairwise choices** → coarse direction; **~300** → usable per-axis curves; **~1,000+** → conditional interactions. Cold start from school presets; personalization only interpolates within pro caps — Sean can exceed caps per-project with an explicit flag, never silently.
- **Rut avoidance:** ε-exploration at 10–15% of variants (Thompson sampling over capped axes); diversity floor guarantees variants keep spanning the safe range; monitor accepted-delta variance — shrinking variance = rut forming → raise ε; quarterly calibration batch on a fixed reference set to detect drift.
- Genres are personalized separately (his portrait taste ≠ his landscape taste — force this split in the schema on day one).

---

## Q7 BUILD ORDER (numbered slices with done-tests)

0. **SPIKE (1–2 weeks, do first — riskiest): verifier metrics + Topaz CLI control surface.** Implement the Q3 metric suite and a headless Topaz batch runner on 20 diverse raws. **Done when:** metrics compute < 5 s/image, Topaz runs reproducibly with known settings, and you can show a deliberately-overcooked image failing the verifier. If Topaz params aren't scriptable to the needed granularity, you learn it *here*, before the brain exists, and pivot to open models cheaply.
1. **Measurement + diagnosis report (no editing).** Raw in → measurements JSON + English diagnosis dashboard. **Done when:** on a 50-image set with your hand-labeled ground truth, ≥ 90% agreement on exposure/WB/noise/cast claims.
2. **Deterministic safe-fix pipeline (first visibly useful, ~days after slice 1):** WB, exposure, clipping, lens/geometry, Topaz denoise+sharpen under caps. **Done when:** blind A/B vs Lightroom auto wins ≥ 60% on 100 real images, judged by you, unmodified caps.
3. **Corpus mining + 3 schools.** 5 channels, ~300–500 rules extracted, grounded against the benchmark. **Done when:** each school config reproduces its namesake's look on 10 canonical images (your eyeball), rules pass grounding ≥ 80%.
4. **Retouch layer.** LaMa blemish/distraction, FS smoothing, eye-bag doctrine, identity checks. **Done when:** 30-portrait set has zero verifier reds, ArcFace identity check passes 100%, and 2 external pros find no plastic reads [recruit them in month 1].
5. **Personalization loop.** Variants + pairwise + BT model. **Done when:** model predicts your held-out pairwise choices ≥ 70%.
6. **Genre expansion + batch consistency.** **Done when:** a 200-image mixed-lighting set holds skin anchor ΔE00 ≤ 3 across the set.
7. **Full self-critique repair loop + Lr .xpm/.xmp round-trip export + audit-trail UI.**

Slices 0–2 produce something genuinely useful within ~a month. Slice 0 is the one that kills the project if it fails — hence spike-first.

---

## Q8 THREE WAYS THIS FAILS

1. **The last-20% tar pit.** Weeks 1–6 feel like magic (the safe 60% of corrections); then the failure queue becomes 90% unique edge cases; pass rate plateaus at ~75%; you stop trusting it; it becomes the auto-button you built to replace. *Month-1 sign:* your fix queue is dominated by image categories you've never seen twice, and rule additions stop moving the pass rate.
2. **Goodhart on naturalness.** The verifier passes what pros reject (metrics tuned on one skin type / one lighting family); you ship the AI look with green dashboards; the product's core promise is falsified by the first peer who zooms to 100%. *Month-1 sign:* verifier-vs-your-own-judgment disagreement > 20% on the calibration set, or the need to hand-patch thresholds more than weekly.
3. **Taste mud.** Mined rules averaged across contradictory schools; output converges on mediocre 2016-Instagram; indistinguishable from a preset pack — which means the entire brain added nothing over the caps table. *Month-1 sign:* school configs fail to reproduce their namesake looks in grounding runs; contradictions between mined rules on identical conditions > 30%.

---

## WHAT I WOULD CHANGE ABOUT THE PLAN AS BRIEFED

1. **The corpus priority is inverted.** YouTube pros define the *professional envelope* (caps, orders, doctrine); **Sean's own 26 years of keepers are the taste ground truth.** Mine his archive first — it's smaller, pixel-attached, and already proven learnable by his existing system. YouTube calibrates the bounds; his catalog personalizes within them. As briefed, the plan leads with the weaker signal.
2. **There is no evaluation budget, and the whole product is an evaluation.** A fixed 100-image gold set with your grades, 2–3 paid external pro raters monthly, and a regression CI over the verifier — without these you're optimizing against yourself and will Goodhart. This is the single most under-specified part of the brief.
3. **Topaz-first thinking is backwards.** The defensible product is the **decision layer + audit trail** (diagnosis → plan → provenance → verifier scores, exportable as .xmp into Lightroom). Pixels are swappable; Topaz is three nodes in the DAG. As briefed, "drives Topaz" is doing too much architectural work.
4. **Genre lock.** Portraits first — your volume, your revenue. Landscape grading is a different brain (different measurements, different schools, different caps: clarity caps that are safe on skin are lazy on mountains). One brain per genre or no brain ships.
5. **The kill list needs to be explicit on day one:** generative skin — off; face recovery — off; liquify — off; teeth/sclera whitening — capped hard; blemish permanence calls — human-gated. Every one of these is where "professional" goes to die, and each needs a named switch, not a default.
6. **Legal footnote:** mining transcripts into internal rules is fine; redistributing mined rules as your content or product copy is not. Decide the line before the corpus exists.
