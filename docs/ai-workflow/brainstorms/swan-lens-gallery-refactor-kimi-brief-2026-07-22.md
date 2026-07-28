# Swan Lens + Gallery Refactor — Kimi Design Brief (2026-07-22)

**To:** Kimi K3 (SwanStudios front-end / design guru)
**From:** Claude (Opus 4.8), grounded on `origin/main` @ `4b9fb0a5`
**Remit:** Produce a concrete, buildable DESIGN PLAN for two surfaces. Another AI (Claude) will implement your plan on a fresh branch off `main`. Make every decision so the builder makes none — exact tokens, exact CSS values, exact file targets, exact copy, "do NOT" bans, and per-slice acceptance criteria.

> **CRITICAL GROUNDING:** All file:line citations below are verified against `origin/main`. The build target is a **fresh branch off `origin/main`**, NOT the current stale `wip/comms` working tree (which is 1019 commits behind). Author your plan against the `main` structure described here.

---

## HOUSE RULES (non-negotiable — your plan must honor all)
- styled-components only, **no Material-UI**.
- `var(--token, #fallback)` pattern — **no hardcoded hex** except in audit tables/tests.
- **44px minimum** touch targets.
- Dark-first; default theme `crystalline-dark`.
- Victory only for charts (N/A here).
- **RETIRED Galaxy-Swan palette is BANNED:** `#0a0a1a`, `#00FFFF`, `#7851A9`, and named `aqua`/`cyan`. Never emit these.
- **No yoga/meditation** language — "stretching"/"flexibility".
- WCAG 4.5:1 text contrast minimum.
- `prefers-reduced-motion` respected; GPU-safe motion only (transform/opacity).
- Active palette tokens: Midnight Sapphire `#002060`, Royal Depth `#003080`, Ice Wing `#60C0F0`, Arctic Cyan `#50A0F0` (data only), Gilded Fern `#C6A84B`, Frost White `#E0ECF4`, Swan Lavender `#4070C0`, Wing Purple `#8B5CF6`, Obsidian Black `#0A0A0F`, Carbon `#141419`, Graphite `#1A1A24`.
- **Dual-Button Glow:** Blue bg → Purple glow | Purple bg → Cyan glow.

---

# SURFACE 1 — THE SWAN LENS (Appearance Studio)

The Swan Lens = the in-app appearance picker with a **Color** tab (palette themes) and a **Style** tab (style lenses). Sean reports: (A) fewer colors than he used to have, (B) a lot of styles look the same, (C) the color list won't scroll.

## Ground truth — root causes (verified)

### (A) Colors — the catalog is at MAX (38), but the Swan Lens is hardcoded to 12
- Full registry merge point: `frontend/src/context/ThemeContext/UniversalThemeContext.tsx:1581-1602` → `export const themes = { ...18 base..., ...premiumThemeAdditions }` = **38 colorways** (18 base + 20 premium).
- 20 premium colorways: `frontend/src/context/ThemeContext/UniversalThemePremiumThemes.ts:135-255` (ruby-forge, emerald-vault, solar-gold, amethyst-night, rose-quartz, copper-patina, aqua-abyss, graphite-luxe, pearl-noir, circuit-lime, sakura-midnight, indigo-pulse, sunset-mirage, steel-tempest, vapor-dream, burgundy-noir, tron-grid, orchid-veil, deep-jade, midnight-mango).
- The Swan Lens Color tab renders ONLY `buildFeaturedIds(draftTheme)` = **12 featured ids**: `AppearanceStudioPanel.tsx:82,186`.
- The 12 featured ids: `UniversalThemeToggle.panel.tsx:74-83` (`FEATURED_THEME_IDS`).
- The **header** theme-picker (`UniversalThemeToggle.panel.tsx:169-187`) has a **"Show all 38 themes"** toggle (`showAll` state). The Swan Lens's `AppearanceStudioPanel` was **born capped** and never got that toggle (only commit: `abbf1503a`). So 26 colorways are real, registered, and unreachable from the Swan Lens.

**Sean's decision:** unlock ALL 38 in a scrollable grid + design NEW colorways on top.

### (B) Styles — 29 lenses render, but only 5 are actually styled in the preview
- Style tab renders `registry.available()` = **29 lenses**: `AppearanceStudioPanel.tsx:150-177,80`; registry `frontend/src/adapters/style-lens-swan/index.ts:74-79`.
- The lens CSS source files (`frontend/src/adapters/style-lens-swan/styles/lenses/*.ts`) ARE genuinely distinct (sidebar 196–340px, unique radii, unique canvas gradients).
- BUT the preview only styles **5 sentinel lenses**: `AppearanceStudioPreview.tsx:24-62` overrides only `quiet-meridian`, `blueprint-fold`, `kintsugi-circuit`, `analog-flight-recorder`, `candy-glass-arcade`. The preview body (`:79-99`) renders a fixed skeleton driven by `--preview-bg/primary/text` from the THEME (`:84-88`), never the lens — so the other ~24 lenses render a byte-identical skeleton differing only by the name label (`:92`).
- AND all lenses share ONE world-values table: `frontend/src/adapters/style-lens-swan/contract/values/index.ts:4-27` — `buildWorldValuesRegistry` maps EVERY manifest id to the same `CRYSTALLINE_DEFAULT_WORLD_VALUES` placeholder. Per-lens world values were never authored.

**Sean's decision:** author real per-lens world-values + preview styling so ALL 29 render distinctly. Delete nothing.

### (C) Scroll — the mechanism exists but never engages
- Color grid: `AppearanceStudio.styles.ts:174-178` `ChoiceGrid` = `repeat(2,minmax(0,1fr))`, **no max-height, no overflow**.
- Scroll owner is the enclosing `Pane` (`:87-103`, `overflow-y:auto`), but with only 12 colors the content fits, so no scrollbar renders.
- `StudioPanel` (`:4-28`): `max-height: min(760px, calc(100vh - 92px)); overflow:hidden`.

**Sean's decision:** give the color grid its own `max-height` + `overflow-y:auto` so a large list scrolls up/down inside the tab.

### (D) Auto color-cycle mode (NEW feature Sean requested)
Add an **"Auto" mode** to the color tab: a toggle that, when on, automatically advances the active palette to the NEXT colorway on a timer (user-set interval). Cycles through the colorways continuously. Your plan must specify: the toggle UI + interval control (e.g. presets 15s / 30s / 1m / 5m, or a small stepper — recommend a default), the cycle order (through all 38+ or through a chosen subset — recommend), pause-on-interaction behavior, persistence of the auto-mode on/off + interval to localStorage, and honoring `prefers-reduced-motion` (auto-cycling is a motion-adjacent behavior — decide whether reduced-motion disables it or just cross-fades slowly). Implementation note for the builder: the cycle sets `paletteThemeId` to the next id on a `setInterval` cleaned up on unmount/toggle-off.

### (E) CONTRAST BUG — tab labels invisible on light themes (VERIFIED, must fix)
Sean reports the tab labels are unreadable on the white/light colorways. **Root cause verified on main:** the Appearance Studio panel is dark-first and hardcodes fixed LIGHT-text tokens on surfaces, instead of theme-adaptive text tokens:
- `StudioTab` (the tabs) label: `color: var(--frost-white, #e0ecf4)` — `AppearanceStudio.styles.ts:77`. Always near-white text; inactive tab bg is `var(--carbon, #141419)` (`:76`). On light themes (`crystalline-light` bg `#E6EEF5`, `text.primary:#0B1726`) the label stays frost-white → invisible/very low contrast.
- Same class throughout: `StyleSelect` `color:var(--frost-white)` (`:149`), `ChoiceButton` (`:186`), action buttons (`:226,:257`) — all fixed frost-white text on dark-assumed surfaces.
- The light theme itself is CORRECT (`text.primary:#0B1726` on `#E6EEF5` ≈ 15:1). The bug is 100% in the panel's hardcoded tokens, not the theme.

**Fix requirement for your plan:** replace fixed light-text (`--frost-white`) on adaptive surfaces with theme-adaptive tokens (`--text-primary` / an on-surface token that flips per theme), and re-derive tab/card surface colors so the active/inactive states stay ≥4.5:1 on EVERY colorway. Provide a contrast table proving text-vs-surface ≥4.5:1 for the tabs, cards, and buttons across at least: `crystalline-dark`, `crystalline-light` (Arctic Dawn), `crystalline-mono`, and 2–3 of the lightest new colorways. This is a WCAG blocker — call out every hardcoded `--frost-white`/dark-surface pair in the panel that must change.

## Swan Lens — what your plan must specify
1. **Color tab uncap + scroll:** exact UI for showing all 38 (grid layout, columns, the scroll container CSS with `max-height`/`overflow-y`), and how new colorways slot in. Decide: flat "all 38+" scrollable grid (Sean picked "Show all 38 + add new, scrollable"). Group headers? Search/filter? Recommend, don't ask.
2. **New colorways:** design N NEW colorways (you choose a strong count — Sean wants "a lot more"). Give each: id, display name, and the full `PremiumThemeSpec` field set matching `UniversalThemePremiumThemes.ts:17-40` (`bg, bg2, surface, elevated, primary, primaryBlue, primaryDeep, primaryLight, secondary, secondaryLight, secondaryDeep, accent, accentLight, accentWarm, text, textSecondary, muted`, optional danger/success/warning). Dark-first, identity-strong, WCAG-safe, no retired palette. These append to `premiumThemeAdditions`.
3. **Per-lens distinct rendering:** the schema of `CRYSTALLINE_DEFAULT_WORLD_VALUES` (read it: `frontend/src/adapters/style-lens-swan/contract/values/crystallineDefault.ts` + `lensValues.types.ts` for the 8 world roles). Specify per-lens world-role VALUES for all 29 lenses so each renders distinctly, AND how the preview (`AppearanceStudioPreview.tsx`) should consume per-lens values instead of the fixed theme-driven skeleton. Honor the design-value guard (R1–R7 + WCAG) — no banned literals, hex6 for color roles, contrast rules.
4. **Auto color-cycle mode (D):** full spec per §(D) above — toggle + interval UI, cycle order, pause-on-interaction, persistence keys, reduced-motion behavior.
5. **Contrast fix (E):** full spec per §(E) above — every hardcoded `--frost-white`/dark-surface pair to change, the adaptive tokens to use, and a proven contrast table across dark + light + lightest-new colorways.

---

# SURFACE 2 — THE GALLERY (`frontend/src/pages/GalleryPage.tsx`)

The live gallery at `/gallery` and `/gallery/:slug` = **`frontend/src/pages/GalleryPage.tsx`** (2219 lines). NOT the dashboard mini-galleries, NOT the staged-but-unrouted `frontend/src/pages/gallery-vnext/` rebuild (that's a design-parity prototype — reference it for direction only). Sean wants: fix the cover/cert section, add more view options, add more fixed picture-size options.

## Ground truth (verified)

### (A) "Cover cert" = the event cover card + badge overlays
- `EventCover` — `GalleryPage.tsx:511-519`: fixed `height:200px`, `background:url(...) center/cover`, hardcoded gradient fallback `linear-gradient(135deg,#1a1035,#002060)`.
- `SportBadge` — `:521-534`: absolute top-left pill, shows `event.sport` (the "cert"/badge).
- `PhotoCountBadge` — `:536-547`: absolute bottom-right pill, "N photos".
- `SourceTypeBadge` — `:988-1000`: per-photo "RAW"/"HQ JPEG" tag (rendered `:1984-1986`).
- Render: `:1800-1803`.
- **Broken/awkward:** hardcoded 200px height → inconsistent crop/letterbox; SportBadge only when `event.sport` exists → inconsistent overlays; hardcoded hex fallback (token violation), no "cover missing" state; "1 photos" plural bug.
- Direction already prototyped: `gallery-vnext/EventDeck.tsx` slices the cover into 6 vertical strips with `DeckBadge`/`DeckCount`.

### (B) View options — NONE exist today
- No `viewMode`/`layoutMode` state anywhere (full `useState` inventory `:1132-1211`).
- Only hardcoded grids: `EventGrid` `:493-497` `repeat(auto-fill,minmax(320px,1fr))`; `GridWrapper` (photo grid) `:672-677` `repeat(auto-fill,minmax(200px,1fr))`.
- Extension point: `GridWrapper` (`:672`) + render at `:1929`.

### (C) Fixed picture-size options — NONE exist today
- Hardcoded: `GridWrapper` `minmax(200px,1fr)` (`:674`); `PhotoCard` `aspect-ratio:4/3` (`:691`); `PhotoImg` `object-fit:cover` (`:715-722`); `EventCover` `height:200px` (`:512`).
- No size state, no slider, no column control.

### (5) No persistence
- No view/size state, no localStorage for view/size (only `galleryToken` auth persists, `:1137-1143`).
- Photo data shape carries `thumbnailUrl, url, width, height, sourceType` (`:1943-1951,1984`); events carry `coverPhotoUrl, sport, photoCount`.

## Gallery — what your plan must specify
1. **Cover/cert fix:** redesign `EventCover` + badges. Aspect-ratio handling (recommend a token'd aspect ratio vs fixed 200px), consistent badge treatment whether or not `event.sport` exists, a proper "cover missing" placeholder using tokens (kill the hardcoded hex), fix the "1 photos" singular/plural. You may adopt the `EventDeck` sliced-strip direction if it strengthens it — your call, justify it.
2. **View modes (net-new):** design a view-mode control (e.g. Grid / Masonry / List / large-hero — you pick the set, recommend a strong default). Exact control UI (where it sits, 44px targets, icons), and the exact styled-container CSS for each mode keyed off a new `viewMode` state.
3. **Picture-size presets (net-new):** design fixed-size presets (e.g. S/M/L/XL column-width or column-count), exact CSS values per preset driven off a new `size` state, applied at `GridWrapper`/`PhotoCard`.
4. **Persistence:** persist chosen `viewMode` + `size` to localStorage (give the keys) so the user's choice survives reload.

---

## OUTPUT CONTRACT (what to return)
For EACH surface, deliver:
- **Design direction** (1 paragraph — the intent/feel).
- **Exact spec** — every control, its placement, its CSS values/tokens, its states (default/hover/focus/active/disabled), 44px compliance.
- **New data** — full colorway specs (all fields) for new colors; per-lens world-values for all 29 lenses.
- **File-by-file build order** — which files change, in what order, with the exact styled-component / data additions.
- **"Do NOT" list** — traps the builder must avoid (retired palette, breaking the design-value guard, hardcoded hex, breaking the 12→38 unlock without a scroll region, etc.).
- **Per-slice acceptance criteria** — testable checks the builder verifies.

Be concrete and decisive. Do not hedge to consensus. Recommend defaults rather than asking. This is a design plan a builder will execute verbatim.
