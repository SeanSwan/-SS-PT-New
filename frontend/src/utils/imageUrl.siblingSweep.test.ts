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
  // ── Wave 1 (PR #6): the 6 originally-named debate-file surfaces ────────
  { label: 'PhotoGalleryCard.styles.ts', path: '../components/UserDashboard/components/PhotoGalleryCard.styles.ts' },
  { label: 'ConversationList.tsx', path: '../components/Messaging/ConversationList.tsx' },
  { label: 'TestimonialSlider.tsx', path: '../components/TestimonialSlider/TestimonialSlider.tsx' },
  { label: 'VerticalReels.styles.ts', path: '../components/Social/Reels/VerticalReels.styles.ts' },
  { label: 'HomeStyles.tsx', path: '../pages/HomePage/components/shared/HomeStyles.tsx' },
  // ── Wave 2 (this PR): Phase-4 wider sweep ──────────────────────────────
  // Social cluster
  { label: 'FriendSuggestions.tsx', path: '../components/Social/Friends/FriendSuggestions.tsx' },
  { label: 'FriendsList.tsx', path: '../components/Social/Friends/FriendsList.tsx' },
  { label: 'FriendRequests.tsx', path: '../components/Social/Friends/FriendRequests.tsx' },
  { label: 'ExploreStyles.ts', path: '../components/Social/Explore/ExploreStyles.ts' },
  { label: 'PostCardStyles.ts', path: '../components/Social/Feed/styles/PostCardStyles.ts' },
  { label: 'SidebarStyles.ts', path: '../components/Social/Feed/styles/SidebarStyles.ts' },
  { label: 'UserProfilePage.tsx', path: '../pages/Social/UserProfilePage.tsx' },
  // UserDashboard cluster
  { label: 'CreativeGalleryCard.styles.ts', path: '../components/UserDashboard/components/CreativeGalleryCard.styles.ts' },
  // Admin Dashboard cluster
  { label: 'ClientTrainerAssignments.tsx', path: '../components/Admin/ClientTrainerAssignments.tsx' },
  { label: 'WorkoutClientDrawer.tsx', path: '../components/DashBoard/workspaces/WorkoutClientDrawer.tsx' },
  { label: 'CommunicationCenter.tsx', path: '../components/DashBoard/Pages/admin-clients/components/CommunicationCenter.tsx' },
  { label: 'EnhancedTrainerDataManagement.tsx', path: '../components/DashBoard/Pages/admin-trainers/EnhancedTrainerDataManagement.tsx' },
  { label: 'admin-packages-view.formStyles.ts', path: '../components/DashBoard/Pages/admin-packages/admin-packages-view.formStyles.ts' },
  { label: 'FeatureAccessPage.tsx', path: '../components/DashBoard/Pages/admin-feature-access/FeatureAccessPage.tsx' },
  { label: 'admin-client-progress-view.V2.tsx', path: '../components/DashBoard/Pages/admin-client-progress/admin-client-progress-view.V2.tsx' },
  { label: 'ClientComplianceDashboard.styles.ts', path: '../components/DashBoard/Pages/admin-dashboard/components/ClientComplianceDashboard.styles.ts' },
  // Misc cluster
  { label: 'RelatedVideos.tsx', path: '../components/video/RelatedVideos.tsx' },
  { label: 'GalleryPage.tsx', path: '../pages/GalleryPage.tsx' },
  { label: 'PackageCard.tsx', path: '../pages/shop/components/PackageCard.tsx' },
  { label: 'PreviewPanel.tsx', path: '../components/Reports/PreviewPanel.tsx' },
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
        // Scope: a `const NAME = ...sanitizeImageUrl(...)` declaration on a
        // SINGLE LINE. Newlines are excluded from the in-between class so a
        // styled-component template literal's outer `const X = styled.div\`...`
        // can't span into the inner `const safe = sanitizeImageUrl(...)` and
        // wrongly capture the outer styled-component name as "sanitized."
        const sanitizedRegex = /\bconst\s+([\w$]+)\s*=\s*[^;\n]*?\bsanitizeImageUrl\s*\(/g;
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

  it('SURFACES array covers Wave 1 (6 originally-named debate surfaces) + Wave 2 (Phase-4 wider sweep)', () => {
    // Wave 1 was 6 surfaces (PR #6). Wave 2 adds the broader sweep — minimum
    // total guards against accidental array truncation in future edits.
    expect(SURFACES.length).toBeGreaterThanOrEqual(25);
  });
});
