/**
 * GATE-PARITY CONTRACT — enforces "The Gate Rule".
 *
 * THE RULE: no feature may be mounted inside a gated component unless it is mounted in ALL branches of that gate.
 *
 * WHY THIS EXISTS (a real defect): PrismCapture — the ONLY lead-capture on the site — was originally mounted in
 * `HomePage.V4` alone. `HomeGate` renders `HomeVNext` when HOME_VNEXT_ENABLED is true and `HomePage.V4` otherwise,
 * so the first time the Home redesign was activated the acquisition feature would have SILENTLY DISAPPEARED.
 * A divergence between gate branches is invisible to the build, types, lint, and code review.
 *
 * WHY THIS IS A SOURCE CONTRACT rather than a render test: rendering either full home requires the router, lens
 * frame, SEO head, animation tiers and ~10 sections — a mocking surface that would itself rot.
 *
 * HARDENED after a hostile review broke v1 in both directions:
 *   - v1 PASSED on `{​/* <PrismCapture /> *​/}` (a commented-out mount) and on `{false && <PrismCapture />}`
 *     — i.e. it went green while the capture was actually gone. Comments and dead branches are now stripped
 *     BEFORE matching, and an explicit dead-branch assertion runs.
 *   - v1 FAILED spuriously on `<PrismCapture {...props} />` and on a prettier-wrapped multiline tag — an
 *     inevitable refactor producing a lying error message, which is how a guard gets deleted. The tag matcher
 *     now accepts any following whitespace/prop/close.
 *
 * KNOWN LIMIT (documented on purpose): aliased or indirect rendering — `import { X as Y }` / `const El = X` —
 * is NOT detected. Do not render a gated feature indirectly inside a gate branch.
 *
 * If you add another gated surface with an additive feature, add a row to GATE_BRANCHES below.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Resolve `frontend/src` from the working directory rather than this file's own path, so the contract does not
 * silently break (ENOENT, reported as a confusing gate violation) if the test file is ever moved to another
 * directory. Tolerates being run from `frontend/` (vitest's default root, and how CI invokes it) or the repo root.
 * NOTE: `import.meta.url` is deliberately NOT used — vitest does not guarantee a `file:` scheme here.
 */
function resolveSrcRoot(): string {
  for (const candidate of [resolve(process.cwd(), 'src'), resolve(process.cwd(), 'frontend/src')]) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`Cannot locate frontend/src from cwd=${process.cwd()} — run this test from frontend/ or the repo root.`);
}
const SRC_ROOT = resolveSrcRoot();

/** Remove JSX/line/block comments so a commented-out mount can never satisfy the render assertion. */
function stripComments(src: string): string {
  return src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ') // {/* ... */}  (JSX comment)
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // /* ... */
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 '); // // ...   (":" guard keeps URLs intact)
}

/** Each entry: a feature that must render in EVERY branch a gate can render. */
const GATE_BRANCHES = [
  {
    gate: 'HomeGate (HOME_VNEXT_ENABLED)',
    gateFile: 'pages/HomePage/HomeGate.tsx',
    feature: 'PrismCapture',
    branches: [
      'pages/HomePage/components/HomePage.V4.tsx', // flag OFF branch (current home, passed in as children)
      'pages/HomePage/v-next/HomeVNext.tsx', // flag ON branch (redesigned home)
    ],
  },
];

describe('Gate Rule — additive features must render under every flag state', () => {
  for (const { gate, gateFile, feature, branches } of GATE_BRANCHES) {
    for (const branch of branches) {
      it(`${feature} is mounted in ${branch} (branch of ${gate})`, () => {
        const raw = readFileSync(resolve(SRC_ROOT, branch), 'utf8');
        const src = stripComments(raw);

        expect(src, `${branch} does not import ${feature}`).toMatch(
          new RegExp(`import\\s*\\{[^}]*\\b${feature}\\b[^}]*\\}`),
        );

        // Accept `<Feature/>`, `<Feature />`, `<Feature {...p} />`, and prettier-wrapped multiline tags —
        // but NOT a commented-out tag (stripped above).
        expect(src, `${branch} imports but never renders <${feature} ...>`).toMatch(
          new RegExp(`<${feature}(\\s|/|>)`),
        );

        // A dead branch renders nothing at runtime — treat it as an unmounted feature.
        expect(
          new RegExp(`(false|null|undefined)\\s*&&\\s*<${feature}\\b`).test(src),
          `${branch} renders <${feature} /> inside a permanently-false branch`,
        ).toBe(false);
      });
    }

    it(`${gate} has no unaccounted-for branch (GATE_BRANCHES must stay in sync)`, () => {
      // The branch list is hand-maintained. If someone adds a third state to the gate (an A/B variant, a V2),
      // this test would otherwise stay green while the new branch silently lacks the feature.
      const gateSrc = stripComments(readFileSync(resolve(SRC_ROOT, gateFile), 'utf8'));
      const lazyMounts = [...gateSrc.matchAll(/lazy\(\s*\(\)\s*=>\s*import\(['"]([^'"]+)['"]\)/g)].map((m) => m[1]);
      expect(
        lazyMounts.length,
        `${gateFile} lazy-loads ${lazyMounts.length} branch(es) (${lazyMounts.join(', ')}) but GATE_BRANCHES ` +
          `lists ${branches.length}. Add the new branch to GATE_BRANCHES and mount ${feature} in it.`,
      ).toBeLessThanOrEqual(branches.length - 1); // -1 because the flag-OFF branch arrives as `children`, not a lazy import
    });
  }

  it('PrismCapture exposes a stable feature marker in BOTH live and pending states', () => {
    const src = readFileSync(resolve(SRC_ROOT, 'components/marketing/PrismCapture/PrismCapture.tsx'), 'utf8');
    // Two occurrences: the live Band and the CLS placeholder Band — so an E2E selector cannot race flag resolution.
    const marks = src.match(/data-feature="prism-capture"/g) || [];
    expect(marks.length, 'marker must be on the live band AND the resolving placeholder').toBeGreaterThanOrEqual(2);
  });
});
