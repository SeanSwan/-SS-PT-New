# design.md — SwanStudios Canonical Design System (Design Brain core)

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (within its scope)
- **Source of truth it adapts:** `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` (wins all conflicts) + `SWAN-ASSET-STORYBOARDING.md`
- **Mirror:** `design.html` shows this visually. If they disagree, THIS file wins; update both together.

---

## 1. Design principles

1. **Dark-first, colorful within dark.** Default theme `crystalline-dark`. "Dark room lit by glowing objects," never grayscale minimalism (source §B atmospheric rules).
2. **Story before sections.** Every page fits a narrative arc — B2.1 (marketing: Hook → Proof → Momentum → Conversion) or B2.2 (dashboard: Orientation → Current state → Insight → Next best action). Name the arc before coding (source §B2).
3. **Real data or labeled draft.** Charts and metrics come from real logs; mock data is a gap, never dressed as truth (Product Core Loop).
4. **Editorial asymmetry.** Grids break; negative space is a component; the biggest thing on screen is the biggest idea (source §B composition).
5. **One signature moment per page/section**, budgeted (see `motion.md`). Everything else stays calm.
6. **Premium ≠ noisy.** Glow, glass, and motion are discipline systems with recipes — not decoration sprinkled until it "feels fancy."
7. **Tokens with fallbacks, always.** `var(--token, #hex)` (rule 6). New tokens are proposals to Sean, never inventions in a component.
8. **44px minimum touch targets** (rule 2); WCAG 4.5:1 contrast (rule 7); reduced-motion honored everywhere (rule 25).

## 2. Brand feel — Enchanted Apex: Crystalline Swan

Frozen enchanted forest meets deep-ocean luxury vault. Sapphire depths, ice-glow accents, gilded luxury edges, obsidian ground. Typography carries drama (Cormorant italic beats) against precise UI faces. The RETIRED Galaxy-Swan theme (`#0a0a1a`, `#00FFFF`, `#7851A9`) is banned everywhere.

## 3. The two modes

| Mode | Where | Tokens |
|---|---|---|
| **Crystalline Swan** (canonical) | ALL product surfaces: marketing, storefront, user/client/trainer/admin dashboards, Swan Coach, Coach Command Center, onboarding | Full palette §4, unmodified |
| **Crystalline Cyberforest** (operator-only) | Hermes operator surfaces ONLY (Sean-only tooling, per `HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` §10) | Same token system + the forest/aurora extension layer below. **Never on client-facing UI.** Product rules (44px, dark-first, reduced-motion, 4.5:1) still apply |

**Cyberforest extension layer** (additive; base palette unchanged):

```
--cf-forest-deep:  #0E2A1E;   /* deep forest bg — replaces Obsidian as page base on operator surfaces */
--cf-forest-mid:   #1A4032;   /* elevated operator panels — replaces Carbon/Graphite card layer */
--cf-aurora: linear-gradient(120deg,
  rgba(96, 192, 240, 0.18) 0%,     /* Ice Wing shimmer */
  rgba(139, 92, 246, 0.14) 45%,    /* Wing Purple mid-band */
  rgba(198, 168, 75, 0.10) 100%);  /* Gilded Fern horizon */
```

Aurora is a top-edge/header wash or divider treatment at low opacity — never a full-page animated background. Text, buttons, glow discipline, and tier badges use the standard palette. If a component works in Swan mode, it works in Cyberforest mode by swapping only the bg/surface layer tokens.

## 4. Color tokens (Crystalline Swan — active palette)

Always consumed as `var(--token, #fallback)`:

| Token | Hex | Role |
|---|---|---|
| `--midnight-sapphire` | `#002060` | Primary — button backgrounds |
| `--royal-depth` | `#003080` | Surface — elevated cards |
| `--ice-wing` | `#60C0F0` | Cyan glow — gaming accents, XP bars, glow rings |
| `--arctic-cyan` | `#50A0F0` | **DATA ONLY** — chart series. NOT buttons, NOT glow |
| `--gilded-fern` | `#C6A84B` | Luxury accent — gold borders, rare-tier, deltas |
| `--frost-white` | `#E0ECF4` | Text primary |
| `--swan-lavender` | `#4070C0` | Tertiary, common-tier |
| `--wing-purple` | `#8B5CF6` | Glow accent — purple buttons, focus rings, epic-tier |
| `--obsidian-black` | `#0A0A0F` | Deep dark — primary page bg |
| `--carbon` | `#141419` | Card dark |
| `--graphite` | `#1A1A24` | Surface dark — modals, drawers |

Base bg fallback in components: `var(--bg-base, #030712)` (rule 3).

### Semantic colors (on-palette picks)

| Semantic | Token pick | Notes |
|---|---|---|
| `--success` | Ice Wing `#60C0F0` at full for icon/border, 12% tint for bg | Swan celebrates in ice-cyan, not generic green |
| `--info` | Swan Lavender `#4070C0` | Neutral notices |
| `--warn` | Gilded Fern `#C6A84B` | Gold reads "attention, not alarm" |
| `--danger` | `#E5484D` (restrained red — the ONE off-palette semantic) | Destructive/T4 only. Never decorative, never a glow color, never >1 red element per view unless erroring |

### Rarity (gamification)

Common = Swan Lavender · Rare = Gilded Fern · Epic = Wing Purple · Legendary = animated gradient (Ice Wing → Wing Purple → Gilded Fern, slow, reduced-motion → static gradient).

## 5. Dual-Button Glow rule (mandatory, source §B)

- **Blue bg → Purple glow:** Midnight Sapphire / Royal Depth button gets Wing Purple outer glow + focus ring.
- **Purple bg → Cyan glow:** Wing Purple button gets Ice Wing outer glow + focus ring.

Any library/skill suggestion conflicting with this (e.g. the quarantined LILA BAN) is **rejected, not adapted**.

## 6. Typography

| Face | Role | Scale |
|---|---|---|
| Plus Jakarta Sans | Headings, UI labels, primary text | Hero 64–120px · H1 40–56 · H2 28–36 · H3 20–24 · body 16–18 · small 13–14 |
| Cormorant Garamond Italic | Drama: editorial quotes, hero subheads, section dividers, empty-state prose | 20–48px, sparing — one drama beat per section max |
| Fira Code | Data: KPI values, stats, code, receipts | KPI 96–160px on marketing, 28–48px in dashboards; tabular figures |
| Sora | UI in gaming-adjacent surfaces, button labels there, uppercase micro-labels | Labels 11–12px, letter-spaced 0.08em |

Never Inter/Roboto/Arial/Helvetica as display faces (source §B). Line length ≤ ~72ch for body prose.

## 7. Spacing, radius, elevation

- **Spacing scale (modular, source §B):** `4, 8, 12, 16, 24, 32, 48, 72, 108, 160, 240` px. Section gaps 160–240 desktop / 72–108 mobile. No arbitrary values.
- **Radius:** cards/panels `20px` (C12 recipe) · buttons/inputs `12px` · pills/badges `999px` · modals `24px`.
- **Elevation = glass + glow, not gray shadows.** Use exactly the three C12 baselines (sapphire glass, luxury gold-border, obsidian) — quoted in full in source §C12; do not invent a fourth. Shadows are cyan/purple-tinted, never flat gray. Electric borders: `rgba(96,192,240,0.2–0.25)` base → `0.5` hover; gold variant `rgba(198,168,75,0.3–0.35)`.
- **Grain:** 2–5% opacity SVG noise on large dark surfaces kills the "plastic AI gradient" look.

## 8. Layout grids

- CSS Grid primary; Flexbox for intra-component rows only (source §A).
- **Weighted columns, never `repeat(4, 1fr)` as default** — e.g. `minmax(200px,2fr) minmax(400px,5fr) minmax(180px,1fr)`.
- Three z-stacks minimum on hero surfaces: background media / midground glass / foreground type+CTA.
- Dashboards: Phase-2 (current state) gets the most real estate; density rises with role (admin > trainer > client) but the arc stays.

## 9. Panels & cards

- **SheenCard (sell/showcase):** full C12 sapphire or luxury glass + chrome edge + metallic sheen + premium glints + hover motion. For storefront, feature, ascension — anything meant to SELL.
- **Data card (client/trainer/admin/biometrics/program/workout-log):** same geometry, dark-blue gradient surface, chrome edge, pill/metric/button language — but **low-motion**: no pointer tracking, no animation loops, no hover-only actions, no hidden controls (Swan Card/Button Standard). Compact grouped facts; never duplicate the same fact twice on one card; 44px icon buttons; wrap/stack responsively.
- Never cards-inside-cards (see `anti-patterns.md`).

## 10. Buttons — GlowButton

- ≥44px height always; 12px radius; Plus Jakarta Sans (Sora on gaming surfaces).
- Variants: **Primary** (Midnight Sapphire bg → Wing Purple glow) · **Accent** (Wing Purple bg → Ice Wing glow) · **Luxury** (Graphite bg, Gilded Fern border/text, gold glow on focus) · **Ghost** (transparent, electric border) · **Danger** (`--danger` bg, no glow — destruction is not celebrated).
- States: default / hover (glow intensifies + 1–2% scale) / active (scale 0.98) / focus-visible (2px glow-color ring, offset 2px) / disabled (40% opacity, no glow, `not-allowed`) / loading (inline spinner, label persists).

## 11. Inputs & forms

- Field: Graphite bg, electric border, Frost White text, 44px min height, 12px radius; focus → Ice Wing border + soft cyan ring (or Wing Purple on purple-accent surfaces — pick one per form).
- Label above (never placeholder-as-label); helper/error text 13px below; error state = `--danger` border + message + `aria-describedby`.
- Group related fields on one glass panel; one primary action per form; destructive actions never adjacent to submit.

## 12. Tables

- Header row: Sora uppercase 11–12px letter-spaced, Frost White 70%.
- Rows: Carbon bg, 1px `rgba(96,192,240,0.08)` separators, hover → `rgba(96,192,240,0.06)` wash; row height ≥48px.
- Numeric columns Fira Code, right-aligned. Mobile: tables collapse to stacked data cards, never horizontal-squeeze below 768px.

## 13. Charts (Victory only — rule 10)

- Series color: **Arctic Cyan `#50A0F0`** primary; secondary series Wing Purple, Gilded Fern. Theme from `frontend/src/components/Charts/chartTheme.ts`.
- Every chart lives in a **C11 chart environment**: narrative headline, insight line (Cormorant italic), delta in Gilded Fern/Wing Purple, annotation on the moment that matters, next-action CTA footer. Chart 60–70% width, narrative column 30–40% (source §C11).
- Empty state = Cormorant italic sentence explaining why, never "No data."
- Lazy-load via `React.lazy()` + SafeChart boundary (gotcha list).

## 14. Chat surfaces (Swan Coach)

- User bubbles: Royal Depth glass, right-aligned. Coach bubbles: Graphite/obsidian glass, left, Ice Wing accent edge.
- Proposals/drafts inside chat are **T1 cards** clearly labeled DRAFT with approve/dismiss actions ≥44px (writes only land through approval-gated endpoints — operator bridge §3).
- Streaming text: no layout shift; typing indicator is a calm 3-dot pulse (response-tier motion).
- Never call it "AI" user-facing — "Swan Coach."

## 15. Command surfaces & tier badges (T0–T4)

Every operator command element (queue rows, command dock entries, confirmation modals) carries exactly one tier badge (tiers defined in `HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` §4):

| Tier | Badge color | Treatment |
|---|---|---|
| **T0** read-only | Ice Wing `#60C0F0` | Quiet pill, 12% tint bg |
| **T1** draft/propose | Swan Lavender `#4070C0` | Pill + "DRAFT" label where output-bearing |
| **T2** bounded write | Gilded Fern `#C6A84B` | Pill; row shows allowlist source |
| **T3** external-visible | Wing Purple `#8B5CF6` | Pill + confirm modal required |
| **T4** destructive/irreversible | Danger `#E5484D` | Pill + two-step arm modal + rollback note |

Ambiguity rounds UP; chains display the max tier. Badges are text+color (never color alone — a11y). **Small badge/label text on dark:** raw Swan Lavender (`#4070C0`) computes ~4.0:1 as small text — badge FILLS/BORDERS use the raw tokens, small TEXT uses lightened tints (proposed tint tokens pending Sean's approval: lavender-text `#8FB2EE`, purple-text `#B49CFA`, danger-text `#F0938A`).

## 16. Onboarding surfaces

- Marketing arc (B2.1) energy but form-first: one question/step per screen on mobile, progress indicator persistent, Cormorant drama line per act transition.
- Role-specific activation targets (rule 62): trainer → first template + first client invite; trainee → first workout logged + progress proof; keep the "next best action" CTA visible without scrolling.

## 17. Trainer / client surfaces

- Data cards (§9 low-motion) + C11 chart environments; Phase-1 orientation header (name, role, streak/momentum) before any KPI.
- Trainer live-session flows are low-tap: find client → start → log → save → show progress; every control 44px, no hover-dependence (touch-first).
- Client progress = real logged data; deltas annotated; Phase-4 always ends in a next action.

## 18. Coach Command Center

- Crystalline Swan mode (it is a PRODUCT surface — operator bridge §3, T2 within the signed-in role).
- Layout: navigation rail + approval queue (tier-badged rows) + proposal detail panel + receipt ledger. Calm-motion zone (see `motion.md` §6): response-tier only.
- Dictation/PLAUD review drafts render as T1 DRAFT cards until trainer-approved.

## 19. Hermes Agentic OS surfaces (Cyberforest mode)

- Page bg `--cf-forest-deep`, panels `--cf-forest-mid`, aurora wash on the header band only.
- Kill switches are a first-class panel (bridge §9), tier badges per §15, receipts per bridge §8.
- Data-dense and CALM: ambient motion banned, response motion ≤200ms, no signature moments. This is a cockpit, not a brand page.
- Sean-only: no Cyberforest token may appear in `frontend/src` client-facing components.

## 20. Modals & drawers

- Surface: Graphite glass (C12 obsidian variant), 24px radius, overlay `rgba(10,10,15,0.7)` + 8px blur.
- Focus-trapped; ESC closes (except mid-destructive-flow); **focus returns to the trigger on close** (WCAG 2.4.3).
- Confirm modal (T3): names exact action + target + tier badge; confirm button carries the action verb, never "OK."
- Two-step arm modal (T4): step 1 arm (typed target or explicit toggle) → step 2 execute; shows rollback plan line; danger button only enabled after arming.
- Drawers for non-blocking detail; modals for decisions. Never stack two modals.

## 21. Navigation

- Dashboard: left rail (icons + labels, collapsible to 72px icon rail; active item = Ice Wing edge + tint). Marketing: top bar over hero, glass on scroll.
- Mobile: bottom tab bar, ≤5 items, 44px+ targets, active = glow dot. Progress/workout visibility never buried below social/profile (Product Core Loop).
- Breadcrumbs only ≥3 levels deep, Sora micro-label style.

## 22. States (every data-bearing component ships all four)

- **Empty:** Cormorant italic explanation + one CTA to create the first real thing. Never a bare "No data" or a mock-filled chart.
- **Loading:** skeletons matching final geometry (shimmer = ambient-tier, reduced-motion → static). No spinners for >400ms full-panel loads.
- **Error:** what failed in plain words + retry action; `--danger` accent used once; never a dead end.
- **Success:** inline confirmation (toast or state morph); celebration motion allowed as a response beat, not a loop.

## 23. Mobile rules (320 / 375 / 414 first)

- Design at 320px first; verify 375 and 414 before wider. Cards/tabs/buttons/action rows must not overlap, clip critical text, or need hover at phone width (Swan Card/Button Standard).
- Stack > squeeze; horizontal scroll only for shelf patterns (C5) with visible affordance.
- Thumb-zone: primary CTA in the lower half on mobile flows; 44px targets with ≥8px between adjacent targets.

## 24. Wide-monitor rules (2560×1440, 3840×2160)

- Max content width: prose ~72ch; dashboards cap grid at ~1920px centered OR add columns — **never stretch cards to fill 4K**.
- Density scales up with width: more columns, not bigger cards. 4K may show 4–6 weighted columns where 1440p shows 3.
- Hero/cinematic surfaces MAY go full-bleed at any width (media scales; type caps at the §6 hero max).
- Remember: `1440px` width ≠ 1440p. 1440p = 2560×1440 viewport class (QA matrix in `qa-gates.md`).

## 25. Motion (summary — full rules in `motion.md`)

Three tiers (ambient/response/narrative); transform+opacity only; reduced-motion gated in BOTH CSS and JS; one signature moment per page; operator/data-dense panels stay calm.

## 26. Accessibility (summary — full gates in `qa-gates.md`)

WCAG 4.5:1 text contrast; `:focus-visible` rings on everything interactive; logical focus order + restoration; no hover-only controls; 44px targets; reduced-motion; color never the sole signal; forced-colors fallback sane.

## 27. Anti-patterns (summary — full list in `anti-patterns.md`)

No MUI/Tailwind, no Galaxy-Swan, no equal 4-up grids, no centered-everything, no hero-dashboards, no fake metrics, no Arctic Cyan buttons, no cards-in-cards, no hover-only, no lorem ipsum, no yoga/meditation language.

## 28. Implementation notes (repo stack)

- **React 18 + TypeScript + styled-components.** NO MUI (rule 1), NO Tailwind for new Swan UI (source §A bans).
- **Rule 43:** any shared style fragment with `${}` interpolation composed into a styled component MUST use the `` css`` `` tagged helper — plain template strings crash styled-components at mount (error #12).
- **300-line file cap (rule 4):** extract styles/hooks/types when approaching. Blueprint header on components >100 lines (rule 5).
- Grid via styled-components; tokens via `var(--token, #fallback)`; Full/Lean/Still runtime-quality modes ship together per source §A; Reduced Motion is a separate accessibility override.
- Charts: Victory + `chartTheme.ts`; lazy + SafeChart. Sockets/feeds: cursor pagination (gotchas).
- `translateZ(0)` creates stacking contexts — give parents `position: relative; z-index` (gotchas).
