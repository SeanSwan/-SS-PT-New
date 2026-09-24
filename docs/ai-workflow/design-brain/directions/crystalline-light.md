# crystalline-light — Arctic Dawn

- **Date:** 2026-09-23 · **Author:** Sable (WorkBuddy AI) · **Status:** experimental
- **`theme_id`: `crystalline-light`** — read from `THEME-CHANGER-COMPAT.md`, which already lists it as *"Arctic Dawn (white option) … the only light theme."*
- **⚠ This file is a PROPOSAL in part.** `ground` and the accent are read from the theme table. **Every other role is derived and flagged in `derived_roles`.** It exists so the registry does not ship violating its own breadth rule (§6: at least one direction must invert the ground). Sean has not approved these values.

## Why the registry needs this direction

Four dark directions is breadth theater with extra steps — the exact failure `directions/README.md` §6 names, and the same failure `cinematic-pages.md` §18 names for concepts. A registry whose whole purpose is variety cannot ship with one ground.

This direction is also the hardest **port test** available: same roles, inverted luminance. If the role abstraction only works when everything is dark, it is not an abstraction.

## What the registry caught — the accent cannot be text

`THEME-CHANGER-COMPAT.md` gives this theme's accent as Cyan `#00B4D8`. On the theme's own ground `#F4F7FB` that measures **2.29:1** — unusable for text, for a label, or for an icon.

That is not a defect in the theme; `#00B4D8` is a *glow and fill* colour, and on a light ground a mid-tone cyan can only ever be that. But it does mean the theme row names **one** accent where a direction needs **three roles with different jobs**. So:

- `focus` is registered as a deeper cyan, **`#00708F`** (5.26:1) — the text-and-action cyan
- `#00B4D8` stays as the decorative glow, and is **not** used for text anywhere
- `rare` and `third` are derived to carry data and tertiary work, which the theme row did not cover at all

A single-accent theme row is enough for a toggle and not enough for a design. That gap is what a direction file closes.

## Signature

**Frosted glass on snow.** Light-first elevation by a 1px cool hairline plus a soft lift — never a gray drop-shadow, which reads as 2015 Bootstrap (`anti-patterns.md`). Cards are the *brightest* surface; the page is slightly darker than they are, inverting the dark-first ladder's direction while keeping its structure.

```json direction
{
  "schema": "swan-direction/1",
  "id": "crystalline-light",
  "name": "Arctic Dawn",
  "version": "0.1.0",
  "status": "experimental",
  "theme_id": "crystalline-light",
  "theme_source": "docs/ai-workflow/references/THEME-CHANGER-COMPAT.md - theme row 'Arctic Dawn (white option)', which supplies the ground #F4F7FB and the accent #00B4D8. All other roles are derived proposals.",
  "scope": ["product", "marketing", "experiment"],
  "feel": "Arctic dawn: a snow-bright page, cool slate type, and deep cyan doing the work a mid-tone cyan cannot. The dark-first ladder, inverted.",
  "match_terms": ["light", "daylight", "snow", "arctic dawn", "print", "document", "bright", "daylight-readable", "high-ambient"],
  "ground_inverts": true,
  "palette": {
    "ground": "#F4F7FB",
    "ground-2": "#EEF3F9",
    "surface": "#FAFCFE",
    "panel": "#FFFFFF",
    "panel-sunk": "#E9EFF6",
    "line": "#D9E2EC",
    "line-hi": "#BFCDDD",
    "text": "#0B1B2B",
    "text-dim": "#3D5166",
    "muted": "#5A6E85",
    "on-accent": "#FFFFFF",
    "focus": "#00708F",
    "rare": "#0F7A6E",
    "third": "#6D4AC4",
    "danger": "#C42A38",
    "warn": "#8A5A00",
    "ok": "#0F7A6E"
  },
  "contrast_pairs": [
    { "fg": "text", "bg": "ground", "min": 4.5, "role": "body on page" },
    { "fg": "text", "bg": "panel", "min": 4.5, "role": "body on card" },
    { "fg": "muted", "bg": "ground", "min": 4.5, "role": "secondary on page" },
    { "fg": "muted", "bg": "panel", "min": 4.5, "role": "secondary on card" },
    { "fg": "focus", "bg": "ground", "min": 4.5, "role": "the action cyan - text, icon and label" },
    { "fg": "rare", "bg": "ground", "min": 4.5, "role": "data + progress" },
    { "fg": "third", "bg": "ground", "min": 4.5, "role": "tertiary accent" },
    { "fg": "danger", "bg": "ground", "min": 4.5, "role": "error text" },
    { "fg": "on-accent", "bg": "focus", "min": 4.5, "role": "label on the action fill" }
  ],
  "contrast_exceptions": [
    {
      "fg": "line",
      "bg": "ground",
      "measured": 1.22,
      "reason": "The hairline is a decorative separator, not a meaningful component boundary, exactly as in the dark directions. On a light ground it is deliberately fainter than the page rather than darker.",
      "compensated_by": "Elevation is carried by the panel being brighter than the ground plus the hairline together, and every interactive boundary adds a focus-visible ring in --focus at 5.26:1. The hairline never indicates a state on its own."
    }
  ],
  "type": {
    "display": "'Sora', 'Segoe UI Variable Display', system-ui, sans-serif",
    "body": "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif",
    "mono": "'Fira Code', 'Cascadia Mono', Consolas, monospace",
    "rules": [
      "Approved faces only - the light ground does not relax the display-face ban",
      "Never Inter / Roboto / Arial / Helvetica as display faces",
      "Body prose still caps at ~72ch; a light page invites over-long measure more than a dark one does"
    ]
  },
  "radius": { "sm": "12px", "md": "20px", "lg": "24px", "pill": "999px" },
  "space": "inherit",
  "motion": {
    "easings": { "out": "cubic-bezier(0.16, 1, 0.3, 1)", "in": "cubic-bezier(0.7, 0, 0.84, 0)" },
    "durations": { "fast": "140ms", "mid": "220ms", "slow": "420ms" },
    "signature_budget": 1,
    "gate": ["css", "js"],
    "notes": "Slightly shorter durations than the dark directions - large bright areas make slow motion read as lag rather than weight."
  },
  "glow": {
    "rule": "dual-button",
    "primary": { "bg": "focus", "glow": "rare" },
    "accent": { "bg": "rare", "glow": "third" }
  },
  "signature": {
    "name": "Frosted lift",
    "device": "The panel is brighter than the ground, separated by a 1px cool hairline. Elevation by luminance direction, never by a gray drop-shadow.",
    "where": "Every card, panel and modal"
  },
  "bans": [
    "Gray drop-shadows - anti-patterns.md bans flat gray shadows in every direction",
    "The theme table's #00B4D8 as text, icon or label colour - it measures 2.29:1 on this ground and is a glow/fill only",
    "Pure black #000000 type - --text is a blue-black",
    "Arctic Cyan #50A0F0 on buttons or glow"
  ],
  "evidence": [
    "docs/ai-workflow/references/THEME-CHANGER-COMPAT.md - the Arctic Dawn row, supplying the ground and the accent",
    "Contrast computed by scripts/design-brain/directions/validate-directions.mjs, which measured the theme's own #00B4D8 at 2.29:1 on its own ground"
  ],
  "derived_roles": ["ground-2", "surface", "panel", "panel-sunk", "line", "line-hi", "text", "text-dim", "muted", "on-accent", "focus", "rare", "third", "danger", "warn", "ok"],
  "supersedes": null,
  "notes": "PROPOSAL. Only ground (#F4F7FB) and the accent family (#00B4D8) come from an existing artifact; every other value is derived and listed in derived_roles. Registered so the registry satisfies its own breadth rule rather than shipping four dark directions and calling that variety. Sean's ratification required before canonical."
}
```
