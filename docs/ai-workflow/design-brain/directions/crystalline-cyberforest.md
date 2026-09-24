# crystalline-cyberforest — Crystalline Cyberforest

- **Date:** 2026-09-23 (registered) · **Author:** Sable (WorkBuddy AI), extracting `design.md` §3 · **Status:** canonical
- **Registered, not invented.** The extension layer is quoted verbatim from `design.md` §3; this file adds the role mapping and the machine-checkable shape. No value changed.

## Feel

The same vault, grown over. Deep forest replaces Obsidian as the page base, forest-mid replaces the card layer, and an aurora wash crosses the header band. Still Swan — the tokens, buttons, glow discipline and tier badges are the standard palette, unchanged.

## Scope — this one is narrow on purpose

**Operator surfaces only.** `design.md` §3 and §19 make this Sean-only: Hermes agentic-OS surfaces, kill switches, receipts, the cockpit. **No Cyberforest token may appear in a client-facing component** (`anti-patterns.md` — "Cyberforest tokens on client-facing surfaces"). The registry does not widen that; `scope: ["operator"]` encodes it.

This is the direction that proves the registry's `scope` field does real work: a direction is not merely a palette, it is a palette *with a permitted territory*.

## What the registry caught

Two pairs cannot meet 4.5:1 here, and both are legitimate — but only because the doctrine already says so, and the registry forces that to be written down rather than assumed:

- **`third` (Wing Purple) on the forest ground measures 3.62:1.** Wing Purple is the glow accent and focus-ring colour, not body text — §15 already notes raw tokens are used for *fills and borders* while small text takes lightened tints. Declared at the 3:1 component threshold with its role stated.
- **`danger` on the forest ground measures 3.92:1.** §22 renders an error's message *in plain words* and uses `--danger` as the accent once — so danger is a border/icon colour here, never the text. Declared at 3:1 with that role stated.

A lighter ground makes every dark-token contrast worse. The registry does not let that pass silently; it makes the compensation explicit.

## Signature

**The aurora wash.** A `120deg` gradient — Ice Wing shimmer → Wing Purple mid-band → Gilded Fern horizon — used as a **top-edge or header band only**, at low opacity, never a full-page animated background. Header band only; text, buttons and badges stay standard.

```json direction
{
  "schema": "swan-direction/1",
  "id": "crystalline-cyberforest",
  "name": "Crystalline Cyberforest",
  "version": "1.0.0",
  "status": "canonical",
  "theme_id": null,
  "theme_source": null,
  "scope": ["operator"],
  "feel": "The Swan vault grown over: deep forest ground, forest-mid panels, and a low aurora wash across the header band. A cockpit, not a brand page.",
  "match_terms": ["operator", "hermes", "cockpit", "forest", "aurora", "control room", "kill switch", "receipts", "sean-only"],
  "ground_inverts": false,
  "palette": {
    "ground": "#0E2A1E",
    "surface": "#143528",
    "panel": "#1A4032",
    "panel-hi": "#214A3A",
    "text": "#E0ECF4",
    "muted": "#A1B2B4",
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
    { "fg": "text", "bg": "panel", "min": 4.5, "role": "body on panel" },
    { "fg": "muted", "bg": "ground", "min": 4.5, "role": "secondary on page" },
    { "fg": "muted", "bg": "panel", "min": 4.5, "role": "secondary on panel" },
    { "fg": "rare", "bg": "ground", "min": 4.5, "role": "data series + chart text" },
    { "fg": "on-accent", "bg": "focus", "min": 4.5, "role": "button label on primary fill" },
    { "fg": "third", "bg": "ground", "min": 3.0, "role": "focus ring and component boundary - never body text" },
    { "fg": "danger", "bg": "ground", "min": 3.0, "role": "error accent (border/icon) - the message itself renders in --text per design.md section 22" }
  ],
  "contrast_exceptions": [
    {
      "fg": "focus",
      "bg": "ground",
      "measured": 1.01,
      "reason": "Midnight Sapphire button fill on the forest ground. On a lighter ground the sapphire fill is even less separable by luminance than it is on Obsidian - 1.01:1 against 1.29:1 in crystalline-swan.",
      "compensated_by": "design.md section 3 states buttons keep the standard palette, so the Dual-Button Glow (Wing Purple outer glow plus focus ring) and the electric border carry the separation exactly as they do in crystalline-swan. The mechanism is unchanged; only the measured margin gets worse, which is why it is recorded here rather than assumed to be fine."
    }
  ],
  "type": {
    "display": "'Plus Jakarta Sans', 'Sora', system-ui, sans-serif",
    "body": "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif",
    "mono": "'Fira Code', 'Cascadia Mono', Consolas, monospace",
    "rules": [
      "Identical to crystalline-swan - Cyberforest swaps only the bg/surface layer tokens",
      "Never Inter / Roboto / Arial / Helvetica as display faces"
    ]
  },
  "radius": { "sm": "12px", "md": "20px", "lg": "24px", "pill": "999px" },
  "space": "inherit",
  "motion": {
    "easings": { "out": "cubic-bezier(0.16, 1, 0.3, 1)", "in": "cubic-bezier(0.7, 0, 0.84, 0)" },
    "durations": { "fast": "120ms", "mid": "200ms", "slow": "200ms" },
    "signature_budget": 0,
    "gate": ["css", "js"],
    "notes": "design.md section 19: data-dense and CALM. Ambient motion banned, response motion <=200ms, no signature moments. This is a cockpit."
  },
  "glow": {
    "rule": "dual-button",
    "primary": { "bg": "focus", "glow": "third" },
    "accent": { "bg": "third", "glow": "ok" }
  },
  "signature": {
    "name": "Aurora wash",
    "device": "A 120deg gradient - Ice Wing shimmer at 0.18 alpha, Wing Purple mid-band at 0.14, Gilded Fern horizon at 0.10 - applied to the top edge or header band only.",
    "where": "Header band or top edge as a wash or divider. Never a full-page animated background."
  },
  "bans": [
    "Any Cyberforest token on a client-facing surface (Sean-only, design.md section 3)",
    "Aurora as a full-page animated background",
    "Ambient motion - this is a calm zone",
    "Arctic Cyan #50A0F0 on buttons or glow"
  ],
  "evidence": [
    "docs/ai-workflow/design-brain/design.md section 3 (the extension layer, quoted) and section 19 (the operator surface rules)",
    "docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md section 10 (the Sean-only scope ruling)"
  ],
  "derived_roles": ["surface", "panel-hi", "muted"],
  "supersedes": null,
  "notes": "Registered 2026-09-23 by extracting the operator mode into the registry. The three derived roles are the intermediate ladder steps and the muted composite, which section 3 did not name because the mode only ever swapped the bg/surface layer. Flagged in derived_roles so a derivation is not mistaken for an invented token (enforcement rule 4)."
}
```
