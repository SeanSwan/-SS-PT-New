import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(__dirname, '../../../..');

const readSource = (relativePath: string) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

const supportModalPaths = [
  'frontend/src/components/UniversalMasterSchedule/RecurringSessionModal.tsx',
  'frontend/src/components/UniversalMasterSchedule/RecurringSeriesModal.tsx',
  'frontend/src/components/UniversalMasterSchedule/BlockedTimeModal.tsx',
  'frontend/src/components/UniversalMasterSchedule/NotificationPreferencesModal.tsx',
  'frontend/src/components/UniversalMasterSchedule/ClientRecurringBookingModal.tsx',
];

describe('schedule support modals auth pipeline', () => {
  it('covers mounted schedule support modals and their backend routes', () => {
    const scheduleSource = readSource('frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx');
    const modalsSource = readSource('frontend/src/components/UniversalMasterSchedule/components/ScheduleModals.tsx');
    const coreRoutesSource = readSource('backend/core/routes.mjs');
    const apiRoutesSource = readSource('backend/routes/api.mjs');
    const sessionsRoutesSource = readSource('backend/routes/sessions.mjs');
    const legacySessionRoutesSource = readSource('backend/routes/sessionRoutes.mjs');
    const profileRoutesSource = readSource('backend/routes/profileRoutes.mjs');

    expect(scheduleSource).toContain('<ScheduleModals');
    expect(modalsSource).toContain("import RecurringSessionModal from '../RecurringSessionModal'");
    expect(modalsSource).toContain("import RecurringSeriesModal from '../RecurringSeriesModal'");
    expect(modalsSource).toContain("import BlockedTimeModal from '../BlockedTimeModal'");
    expect(modalsSource).toContain("import NotificationPreferencesModal from '../NotificationPreferencesModal'");
    expect(modalsSource).toContain("import ClientRecurringBookingModal from '../ClientRecurringBookingModal'");
    expect(modalsSource).toContain('<RecurringSessionModal');
    expect(modalsSource).toContain('<RecurringSeriesModal');
    expect(modalsSource).toContain('<BlockedTimeModal');
    expect(modalsSource).toContain('<NotificationPreferencesModal');
    expect(modalsSource).toContain('<ClientRecurringBookingModal');

    expect(coreRoutesSource).toContain("app.use('/api/sessions', sessionsRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/profile', profileRoutes)");
    expect(sessionsRoutesSource).toContain('router.get("/users/trainers"');
    expect(sessionsRoutesSource).toContain('router.post("/recurring"');
    expect(sessionsRoutesSource).toContain('router.put("/recurring/:groupId"');
    expect(sessionsRoutesSource).toContain('router.delete("/recurring/:groupId"');
    expect(sessionsRoutesSource).toContain('router.post("/block"');
    expect(profileRoutesSource).toContain("router.get('/', protect, getUserProfile)");
    expect(profileRoutesSource).toContain("router.put('/', protect, updateUserProfile)");

    expect(coreRoutesSource).toContain("app.use('/api', apiRoutes)");
    expect(apiRoutesSource).toContain("router.use('/sessions', sessionRoutes)");
    expect(legacySessionRoutesSource).toContain('router.post("/book-recurring"');
  });

  it('keeps recurring, blocked-time, notification, and client booking modals on apiService', () => {
    const sources = Object.fromEntries(
      supportModalPaths.map((path) => [path, readSource(path)])
    );
    const combinedSource = Object.values(sources).join('\n');

    for (const source of Object.values(sources)) {
      expect(source).toContain("import apiService from '../../services/api.service';");
    }

    expect(sources['frontend/src/components/UniversalMasterSchedule/RecurringSessionModal.tsx'])
      .toContain("apiService.get('/api/sessions/users/trainers')");
    expect(sources['frontend/src/components/UniversalMasterSchedule/RecurringSessionModal.tsx'])
      .toContain("apiService.post('/api/sessions/recurring', payload)");

    expect(sources['frontend/src/components/UniversalMasterSchedule/RecurringSeriesModal.tsx'])
      .toContain("apiService.get('/api/sessions/users/trainers')");
    expect(sources['frontend/src/components/UniversalMasterSchedule/RecurringSeriesModal.tsx'])
      .toContain("apiService.put(`/api/sessions/recurring/${groupId}`, payload)");
    expect(sources['frontend/src/components/UniversalMasterSchedule/RecurringSeriesModal.tsx'])
      .toContain("apiService.delete(`/api/sessions/recurring/${groupId}${query}`)");

    expect(sources['frontend/src/components/UniversalMasterSchedule/BlockedTimeModal.tsx'])
      .toContain("apiService.get('/api/sessions/users/trainers')");
    expect(sources['frontend/src/components/UniversalMasterSchedule/BlockedTimeModal.tsx'])
      .toContain("apiService.post('/api/sessions/block', payload)");

    expect(sources['frontend/src/components/UniversalMasterSchedule/NotificationPreferencesModal.tsx'])
      .toContain("apiService.get('/api/profile')");
    expect(sources['frontend/src/components/UniversalMasterSchedule/NotificationPreferencesModal.tsx'])
      .toContain("apiService.put('/api/profile', {");

    expect(sources['frontend/src/components/UniversalMasterSchedule/ClientRecurringBookingModal.tsx'])
      .toContain("apiService.post('/api/sessions/book-recurring', {");

    expect(combinedSource).not.toContain("localStorage.getItem('token')");
    expect(combinedSource).not.toContain('Authorization');
    expect(combinedSource).not.toContain('fetch(');
  });
});
