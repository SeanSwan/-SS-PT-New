# Hermes Learning Packet — Style Lens OS Sentinel Checkpoint

Date: 2026-07-11
Project: SwanStudios / SS-PT
Branch: `codex/style-lens-os-foundation-20260711`

## Beginning state

Sean requested a Swan-specific adapter for a reusable Style Lens OS, an Appearance Studio capable of changing structural style independently from color and motion, five polished sentinel themes, real mobile/desktop visual QA, a Fable checkpoint, then expansion to 25 themes and Workout Design Lab's 25+25 experience.

The governing contract made Fable's literal `APPROVE` verdict a hard stop before lenses 6–25. External references such as Mobbin, Dribbble, and Higgsfield were inspiration inputs only; the output had to remain original and subordinate to Swan's design system.

## Ending implementation state

The feature branch contains:

- a reusable Style Lens core plus a Swan adapter;
- five distinct sentinels: Quiet Meridian, Blueprint Fold, Kintsugi Circuit, Analog Flight Recorder, and Candy Glass Arcade;
- Appearance Studio integrated into the existing dashboard theme control, with separate Style, Color, Motion, and Density controls;
- explicit Apply/Cancel semantics, focus restoration, focus trap, APG roving tabs, reduced-motion handling, and a lazy-loaded panel;
- localStorage profile persistence isolated from the existing color-theme and motion keys;
- 320, 414, desktop, QHD/4K-class responsive evidence and a 38-color × 5-lens contract matrix;
- Firefox, WebKit, normal Chrome, and 4× CPU measurements.

The remaining 20 themes and Workout Design Lab 25+25 experience were not started because Fable returned `REVISE`, not `APPROVE`.

## Bugs found by real visual QA

1. First-mount hydration accidentally invoked a transition path. The runtime was changed so saved appearance applies synchronously on mount; only an explicit user commit can request a native View Transition.
2. A transformed desktop ancestor broke fixed mobile positioning. The Studio was portaled to `document.body`, restoring true viewport-relative bottom-sheet behavior.
3. A short-desktop layout let preview content intercept the action footer. Scroll ownership and panel sizing were corrected.
4. The primary action initially failed contrast at 1.72:1. Its token pairing was corrected to 12.70:1.
5. Duplicate landmark semantics produced moderate axe violations. Decorative preview banners were changed to presentation semantics.

## Fable checkpoint outcome

Three evidence-driven Fable reviews ran:

- Run 1: 10/10 responses, cost `$0.9116`, verdict `REVISE`.
- Run 2: 10/10 responses, cost `$0.9705`, verdict `REVISE`; architecture and locked rules conditionally approved in principle.
- Run 3: 10/10 responses, cost `$0.9402`, verdict `REVISE`.
- Total actual review cost: `$2.8223`.

The third review mixed legitimate evidence requests with factual errors. Repository history proves the 38-color registry predates this slice, the exact WCAG calculation for Gilded Fern on Royal Depth is 5.2487:1, and the feature has no IndexedDB/sessionStorage persistence path to suppress. Legitimate requests for cross-browser evidence, 4× CPU metrics, and explicit View Transition failure behavior were implemented and verified.

## Durable lessons

- Treat every model review finding as a hypothesis. Verify it against source, history, executable tests, and standard formulas before changing the product.
- Preserve a literal approval gate. “Approved in principle” is useful feedback, but it does not equal the agreed `APPROVE` token.
- Structural style, color, motion, and density need independent persistence and preview semantics; coupling them creates migration and rollback risk.
- Synthetic role/viewport previews are safer than mutating live authorization or navigation state.
- Real phone-width QA exposes transformed-ancestor, scroll-owner, focus, and footer-interception bugs that component snapshots miss.
- A lazy boundary needs browser request evidence; bundle-size deltas alone cannot prove that a chunk is not eagerly fetched.
- Fable/Village runners can rewrite shared latest-report files and rotate archives. Preserve curated outputs and restore incidental runner side effects before committing.

## Next action

Do not begin lenses 6–25 automatically. Ask Sean whether to preserve the Fable hard stop for a corrected adjudication or explicitly override it. `main` and Render remain unauthorized until the normal release gates are satisfied.
