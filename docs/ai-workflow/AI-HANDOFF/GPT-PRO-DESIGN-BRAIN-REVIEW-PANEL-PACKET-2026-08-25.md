---
decision: Hostile-review the ChatGPT Pro deep-research review of the Swan Design Brain (taste discovery mechanism) with the six-seat panel before building; find gaps, better logic, and missing features.
status: open
supersedes: none
---

# Panel Packet — Hostile review OF the ChatGPT Pro review of the Swan Design Brain

- **Date:** 2026-08-25 · **Assembled by:** Claude Fable 5 (Final Decider) · **Board:** SWA-186 / SWA-55
- **Seats:** Ox Alpha · Grok 4.6 · Kimi K3 · DeepSeek V4 Pro · GLM-5.3 · Qwen 3.8 (local). Fable synthesizes.
- **Source under review:** ChatGPT Pro's answer to the prompt in `SWAN-DESIGN-BRAIN-TRANSCRIPT-CORPUS-AND-GPT-PRO-AUDIT-PROMPT-2026-08-24.md` §4 (branch `docs/design-brain-transcript-corpus-2026-08-24`). Read that handoff first if you need the corpus context (T1–T8 transcript digest, Midlibrary axes, taste-brain structure).
- **⚠ TRUNCATION:** the review reached the assembler cut at **Question 13** of §4 (a 50,000-character paste limit). §4 Q13+, the worked example, §5 (12 style suggestions), and §6 (action list) are **NOT in this packet**. Do not review what is absent; do flag what the missing sections must contain.

---

## 0. YOUR REMIT

You are reviewing a *review*. Two jobs, both mandatory:

1. **DESTROY.** Where is the GPT review wrong, overclaiming, under-evidenced, contradicting the Swan corpus it cites, proposing infrastructure that will never be built, or solving a problem Sean does not have? Rank by severity. Quote the claim you attack. Distinguish "wrong" from "unbuildable in Sean's context" (solo founder, one 5090, subscriptions not API keys, private repo, ~$2–3 per workstream spend ceiling).
2. **BUILD.** What did GPT miss? Better logic, better features, more features, gaps — grounded in what Swan is actually building: a design brain that lets `grill-me` **discover what Sean likes, then offer him style directions from the Midjourney brain**, for **websites, still images, and film**. Absence-first. Rank by value left on the table.

Then answer these specific questions:

- **Q1** GPT's build order is implicit. Give the *minimum* first build (what ships in week 1) that makes grill-me → taste brain → style suggestion real end-to-end, even crudely. What can be deferred (Bradley–Terry, active sampler, temporal QA) without blocking value?
- **Q2** GPT rejects the personification formula, rating², the 25% floor, "30→60 interpolation non-optional", "2–3 rounds", "~100× costlier", "creative is the heavy lifter" as universal law. For each: is GPT right, or is it attacking a claim the Swan corpus already scopes narrowly? Be specific — the corpus scopes "creative is the heavy lifter" to C13/awe surfaces and "2–3 rounds" to the variant tournament, not style learning.
- **Q3** GPT proposes one shared core + three media heads + project/brand overlay. Right architecture? Simpler alternative that still avoids the collapse-and-drift failure?
- **Q4** The visual comparison surface: GPT says generate 256–512px candidates and compare. Sean owns a 5090 with ComfyUI local + a taste-steered Midjourney prompter. What is the cheapest *real* comparison surface — Midjourney grids he already pays for, local SDXL/Flux, or curated Midlibrary reference images (copyrighted, cannot leave the machine)? Address the licence boundary explicitly.
- **Q5** The TasteEvent schema and the write rules for themes/rejected/loved-srefs/kept. Missing fields? Wrong separations? What breaks first in practice?
- **Q6** The grill sequence Q1–Q12 (Q13+ missing): are the questions the right ones, in the right order, with the right "words stop here → visuals" switch? What question is missing that would most change the outcome? What is the failure mode of "hide style names until after each choice"?
- **Q7** What must the truncated sections (worked example, 12 style suggestions, action list) contain for this to be buildable Monday — so Sean can demand it from GPT in the follow-up?
- **Q8** Anything else you noticed. Explicitly in scope.

Rules: cite the claim; `[HYPOTHESIS]` for speculation; do not claim a thing is absent from the *system* when it is merely absent from *this packet*; no Material-UI, no light-first, no vector RAG / knowledge graph where a markdown catalog does the job; IDs/roles only, no PII.

---

## 1. FABLE'S OWN READ (attack this too)

**Verdict on the GPT review: STRONG, with three structural weaknesses.** It is the best external read the brain has had — it found the real absence (no visual choice surface, no event store, no catalog resolver) and it correctly demoted several Swan heuristics from law to hypothesis.

**What it got right that we did not have written down:**
- P0-4 / Gap #1: *the judge function has no courtroom.* Text interviews cannot discover styles Sean has no words for. The first product is a **visual chooser**, not a better prompter. This reframes SWA-186.
- P0-5: the taxonomy is a legend without a map API — no stable IDs, no resolver. Correct and cheap to fix.
- P0-3 / P1-1 / P1-2: keyword +2/−3, rating², 25% floor are priors dressed as a model. Correct.
- Content vs style vs execution-quality vs brand-law as **four separate rejection outcomes** — this single separation prevents the most likely corruption of the taste model (a broken wildlife render teaching "Sean dislikes wildlife").
- "Unselected ≠ rejected; kept > pairwise win; shipped > kept" — the evidence hierarchy is right.
- The "words stop here" switch after six verbal questions, and hiding style labels until after the choice.
- P0-2's additional contradictions (motion speeds, 2240 vs 1280 content cap, index "no temporary files" vs DRAFT files, index says "aesthetic × era" vs taxonomy "SOURCE × QUALITY") — new, verifiable, embarrassing, fixable.
- Interpolation as a *branch under test*, not law — Swan's ice/water/caustics are exactly the artifact classes interpolators mangle. Fair.

**Where it is weak or wrong:**
1. **Straw-manning scoped claims as universal.** "Creative is the heavy lifter" is scoped in `field-techniques.md` to C13/awe surfaces and explicitly excluded from in-app surfaces (LAW 6); "2–3 rounds" is the *variant-tournament* cap, not style-learning; Midjourney's 5–10 Style Creator rounds and Swan's 3-round tournament are different loops. GPT's corrections are still useful, but P2-1/P2-2 are partly arguing with claims nobody made.
2. **Infrastructure appetite.** Append-only event store + contextual Bradley–Terry + active sampler with contradiction testing + provider-neutral GenerationSpec with media subcontracts + temporal QA with LoAF traces + drift detection. For a solo founder this is a quarter of work. The review never says *what ships first*. That is the panel's Q1.
3. **It never resolves the copyright boundary for the comparison surface.** The Midlibrary images are the obvious "adjacent discovery" candidates, and they cannot leave Sean's machine or enter git. GPT's 256–512px generated candidates dodge this but cost generations per comparison. Q4.
4. **Sequencing collision.** GPT puts `design-dialogue → grill-me`; Swan's constitution runs `grill-me → chromie → swan-orchestrator → swan-design-router`. Needs reconciliation, not a fourth interview skill.
5. **Small arithmetic:** 145/4,272 = 3.39% is GPT's figure; the taste packet's denominator was 4,029 *usable* prompts → 3.6%. My handoff quoted both numbers loosely; GPT's point stands either way.
6. **Provenance labels it could not verify.** GPT tags rating²/floor critiques as audits of the *documented* algorithm — honest — but it did not see `swan-taste-brain`, so the "quarantine agent placeholders" fix may already be partially done (`b36697e fix(taste): remove agent-written test data`). Panel should not re-flag it as open without checking the handoff.

**Fable's build-order instinct (panel: confirm or destroy):** Week 1 = (a) catalog index with stable IDs over the 223 SREFs + 407 handles + facets, (b) `events/<session>.jsonl` TasteEvent append-only log, (c) a 2-up/12-up **local** comparison page in the existing Prompt Studio server (127.0.0.1:7331) that shows *Midjourney grid outputs Sean already generates* plus local-only Midlibrary reference thumbnails, records A/B/both/neither/depends + one reason tag, and (d) grill-me "visual-taste mode" that runs Q1–Q6 then hands off to that page. Bradley–Terry, active sampling, media heads, temporal QA = later slices once ≥200 real events exist.

---

## 2. THE CHATGPT PRO REVIEW (verbatim as received; truncated at §4 Q13)

Swan Design Brain — Deep Research and Hostile Review

Evidence boundary. [VERIFIED] I read the exact handoff on docs/design-brain-transcript-corpus-2026-08-24, the six requested Design Brain files on main, and the adjacent files needed to test its claims: typography-grid.md, motion.md, qa-gates.md, grill-me, design-dialogue, package.json, the hook installer, and the token-discipline checker. The separate swan-taste-brain repository and raw Midlibrary corpus were not exposed through the connected GitHub account; the handoff itself says those materials live outside this repository. Therefore, my criticism of keyword scoring, rating-squared weighting, the exploration floor, and placeholder ratings is an audit of the documented algorithm, not a claim that I inspected its private implementation.

Labels used below:
[VERIFIED] directly supported by repository evidence or a primary source.
[LIKELY] supported by research or practice but not yet tested in Swan.
[HYPOTHESIS] a proposed mechanism or threshold that must be validated.

### 1. DEEP RESEARCH

#### 1A. State of the art in visual taste and preference elicitation

**The central research finding.** [LIKELY] A real personal taste model is not a list of adjectives and is not a keyword filter. It is a context-conditioned model learned from choices among visual examples. Research on interface and image preference repeatedly finds meaningful disagreement between people, making population-level aesthetic scores a weak substitute for personal data. Recent personalized design studies report better results from models trained on an individual's comparisons than from aggregate preference models, although several of these results remain preprints and should not be treated as final scientific consensus.

The practical consequence for Swan is decisive: themes.md + keyword matching can seed a session, but it cannot be the taste model. It is a verbal prior. The ground truth has to be the visuals Sean selected, rejected, kept, refined, or said were context-dependent.

**Pairwise comparison and two-alternative forced choice.** [VERIFIED] Pairwise comparison is a well-established approach for estimating latent preferences. Bradley–Terry models assign each item or feature combination a utility and model the probability that A is preferred over B. Elo can serve as a simpler online approximation. Adaptive sorting and pair-selection methods can reduce the number of judgments needed compared with exhaustively comparing every item.

For visual design, however, pure forced choice is too rigid. The interface should allow: A · B · Both · Neither · Depends on context. A required reason tag should follow each choice: light · composition · realism · material · palette · subject · typography · motion · pacing · density · other. That prevents the system from learning the wrong lesson. Sean may choose A because its lighting is better while disliking its composition. A system that records only "A won" will incorrectly strengthen every attribute in A. Research on contextual and feature-dependent preference shows why a single total ranking can fail: people may attend to different features in different contexts, and preferences may be non-transitive rather than forming one clean hierarchy.

**Bradley–Terry versus Elo versus active learning.** For a Monday-buildable prototype: use a regularized contextual Bradley–Terry model when enough structured facet data exists; use Elo only as a temporary online scorer, while preserving every raw judgment so the system can later be refitted; do not use a 1–5 rating as five levels of mathematically reliable utility; do not square ratings; do not assume every choice belongs to the same context.

A practical latent-utility model: u(i,m,p) = (w_shared + w_media,m + w_project,p)ᵀ x_i ; P(A≻B | m,p) = σ(u(A,m,p) − u(B,m,p)). Where x_i is a feature vector for the candidate; w_shared captures stable personal taste; w_media captures web, still-image, or film-specific taste; w_project captures temporary project needs. [HYPOTHESIS] This is enough for the first production version. A Gaussian-process preference model or more elaborate Bayesian system may later improve uncertainty estimates, but it is unnecessary before the raw event model, comparison UI, and feature labeling exist.

**Active learning.** [VERIFIED] Active preference learning selects comparisons that are expected to be informative instead of repeatedly showing items the system already knows Sean likes. Research variants include uncertainty sampling, projective queries, multi-outcome comparisons, best-of-k selection, and preferential Bayesian optimization. A good Swan sampler should balance four goals: Uncertainty (compare directions whose predicted utilities are close); Coverage (expose underexplored source categories and facets); Exploitation (occasionally show likely winners to produce useful output now); Contradiction testing (repeat or invert selected comparisons to detect context or inconsistency). This is superior to a permanent random-exploration percentage because the correct amount of exploration changes over time. Early sessions need breadth. Mature profiles need boundary tests and drift checks.

**Preserve rejected and unselected examples.** Midjourney's official Style Creator explicitly learns from both selected and unselected images across refinement rounds. Its documentation says that roughly 5–10 rounds may stabilize the general style and that additional rounds can refine details, directly contradicting any universal "stop after two or three rounds" rule. The important distinction: Unselected does not automatically mean disliked. Rejected means explicitly unwanted. Neither may mean both generations were poor. Depends means the preference belongs in a context rule. Kept is stronger evidence than a one-time pairwise win. Used successfully in a shipped artifact is stronger still. Swan presently collapses too many of these into ratings, keywords, or accepted/rejected files.

**Moodboards, profiles, SREFs, and visual reference workflows.** [VERIFIED] Midjourney currently separates several related mechanisms: personalization profiles (learned from image selections); moodboards (a broader visual aesthetic through curated images); style references (transfer visual qualities from reference images); style codes and weights (reusable or mixed directions); Style Creator (refines a style through repeated visual selection). This means the Swan equivalent should not force all visual memory into one file. It needs separate concepts:

| Concept | What it represents |
|---|---|
| Personal taste profile | Sean's stable visual preferences |
| Project moodboard | The temporary aesthetic of this project |
| Style reference | A specific visual influence used in one generation |
| Brand law | What SwanStudios permits or forbids |
| Kept artifact | A successful output worth reusing |
| Provider control | SREF, profile, LoRA, adapter, weight, seed, model version |

A personal preference is not the same as a brand rule. Sean can love wildlife documentary photography while Swan's product-surface canon still disallows literal animal imagery. The project and brand-policy layers must be able to override subject choices without erasing Sean's actual taste. design.md currently treats those as design-law restrictions, not personal preference.

**Flux, SDXL, and non-Midjourney equivalents.** The equivalent of Midjourney's SREF is not one universal mechanism. Closest controls: Style LoRAs; IP-Adapter (image-prompt conditioning through a decoupled attention path); InstantStyle-like methods (separate stylistic features from content); StyleAligned/shared-attention (consistency across multiple images); CLIP or other visual embeddings (useful as features or retrieval signals, insufficient alone as a taste model). Official FLUX training guidance emphasizes dataset quality, model-specific training, checkpoint monitoring, and overfitting control — reinforcing the need to preserve provider and model identity with every style asset rather than pretending an artist phrase or SREF is provider-neutral. A provider-neutral StyleReference therefore needs fields such as: provider · modelVersion · referenceAssetId · referenceType (sref | profile | moodboard | lora | ip-adapter | image) · referenceValue · weight · maskOrRegion · seed · promptHash · aspectRatio · contentSubject. The current Forge contract has no place for most of this.

**How human designers run style interviews.** Practitioner methods such as style tiles and moodboards work because they make visual assumptions discussable without pretending to be final page designs. They typically combine a small set of visibly different directions with adjectives, typography, color, imagery, and interface elements, then use the client's reactions to refine the brief. The reliable pattern: ask purpose and emotional-outcome questions → collect existing references and refusals → present a small but meaningfully varied visual set → ask what specifically caused each reaction → show controlled comparisons → test the emerging direction on realistic material → record rejected alternatives and why. That is much closer to design-dialogue → grill-me → visual comparisons than to a standalone questionnaire. The repository already has the first two text-based pieces, but no visual preference-learning stage between them and the router.

#### 1B. Craft standards for premium scroll-driven sites in 2026

**There is no universally best rendering architecture.** Choose the rendering mechanism based on what must respond to scroll.

| Mechanism | Best use | Main failure mode | Swan recommendation |
|---|---|---|---|
| Native CSS scroll/view timelines | Simple transforms, fades, masks, progress reveals | Uneven browser behavior, limited orchestration | Default progressive-enhancement option for simple scenes |
| GSAP ScrollTrigger | Complex pinned sequences, scene timing, scrub orchestration | Main-thread complexity and overuse | Use for genuinely choreographed multi-scene work |
| Lenis / smooth-scroll layer | Optional inertial feel | Native-scroll conflicts, platform caveats, a11y regressions | Never a baseline requirement |
| Scrubbed `<video>` | Compact photographic movement | Decoder seeking, keyframe cadence, reverse-scrub inconsistency | Test for short photographic journeys |
| Extracted frame sequence on canvas | Exact authored frame indexing and reverse control | Network, decode, memory, preload cost | Use when exact frame correspondence is load-bearing |
| WebGL/R3F | Real spatial depth, lighting, particles, procedural interaction | GPU cost, engineering cost, mobile fallback burden | Only when 3D/simulation is the actual experience |

Native scroll-driven animation is increasingly standardized through scroll and view timelines, and browsers can optimize some declarative animations more effectively than JavaScript scroll handlers; the spec is still evolving, so production use needs feature detection and a simpler fallback. GSAP ScrollTrigger provides robust scrub, pin, snap, velocity, and timeline orchestration — appropriate for complex authored sequences, not automatically superior for every fade. Smooth-scroll libraries remain optional; adding a smoothing layer solely because premium sites often have one is cargo culting.

**Frame sequence versus video scrub.** Frame sequence advantages: deterministic mapping from scroll progress to authored frame; reliable reverse movement; preload a local window around the current frame; easy keyframe screenshot verification. Costs: hundreds of images or a packed texture; bandwidth and decode pressure; memory spikes on mobile; responsive-resolution management. Video-scrub advantages: better compression, one asset, cheaper to host/cache. Costs: seeking depends on codec, keyframe interval, hardware decoder, browser; updating currentTime does not guarantee immediate display; reverse scrubbing may expose decode delays; requestVideoFrameCallback() helps coordinate with presented frames but does not make arbitrary seeking deterministic; WebCodecs offers lower-level access at substantially more implementation/compatibility cost. [HYPOTHESIS] Swan should prototype both approaches against the same eight-second plate and decide from real-device measurements, not doctrine.

**Interpolation: useful, not mandatory.** RIFE and FILM demonstrate capable neural frame interpolation; Topaz Video AI and DaVinci Resolve expose optical-flow/neural workflows. But interpolation can generate artifacts around thin structures, occlusion boundaries, water, high-contrast edges, caustics, particles, fast parallax — unusually relevant to Swan's ice, water, crystalline edges, and refraction language. Therefore "30→60 interpolation is nonoptional" is not a craft standard; it is one branch in a quality test. A 30 fps source can feel smooth when scroll mapping, decoder behavior, damping, and frame presentation are sound; a 60 fps interpolated source can feel worse with warped caustics or flickering edges. The acceptance gate should inspect both temporal smoothness and invented-frame integrity.

**Pacing standards.** The strongest part of the Scrollcraft material is not an exact duration or lerp constant; it is the rule that the user must have time to understand each event and that pacing will likely be the first revision class. A better pacing contract: each scroll beat names the information or emotion it reveals; the reveal has a minimum readable dwell region; fast scrolling may skip decorative interpolation but must preserve state truth; reverse scrolling restores a coherent prior state; pinned scenes visibly release; the page never traps wheel or touch input; the first viewport is compelling before the user scrolls; pace is reviewed on mouse, trackpad, touchscreen, and keyboard. Exact constants (0.085 damping, three-frame clamp) are implementation starting points, not canon.

**Mobile strategy.** "Mobile = autoplay loop by default" should not become universal law. Decision ladder: designed static poster for reduced-motion and constrained devices → short muted loop when atmosphere matters but control does not → tap-to-play tour when narrative sequence matters → reduced frame sequence only when direct scrub is central and measured viable → full WebGL only after real-device proof. A 9:16 crop should be art-directed separately; cropping a 16:9 plate is not a mobile strategy.

**Accessibility.** [VERIFIED] WCAG 2.2.2 requires pause/stop/hide for automatically moving content lasting >5s presented alongside other content; 2.3.3 (AAA) addresses animation from interaction; prefers-reduced-motion is a preference signal, not automatic compliance. For Swan: reduced-motion users receive the complete still composition; an auto-started tour >5s needs a pause/stop control; scroll-driven decorative movement disabled or substantially reduced on request; pause control keyboard-accessible; no content exists only at an animated intermediate frame; persistent scrim keeps text contrast valid across every frame; audio opt-in; progress not color-only. The current motion doctrine correctly requires CSS+JS reduced-motion gates and a still poster, but qa-gates.md does not explicitly test autoplay pause controls or animation-from-interaction behavior.

**Performance and measurement.** [VERIFIED] Core Web Vitals: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 — measured with real-user monitoring, not only lab Lighthouse. Scroll experiences also need custom temporal evidence: scroll-input-to-render latency; frame-time p95/p99; long animation frames (~50ms+); dropped/repeated-frame rate; video seek-to-present latency; reverse-scrub correctness; peak decoded-memory; first-poster display time; scene readability dwell. The Long Animation Frames API is a useful diagnostic direction but still developing; complement PerformanceObserver traces and browser tooling, do not replace them.

#### 1C. Interview → assets → build → self-verification in leading AI design tools

No one tool has solved a rigorous cross-media personal taste model. Midjourney leads visual preference refinement and reusable style controls; Figma Make leads rich design-file context, planning, live visual editing; v0 leads screenshot/context input, live edits, source diffs and reversibility; Replit Agent leads plan mode plus real-browser testing with visual evidence and replay; Swan Design Brain leads extensive doctrine, brand constraints, QA checklists. The best composite loop: intent interview → visual taste elicitation → reference and asset assembly → build → rendered and temporal self-verification → preference feedback and model update.

Swan presently has: a strong text interview (grill-me); a strong alternative-and-rejection dialogue (design-dialogue); a large design doctrine; a proposed Forge contract; spatial and accessibility QA checklists. It does NOT have: a visual preference event model; a visual comparison surface; a learned context-conditioned taste model; a deterministic catalog resolver; provider-native style-reference fields; a completed asset-generation loop; a temporal verification gate; a feedback loop that updates taste from shipped outcomes. That missing middle is the actual reason grill-me → taste brain → style suggestions does not work today.

**Settled versus contested:** visual examples necessary, adjectives insufficient — settled in practice · personal judgments matter because users disagree — strongly supported · pairwise/grid choice useful — strongly supported · reasons and context should accompany selections — strongly supported · active sampling saves judgments — supported, method contested · Bradley–Terry useful starting model — supported, not universally sufficient · a single total style ranking exists — contested · two or three rounds always enough — rejected · five to ten rounds always required — also rejected as universal law · named-artist wording is the best prompt form — unverified, provider-dependent · one flat model can serve web/stills/film — unlikely · one shared core + media heads — [HYPOTHESIS], architecturally strongest · 60fps interpolation mandatory — rejected · native CSS always superior to GSAP or vice versa — rejected.

### 2. HOSTILE REVIEW

Severity: P0 the intended system cannot reliably perform its stated job · P1 runs but outputs/learning materially biased · P2 a useful heuristic promoted into unjustified law · P3 documentation/status errors that compound agent confusion.

**P0-1. The canon claims mechanisms that do not exist.** Claim attacked: "This one makes it mechanically difficult to ship anything else." design.md itself says most previously named enforcement mechanisms were fictional (canon:contrast, the canon/ directory, several swan/* rules; its own crystallization protocol unfollowable), yet later sections speak as though those rules compile/lint/fail CI. README.md acknowledges the spacing/radius conflict and that no swan/spacing rule exists. package.json has since gained a prepare hook installer that deliberately does not fail installation when hooks are unavailable. The token checker scans a hardcoded set of seven directories and enforces raw-hex only — not spacing, radius, motion, typography, route manifests. Verdict: governance theatre that sometimes confesses itself then resumes. Required correction: a machine-readable enforcement inventory; every doctrine claim marked "lint/CI/generated/build error" must name an existing command and test; CI fails when a claimed mechanism cannot be resolved; else relabel REVIEW-ONLY.

**P0-2. The folder does not make four agents "draw the same picture."** Contradictory canonical values: design.md spacing 4,8,12,16,24,32,48,72,108,160,240 vs typography-grid.md 4,8,12,16,24,32,48,64,96,128; radii 20/12/999/24 vs 6/10/16/24/9999; design.md disallows a third motion speed vs typography-grid 120/200/320ms; design.md wide content cap up to 2240px vs typography-grid 1280px body ceiling. Index says no temporary files while field-techniques.md is DRAFT and style-taxonomy.md contains a DRAFT mapping; lists Forge among core though Forge labels itself PROPOSED; index says taxonomy is "aesthetic × era" while the taxonomy says "SOURCE × QUALITY." Verdict: agents can follow different valid-looking instructions and all claim compliance. Correction: one generated token source, one generated status manifest, one agent-load snapshot pinned by hash; satellites explain values, never redefine.

**P0-3. The "taste model" is a keyword filter with a flattering name.** Claim attacked: "filters by taste (keyword +2 / avoid −3)." Fails on synonyms, negation, metaphor, content-vs-style, context, medium, intensity, mixed references, unnamed attributes, project-dependent words. "Dark" could mean low-key lighting, crushed shadows, black chrome, grim subject, or palette. 145 subjects reached ≈3.39% of 4,272 (not 3.6%); arithmetic small, coverage failure not. Correction: keyword files are priors; learn from visual choice events with reasons, context, provider, model, reference, confidence.

**P0-4. There is no visual evidence loop.** Claim attacked: "Human taste is the judge function." The Forge contract's directions() produces only text and swatches, 2–3 directions, no previews to save money — incompatible with the stated purpose and with field-techniques.md (ten broad concepts, batch and select visually). Midjourney spends generation compute because selected and unselected images ARE the learning data. Verdict: the judge function has no courtroom. Correction: low-res comparison plates are a necessary learning expense; generate controlled 256–512px candidates, compare, promote winners.

**P0-5. The catalog cannot deterministically produce the promised suggestions.** style-taxonomy.md records counts but says individual style names are not captured and the Forge should "query" them — no query contract, resolver, stable IDs, or index. Forge expects a resolved styleAnchor string with no mechanism to look up a style, confirm it exists in the private corpus, retrieve example prompts, SREF/handle, copyright/export boundary, or translate to another provider. Verdict: map legend without a map API. Correction: small deterministic catalog index (JSON/SQLite) with stable IDs, facets, source category, provider compatibility, example refs, private/export status. No vector DB or knowledge graph.

**P0-6. Ground truth may be poisoned by agent-authored ratings.** Placeholder ratings still steer output. Correction: every rating/comparison carries source (sean | agent-placeholder | imported | inferred), evidenceEventIds, createdAt, context, confidence; only source:sean or explicitly confirmed imports train the production profile; placeholders quarantined, not down-weighted.

**P1-1. rating² converts noisy ordinal labels into fake precision.** 5 weighted 25× a 1; 56% more than a 4; ignores comparison count. Correction: old ratings = weak priors; new evidence = wins/losses/both/neither/context constraints weighted by confidence and count.

**P1-2. The 25% exploration floor is arbitrary.** Ignores profile maturity, uncovered facets, task purpose, model uncertainty, fatigue, provider cost, new-medium testing. Correction: exploration depends on uncertainty, coverage, drift, session purpose; keep a small contradiction-check rate; no universal percentage.

**P1-3. Midlibrary's two axes are retrieval axes, not a taste model.** QUALITY mixes mood, subject, content, mark-making, structure, register, color, era, genre — "Animals" is not the same kind of feature as "fine lines." Lacks value structure, light direction, lens/camera distance, spatial scale, material behavior, realism vs stylization, density, temporal pacing, camera movement, edit rhythm, typography, interaction feel, sound. Correction: keep SOURCE × QUALITY as the browsing surface; learn taste over a normalized multi-dimensional feature schema.

**P1-4. The mandatory personification formula is prompt superstition.** No controlled experiment across Midjourney/FLUX/SDXL/editing models; awkward for architects, sculptors, movements, materials, processes, multiple references, LoRA, image conditioning ("Tadao Ando's cast-concrete architecture depicting a dashboard"). Correction: named-person phrasing is an optional provider-specific adapter; canonical style representation is descriptive and structured (source ref, medium, register, light, palette, material, composition, camera, intensity, provider-native controls); compiler emits the personification form where experiments show it helps.

**P1-5. The 12-slot composer mistakes a prompt template for a generative model.** Slots are not independent (medium constrains optics; subject constrains composition; style changes materials; palette×light; abstraction vs literal optics). Missing: reference images, regional refs, LoRA/adapter IDs, profile IDs, SREF mixtures, camera movement, shot duration, edit rhythm, sound, layout, typography, motion behavior, interaction. Correction: keep 12 slots as the image-prompt explainability layer beneath a provider-neutral GenerationSpec with medium-specific subcontracts.

**P1-6. One flat taste profile cannot serve three media.** Sean may prefer minimal layouts but rich photography; slow films but responsive interfaces; wildlife in stills but no literal animals in product UI; high-contrast film light but readable value behind web text. Correction: one shared personal core, three linked media heads, project/brand overlay.

**P1-7. The QA system inspects frames but not time.** qa-gates.md lacks timeline/scroll-trace capture, seek latency, dropped frames, reverse-scrub correctness, LoAF, pause-control verification, autoplay duration, memory/decode, pacing at different input velocities. A keyframe contact sheet proves composition at sampled points, not the movement between them. Correction: temporal QA receipt with trace, recording, frame-presentation metrics, input-method results.

**P1-8. "No previews because previews cost money" optimizes the wrong expense.** Saves cents while spending Sean's time on abstract verbal discussion and raising the odds of an expensive wrong direction; Swan's own field techniques say converge on cheap stills first. Correction: budgeted, capped low-res preview generation is part of requirements discovery.

**P2-1. "Two or three rounds, then stop" is not a law** — a reasonable anti-rumination default for a scoped tournament, not a stopping condition for style learning (Midjourney documents longer sequences). Use as checkpoint; stop when evidence stabilizes.
**P2-2. "The creative is the heavy lifter" is context-specific** — a cinematic hero, yes; a SaaS product's scaffolding (IA, content truth, a11y, loading, responsive, interaction, data states, conversion, performance) dominates. Allocate by bottleneck.
**P2-3. "30→60 interpolation is nonoptional" is overclaimed** — compare original cadence with better mapping/encoding, interpolated, frame-sequence, video-scrub; promote what passes artifact and temporal gates.
**P2-4. "React convergence ≈100× costlier" is unsupported** — the direction is plausible, the number is theatre; replace with tracked data (concept minutes, preview cost, implementation minutes, reversals, accepted-output rate).
**P3-1. The corpus is visibly stale** — field-techniques DRAFT, stale T4 stub + completed T4, no T8; index says no temporary files. Land T8, remove stub, classify each technique adopted/conditional/rejected, make index status machine-generated.

### 3. ABSENCE-FIRST GAP ANALYSIS

| Rank | What does not exist | Quality loss | Money loss | Sean-time loss |
|---|---|---|---|---|
| 1 | Visual comparison and selection surface | Very high | High | Very high |
| 2 | Append-only, user-proven preference event store | Very high | High | High |
| 3 | Contextual personal preference model | Very high | Medium | High |
| 4 | Deterministic Midlibrary/SREF/style catalog resolver | High | Medium | High |
| 5 | Provider-native style-reference contract | High | High | Medium |
| 6 | Shared taste core plus web/still/film heads | High | Medium | High |
| 7 | Separation of content, style, generation quality, brand law | High | High | High |
| 8 | Active sampler with uncertainty and holdout testing | High | Medium | Medium |
| 9 | Provenance and placeholder-rating quarantine | High | Medium | Medium |
| 10 | Temporal visual QA and real-device telemetry | High | High | Medium |
| 11 | Drift detection and periodic recalibration | Medium | Medium | Medium |
| 12 | Machine-verifiable doctrine and freshness | Medium | High | High |

**The most expensive absence: no visual choice surface.** Without a contact sheet, pair viewer, or side-by-side tool, every downstream "taste" mechanism is speculative. Text interviews cannot discover styles Sean does not have words for, nor reveal that he likes a reference's lighting but dislikes its composition. The first usable product is a visual chooser, not a more elaborate prompter.

**No raw event store.** Minimum event:

```ts
interface TasteEvent {
  eventId: string; sessionId: string; timestamp: string;
  medium: 'shared' | 'web' | 'still' | 'film';
  projectId?: string;
  brandContext?: 'swan-product' | 'swan-marketing' | 'general';
  candidateA: CandidateSnapshot; candidateB?: CandidateSnapshot;
  response: 'A' | 'B' | 'both' | 'neither' | 'depends' | 'skip';
  reasonCodes: TasteReason[]; note?: string;
  confidence: 'low' | 'medium' | 'high';
  source: 'sean';
  leftRightRandomization?: string; repeatedPairId?: string;
}
```
CandidateSnapshot freezes provider, model, model version, seed, prompt hash, source hand, facets, references, aspect, content subject — otherwise preference change cannot be distinguished from model-version change.

**No content/style/quality separation.** A rejection can mean: dislikes the style; dislikes the subject; the generation is technically bad; the direction violates brand law. Separate outcomes, or a malformed image of a valid style teaches rejection of the style.

**One model or three?** One shared core + three linked media heads + project layer. Shared core: realism vs stylization, light-to-dark relationship, palette temperature, saturation, materiality, texture, scale, density, emotional valence, novelty, documentary vs decorative register, organic vs synthetic. Web head: layout asymmetry, typography, density, hierarchy, interaction style, scroll behavior, motion intensity, UI surface treatment, signature-moment preference, calm vs spectacle zones. Still head: subject, composition, lens, camera distance, DoF, light, rendering, surface detail, color grade, documentary credibility. Film head: shot grammar, camera movement, shot duration, edit rhythm, temporal lighting, narrative intensity, sound character, transitions, motion realism, sequence structure. Project/brand overlay: purpose, audience, campaign, surface class, brand laws, a11y requirements, available assets, budget, provider restrictions. One flat model collapses context; three disconnected models relearn and drift; linked heads preserve coherence.

### 4. DESIGN THE MISSING MECHANISM: THE TASTE DISCOVERY GRILL

**4.1 Where it belongs.** Do not create another general-purpose interview system. Flow: design-dialogue → grill-me visual-taste mode → Taste Discovery Grill protocol → visual comparisons → taste profile update → web/still/film direction outputs → Forge / design router → rendered verification → kept/rejected feedback. Suggested main-repo files: `design-brain/taste-discovery-grill.md`, `.claude/skills/grill-me/SKILL.md`, `style-taxonomy.md`, `forge-compiler-contract.md`. Taste-repo records: themes.md, rejected.md, loved-srefs.md, kept.md, taste-profile.json, events/<session-id>.jsonl, schemas/taste-event.schema.json, schemas/taste-profile.schema.json.

**4.2 Write rules.** themes.md stores positive concepts, not raw ratings (id, statement, dimensions with polarity, media applicability, contexts, evidence eventIds, confidence, source). rejected.md stores hard/soft/contextual refusals separately with dimensions, reason, contexts, evidence, source. loved-srefs.md: only an actual visual judgment may create/strengthen an entry (provider, modelVersion, status provisional|confirmed, per-medium contexts, pairwise wins/losses/both/neither, reasonSignals, confidence, evidence, source) — a text answer such as "I like cinematic work" must not create a loved SREF. kept.md stores successful artifacts (artifact ID, project, medium, why kept, which parts, provider/model/version, prompt/reference lineage, taste-event links, shipped?) — a shipped kept artifact outranks an early thumbnail win.

**4.3 Exact one-question-at-a-time sequence.**
- **Q1 Session context.** "Recommended: keep one shared taste core, but optimize today's session for one medium. Should we start with web, still imagery, or film?" Default: web first. Write: session metadata only.
- **Q2 Intended emotional result.** "Recommended: the viewer should feel quiet awe and credible power, not spectacle for its own sake. What should they feel in one sentence after seeing this?" Default: "I have entered something rare, real, disciplined, and larger than me." Write: provisional theme, scoped to medium+project.
- **Q3 Refusals before preferences.** "Recommended: lock the failure modes before choosing styles. Which current refusals are absolute, and which could work in a different context?" Lead with: template gloss, flat corporate stock, synthetic neon clutter, busy collage, reads-as-generated-first. Write: rejected.md hard/soft/contextual.
- **Q4 Realism boundary.** "Recommended: ~85% documentary realism and 15% restrained impossibility. Fully observed, subtly heightened, or openly stylized?" Default: subtly heightened documentary realism. Write: provisional shared realism preference; never convert the number into a literal weight.
- **Q5 Light and value.** "Recommended: dark value structure with one believable light source doing the visual work. Low-key, balanced, or luminous overall?" Default: low-key with one luminous focal event. Write: value, contrast, source-light behavior, glow restraint.
- **Q6 Scale and camera relationship.** "Recommended: alternate monumental scale with intimate material detail. Outside looking at something vast, inside the material, or moving between both?" Default: intimate macro → monumental. Write: composition, scale, camera-distance.
- **Switch rule — words stop here.** After Q6 the system says: "I have enough verbal direction to stop guessing with words. I'm switching to visual comparisons now. I will hide style names until after each choice so the label does not bias the result."
- **Q7 Orientation grid.** 12 images: 4 predicted fits, 4 adjacent discoveries, 4 deliberate contrasts; ≥6 SOURCE categories; ≥8 normalized quality dimensions; repeated subjects across styles. "Choose ≤3 that immediately feel closest, 3 that clearly miss, leave the rest neutral — and the main reason for each." Write: positives provisional; explicit misses → rejected; neutral stays neutral; unselected ≠ negative.
- **Q8 Controlled style pair.** Same subject/aspect/provider/composition/quality. "Judge the treatment, not the subject. A, B, both, neither, or context-dependent — and which one factor decided it?" No default winner. Write: one TasteEvent. Repeat through the controlled-comparison round.
- **Q9 Palette and material pair.** "Recommended: cool mineral depth, restrained ice light, rare warm metal rather than saturated multicolor. Which feels more like yours — because of color, material, or both?" Write: separate palette and material signals.
- **Q10 Content vs style test.** Same style on two subjects, then same subject in two styles. "Did you reject the subject, the style, the execution quality, or a combination?" Write: distinct contentPreference / stylePreference / generationQuality.
- **Q11 Motion and pace.** Short silent motion examples or storyboard strips. "Recommended: patient camera, readable scroll beats, one major transition. Still, patient, moderate, or intense?" Default: patient with one earned intense beat. Write: film and web-motion heads separately.
- **Q12 Typography and editorial voice.** Realistic hero/section compositions, not isolated specimens. "Recommended: disciplined modern typography for information with one restrained editorial italic beat. Which feels most authoritative without becoming cold?" Write: web head only unless film includes titles.
- **Q13 Signature phenomenon.** Three treatments of one impossible-but-believable event. "Recommended: choose one physical impossibility that still behaves as though light, ice, wa—" **[TRUNCATED HERE — remainder of Q13, any Q14+, the "done" criterion, the worked example against Sean's taste, §5 the 12 style suggestions, and §6 the 10-item action list were NOT received.]**
