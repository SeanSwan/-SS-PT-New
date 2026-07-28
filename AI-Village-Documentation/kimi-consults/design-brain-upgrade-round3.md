# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-DESIGN-BRAIN-AESTHETIC-UPGRADE-MASTER-2026-07-18.md
**Seed:** AI-Village-Documentation/kimi-consults/design-brain-upgrade-round2.md
**Tokens:** 13686 in / 13567 out · **Cost:** ~$0.2446 · **Wall:** 414.2s

---

# THE WORLD & ATMOSPHERE SYSTEM — Round 3: The Build-Authoritative Delta
**Kimi K3 · Final Design Authority · 2026-07-18**

The locked spec stands — doctrine, engine, eras, taste, two-mode autonomy, the 14-var map, the ledger. Nothing below reopens any of it. This pass dispositions both reviews and authors the corrections that make the spec buildable. Fable's notes were competent; the Village's three Criticals were correct. All of it folds.

---

## A. DISPOSITIONS

**Fable (§7.6):**

| # | Ruling | One line |
|---|---|---|
| C1 | **ACCEPT, as refined by Village C-1** | CC **BY 4.0**, not BY-SA — credit manifest authored in B1; still $0, still Sean's path. |
| C2 | **ACCEPT** | One sentence lands in `adapters/world-generator.md`: EXPLORE is exempt from budgets and the token floor, **never** from zero-PII or provenance law. |
| C3 | **ACCEPT** | Threshold set: rendered face **≤32px** tall in the shipped asset; above that the figure is turned, occluded, or cropped; never seeded from real/client photos; no identifiable or celebrity likeness — world-gate checks it. |
| C4 | **ACCEPT** | `world-atmosphere.md §5` is the single authored source; CI codegen emits the runtime data file; a hand-mirror is a world-gate fail. |
| C5 | **ACCEPT** | GR-1 is **baked into delivered L0/L1 assets at export**; `--world-grade-filter` applies to L2 synthetic and sandbox only — low-end mobile never pays a runtime filter. |
| C6 | **ACCEPT** | Scale-Reveal gains focus-move to the revealed milestone + `aria-live="polite"` announcement; 44px restated as a world-gate line; forced-colors/HCM collapses all world layers to ground tier with system colors. |
| C7 | **ACCEPT** | Unsplash + Pexels official APIs only; Pinterest removed everywhere — authored in B4. |
| C8 | **ACCEPT** | Playwright headless in CI; deterministic sampled slots per `worldId × slot`, sample set committed to repo — restated in B7. |

**AI Village (§7.7):**

| # | Ruling | One line |
|---|---|---|
| Critical-1 | **ACCEPT** | Exact license law + automated manifest — B1. |
| Critical-2 | **ACCEPT** | `[EXISTING]`/`[TO BUILD]` convention + Three.js/R3F downgrade — B2. |
| Critical-3 | **ACCEPT** | Quantified budget — B3. |
| High-4 | **ACCEPT** | Era-token namespace protocol + Pinterest strike — B4. |
| High-5 | **ACCEPT** | "The world at rest" state doctrine — B5. |
| High-6 | **ACCEPT** | Escalation path + independent check + convergence summary inlined in the consolidated doc — B6. |
| High-7 | **ACCEPT as scoped** | Security/PHI/PCI belongs to the stack declaration, one line — B7; the "Identity-Blind AI Privacy" phrasing is softened to design-intent pending that declaration. |
| Med-8 | **ACCEPT-IN-PRINCIPLE, DEFERRED** | Training Score formula, Rest-State UI, nutrition theming are Lane-A per-surface specs, not world-layer law. |
| Med-9 | **ACCEPT** | Becomes section C. |
| Med-10 | **MODIFY** | Each pillar gets one emotional-goal line + one falsifiable engagement hypothesis in `world-atmosphere.md`; monetization machinery is Sean's lane — I author hook points, not a business plan. |
| Blind: severity | **ACCEPT** | All gates adopt one scale: **BLOCKER / MAJOR / MINOR / NOTE**. |
| Blind: i18n/RTL | **ACCEPT** | Law: no text baked into any world asset (extends the diorama zero-text rule to Epic); compositions mirror-safe or declared symmetric; RTL check joins world-gate. |
| Blind: version/rollback | **ACCEPT** | Authored in D. |
| Blind: cost cap | **ACCEPT** | Authored in D. |
| Blind: manifest↔GDPR | **ACCEPT** | Every manifest record keys `asset_id`; the manifest **is** the deletion index — a deletion request cascades manifest → asset → derived crops. |

---

## B. THE CORRECTIONS, AUTHORED

### B1 — Cosmos license law + the Credit Manifest

**License classes (exact, exhaustive — any other string fails the gate):**

| Class | Applies to | Terms |
|---|---|---|
| `PD-USGOV` | NASA-produced works (incl. NASA Webb releases) | US-Gov public domain (17 U.S.C. §105). **No-endorsement caveat:** use must never imply NASA endorsement; NASA insignia/logos never used. |
| `CC-BY-4.0` | JWST + ESA/Hubble imagery distributed via STScI | Attribution required; commercial use permitted; **no ShareAlike**. Attribution string renders in the surface's credit slot (content tier), never overlaid on the art. |
| `VERIFIED-PER-ASSET` | ESA general multimedia and all other sources | License verified and recorded per asset before ingestion. No verified license on file → the asset does not exist for us. |
| `GENERATED-DISCLOSED` | Terrestrial Epic + all Miniature assets | Sean's Q5 free path: generated-with-care, generator named, disclosure recorded. |

**The manifest:** `design-brain/world-assets/credit-manifest.json` — one record per shipped atmospheric asset:

```json
{
  "asset_id": "epic-zenith-hero-001",
  "world_id": "epic-zenith",
  "license": "CC-BY-4.0",
  "source": "STScI / NASA Webb",
  "source_url": "https://webbtelescope.org/...",
  "license_url": "https://creativecommons.org/licenses/by/4.0/",
  "attribution_string": "NASA, ESA, CSA, STScI",
  "attribution_rendered": true,
  "added": "2026-07-19"
}
```

**CI rule (world-gate, BLOCKER):** merge is blocked if (a) any shipped Epic asset lacks a manifest record; (b) `license` is empty or outside the four classes; (c) a `CC-BY-4.0` record lacks `attribution_string` or renders it as overlay; (d) a manifest record points at no asset (deletion-cascade check — the manifest is the GDPR deletion index).

### B2 — The `[EXISTING]` / `[TO BUILD]` convention + the 3D downgrade

**Convention (binding on every brain file and the master doc):** every capability, tool, and pattern claim is tagged `[EXISTING]` (shipped and verified in production today) or `[TO BUILD]` (spec'd, not yet built). Untagged claims are a documentation fail.

**Corrected tags:**
- `[EXISTING]` — Crystalline Swan token system, styled-components discipline, Victory, dual-pass review, Mobbin MCP, Playwright MCP, Seedance 2.0 pipeline, NanoBanana/key.ai + GPT-image stills.
- `[TO BUILD]` — `WorldAtmosphere`, `DioramaFrame`, the `motionMode` resolver, the 14-var contract, contrast matrix + codegen, credit manifest + CI, world-gate, Scale-Reveal, **Ice Wing streak rings**, **the reduced-motion celebration toggle**, the lens registry, `taste-profile.md`, `identities/`, the Unsplash/Pexels reference integration.

**The 3D downgrade (struck and re-stated):** "Three.js/R3F sanctioned for small surgical moments" is **struck**. New standing, stated once: **Three.js/R3F is `EXPLORE-sandbox-candidate — not production-sanctioned`.** v1 production surfaces ship zero runtime 3D. The only door into production is the full translation discipline gate (soul-mechanic invariant + discipline rebuild) **plus** a per-surface GPU-floor check (B3) **plus** a feasibility spike I sign. Default answer remains no.

### B3 — The quantified performance budget

All targets: **p75, mobile, Moto-G-class device, 4G throttling** (Lighthouse + WebPageTest).

| Metric / asset | Budget |
|---|---|
| LCP | **≤ 2.5s** — LCP element is the content headline or the L1 hero still; never video, never canvas |
| FCP | **≤ 1.8s** |
| CLS | **≤ 0.05** (stricter than 0.1; parallax is banned and `DioramaFrame` ratio-locks) |
| INP | **≤ 200ms** |
| Route JS | ≤ 350KB (existing budget stands) |
| Route media, L0 total | ≤ 2.5MB (stands) |
| Epic hero still | **≤ 160KB** — AVIF primary, WebP fallback, srcset 768/1280/1920 |
| Diorama still | ≤ 120KB |
| Micro-world motion loop | **≤ 1.2MB per loop**, ≤ 8s, ≤ 720p, muted with audio track stripped, H.264 primary / AV1 optional; max 2 loops per route inside the 2.5MB envelope; L1 poster ≤ 120KB mandatory |
| Three.js GPU floor (for any admitted 3D) | WebGL2 required; tier floor = Apple A12 / Snapdragon 730G / Intel UHD 620 class (`deviceMemory ≥ 4GB`, `hardwareConcurrency ≥ 6` as proxies); **sustained ≥30fps @ 1× DPR for 10s or auto-drop to L1/L2**; 60fps target on tier-high; DPR capped at 2; rAF paused offscreen via IntersectionObserver — mandatory |

**The asset-to-interaction rule — "interaction never waits on the world":** TTI ≤ 3.5s on 4G mobile *independent of world-media completion*. World media is never on the critical rendering path except the single LCP hero still (`fetchpriority="high"`); all other world assets lazy-load, `decoding="async"`. While any world asset is pending, the surface renders fully functional at L3 ground tier.

**Baseline:** before Phase 2 code, capture sswanstudios.com Lighthouse (mobile) + WebPageTest runs for the five key routes; commit as dated `perf-baseline.json`. World-gate enforces budgets on new/changed routes and flags >10% regression on unchanged ones.

### B4 — The era-token collision protocol + Pinterest removal

1. **Namespace:** every era-scoped custom property is `--era-{lensId}-{property}` (e.g. `--era-lens-80s-neon-skyline`). Any era declaration outside this namespace = world-gate fail, BLOCKER.
2. **Extend, never override:** a lens may not declare or reassign any core token (`--swan-*`, the 14-var `--world-*` contract, brand primitives). World-gate static-scans lens stylesheets for core-token redefinition → fail. Era values compose from core refs (`color-mix`) or introduce additive values within the §3.2 bounds (saturate .75–.95, brightness .85–1.0, ≤2 texture layers).
3. **WCAG-validated at registry time:** every lens ships a declared contrast pair set validated against the per-world contrast matrix — 4.5:1 body / 3:1 large against obsidian ground. A lens that cannot hold the floor does not ship. The warm packs (60s/70s/80s/90s) therefore default to **marketing-surface-only** until a pilot proves them.
4. **Surface-scoped:** era tokens load only on surfaces declaring that `styleLensId` — tree-shaken, never global.
5. **Pinterest is removed from the tool stack** — §4.6 of the master doc and my §3.4 line are both amended. Atmosphere reference consolidates on **Unsplash + Pexels official APIs** under the external-reference-mcp gate (principles/mood only, nothing committed; finals are generated regardless).

### B5 — State aesthetics: "the world at rest"

**Loading — the room is lit before the artwork arrives.** L3 ground tier renders first (obsidian ground + seam, content fully readable, inside FCP budget); world assets fade in through the seam (opacity settle ≤200ms, no slide, no parallax). No spinner is ever the hero of a surface; if progress must be shown it is a seam-shimmer on the ground tier, decorative, `aria-hidden`, frozen under reduced-motion, real status carried by text. Skeletons are ground-tier panels with an 8%-luminance seam shimmer — architecture, not gray boxes.

**Empty — the world at rest.** Miniature archetypes render the empty set: the tiny gym at dawn, practicals on, no figures. Epic archetypes render ground + seam composition with no focal subject. Copy sits in content tier per existing empty-state patterns. Empty is *composed*, still graded, still passing the same contrast matrix — the world waiting, not a missing world.

**Error — graceful descent.** A failed asset silently descends L0→L1→L2→L3; no broken-image glyph ever ships. Terminal state: L3 ground tier + a single gold seam accent + standard error copy + an **unthemed** retry button — errors are product, not theater. Telemetry fires per descent step. Product errors (form, payment, auth) always render in content tier, regardless of world state, and never inherit world styling.

### B6 — Escalation path + the independent check

**Kimi vs. CLAUDE.md:** the floor wins automatically, now proceduralized: (1) the conflict is logged in the amendments ledger as `KIMI-CONCESSION-{date}-{n}`, rule cited, my direction struck; (2) build proceeds per the rule; (3) if I judge the rule wrong for the product I file a rule-change proposal to **Sean — he alone can amend the floor**. No silent fork, no build-time arbitration. Token forks, retired-theme, a11y, and PII conflicts resolve against me by default.

**Independent check (kills the single-point-of-aesthetic-failure):** before Phase 1 is declared done, a reviewer who is **not the builder and not me** (Fable, or a fresh village agent) runs three checks against the authored sources — not the runtime files: (a) token-fork scan (no core redefinition, no inline hex in world components, era namespace law); (b) recomputed contrast math from `world-atmosphere.md §5`; (c) banned-hex scan incl. Galaxy-Swan. Sign-off recorded in the ledger. This is a gate, not a courtesy.

**Convergence evidence:** the consolidated build doc inlines a one-page summary of my round-2 spec (Two-World Doctrine, Scale-Reveal, 12 archetypes, the 14-var map, the two-mode adapter) so a builder acts on the single document alone.

### B7 — One line

Auth, payment/PCI, PHI, and wearable-security component specs are **out of this workstream's scope and belong in the stack declaration** (flagged there, not authored here) — and the world-gate composite-contrast check runs **in CI (Playwright headless, per C8)**; a local-only run is not a pass.

---

## C. PHASED BUILD ORDER

**Phase 0 — pre-build gate.** Capture `perf-baseline.json`. Run the B6 independent check on the authored values. Flag Unsplash/Pexels API terms + any cost to Sean before wiring.

**Phase 1 — brain content slice (ships first, zero runtime code).** The 7 new files — with `world-lenses.md` carrying the schema + `lens-2020s-glass` **only** (the six remaining eras ship as registry stubs; content deferred). `identities/crystalline-swan.md`; `taste-profile.md` seeded from §D1; `design.md` appendix (14-var contract + both primitives); anti-patterns +9; world-gate v1 spec in `qa-gates.md`; credit-manifest schema + seed records; adapter updates; the 2026-07-17 generator docs archived with SUPERSEDED banners; `index.md` rows; obsidian/graphify registration; master doc amended (Pinterest out, tags applied, summary inlined).

**Phase 2 — Lane A runtime slice.** 14-var contract; `WorldAtmosphere`; `DioramaFrame`; `motionMode` resolver; contrast-matrix codegen from §5; credit-manifest CI; Playwright headless world-gate **in CI**; the three state aesthetics implemented on the primitives.

**Phase 3 — first surface.** Milestone level-up Scale-Reveal (Vista → Ascent/Zenith) with L0–L3 shipped, first Epic assets via the NASA/STScI free path with manifest records, focus + `aria-live`, reduced-motion settle, celebration toggle, budgets enforced.

**Deferred behind feasibility spikes** (each: EXPLORE-only, timeboxed, ends in a go/no-go I sign):
- **Era content** — the six packs author only after one marketing-surface pilot (a landing, 80s or Y2K) proves the collision protocol and WCAG validation in practice.
- **Procedural 3D micro-worlds** — sandbox spike only; translation decision after the spike report.
- **Any Three.js/R3F production use** — same spike; default stays no.
- **Design-Brain MCP server** — unchanged; later slice, delivery option C step 2.
- **`design-authority` skill** — at closeout per §7 step 7, with the D-cap baked in.

---

## D. COST CAP + VERSION/ROLLBACK

**`design-authority` spend law (Rule 16, hardened):** pre-flight spend projection printed before any paid call; **soft alert at $20/run; hard cap $50/run — auto-abort with partials preserved**; any single consult projected >$5 requires Sean's explicit approval; actuals logged per run. Calibration: the Kimi consult cost $0.2258, the 15-brain village run $0.69 — a standard authority run should land under ~$2; the cap exists for parallel-variation EXPLORE mode, the only expensive path. Asset-generation spend (Seedance/GPT-image) is tracked separately under the existing pre-flag rule.

**Version + rollback for the portable brain:** brain releases are git-tagged `brain-vX.Y.Z`; every brain file's front matter records `brain_release` + `supersedes`; generated runtime files embed the release tag; identity configs **pin the release they were authored against**, so a second brand is never silently moved by canon changes. The amendments ledger is the changelog. Rollback = revert to the prior tag **plus a rollback entry appended to the ledger** — history is never rewritten, the same append-only law as the taste ledger. The portability paper-exercise re-runs at every minor release.

---

The doctrine stood; the floor is now licensed, quantified, namespaced, and gated. The reviews made the spec harder to break and not one degree less beautiful. Claude builds Phase 1, exactly.

— Kimi K3
