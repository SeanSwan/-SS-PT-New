import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/TrainersManagementSection.tsx'),
  'utf8'
);

const routeSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/UniversalDashboardLayout.tsx'),
  'utf8'
);

describe('TrainersManagementSection legacy route truth contract', () => {
  it('is mounted only as the legacy admin trainer route', () => {
    expect(routeSource).toContain("React.lazy(() => import('./Pages/admin-dashboard/TrainersManagementSection'))");
    expect(routeSource).toContain("path: '/trainer-management-legacy'");
  });

  it('does not fall back to invented trainer records when the API fails', () => {
    expect(source).not.toContain('const setMockData');
    expect(source).not.toContain('const mockTrainers');
    expect(source).not.toContain('sarah.wilson@example.com');
    expect(source).not.toContain('mike.johnson@example.com');
    expect(source).not.toContain('emma.davis@example.com');
    expect(source).toContain("apiService.get('/api/auth/users/trainers?includeAdmin=true&limit=100')");
    expect(source).toContain('setLoadError(');
    expect(source).toContain('calculateStats([])');
  });

  it('keeps trainer reads and mutations on the shared API service', () => {
    expect(source).toContain("import apiService from '../../../../services/api.service';");
    expect(source).toContain("apiService.get('/api/auth/users/trainers?includeAdmin=true&limit=100')");
    expect(source).toContain("apiService.put(`/api/auth/user/${trainerId}`, {})");
    expect(source).toContain("apiService.delete(`/api/auth/user/${trainerId}`)");
    expect(source).not.toContain("localStorage.getItem('token')");
    expect(source).not.toContain('Authorization');
    expect(source).not.toContain('fetch(');
  });
});
