# GPT-5.6 Sol — Hostile Gate Review

**Reviewer:** OpenRouter `openai/gpt-5.6-sol-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-VISUALIZER-VISION-PANEL-PACKET-2026-08-20.md
**Seed:** (none)
**Tokens:** 43986 in / 34070 out · **Cost:** ~$0.6210 · **Wall:** 255.1s

---

## VERDICT
REVISE — The product has a capable parameter randomizer, but it neither provides granular authorship nor supports the claimed 24-hour experience, and its executable-preset path is unacceptable.

## BLOCKERS
1. **P0 — Executable preset text can become arbitrary JavaScript execution.** A malicious or corrupted MilkDrop preset entering the bundled benchmark/control path and reaching `new Function` can execute in the application origin, read local state, abuse an already-authorized microphone, or make network requests unless separately blocked. This also directly violates the non-negotiable prohibition on importing preset equation text. **Evidence:** no file:line supplied; §3 says the pack is bundled “in one build,” §2 exposes MilkDrop controls, and §5 states `new Function` was verified.

2. **P1 — Feedback history can invalidate world identity and measurement.** Load feedback genome G after world A versus after world B; if history buffers are not deterministically cleared and warmed up, G produces different output and descriptors despite having the same saved genome and world ID. Favourites then are not reproducible, and benchmark distances depend on render order. **Evidence:** no file:line supplied; §2 says three kernels use feedback while identity is the stored vector.

3. **P1 — The documented world ID omits required namespace/version inputs.** The same 17-element vector used by `inkVortex` and `pelagos`, or a saved vector rendered after a kernel/schema change, can resolve to the same hash while producing a different world if the hash covers only the vector as stated. **Evidence:** no file:line supplied; §2 defines identity as the stored vector and lists two 17-axis kernels.

4. **P1 — Cross-kernel crossover has an unresolved schema mismatch.** Crossing saved worlds with 16, 17, and 20 axes can truncate data, misapply an axis by array position, or produce an invalid genome unless cross-kernel crossing is forbidden or mapped through stable semantic axis IDs. The UI exposes “Cross,” but no compatibility rule is documented. **Evidence:** no file:line supplied; §2 lists heterogeneous axis counts and per-axis crossover.

5. **P1 — The acceptance governor demonstrably rejects the intended improvement.** A structurally distinct Pelagos candidate produces a 1.85 structure ratio but a 1.07 combined ratio, so the ≥1.5 gate rejects it. Input: a genuinely new grammar sharing the common palette; output: rejection as insufficiently different. **Evidence:** no file:line supplied; §3 tables and acceptance-bar discussion.

6. **P1 — Neither bold product claim is currently implemented.** At a 60-second cadence, 24 hours requires 1,440 perceived segments; the system demonstrates only a small-sample 18 clusters and roughly two structural grammars. Separately, an owner trying to set an exact axis value or save a reusable theme cannot do so through reroll, breed, locks, or commands. **Evidence:** no file:line supplied; §§1–4.

7. **P2 — Binding UI and performance requirements are assertions, not verified properties.** On smaller hardware or assistive input, controls may miss 44px targets, contrast, reduced-motion, or frame pacing; the packet supplies no implementation or tests for styled-components-only, no MUI, Victory-only charting, Crystalline CSS variables with fallbacks, Dual-Button Glow, dark-first presentation, WCAG 4.5:1, or the 300-line limit. **Evidence:** no file:line or source inventory supplied; §§2 and 5 only describe the surface and constraints.

## ATTACKS
- **Correctness**
  - **Q1 — No: 24 hours without perceived repetition is not supported by the current architecture or evidence.** If worlds change every \(N\) seconds, the minimum segment count is \(\lceil86400/N\rceil\): 17,280 at 5 seconds, 5,760 at 15 seconds, 2,880 at 30 seconds, 1,440 at 60 seconds, 720 at two minutes, or 288 at five minutes. Transitions and intermediate states can increase that requirement.

    The reported 18 clusters must not be called the ceiling of the genome space. It is 18 clusters in a sample of only 24; it is an observed collision rate, not a support-size estimate. The maximum possible result was itself capped at 24. Rarefaction across increasing sample sizes, confidence intervals, and a specified clustering algorithm would be needed even to estimate saturation.

    That statistical correction does not rescue the experience. Three kernels measure as one structural grammar and Pelagos supplies roughly a second. A viewer can recognize “the same machine with new settings” long before seeing the same genome. The controlling variable is grammar recurrence and temporal dramaturgy, not the number of u16 combinations.

    **Do:** retain reviewed numeric kernels, but place them under a hierarchical, deterministic temporal score: parameter trajectories, camera behavior, event motifs, transitions, theme constraints, and eventually compositing of vetted modules. Build several genuinely disjoint physical grammars. Treat 24 hours as a later outcome, not a current release claim.

  - **Q2 — Replace the descriptor as the single governor; keep a corrected hand descriptor only as one diagnostic.** For grammar acceptance, remove colour from the decision or render every candidate with identical fixed palettes before comparison. Colour remains useful for set-list variety, but it cannot adjudicate structural novelty when every kernel shares its colour generator.

    The metric specification is internally incomplete: 36 colour + 16 orientation + 12 motion accounts for 64 dimensions, not 76. The remaining 12 dimensions, their normalization, and whether they affect distance are unstated. Dimension count and nominal weights also do not establish influence without variance normalization.

    Use separate instruments:
    1. Structure under fixed palette or grayscale.
    2. Temporal motion from standardized clips after deterministic reset and warm-up.
    3. Colour distance for sequencing only.
    4. Occupancy/corner-density constraints.
    5. Flicker, clipping, and frame-time gates.
    6. Owner-labelled “same machine/different machine” comparisons.

    An offline learned video or perceptual embedding is appropriate as a second opinion, provided it is calibrated against the owner’s pairwise judgments. It should not be trusted automatically: natural-image embeddings can ignore shader-specific motion and topology. No weights or network inference belong in the shipped runtime. Runtime breeding should use transparent multi-objective descriptors and hard constraints, not one scalar.

    **Do:** immediately disable the combined ≥1.5 acceptance gate, accept Pelagos on the replicated structural result, version the replacement metric, and invalidate stale stored descriptors.

  - **Q3 — Granular control requires a versioned theme-authoring surface, not more stochastic genome operations.** The immediate authorship bottleneck is direct manipulation; the long-duration bottleneck is temporal composition. Shader text authoring is neither required nor permissible.

    The UI should expose all axes in a persistent one-click inspector:
    - Stable name, description, current numeric value, range, reset, lock, and modulation source.
    - Slider plus exact numeric entry, with logarithmic or stepped mapping where appropriate.
    - Per-group reset/randomize and before/after comparison.
    - Undo/redo and deterministic snapshots.
    - 44px hit areas, keyboard access, reduced-motion behavior, and no hidden multi-click modal maze.

    A **world** should be an exact resolved snapshot. A **theme** should be a reusable authoring program containing stable kernel/version references, axis values or allowed ranges, palette policy, audio mappings, trajectories, transition rules, constraints, provenance, and immutable revisions. Axis references must use stable IDs rather than array positions. Every render-affecting version must participate in identity.

    Implement this with styled-components, Crystalline `var(--token,#fallback)` values, dark-first contrast, Dual-Button Glow where the paired action pattern applies, and components split below 300 lines. Do not introduce MUI or Recharts.

    **Do:** ship direct axis editing and theme save/name/version first. Add a timeline/score next. Defer arbitrary concurrent kernel layering until frame budgets and feedback-buffer semantics are solved.

  - **Q4 — Taste must be enforced as feasibility constraints and renderer priors, not added as another scalar fitness reward.** The current edge-spread reward can be maximized by exactly the corner-filled abstract noise the owner dislikes.

    Physicality should primarily come from reviewed grammar design: coherent fluid, wave, camera, material, lighting, and inertia models. Then enforce measurable rejection gates over time, such as minimum corner occupancy, maximum dead-zone duration, bounded flicker, temporal coherence, clipping limits, and frame-time budgets. Novelty selection should operate only among feasible candidates. The owner should be able to curate valid parameter envelopes into themes.

    If “taste” becomes a weighted fitness term, breeding will exploit its proxies: noise fills corners, edge density overwhelms composition, populations collapse around one measurable look, and valid sparse moments get suppressed. Changing weights merely moves the exploit.

    **Do:** convert objective requirements into hard gates, encode physicality in kernels, and keep subjective beauty as an owner veto and curated theme boundary—not a pretend numerical truth.

  - **Q5 — Spend the month on authorship and temporal structure, not more genome sampling.** Ranked by value per builder-week:

    1. **Production hardening — 0.25 week.** Remove all preset equation text and `new Function` from production dependencies; add a CSP without `unsafe-eval`; bind world IDs to kernel, schema, renderer, and palette versions; define deterministic feedback reset/warm-up; prohibit incompatible crossover.
    2. **Axis inspector and Theme v1 — 0.9 week.** Direct editing, exact values, locks, undo, save/name/version, provenance, and stable axis IDs. This directly serves the owner’s highest priority.
    3. **Deterministic temporal score — 1.2 weeks.** Parameter curves, event motifs, controlled scene transitions, audio mapping, reproducible seeds, reduced-motion alternatives, and cancellation of stale render/audio work. Target an authored 30–60 minute demonstration, not a dishonest 24-hour claim.
    4. **One polished, structurally disjoint physical grammar — 1.1 weeks.** Choose a grammar unlike feedback and ocean, give it kernel-specific structural controls, and enforce occupancy, temporal coherence, and frame-time gates. One convincing grammar is worth more than several recoloured feedback shaders.
    5. **Metric replacement and owner calibration — 0.55 week.** Fixed-palette structural clips, motion metric, occupancy/performance gates, offline embedding comparison, and a small pairwise owner-labelled benchmark. Use the result immediately to choose/reject grammar work rather than ending at measurement.

    **Cut:** further Surf/Breed polish, more natural-language commands, more shared-palette tuning, larger genome searches, production MilkDrop controls, arbitrary multi-layer composition this month, runtime ML, and any marketing claim of 24-hour non-repeat or Windows-Spotlight quality. Keep existing stochastic controls functional but stop treating them as authorship.

  - **Q6 — The likely false assumption is that long-form art is a large set of parameterized images.** It is a temporal composition problem. A viewer remembers causal motion, scene progression, tension, release, camera behavior, and recurring motifs; cardinality in genome space does not create those qualities. The system currently optimizes distances between samples while the owner is asking for authorship over an experience.

    **Do:** make the theme score—not the genome—the primary artwork. A genome becomes one state or motif inside that score.

  - Additional correctness failures:
    - The sampling protocol does not state clustering algorithm, feature normalization, audio stimulus, capture time, feedback warm-up, resolution, or readback synchronization. Two GPU runs are not enough to establish a stable acceptance threshold.
    - “Swan engine” sampling is ambiguous: the packet later describes 18 as belonging to one kernel, but §3 does not specify kernel allocation.
    - Farthest-first set-list ordering under a colour-heavy metric can alternate palettes while repeating the same grammar.
    - Rapid New World/Surf actions can leave stale animation loops, audio decoders, microphone streams, canvas readbacks, or GPU work unless prior operations are cancelled.
    - RTX 5090 smoothness does not establish portability. Measure p95/p99 frame time, shader compilation stalls, VRAM, and simultaneous preview cost on a declared lower-tier target.

- **Security**
  - Remove executable preset evaluation rather than attempting to sanitize equations. A sandbox is still contrary to the binding rule; use precomputed raster clips or descriptors for comparisons.
  - Enforce `script-src` without `unsafe-eval` and `connect-src 'none'` in production. Add CI checks rejecting `eval`, `new Function`, preset equation assets, and unexpected network calls.
  - Audio files are untrusted input. Cap size and decoded duration, handle decoder failure, cancel superseded loads, and avoid loading an entire giant file into memory. Stop microphone tracks visibly and immediately when input changes or the app closes.
  - Numeric-only genomes prevent direct shader-source injection, but bounds must also prevent pathological loop counts, texture allocations, NaNs, and GPU hangs.
  - A shareable hash is an identifier, not authorization. If server-side saved worlds or accounts are added, possession of a world ID must not expose private favourites or tenant data.
  - No backend, auth model, tenant model, or API is documented, so IDOR, SSRF, replay, and rate-limit protections cannot be approved. In the current local-only model they are mostly inapplicable, not proven safe.
  - No LLM or runtime network path is proposed, so the zero-PII-to-LLMs rule is satisfied by this review’s recommendations.

- **Data-truth / schema drift**
  - World identity must include `kernelId`, immutable kernel version/content hash, genome schema version, quantized values, palette-policy version, renderer version where output compatibility matters, and deterministic initialization policy.
  - Axes need stable semantic IDs. Positional arrays cannot safely survive insertion, reordering, renaming, or cross-kernel operations.
  - Saved worlds and themes require runtime validation and explicit migrations; malformed or older local-storage records must fail closed rather than reaching shader uniform uploads as `undefined` or `NaN`.
  - Descriptor vectors require a declared schema. The current 76-versus-64 dimension mismatch is already schema drift. Store descriptor version, capture protocol version, and normalization version with every cached value.
  - Changing the metric must invalidate and recompute saved set-list distances; otherwise ordering silently mixes incomparable vectors.
  - Frontend response-shape, SQL table casing, FK targets, and tenant scope cannot be checked because no backend schema or API contract is supplied.

## HIGHEST RISK
The executable MilkDrop preset path is the most dangerous item: remove preset equation assets and `new Function` from the production dependency graph before any further feature work, replace comparisons with precomputed clips/descriptors, enforce a no-`unsafe-eval` CSP, and add a CI prohibition. This is a cheap change that eliminates both arbitrary code execution and a direct house-rule violation.

## CONFIDENCE
I could not verify whether `new Function` is actually present in the shipped bundle or isolated to a benchmark, whether feedback buffers reset, what the world hash covers, whether Cross is kernel-restricted, or whether saved records are validated. Source for the preset loader, renderer transition path, hash function, crossover implementation, storage schema, build dependency graph, generated CSP, and production bundle would settle those points.

I also cannot infer the genome-space ceiling from an n=24 cluster table. Raw descriptors, sampled genomes, clustering code, feature normalization, standardized audio, warm-up protocol, captures, and accumulation curves would settle the statistical claims.

No source tree, package manifest, component files, accessibility audit, contrast report, or lower-tier GPU profile was supplied. Those are required to verify styled-components-only, no MUI, Victory-only charting, Crystalline variables, Dual-Button Glow, 44px targets, dark-first WCAG compliance, reduced motion, the 300-line limit, and hardware independence. The owner’s actual grammar-repeat threshold also remains unknown; a deterministic long-form prototype with timestamped owner repeat judgments would settle it and directly determine whether to add grammars or improve temporal composition.
