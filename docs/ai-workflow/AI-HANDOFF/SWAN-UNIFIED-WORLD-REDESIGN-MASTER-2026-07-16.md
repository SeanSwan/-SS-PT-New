# SWAN UNIFIED WORLD REDESIGN — Master Build Order v2 (Gallery-First, Lens-Aware, Five Surfaces)

- **Date:** 2026-07-16 · **Author:** Fable (claude-fable-5), Final Decider · **Status:** AWAITING SEAN'S GO
- **Supersedes:** `MARKETING-TRINITY-REBUILD-HANDOFF-2026-07-16.md` §3 Phase 0 (the 3-direction ideation gate). Everything else in v1 — the ground-truth receipts, copy rules, claims-vs-reality audit, contact decomposition, hero asset fixes — remains binding and executes as **Build Track A** of this doc.
- **Commissioned by:** Sean (CEO), directive 2026-07-16 (second directive): do NOT pick one design blind. Generate a browsable gallery — **seven design candidates per surface** across FIVE surfaces (home page, user dashboard, client dashboard, trainer dashboard, admin dashboard) — all pulling toward ONE synchronous site-wide design language built from the Swan World Engine. Keep the trainer/client pages' current function ("I like the way they are now") but elevate their beauty to World Engine level. Use `chromie` and `grill-me` to sharpen direction. Keep the Smart Lens OS in the design DNA — the lens that adapts a page's style to what the page *does* — and upgrade the lens if the winning language needs it.

---

## 0. Mission

One world, five surfaces, zero blind picks. Produce a **design-language gallery** Sean can walk through like a showroom — seven complete candidate languages, each rendered as real browsable pages — then ratify ONE language and roll it across the entire site: marketing pages (Track A) and all four dashboards (Track B). The site must read as a single place: the home page's world flows into the user dashboard's world flows into the trainer's command center — same DNA, lens-modulated per surface job.

**The composition law (how the three systems stack):**

| Layer | System | What it owns |
|---|---|---|
| World | Swan World Engine (`worlds.md`, `techniques.md`, `psychology.md`, `experience-mode.md`) | Setting: atmosphere z-stack, light, particles, motion language, signature transitions |
| Structure | Existing page/dashboard architecture | IA, routes, section jobs — **preserved**; this program reskins and elevates, it does not re-architect working surfaces |
| Style | Smart Lens OS (`core/style-lens-os/v2/` + Swan adapters) | Per-surface style modulation as validated DATA recipes — orthogonal to worlds by design ("worlds are structural layouts; styles are Lens recipes") |
| Chrome | Crystalline Swan tokens + house kit (GlowButton, GlassCard, cinematic kit) | Buttons, text, glow, focus, cards — never world-overridden on brand/product surfaces (Palette Law A) |

**The licensing law (non-negotiable, from the World Engine's own architecture):** dashboards are PRODUCT surfaces — capped **M0–M3, Crystalline Swan chrome only, calm zones intact** (motion.md §4: data-reading lanes stay calm forever). The home page is a marketing surface — M3 default, M4 hero by Sean's per-page ritual. Any gallery candidate that violates this on a dashboard mock is disqualified at review, however beautiful.

## 1. Ground truth (verified 2026-07-16; RE-RECEIPT on fresh main at G0 — this wip branch is 668 behind)

- **Marketing trinity receipts, hero-asset gap (missing `Swans.mp4`/poster truth), copy-rule violations, stats contradictions, contact pipeline truth:** all in v1 §1 — still binding.
- **Swan World Engine:** live on origin/main (`7b228c460`) — 18 worlds / T1–T13 / psychology / M4 tier. `[VERIFIED]`
- **`swan-world-factory` skill:** exists on origin/main (`.claude/skills/swan-world-factory/`) — batch-generates N self-contained HTML experience sites into gitignored `experiments/world-factory/<date>/` with a gallery index, 3 hostile iteration passes per artifact, browser self-verification. Sean-initiated only (this directive initiates it, gated on his §8 go). `[VERIFIED]`
- **Smart Lens OS:** v2 engine at `frontend/src/core/style-lens-os/v2/` (recipeV2/compileRecipe fail-closed/whatChanged receipts), Swan adapters at `frontend/src/adapters/style-lens-swan/v2/` with 6 production surface manifests (logger, planner, schedule, clients, bootcamp, progress) + the Workout Design Lab as the try-on surface. Styles are data; "the reason SwanStudios NEVER looks old." Finish-pack: `docs/ai-workflow/brainstorms/lens-finish-pack-2026-07-14.md`. `[VERIFIED on main]`
- **Old concept gallery is stale:** the ~14 `DesignPlayground` homepage concepts (ArtDeco, Cyberpunk, MarbleLuxury…) predate the World Engine — Sean's "these designs are all older." They stay untouched (rule 34) and get a cleanup-candidate note; the new gallery replaces their role.
- **Dashboard canonical surfaces:** NOT yet receipted (this session receipted only home/about/contact). G0 produces rule-26 receipts for: user dashboard (`/user-dashboard` social home), client dashboard home tab, trainer dashboard home/Observatory, admin dashboard overview. Known anchors from main's recent history: `UserDashboard/components/ClientDashboardHome.*`, `client-dashboard/ClientHomeTab.tsx`, `trainer-dashboard/TrainerHomeTab.tsx` + `TrainerHomeObservatory*`, admin overview panels. Receipts before mocks — the gallery must mock the REAL layouts, not imagined ones.

## 2. The Lens Rule — surface job → design modulation (bake into every candidate)

Every candidate language must be presented as ONE world + FIVE lens moods, proving it can flex per surface without breaking coherence:

| Surface | Job (Product Core Loop) | Lens mood | Motion cap |
|---|---|---|---|
| Home `/` | Convert: clients join, trainers apply, community belongs | Full world AWE — cinematic acts, swan video hero (KEEP) | M3 (M4 hero by ritual) |
| User dashboard | Daily belonging + progress addiction: log → charts → streaks → share | World as warm ambient home; celebration beats on milestones | M2–M3 accents; calm feed lanes |
| Client dashboard | Motivate + make logging/progress effortless | Quiet world atmosphere; progress-proof moments get the glow | M2; charts/data = Arctic Cyan data-only law |
| Trainer dashboard | Coach speed: client truth, fast logging, plan adjustments | "Command center" read of the world — density, precision, zero friction | M1–M2; calm zone |
| Admin dashboard | Business truth: who trained, what's stale, what to celebrate | The world at its most restrained — authority, clarity, intervention-first | M1; calm zone |

Function preservation law: Sean likes how trainer/client pages WORK today. Track B changes surfaces' skin, atmosphere, and polish — never their IA, data truth, tab structure, or interaction contracts without a separately-approved slice.

## 3. Phase G0 — Grounding (grill-me + chromie + receipts, before any generation)

1. **Fresh branch** off origin/main; re-verify v1 §1 receipts; produce the four dashboard receipts (§1 last bullet); read `swan-world-factory/SKILL.md` + lens finish-pack as executing doctrine.
2. **`grill-me` (short, batched):** extract Sean's taste vector BEFORE generating — 6–10 questions max, one at a time, checkpointed to `docs/ai-workflow/brainstorms/unified-world-gallery-<date>.md`: prior design loves/hates (which DesignPlayground concepts ever felt right? what does "beautiful" mean — atmosphere vs luxury vs energy?), per-dashboard non-negotiables, motion appetite on dashboards, dark-luxury vs warm-community bias per audience.
3. **`chromie` pressure-test the BET (not the aesthetics):** is a site-wide visual unification the highest-value move right now vs. Marketing Command Center? Spec the win condition (conversion lift, retention feel, brand memorability), 3 ways it fails (35 concepts of schema-compliant blandness; dashboards getting prettier but slower; a language that sings on marketing and dies on data density), absence-first gaps. Chromie's verdict shapes wave sizing, not whether Sean gets his gallery.
4. **Candidate roster locked (7 languages, ≥4 families, all Law-A-capable on brand surfaces, one mandated restrained entry).** Pre-seeded from `worlds.md` — Sean may swap any at G0:
   1. **Glacier Cathedral** — the engine's gold exemplar; aurora/ice luminosity; natural swan-DNA evolution
   2. **Chrome Sovereign** — penthouse-at-dusk luxury; Sapphire+Gilded Fern native; the golf-client magnet
   3. **Evergreen Dominion** — canopy mist + god rays; warm, alive, community-forward
   4. **Alpine Apex** — summit light, ascent structure; progress-metaphor native (XP/altitude counters)
   5. **Webb Deep Field** — Swan-tinted cosmic scale; makes progress metrics feel inevitable
   6. **Cascade Vault** — water-as-light, descent journey; the boldest natural pick
   7. **Archive Editorial** — museum-grade restraint; typography-led; the mandated calm proof that the engine isn't just maximalism
5. Per-candidate one-line lens sketch written BEFORE generation: how this world whispers on the admin page (the hardest test — a language that can't go quiet is disqualified early, before spend).

## 4. Phase G1 — Gallery Wave 1 (the anchor render)

Run `swan-world-factory` protocol: **7 artifacts — one per candidate language — each a complete HOME PAGE** (self-contained HTML, real copy direction from v1's voice rules, swan-video hero slot with poster stand-in, full B2 four-act arc, scene ledger + psychology receipt in the file header) **PLUS, embedded in the same artifact, a five-panel "lens strip"**: one representative screen-region mock per dashboard (user/client/trainer/admin) showing exactly how this language lands on real dashboard layouts (from the G0 receipts) at their §2 motion caps. Factory discipline applies: 3 hostile iteration passes per artifact, Playwright self-verification (scroll-0 + act boundaries + 414px + reduced-motion), console clean, gallery `index.html` with world/technique/psychology credits. Output: `experiments/world-factory/2026-07-16-unified/` (gitignored — propose the ignore line, Sean approves).

Why home anchors the wave: it's the surface with the widest expressive range; a language that wins at full volume AND shows a credible whisper (the strip) earns dashboard spend.

## 5. Phase G2 — Sean's showroom review (grill-me capture)

Sean browses the gallery. `grill-me` captures reactions per candidate — keep/kill/steal-this-element — one question at a time, checkpointed. Output: **2–3 surviving languages** + a stolen-elements list (Sean may want candidate 2's cards inside candidate 1's world — that's a legal merge, the factory synthesizes it as a hybrid entry in Wave 2). Zeigarnik note for the review doc: record WHY each loser lost — that taste data feeds every future design task.

## 6. Phase G3 — Gallery Wave 2 (dashboards at full depth)

For each surviving language (2–3, incl. any hybrid): **four full-page dashboard artifacts** (user, client, trainer, admin) — real layout fidelity from the receipts, representative data SHAPES (never invented member stats presented as real — mock data clearly labeled `SAMPLE`), calm-zone compliance demonstrable (a reviewer must be able to read a chart, scan a client list, and find the intervention queue with zero atmosphere interference). Each artifact carries its lens-recipe sketch: which parts of this look are expressible TODAY as a `RecipeV2` on the six gated surfaces vs. which need chrome/world-layer code vs. which need a **lens extension** (new `SurfaceCapabilityManifest`s for dashboard-home surfaces — flagged as its own Track B slice, additive-only per the finish-pack laws). Wave 2 total: 8–12 artifacts. Then the final pick: Sean ratifies ONE language (with stolen elements folded in).

**Coverage math vs. Sean's literal ask:** every one of the five surfaces is seen in all 7 languages (Wave 1 home renders + lens strips) = "seven designs per page," and the finalists get full-depth dashboard renders where the real judgment happens. **Option B (literal-max):** run all 7 languages × 4 dashboards full-page in Wave 2 (28 + 7 = 35 artifacts) — available if the strips don't give Sean enough signal; roughly doubles generation spend. **Recommended: waves (Option A).** Sean chooses at §8.

## 7. Phase G4 — Ratification, then the two build tracks

1. **Ratify:** `chromie` hostile pass on the WINNER (not the bet this time — the language: where does it go tacky, what's the anti-cheese line site-wide, what fails at 320px, what fails after 6 months of content growth). Triangle review (Tier 2) of the winning direction package. Fable arbitrates. Record: chosen world, per-surface lens moods, M-tier per surface, M4 hero verdict, component-kit rulings (GlassCard/SheenCard per v1 §11.2).
2. **Track A — Marketing Trinity build:** execute v1 handoff Phases 1–7 in the ratified language (foundation chrome/SEO/stats-truth → home → copy tournament → about → contact → claims-vs-reality audit → QA/closeout). v1's §11 decisions (stats truth values, testimonials real-vs-illustrative, 24h promise, meta-"AI") get answered before its copy phase.
3. **Track B — Dashboard world-alignment (one slice per dashboard, in this order):**
   1. **User dashboard** (the social home — Sean's "that's gonna be the social media site"): world ambient layer, card/chrome elevation, milestone celebration beats, feed lanes calm.
   2. **Client dashboard**: progress-proof glow moments, logging flow polish, chart surfaces untouched in data-truth (real logs only, Victory only, Arctic Cyan data law).
   3. **Trainer dashboard**: command-center read — density and speed PRESERVED, beauty added in surfaces/edges/transitions, never in the interaction path.
   4. **Admin dashboard**: most restrained pass; intervention-first hierarchy sharpened while reskinning.
   Each slice: rule-26 receipt refresh → reskin via (a) lens recipes where surfaces are gated, (b) world atmosphere layers + house chrome elsewhere → per-slice hostile review (rule 61) → responsive matrix spot-check (320/414/768/1440/2560) → role-based smoke (user/client/trainer/admin sessions) → tests extended never forked (finish-pack law). **Lens extension slice** (new dashboard surface manifests) runs first within Track B IF the ratified language needs it — additive-only, `labRecipes.ts`/`surfaceManifests.ts` carve-outs only, style-#N pipeline discipline.
4. **Track C — Full public-surface rollout (added by Sean 2026-07-16):** after Tracks A and B prove the language, the SAME ratified world rolls onto the remaining public surfaces so the whole site reads as one place. No new concept galleries — these inherit the winner, each as its own receipted slice:
   1. **Store page** (`/shop` storefront) — browse/showcase area may carry the world's full marketing voice (SheenCard/GlowButton showcase treatment per the Swan Card standard); **cart/checkout stays product-surface calm (M0–M2)** — money paths get zero atmosphere interference and zero behavior changes (money-path tests are the gate).
   2. **Photography page** (`/gallery`) — showcase surface; the world may sing here (it's an art surface), but the photographs remain the heroes: world atmosphere frames, never competes.
   3. **Video library page** (`/video-library`) — showcase surface; same law: world frames the content, playback/browse ergonomics preserved.
   4. **Waiver page** (`/waiver`) — legal/utility surface: quietest possible world tint (M0–M1), maximum legibility, zero friction added to signing; legal copy and flow untouched.
   Contact is already covered in Track A. Slice order within Track C: store → photography → video library → waiver (revenue first).
5. **Batch cadence:** commit per slice, push ONCE per track batch (Rule 70); rule 48 audit record per track; rule 41 closeout per slice.

## 8. Decision points for Sean (recommended defaults in bold)

1. **Wave option:** **A — waves (7 home + strips → cull → finalists × 4 dashboards full)** vs. B — literal 35 full pages up front (~2× spend).
2. **Candidate roster:** approve the §3.4 seven, or swap entries (any `worlds.md` world; hybrids allowed at G2).
3. **Generation spend acknowledgment:** a factory run at Wave-1 scale is 7 artifacts × 3 iteration passes + verification — a heavy token day even at Tier-2-free review. Say go knowing that. (Option B roughly doubles it.)
4. **Dashboard motion appetite:** confirm the §2 caps (M2–M3 user, M2 client, M1–M2 trainer, M1 admin) or adjust before generation.
5. **Lens extension appetite:** if the winner wants dashboard-home lens gating, approve that Track B slice concept now-in-principle or defer to when the sketch exists. **Recommend: decide when the Wave-2 sketches show what's actually needed.**
6. Carry-over v1 decisions (stats truth values, testimonials, 24h promise, meta-"AI", card standard) — needed before Track A copy phase, not before the gallery.

## 9. What NOT to do

- Do NOT let any candidate ship a Law-B palette or Galaxy-Swan token on a brand/product surface — Law A everywhere in this program; Law B belongs to factory experiments outside Swan chrome.
- Do NOT relax M0–M3 caps or calm zones on ANY dashboard mock or build slice — a gorgeous admin page you can't read is a disqualified admin page.
- Do NOT re-architect dashboard IA, tabs, or interaction contracts under the banner of beauty (function preservation law, §2).
- Do NOT present invented member data as real in mocks (label `SAMPLE`); do NOT bake mock numbers into build slices (data-truth rule).
- Do NOT touch the frozen Lens OS core (`LensPlanFrame.tsx`, `recipeV2.ts`, compile pipeline) — extensions are additive-only via the sanctioned carve-outs.
- Do NOT touch orphaned variants or DesignPlayground concepts (rule 34; cleanup is a separate proposed pass).
- Do NOT fire the factory before Sean's go on §8.1–8.3 — factory runs are Sean-initiated by skill law.
- Do NOT "improve" adjacent doctrine files while extending the lens or router (Karpathy surgical rule; rule 37).

## 10. Acceptance criteria (program-level)

- [ ] G0: dashboard receipts produced; grill-me taste doc checkpointed; chromie bet verdict recorded; roster locked with Sean.
- [ ] Wave 1: 7 self-contained home artifacts + 5-panel lens strips, each with scene ledger + psychology receipt, 3 hostile passes logged, Playwright-verified (414px + reduced-motion included), gallery index browsable, output gitignored.
- [ ] Wave 2: finalists × 4 dashboards at layout fidelity with calm-zone proof + lens-expressibility sketch per artifact.
- [ ] Ratification: winner recorded with per-surface lens moods, M-tiers, kit rulings; chromie anti-cheese pass + triangle review done; Fable verdict logged.
- [ ] Track A: v1 acceptance checklist fully green (incl. claims ledger, credential/AI-branding fixes, stats truth module, hero poster).
- [ ] Track B: four dashboard slices shipped with function-preservation evidence (interaction contracts + tests extended, role smokes green), responsive spot-checks archived, lens extensions (if any) additive-only and gate-tested.
- [ ] Track C: store/photography/video-library/waiver reskinned in the ratified language (store checkout + waiver flow behavior byte-equivalent, money-path tests green).
- [ ] Site coherence proof: one final pass screenshotting home → store → gallery → video library → user → client → trainer → admin in sequence at 414px and 1440px — a stranger should say "same place, different rooms."
- [ ] Rule 48 audit records per track; ONE push per batch; production smoke after each deploy.

---

*Fable-fidelity note: 35 concepts is where taste goes to die — schema-compliant blandness at scale is the #1 failure mode of this program. Every artifact must have ONE decisive, opinionated move a reviewer could describe from memory an hour later. If a candidate's home page and its admin strip could have come from different products, the candidate fails the mission regardless of beauty. And the anti-cheese lines in `worlds.md` are binding on every artifact — a Glacier Cathedral that's just frosted-glass everywhere is not Glacier Cathedral.*
