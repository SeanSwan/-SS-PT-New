# cyberpunk-edgerunners — Cyberpunk Edgerunners

- **Date:** 2026-09-23 · **Author:** Sable (WorkBuddy AI) · **Status:** experimental
- **`theme_id`: `cyberpunk-edgerunners`** — this direction already existed as a runtime theme. It is registered here so an agent can *select* it, not just a human toggling a switch.

## The reconciliation — this is a revision, not a new theme

`THEME-CHANGER-COMPAT.md` already lists this theme:

| Theme | ID | Dark BG | Accent Colors |
|---|---|---|---|
| Cyberpunk Edgerunners | `cyberpunk-edgerunners` | Dark neon | Neon yellow `#FAFF00` + hot pink |

Sean then asked for a specific revision: *"less red, more yellow, more teal, more purple."* So the registered palette is the sanctioned **revision** of that row:

| | Existing spec | Registered revision | Why |
|---|---|---|---|
| Primary accent | `#FAFF00` neon yellow | `#F5E003` acid yellow | Keeps the yellow spine, pulls the green cast out of it |
| Second accent | hot pink | `#17E0C8` sodium teal | "More teal" — teal takes over the data/progress role |
| Third accent | — | `#A855F7` chrome violet | "More purple" — a third glow the old row did not have |
| Red | hot pink as a mood colour | `#FF3D6E` **failure only** | "Less red" — honoured literally; red never decorates |

**The old row is superseded.** `THEME-CHANGER-COMPAT.md` has been updated to point at this file rather than restate a palette that no longer matches what ships.

## Why this direction is the registry's proof case

It keeps **all** of the Brain's method and replaces **only** the palette: closed token set with `var(--token, #fallback)`, the same seven role names, measured contrast, 44px targets, reduced motion gated in CSS **and** JS, the spacing and radius scales unchanged, approved display faces only, and the Dual-Button Glow kept as a *rule* but recoloured (yellow→teal, teal→violet, violet→yellow).

That is the port test from `directions/README.md` §6 passing. If this direction had needed new geometry, it would be a different component system — not a direction.

## Evidence it was built, not proposed

This is the only direction in the registry with a **built, running artifact**: the NIGHTSHIFT studio (`2026-09-23-14-13-18/nightshift/`), 4,364 lines, zero runtime dependencies, three.js r169 + GSAP 3.12.5. Its UI was written to the Brain's rules before this registry existed. Swapping its token file to `crystalline-swan` changes the picture and breaks nothing — which is the proof the abstraction is real rather than asserted.

## Signature

**The chromatic edge.** A 1px rule running acid yellow → sodium teal → chrome violet at 0.85 alpha, fading to transparent at the far end, on every framed surface.

```json direction
{
  "schema": "swan-direction/1",
  "id": "cyberpunk-edgerunners",
  "name": "Cyberpunk Edgerunners",
  "version": "1.0.0",
  "status": "experimental",
  "theme_id": "cyberpunk-edgerunners",
  "theme_source": "docs/ai-workflow/references/THEME-CHANGER-COMPAT.md - theme row 'Cyberpunk Edgerunners', revised 2026-09-23 per Sean's brief (less red, more yellow, more teal, more purple)",
  "scope": ["product", "marketing", "internal-tool", "experiment"],
  "feel": "Night city at 3am: acid yellow signal, sodium-teal readouts, chrome violet static, on a blue-violet black that is never neutral.",
  "match_terms": ["cyberpunk", "edgerunners", "night city", "neon", "terminal", "signal", "chrome", "noir", "grid", "arcade"],
  "ground_inverts": false,
  "palette": {
    "ground": "#05060D",
    "ground-2": "#080A14",
    "surface": "#0B0F1C",
    "panel": "#121829",
    "panel-hi": "#1A2237",
    "panel-sunk": "#0A0E19",
    "line": "#232C45",
    "line-hi": "#33405F",
    "text": "#E9F6F7",
    "text-dim": "#C3D3DA",
    "muted": "#7A88A6",
    "on-accent": "#06070D",
    "focus": "#F5E003",
    "rare": "#17E0C8",
    "third": "#A855F7",
    "danger": "#FF3D6E",
    "warn": "#FF9E2C",
    "ok": "#17E0C8"
  },
  "contrast_pairs": [
    { "fg": "text", "bg": "ground", "min": 4.5, "role": "body on page" },
    { "fg": "text", "bg": "panel", "min": 4.5, "role": "body on card" },
    { "fg": "muted", "bg": "ground", "min": 4.5, "role": "secondary on page" },
    { "fg": "muted", "bg": "panel", "min": 4.5, "role": "secondary on card" },
    { "fg": "focus", "bg": "ground", "min": 4.5, "role": "primary accent" },
    { "fg": "rare", "bg": "ground", "min": 4.5, "role": "data + progress" },
    { "fg": "third", "bg": "ground", "min": 4.5, "role": "tertiary accent" },
    { "fg": "on-accent", "bg": "focus", "min": 4.5, "role": "button label on primary fill" },
    { "fg": "danger", "bg": "ground", "min": 4.5, "role": "error text" }
  ],
  "contrast_exceptions": [
    {
      "fg": "line",
      "bg": "ground",
      "measured": 1.46,
      "reason": "The hairline is a decorative separator, not a meaningful component boundary. It carries no state and is never the only signal for anything.",
      "compensated_by": "Framing is carried by the signature chromatic edge at 0.85 alpha over three bright accents, and every interactive boundary adds a focus-visible ring. The hairline only subdivides inside an already-framed surface."
    }
  ],
  "type": {
    "display": "'Sora', 'Segoe UI Variable Display', system-ui, sans-serif",
    "body": "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif",
    "mono": "'Fira Code', 'Cascadia Mono', Consolas, monospace",
    "rules": [
      "Approved faces only - Sora / Plus Jakarta Sans / Fira Code",
      "Never Inter / Roboto / Arial / Helvetica as display faces",
      "Mono is load-bearing here: readouts, job ids, hex values, progress"
    ]
  },
  "radius": { "sm": "12px", "md": "20px", "lg": "24px", "pill": "999px" },
  "space": "inherit",
  "motion": {
    "easings": {
      "out": "cubic-bezier(0.16, 1, 0.3, 1)",
      "in": "cubic-bezier(0.7, 0, 0.84, 0)",
      "snap": "cubic-bezier(0.34, 1.56, 0.64, 1)"
    },
    "durations": { "fast": "140ms", "mid": "260ms", "slow": "520ms" },
    "signature_budget": 1,
    "gate": ["css", "js"],
    "notes": "transform and opacity only. The result-plate glitch-to-resolve reveal is the one signature moment; the backdrop shader is ambient and is killed outright under reduced motion."
  },
  "glow": {
    "rule": "dual-button",
    "primary": { "bg": "focus", "glow": "rare" },
    "accent": { "bg": "rare", "glow": "third" }
  },
  "signature": {
    "name": "Chromatic edge",
    "device": "A 1px rule running acid yellow 0% to sodium teal 38% to chrome violet 74%, fading to transparent at 100%, at 0.85 alpha. Present on every framed surface.",
    "where": "Top edge of every framed surface, panel and modal"
  },
  "bans": [
    "Red used for mood - the only red is --danger and it never decorates",
    "#0a0a1a / #00FFFF / #7851A9 (retired Galaxy Swan)",
    "The superseded #FAFF00 / hot-pink pairing from the original theme row",
    "Crystalline Swan's #002060 / #60C0F0 anywhere in this direction"
  ],
  "evidence": [
    "2026-09-23-14-13-18/nightshift/public/tokens.css - the shipped token set, contrast measured with WCAG 2.2 relative luminance",
    "2026-09-23-14-13-18/nightshift/public/hero.js - three.js result-plate shader, the signature moment",
    "2026-09-23-14-13-18/nightshift/public/backdrop.js - three.js uEnergy backdrop",
    "2026-09-23-14-13-18/nightshift/docs/DESIGN-DIRECTION-EDGERUNNERS.md - the direction write-up"
  ],
  "derived_roles": [],
  "supersedes": null,
  "notes": "Sean's brief: cyberpunk Edgerunners, less red, more yellow, more teal, more purple. This revises the existing cyberpunk-edgerunners theme row rather than adding a parallel theme. Built and verified in demo mode only - no live render has been dispatched through the studio's ComfyUI graphs yet. Promotion to canonical is Sean's call."
}
```
