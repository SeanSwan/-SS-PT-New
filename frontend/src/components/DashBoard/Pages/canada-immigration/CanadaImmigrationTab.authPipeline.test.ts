import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const layoutSource = read('src/components/DashBoard/UniversalDashboardLayout.tsx');
const pageSource = stripComments(read('src/components/DashBoard/Pages/canada-immigration/CanadaImmigrationTab.tsx'));
const backendMountSource = read('../backend/core/routes.mjs');
const immigrationRoutesSource = read('../backend/routes/immigrationRoutes.mjs');

describe('CanadaImmigrationTab auth pipeline', () => {
  it('is the mounted dashboard immigration surface backed by protected admin routes', () => {
    expect(layoutSource).toContain("const CanadaImmigrationTab = React.lazy(() => import('./Pages/canada-immigration/CanadaImmigrationTab'))");
    expect(layoutSource).toContain("{ path: '/immigration', component: CanadaImmigrationTab");
    expect(backendMountSource).toContain("app.use('/api/immigration', immigrationRoutes)");
    expect(immigrationRoutesSource).toContain('router.use(protect)');
    expect(immigrationRoutesSource).toContain("req.user?.role !== 'admin'");
    expect(immigrationRoutesSource).toContain("router.get('/tasks'");
    expect(immigrationRoutesSource).toContain("router.put('/tasks/:id'");
    expect(immigrationRoutesSource).toContain("router.get('/documents'");
    expect(immigrationRoutesSource).toContain("router.put('/documents/:id'");
    expect(immigrationRoutesSource).toContain("router.get('/study'");
    expect(immigrationRoutesSource).toContain("router.post('/study'");
    expect(immigrationRoutesSource).toContain("router.post('/seed'");
    expect(immigrationRoutesSource).toContain("'ielts', 'french', 'ai_cert', 'other'");
  });

  it('uses shared apiService transport and backend-aligned mutation verbs', () => {
    expect(pageSource).toContain("import apiService from '../../../../services/api.service'");
    expect(pageSource).toContain("apiService.get<ApiEnvelope<any>>('/api/immigration/tasks'");
    expect(pageSource).toContain("apiService.get<ApiEnvelope<any>>('/api/immigration/documents'");
    expect(pageSource).toContain("apiService.get<ApiEnvelope<any>>('/api/immigration/study'");
    expect(pageSource).toContain("apiService.post('/api/immigration/seed'");
    expect(pageSource).toContain('apiService.put<{ success?: boolean; data?: any }>(');
    expect(pageSource).toContain('`/api/immigration/tasks/${id}`');
    expect(pageSource).toContain('`/api/immigration/documents/${id}`');
    expect(pageSource).toContain("'/api/immigration/study'");
    expect(pageSource).toContain('session_date: new Date().toISOString().slice(0, 10)');
    expect(pageSource).not.toMatch(/\bfetch\s*\(/);
    expect(pageSource).not.toContain("localStorage.getItem('token')");
    expect(pageSource).not.toMatch(/Authorization\s*:/);
    expect(pageSource).not.toContain("apiService.patch(`/api/immigration/tasks/${id}`");
    expect(pageSource).not.toContain("apiService.patch(`/api/immigration/documents/${id}`");
  });
});
