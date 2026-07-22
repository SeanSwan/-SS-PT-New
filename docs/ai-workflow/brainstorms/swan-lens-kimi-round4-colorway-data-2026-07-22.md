# Swan Lens — Kimi ROUND 4: GENERATE the Colorway Data (schema is now capable)

**To:** Kimi K3. Your round-3 SEND-BACK was correct and has been IMPLEMENTED. The schema now holds gradients, glass, glow, borders, focus, and chart colors. **All your round-3 blockers are resolved below.** This round you MUST GENERATE THE DATA — no more SEND-BACK. Output the three tables + one canonical machine-readable TS registry block. Decisive, final.

## SCHEMA IS NOW EXTENDED (shipped, tsc-clean). New OPTIONAL fields on `PremiumThemeSpec`:
```
family?:  'apex-darks' | 'jewel-gradients' | 'frost-glass' | 'heritage' | 'archive'
variety?: 'gradient-forward' | 'clean-flat' | 'light-glass'
gradientFrom?, gradientTo?: hex6      gradientAngle?: number(deg)
glassBlur?: number(px, ≤12)           glassOpacity?: number(0..1)
glowPrimary?, glowSecondary?: hex6 or rgba   focusRing?: hex6
borderSubtle?: hex6 or rgba           chart1?, chart2?, chart3?: hex6
```
Plus the original 17: `id,name,bg,bg2,surface,elevated,primary,primaryBlue,primaryDeep,primaryLight,secondary,secondaryLight,secondaryDeep,accent,accentLight,accentWarm,text,textSecondary,muted` (+ optional `danger,success,warning`). Absent optionals fall back to legacy derivation. So a NEW colorway CAN now be truly gradient-forward / glassy / glowing.

## YOUR ROUND-3 BLOCKERS — ALL RESOLVED, now hard REQUIREMENTS:
1. **Depth/glow/gradient fields exist** (above). Gradient-forward colorways set `gradientFrom/To/Angle`; light-glass set `glassBlur/glassOpacity` + `variety:'light-glass'`; every new colorway sets `glowPrimary/glowSecondary/focusRing`.
2. **Retired-cyan ban = numeric.** A hue is banned if OKLCH hue ∈ [175°,200°] AND chroma ≥0.10 AND lightness ≥0.60, OR ΔE(OKLab) <12 to `#00FFFF`. EXPLICIT allowlist (exempt by hex): `#60C0F0` (Ice Wing), `#50A0F0` (Arctic Cyan). Apply this to Table 1 verdicts AND to your new colorways.
3. **Every retired-cyan / dup id routes to a LIVE replacement** in Table 3 (not shelved-but-selectable). Archive holds only compliant heritage/dup-consolidated colorways.
4. **ΔE distinctness gate REQUIRED in Table 2:** each new colorway ≥15 ΔE (OKLab, compare on `primary` and `bg`) from every KEPT colorway, ≥10 ΔE from every other NEW colorway. Report the min ΔE per new row.
5. **Full contrast matrix (WCAG 2.x sRGB), alpha surfaces composited over own `bg` (glass: over `#000000` worst case):** `text/bg≥4.5, text/surface≥4.5, text/elevated≥4.5, textSecondary/surface≥4.5, textSecondary/elevated≥4.5, muted/surface≥4.5 (muted is body-size → 4.5 not 3.0), accent/surface≥3.0, focusRing/surface≥3.0, [button-label]/primary≥4.5`. Every new colorway passes ALL.
6. **State colors required** (`danger,success,warning`) on every new colorway — no optionals left blank.
7. **Families ≥4 members post-audit;** Heritage = "brand-history Crystalline lineage + direct descendants." State per-family counts.
8. **Naming voice:** two words, material/atmospheric (Ember Forge, Velvet Hour, Glacier Mint). BANNED words (house rules): yoga, meditation, zen, mindful, and marketplace/neon names (cyberpunk, tron, vapor, samurai, 2077). Surviving legacy colorways get a rename-on-keep display name in this voice (ids stay stable).
9. **Tray math:** state final KEPT / ARCHIVED / NEW / TRAY-TOTAL. Curated tray target 16–20.
10. **id format** `^[a-z0-9]+(-[a-z0-9]+)*$`, unique across all ids, retired ids never reused.

## The 38 to audit
**18 base:** crystalline-default (Crystalline Swan), crystalline-light (Arctic Dawn), crystalline-dark (Crystalline Dark, DEFAULT — never archive), crystalline-mono (Monochrome), cinematic-ember (Obsidian Ember), frozen-aurora, obsidian-black, cyberpunk-edgerunners (Cyberpunk Cyan), obsidian-bloom, frozen-canopy, ember-realm, twilight-lagoon, nebula-crown, enchanted-forest, void-crystal, deep-ocean, obsidian-aurora, carbon-fiber.
**20 premium:** ruby-forge, emerald-vault, solar-gold, amethyst-night, rose-quartz, copper-patina, aqua-abyss, graphite-luxe, pearl-noir, circuit-lime, sakura-midnight, indigo-pulse, sunset-mirage, steel-tempest, vapor-dream, burgundy-noir, tron-grid, orchid-veil, deep-jade, midnight-mango.

Reference spec (Ruby Forge, legacy 17-field, for value scale): `bg:#10070A bg2:#1C0B10 surface:rgba(38,12,20,.82) elevated:#32111B primary:#FB7185 primaryBlue:#F43F5E primaryDeep:#9F1239 primaryLight:#FDA4AF secondary:#BE123C secondaryLight:#FB7185 secondaryDeep:#7F1D1D accent:#FBBF24 accentLight:#FDE68A accentWarm:#D97706 text:#FFF1F3 textSecondary:rgba(255,241,243,.84) muted:rgba(255,241,243,.62)`

---

## DELIVER (final — generate, do not review)

### TABLE 1 — Audit of 38: `id | keep-name | rename-to (voice) | verdict (KEEP|ARCHIVE-dup-of-X|ARCHIVE-then-REDIRECT-cyan→X) | family | note`. Every id gets a family + verdict. Flag tron-grid/aqua-abyss/cyberpunk-edgerunners/vapor-dream against the numeric cyan rule. End with per-family counts + tray math.

### TABLE 2 — 6–8 NEW colorways: for each a header row `id | name | family | variety | identity(one line) | minΔE-to-kept | contrast text/bg,text/surface,accent/surface` THEN a full spec code block with ALL 17 base fields + the relevant new optional fields (gradient set for gradient-forward, glass set for light-glass, glow+focus+chart+state for all). Span all 3 variety classes; fill families that are thin post-audit.

### TABLE 3 — Migration map: `retired-id → live-replacement-id` for every archived-as-dup or redirected-cyan id.

### BLOCK 4 — Canonical TS registry: a single ```ts code block: `export const NEW_COLORWAY_SPECS = [ {…}, … ] as const;` containing every NEW colorway spec object (the source of truth the builder pastes into UniversalThemePremiumThemes.ts). Fields exactly as the schema names them.

Output the 3 tables + BLOCK 4. No review prose, no verdict header. GENERATE.
