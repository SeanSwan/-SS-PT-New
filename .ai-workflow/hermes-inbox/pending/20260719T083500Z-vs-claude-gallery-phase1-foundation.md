---
surface: vs-claude
utc: 20260719T083500Z
topic: Gallery redesign (billing surface #8) — Phase 1 foundation shipped to build branch, flag-OFF
tags: [gallery, billing, design-overhaul, flag-gated, minors-consent]
---

## What I did / learned
- Kimi's BLIND gallery blueprint's central premise was WRONG against real code. It flagged "must build a new
  photo-rendition backend (dimension columns + thumb/preview pipeline + baked-watermark variant)". Reality: the
  photo model already has width/height + thumbnail/medium/full renditions; `sharp` already generates them on
  upload; `applyWatermark` already bakes a bottom-right corner logo (~8% width) into every public rendition; the
  un-watermarked print master is private-only. The ONLY backend gap was the public photos SELECT omitting
  `medium_url` — a 1-line additive fix. Lesson: reground a blind design blueprint against the real code BEFORE
  scoping any backend work (a phantom big-backend collapsed to one line).
- Gemini's design pass tried to hardcode a `theme.ts` (raw hex), add `tsparticles` "cosmic particles" (galaxy
  idiom / kill-list), and edit the monolith in place — all rejected per Rule 46 + design LAW 3/9. For this surface
  KIMI is the design authority; Gemini is author-not-gate.
- The 5 gallery truth tests are source-string assertions against `GalleryPage.tsx`, so leaving that file
  byte-for-byte untouched (the flag-OFF fallback) keeps them green automatically. Bind-only = do not edit it.

## Why it matters to Hermes
- The gallery is billing-critical (credit purchase, VIP conversion, referral, donation, print, enhancement) AND
  touches minors' photo consent (the access gate collects a parental-consent flag). Treat any future gallery work
  as a strict-review, money-path-bind-only surface.
- `consult-kimi.mjs` exists ONLY in the main tree (gitignored) and reads the main `.env` OpenRouter key — run Kimi
  consults FROM the main tree, relative paths, `--effort medium` (high returns empty).

## State right now
- Phase 1 FOUNDATION committed to branch `claude/build-swan-lens` @ `e34a08665` (NOT pushed, flag-OFF, not wired →
  zero user impact): `gallery-vnext/` foundation + bind-only data layer (flags/lensBindings/tokens/manifest/types/
  api) + backend `galleryVNext` flag + photos SELECT surfaces `mediumUrl`.
- Sean scoped: Phase it / defer OG-deep-link / reuse the 9 money modals as-is.
- REMAINING Phase 1 (a fresh session is picking it up): money hooks + visual (gate/reveal/justified-grid/lightbox/
  pill/toast) + 9 bind-only modal wrappers + shell + gate + seam + mirrored tests → hostile-to-dry → triangle →
  Rule 42 → Sean-gated push. Full spec: `docs/ai-workflow/AI-HANDOFF/NEXT-CHAT-PROMPT-gallery-phase1-continuation-2026-07-19.md`.
- Deferred: Phase 2 (proof-strip, gratitude donation, Form-Analysis signature elevation, filmstrip + zoom), the
  OG/deep-link backend slice, and the 9-modal Crystalline restyle.

## Sean owes / blockers (if any)
- Sean gates the eventual production push + flips `GALLERY_VNEXT_ENABLED` (nothing is live until then). No blocker
  on the build itself — next step is the fresh-session Phase-1 completion.
