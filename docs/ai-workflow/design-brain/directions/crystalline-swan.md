# crystalline-swan — Crystalline Swan

- **Date:** 2026-09-23 (registered) · **Author:** Sable (WorkBuddy AI), extracting `design.md` §4 · **Status:** canonical
- **Registered, not invented.** Every value below is read from `design.md` §4 or `design.html`. This file is the incumbent palette given a name and a machine-checkable shape, so it can be *selected* like any other direction rather than being the only legal answer.

## Feel

Frozen enchanted forest meets deep-ocean luxury vault. Sapphire depths, ice-glow accents, gilded edges, obsidian ground. The house style, and it stays the house style — this direction is not deprecated by the registry. It is now one of N instead of the only one.

## Palette

| Role | Value | Source |
|---|---|---|
| `ground` | `#0A0A0F` | `--obsidian-black` (design.md §4) |
| `surface` | `#141419` | `--carbon` — "Card dark" |
| `panel` | `#1A1A24` | `--graphite` — "Surface dark, modals/drawers" |
| `text` | `#E0ECF4` | `--frost-white` |
| `muted` | `#A0A8AF` | **derived** — the composite of §12's documented "Frost White 70%" over Obsidian. Not a new token; the arithmetic of a stated rule |
| `focus` | `#002060` | `--midnight-sapphire` — primary button **background** |
| `rare` | `#50A0F0` | `--arctic-cyan` — **data only**, never buttons or glow (§4, anti-patterns) |
| `third` | `#8B5CF6` | `--wing-purple` — glow accent, epic tier |
| `on-accent` | `#E0ECF4` | Frost White label on a Sapphire button |
| `danger` | `#E5484D` | the ONE off-palette semantic (§4) |
| `warn` | `#C6A84B` | `--gilded-fern` — "attention, not alarm" |
| `ok` | `#60C0F0` | `--ice-wing` — "Swan celebrates in ice-cyan, not generic green" |

The Brain names `--carbon` and `--graphite` by **material**, not by elevation. Here they are mapped to the ladder position they actually occupy: `surface` is the first raised layer, `panel` the elevated card/drawer layer. No value changed; only the axis did.

## Contrast — measured by the validator, not claimed here

`focus` on `ground` is the one pair that cannot pass, and it is declared rather than hidden. `#002060` on `#0A0A0F` measures **1.29:1** — a Sapphire button is nearly invisible against the page. That is by design: §5's Dual-Button Glow and §7's "elevation = glass + glow, not gray shadows" mean the separation is carried by the **Wing Purple glow and the electric border**, not by luminance. The mechanism is named so a reviewer can attack the mechanism.

## Signature

**The electric border.** `rgba(96,192,240,0.2–0.25)` base → `0.5` on hover, gold variant `rgba(198,168,75,0.3–0.35)`. It is what makes a Sapphire button legible on Obsidian, and it is why the button-fill exception above is survivable.

```json direction
{
  "schema": "swan-direction/1",
  "id": "crystalline-swan",
  "name": "Crystalline Swan",
  "version": "1.0.0",
  "status": "canonical",
  "theme_id": "crystalline-default",
  "theme_source": "docs/ai-workflow/references/THEME-CHANGER-COMPAT.md - theme row 'Crystalline Swan' (crystalline-default)",
  "scope": ["product", "marketing", "operator"],
  "feel": "Frozen enchanted forest meets deep-ocean luxury vault: sapphire depths, ice-glow accents, gilded edges, obsidian ground.",
  "match_terms": ["swan", "house style", "luxury", "vault", "sapphire", "premium", "storefront", "dashboard", "coach"],
  "ground_inverts": false,
  "palette": {
    "ground": "#0A0A0F",
    "surface": "#141419",
    "panel": "#1A1A24",
    "text": "#E0ECF4",
    "muted": "#A0A8AF",
    "focus": "#002060",
    "rare": "#50A0F0",
    "third": "#8B5CF6",
    "on-accent": "#E0ECF4",
    "danger": "#E5484D",
    "warn": "#C6A84B",
    "ok": "#60C0F0"
  },
  "contrast_pairs": [
    { "fg": "text", "bg": "ground", "min": 4.5, "role": "body on page" },
    { "fg": "text", "bg": "panel", "min": 4.5, "role": "body on card" },
    { "fg": "muted", "bg": "ground", "min": 4.5, "role": "secondary on page" },
    { "fg": "muted", "bg": "panel", "min": 4.5, "role": "secondary on card" },
    { "fg": "rare", "bg": "ground", "min": 4.5, "role": "data series + chart text" },
    { "fg": "third", "bg": "ground", "min": 4.5, "role": "accent" },
    { "fg": "danger", "bg": "ground", "min": 4.5, "role": "error text" },
    { "fg": "on-accent", "bg": "focus", "min": 4.5, "role": "button label on primary fill" }
  ],
  "contrast_exceptions": [
    {
      "fg": "focus",
      "bg": "ground",
      "measured": 1.29,
      "reason": "The primary button FILL is Midnight Sapphire on an Obsidian page. The fill is deliberately near-invisible as luminance; this is the documented house behaviour, not an oversight.",
      "compensated_by": "design.md §5 Dual-Button Glow (Wing Purple outer glow + focus ring) and §7's electric border at rgba(96,192,240,0.2-0.25) base rising to 0.5 on hover. Separation is carried by glow and border, not by fill luminance."
    }
  ],
  "type": {
    "display": "'Plus Jakarta Sans', 'Sora', system-ui, sans-serif",
    "body": "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif",
    "mono": "'Fira Code', 'Cascadia Mono', Consolas, monospace",
    "rules": [
      "Cormorant Garamond Italic is the drama face: one beat per section maximum",
      "Never Inter / Roboto / Arial / Helvetica as display faces (design.md §6)",
      "Line length <= ~72ch for body prose"
    ]
  },
  "radius": { "sm": "12px", "md": "20px", "lg": "24px", "pill": "999px" },
  "space": "inherit",
  "motion": {
    "easings": { "out": "cubic-bezier(0.16, 1, 0.3, 1)", "in": "cubic-bezier(0.7, 0, 0.84, 0)" },
    "durations": { "fast": "140ms", "mid": "260ms", "slow": "520ms" },
    "signature_budget": 1,
    "gate": ["css", "js"],
    "notes": "Three tiers (ambient/response/narrative). Operator and data-dense surfaces stay calm."
  },
  "glow": {
    "rule": "dual-button",
    "primary": { "bg": "focus", "glow": "third" },
    "accent": { "bg": "third", "glow": "ok" }
  },
  "signature": {
    "name": "Electric border",
    "device": "rgba(96,192,240,0.2-0.25) hairline on every framed surface, rising to 0.5 on hover; gold variant rgba(198,168,75,0.3-0.35) for luxury surfaces.",
    "where": "Every framed surface, button and card edge"
  },
  "bans": [
    "Arctic Cyan #50A0F0 on buttons or glow - it is the DATA colour",
    "Retired Galaxy-Swan tokens #0a0a1a / #00FFFF / #7851A9"
  ],
  "evidence": [
    "docs/ai-workflow/design-brain/design.md section 4 (the palette itself)",
    "docs/ai-workflow/design-brain/design.html (the visual mirror)",
    "docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md (source of truth, wins conflicts)"
  ],
  "derived_roles": ["muted"],
  "supersedes": null,
  "notes": "Registered 2026-09-23 by extracting the incumbent palette, so that selection has a name to pin. No value was changed. The one derived role is documented in derived_roles. UNRESOLVED CONFLICT: THEME-CHANGER-COMPAT.md gives the crystalline-default theme a dark BG of #001545, while design.md section 4 names --obsidian-black #0A0A0F as the primary page bg and design.md section 1 says the DEFAULT theme is crystalline-dark (#030712) - a third value. Three docs, three grounds for what is nominally one house style. This file registers the design.md section 4 value because design.md is the Brain's canonical statement and SWAN-CINEMATIC-DESIGN-SYSTEM.md wins conflicts. The runtime theme's actual ground needs measuring against frontend/src/utils/theme/themeUtils.ts before this is settled."
}
```
