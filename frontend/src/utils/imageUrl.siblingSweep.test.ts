/**
 * Source-text regression — sibling sweep on 6 surfaces previously listed
 * in the user-dashboard debate file as still using raw `url(${...})`
 * interpolation. Closes the deferred follow-up from PR #4 / PR #5.
 *
 * Each surface must:
 *   - Import `sanitizeImageUrl` and `cssUrlValue` from utils/imageUrl
 *   - Contain NO bare `url(${...})` interpolation (only `url(${cssUrlValue(...)})`)
 *   - The variable interpolated MUST pass through sanitizeImageUrl first
 *
 * This is a static source-text test (no rendering) — it locks the contract
 * so a future edit can't reintroduce the vulnerability without flipping a
 * red test.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SURFACES: Array<{ label: string; path: string }> = [
  {
    label: 'PhotoGalleryCard.styles.ts (UserDashboard photo grid tiles)',
    path: '../components/UserDashboard/components/PhotoGalleryCard.styles.ts',
  },
  {
    label: 'ProfileStyles.ts (UserDashboard banner + avatar)',
    path: '../components/UserDashboard/styles/ProfileStyles.ts',
  },
  {
    label: 'ConversationList.tsx (Messaging avatar)',
    path: '../components/Messaging/ConversationList.tsx',
  },
  {
    label: 'TestimonialSlider.tsx (homepage testimonial photo)',
    path: '../components/TestimonialSlider/TestimonialSlider.tsx',
  },
  {
    label: 'VerticalReels.tsx (reel image + avatar)',
    path: '../components/Social/Reels/VerticalReels.tsx',
  },
  {
    label: 'HomeStyles.tsx (parallax bg)',
    path: '../pages/HomePage/components/shared/HomeStyles.tsx',
  },
];

const readSource = (relativePath: string): string => {
  const abs = resolve(__dirname, relativePath);
  return readFileSync(abs, 'utf8');
};

describe('imageUrl sibling sweep — each surface uses sanitizeImageUrl + cssUrlValue', () => {
  SURFACES.forEach(({ label, path }) => {
    describe(label, () => {
      const src = readSource(path);

      it('imports sanitizeImageUrl and cssUrlValue from utils/imageUrl', () => {
        expect(src).toMatch(/import\s*\{[^}]*\bsanitizeImageUrl\b/);
        expect(src).toMatch(/import\s*\{[^}]*\bcssUrlValue\b/);
        expect(src).toMatch(/from\s+['"][./]+utils\/imageUrl['"]/);
      });

      it('has NO bare `url(${...})` interpolation — every url() goes through cssUrlValue', () => {
        // Match url(${...}) where the inner expression does NOT contain cssUrlValue
        // We strip out `url(${cssUrlValue(...)})` first, then scan for remaining url(${...})
        const stripped = src.replace(/url\(\$\{cssUrlValue\([^)]*\)[^)]*\}\)/g, 'url(SAFE)');
        const remaining = stripped.match(/url\(\$\{[^}]+\}\)/g) || [];
        expect(
          remaining,
          `Bare url(\${...}) interpolations remaining in ${label}: ${JSON.stringify(remaining)}`,
        ).toHaveLength(0);
      });

      it('ties every cssUrlValue(...) argument to a variable assigned from sanitizeImageUrl', () => {
        // Codex round-1 MEDIUM: the "sanitizeImageUrl appears somewhere" check
        // can be bypassed by calling sanitizeImageUrl with a dummy value and
        // then passing the raw prop into cssUrlValue. This stronger contract
        // collects every `const NAME = ...sanitizeImageUrl(...)` LHS and then
        // requires every `cssUrlValue(X)` argument to be one of those names.
        const sanitizedVars = new Set<string>();
        const sanitizedRegex = /\bconst\s+([\w$]+)\s*=\s*[^;]*?\bsanitizeImageUrl\s*\(/g;
        let m: RegExpExecArray | null;
        while ((m = sanitizedRegex.exec(src)) !== null) {
          sanitizedVars.add(m[1]);
        }

        const cssArgRegex = /\bcssUrlValue\s*\(\s*([\w$]+)\s*\)/g;
        const cssArgs: string[] = [];
        while ((m = cssArgRegex.exec(src)) !== null) {
          cssArgs.push(m[1]);
        }

        // The surface must invoke cssUrlValue at least once (otherwise the
        // import is dead and the file isn't actually using the helper).
        expect(cssArgs.length, `${label} imports cssUrlValue but never calls it`).toBeGreaterThan(0);

        const violations = cssArgs.filter((arg) => !sanitizedVars.has(arg));
        expect(
          violations,
          `${label}: cssUrlValue called with non-sanitized argument(s) ${JSON.stringify(violations)}. Sanitized vars in file: ${JSON.stringify([...sanitizedVars])}`,
        ).toEqual([]);
      });
    });
  });

  it('all 6 named surfaces still exist at their documented paths', () => {
    expect(SURFACES.length).toBe(6);
  });
});
