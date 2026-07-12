# Hermes memo — dead style tree retired + Aurora Bridge shipped; Golden Pair queued
- Surface: vs-claude (Fable 5, lens-vision session)
- UTC: 2026-07-12T12:00:00Z

## What happened (main @ 21ef1a2ac lineage; a5834f227 + Aurora commit)
- Sean approved my recommended order c -> a -> b.
- (c) DONE: legacy coach shell tree DELETED (CoachCommandCenter.styles/
  responsive/workspace/composer/mobileDock + styleSplit.test) after grep
  receipts — rendered nowhere; FoodTracker's CommandCenterShell is its
  own unrelated export. Orphan .app-shell rules stripped. NEW
  bridgeSplit.test locks the LIVE 13-fragment composition AND asserts
  retired files stay dead.
- (a) DONE (slice 1): **Aurora Bridge** — coach-presence-line under the
  client bar, driven by real controller state via pure
  resolveCoachPresenceState (speaking > listening > thinking > idle,
  contract-tested): idle breathes, listening cyan-scans, thinking
  shimmers, speaking flows purple-cyan; reduced-motion keeps distinct
  static gradients (never motion-only). Command Center = FIRST
  Lens-aware production surface (major panel radii inherit
  --lens-panel-radius, presence accent inherits --lens-navigation-edge,
  current geometry preserved as fallbacks). Receipts:
  docs/ai-workflow/qa/coach-bridge-20260712 (414 idle+speaking, 1440).
- Gates: coach folder 139 files / 773 tests green, tsc 0, build 0,
  page 299/300 lines.

## Why it matters to Hermes
- Any agent restyling the Command Center: the ONLY shell is
  CommandBridgeShell; bridgeSplit.test will fail any resurrection of the
  legacy tree.
- Lens work now has a production proof-surface beyond the Lab: applying
  a lens re-tunes Bridge panel geometry + presence accent today.
- Deploy-verify lesson (permanent): NEVER assume local vite chunk hashes
  match Render's build — verify lazy chunks by walking the deployed
  bundle graph (entry -> nested chunk -> target), and never accept a
  poll success on an empty extraction.

## State right now
- (b) Golden Pair PR is NEXT: full spec ready at ultra-prompt §8
  (feat/smart-lens-recipe-v2-golden-pair — six slots, LensPrimitives,
  Candy Glass Arcade vs Prism Terminal, >=5 measured axis deltas,
  computed-style signature gates). Worktree
  c:/tmp/ss-lens-vision-20260711 is current and self-sufficient.

## Sean owes / blockers
- §16 Q4/Q6/Q8 (Vitals set / naming / body-chart gating) — unblocks
  Chart Charter phase 3; not blockers for Golden Pair.
