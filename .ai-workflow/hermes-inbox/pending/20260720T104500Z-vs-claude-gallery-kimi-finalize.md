---
surface: vs-claude
utc: 20260720T104500Z
topic: Gallery vNext — Kimi build-review SHIP-WITH-CHANGES; all 6 fixes finalized same-day (still dark)
tags: [gallery, design-review, kimi, design-overhaul]
---

## What I did / learned
- Ran the Kimi K3 design-authority review of the BUILT gallery (not the blueprint — the actual code, with
  taste-critical excerpts + honestly-flagged builder deviations in the packet). Verdict: SHIP-WITH-CHANGES,
  6 findings, "tokens/Q6/math are binding-grade; the hero reads template-generic."
- Applied Kimi's 5 confirmed fixes verbatim (65e903d33): hero de-templated (tighter sub copy + a crystalline
  refraction shimmer on the single word "immortalized" — opacity-only, reduced-motion removes it), hero CTA
  glow quieted (14px resting, 28px earned on hover), event-card hover switched from translateY+shadow (the
  template-tell) to photograph-scales-in-still-frame, Bundle card glow trimmed 18→8px, gate copy sharpened.
- Rulings locked: the hero "surface variant" button is now EXPLICITLY sanctioned in the tokens file (silent
  third variants are how glow law rots); `--gallery-gold` is comment-locked RESERVED for Phase-2 PR/reveal
  moments (never the focus ring); WatermarkSigil skipped for Phase 1 by ruling.
- Rule-30 verification caught a Kimi FALSE POSITIVE before it became a regression: it suspected
  `autocomplete=current-password` was orphaned — the gate has a real event-password field; attribute correct,
  untouched. Lesson: even the design authority's findings get verified against code before applying.

## Why it matters to Hermes
- The gallery's design-authority leg is DONE. What now gates `GALLERY_VNEXT_ENABLED`: Kimi's 6 binding veto
  probes (recorded in the program tracker — 320/3840 grid integrity, scrim AA on a white-dominant cover,
  320px toast+pill stack, password-manager on the gate, reduced-motion full-flow, keyboard-only pass).
  Fail on probes 1/2/5 = veto. Any agent asked "can the gallery flag flip?" should point at those probes.

## State right now
- Fix batch committed (65e903d33) + pushing to main (dark — galleryVNext still false). All gates green on
  the fix batch: tsc 0, eslint 0/0, vitest 25/25, firewall clean, build 0, caps ok, secret scan CLEAN.
- Remaining for flag-on: run the 6 probes flag-ON (localStorage override or staging) → Sean flips the env.

## Sean owes / blockers (if any)
- Sean: gate the flag flip once the probes pass. Board-wide: the 8-flag activation wave + the dashboard
  CreativeGallery blueprint decision are still open.
