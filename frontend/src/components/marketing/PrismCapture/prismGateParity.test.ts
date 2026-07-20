/**
 * GATE-PARITY CONTRACT — enforces "The Gate Rule" (Kimi hostile review, 2026-07-19).
 *
 * THE RULE: no feature may be mounted inside a gated component unless it is mounted in ALL branches of that gate.
 *
 * WHY THIS TEST EXISTS (a real defect, caught by Sean asking the right question): PrismCapture — the ONLY
 * lead-capture on the site — was originally mounted in `HomePage.V4` alone. `HomeGate` renders `HomeVNext` when
 * HOME_VNEXT_ENABLED is true and `HomePage.V4` otherwise, so the first time the Home redesign was activated the
 * acquisition feature would have SILENTLY DISAPPEARED. Nothing in the build, types, lint, or the 3-pass hostile
 * review caught it — a divergence between gate branches is invisible to every other check.
 *
 * This is a STRUCTURAL/source contract rather than a render test on purpose: rendering either full home requires
 * the router, lens frame, SEO head, animation tiers and ~10 sections, and that mocking surface would itself rot.
 * Reading the two branch files is deterministic, fast, and fails loudly for exactly the divergence we care about.
 *
 * If you add another gated surface with an additive feature, add a row to GATE_BRANCHES below.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../../..'); // -> frontend/src

/** Each entry: a feature that must appear in EVERY branch a gate can render. */
const GATE_BRANCHES = [
  {
    gate: 'HomeGate (HOME_VNEXT_ENABLED)',
    feature: 'PrismCapture',
    branches: [
      'pages/HomePage/components/HomePage.V4.tsx', // flag OFF branch (current home)
      'pages/HomePage/v-next/HomeVNext.tsx', // flag ON branch (redesigned home)
    ],
  },
];

describe('Gate Rule — additive features must render under every flag state', () => {
  for (const { gate, feature, branches } of GATE_BRANCHES) {
    for (const branch of branches) {
      it(`${feature} is mounted in ${branch} (branch of ${gate})`, () => {
        const src = readFileSync(resolve(root, branch), 'utf8');
        // must import it...
        expect(src, `${branch} does not import ${feature}`).toMatch(
          new RegExp(`import\\s*\\{[^}]*\\b${feature}\\b[^}]*\\}`),
        );
        // ...and actually render it (an import alone is not a mount).
        expect(src, `${branch} imports but never renders <${feature} />`).toMatch(
          new RegExp(`<${feature}\\s*/?>`),
        );
      });
    }
  }

  it('PrismCapture exposes a stable feature marker for downstream assertions', () => {
    const src = readFileSync(resolve(root, 'components/marketing/PrismCapture/PrismCapture.tsx'), 'utf8');
    expect(src).toContain('data-feature="prism-capture"');
  });
});
