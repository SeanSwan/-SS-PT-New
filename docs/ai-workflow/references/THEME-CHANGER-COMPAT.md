# Theme Changer Compatibility
> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: theme/CSS variable work, theme collection, dark-first design

---

## Theme Changer Compatibility (MANDATORY)

**ALL UI/UX components MUST work with the UniversalThemeContext theme changer.**

### Dark-First Design Philosophy (MANDATORY)
- **Default theme: `crystalline-dark` (Void Crystal)** — dark backgrounds (#030712) with cyan/purple accents
- **ALL new components MUST be designed dark-first** — dark bg with glowing cyan/purple accents is the signature look
- **The screenshot aesthetic:** Deep dark backgrounds, cyan `#60C0F0` text/accents, purple `#8B5CF6` borders/glows, subtle surface cards in `#141419` Carbon or `#1A1A24` Graphite
- **Fallback colors in CSS vars MUST be dark-theme values** — `var(--bg-base, #030712)` not `var(--bg-base, #002060)`
- **NO bright/light themes except ONE white theme** (`crystalline-light`) for accessibility. All other themes MUST be dark variations with different accent colors
- **When building ANY component**, envision it on a near-black background with glowing accents — this is the SwanStudios identity
- **Bright backgrounds are NOT the brand** — deep dark with luminous cyan/purple is the brand

### Requirements
- Every styled-component must use **CSS custom properties** (`var(--bg-base)`, `var(--text-primary)`, `var(--accent-primary)`, etc.) with dark-theme Crystalline Swan fallback values
- The theme toggle button in the header cycles through themes — components MUST adapt
- **No hardcoded colors** without a `var()` wrapper. Pattern: `var(--accent-primary, #60C0F0)`
- Theme variables are injected via `injectThemeVariables()` in `frontend/src/utils/theme/themeUtils.ts`
- **Available CSS variables:** `--bg-base`, `--bg-elevated`, `--bg-surface`, `--text-primary`, `--text-secondary`, `--text-heading`, `--text-muted`, `--accent-primary`, `--accent-secondary`, `--accent-gold`, `--border-soft`, `--accent-primary-10` (10% opacity blend)
- For dynamic opacity: use `color-mix(in srgb, var(--accent-primary) 15%, transparent)` instead of hardcoded rgba
- **Test new components** with Void Crystal (dark, default), Crystalline Light (the ONE light theme), and Cyberpunk Edgerunners to verify contrast

### Theme Collection (All Dark Variations + 1 White)
**ALL themes MUST have dark backgrounds** with their unique accent colors glowing on dark surfaces — like the workout logger aesthetic. Only `crystalline-light` provides a white/light option for accessibility.

| Theme | ID | Dark BG | Accent Colors |
|-------|-----|---------|--------------|
| **Void Crystal (DEFAULT)** | `crystalline-dark` | #030712 | Cyan `#22D3EE` + Purple `#8B5CF6` |
| Crystalline Swan | `crystalline-default` | #001545 | Ice Wing `#60C0F0` + Sapphire |
| Arctic Dawn (white option) | `crystalline-light` | #F4F7FB | Cyan `#00B4D8` (only light theme) |
| Monochrome | `crystalline-monochrome` | Dark gray | White/gray accents |
| Obsidian Ember | `cinematic-ember` | Dark ember | Warm amber + fire glow |
| Frozen Aurora | `frozen-aurora` | Dark ice | Icy pastels + aurora glow |
| Obsidian Black | `obsidian-black` | Near-black | Minimal white accents |
| Cyberpunk Edgerunners | `cyberpunk-edgerunners` | Dark neon | Neon yellow `#FAFF00` + hot pink |
| Obsidian Bloom | `obsidian-bloom` | Dark violet | Violet + hot pink glow |
| Frozen Canopy | `frozen-canopy` | Dark forest | Arctic emerald + ice |
| Ember Realm | `ember-realm` | Dark crimson | Crimson + fire orange glow |
| Twilight Lagoon | `twilight-lagoon` | Deep navy | Bioluminescent teal glow |
| Nebula Crown | `nebula-crown` | Dark cosmic | Cosmic purple + pink glow |
| Enchanted Forest | `enchanted-forest` | Dark forest | Deep emerald + gold glow |

**Rule:** If any theme currently uses a light/bright background (except `crystalline-light`), it must be converted to a dark background with its accent colors as luminous accents/glows on the dark surface.
