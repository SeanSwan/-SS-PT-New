# Swan Lens — Kimi ROUND 3: Produce the RAW Colorway Data (2026-07-22)

**To:** Kimi K3. Rounds 1–2 settled all architecture + decisions (your reviews are the seed). This round is **pure asset generation** — output the concrete color DATA a builder pastes in. No re-litigation, no prose review. Tables and hex specs only.

## Settled context (do NOT re-open)
- Curated-tray + Archive architecture ADOPTED. Families: **Apex Darks / Jewel Gradients / Frost Glass / Heritage** + collapsed **Archive**. Nothing deleted; retired/dup colorways go to Archive with a `retired-id→replacement-id` migration map.
- Showroom/auto-cycle mode: CUT.
- Live specimen swatches, algorithmic contrast audit, per-family lens derivation with ΔE gate, gallery Grid/List/Hero, EventDeck cut → clean cover, badges decorative: all ADOPTED.
- Naming voice: two words, material/atmospheric, brand-adjacent (e.g. Ember Forge, Velvet Hour, Glacier Mint). NOT marketplace names.
- RETIRED BAN: `#0a0a1a`, `#00FFFF`, `#7851A9`, named aqua/cyan (Ice Wing `#60C0F0` / Arctic Cyan `#50A0F0` are ALLOWED brand tokens — exempt from the cyan ban).

## The 38 existing colorways to audit
**18 base:** crystalline-default (Crystalline Swan), crystalline-light (Arctic Dawn), crystalline-dark (Crystalline Dark, DEFAULT), crystalline-mono (Monochrome), cinematic-ember (Obsidian Ember), frozen-aurora (Frozen Aurora), obsidian-black (Obsidian Black), cyberpunk-edgerunners (Cyberpunk Cyan), obsidian-bloom, frozen-canopy, ember-realm, twilight-lagoon, nebula-crown, enchanted-forest, void-crystal, deep-ocean, obsidian-aurora, carbon-fiber.
**20 premium:** ruby-forge (Ruby Forge), emerald-vault (Emerald Vault), solar-gold (Solar Gold), amethyst-night (Amethyst Night), rose-quartz (Rose Quartz), copper-patina (Copper Patina), aqua-abyss (Aqua Abyss), graphite-luxe (Graphite Luxe), pearl-noir (Pearl Noir), circuit-lime (Circuit Lime), sakura-midnight, indigo-pulse, sunset-mirage, steel-tempest, vapor-dream, burgundy-noir, tron-grid, orchid-veil, deep-jade, midnight-mango.

## `PremiumThemeSpec` schema (17 required fields, hex6, dark-first) — every new colorway MUST fill ALL
`bg, bg2, surface, elevated, primary, primaryBlue, primaryDeep, primaryLight, secondary, secondaryLight, secondaryDeep, accent, accentLight, accentWarm, text, textSecondary, muted` (+ optional danger/success/warning). `surface`/`elevated` may be `rgba(...)`. Example (Ruby Forge, verbatim from the registry):
```
bg:'#10070A', bg2:'#1C0B10', surface:'rgba(38,12,20,0.82)', elevated:'#32111B',
primary:'#FB7185', primaryBlue:'#F43F5E', primaryDeep:'#9F1239', primaryLight:'#FDA4AF',
secondary:'#BE123C', secondaryLight:'#FB7185', secondaryDeep:'#7F1D1D',
accent:'#FBBF24', accentLight:'#FDE68A', accentWarm:'#D97706',
text:'#FFF1F3', textSecondary:'rgba(255,241,243,0.84)', muted:'rgba(255,241,243,0.62)'
```

## Contrast rule every colorway MUST pass (WCAG 2.x, sRGB)
`text` vs `bg` ≥4.5, `text` vs `surface` ≥4.5, `text` vs `elevated` ≥4.5, `textSecondary` vs `surface` ≥4.5, `muted` vs `surface` ≥3.0, `accent` vs `surface` ≥3.0.

---

## DELIVER — three tables, nothing else

### TABLE 1 — Audit of the 38
Columns: `id | current name | verdict (KEEP / ARCHIVE-dup-of-<id> / ARCHIVE-retired-cyan) | family (Apex Darks|Jewel Gradients|Frost Glass|Heritage|Archive) | note`. Flag `tron-grid`, `aqua-abyss`, `cyberpunk-edgerunners`, `vapor-dream` explicitly for retired-cyan review (quote the offending hex if it leaks `#00FFFF`/aqua). Assign EVERY id a family (or Archive).

### TABLE 2 — The 6–8 NEW colorways (full specs)
For EACH: `id | name | family | variety-class (gradient-forward|clean-flat|light-glass) | identity story (one line)` THEN all 17 `PremiumThemeSpec` fields as a code block. Span all three variety classes and cover the families that are thin after the audit. Names in the settled voice. Include the passing contrast ratios: `text/bg`, `text/surface`, `accent/surface`.

### TABLE 3 — Retirement migration map
`retired-id → replacement-id` for every id you send to Archive-as-dup (so persisted user prefs resolve forward). Archive-but-not-dup ids map to themselves (still selectable, just in the Archive drawer).

Output ONLY the three tables + the code blocks. Decisive. No review prose.
