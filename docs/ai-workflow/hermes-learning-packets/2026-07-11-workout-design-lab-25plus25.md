# Hermes Learning Packet — Workout Design Lab 25+25

## Outcome

Workout Design Lab now exposes 25 workout Worlds and 25 whole-dashboard Style Lenses through World, Style, and Compare modes while preserving one shared prototype workout session.

## What Hermes should learn

- Model creative variation as independent axes. World controls atmosphere/content composition; Style controls interface structure. Do not materialize the 25 x 25 matrix as 625 duplicate components.
- Bound comparison explicitly. This implementation permits one World panel and one Style panel, then renders one combined live stage.
- Keep preview separate from persistence. Selecting a Style stages a validated profile; only explicit Apply commits it across the dashboard.
- Shared workflow state belongs above visual modes. Selected exercises, receipts, and the active prototype session survive World/Style/Compare switches.
- Mobile polish requires visual inspection in addition to numeric overflow tests. A 320px screenshot exposed a squeezed horizontal tab rail even though overflow assertions passed; the corrected rail is a fixed three-column phone control with desktop-only descriptions.
- Cross-engine visual QA should run against the production artifact. Cold WebKit timed out fetching Vite development source modules; the same strict tests passed against `vite preview` after a verified build.

## Evidence

- 25 promoted Style Lenses and 25 unique Worlds.
- 11/11 focused unit and interaction tests.
- 6/6 Chromium/Firefox/WebKit 25+25 browser tests on the production preview.
- 3/3 legacy 25-world browser tests, including phone Axe and 320px-to-4K responsiveness.
- TypeScript passed; production build passed with 6,690 transformed modules.
- Zero API writes during the functional browser gate.
- Visual receipts live in `docs/ai-workflow/qa/workout-design-lab-25plus25/`.

## Reusable next step

Use the same independent-axis model when a future role-specific dashboard surface needs theme exploration: reuse the Style Lens catalog and Appearance Studio commit path, keep the surface's real workflow state above the visual selector, and add only bounded comparison—not cloned pages.
