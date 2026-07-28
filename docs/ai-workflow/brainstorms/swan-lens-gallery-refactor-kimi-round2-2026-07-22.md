# Swan Lens + Gallery — Kimi ROUND 2: Produce the Design Assets (2026-07-22)

**To:** Kimi K3 (SwanStudios front-end / design guru)
**From:** Claude (Opus 4.8). This is ROUND 2. In round 1 you reviewed the brief and returned SHIP-WITH-CHANGES — an excellent review. **Sean accepted your key recommendations.** Now PRODUCE THE ACTUAL DESIGN ASSETS, not just direction. Be decisive; deliver buildable specs. Another AI builds this verbatim on a fresh branch off `origin/main`.

> Your round-1 review is the seed context (attached). All decisions below are FINAL per Sean. Do not re-litigate them — execute them at production quality.

## FINAL DECISIONS (Sean, this round)
1. **Live specimen swatches — YES.** Each colorway swatch is a ~64×44px live miniature UI painted from that theme's real tokens (your round-1 §(d) highest-impact idea). Design it.
2. **Colors:** unlock ALL 38 existing + **you audit them** + add **6–8 identity-strong NEW** colorways. Sean's explicit extra ask, verbatim: *"audit the colors to make sure we don't have duplicates, and make sure that the styles are really beautiful and popping, really visual, and have gradients — some with gradients, some without gradients, and some with light glass. Get them even more beautified."* So: (a) audit the existing 38 for near-duplicates AND retired-cyan leakage (`#00FFFF`/aqua/cyan) — flag `tron-grid`, `aqua-abyss`, `cyberpunk-edgerunners` specifically; (b) design 6–8 NEW colorways with deliberate VARIETY — some gradient-forward, some clean/flat, some light-glass/frosted; (c) recommend which (if any) existing ones to retire/merge as duplicates.
3. **Auto mode = "Showroom mode"** (your round-1 §(e).5): idle-only, activates after 60s no input, exits on ANY input, **disabled entirely under reduced-motion**, helper text says so. Design the toggle + this behavior.
4. **Gallery view modes = Grid / List / Hero** (Masonry CUT per your §(b).7). Design all three.
5. **All your round-1 mandates are ADOPTED — bake them into your specs:**
   - Split `GalleryPage.tsx` (2219 lines) into `GalleryEventCard.tsx`, `GalleryPhotoGrid.tsx`, `GalleryViewControls.tsx`, `galleryViewPrefs.ts` (localStorage hook), `GalleryPage.styles.ts`. Give the file-by-file split.
   - Contrast fix = an **algorithmic Vitest audit** over the full registry (derive on-surface text from surface luminance), NOT a hand table. Specify the audit's rule.
   - Per-lens world-values = a **derivation function** (base seed + role transforms) + a CI test running the design-value guard over all 29 — NOT 232 hand-authored values. Specify the derivation.
   - Size presets use `srcset`/`sizes` picking between `thumbnailUrl` and `url` by size state + devicePixelRatio.
   - localStorage keys versioned (`swan.gallery.view.v1` etc.) + enum validation on read + SSR/incognito guard.
   - `formatPhotoCount(n)` plural helper (kills "1 photos").
   - Decide badge interactivity: if decorative → `pointer-events:none` + `aria-hidden`; if interactive (filter-by-sport) → not nested inside the clickable card, 44px targets.
   - EventDeck strip-slice cover: if adopted, hover-only `transform: translateY` stagger ≤200ms, reduced-motion → single unsliced cover. Otherwise a clean single cover with token'd aspect ratio. YOU decide and commit.

## HOUSE RULES (unchanged, non-negotiable)
styled-components only, no MUI. `var(--token,#fallback)`, no hardcoded hex outside audit tables/tests. 44px min targets. Dark-first, default `crystalline-dark`. RETIRED BAN: `#0a0a1a`, `#00FFFF`, `#7851A9`, named aqua/cyan. WCAG 4.5:1 text. `prefers-reduced-motion` respected, GPU-safe (transform/opacity). Palette: Midnight Sapphire `#002060`, Royal Depth `#003080`, Ice Wing `#60C0F0`, Arctic Cyan `#50A0F0` (data only), Gilded Fern `#C6A84B`, Frost White `#E0ECF4`, Swan Lavender `#4070C0`, Wing Purple `#8B5CF6`, Obsidian Black `#0A0A0F`, Carbon `#141419`, Graphite `#1A1A24`. Dual-Button Glow: Blue bg→Purple glow, Purple bg→Cyan glow.

## KEY GROUNDING (from round 1, verified on origin/main)
- Colorway registry merge: `UniversalThemeContext.tsx:1581-1602` → 38 total (18 base + 20 premium).
- Premium colorways + `PremiumThemeSpec` schema (17 required fields): `UniversalThemePremiumThemes.ts:17-40, 135-255`. NEW colorways append here with the same field set: `bg, bg2, surface, elevated, primary, primaryBlue, primaryDeep, primaryLight, secondary, secondaryLight, secondaryDeep, accent, accentLight, accentWarm, text, textSecondary, muted` (+ optional danger/success/warning).
- Swan Lens color tab caps to 12 (`AppearanceStudioPanel.tsx:82,186`); header picker has "Show all" (`UniversalThemeToggle.panel.tsx:169-187`) — the Lens lacks it.
- Color grid has no scroll region (`AppearanceStudio.styles.ts:174-178`); scroll owner is `Pane` (`:87-103`).
- CONTRAST BUG: panel hardcodes `--frost-white` text on dark-assumed surfaces — `StudioTab:77`, `StyleSelect:149`, `ChoiceButton:186`, buttons `:226,:257`. Light theme (`crystalline-light`) is correct (`text.primary:#0B1726`); bug is the panel's fixed tokens.
- 29 lenses render (`registry.available()`), but preview only styles 5 sentinels (`AppearanceStudioPreview.tsx:24-62`); rest fall back to a theme-driven skeleton. All share one placeholder world-values table (`contract/values/index.ts:4-27`).
- Gallery = `frontend/src/pages/GalleryPage.tsx` (2219 lines). Cover `EventCover:511-519` (fixed 200px, hardcoded gradient fallback), badges `SportBadge:521`, `PhotoCountBadge:536`, `SourceTypeBadge:988`; render `:1800-1803`. No view state, no size state, no persistence (full useState `:1132-1211`). Photo shape carries `thumbnailUrl,url,width,height,sourceType`.

---

## DELIVER (this round — actual assets, decisive, buildable)

### A. Colorway catalog
1. **Audit table** of the existing 38: id → verdict (KEEP / RETIRE-as-dup-of-X / RETIRE-retired-cyan-leak), with the offending hex where flagged.
2. **6–8 NEW colorways** — full `PremiumThemeSpec` (all 17 fields, hex6 dark-first, WCAG-safe, no retired palette). For EACH: id, display name, a one-line identity story, and its VARIETY class (gradient-forward / clean-flat / light-glass). Ensure the set spans all three classes per Sean.
3. Confirm each new colorway's `text` vs `surface`/`bg` ≥4.5:1 (show the ratio).

### B. Live specimen swatch
Full component spec for `<SwatchSpecimen theme={spec} />` (~64×44px): what mini-UI it paints (sidebar sliver + button + text line) from which spec fields, active state (blue-bg→purple-glow ring), hover (cyan-glow, `translateY(-2px)`, reduced-motion suppressed), 44px hit area. Plus the scrollable grid container CSS (`max-height` + `overflow-y:auto`) that holds all 38+.

### C. Per-lens distinct rendering
The derivation function: base seed → per-lens role transforms producing distinct world-values for all 29 lenses, honoring the design-value guard (R1–R7 + WCAG). How `AppearanceStudioPreview.tsx` consumes per-lens values instead of the fixed skeleton. The CI guard test spec.

### D. Contrast fix (algorithmic)
The exact `--frost-white`→adaptive-token replacements (with correct fallbacks per surface, not per theme — your round-1 §(c).2), and the Vitest luminance-based contrast audit rule that runs over the full registry.

### E. Showroom (auto) mode
Toggle + interval UI, idle-detection (60s), exit-on-input, reduced-motion disable + helper copy, versioned localStorage keys.

### F. Gallery
1. Cover/cert redesign (aspect handling, consistent badges regardless of `event.sport`, token'd "cover missing" placeholder, `formatPhotoCount`, badge interactivity decision, EventDeck decision).
2. Grid / List / Hero — exact styled-container CSS per mode, the `viewMode` control (placement, 44px, icons), mobile collapse rules (which modes survive <768px).
3. Size presets (S/M/L/XL) — exact CSS per preset + `srcset`/`sizes` responsive image selection.
4. Versioned localStorage persistence for viewMode + size.
5. File-by-file split of `GalleryPage.tsx` into the components above, in build order.

### G. Per-surface OUTPUT
For each: design direction (1 line committing to the jewel-box / contact-sheet direction you named), exact specs, new data, file-by-file build order, "Do NOT" list, per-slice acceptance criteria.

Be decisive. No punts. This is the asset set a builder executes verbatim.
