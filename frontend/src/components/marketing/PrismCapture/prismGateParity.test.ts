/**
 * Acquisition-mount contract after design de-gating.
 *
 * PrismCapture is the public lead-capture feature. It must remain mounted in the original HomePage.V4 while
 * the canonical router mounts that home directly; a future design concept belongs in Design Studio until a
 * normal commit replaces the route.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function resolveSrcRoot(): string {
  for (const candidate of [resolve(process.cwd(), 'src'), resolve(process.cwd(), 'frontend/src')]) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`Cannot locate frontend/src from cwd=${process.cwd()}`);
}

const SRC_ROOT = resolveSrcRoot();

function stripComments(src: string): string {
  return src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

describe('PrismCapture canonical Home mount', () => {
  it('is imported and rendered by HomePage.V4', () => {
    const home = stripComments(
      readFileSync(resolve(SRC_ROOT, 'pages/HomePage/components/HomePage.V4.tsx'), 'utf8'),
    );
    expect(home).toMatch(/import\s*\{[^}]*\bPrismCapture\b[^}]*\}/);
    expect(home).toMatch(/<PrismCapture(\s|\/|>)/);
    expect(/(false|null|undefined)\s*&&\s*<PrismCapture\b/.test(home)).toBe(false);
  });

  it('is reached through the direct original Home route with no HomeGate', () => {
    const routes = stripComments(readFileSync(resolve(SRC_ROOT, 'routes/main-routes.tsx'), 'utf8'));
    expect(routes).toContain("() => import('../pages/HomePage/components/HomePage.V4')");
    expect(routes).toMatch(/index:\s*true,[\s\S]*?<HomePage\s*\/>/);
    expect(routes).not.toContain('HomeGate');
  });

  it('exposes a stable marker in both live and resolving states', () => {
    const src = readFileSync(resolve(SRC_ROOT, 'components/marketing/PrismCapture/PrismCapture.tsx'), 'utf8');
    const marks = src.match(/data-feature="prism-capture"/g) || [];
    expect(marks.length).toBeGreaterThanOrEqual(2);
  });
});
