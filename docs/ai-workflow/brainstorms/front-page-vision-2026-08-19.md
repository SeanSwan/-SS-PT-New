# Front Page Vision — DEEP GRILL (Sean)

- **Status:** in-progress
- **Date opened:** 2026-08-19 · **Agent:** Claude Opus 5 (Fable-tier)
- **Worktree:** `c:/tmp/sspt-atelier-studio` · branch `feat/front-page-atelier-run`
- **Predecessor:** `docs/ai-workflow/AI-HANDOFF/SESSION-HANDOFF-ATELIER-FRONT-PAGE-2026-08-19.md`
- **Why this doc exists:** Sean, verbatim — *"We're gonna have to have it grill me again and ask me questions on how I want it. I'm gonna have to go deeper — it's not getting deep enough."* The 2026-08-18 four-question brief is the FLOOR, not the ceiling.

## Summary
Deep interview to establish what the SwanStudios front page IS, what it must make a stranger
FEEL, and what "community-first" looks like visually — before any of the seven designs are
rendered. Vision tier first, pixels last.

## Ground truth established before asking (rule 49 — explored, not asked)
- Live page = `frontend/src/pages/HomePage/components/HomePage.V4.tsx` (121 lines), mounted at `/`.
  14 sections in order: Hero · PrismCapture · EvidenceLensBand · Mission · Trainers · Arsenal ·
  Programs · Golf · About · Testimonials · Stats · Social · Newsletter · CTA.
- Icons today: `lucide-react` (stock set) across HomePage components.
- Copy: `scripts/design-brain/atelier/frontpage/copy-pack.json` — VERBATIM from the live page, approved voice.
- `Swans.mp4` = `VIDEO.swans` in `HeroSection.tsx:116`. KEPT, always (standing law).
- **MiniMax H3 (Hailuo 3) status: GRANTED + LIVE.** `[VERIFIED 2026-08-19` by reading machine env, not a doc`]`
  `SWAN_VIDEO_LICENCE_GRANTS=comfyui/minimax-h3` (Windows User scope) ·
  `SWAN_VIDEO_PROVIDERS_ENABLED=comfyui/minimax-h3,comfyui/wan-2.2`.
  MiniMax approved Sean's request 2026-08-17; licensing doc header reads GRANTED.
  Local-on-5090 = zero marginal cost. Provider registry already existed — it was a registration, not a rewrite.
  **AGENT ERROR TO NOT REPEAT:** I re-reported this as "drafted + unsent" from the 2026-08-15 master handoff
  without checking the 2026-08-17 licensing doc or the machine. Sean had already told me. That is the
  stale-blocker failure (`feedback_stale_check_reverify_before_repeating`) — re-verify a blocker before repeating it.
  Only live constraint: the words `"MiniMax H3"` must appear somewhere in commercial product UI (a credit line —
  it restricts nothing about the OUTPUT, which is Sean's). Design decision for the footer, gates nothing.
  Owed by Sean (bookkeeping, non-blocking): file the approving email's sender/date/case-number into
  `docs/ai-workflow/AI-HANDOFF/MINIMAX-H3-LICENSING-REQUEST-2026-08-11.md` so `grantRecorded: true` is evidenced.

## New scope Sean introduced this session (not in the handoff)
- **The custom-asset lane.** Sean: *"I want to utilize the home page video that we already have — the swans"* and
  *"we have a MiniMax H3 setup that I was planning on using to create footage of other videos too, and to give us
  other ideas and props… we can use MiniMax H3 to make icons and all kinds of different stuff."*
  *"I'm trying to make everything as customizable as possible. We can use placeholder icons, but we should have
  ideas for building what the icon [should] do to make the site even more original and homey… unique."*
  *"All the icons and the text is gonna be very unique and beautiful, marvelous, professional… to really make this
  site unique, beautiful, and pop."*
- **Consequence for the seven-design run:** placeholder icons are allowed in artboards ONLY if each carries a
  written generation brief (what the bespoke asset would be). No naked stock icon ships as a final answer.
  This is the icon analogue of the copy-is-material law.
- **Explicitly NOT used:** Higgsfield ("we don't use [it]"). MiniMax H3 is the asset engine.

## Key Decisions

### D1 - MiniMax H3 credit line: minimal, footer, but legible (Sean, 2026-08-19)
Sean: *"that's not a problem to put that MiniMax H3 somewhere on the product UI. Let's just make it as small as
possible, then the minimal as possible - just enough to be able to make sure we're following the rules."*
**Decision:** one line in the footer credits, normal footer text size, e.g.
`Motion and iconography generated with MiniMax H3.`
**Constraint the design must respect:** the licence word is *"prominently displayed."* Minimal is fine; HIDDEN is not.
Do NOT shrink below normal footer body size, do not gray-on-gray it, do not bury it in a tooltip/modal/collapsed
accordion. Small-but-normal complies; small-and-hidden is the only version that risks non-compliance.
**Not a constraint:** the generated output itself is Sean's - this restricts nothing about how the assets are used.

### D2 - THE PAGE HAS THREE AUDIENCES, NOT ONE (Sean, 2026-08-19) - MAJOR, reshapes everything upstream
Sean, verbatim: *"We also can't forget that this is a social media site too as well. And insight where I'm trying to
get other trainers who want to join this site so they can utilize the tools to train their clients, and they can sell
to training packages. I'll just take ten percent from all the things they sell, but they have an excellent platform to use."*

**What this establishes:**
1. SwanStudios is a **two-sided marketplace**, not a single-trainer studio site. Supply side = independent trainers.
2. **Business model is now explicit and page-relevant: SwanStudios takes 10%.** The trainer keeps 90%.
3. It is **also a social/community platform** - the social layer is a first-class product, not a bolt-on.
4. Therefore the front-page "stranger" may be a **trainer**, a **trainee**, or a **community member**. Three doors.

**Why this retroactively explains the copy pack (important - the manifesto is not just ideology, it is the pitch):**
`"We're not here to extract value from you"` and `"Built by a trainer. Owned by the community"` read to a TRAINEE as
"this app won't sell my data." They read to a TRAINER as **"this platform won't take 30-40% of my income like the
others do."** The same manifesto is simultaneously the demand-side trust story AND the supply-side economic pitch.
That is why the wording felt right to Sean and why inventing new copy broke it.

**Design consequences the seven-design run MUST inherit:**
- The `10%` number is arguably the single most persuasive fact on the page. A number is what makes an
  anti-extraction manifesto credible instead of rhetorical. Candidate for headline-grade placement.
- The inherited CTA conflict is now a THREE-way problem, not two: `Join the Community` / `Find a Trainer` /
  *(missing)* a trainer-recruitment door. The 2026-08-18 "book a consultation" answer addressed none of these.
- Marketplace liquidity note: each recruited trainer arrives with an existing client book. Supply-side acquisition
  is the leveraged move; a trainer is worth far more than a single trainee. This argues AGAINST burying the
  trainer door in a footer.

### D3 - AUDIENCE: one story, two EQUAL doors (Sean, 2026-08-19) - ANSWERED
Sean picked option 1 over trainee-first, trainer-first, and top-of-page fork.
**Locked:** the manifesto is the shared spine (it argues to trainee AND trainer simultaneously); the page leads
with feeling/conviction; it forks LATE into `Find a Trainer` and a trainer-recruitment door at **equal weight**.
All seven designs inherit this. No design may bury the trainer door in a footer line.

### D4 - TAKE RATE: Sean proposes 15% (was 10%) - PENDING his final call
Sean: *"the 10% might be 15% because we have to keep it realistic. I have to pay for stuff too... My whole goal was
to keep it cheaper than everybody else so that it would promote and attract trainers that wanna join my site
because it's one of the cheapest options, if not the cheapest. I'm thinking 15% was the best route to go, right?"*
**Agent analysis given back to Sean (his call pending):** 15% is sustainable and defensible. BUT the "cheapest"
claim is only true at LOW volume, because the real competition for a trainer's wallet is FLAT-SUBSCRIPTION software
(Trainerize / TrueCoach / Everfit, roughly $20-250/mo), not other rev-share platforms. At Sean's own $175/hr price,
15% = $26.25/session; a trainer billing $10k/mo pays $1,500/mo - far MORE than any subscription competitor.
Flat rev-share is cheapest for the beginner and most expensive for exactly the high-volume trainer Sean most wants.
**Recommended structure:** 15% with a monthly CAP (or tiered decay), plus absorbing Stripe's ~2.9% so the pitch is
all-in. Framing that beats subscription on RISK, not just price: *"No monthly fee. No setup fee. We only make money
when you do."* Confidence: `[LIKELY]` on competitor pricing (from general knowledge, not verified this session);
`[VERIFIED]` on Swan's own $175/hr from CLAUDE.md.

### D5 - PRODUCT SUBSTANCE the page must actually show (Sean, 2026-08-19)
Sean: *"It's a social media site. My biggest thing is I have the Swan Coach, which analyzes all your data. And then
from there, it builds workouts WITH THE TRAINER based off of your goals and everything you want and all your training
data. And then we do our programs - if you want strength training, power, weight loss, all that, we create programs
specifically based off of what the client's needs are and what our goals [are]. And we create charts that show this
information, and we're able to save this on the charts. We're able to save this information onto the social media
site where everybody has their own login and their own page and everything with all their feed."*
**The actual product loop, in Sean's words:** data in -> Swan Coach analyzes -> Coach + TRAINER co-build the workout
-> goal-specific program (strength / power / weight loss / etc.) -> charts from real logged data -> saved -> shared
to the member's own page + feed on the social layer.
**Front-page consequence:** this loop IS the demo. The page should SHOW the chain, not list features. Note the
trainer-indispensability doctrine holds - Swan Coach builds *with* the trainer, never replacing them.
Note also: never call it "AI" user-facing (branding rule) - it is Swan Coach.

### D6 - THE RUN IS N=8, SPANNING THE VOLUME AXIS (Sean, 2026-08-19) - supersedes N=7
Sean: *"I want you to do both options for me. I want to see what both look like... I have a seven. We can split it
between the sevens. Let's make eight instead of seven, with different lighting ranges, and then we'll go ahead and
split in between the full cinematic and quiet and all."*

**Locked run parameters:**
- **N = 8** (supersedes the handoff's N=7, which itself superseded the R-1 default of 4/5). Do not re-litigate.
- **Primary axis = VOLUME of the swans moment**, spanning the four poles Sean was shown:
  quiet-awe-with-warmth <-> people-first-welcome <-> product-forward <-> full-cinematic-scroll-bound (C13).
  Sean refused to pick one pole; he wants to SEE the range and choose from rendered evidence.
- **Secondary lever = LIGHTING RANGE**, varied deliberately across the eight (warm amber-in-blue, cold crystalline,
  dawn, dusk, deep night, etc.). This is Sean's own lever and connects directly to his "homey" requirement.
- **C13 is BACK IN SCOPE** as an explicit option. The 2026-08-18 "ONE threshold moment, not full C13" call is
  now superseded FOR THE PURPOSE OF THE COMPARISON - Sean asked to see the cinematic end rendered.
- Canvas layout: 4+4 across two pages. Eight artboards are not legible at one zoom (tradeoff surfaced to Sean, accepted).
- UNCHANGED laws that still bind all eight: same plate pack, same copy pack (copy-is-material, verbatim from
  `copy-pack.json`, invented lines tagged `[new copy - needs Sean approval]`), fingerprint hard gate (collision = HALT),
  captions carry mandatory tradeoffs, `Swans.mp4` KEPT always, HomePage.V4 untouched until a winner is approved.
- Design peers GLM-5.3 + Kimi K3 still contribute concept directions as creative peers (Sean's standing directive).

### D7 - THE REAL VISION: A LIVING WORLD, AND THE SWAN IS PERSONAL (Sean, 2026-08-19) - NORTH STAR
Sean, verbatim (condensed, full text in Q&A log): *"I wanted to originally develop a macro world, a world where you
can see a living city of people, kind of like The Sims, but not The Sims... a living world that you look into and see
people doing the different things that this app talks about... more parallax backgrounds, more animated sections with
video as you scroll, more animations, but subtle, not too much that breaks the system... beautiful and polished...
scroll-animated backgrounds... let's make it look digital and animated. I was kind of thinking of a Las Vegas theme
where things are kind of the living lights type deal."*

**THE SWAN IS NOT A LOGO CHOICE - IT IS IDENTITY.** Sean: *"the Swans are the theme. My last name is Swan. First name
is Sean, last name is Swan. It also represents the Chickasaw tribe, too, because they're Swans, and that represents me
too, as a part of me."* Recorded verbatim, un-embellished. Design consequence: the swan motif is AUTHENTIC heritage
plus family name - never treat it as decoration, a mascot, or a gimmick. This is the single most defensible
originality asset on the site; no competitor can copy it. Handle with respect and restraint.

**Other asks in the same answer:** luxury but for everybody · use the existing colors/theme · look at Swan Lens
(done, below) · GLM-5.3 + Kimi-K3 must run a HOSTILE REVIEW and produce BLUEPRINTS - wireframes, flowcharts, mermaids
(escalates their role beyond the handoff's "concept directions") · use the ChatGPT image maker to generate ~30 prompts
for backgrounds in the "Microsoft Windows photographer/spotlight" register (cities, animals, ultra-professional).
UNRESOLVED dictation garble to confirm with Sean: *"A squirrel and I made on the squirrel"* - meaning unknown.

### F1 - REPO FINDINGS (explored, not asked - rule 49) - THE MOST IMPORTANT FACT IN THIS DOC
`[VERIFIED 2026-08-19` by reading the files`]`
- **Swan Lens / World Engine is large and already built:** 27 style manifests + **23 world recipes** at
  `frontend/src/adapters/style-lens-swan/worlds/recipes/` (candy-glass-arcade, crystalline-cathedral, aurora-index,
  kintsugi-circuit, tempo-forge, terrain-console, signal-garden, prism-terminal, cedar-workshop, ...).
- Every recipe already declares, in prose, a **"DNA / impossible optical phenomenon / signature motion / surface fit."**
  Example (candy-glass-arcade): *"a 2am boardwalk arcade cast entirely in pulled sugar-glass... neon that refracts
  THROUGH solid glass and arrives before it is emitted."* That IS Sean's Las-Vegas-living-lights register, already written.
- **`RecipeV2` SUPPORTS an `atmosphere` axis** - `atmosphere?: RecipeAtmosphere`, up to 3 layers, with a validator
  (`validateAtmosphere`) and an explicit "drop-not-fail" degradation law (`recipeV2.ts:43,78,145-156`).
- **BUT: 0 of 23 recipes declare an atmosphere, and all 23 carry the banner `NOT YET IMPLEMENTED: this world declares
  no atmosphere, and the representation layer animates nothing.`**
- **CONCLUSION:** Sean's "living world" is not a new thing to invent. It is **the empty socket at the centre of a
  system he already has.** The engine, the vocabulary, the validator, and 23 written phenomena all exist; the
  atmosphere layer renders nothing. The eight-design run is therefore not only choosing a look - it is choosing
  WHICH WORLD'S ATMOSPHERE GETS BUILT FIRST. Connects to existing memory: `project_design_brain_world_atmosphere_upgrade`
  (BUILD-AUTHORITATIVE) and `project_swan_world_engine_handoff` (work order ready).

### F2 - THE IMAGE LANE EXISTS AND SEAN WAS RIGHT `[VERIFIED]`
- `shared/providers/openrouterImage.mjs` + `shared/providers/openrouterModels.mjs`:
  **`DEFAULT_MODEL = 'openai/gpt-5.4-image-2'`** - the "ChatGPT image maker" connection Sean referred to. Also
  available: `openai/gpt-5-image-mini`, `google/gemini-3-pro-image`, `google/gemini-3.1-flash-image` (+ lite).
  Separately `backend/services/recraftService.mjs` exists (Recraft `/images/generations`).
- **A full image FORGE CLI already exists:** `scripts/forge.mjs` - `bracket "<prompt>" --n 3 --aspect 16:9` ->
  `pick <id>` -> `refine <id> "warmer, lower sun"`, with a prompt compiler (`swanPromptCompiler.mjs`), a law filter
  (`swanLawFilter.mjs`), contact sheets + rubric, and **`--confirm-spend` required** (generation costs money;
  `pick`/`list`/cost-preview are free).
- **So Sean's "30 prompts, Windows-photographer register" plan is executable TODAY** - no build required, just prompts
  and a spend confirmation. This is the parallax/background asset pipeline.

### D8 - WORLD LITERALISM: living world at distance, real people IN it (Sean, 2026-08-19) - SETTLED, shared by all 8
Deep parallax world with real light/weather/depth; people present but small and impressionistic in the far/mid
layers; scrolling travels INWARD and resolves to a human moment. NOT a Sims-style rendered city (rejected: reads as
a game and undercuts the luxury register). NOT people-free atmosphere (rejected: says nothing about community, which
is half the business model). NOT a tour of the 23 worlds (rejected: demo-reel incoherence).
**This is a SHARED constant across all eight designs** - the eight vary on volume + lighting only, so that the
comparison stays legible. Sean was told this explicitly and agreed by choosing.

### D9 - MEDIA SLOTS: H3-FIRST, REAL FOOTAGE AS OPTIONAL OVERRIDE (Sean, 2026-08-19)
Sean: *"I want to do the Generated World plus me. I also wanted to do the 'add my own film' or 'add my real sessions'
... This is really a thing I'm building for everybody. It doesn't necessarily have to be me. It has to be just kind of
like proving the fact. I want to do a mix of both, but maybe more on the H3 creation, and then I'll just add my clips
where I feel like they maybe need it. Or you can go ahead and make sure we have some solid H3 footage, and then we can
choose if we wanna put real footage there, but we should always fill everything up with H3 footage first."*

**ARCHITECTURAL REQUIREMENT this creates (not just an asset choice):** every media position on the page is a
**named, swappable SLOT** with (a) an H3-generated default that always exists, and (b) an optional real-footage
override. Nothing is ever blocked waiting on a shoot; Sean re-dresses the page later without a rebuild.
Mirrors the existing `frontend/src/config/videoAssets.ts` registry pattern - extend that pattern, do not invent a new one.
**Nuance Sean added, do NOT lose it:** the page is *"for everybody... it doesn't necessarily have to be me."*
Sean-on-camera is PROOF, not a personality cult. Keep the founder presence proportionate.

### F3 - MEDIA INVENTORY `[VERIFIED]` `frontend/src/config/videoAssets.ts`
11 videos, ALL atmosphere/nature, ZERO training footage of real people:
`swan.mp4 · Swans.mp4 · Run.mp4 · smoke.mp4 · forest.mp4 · Waves.mp4 · fish.mp4 · galaxy1.mp4 ·
swan-golden.mp4 · swan-silver.mp4 · Swan-mov-2.mp4`. Served from Cloudflare R2 (`VITE_R2_VIDEO_URL`), local
`/public` fallback. Consequence: the H3 generation queue is on the critical path for the run - the "near" layer has
nothing real to resolve into today. Consent note for later real footage: client faces on a public marketing page
need signed releases (care-first values + privacy rules).

### F4 - ALREADY-DECIDED, DO NOT RE-ASK (pulled from standing memory, not from Sean this session)
Motion tiering is already Sean's standing preference: scale effects to device capability - full on desktop, reduced
elsewhere, honor `prefers-reduced-motion`. The Lens already ships `motionMode auto|reduced|off`. APPLY it to all
eight designs; do not spend a grill question re-deciding it.

### D11 - TAKE RATE: 15% WITH A MONTHLY CAP (Sean, 2026-08-19 - "do everything that you recommend")
Sean authorized the full recommendation set rather than answering the rate question separately.
**ASSUMPTION MADE EXPLICIT (reversible, flag it if wrong):** take rate = **15%, capped monthly**, with Stripe's
~2.9% absorbed so the pitch is all-in. Framing: *"No monthly fee. No setup fee. We only make money when you do."*
Rationale (D4): flat 15% is cheapest for a beginner but MORE expensive than subscription competitors for a
high-volume trainer; the cap keeps "cheapest" true at both ends and protects the trainers Sean least wants to lose.
**The specific cap dollar amount is NOT set** - Sean must choose it before the number ships publicly.
Per S2 this value must live in config, never typed into a design.

### F5 - S1 VERIFIED: THE TRAINER DOOR HAS NO DESTINATION `[VERIFIED 2026-08-19]` - HARD DEPENDENCY
Probe validated first (control grep found the known `HomePage.V4` mount before trusting any negative result).
- `frontend/src/routes/main-routes.tsx:388` - the ONLY public signup route is `path: 'signup'` -> `<SignupModal />`.
- `frontend/src/pages/OptimizedSignupModal.tsx` offers **no trainer role selection** (zero matches for role/trainer).
- Trainer exists only as a PROTECTED dashboard role: `<ProtectedRoute allowedRoles={['trainer','admin']}>` on
  Biomechanics Studio, Equipment Manager, Variation Engine, Boot Camp Builder, Sprint Planner, etc.
- **There is no public "become a trainer / apply to train on SwanStudios" funnel anywhere in the app.**

**CONSEQUENCE:** D3 makes the trainer door one of two EQUAL doors, and a trainer is the highest-value visitor on
the page (each arrives with an existing client book). Today that click lands a professional in a CLIENT signup form.
The eight designs may render the door, but the run cannot be called shippable until this funnel exists.
**Recommended minimum viable destination** (also the minimal-click target): a single-email capture at
`/trainers` -> "we'll be in touch" -> qualification asked later. Do NOT build a long application form first.
Ties to the outstanding DMARC action (S6) - that email must actually deliver.

### F6 - CLOSED: the "squirrel" reference
Sean, 2026-08-19: *"The scroll thing, I don't know what that was. We can skip that."* Dropped, not carried forward.

### F7 - THE REAL `Swans.mp4`, MEASURED `[VERIFIED 2026-08-19]` - resolves Kimi's "built on sand" finding
Kimi K3 flagged that eight designs were being built on an uninspected hero asset. It was right; nobody had checked.
Asset is NOT in the repo (0 mp4s in `frontend/public`; probe validated - `find` did locate the 2 spike mp4s) and
`VITE_R2_VIDEO_URL` is unset in every local `.env`, so it resolves only in production.
**Fetched from `https://sswanstudios.com/Swans.mp4` -> HTTP 200:**

| Property | Value | Design consequence |
|---|---|---|
| Resolution | 1920x1080 (16:9) | Cropping to a tall "river column" yields ~540x1080 - soft on retina. Directions assuming aggressive crops must be checked. |
| Codec / pix_fmt | h264 / yuv420p | Fine everywhere. |
| **Frame rate** | **23.976 fps** (24000/1001) | **LOW for scroll-scrub.** Scrubbing 24fps by scroll shows visible stepping; needs interpolation to ~60fps (~2.5x frames). The earlier spike interpolated SYNTHETIC 30fps, never this. |
| Duration | 25.23 s | Long loop (good - repetition less obvious); long scrub runway (good for a cinematic descent). |
| Bitrate / size | 5.68 Mbps / **17.1 MB** | **Heavy hero.** Directly substantiates Kimi's LTE/LCP critique. Needs a poster frame + lower-bitrate mobile rendition. |
| Audio | **none** | Autoplay-safe. Good. |
| **Loop seam** | **SSIM first-vs-last = 0.694** (1.0 = seamless) | **DOES NOT LOOP CLEANLY.** A naive `loop` hero visibly jumps every 25s. Fix by crossfade/ping-pong, fade-out, trimming to a better sub-range - OR by scroll-scrubbing, which never loops. This is evidence FOR the cinematic direction. |

### F8 - KIMI K3 HOSTILE REVIEW - findings accepted, cost $0.0721 (worst case was $0.9229, cap $1.50)
Output: `docs/ai-workflow/AI-HANDOFF/KIMI-FRONTPAGE-8RUN-2026-08-19.md` (263 lines). Verdict: high value, most
findings real. Accepted and actionable:
1. **The 15% economics has no chapter, no slot and no copy.** THE FORK recruits trainers with copy that says
   *"Your trainer deserves a fair platform"* and never says what fair MEANS. -> THE PROOF must carry the economics
   as `[new copy - needs Sean approval]`, and a **trainer earnings calculator** is a strong missing surface.
2. **"Two EQUAL doors" is a slogan until the PROOF is dual-track** - trainees need human before/after evidence,
   trainers need economics. Do not overturn D3; make THE PROOF serve both.
3. **Nobody is designing the reduced-motion version.** The fallback for a scroll-bound cinematic page is a
   different, worse website. -> every one of the eight MUST declare its reduced-motion fallback explicitly.
4. **Hero asset uninspected** -> resolved, see F7. Kimi was correct.
5. **The manifesto may be a bounce-rate machine in chapter 2** - 26 seconds of grievance before anyone mentions
   training, aimed at someone who googled "personal trainer near me." Copy is Sean-approved and verbatim; this is
   surfaced for Sean's judgement, NOT overridden.
6. **THE PROOF charts have no real data** -> every design fakes it, Sean approves the artboard, ship is either fake
   data or empty states. Reinforces S3: use a clearly-labelled demo dataset by design.
7. **The palette fights "homey"** - five blues, one gold, two near-blacks. Warmth must come from `#C6A84B` +
   warm light in the plates, or half the eight drift cold-corporate.
8. **D9 refinement: generated FACES near THE PROOF are fatal** on a platform selling "real connection."
   Generated swans fine; generated impressionistic mid-layer humans defensible; generated faces in the proof, never.

### D12 - TAKE-RATE CAP = $1,000/MONTH, ALL-IN (agent decision, Sean delegated 2026-08-19)
Sean: *"do what you think is best for the monthly cap dollar amount... will be best for the application as a whole."*
**Decision: 15%, capped at $1,000/month, card processing INCLUDED.**
Headline form: `15%. Never more than $1,000 a month. Card processing included. No monthly fee, no setup fee.`

**The trap that shaped it (caught while deciding, not before):** D4/D11 recommended absorbing Stripe's ~2.9% so the
pitch could be all-in. That is only safe WITHOUT a cap. Under a cap, card fees scale with the trainer's billing
while Swan's revenue is frozen - so a $500 cap turns LOSS-MAKING at roughly $17k/mo of trainer billing.
The cap and the all-in promise constrain each other; recommending both without checking was an error.

**Math at $1,000 all-in** (Sean's own $175/session):
| Trainer billing / mo | Sessions/wk | Swan collects | Effective rate | Approx Stripe cost | Swan net |
|---|---|---|---|---|---|
| $6,700 (cap binds here) | ~9 | $1,000 | 15% | ~$195 | ~$805 |
| $18,800 | ~25 | $1,000 | 5.3% | ~$545 | ~$455 |
| $26,300 | ~35 (solo max) | $1,000 | 3.8% | ~$808 | ~$192 |
| $33,600+ | studio-scale | $1,000 | 3.0% | ~$975 | ~$25 (break-even) |

**Why this serves the application as a whole:** supply is the bottleneck (D2) and each trainer arrives with a client
book, so acquisition outranks per-trainer margin early. Competitors are flat subscriptions (Trainerize ~$5-10/client/mo,
Mindbody ~$139-599/mo) and none include processing. `[LIKELY]` on competitor pricing - general knowledge, not verified
this session; verify before the number ships publicly.
**Known limit, deliberately out of scope:** above ~$30k/mo billing Swan's net approaches zero. That is a multi-trainer
studio, which needs its own plan tier - NOT a promise this page should make. Do not extend this cap to studios.
Per S2 this value lives in config, never typed into a design.

### D13 - MANIFESTO STAYS IN CHAPTER 2; the fix is design, not copy (agent decision, 2026-08-19)
Kimi finding 5 argued chapter 2 is a bounce risk: ~26 seconds of grievance before the product is named, aimed at
someone who googled "personal trainer near me." **Rejected as a copy change, accepted as a design requirement.**
Chapter 1's sub-line already orients the reader - *"Where world-class personal training meets a supportive community..."*
names the product before the manifesto arrives. The risk is real ONLY if that line is treated as decoration.
**Therefore, binding on all eight designs:** the chapter-1 sub-line is LOAD-BEARING - it must be given real
typographic weight and must be readable before any scroll. Sean's approved copy is not moved or edited.
Sean retains the call; this resolves it without touching his voice.

## Q&A Log
_(question -> recommended -> Sean's answer -> implication; appended after EVERY exchange)_

## Open Flags
- CONFLICT INHERITED: the 2026-08-18 brief said the one action is "book a consultation", but the live approved
  copy says `Join the Community` / `Find a Trainer`. Sean must resolve this in the grill — not any AI, silently.
- RESOLVED 2026-08-19: H3 licence. GRANTED + enabled + verified on machine. Not a blocker. Credit-line placement
  is a late footer question only.
- Sean bookkeeping (non-blocking): file the approval email metadata into the licensing doc.

### D10 - STRUCTURE: COMPRESS HARD TO ~6 CHAPTERS (Sean, 2026-08-19) - SETTLED
Front page = **THE WORLD · THE MANIFESTO · THE LOOP · THE PROOF · THE FORK · FOOTER**.
- 1 THE WORLD - swans + living parallax world, hero
- 2 THE MANIFESTO - the verbatim anti-extraction copy, given real size
- 3 THE LOOP - Swan Coach analyses -> co-builds WITH the trainer -> goal program -> real chart -> member feed
- 4 THE PROOF - real trainers, real numbers, the take-rate promise
- 5 THE FORK - `Find a Trainer` and `Train on Swan` at EQUAL weight (D3)
- 6 FOOTER - incl. the minimal-but-legible `MiniMax H3` credit (D1)
Everything else (Programs, Golf, Testimonials, Stats, Arsenal, Newsletter, About, PrismCapture, EvidenceLensBand)
moves to its own page or folds into THE LOOP. Rationale: six chapters can each be enormous and different; fourteen
can only be a list - which was Sean's own diagnosis.
Chapter COUNT is now a shared constant (~6); the eight designs still vary on volume + lighting + internal structure.

## Architecture Notes (parent / children / whole)

- **Parent:** `HomePage.V4.tsx` is 121 lines and is purely an orchestrator - it renders section children and owns
  `tier` / `isFull` / `showGlow` motion flags. That is a GOOD shape; keep it. The rebuild replaces the CHILD LIST and
  adds a world/atmosphere layer beneath, it does not rewrite the parent's role.
- **Children today:** 14 section components, each roughly one screen, separated by an identical `<SectionTransition>`.
  The identical divider is a material cause of the flatness - a page with one rhythm cannot have a peak.
- **The whole:** this page is the top of funnel for BOTH sides of a marketplace simultaneously. Every other Swan
  surface (dashboards, Coach, social, store) is post-login. This is the only surface a stranger ever sees, and it now
  has to convert a trainee AND recruit a trainer without splitting into two pages (D3).
- **New layer the rebuild introduces:** a world/atmosphere layer BELOW the chapters (`RecipeAtmosphere`, F1) and a
  media SLOT registry (D9) extending `videoAssets.ts`. Both are cross-cutting - they are not owned by any one chapter.

## Suggestions & Enhancements (Phase 2 - advisory, Sean accepts/modifies/rejects each)

**S1 - The trainer door may lead nowhere.** `[UNVERIFIED - must check before the run ships]` The FORK sends a trainer
to "Train on Swan," but it is unconfirmed that a public trainer-application/onboarding flow exists. A fork into a 404
or a generic signup wastes the most valuable click on the page. Verify, and if absent, treat it as a hard dependency.

**S2 - The take rate must be a single source of truth, not typed copy.** The moment `15%` is on the page it is a
public commitment. Hardcoding it in a design means it silently lies the day pricing changes. Put it in config and
render it - this is exactly the TRAILHEAD-TRUTH class (in-app copy must describe what the code does NOW).

**S3 - THE LOOP demo must not use real client data.** Showing "a real chart" needs a labelled demo dataset, never a
live member's numbers (zero-PII rule). Design the chapter around a named sample member so nobody is ever tempted.

**S4 - Compressing to 6 has an SEO cost Sean should accept knowingly.** Programs and Golf carry real search intent
and the golf angle is a named lead channel. Moving them off the front page is right for the design, but they MUST
become properly indexed pages with their own copy or organic traffic drops. This is a consequence of D10, not an
argument against it.

**S5 - The winner cannot ship without building the atmosphere layer.** Per F1, `RecipeAtmosphere` is typed and
validated but implemented by ZERO of 23 worlds. The eight designs produce a picture; shipping one means being the
first to actually implement an atmosphere. Scope that honestly before promising a date.

**S6 - Email deliverability gates the whole funnel.** A page built to generate trainer signups leaks if nurture mail
lands in spam. The DMARC record is still outstanding and is Sean's ~10-minute action at Namecheap.

**S7 - Generated-people honesty.** With H3 filling every slot by default (D9), most humans on the page are synthetic.
Recommend a quiet, non-defensive convention now (the footer credit already establishes the habit) so it is never
discovered as a gotcha by a trainer evaluating the platform.

## Minimal-Click Opportunities

- **Trainer door: 5+ taps -> 2.** Today a would-be trainer would land, scroll, hunt, then face a multi-field form.
  Target: FORK -> one email field -> done, with qualification asked later. The trainer is the highest-value visitor
  on the page; make the first commitment nearly free.
- **`Find a Trainer` should land on a filtered LIST, not a signup wall.** Let a stranger see real trainers before
  being asked for anything. Browsing is the cheapest possible first commitment.
- **THE LOOP should be scroll-driven, not click-driven.** Do not put the product demo behind tabs or a carousel;
  the scroll the visitor is already doing should advance it. Zero extra taps.
- **The 15% promise belongs adjacent to the trainer CTA**, not in a separate pricing chapter - the objection and the
  answer should be in the same eyeful.
