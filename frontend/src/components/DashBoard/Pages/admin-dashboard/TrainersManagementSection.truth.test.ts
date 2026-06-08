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
const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const lineCount = (text: string) => text.split(/\r?\n/).length;

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

  it('gates legacy trainer deactivation behind a retention warning confirmation', () => {
    const sectionSource = readSource('src/components/DashBoard/Pages/admin-dashboard/TrainersManagementSection.sections.tsx');
    const stylesSource = readSource('src/components/DashBoard/Pages/admin-dashboard/TrainersManagementSection.styles.ts');

    expect(source).toContain('pendingDeactivationTrainer');
    expect(source).toContain('handleRequestDeactivateTrainer');
    expect(source).toContain('handleConfirmDeactivateTrainer');
    expect(source).toContain('TrainerDeactivationConfirmDialog');
    expect(source).not.toContain('window.confirm');

    expect(sectionSource).toContain('TrainerDeactivationConfirmDialog');
    expect(sectionSource).toContain('role="dialog"');
    expect(sectionSource).toContain('aria-modal="true"');
    expect(sectionSource).toContain('Deactivate trainer');
    expect(sectionSource).toContain('This soft-deactivates the trainer account and retains account records for 6 months.');
    expect(stylesSource).toContain('ConfirmOverlay');
    expect(stylesSource).toContain('ConfirmButtonRow');
  });

  it('keeps the legacy trainer route split into bounded source files', () => {
    const component = readSource('src/components/DashBoard/Pages/admin-dashboard/TrainersManagementSection.tsx');
    const sections = readSource('src/components/DashBoard/Pages/admin-dashboard/TrainersManagementSection.sections.tsx');
    const styles = readSource('src/components/DashBoard/Pages/admin-dashboard/TrainersManagementSection.styles.ts');
    const cardStyles = readSource('src/components/DashBoard/Pages/admin-dashboard/TrainersManagementSection.cardStyles.ts');
    const stateStyles = readSource('src/components/DashBoard/Pages/admin-dashboard/TrainersManagementSection.stateStyles.ts');
    const types = readSource('src/components/DashBoard/Pages/admin-dashboard/TrainersManagementSection.types.ts');
    const utils = readSource('src/components/DashBoard/Pages/admin-dashboard/TrainersManagementSection.utils.ts');

    expect(component).toContain("from './TrainersManagementSection.sections'");
    expect(component).toContain("from './TrainersManagementSection.styles'");
    expect(component).toContain("from './TrainersManagementSection.types'");
    expect(component).toContain("from './TrainersManagementSection.utils'");
    expect(component).not.toContain("from 'styled-components'");

    expect(sections).toContain("from './TrainersManagementSection.styles'");
    expect(styles).toContain("from 'styled-components'");
    expect(cardStyles).toContain("from 'styled-components'");
    expect(stateStyles).toContain("from 'styled-components'");

    [component, sections, styles, cardStyles, stateStyles, types, utils].forEach((fileSource) => {
      expect(lineCount(fileSource)).toBeLessThanOrEqual(300);
    });
  });
});
