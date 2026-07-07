# Blueprint 04 — Home + About Refactor: "Tell the Truth, Beautifully" (Phase 6)

**Status:** blueprint / executable. Charter Phase 6. Truth work is buildable NOW; final numbers blocked on D-F (Sean); cinematic pass runs the swan-design-router ideation gate at build time.
**Evidence base:** dedicated read-only recon on `claude/launch-charter-20260706` (file:line verified 2026-07-07).

---

## 1. Route truth

Mounted: `HomePage.V4.tsx` at `/` (`main-routes.tsx:58-62,310-316`; fallback V3) and `About.V4.tsx` at `/about` (`:88-92,357-364`; fallback V3). Unmounted sibling fleet (V1/V2/V3 components, `HomePage/cinematic/` tree, `about/` legacy set) = Rule-34 archive candidates AFTER the refactor ships — EXCEPT the V3 fallbacks, which stay and therefore must receive the same stats-truth fix (they currently duplicate the contradictions: `HomePage.V3.tsx:172,176`, `About.V3.tsx:94-95`).

## 2. Slice 6.1 — ONE shared stats module (S/M) [P1-2 closer]

- NEW `frontend/src/content/marketingStats.ts` — single source: `{ yearsExperience, clientsTransformed, satisfactionPct, sessionsDelivered, swimmersTaught, lbsLostTogether, exerciseLibraryCount }`. Every value `[NEEDS-SEAN-NUMBER]`-flagged until D-F lands; `exerciseLibraryCount` sourced from a build-time constant reconciled to the real DB count (~736 per memory; verify with a count query at build).
- Consumers rewired: `HomeData.ts:73-80,94` · `AboutData.ts:19-24,86,99` · `About.V4.tsx:50-51` · `about/HeroSection.tsx:95` · `HomePage.V4.tsx:58` · `VIPConversionModal.tsx:887` · V3 fallbacks (`HomePage.V3.tsx:172,176`, `About.V3.tsx:94-95`).
- Contract test locks: no numeric marketing claim outside the module (grep-class test like the NASM-certified lock from P0-2).
- Current contradictions being killed: clients 500+ vs 1000+ · satisfaction 98% vs 97% · exercises 840+ vs 900+ (DB ~736) · years 26 vs 25+.

## 3. Slice 6.2 — Promise matrix applied (M) [Sean sign-off per row]

Every feature claim classified **shipped / scheduled (Phase 8) / edit-out**. Proposed defaults (Sean overrides per row):

| Claim (receipt) | Reality | Default |
|---|---|---|
| Voice-First Swan Coach (`HomeData.ts:95`) | shipped (trainer voice logging live; client gated → Phase 3c) | KEEP, soften "manage sessions by voice" until 3c |
| 840+/900+ exercise library (`HomeData.ts:94`, `AboutData.ts:99`) | DB ~736 | 6.1 number |
| AI-driven programming every tier (`ProgramsSection.tsx:132,139`) | shipped (generator live; Coach Draft pending Render key) | KEEP |
| Skill trees (`AboutData.ts:106`) | NOT shipped (gamification V2 deferred) | EDIT-OUT or "coming" tag — Sean |
| 50+ Victory charts (`AboutData.ts:91`) | 12 canonical + profile set; 50-chart gallery is DEAD demo code | Reword to truthful count post-BP03 |
| Creator/community spaces: gaming/music/art/comedy/YouTube-style (`HomeData.ts:82-91`) | NOT shipped as promised | Reword to what community DOES have (feed, challenges, sharing) + Phase 8 candidates |
| Corporate wellness on-site programs (`HomeData.ts:20`) | service Sean genuinely offers in-person | KEEP (service claim, not software) — confirm |
| Golf program (`GolfSection`, `HomeData.ts:44-50`) | lead-gen angle, real coaching | KEEP |
| Guardian donation tier "pay what you can" (`AboutData.ts:111`) | tier system live | VERIFY copy matches live tiers |
| Trainer marketplace ~10% fee (`HomeData.ts:96`) | payments live; marketplace onboarding not self-serve | Soften to invitation framing — Sean |
| "Transitioning into AI development" (`AboutData.ts:41`) | true | KEEP |

## 4. Slice 6.3 — Legal pages (S) [LAUNCH GATE item — currently DEAD LINKS]

Footer links `/privacy`, `/terms`, `/sitemap` (`Footer.tsx:423-425`) hit the catch-all → silently bounce to Home (`main-routes.tsx:882-885`). **No privacy/terms pages exist anywhere in src.** Launch gate requires legal pages live.
- Build `PrivacyPolicyPage` + `TermsOfServicePage` (static, token-styled, real content — Sean reviews legal copy; draft from the app's actual data practices: PII handling, LLM zero-PII proxy, payments via Stripe, R2 media, cookies/localStorage, CCPA basics) + register routes + drop `/sitemap` link or emit a real sitemap.
- Waiver already live (`/waiver` → `PublicWaiverPage.V3`, `main-routes.tsx:101-105`).
- Medical disclaimer already in footer (`Footer.tsx:437-439`) — keep.

## 5. Slice 6.4 — Meta/OG + hero LCP (S/M)

- **Duplicate Helmet on Home:** `HomePage.V4.tsx:56-59` AND `HeroSection.tsx:106-109` both set title/description (hero's generic pair can win) — remove the hero's.
- **Per-route OG:** og:/twitter: tags exist only statically in `index.html:57-69`. Add a small `<SeoHead>` helper (react-helmet-async already wired) emitting per-route title/description/og:image; Home + About + Store + Gallery first.
- **Hero LCP:** `HeroSection.tsx:114-118` renders the R2 `<video>` with NO poster in balanced/full tiers (static `hero-swan-bg.png` fallback only renders in `essential`, `:111`; default tier = balanced, `useAnimationTier.ts:20`). Fix: `poster={heroSwanBg}` on the video element + `preload="metadata"` — first paint becomes the committed image on every tier. Same for About hero (`ParallaxHero` already takes `imageSrc` poster — verify wired, `ParallaxHero.tsx:93-94`).
- Perf: per-section `React.lazy` for below-fold Home sections (all 12 currently eager, `HomePage.V4.tsx:20-31`, dragging framer-motion into one chunk); keep hero+mission eager. Cap the fixed SVG-noise overlay (`HomePage.V4.tsx:38-47`) to `full` tier only (verify) or drop. Budget: mobile LCP < 2.5s.

## 6. Slice 6.5 — PII/consent sweep (S) [Sean input]

- Testimonials (`HomeData.ts:52-71`): three named individuals with results — **"Officer Martinez" (law enforcement + fitness-test detail) is the highest consent risk.** Each testimonial needs D-F consent confirmation or replacement with consented/anonymized versions.
- Wife named "Jasmine" (`AboutData.ts:37`, `AboutSeanSection.tsx:180`) — Sean's call (private individual).
- Footer real contact (phone/email/city, `Footer.tsx:396-404`) — intentional business contact; confirm.

## 7. Slice 6.6 — Cinematic pass (L, LAST, swan-design-router gate MANDATORY)

Truth first, beauty second — 6.6 starts only after 6.1–6.5 land. Run the router's 2–3 concept-direction ideation gate per SWAN-CINEMATIC-DESIGN-SYSTEM (narrative arc B2, C1-C12 patterns, signature moment per section, scroll-video hero technique already half-present via framer-motion `useScroll` in `HeroSection.tsx:96-98`). Constraints from evidence: keep the tier system (`useAnimationTier`) as the perf spine; unify the Footer's theming channel (styled ThemeProvider) with the pages' CSS-var tokens; every section keeps its `tier` prop. Prices stay off public surfaces (P1-1 server gate verified — recon found zero $ on Home/About; `VIPConversionModal` $175 literals are the gallery flow, sweep them to the §5 gate policy at build).

## 8. Acceptance criteria

- [ ] One stats module; grep-lock test proves no marketing number lives outside it; V3 fallbacks + VIP modal rewired; all numbers either Sean-supplied or visibly `[NEEDS-SEAN-NUMBER]` (launch gate: none left flagged).
- [ ] Promise matrix table signed by Sean; every edit applied; no claim promises unshipped software.
- [ ] `/privacy` + `/terms` render real content (no catch-all bounce); footer links resolve; Sean approved legal copy.
- [ ] Home first paint shows the hero image on every tier (poster wired); single Helmet winner; per-route OG tags verified with a link-preview probe.
- [ ] Testimonial consent confirmed or content replaced.
- [ ] Lighthouse mobile on `/`: LCP < 2.5s [measured, not assumed]; below-fold sections lazy.
- [ ] Cinematic pass passed the design-router ideation gate + hostile design critique + responsive matrix (320→3840).

## 9. Effort + sequencing

6.1 S/M (buildable NOW with flags) → 6.3 S (launch gate) → 6.4 S/M → 6.5 S (Sean) → 6.2 M (Sean per-row) → 6.6 L (design-gated, last). D-F remains the only true blocker and only for final numbers — everything else ships around it.
