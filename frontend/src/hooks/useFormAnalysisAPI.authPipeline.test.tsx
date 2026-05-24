import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../..');

const readSource = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('useFormAnalysisAPI auth pipeline', () => {
  it('is consumed by mounted form assessment surfaces backed by form-analysis APIs', () => {
    const layoutSource = readSource('frontend/src/components/DashBoard/UniversalDashboardLayout.tsx');
    const uploadSource = readSource('frontend/src/components/FormAnalysis/UploadTab.tsx');
    const historySource = readSource('frontend/src/components/FormAnalysis/HistoryTab.tsx');
    const profileSource = readSource('frontend/src/components/FormAnalysis/MovementProfilePage.tsx');
    const coreRoutesSource = readSource('backend/core/routes.mjs');
    const formRoutesSource = readSource('backend/routes/formAnalysisRoutes.mjs');

    expect(layoutSource).toContain("const TrainerAssessmentsPage = React.lazy(() => import('./Pages/trainer-dashboard/TrainerAssessmentsPage'))");
    expect(layoutSource).toContain("{ path: '/assessments', component: TrainerAssessmentsPage");
    expect(uploadSource).toContain("import { useFormAnalysisAPI } from '../../hooks/useFormAnalysisAPI'");
    expect(historySource).toContain("import { useFormAnalysisAPI } from '../../hooks/useFormAnalysisAPI'");
    expect(profileSource).toContain("import { useFormAnalysisAPI } from '../../hooks/useFormAnalysisAPI'");
    expect(coreRoutesSource).toContain("app.use('/api/form-analysis', formAnalysisRoutes)");
    expect(formRoutesSource).toContain("router.post('/upload'");
    expect(formRoutesSource).toContain("router.get('/history'");
    expect(formRoutesSource).toContain("router.get('/profile'");
    expect(formRoutesSource).toContain("router.get('/profile/:userId'");
    expect(formRoutesSource).toContain("router.get('/:id'");
    expect(formRoutesSource).toContain("router.post('/:id/reprocess'");
  });

  it('keeps form analysis requests on the shared API service', () => {
    const hookSource = readSource('frontend/src/hooks/useFormAnalysisAPI.ts');

    expect(hookSource).toContain("apiService.post('/api/form-analysis/upload', formData");
    expect(hookSource).toContain('apiService.get(`/api/form-analysis/history?${params}`)');
    expect(hookSource).toContain('apiService.get(`/api/form-analysis/${id}`)');
    expect(hookSource).toContain('apiService.post(`/api/form-analysis/${id}/reprocess`)');
    expect(hookSource).toContain('apiService.get(url)');

    expect(hookSource).not.toContain("localStorage.getItem('token')");
    expect(hookSource).not.toContain('getAuthHeaders');
    expect(hookSource).not.toContain('fetch(');
    expect(hookSource).not.toContain("'Authorization'");
  });
});
