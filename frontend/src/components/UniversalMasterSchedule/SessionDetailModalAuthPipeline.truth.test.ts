import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../../..');

const readSource = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('SessionDetailModal auth pipeline', () => {
  it('covers the mounted schedule detail modal and unified session action APIs', () => {
    const scheduleSource = readSource('frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx');
    const modalsSource = readSource('frontend/src/components/UniversalMasterSchedule/components/ScheduleModals.tsx');
    const coreRoutesSource = readSource('backend/core/routes.mjs');
    const sessionsRoutesSource = readSource('backend/routes/sessions.mjs');

    expect(scheduleSource).toContain("import ScheduleModals from './components/ScheduleModals'");
    expect(scheduleSource).toContain('<ScheduleModals');
    expect(scheduleSource).toContain('showDetailDialog={showDetailDialog}');
    expect(scheduleSource).toContain('detailSession={detailSession}');
    expect(modalsSource).toContain("import SessionDetailModal from '../SessionDetailModal'");
    expect(modalsSource).toContain('<SessionDetailModal');
    expect(modalsSource).toContain('session={detailSession}');
    expect(modalsSource).toContain('open={showDetailDialog}');

    expect(coreRoutesSource).toContain("app.use('/api/sessions', sessionsRoutes)");
    expect(sessionsRoutesSource).toContain('router.patch("/:id/complete"');
    expect(sessionsRoutesSource).toContain('router.patch("/:id/attendance"');
    expect(sessionsRoutesSource).toContain('router.delete("/recurring/:groupId"');
    expect(sessionsRoutesSource).toContain('router.post("/:id/feedback"');
    expect(sessionsRoutesSource).toContain('router.get("/:id/cancel-warning"');
    expect(sessionsRoutesSource).toContain('router.patch("/:id/cancel"');
    expect(sessionsRoutesSource).toContain('router.get("/:id/client-package-price"');
  });

  it('keeps session detail actions on the shared API service', () => {
    const modalSource = readSource('frontend/src/components/UniversalMasterSchedule/SessionDetailModal.tsx');

    expect(modalSource).toContain("import apiService from '../../services/api.service';");
    expect(modalSource).toContain("apiService.get(`/api/sessions/${session.id}/client-package-price`)");
    expect(modalSource).toContain("apiService.patch(`/api/sessions/${session.id}/complete`, payload)");
    expect(modalSource).toContain("apiService.patch(`/api/sessions/${session.id}/attendance`, payload)");
    expect(modalSource).toContain("apiService.delete(`/api/sessions/recurring/${session.recurringGroupId}`)");
    expect(modalSource).toContain("apiService.post(`/api/sessions/${session.id}/feedback`");
    expect(modalSource).toContain("apiService.get(`/api/sessions/${session.id}/cancel-warning`)");
    expect(modalSource).toContain("apiService.patch(`/api/sessions/${session.id}/cancel`, payload)");

    expect(modalSource).not.toContain("localStorage.getItem('token')");
    expect(modalSource).not.toContain('Authorization');
    expect(modalSource).not.toContain('fetch(');
  });
});
