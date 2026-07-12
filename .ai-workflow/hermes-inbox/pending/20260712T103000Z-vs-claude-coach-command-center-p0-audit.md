# Hermes memo — Coach Command Center audit + P0 pass shipped
- Surface: vs-claude (Fable 5, lens-vision session)
- UTC: 2026-07-12T10:30:00Z

## What happened
- Sean-directed audit of the Coach Command Center (his Jarvis lane) +
  immediate P0 fixes, shipped on main (2fd4fd257 + cfb498017):
  1. **Real parser bug fixed (TDD):** deterministicCoachIntakeIntent —
     possessives were swallowed into client names ("show Ava's profile"
     -> clientRef "Ava's"); the rules' trailing (?:'s)? was dead code.
     Fixed in cleanClientRef (internal apostrophes survive: O'Brien).
     view_client_profile had NO test at all before this.
  2. **Contrast Supreme pass:** muted tokens lifted via color-mix toward
     secondary text; all live 11px->12px, 12px->13px meta text; route
     chip / purple pill / thread header contrast raised. Root cause of
     Sean's "hard to read" = 10-12px muted grey-blue on translucent
     graphite, NOT token hygiene (which was clean, zero Galaxy-Swan).
  3. **33% lighter Talk-first load:** Review/PLAUD/intake tree
     code-split (page chunk 238KB -> 160.6KB; Review = 80.5KB on-demand).
  4. **Device-matrix adoption:** notch-side safe areas + SE-class
     short-phone chat-height fix on the live mobile dock.
- Coach folder 138 files / 773 tests green; tsc 0; build 0.

## Why it matters to Hermes
- **Transferable facts:** the LIVE command center shell is
  CommandBridgeShell (bridgeStyles) — CoachCommandCenter.styles.ts +
  responsive/workspace/composer/mobileDock fragments are a DEAD legacy
  tree kept alive only by styleSplit.test (Rule 34 cleanup backlog; any
  restyle must target the bridge tree). Page test suites share ONE
  harness (CoachCommandCenterPage.test.harness) — module mocks belong
  there, not per-file.
- The surface is palette-theme-aware but Style-Lens-BLIND — it is the
  designated first Lens-aware surface for Smart Lens Phase 2/3.
- **Unification ruling (Fable, Sean-ratified direction):** Theme Changer
  merges INTO the Lens system as the Colorway layer (ultra-prompt §3);
  AppearanceProfile already stores paletteThemeId + styleLensId together
  — remaining work is UX unification, not architecture.

## State right now
- main @ cfb498017 lineage, deploying. Jarvis redesign arc (voice-first
  bridge beautification) specced next; Golden Pair PR still the next
  Smart Lens code slice.

## Sean owes / blockers
- Ultra-prompt §16 answers (Q4 Vitals set, Q6 naming, Q8 body-chart
  gating); go for Golden Pair; go for the Jarvis visual redesign arc.
