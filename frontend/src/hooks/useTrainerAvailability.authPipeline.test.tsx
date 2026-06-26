import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../..');

const readSource = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('useTrainerAvailability auth pipeline', () => {
  it('is consumed by the mounted master schedule availability modals', () => {
    const dashboardRoutesSource = readSource('frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx');
    const scheduleModalStackSource = readSource('frontend/src/components/UniversalMasterSchedule/components/ScheduleConnectedModals.tsx');
    const editorSource = readSource('frontend/src/components/UniversalMasterSchedule/Availability/AvailabilityEditor.tsx');
    const overrideSource = readSource('frontend/src/components/UniversalMasterSchedule/Availability/AvailabilityOverrideModal.tsx');
    const coreRoutesSource = readSource('backend/core/routes.mjs');
    const availabilityRoutesSource = readSource('backend/routes/availability.mjs');

    expect(dashboardRoutesSource).toContain("{ path: '/master-schedule', component: UniversalSchedule");
    expect(scheduleModalStackSource).toContain("import AvailabilityEditor from '../Availability/AvailabilityEditor'");
    expect(scheduleModalStackSource).toContain("import AvailabilityOverrideModal from '../Availability/AvailabilityOverrideModal'");
    expect(editorSource).toContain("import { useTrainerAvailability, AvailabilityEntry } from '../../../hooks/useTrainerAvailability'");
    expect(overrideSource).toContain("import { useTrainerAvailability } from '../../../hooks/useTrainerAvailability'");
    expect(coreRoutesSource).toContain("app.use('/api/availability', availabilityRoutes)");
    expect(availabilityRoutesSource).toContain("router.get('/:trainerId'");
    expect(availabilityRoutesSource).toContain("router.get('/:trainerId/slots'");
    expect(availabilityRoutesSource).toContain("router.put('/:trainerId'");
    expect(availabilityRoutesSource).toContain("router.post('/:trainerId/override'");
  });

  it('keeps availability reads and mutations on the shared API service', () => {
    const hookSource = readSource('frontend/src/hooks/useTrainerAvailability.ts');

    expect(hookSource).toContain('apiService.get(`/api/availability/${trainerId}`)');
    expect(hookSource).toContain('apiService.put(`/api/availability/${trainerId}`, { schedule })');
    expect(hookSource).toContain('apiService.post(`/api/availability/${trainerId}/override`, override)');
    expect(hookSource).toContain('apiService.get(`/api/availability/${trainerId}/slots?date=${dateStr}&duration=${duration}`)');

    expect(hookSource).not.toContain("localStorage.getItem('token')");
    expect(hookSource).not.toContain('getAuthHeaders');
    expect(hookSource).not.toContain('fetch(');
    expect(hookSource).not.toContain("'Authorization'");
  });
});
