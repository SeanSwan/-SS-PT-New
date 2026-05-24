import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const routeSource = read('src/routes/main-routes.tsx');
const pageSource = read('src/pages/PublicWaiverPage.V3.tsx');
const serviceSource = stripComments(read('src/services/publicWaiverService.ts'));
const coreRoutesSource = read('../backend/core/routes.mjs');
const waiverRoutesSource = read('../backend/routes/publicWaiverRoutes.mjs');

describe('public waiver auth pipeline', () => {
  it('is mounted from the active public waiver page and backend public waiver route', () => {
    expect(routeSource).toContain("() => import('../pages/PublicWaiverPage.V3')");
    expect(routeSource).toContain("path: 'waiver'");
    expect(pageSource).toContain("} from '../services/publicWaiverService'");
    expect(pageSource).toContain('fetchCurrentWaiverVersions()');
    expect(pageSource).toContain('await submitPublicWaiver({');

    expect(coreRoutesSource).toContain("app.use('/api/public/waivers', publicWaiverRoutes)");
    expect(waiverRoutesSource).toContain("router.get('/versions/current', getCurrentWaiverVersions)");
    expect(waiverRoutesSource).toContain("router.post('/submit', waiverLimiter, optionalAuth, submitPublicWaiver)");
  });

  it('uses the central token manager for optional logged-in waiver linking', () => {
    expect(serviceSource).toContain("import { ProductionTokenManager } from './api.service'");
    expect(serviceSource).toContain('const token = ProductionTokenManager.getToken()');
    expect(serviceSource).toContain("baseURL: `${API_BASE_URL}/api/public/waivers`");
    expect(serviceSource).not.toContain("localStorage.getItem('token')");
    expect(serviceSource).not.toContain('localStorage.getItem("token")');
  });
});
