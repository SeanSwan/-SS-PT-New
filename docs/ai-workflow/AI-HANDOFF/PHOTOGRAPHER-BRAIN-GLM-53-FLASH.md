# GLM Consult

**Requested:** `glm-5.3-flash`
**Served:** `glm-5.3-flash`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 2752 in / 19804 out (reasoning: 12083) | total 22556
**Wall:** 570.2s

---

## VERDICT

Real, but only if reframed: this is a **senior retoucher's assistant that produces a complete draft edit plus a change memo**, with a human approving the last mile — not an autonomous pro. Technical correction (WB, exposure, denoise, sharpening, set coherence) is ~95% automatable and the machine will beat an average working pro on several of these. Taste-level grading is ~60%; retouch identity is ~50% and is where the product kills itself. Single biggest risk: the retouch path producing "same person, but subtly wrong" — the one failure a photographer audience never forgives. Second: ungrounded transcript rules averaging into competent mush.

## Q1 FEASIBILITY

**Honest answer: 80% of the way, human on the last 20%, and the 20% is concentrated in retouch identity and intent.**

| Capability | Machine today | Notes |
|---|---|---|
| WB under mixed light | **Better than average pro** | Skin-tone-line prior in a/b space + neutral-pixel detection beats eyeballing; pros get this wrong under LED+window mixes constantly |
| Exposure normalization to face | Comparable to better | Measurable, target bands exist per skin tone |
| Denoise at high ISO | **Better** | NAFNet/Topaz-class models beat most hand NR; the pro's edge is only knowing how much |
| Batch/set coherence over 400 frames | **Better** | Humans drift over a long event; machines don't |
| Output sharpening math | **Better** | Radius/amount from output size and viewing distance is arithmetic most pros do by habit, not measurement |
| Clipping decisions from raw headroom | Better | Raw channel data shows recoverable highlight before tone curve; humans guess |
| Taste-level grade (mood, restraint, "leave it") | **~60% at best** | Requires intent priors the machine doesn't have |
| Retouch to identity boundary | **~50%** | Measurable caps exist, but the negotiation ("better rested, still me") is contextual |
| "This darkness is mood, not error" | **Cannot do reliably** | The central unsolved problem — see below |

**Decisions a machine cannot currently make well:**
1. **Intent under ambiguity.** Underexposed subject at sunset = mistake or silhouette? Green cast = fluorescent contamination or fog mood? Every diagnosis needs an escape clause ("candidate intentional; defer"). This is the actual ceiling, and it's why the product must ship a defer/escalate path, not pretend.
2. **Novel lighting.** Gels, stage wash, hard chiaroscuro, mixed theatricals. Models trained on natural image statistics try to "fix" deliberate light. A working pro says "leave it alone" instantly.
3. **Likeness negotiation.** How much bag reduction this specific client tolerates is business/context knowledge, not pixel knowledge.
4. **When to do nothing.** Doing nothing must be a first-class legal edit, or the system becomes Lightroom Auto with extra steps.

## Q2 DECISION ARCHITECTURE

### Measurement layer
All computed before any decision. Full list, in execution order:

| Measurement | Method | Output |
|---|---|---|
| EXIF/camera | EXIF parse | ISO, lens, aperture → priors: expected noise floor, vignette profile |
| Per-channel histogram | float32 stats | Percentiles 0.1/1/50/99/99.9%, clip % (≥253, ≤2) |
| Raw highlight headroom | LibRaw channel data | Stops recoverable pre-clip |
| Illuminant estimate | Neutral pixels (max−min channel diff <4/255, L* 20–220) + skin-line projection in a*b* | Cast vector in mireds + tint (G/M); ΔE from D-series |
| Scene class | SigLIP/CLIP embedding | portrait / group / landscape / interior / night / high-key (snow, beach) |
| Face + landmarks | InsightFace (SCRFD) + MediaPipe FaceMesh (468 pts) | Face boxes, iris, tear-trough polygons, catchlight blobs |
| Face segmentation | BiSeNet face-parsing (CelebAMask-HQ 19-class); MODNet for hair matting | Skin/sclera/lips/brow/hair masks |
| Skin tone class | ITA° (Individual Typology Angle) from skin-mask L*C*h | Fair/medium/deep → target bands for everything downstream |
| Face luminance | Skin-mask mean L* | vs. target band (fair ~62–70, medium ~48–58, deep ~30–42 L* — **calibrate, approximate**) |
| Under-eye delta | ΔL* under-eye band vs adjacent cheek | Normal ~8–15, tired >18–20 (calibrate per skin class) |
| Sclera stats | Sclera-mask L*/a* median | Natural sits ~5–15 L* below scene white; a* ≥ ~8 from vessel chroma |
| Noise sigma | Wavelet MAD (Donoho: σ = MAD/0.6745) on HH band, per exposure quintile | SNR dB in shadows/midtones |
| Sharpness distribution | Variance of Laplacian per region | Subject vs background ratio; "already sharpened" ringing detect |
| Halo detect | Gradient sign-reversal within 3px of strong edges, amplitude >3–5% of step | Pre-existing over-process flag |
| Subject/bg luminance ratio | Person mask (SAM2) mean L* | Stops difference |
| Local contrast at 3 scales | RMS of Gaussian-difference residuals r≈4/16/64px | Clarity baseline |
| Skin chroma distribution | Skin-mask LCh: hue mean/σ, max C* | Natural hue σ ≥ ~4°; over-processed collapses this |
| Hotspots | % skin pixels L* > 235 | Forehead/nose specular |

### Diagnosis layer
Measurements become typed statement objects: `{subject, predicate, magnitude+unit, confidence, evidence, escape_clause}`. Examples with real thresholds:

- `face_underexposed: face L* 52 vs target 48–58 (medium skin) → OK` — resolved, no action.
- `face_underexposed: face L* 40 vs target 48–58 → −0.7 stops on skin mask; confidence 0.9; escape: scene=night→check "intentional low-key"`. 
- `cast: ΔE(illuminant, D55) = 9.4, vector +green +yellow → fluorescent-class; action: WB shift ≈ +12 mired magenta; confidence 0.85; escape: scene=fog/forest→verify grade intent`.
- `bg_dominant: bg +1.3 stops over subject → flag; escape: scene=sunset-portrait→candidate silhouette, defer`.
- `shadow_noise: SNR 14 dB, ISO 6400 → denoise strength HIGH, grain re-inject planned`.
- `tired_eyes: ΔL* under-eye = 21 vs normal band → reduce toward ≤10, never below 5`.

Two tiers: **constitution diagnoses** (any pro agrees — clipping, cast, noise) act automatically; **taste diagnoses** (mood, dominance) require an intent gate: scene class + retrieval context (Q4) + personal taste profile → act, defer, or escalate.

### Prescription layer (with operation ORDER and why)

1. **Triage/intent gate** — scene class, ambiguity check; possibly "do nothing" or escalate here.
2. **Geometric/optical corrections** (lens profile, straighten, CA). *Why first:* all masks and measurements assume rectified geometry.
3. **Linear scene-referred: WB, base exposure.** *Why before everything tonal:* casts bias every subsequent mask and curve; linear keeps demosaic/highlight recovery valid.
4. **Highlight recovery** (raw headroom). *Why pre-tone:* recovery only works in scene-referred data; after the tone curve the data is display-referred and clipped is clipped.
5. **Denoise, SNR-targeted.** *Why here, before tone stretching:* denoise models expect natural image statistics; lifting shadows first amplifies and stretches noise into structures the model then "protects". Also retouch (step 7) needs clean pixels.
6. **Tone architecture:** global curve to target bands → local luminosity rebalance via subject/sky masks (close the subject/bg gap only if the intent gate says it's not deliberate).
7. **Color grade:** skin-protective HSL first, then secondaries (split-tone, hue-vs-lum). *Why tone before color:* grading noise or an unbalanced tonal foundation is grading garbage; also skin hue shifts under tone moves, so protect after tone is settled.
8. **Retouch (portraits only):** blemish/dust inpaint (tiny radii) → frequency-separation under-eye/texture-preserving ops → dodge & burn. *Why after grade:* retouch is expensive and you don't want to redo it if grade intent changed; *before sharpening:* sharpening after retouch, never before.
9. **Resize/upscale** if needed (≤2× for portraits).
10. **Output sharpen** — radius from output size (0.3–1.0 px typical; amount 50–120%). *Why strictly last:* anything after sharpening creates halos; retouching after sharpening locks artifacts into texture.
11. **Verifier** (Q3), max 2 bounded revision loops.

### Execution layer

| Op | Tool |
|---|---|
| Raw dev (steps 2–4) | `rawpy`/LibRaw + numpy float32 custom pipeline (WB multipliers → demosaic → recover → linear TIFF). Alternative: RawTherapee CLI (pp3 param files are documented text = scriptable). **Prefer rawpy for control** |
| Tone/grade (6–7) | numpy/OpenCV float32: curves, LUTs, masked HSL; OpenColorIO for space transforms |
| Masks | SAM2 (subject/sky), BiSeNet face-parsing, MODNet (hair), MediaPipe (tear-trough polygons) |
| Denoise/sharpen/upscale | Default open path: NAFNet (SIDD-trained) or Restormer + custom deconv/USM. Topaz opt-in (Q5) |
| Inpaint (blemish/dust only) | Existing ComfyUI: SDXL-inpaint (license OK for commercial). ⚠️ FLUX.1-fill quality is better but **FLUX-dev weights are non-commercial — license trap** [verify current terms] |
| Orchestration | Existing Node/Express → Python worker (FastAPI + queue); decisions/state in Postgres + pgvector |

### Self-critique / stopping rule
- Re-run the **measurement layer on the output**. Every diagnosis must be resolved or have a declared "intentionally preserved" flag. Unresolved + undeclared = fail.
- All Q3 caps must pass (see verifier, Q3).
- **Bounded loop:** max 2 revisions. On second failure: revert to pass-1 with global restraint multiplier ×0.7, or fall back to constitution-only grade, and flag for human.
- **"Do nothing" is a legal edit.** If confidence < threshold on every taste diagnosis, ship the technical-floor grade only.
- Every run emits a **change memo** (JSON: diagnosis → op → params → rationale). This is the product surface, not a log.

## Q3 NATURALNESS GUARDRAILS

### Measurable over-processing signatures

| Signature | Metric | Threshold (approx — calibrate on unretouched reference corpus per ITA bucket) |
|---|---|---|
| Skin texture loss | HF energy in skin mask: RMS of (image − Gaussian σ1.5) normalized to mid-band (σ6 residual), per 64–128px patch, **edited vs pre-edit delta** | Patch retains < 65% of original HF ratio → smoothing detected (relax by expected denoise factor at ISO ≥ 3200) |
| Local contrast overshoot / halos | At edges with gradient > 20/255: 2nd-derivative sign reversal within 3px, amplitude > 3–5% of edge step | Any reversal beyond original's own count → clarity/sharpen dialback |
| Unnatural chroma clustering | Skin-mask LCh hue σ | σ(hue) < 2–3° = plastic (natural ≥ ~4°); max C* beyond ITA-class band = orange-skin tell |
| Eye-white violation | Sclera median L* vs scene paper-white; sclera a* | Sclera ≥ scene white, or a* < ~6 → fake. Natural sclera is never the whitest thing in frame |
| "Everything equally sharp" | Background HF / subject HF ratio vs original ratio | Ratio inflated > 1.2× → global oversharpening |
| Gradient reversal at jaw/hair | Alpha-halo: chroma step across 2px-in/2px-out band at matting boundaries | Uniform color band where hair should blend → inpaint/mask artifact |
| Noise-floor flatness | σ(luminance) vs mean-luminance curve slope | AI denoise flattens the Poisson slope; flat curve at high ISO is a machine tell. Fix: grain re-injection matched to ISO |
| Pore-scale loss | Patch-level (above) concentrated on forehead/cheeks | Same threshold; regions matter because eyes forgive clothing HF loss, never skin |
| GAN/diffusion fingerprint | Frequency-domain periodicity / trained detector (e.g., CNNDetection-class) [UNSURE — detector reliability on modern diffusion is shaky; use as weak signal only] | Flag, don't act alone |

### Hard caps table

| Operation | Safe range | Never exceed | Why |
|---|---|---|---|
| Vibrance | +5…+15 | +25 | Skin hue drift, banding in smooth gradients |
| Saturation (global) | 0…+8 | +15 | Immediately reads "AI HDR" |
| Texture/Clarity (8–32px local contrast) | ±10 | +20 (negatives freely OK) | Halos + HDR-skin look; positive clarity on faces is rarely right |
| Skin smoothing (HF-layer opacity) | 20–40% | 55% | Pore-loss signature above |
| Under-eye reduction | Cut measured ΔL* by ≤ 50%, target band 6–10 | Floor ΔL* < 4–5 | Below floor the face loses structure → "same but wrong" |
| Sclera lift | ΔL* ≤ +6 from natural | Never ≥ scene white; a* ≥ 6 preserved | Whiter-than-white is the #1 amateur tell |
| Teeth | ΔL* ≤ +5–8, retain chroma variance | Uniform white block | Same |
| Skin chroma | Max C* within ITA band (fair ≈ 18–30, deep ≈ 20–38 — **approximate, calibrate**) | Band +10% | Orange drift |
| Output sharpen | USM 50–120%, radius 0.4–1.0px | Overshoot > 5% of edge step, any amount | Halo signature |
| Denoise | To SNR target (midtone ≥ ~30–35 dB) | σ → 0; retain ≥ ~1/255 equivalent grain at ISO ≥ 3200 | Flat noise floor = machine tell |
| Dodge & burn on face | ≤ 0.3 stops cumulative per feature | 0.5 stops | Reads as melted structure |
| Inpaint radius | Blemishes ≤ ~2% of face area per spot | Any large-region generative fill on skin | Diffusion invents skin |
| Upscale (portraits) | ≤ 2× | 4×+ | Invented pore detail is worse than softness |
| Shadow lift | To measured target only | Beyond SNR ≥ ~25 dB post-denoise | Lifted mud is the "Lightroom Auto" look |

### Identity preservation / eye-bag doctrine
- **Reduce, never remove.** Measure ΔL* of the tear-trough band vs adjacent cheek from FaceMesh polygons. Correct technique: **luminance-only dodge inside the trough polygon, guided by a blurred structure map** — lifts the shadow but preserves the crease line and the lower-edge highlight that gives the face its structure. Never blur, never paint, never generative-fill. Chroma discoloration handled separately: hue-preserving desaturation + slight lift, chroma edit only.
- Opacity 30–50%. Texture untouched (edit is low-frequency luminance only; pore texture lives in HF and is bypassed by construction).
- **Hard ceiling:** cut the measured delta by at most half, stop at ΔL* 6–10, floor 4–5.
- **Automated identity check:** ArcFace/AdaFace embedding cosine similarity original-vs-edited ≥ 0.65 [UNSURE — calibrate this threshold empirically; it's a guardrail, not an absolute] + SSIM ≥ 0.9 on landmark-aligned luminance [UNSURE]. **Catchlights in the iris are protected pixels** — they survive everything; killing catchlights kills likeness.

### The "would a pro notice" verifier
Pipeline, all automatic, verdict ∈ {PASS, DIALBACK(ops), REJECT→fallback}:
1. **Caps check:** every metric in the tables above; any fail → reduce the offending op by 50%, re-run, max 2 loops.
2. **Identity check** (above) on every portrait.
3. **Delta audit:** per-region histogram deltas before/after must be explained by the change memo. Unexplained movement = bug or drift, not style.
4. **Adversarial VLM rubric:** local VLM (Q5) asked itemized yes/no: pores visible? halos at high-contrast edges? skin hue natural vs orange? light direction consistent across face? sclera believable? Cheap, catches coarse tells measurement misses.
5. **Sean's discriminator** (after ~300 decisions): his own kept/rejected edit-vector classifier as tiebreak — this reuses his existing pairwise-judge architecture directly.
6. **Hero-patch zoom:** signature metrics on 3 forced patches (cheek skin, strongest edge, background) regardless of global pass.

## Q4 DISTILLING THE PHOTOGRAPHERS

### Who (named, with authority domain)
⚠️ Structural bias to state upfront: **transcript mining reaches educators who narrate while editing, not the best working retouchers** — much of the top commercial tier doesn't publish raw decision-making. Curate accordingly.

| Who | Authority | Confidence |
|---|---|---|
| PiXimperfect (Unmesh Dinda) | Retouch mechanics, color science fundamentals | High |
| Phlearn (Aaron Nace) | Retouch, compositing | High |
| Kristina Sherk (SharkPixel) | Skin retouch specifically | High-ish |
| Pratik Naik (Solstice Retouch) | High-end beauty retouch | Name high; **YouTube output volume [UNSURE]** |
| Lindsay Adler | Portrait/fashion lighting + retouch, workflow | High |
| Peter Hurley | Headshot-specific doctrine (jawline, likeness) | High |
| Pye Jirsa / SLR Lounge | Wedding/event volume workflow, lighting | High |
| Matt Kloskowski | Lightroom workflow — explicit per-slider reasoning, excellent for rule mining | High |
| Scott Kelby | Volume workflow | High |
| Nathan Elson | Portrait full-edit walkthroughs with live reasoning | High-ish |
| Sean Tucker | Restraint philosophy, natural light — directly on-brand for the naturalness constraint | High |
| Thomas Heaton | Landscape, anti-over-processing philosophy | High |
| Michael Shainblum | Landscape/cinematic grading | High-ish |
| Alister Benn | Expressive landscape processing | High-ish |
| Mark Denney | Landscape processing | High-ish |
| Cullen Kelly | Colorist: color science, film emulation — the closest thing to a color authority in this corpus | High |
| Casey Faris | DaVinci grading education | High |
| Darren Mostyn | Working colorist content | **Activity level [UNSURE]** |
| Waqas Qazi | Cinematic color, high volume | **Depth contested [UNSURE]** — weight low |
| Sue Bryce | Portrait business + retouch philosophy | Name high; **current publishing status [UNSURE]** |
| **Skin tones on darker skin** | **Genuine corpus gap.** Dedicated YouTube authority is thin; nearest coverage is scattered through Adler/SLR Lounge guest content [UNSURE on a specific name I'd trust — do not paper over this] | Flagged |

### Extraction schema
One structured record per teaching moment:

```json
{
  "source": {"channel": "...", "video_id": "...", "t": [s, s]},
  "trigger": {"condition": "shadows crushed on groom's face",
              "measurable_proxy": "face_mean_L* < band_low", "confidence": 0.7},
  "action": {"op": "shadow_lift", "target": "face_mask", "tool_hint": "LR Shadows"},
  "magnitude": {"direction": "up", "amount": "a touch",
                "verbal_lexicon": "touch", "calibrated_units": null},
  "rationale": {"cause": "printed detail lost", "intent": "keep mood, keep detail"},
  "constraint": {"never": "don't brighten the whole frame",
                 "verbal_ceiling": "just enough to find the lapel"},
  "context": {"genre": "wedding", "skin_tone": "deep", "light": "reception混", "gear": "any"},
  "polarity": "do", "source_persona": "slr_lounge",
  "tier": "provisional"
}
```
Key mechanics: (a) a **calibrated lexicon** mapping "a touch / a bit / crushed / blown" to slider units — calibrate by reproducing each phrase on reference images and measuring the delta; (b) extract **negative rules** ("don't pull clarity here") as first-class — warnings are higher-signal than actions; (c) every rule carries `tier: provisional` until grounded.

### Handling expert disagreement
**Never average — averaging produces exactly the mediocre look being avoided.** Architecture:
- Every rule is tagged with its **source persona**. The runtime instantiates a *panel*: Sean's learned profile first, else one coherent named persona per session — never a blend.
- Contradiction detection: same trigger + opposite action across experts ⇒ that trigger is declared a **style axis** (contrast posture, saturation posture, warmth bias, retouch aggressiveness, grade hue). Style axes are the personalization dimensions (Q6) — conflict is signal, not noise: it maps the taste space.
- Rules with universal agreement across ≥3 independent experts are promoted to the **constitution**: the non-negotiable technical floor (skin-line WB, the Q3 caps, protect catchlights, denoise before tone-stretch). The constitution applies to everyone; style axes apply to one person.
- Genre gating: a landscape rule never fires on a portrait. Context clauses from the schema enforce this.

### Grounding mined rules against real pixels
A rule may not influence output until it passes:
1. **Direction test:** build a small eval set matching the trigger; apply the rule; confirm the measured metric moves in the direction the words imply. ("Bring shadows up a touch" must produce ΔL* in the 5–15 range, not +40.)
2. **Adversarial context test:** apply to images where the trigger holds but the schema's context clauses differ (fog scene, gel light). Bad firing ⇒ narrow the condition.
3. **Human A/B:** Sean blind-picks rule-applied vs base on a sample.
4. **Production decay:** after promotion, every user revert of that op is negative feedback; per-rule bandit confidence decays. Rules die by data, not by committee.
Only rules grounded this way + sourced from ≥3 experts enter the constitution.

### Primary use of the corpus (pick one, defend)
**(b) Retrieval context for the VLM at decision time — primary.** Defense: a mined sentence is lossy and context-thin; used as a hard rule it poisons output with confidence it hasn't earned. Used as *retrieved context at the moment of decision*, the full human reasoning ("…because I want to keep the mood") is exactly the intent-signal the VLM lacks and cannot get from pixels. The measurement layer + Q3 caps then verify whatever the VLM prescribes, so a bad retrieval can't ship damage — it degrades gracefully. The deterministic subset that survives grounding (Q4 above) is promoted to code, but that's an *output* of the system, not the primary use. Cost is trivial: embed ~1–5k snippets into pgvector, retrieve top-k per image. A small fine-tuned local model (option c) is premature — you'd need 50k+ grounded examples you don't have [UNSURE on exact data requirement, but the order of magnitude is right].

## Q5 STACK RECOMMENDATION

| Layer | Recommendation | Why / notes |
|---|---|---|
| VLM diagnosis | **Qwen2.5-VL-7B-Instruct** local via vLLM (32GB VRAM is comfortable); 72B-AWQ optional for hard cases | Best open grounding + structured output; fine for rubric checking. Cloud only as opt-in tie-break on ambiguous scenes (< $0.01/image) — **not needed for v1** |
| Faces | InsightFace (detect + ArcFace identity), MediaPipe FaceMesh 468 (tear-trough polygons), BiSeNet face-parsing (CelebAMask-HQ classes), MODNet (hair matting) | All local, all fast, all battle-tested |
| Scene masks | SAM2 (subject/sky) + simple sky heuristics | |
| Raw dev | **rawpy/LibRaw + numpy float32 custom** (WB → demosaic → highlight recovery → linear TIFF); RawTherapee CLI as cross-check | Full determinism; pp3/XMP-driven CLI devs work but fight you on parametric control |
| Grade math | numpy/OpenCV + OpenColorIO | Display-referred sRGB pipeline is fine for portraits; don't ACES this |
| Denoise/sharpen default | **NAFNet (SIDD)** or Restormer + custom deconv/USM | Controllable to our measured SNR targets |
| Inpaint | Existing ComfyUI + SDXL-inpaint | ⚠️ FLUX.1-fill is better but **FLUX-dev weights are non-commercial** [verify terms before any client use] |
| Aesthetic tiebreak | LAION aesthetic predictor v2 | Weak signal only |
| Corpus/taste store | pgvector in existing Postgres | Zero new infra |
| Orchestration | Node/Express → Python worker (FastAPI + Redis queue) | Matches house stack |

**Topaz honestly:**
- **Automatable today:** Gigapixel CLI is documented and stable. Photo AI has a CLI/batch mode with preset and override parameters as of recent versions — **exact flags drift between versions [UNSURE — spike this in day 1, it's a 2-hour test]**. DeNoise/Sharpen standalone CLIs exist but are legacy-adjacent.
- **Not automatable in a way this product needs:** *per-image, measured, pro-strength decisions.* Topaz's auto mode is an unauditable black box that decides its own strength — its output can violate the Q3 caps (over-smoothed skin) and you can't tell it "hit SNR 32 dB and stop." If the CLI can't pin strength per image, Topaz output must be verified post-hoc and often re-grained.
- **Where Topaz genuinely wins, keep it:** motion-blur/shake (Sharpen "Stabilize"-class models — no open model reliably matches), extreme low-light denoise, and people-upscaling in Gigapixel. Everywhere else the open path is equal or more controllable. **Default: open path; Topaz is opt-in for motion blur and big upscales, always verifier-checked afterward.**

## Q6 PERSONALISATION

**Reuse the proven pattern directly** — kept/rejected + pairwise + never-show-twice transfers almost unchanged, with three modifications:

1. **Implicit labels are the volume channel.** At client volume nobody clicks A/B. Every edit ships as a change memo; when Sean tweaks in Lightroom/his viewer, the parameter diff of his corrections is a labeled negative example per op. Explicit pairwise only for hard/tie cases (the codebase already has the judge for this).
2. **Parameterize taste as style axes, not raw slider values.** The axes from Q4 (contrast posture, saturation posture, warmth bias, grade hue, retouch aggressiveness, shadow posture) with the **constitution as a hard clamp** — personalization can move anything *inside* the caps, nothing outside.
3. **Per-genre profiles.** Portrait-taste and landscape-taste are different people; one global vector collapses into rut immediately. At minimum two-three genre spaces.

**Cold start:** default persona = neutral professional (constitution + mid-band settings). **~150–300 implicit decisions to measurable personalization, ~500 to stable** [estimate — verify empirically].

**Anti-rut mechanics:**
- ε ≈ 10% exploration **only in review contexts** — never inject variants into client deliverables.
- Rejected corners get permanent never-show-twice memory (reuse the existing mechanism).
- Quarterly style-axis sweep report: show the user's current position per axis so drift is visible.
- Acceptance-rate plateau + variance collapse = automatic signal to widen exploration.

## Q7 BUILD ORDER (numbered slices with done-tests)

**Spike-0 (days 1–5, in parallel, before real builds):** (a) Topaz Photo AI CLI controllability — can we pin strength per image? (b) Manual retouch prototype on 10 faces: hand-set tear-trough dodge, measure ΔL* before/after, validate the 6–10 band against Sean's own hand edits. *This de-risks the two biggest unknowns for ~a week of work.*

1. **Measurement/diagnosis CLI ("image doctor").** Reads image + EXIF → diagnosis JSON, no editing. **Done when:** on 20 images Sean knows cold, diagnosis matches his assessment on the 5 core axes ≥ 16/20; < 5s/image. *Visible value in days.*
2. **Constitution auto-grade.** rawpy pipeline + measurement → WB/exposure/tone to spec → 16-bit TIFF. **Done when:** blind preference vs Lightroom Auto ≥ 10/12 on varied RAWs.
3. **Verifier v1.** Q3 metrics wired to dialback. **Done when:** injected over-process (clarity +40, skin blur) is caught and auto-reduced; clean edits pass ≥ 95%.
4. **Corpus v0.** 10 channels, transcripts → extraction schema → 300+ snippets. **Done when:** 50 constitution candidates with ≥2 independent sources; 20 pass grounding evals.
5. **Retouch path v1** (post-spike-0b). Face parsing + tear-trough doctrine + caps + ArcFace guard. **Done when:** 10 before/afters rated "same person, better rested" ≥ 8/10 by Sean; identity similarity above calibrated threshold.
6. **Denoise/sharpen integration** with SNR-targeted strength (Topaz opt-in per spike-0a findings). **Done when:** ISO 6400 frame hits SNR target with HF-texture retention inside caps.
7. **VLM + retrieval decision layer** for ambiguous intent. **Done when:** on 20 known-ambiguous images, the defer-don't-fix call matches Sean ≥ 70%.
8. **Personalization loop.** **Done when:** first-pass acceptance trends up across 100 decisions; a second user's profile measurably diverges.
9. **Set coherence.** **Done when:** a 300-frame event set lands within threshold ΔE of one grade with zero manual per-frame work.

**Riskiest: the retouch identity path** — hence spike-0b before anything else is built in earnest. Topaz CLI controllability is the fast second spike.

## Q8 THREE WAYS THIS FAILS

1. **Plastic drift on portraits.** The under-eye/skin path creeps past likeness; Sean's audience — and Sean — can't un-see it, trust dies, the whole "natural" premise collapses. *Month-1 warning:* manual revert rate on under-eye ops > 25% of portraits; ArcFace guard trips repeatedly; Sean stops sending faces through the pipeline.
2. **Corpus mush.** Transcripts yield vibes, not rules; grounding evals keep failing; what ships is a competent-but-generic grade indistinguishable from Lightroom Auto at 10× the complexity. *Month-1 warning:* extracted rules cover < 20% of the delta between raw and Sean's own hand edits; Sean can't blind-pick the brain's output over Auto; the constitution promotion rate from 300 snippets is near zero.
3. **Orchestration tax.** The brain is 10% of the work; gluing raw dev, masks, Topaz's drifting CLI, ComfyUI, queue and UI is 90%, latency lands at minutes per image, and mask/Topaz failures on real field work (backlit, low light, groups) need manual rescue. Sean misses client deadlines and returns to 3 minutes in Lightroom. *Month-1 warning:* week 3, end-to-end single-image time > 2 min with no downward trend; more hours spent debugging Topaz flags than tuning taste rules.

## WHAT I WOULD CHANGE ABOUT THE PLAN AS BRIEFED

1. **Reframe the product: senior assistant + change memo + one-tap approve.** The human approval is a feature, not an admission of failure — and the memo JSON is what makes the personalization loop, the rule grounding, and trust all possible. Build the memo UI in slice 2, not last.
2. **Set-level editing is first-class, not slice 9.** Working pros grade in context of the shoot; clients perceive set coherence more than any single-image brilliance. A single-image brain is the wrong unit of analysis for a working pro's actual deliverable.
3. **A golden eval set is missing from the brief entirely.** Fix 50 images (all genres, all skin tones, known deliberate "mistakes"), blind A/B against Lightroom Auto *and* against Sean's own hand edits, re-run on every change. Without it the brain silently regresses and nobody notices for months. The real benchmark isn't "is it professional" — it's **"time-to-client-ready including fixes, beats Sean by hand."**
4. **Add an intent escalation interface.** One tap: "mood or mistake?" on ambiguous diagnoses. This is more honest and cheaper than pretending a VLM knows why Sean underexposed a frame.
5. **Legal traps nobody budgeted:** FLUX-dev non-commercial weights [verify]; YouTube ToS on bulk transcript storage/reuse [UNSURE — needs review]; model licenses on InsightFace variants (some are research-only [UNSURE — check before commercial use]).
6. **Kill the phrase "brain of a top photographer."** The corpus reaches educators who talk on camera, not the best working retouchers. What's being built is a *grounded, self-checking decision system with personas* — which is better, because it's auditable and it converges on Sean rather than on the average of YouTube's algorithm. Say that in the pitch; it's true and it's the actual moat.
