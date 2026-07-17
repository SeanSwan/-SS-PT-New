# MARKETING TRINITY — Home / About / Contact World-Engine Rebuild — Master Build Order

- **Date:** 2026-07-16 · **Author:** Fable (claude-fable-5), Final Decider · **Status:** PARTIALLY SUPERSEDED — §3 Phase 0 (3-direction ideation gate) is replaced by the gallery-first program in `SWAN-UNIFIED-WORLD-REDESIGN-MASTER-2026-07-16.md`; this doc's Phases 1–7 execute as **Track A** of that program in the ratified design language. All receipts, copy rules, and the claims audit herein remain binding.
- **Commissioned by:** Sean (CEO), directive 2026-07-16: use the Swan World Engine to refactor, enhance, and upgrade the home page, about page, and contact page — all design enhancements, animations, premium cards, layered section backgrounds; pixel-perfect on phones; KEEP the swan video hero; rewrite all wording to attract clients, trainers, and community members to a happy, benevolent, non-toxic community; then audit the whole site against everything the marketing pages claim it does.
- **How to use this file:** this is the FULL work order. Any builder agent (or Fable itself) executes it phase-by-phase after Sean's go. Where judgment is required, this doc names the quality bar. Authority chain: `CLAUDE.md` > `SWAN-CINEMATIC-DESIGN-SYSTEM.md` > Design Brain (`worlds.md`/`techniques.md`/`psychology.md`/`experience-mode.md`) > this handoff > builder judgment.

---

## 0. Mission

Rebuild the three public conversion surfaces (`/`, `/about`, `/contact`) as world-engine-tinted, cinematic, conversion-first pages that a stranger lands on and *feels* the SwanStudios difference: premium, warm, human, benevolent — the anti-toxic social platform built by a real trainer. Three audiences, three jobs on the same pages:

1. **Prospective clients** → book a consultation / join free.
2. **Trainers** → see a platform that respects them (fair fees, clients stay theirs) and reach out.
3. **Community members** → see a healthy, positive social home (fitness + dance + music + gaming + art + comedy + meetups) and sign up.

Everything the pages promise must be TRUE or get softened/backlogged — the claims-vs-reality audit (Phase 6) is part of this build, not an afterthought.

## 1. Ground-truth receipts (verified 2026-07-16 on `wip/comms-notifications-2026-07-05`; RE-VERIFY on fresh main in Phase 0 — this branch is 668 commits behind and all three page files drifted on main)

### 1.1 Canonical surfaces (rule 26/27)

| Surface | Route mount | Canonical component | Fallback | Orphans (do NOT touch) |
|---|---|---|---|---|
| `/` | `main-routes.tsx:309-316` (index) via lazy `:58-62` | `pages/HomePage/components/HomePage.V4.tsx` (114-line orchestrator, 12 sections) | `HomePage.V3.tsx` (chunk-fail only) | `HomePage.component.tsx` (test-routes only), `HomePage.V2.component.tsx`, ~14 DesignPlayground concepts (admin-gated) |
| `/about` | `main-routes.tsx:358-363` via lazy `:88-91` | `pages/about/About.V4.tsx` (89-line orchestrator, 9 sections; copy centralized in `shared/AboutData.ts`) | `About.V3.tsx` | `About.jsx` + `AboutContent.tsx` (dead chain) |
| `/contact` | `main-routes.tsx:350-355` via lazy `:83-86` | `pages/contactpage/ContactV3.tsx` (1,182-line single file — violates rule 4) | `ContactV2.tsx` | `EnhancedContactPage.tsx` (barrel never imported) |

Router entry proof: `App.tsx:47,108,228`. No `/about-us` or `/contact-us` routes exist. Catch-all `*` redirects to `/`.

### 1.2 Hero video truth (Sean's KEEP directive has an asset gap)

- Hero video = `VIDEO.swans` → `Swans.mp4` via `frontend/src/config/videoAssets.ts:5-14` — **R2-first** (`VITE_R2_VIDEO_URL`) with `/Swans.mp4` public fallback.
- ⚠ `Swans.mp4` exists NOWHERE in the repo, and `VITE_R2_VIDEO_URL` is absent from committed env files — it must be injected by Render's build env. `[HYPOTHESIS]` it is set in prod (the live site shows the video); VERIFY in Phase 0.
- ⚠ Essential/reduced tier renders poster `/swans-poster.webp` — **this file does not exist** in `frontend/public/`. Reduced-motion and low-tier users currently get a blank dark hero. Must ship a real poster frame (also fixes LCP poster-first law).

### 1.3 Standing-rule violations found in current copy (fix in Phase 3, they are already live bugs)

1. **"NASM-certified" phrasing** — About meta description ("NCEP/NASM-certified trainer") and Competitive Edge card ("NASM-certified trainers"). House rule: NASM-**protocol** trained, NEVER "NASM-certified." Main added `pages/about/credentialPhrasing.contract.test.ts` — the rewrite must pass it.
2. **User-facing "AI" branding** — home copy says "AI-driven programming," "AI-enhanced platform," "AI-optimized programming," tagline "Where Human Excellence Meets AI Precision." House rule: user-facing = **Swan Coach**, never "AI." Rewrite all user-facing instances (SEO meta may keep "AI" only if Sean explicitly wants the search term — decision point §11.3).
3. **Years drift** — "26 years" / "26+" / About title "25+ Years" / legacy "over 25." Standard: **"26+ years."**
4. **Dual Helmet titles on `/`** — V4 orchestrator and HeroSection both render `<Helmet>` titles; the winner is mount-order luck. Consolidate to ONE.

### 1.4 Internal contradiction ledger (numbers must converge on ONE truth — seed for Phase 3/6)

| Claim | Home says | About says | Truth anchor |
|---|---|---|---|
| Exercise library | "840+ Exercises" | "900+ Exercise Library" | Exercise DB ≈ 736 (memory) — run a real DB count in Phase 6; publish the verified floor |
| Clients transformed | "500+" | "1000+" | Sean supplies the real number (§11.4) |
| Client satisfaction | "98%" | "97%" | Sean supplies or we drop the stat (§11.4) |
| Trainer fee | "~10%" | "small fair fee" | Verify against actual fee config |
| Store route | Programs → `/shop`, final CTA → `/store` | CTAs → `/shop` | Verify both mount; standardize |
| Swimmers taught | 312 | 312 | Consistent ✓ |

### 1.5 Component-kit truth

- **GlowButton**: TWO implementations coexist — `components/ui/buttons/GlowButton` (canonical, used by V4 pages; dual `variant`/`colorScheme` prop APIs) vs `components/ui/GlowButton` (legacy, orphan pages only). Canonical pages already use the right one; do not migrate orphans.
- **GlassCard** (`components/ui-kit/glass/GlassCard`) is the de-facto premium card on Home + About. **SheenCard exists only in dashboard contexts** — the Swan Card/Button Standard's SheenCard treatment has never been ported to marketing surfaces (§11.2 decision).
- **Contact V3 diverges from house chrome**: bespoke `SubmitButton`/`FormCard`/`InfoCard` instead of GlowButton/GlassCard. Unify in Phase 5.
- Cinematic kit available and in use: `ParallaxHero`, `ScrollReveal`, `TextSplitter`, `TypewriterText`, `AnimatedCounter`, `ScrollProgress`, `SectionTransition`, `NoiseOverlay`, tier system `useAnimationTier`/`useTierFlags` (full/balanced/essential).
- **Contact backend is REAL**: `POST /api/contact` (`backend/core/routes.mjs:333` → `contactRoutes.mjs:76`) → DB row + admin notification + CRM lead capture unconditionally; SendGrid email + Twilio SMS best-effort on env keys. Preserve this pipeline untouched.

## 2. Hard constraints (bind every phase)

- **Palette Law A — Swan-Tinted World (REQUIRED).** These are sswanstudios.com brand surfaces: the chosen world supplies *setting only* (imagery, atmosphere, particles, media); ALL UI chrome stays Crystalline Swan tokens with Dual-Button Glow. No Law-B palettes here. No Galaxy-Swan tokens ever.
- **Motion licensing:** marketing/landing default is M2–M3 per `experience-mode.md` §4. Recommended: Home = **M3** with an optional **M4 hero ritual** (Sean approves at the Phase 0 gate — his 2026-07-16 "use everything" directive signals intent, but the formal per-page M4 ritual still runs: world + scene ledger + psychology receipt + perf-tier plan). About = M2–M3. Contact = M2.
- **Non-negotiables at every tier:** reduced-motion static storytelling, three perf tiers in the same file, WCAG 4.5:1, 44px targets, no autoplay audio, LCP ≤2.5s poster-first, battery guards, rule 43 `css``` helper, rule 4 ≤300 lines/file, rule 6 `var(--token, #fallback)`, styled-components only.
- **Keep:** swan video hero on `/` (enhance, never remove); OrientationForm modal flow; the working contact pipeline; section *content* coverage (every current section's job survives even if merged/reordered).
- **Copy rules:** "26+ years"; NASM-protocol (never certified); no "yoga/meditation" (say stretching/flexibility); Swan Coach (never user-facing "AI"); benevolent/positive/anti-toxic positioning WITHOUT naming politics or attacking specific companies by name; no invented stats; honest claims only (Phase 6 enforces).
- **Process:** Rule 67 lane claims before every edit session; commit per slice, push ONCE at batch end (Rule 70); triangle review (Tier 2) at each phase boundary; Fable arbitrates verdicts.

## 3. Phase 0 — Setup + Ideation Gate (no code until this closes)

1. **Fresh branch** `<agent>/marketing-trinity-<date>` off current `origin/main` (World Engine docs + newest page versions live there; this wip branch is 668 behind).
2. **Re-receipt on fresh main**: confirm §1.1 mounts still hold; diff `HomeData.ts`/`AboutData.ts`/`HeroSection.tsx`/`ContactV3.tsx` against this doc's inventory; note deltas. Read the new `credentialPhrasing.contract.test.ts` to learn the enforced phrasing.
3. **Hero asset truth**: confirm `VITE_R2_VIDEO_URL` is set in Render (rule 47/49-safe check — env *presence* only, never value); confirm `Swans.mp4` serves from R2; generate `swans-poster.webp` from the video's best frame and ship it to `frontend/public/`.
4. **Load the engine**: `worlds.md`, `techniques.md`, `psychology.md`, `experience-mode.md`, `SWAN-CINEMATIC-DESIGN-SYSTEM.md`, `SWAN-ASSET-STORYBOARDING.md` via `swan-design-router`. Run the Mobbin external-reference gate (or mark `[MOBBIN UNAVAILABLE]`).
5. **Ideation gate (router-mandated, 2–3 directions to Sean).** Pre-seeded Law-A directions — present with mood boards/scene ledgers, Sean picks:
   - **Direction 1 — Glacier Cathedral** *(recommended)*: the engine's gold exemplar; aurora + light-through-ice atmosphere is the natural evolution of the swan/frozen-forest DNA; swan video hero sits inside it perfectly; patient awe pacing = premium trust. Psychology: awe + peak-end.
   - **Direction 2 — Chrome Sovereign**: penthouse-at-dusk luxury metropolis; Sapphire + Gilded Fern native; strongest pull for the wealthy golf-client lead angle. Psychology: aesthetic-usability + authority.
   - **Direction 3 — Evergreen Dominion (restrained)**: canopy mist + god rays; the mandated calmer option; warm, alive, community-forward. Psychology: processing fluency + social proof.
   One world for all three pages (About/Contact run quieter *acts* of the same world — coherence beats novelty).
6. **Write the B2 four-act arc + scene ledger + psychology receipt** for each page in the chosen world. Home suggested arc: Act 1 AWE (swan hero) → Act 2 CONVICTION (mission + what-we-are) → Act 3 PROOF (trainers/programs/golf/testimonials/stats — CTA at the Act 3→4 emotional peak) → Act 4 BELONGING (community + newsletter + calm final CTA).

## 4. Phase 1 — Foundation slice (shared chrome, before any page rebuild)

1. Consolidate `/` to ONE `<Helmet>` (orchestrator owns it); do the same audit on About/Contact heads.
2. **SEO/meta upgrade**: unique title + description per page (copy from Phase 3), OpenGraph + Twitter card images (world-tinted poster frames), `LocalBusiness` JSON-LD (Anaheim Hills, phone, hours) on Contact, `FAQPage` JSON-LD for the FAQ section.
3. **Marketing stats truth module**: create ONE shared `frontend/src/pages/shared/marketingStats.ts` (or equivalent) exporting the verified numbers (years, clients, satisfaction, exercises, sessions, swimmers, lbs). Home + About import from it — the §1.4 drift class becomes structurally impossible. Values land only after Sean answers §11.4.
4. **SheenCard decision executed** (§11.2): either port SheenCard chrome to a marketing-safe variant or formally bless GlassCard as the marketing card; document in the Design Brain either way.
5. Poster + video preload/lazy strategy: hero poster-first, `preload="metadata"`, section media lazy.

## 5. Phase 2 — Home page rebuild (`/`)

- Rebuild `HomePage.V4` sections **in place** (same file names, keep the V3 fallback wiring intact) under the chosen world's atmosphere recipe: layered z-stack per section (background world layer, midground panels, foreground content), act-boundary `SectionTransition`s upgraded to the world's signature transition, world-appropriate particle/weather layer at full tier only.
- **Hero (KEEP + enhance):** swan video stays the Act-1 centerpiece. Enhance: world-tinted color grade via overlay (not video re-encode), scroll parallax scale kept at full tier, new poster for essential tier, headline treatment per world typography lean, ONE primary CTA emphasized (Join) with Find-a-Trainer as secondary. Quick-nav capsules: make role-aware (hide dashboard/waiver links from logged-out visitors — they read as internal tooling on a marketing page; show Social/Gallery/Contact instead).
- **Section upgrades (every current section's job survives):** Mission gets the strongest copy rewrite (§6) + a quiet cinematic beat; Trainers section gains a **trainer-intent CTA** that lands on Contact with subject preselected to "Trainer application" (see Phase 5); Programs cards get the full premium-card treatment + verified pricing language consistent with the storefront; Golf keeps its lead-angle prominence; Testimonials — pending §11.5 verdict; Stats reads from the truth module with `AnimatedCounter` + T13 living-data flavor; Social/community section becomes the Act-4 emotional anchor; Newsletter + final CTA close calm per peak-end.
- Every section: loading/empty states where data-driven, `ScrollReveal` discipline within motion caps, one signature moment per act max.

## 6. Phase 3 — Copy rewrite (all three pages, tournament-run)

- Run **`copy-tournament`** (5-judge panel) for the highest-stakes strings: home hero headline+subhead, mission section, final CTA block, About hero + Promise cards, trainer-recruitment block. Lower-stakes strings get a single strong rewrite + hostile pass.
- **Voice target:** warm, confident, human, benevolent; premium but never cold; zero corporate filler; zero dark-pattern urgency. The emotional core: *"a healthy home for your whole journey — training, progress, creativity, community — built by a real coach who's on your side."* Anti-toxic positioning stays positive-framed ("what we are") rather than accusatory ("who we hate"); keep at most ONE contrast line about toxic social media, aimed at the category, not named companies. Politics: explicitly absent.
- **Three-audience coverage check:** every page must answer, above the fold or one scroll in — *what is this?* (client), *what's in it for my business?* (trainer), *is this a place I'd hang out?* (community).
- **Hard copy rules** from §2 + §1.3 all apply. Subject-matter truth: FAQ pricing answers must match live packages ($175/hr class positioning stays accurate without hard-coding prices that drift — link to `/shop` for numbers).
- All rewritten copy lands in the data files (`HomeData.ts`, `AboutData.ts`, extracted `ContactData.ts`) — never inline in components.

## 7. Phase 4 — About page rebuild (`/about`)

- Same world, quieter act structure (About is a PROOF page: story → credentials → promise → numbers → journey → philosophy → edge → CTA).
- Fix all §1.3 violations; pass `credentialPhrasing.contract.test.ts`.
- Mission/Promise rewrite direction: "we're here to help everybody" energy WITHOUT the current section's named-industry attack framing — the "Collective Power" pillar and Mission paragraphs get softened to inspiring, not adversarial (Sean's directive: appealing to everyone, no politics, benevolent).
- Stats section imports the truth module (kills the 500 vs 1000 / 97 vs 98 drift).
- Competitive Edge cards keep their "not-a-chatbot" contrast structure (it's good copy) but re-verify every factual claim against Phase 6 findings (e.g., "50+ Victory charts," "900+ exercises," "$20/month" competitor framing).
- Timeline: verify years with Sean where uncertain; keep Jasmine co-founder line (Sean-published story).

## 8. Phase 5 — Contact page rebuild (`/contact`)

- **Decompose** `ContactV3.tsx` (1,182 lines) into orchestrator + sections + `ContactData.ts` + styles files, all ≤300 lines (rule 4), preserving the submission handler behavior byte-for-byte (same endpoint, payload shape, acquisition params, toast flows).
- **Unify chrome**: GlowButton submit (dual-glow discipline), house card treatment for form/info/FAQ cards, same world atmosphere at M2.
- **Enhance the funnel**: subject → structured intent select ("Book a consultation" / "I'm a trainer — join SwanStudios" / "Community & general") mapped to the existing `consultationType` field (`general` stays the fallback — zero backend change required; trainer intent folds into the message body exactly as subject does today). Home/About trainer CTAs deep-link with the trainer intent preselected (`?intent=trainer`).
- Form UX: inline validation, visible focus states, honest response-time promise (keep 24h only if Sean confirms it's real — §11.6), success state offering the next best action (book assessment / view programs).
- Loading/empty/error states verified per Definition of Done; 44px targets on every control.

## 9. Phase 6 — Claims-vs-Reality site audit (the "do we do what we say" pass)

Build the **Claims Ledger** — one row per claim made on the three pages (seed inventory: §1.4 + the full explorer claim list embedded in the task thread 2026-07-16). For each claim:

`claim → where stated (file:line) → product evidence (feature file:line / DB count / route) → verdict TRUE | PARTIAL | MISSING → action KEEP | SOFTEN (copy fix in this build) | BUILD (backlog item for Sean)`

Priority claim classes to verify with real probes (rule 55 — executed probe or `[HYPOTHESIS]` tag, never file-reading alone):
1. **Quantified outcomes**: 500/1000+ clients, 97/98% satisfaction, 10k+ sessions, 12.4k lbs, exercise count (real DB `COUNT(*)`), 50+ Victory charts (count chart components).
2. **Testimonial personas** (Sarah J., Robert T., Officer Martinez) with specific numeric results — real people or illustrative? (§11.5 — legal/trust exposure if presented as real when illustrative.)
3. **Feature claims**: voice-first Swan Coach logging; trainer payments/payouts ("collect payments"); ~10% fee; free tier scope; Guardian donation tier; gamification XP/badges; meetups/events; double opt-in newsletter (verify the confirm flow actually double-opts); virtual training offering; corporate wellness offering.
4. **Trust claims**: "your data stays private," "we never sell your email," "your clients stay yours forever" — each maps to an actual policy/mechanism or gets softened.
5. **Contact promises**: 24h response, phone/hours accuracy, email address currency.

Output: `docs/ai-workflow/AI-HANDOFF/MARKETING-CLAIMS-LEDGER-2026-07-16.md` + the SOFTEN fixes applied in the same build + the BUILD list handed to Sean as ranked backlog. **No claim ships in the new copy without a ledger row.**

## 10. Phase 7 — QA, review, closeout

1. **Responsive matrix (rule 24, full)**: 320 / 375 / **414 (iPhone XR — Sean's device class)** / 768 / 1024 / 1280 / 1440 / 1920 / **2560×1440** / **3840×2160** / 3440 ultrawide. Playwright screenshots at each width for each page at scroll 0 + each act boundary; no overlap/clip/hover-only controls at phone widths.
2. **Motion QA**: reduced-motion pass (story survives at zero motion — poster hero, static sections), tier fallback pass (essential tier of the M3/M4 page must be a good M1/M2 page), battery guards (off-viewport pause), no >3/sec flashing.
3. **Perf**: LCP ≤2.5s on `/` (poster-first), lazy media below fold, bundle check on new chunks.
4. **Tier-A**: `tsc --noEmit`, vitest (including `credentialPhrasing.contract.test.ts` + new contract tests for the stats truth module and single-Helmet rule), rule 42 backend audit if any backend file was touched (Phase 5 targets zero backend changes).
5. **Hostile design critique** (rules 17/23 + Premium Design Critique Loop) — attack for generic/template feel, then fix the weakest area.
6. **Triangle review** (Tier 2, ~$0) of the full diff; Codex hostile pass advisory; **Fable arbitrates**. Paid Village only if Sean asks (nothing here is auth/billing/tenant-class).
7. **Closeout**: rule 41 evidence lock, rule 57 dual-tier summary, rule 48 phase audit record, rule 60 next slice. Push ONCE at batch end (Rule 70) → Render deploy → live smoke on sswanstudios.com at 414px + desktop.

## 11. Decision points for Sean (answer at or before Phase 0; recommended defaults in bold)

1. **World direction**: **Glacier Cathedral** / Chrome Sovereign / Evergreen Dominion (final pick happens at the ideation gate with visuals in front of you).
2. **Marketing card standard**: **bless GlassCard as the marketing card** (already proven on 2 of 3 pages; SheenCard stays dashboard) vs. port SheenCard chrome to marketing.
3. **SEO "AI" keyword**: user-facing copy says Swan Coach everywhere; may meta descriptions keep "AI" for search? **Recommend yes, meta-only.**
4. **Real numbers**: clients transformed, satisfaction %, sessions delivered, lbs lost — supply real values or approve dropping any stat we can't stand behind.
5. **Testimonials**: real client quotes (initials OK) or clearly-illustrative examples? **Recommend real quotes only, even if fewer** — quantified results attributed to personas is the page's biggest trust/legal exposure.
6. **24-hour response promise**: keep, or soften to "within 1–2 business days"?
7. **M4 hero ritual on `/`**: approve the full Experience-tier hero (scroll-film class techniques) or hold at M3 cinematic? **Recommend M3 first, M4 as a follow-up experiment** — conversion pages reward restraint (psychology.md §10).

## 12. What NOT to do

- Do NOT touch orphaned variants (`About.jsx`, `AboutContent.tsx`, `EnhancedContactPage.tsx`, `HomePage.component/V2`, DesignPlayground) — they are rule-34 protected; note them for a separate cleanup pass.
- Do NOT re-encode or replace the swan video; grade it with overlays.
- Do NOT introduce Law-B palettes, Galaxy-Swan tokens, MUI, Recharts, or any new hardcoded hex without `var(--token, #fallback)`.
- Do NOT rewrite backend contact routes; Phase 5 is frontend-shape only.
- Do NOT let world atmosphere bury the proof acts (psychology.md: spectacle never outranks social proof).
- Do NOT ship any stat, testimonial, or feature claim that lacks a Claims Ledger row.
- Do NOT `git add -A`; do NOT push per-slice (batch push once).

## 13. Acceptance criteria (master checklist)

- [ ] All three pages rebuilt on fresh-main branch in the Sean-picked Law-A world; UI chrome 100% Crystalline Swan; Dual-Button Glow intact.
- [ ] Swan video hero preserved + enhanced; real `swans-poster.webp` shipped; R2 env verified; reduced-motion hero tells the story.
- [ ] Every §1.3 violation fixed; `credentialPhrasing.contract.test.ts` green; zero user-facing "AI"; "26+ years" everywhere.
- [ ] Stats truth module live; Home/About import it; §1.4 table shows zero contradictions on the live pages.
- [ ] Copy rewritten via tournament for high-stakes strings; three-audience coverage check passes on each page; benevolent anti-toxic voice with no named-company attacks, no politics.
- [ ] ContactV3 decomposed ≤300-line files; submission pipeline byte-equivalent (probe-verified); trainer-intent funnel live from Home/About CTAs.
- [ ] Claims Ledger complete (every marketing claim has a row); SOFTEN fixes applied; BUILD backlog delivered to Sean ranked.
- [ ] Full rule-24 matrix screenshots archived; LCP ≤2.5s; Tier-A green (slice-clean vs baseline disclosed per rule 56).
- [ ] Triangle review run; Fable verdict recorded; rule 48 audit record + rule 41 closeout landed; ONE batch push; live smoke on production.

---

*Fable-fidelity note for the builder: the single most likely failure of this build is schema-compliant blandness — pages that pass every checklist and still feel like a template. The worlds catalog exists precisely so this doesn't happen. If a section feels generic, it IS generic: re-read the chosen world's anti-cheese line and make a decisive taste call.*
