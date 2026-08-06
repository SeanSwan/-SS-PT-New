import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const routeSource = read('src/routes/main-routes.tsx');
const pageSource = read('src/pages/PublicWaiverPage.V3.tsx');
// SWA-140: the page is composition now; the service calls moved into the hook
// that owns waiver state. The pipeline this test guards is unchanged — it just
// runs one layer down.
const hookSource = read('src/pages/waiver/usePublicWaiverForm.ts');
const serviceSource = stripComments(read('src/services/publicWaiverService.ts'));
const coreRoutesSource = read('../backend/core/routes.mjs');
const waiverRoutesSource = read('../backend/routes/publicWaiverRoutes.mjs');

describe('public waiver auth pipeline', () => {
  it('is mounted from the active public waiver page and backend public waiver route', () => {
    expect(routeSource).toContain("() => import('../pages/PublicWaiverPage.V3')");
    expect(routeSource).toContain("path: 'waiver'");
    expect(pageSource).toContain("from './waiver/usePublicWaiverForm'");
    expect(hookSource).toContain("} from '../../services/publicWaiverService'");
    expect(hookSource).toContain('fetchCurrentWaiverVersions()');
    expect(hookSource).toContain('await submitPublicWaiver({');

    expect(coreRoutesSource).toContain("app.use('/api/public/waivers', publicWaiverRoutes)");
    // SWA-140: this endpoint was public with no throttle at all.
    expect(waiverRoutesSource).toContain(
      "router.get('/versions/current', waiverVersionsLimiter, getCurrentWaiverVersions)",
    );
    expect(waiverRoutesSource).toContain("router.post('/submit', waiverLimiter, optionalAuth, submitPublicWaiver)");
  });

  it('no longer mounts the retired V2 waiver page as a fallback legal surface', () => {
    // V2 had drifted into a weaker flow (no guardian enforcement, no
    // attestation), so serving it on a chunk failure could collect an
    // unenforceable waiver from a minor.
    expect(routeSource).not.toContain("import('../pages/PublicWaiverPage.V2')");
  });

  it('uses the central token manager for optional logged-in waiver linking', () => {
    expect(serviceSource).toContain("import { ProductionTokenManager } from './api.service'");
    expect(serviceSource).toContain('const token = ProductionTokenManager.getToken()');
    expect(serviceSource).toContain("baseURL: `${API_BASE_URL}/api/public/waivers`");
    expect(serviceSource).not.toContain("localStorage.getItem('token')");
    expect(serviceSource).not.toContain('localStorage.getItem("token")');
  });
});
