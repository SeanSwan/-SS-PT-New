/**
 * Phase 18.C.1B.1R — Canonical route guard for AdminViewAsWrapper
 * ===============================================================
 * The failure that triggered this guard:
 *   Phase 18.C.1B.1 shipped fixes to AdminViewAsWrapper and an accompanying
 *   MemoryRouter test that passed 4/4, but the production route
 *   `/dashboard/people/view-as/:userId` was dead (UnifiedAdminRoutes parent
 *   unmounted by Phase 19). The MemoryRouter synthesized a mount that did
 *   not exist in the live tree.
 *
 * What this guard enforces:
 *   The AdminViewAsWrapper canonical mount lives in UniversalDashboardLayout
 *   .tsx — the one file definitively in the live admin route tree. A
 *   source-text scan of that file is the cheapest way to prove the route
 *   is still wired without exposing `roleConfigurations` as a public API.
 *
 * Why source-text and not runtime import:
 *   `roleConfigurations` at UniversalDashboardLayout.tsx:483 is a private
 *   const; the file's only export (default, line 959) is the component.
 *   Exporting the config just for this test would widen the public API
 *   surface unnecessarily. Source-text scanning mirrors the pattern used
 *   by frontend/src/__tests__/no-dead-people-routes.test.ts.
 *
 * Why not React.lazy factory `.toString()`:
 *   Brittle, minifier-sensitive, and indirect. Direct source-text assertion
 *   on the route OBJECT pattern is clearer and harder to bypass.
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const LAYOUT_FILE = join(
  REPO_ROOT,
  'frontend',
  'src',
  'components',
  'DashBoard',
  'UniversalDashboardLayout.tsx'
);

const EXPECTED_ROUTE = '/client-management/view-as/:userId';
const EXPECTED_COMPONENT = 'AdminViewAsWrapper';
const EXPECTED_IMPORT_PATH = './Pages/admin-clients/components/AdminViewAsWrapper';
const FORBIDDEN_LEGACY = '/dashboard/people/view-as';

describe('UniversalDashboardLayout — Phase 18.C.1B.1R canonical AdminViewAsWrapper route guard', () => {
  it('source file exists at the expected canonical path', () => {
    expect(existsSync(LAYOUT_FILE)).toBe(true);
  });

  const source = existsSync(LAYOUT_FILE) ? readFileSync(LAYOUT_FILE, 'utf-8') : '';

  it('contains the route object pattern for AdminViewAsWrapper (path key + literal, not just a stray string)', () => {
    // Escape for regex; match `path:` (with optional whitespace) immediately
    // before the quoted literal. This ensures the assertion targets a real
    // route object and not a comment or unrelated string.
    const escaped = EXPECTED_ROUTE.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
    const pattern = new RegExp(`path:\\s*['"\`]${escaped}['"\`]`);
    expect(
      pattern.test(source),
      `Missing route object pattern \`path: '${EXPECTED_ROUTE}'\` in UniversalDashboardLayout.tsx. The canonical AdminViewAsWrapper mount was added in Phase 18.C.1B.1R after Phase 19 unmounted the previous UnifiedAdminRoutes-backed route. Removing this entry without updating tests re-triggers the "production route silently dead" regression.`
    ).toBe(true);
  });

  it('the route object is wired to the AdminViewAsWrapper component (proximity check)', () => {
    const escapedRoute = EXPECTED_ROUTE.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
    const routeLiteralPattern = new RegExp(`path:\\s*['"\`]${escapedRoute}['"\`]`);
    const match = routeLiteralPattern.exec(source);
    expect(match, 'route literal not found (prerequisite for proximity check)').not.toBeNull();

    // Scan the ~300 characters surrounding the route literal for the
    // component reference. 300 chars comfortably covers a multi-field
    // route object like `{ path: '...', component: AdminViewAsWrapper, ... }`
    // without matching the whole file.
    const start = Math.max(0, (match?.index ?? 0) - 50);
    const window = source.slice(start, start + 350);
    expect(
      window.includes(EXPECTED_COMPONENT),
      `Found the route literal '${EXPECTED_ROUTE}' but the surrounding route object does not reference ${EXPECTED_COMPONENT}. The route must be wired to the correct component, not any component.`
    ).toBe(true);
  });

  it('imports AdminViewAsWrapper from the canonical module path', () => {
    // Allow either default-import or namespace forms; match the module path
    // on its own rather than a specific import shape.
    expect(
      source.includes(EXPECTED_IMPORT_PATH),
      `Missing import of ${EXPECTED_COMPONENT} from '${EXPECTED_IMPORT_PATH}'. The component must be imported so the route config can reference it.`
    ).toBe(true);
    expect(
      source.includes(EXPECTED_COMPONENT),
      `${EXPECTED_COMPONENT} is not referenced by name anywhere in UniversalDashboardLayout.tsx.`
    ).toBe(true);
  });

  it('contains no legacy /dashboard/people/view-as reference (defensive)', () => {
    expect(
      source.includes(FORBIDDEN_LEGACY),
      `Legacy literal '${FORBIDDEN_LEGACY}' detected in UniversalDashboardLayout.tsx. Phase 19 cleanup classified the /dashboard/people/* prefix as dead; the canonical admin view-as route lives under /dashboard/admin/client-management/view-as/:userId.`
    ).toBe(false);
  });
});
