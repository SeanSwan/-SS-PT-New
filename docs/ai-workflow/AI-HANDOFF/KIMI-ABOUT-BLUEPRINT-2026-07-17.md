# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** .ai-workflow/fusion/kimi-about.md
**Seed:** (none)
**Tokens:** 1386 in / 8476 out · **Cost:** ~$0.1313 · **Wall:** 271.9s

---

# KIMI K3 — HOSTILE DESIGN + FRONT-END REVIEW: About Page Blueprint Spec

## (a) VERDICT

**SEND-BACK.** This is a thorough *constraint sheet* masquerading as a design brief — it legislates process exhaustively while leaving the three decisions that actually determine whether this page is premium (what the signature phenomenon IS, what the tokens ARE, what the page CONVERTS TO) completely undefined, which violates its own "zero decisions left" standard at the exact points that matter.

---

## (b) Design weaknesses, most-severe first

**1. The signature moment is demanded by reference, never designed.**
"The ONE impossible phenomenon (optics)" is written as if a known artifact. It isn't defined anywhere in the doc. You are asking the blueprint author to invent the single most important brand artifact on the page — the thing a visitor remembers — with one parenthetical. Meanwhile "optics-not-creatures" plus a brand *named Swan* is an unresolved tension: pure abstract refraction glitter is generic (every WebGL agency site, 2023), and a literal swan is banned. The sanctioned middle path — a swan **logomark assembled from light caustics**, a mark not a creature — is never stated. Left to a builder, you get either chickened-out glitter or a banned bird. This is the doc's central irony: maximal process control, zero authorship of the one thing worth controlling.

**2. No CTA. The page is a museum.**
Story → mission → credentials is specified. Then what? An About page with no defined conversion action (book a consultation, start training, view programs) is a monument, not marketing. The signature moment should *resolve into* the CTA — emotional apex, then the ask. The doc never says where this page routes. Weak hierarchy isn't a risk here; it's guaranteed, because the terminal node of the information architecture doesn't exist.

**3. "Full cinematic alive/scroll-story/parallax" with no effect budget is a noise mandate.**
One line grants cinematic everything; nothing rations it. Premium is *restraint*: one effect per viewport, one glow source per screen, everything else still. Unconstrained, Dual-Button Glow + parallax + reveals + a signature moment stacks into AI-SaaS slop — the exact template feel this brand exists to kill. The doc needs hard budgets: max 1 pinned scene, max 1 glowing element per viewport, gold ≤2 appearances per page (my recommendation: exactly one, at The Convergence — see (d)).

**4. Unenforceable token contract = unenforceable everything else.**
Galaxy hexes are "rejected on sight, including as fallbacks" — but the doc pins **zero** Crystalline fallback values. Every `var(--token, #fallback)` the output produces will contain an *invented* hex, because a var() fallback is definitionally a hardcoded hex. The house rule as literally written bans its own required syntax. Without a published 10–14-token canonical fallback table (midnight-sapphire, obsidian, ice-cyan, wing-purple, gold, plus surface/text/border tiers), the de-Galaxy check, the WCAG 4.5:1 check, and the `--world-*` re-skin promise are all unverifiable vibes. Concretely: wing-purple as *text* on midnight-sapphire almost certainly fails 4.5:1 — the doc must declare which tokens are text-legal vs. decorative-only, or AA compliance is aspirational.

**5. No material/elevation system, no spacing rhythm, no typography. Silence on all three.**
- **Surfaces:** "midnight-sapphire/obsidian" is named, but no material is specified. On dark luxury, gray box-shadows read *dirty* and cheap. The spec should demand: 1px hairline borders (`1px solid color-mix(in srgb, var(--lens-cyan) 18%, transparent)`), inner sheen gradients, backdrop-blur reserved for exactly one layer (nav or one glass card), zero drop shadows below the signature moment.
- **Rhythm:** no spacing scale means sections will accordion. Demand: 8px base, section gaps `clamp(96px, 14vh, 200px)`, nothing else.
- **Typography:** the doc's loudest omission. An About page *is* type. The mission line is load-bearing and no display treatment is specified — no fluid scale, no measure cap, no eyebrow/H1 decision (H1 should be the mission statement, name in the eyebrow, one H1, strict h2 section order). Without this, the builder ships Inter-everything and the page is a template regardless of how good the optics are.

**6. Mobile is an afterthought wearing a matrix costume.**
Demanding explicit values at 8 widths (320→3840) is screenshot theater, not responsive design. It produces 8 frozen layouts broken at 500px and 1200px. Worse, it dodges the real mobile question: **pinned scroll scenes on 375px are the failure mode** — iOS Safari address-bar resize thrash, broken momentum scroll, focus trapped inside pinned scenes. The doc mandates scroll-story but never states the mobile motion strategy. (Specify: unpin below 768px; sticky + IntersectionObserver reveals only.)

**7. No performance budget on the page where performance matters most.**
This is the public marketing surface — LCP and SEO live here. Nothing specifies: KB caps, font-loading strategy, hero render without JS, asset budgets for the signature moment, OG/meta/JSON-LD. As written, this spec ships a 4MB parallax that white-flashes, fails Core Web Vitals, and looks like nothing when shared on iMessage. A competitor's static, instantly-rendered, beautifully-typed page will *feel* more premium than your janky cinema. Luxury is 60fps and sub-2s LCP, not more effects.

**8. "NO MOCKS, real API for everything" is architecture dogma misapplied to editorial content.**
An About page is 90% copy. Forcing stats/timeline behind backend surfaces creates two failure modes: (a) a vanity stats endpoint minted to satisfy the rule — fake numbers presented as real, which the doc itself bans; (b) over-engineering yearly-changed marketing copy into a CMS that doesn't exist. The honest bindings: "26+ years" must be **computed from a `start_year` in a real coach-profile/settings record** (hardcoded "26+" is wrong next year — that *is* a mock with extra steps); timeline/story = versioned in-repo content file with a schema, which is not a mock, it's editorial. The rule should permit "this feature binds to nothing, and that's correct" as an answer.

---

## (c) Implementation-fidelity attacks

- **styled-components correctness:** Scroll-driven values must **never** flow through React state or styled prop interpolation — 60fps re-renders via `setState` on scroll is the classic death. Mandate: scroll progress written to CSS custom properties via `ref` + rAF-throttled listener (or CSS `scroll-timeline` with fallback), consumed by `transform`/`opacity` in static styled definitions. Transient props (`$`-prefixed) only; no styled components created inside render; `keyframes` via the `css` helper. None of this is stated.
- **Responsive reality:** Replace the 8-width matrix with 3 layout modes — single-column flow <768px, split ≥768px, wide-guard ≥1440px with a 1520px content column and 60–75ch text measure — then *verify* at 320/768/1440/2560. The 3840 requirement is an unforced asset problem: either 4K caustic/hero variants (weight) or soft upscaling (cheap). Pick: srcset capped at 2560 + CSS overscan.
- **44px targets:** Timeline dots and social icons are the canonical violators — a 12px dot needs a 44px pseudo-element hit area. State it or it won't happen.
- **Keyboard/focus/reduced-motion:** Pinned scenes + tab order = elements focused offscreen. Require: focus-visible ring in ice-cyan (2px, offset 2px), skip-link, and critically — **all IO-revealed content fully visible with no JS and no motion under `prefers-reduced-motion`** (no `opacity: 0` initial states that depend on JS to clear; use a `motion-ok` gate). The Crystallize must ship a static converged final frame as its reduced-motion state.
- **Nested interactives:** Preempt the classic About-page bug — chapter/team cards as `<a>` wrapping `<button>`s. Card is either the link *or* contains links. Never both.
- **300-line cap vs. scope:** A cinematic scroll-story with tokens, motion hooks (`usePrefersReducedMotion`, `useScrollProgress`), 5+ sections, and the signature canvas will not fit the cap without an explicit extraction map. The doc demands extraction but provides no file map, so the builder improvises the architecture — the exact thing "build-exact" forbids.
- **Reversibility precision:** The env-flag pattern in Vite is **build-time** — "flip the flag" means rebuild/redeploy, not a runtime toggle. Say so, or spec a runtime config endpoint. And demand the V5 chunk be `lazy()`-loaded so public users don't download *both* About pages — side-by-side versions in one chunk doubles the bundle you're reverting to escape.
- **Evidence fabrication:** The doc demands "top 5 weaknesses w/ file evidence" of the current build while supplying exactly one filename (`About.V4`, ~92 lines) and zero section code — where it admits "the real design is." The output will hallucinate file evidence to satisfy the format. Attach the sections or rescope the review demand.

*(Credit, because hostility requires honesty: the two-speed law, additive-only backend, transform/opacity-only motion, and the credentials-language rule are correct and show taste.)*

---

## (d) The ONE highest-impact change

**Design the signature moment now, and make it THE CONVERGENCE.**

Throughout the page, each section emits 1–3 stray light shards — thin refracted streaks (masked CSS gradients, GPU transforms only) that drift subtly with scroll and never resolve into anything. The visitor registers them subliminally as decoration. Then, at the mission line — the load-bearing sentence — scroll drives the shards through a virtual prism: they converge, and for exactly one viewport-height of scroll, the caustics on the obsidian floor **assemble the Crystalline Swan mark out of pure light** beneath the words. At exact convergence: a 400ms gold flare — the *only* gold above the footer, honoring "gold as the rare accent" by making it a single event. Scroll past, and the mark disperses back into shards. That's the impossible phenomenon: a caustic shouldn't hold a silhouette; the mark exists only from one vantage, like anamorphic sculpture. It is ownable, it is *only this brand*, it threads optics-not-creatures (a mark, not a bird), and it converts — the CTA sits at the dispersal point, the exhale after the apex.

Implementation (buildable, no shader roulette): a 24–36-frame precomputed caustic sprite (WebP, ≤400KB total) scrubbed by scroll progress on `<canvas>`, transforms/opacity only; reduced-motion and no-JS get the static converged frame — which doubles as the OG image. Tint via `--lens-*` tokens so Appearance Studio re-skins it.

---

## (e) What a design-savvy competitor out-builds here

- **Typography as the luxury signal.** A high-contrast display face on the mission line with a real fluid scale (`clamp(1.75rem, 1.1rem + 3vw, 3.5rem)`), tight measure, real numbers and dates in the story — while this spec ships glow-everything and Inter.
- **Restraint.** One flawless effect versus five at 80%. They'd cut glow entirely, use gold hairlines and negative space, and their page whispers while this one hums.
- **Speed as craft.** Sub-2s LCP, SSR'd hero, zero scroll-jank on a mid-tier Android — the page *feels* expensive before a single effect runs.
- **The share surface.** OG card, meta, JSON-LD — their About page looks premium in a text message; this spec's renders as a gray link.
- **A CTA.** Their story ends in a booking. Yours, as specified, ends in a footer.

**Fix list to resubmit:** publish the canonical Crystalline fallback token table (with text-legal vs. decorative tiers), adopt or replace The Convergence, name the CTA, add the perf budget, swap the 8-width matrix for fluid scales + 4 verification widths, permit "binds to nothing" as an honest backend answer, and attach the section code your own hostile-review format requires.
