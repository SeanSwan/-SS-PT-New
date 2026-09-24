# codex-restraint — Codex Restraint

- **Date:** 2026-09-23 (registered) · **Author:** Sable (WorkBuddy AI), extracting `mockups/hermes-web-chat-mockup-a.html` · **Status:** experimental
- **Registered, not invented.** The palette is read from the mockup's own `:root` block, which is headed *"Deliberately NOT the Crystalline Swan palette. Sean chose 'restrained and neutral' over house style for a tool he stares at for hours."* That is a sanctioned escape that was never given a name. This file gives it one.

## Feel

Near-monochrome, one accent, no decoration. Colour is reserved for **state** — running, needs-approval, error — and never used as chrome. Structure comes from 1px hairlines, not from shadows, fills, or radius. A tool you can stare at for eight hours.

## What the registry caught — a real accessibility defect

**The mockup's tertiary text fails WCAG AA, and has been doing so since it was written.**

`--ink-3: #6b7280` on `--bg: #0d0e10` measures **4.00:1**. The mockup uses `--ink-3` for `.s-m` session metadata, `.grp` group labels, `.railfoot`, and `.who` speaker labels — all at **11px**, which is small text and requires 4.5:1.

The registered value is corrected to **`#7C8492`**, which measures **5.13:1** and keeps the cool near-monochrome character. `mockups/hermes-web-chat-mockup-a.html` has been updated to match, so the mockup and the direction do not disagree.

This is the registry earning its keep. The defect was invisible because nothing had ever *measured* the mockup — it was a hand-built artifact with no gate. A direction file that declares its own contrast pairs and has them computed cannot hide this.

## The type-stack deviation — recorded, not normalised

The mockup's stack led with `Inter` and `Roboto`, both of which sit in the family `design.md` §6 bans. Both were **removed** from the mockup on 2026-09-23, leaving a system-native stack.

What remains is a **recorded deviation, not a fix**. This direction uses a system-native stack rather than one of the approved display faces (Sora / Plus Jakarta Sans / Fira Code). §6's explicit ban is on Inter / Roboto / Arial / Helvetica — none of which this stack names — so the direction is compliant with the **ban** while not following the **face table**.

That distinction is worth keeping honest rather than papering over. The alternative was to force Plus Jakarta Sans onto a mockup whose whole premise is system-native restraint — which would have been me changing a design to satisfy a rule that does not quite say what I wanted it to say. That is Sean's call, not mine.

## Signature

**Hairline structure.** The entire surface is built from 1px `--line` dividers and transparent fills. Nothing has a shadow; nothing has a fill above `--bg-elev`; no radius exceeds 7px. The hairlines measure 1.26:1 — they are deliberately structural rather than assertive, and the active state is carried by the accent left-border at 7.67:1.

```json direction
{
  "schema": "swan-direction/1",
  "id": "codex-restraint",
  "name": "Codex Restraint",
  "version": "1.0.0",
  "status": "experimental",
  "theme_id": null,
  "theme_source": null,
  "scope": ["operator", "internal-tool", "experiment"],
  "feel": "Near-monochrome, one accent, no decoration. Colour is reserved for state and never used as chrome; structure comes from hairlines rather than shadows or fills.",
  "match_terms": ["restraint", "restrained", "monochrome", "neutral", "quiet", "editor", "dense", "utilitarian", "no-decoration", "long-session"],
  "ground_inverts": false,
  "palette": {
    "ground": "#0d0e10",
    "surface": "#101114",
    "panel": "#16181c",
    "line": "#22252b",
    "line-hi": "#2e333c",
    "text": "#e7e9ee",
    "text-dim": "#a3a8b3",
    "muted": "#7C8492",
    "on-accent": "#0d0e10",
    "focus": "#7aa2f7",
    "rare": "#7bc47f",
    "danger": "#e06c75",
    "warn": "#d9a441",
    "ok": "#7bc47f"
  },
  "contrast_pairs": [
    { "fg": "text", "bg": "ground", "min": 4.5, "role": "body on page" },
    { "fg": "text", "bg": "panel", "min": 4.5, "role": "body on elevated panel" },
    { "fg": "text-dim", "bg": "ground", "min": 4.5, "role": "secondary text" },
    { "fg": "muted", "bg": "ground", "min": 4.5, "role": "tertiary / metadata at 11px" },
    { "fg": "muted", "bg": "panel", "min": 4.5, "role": "metadata on elevated panel" },
    { "fg": "focus", "bg": "ground", "min": 4.5, "role": "the one accent - active state and focus ring" },
    { "fg": "rare", "bg": "ground", "min": 4.5, "role": "running / progress state" },
    { "fg": "danger", "bg": "ground", "min": 4.5, "role": "error state" },
    { "fg": "on-accent", "bg": "focus", "min": 4.5, "role": "label on the accent fill" }
  ],
  "contrast_exceptions": [
    {
      "fg": "line",
      "bg": "ground",
      "measured": 1.26,
      "reason": "Hairlines are the direction's whole structure, and they are deliberately quiet. They are decorative separators inside already-grouped content, never a meaningful component boundary and never the sole signal for a state.",
      "compensated_by": "Active and selected states are carried by the accent left-border at 7.67:1, focus is carried by a focus-visible ring, and every interactive control is a bordered element whose border is the accent on hover. The hairline only subdivides; it never indicates."
    }
  ],
  "type": {
    "display": "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    "body": "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    "mono": "ui-monospace, 'Cascadia Mono', 'SF Mono', 'Fira Code', Menlo, monospace",
    "rules": [
      "RECORDED DEVIATION: a system-native stack rather than an approved display face (Sora / Plus Jakarta Sans / Fira Code). design.md section 6's explicit ban is on Inter / Roboto / Arial / Helvetica, none of which this stack names - so it is compliant with the ban while not following the face table. Recorded for Sean rather than silently normalised.",
      "The source mockup led with Inter and Roboto; both were removed on 2026-09-23 because they sit in the banned family",
      "Mono carries tool rows, model ids and metadata - it is structural here, not decorative",
      "No uppercase display type; uppercase is reserved for 11px micro-labels only"
    ]
  },
  "radius": { "sm": "4px", "md": "7px", "lg": "10px", "pill": "999px" },
  "space": "inherit",
  "motion": {
    "easings": { "out": "cubic-bezier(0.16, 1, 0.3, 1)" },
    "durations": { "fast": "120ms", "mid": "120ms", "slow": "120ms" },
    "signature_budget": 0,
    "gate": ["css", "js"],
    "notes": "Transitions are 0.12s and used for border/colour only. No entrance animations, no loops, no ambient motion. A long-session tool that moves is a tool that tires you."
  },
  "glow": {
    "rule": "flat-border",
    "primary": { "bg": "focus", "glow": "focus" },
    "accent": { "bg": "panel", "glow": "focus" }
  },
  "signature": {
    "name": "Hairline structure",
    "device": "1px --line dividers on transparent fills, no shadows, no fills above --bg-elev, no radius above 7px. Structure by rule, not by elevation.",
    "where": "Every rail, header, tool row and panel boundary"
  },
  "bans": [
    "Chat bubbles - this direction uses a speaker label plus prose (mockup rule: NO BUBBLES)",
    "Shadows and elevation",
    "Colour as chrome - colour is state only",
    "Radius above 7px",
    "More than one chrome accent"
  ],
  "evidence": [
    "docs/ai-workflow/design-brain/mockups/hermes-web-chat-mockup-a.html - the :root block is the palette source, and the file carries the 'deliberately NOT Crystalline Swan' ruling",
    "Contrast computed by scripts/design-brain/directions/validate-directions.mjs, which found --ink-3 #6b7280 at 4.00:1 and forced the correction to #7C8492 at 5.13:1"
  ],
  "derived_roles": ["line-hi", "lg-radius"],
  "supersedes": null,
  "notes": "Registered 2026-09-23. One correction was made against the source mockup: the tertiary text value, an AA failure at 4.00:1 corrected to 5.13:1, applied to the mockup as well. The banned-family faces Inter and Roboto were also removed from the mockup stack. The remaining use of a system-native stack instead of an approved display face is a RECORDED DEVIATION, not a correction - see the type rules. Promotion to canonical is Sean's call."
}
```
