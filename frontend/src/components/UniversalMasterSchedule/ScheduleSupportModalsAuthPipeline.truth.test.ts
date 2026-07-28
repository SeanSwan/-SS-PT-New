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
    const modalStackSource = readSource('frontend/src/components/UniversalMasterSchedule/components/ScheduleConnectedModals.tsx');
    const coreRoutesSource = readSource('backend/core/routes.mjs');
    const apiRoutesSource = readSource('backend/routes/api.mjs');
    const sessionsRoutesSource = readSource('backend/routes/sessions.mjs');
    const legacySessionRoutesSource = readSource('backend/routes/sessionRoutes.mjs');
    const profileRoutesSource = readSource('backend/routes/profileRoutes.mjs');
    const notificationRoutesSource = readSource('backend/routes/notificationRoutes.mjs');

    expect(scheduleSource).toContain('<ScheduleModals');
    expect(modalStackSource).toContain("import RecurringSessionModal from '../RecurringSessionModal'");
    expect(modalStackSource).toContain("import RecurringSeriesModal from '../RecurringSeriesModal'");
    expect(modalStackSource).toContain("import BlockedTimeModal from '../BlockedTimeModal'");
    expect(modalStackSource).toContain("import NotificationPreferencesModal from '../NotificationPreferencesModal'");
    expect(modalStackSource).toContain("import ClientRecurringBookingModal from '../ClientRecurringBookingModal'");
    expect(modalStackSource).toContain('<RecurringSessionModal');
    expect(modalStackSource).toContain('<RecurringSeriesModal');
    expect(modalStackSource).toContain('<BlockedTimeModal');
    expect(modalStackSource).toContain('<NotificationPreferencesModal');
    expect(modalStackSource).toContain('<ClientRecurringBookingModal');

    expect(coreRoutesSource).toContain("app.use('/api/sessions', sessionsRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/profile', profileRoutes)");
    expect(coreRoutesSource).toContain("app.use('/api/notifications', notificationsApiRoutes)");
    expect(sessionsRoutesSource).toContain('router.get("/users/trainers"');
    expect(sessionsRoutesSource).toContain('router.post("/recurring"');
    expect(sessionsRoutesSource).toContain('router.put("/recurring/:groupId"');
    expect(sessionsRoutesSource).toContain('router.delete("/recurring/:groupId"');
    expect(sessionsRoutesSource).toContain('router.post("/block"');
    expect(profileRoutesSource).toContain("router.get('/', protect, getUserProfile)");
    expect(profileRoutesSource).toContain("router.put('/', protect, updateUserProfile)");
    expect(notificationRoutesSource).toContain("router.get('/preferences', protect, notificationReadLimiter, getNotificationPreferences)");
    expect(notificationRoutesSource).toContain("router.put('/preferences', protect, notificationPreferencesLimiter, updateNotificationPreferences)");

    expect(coreRoutesSource).toContain("app.use('/api', apiRoutes)");
    expect(apiRoutesSource).toContain("router.use('/sessions', sessionRoutes)");
    expect(legacySessionRoutesSource).toContain('router.post("/book-recurring"');
  });

  it('keeps recurring, blocked-time, notification, and client booking modals on apiService', () => {
    const sources = Object.fromEntries(
      supportModalPaths.map((path) => [path, readSource(path)])
    );
    const combinedSource = Object.values(sources).join('\n');
    const notificationPreferencesSource = sources['frontend/src/components/UniversalMasterSchedule/NotificationPreferencesModal.tsx'];

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

    expect(notificationPreferencesSource).toContain("apiService.get('/api/notifications/preferences')");
    expect(notificationPreferencesSource).toContain("apiService.put('/api/notifications/preferences', {");
    expect(notificationPreferencesSource).not.toContain("apiService.get('/api/profile')");
    expect(notificationPreferencesSource).not.toContain("apiService.put('/api/profile'");

    expect(sources['frontend/src/components/UniversalMasterSchedule/ClientRecurringBookingModal.tsx'])
      .toContain("apiService.post('/api/sessions/book-recurring', {");

    expect(combinedSource).not.toContain("localStorage.getItem('token')");
    expect(combinedSource).not.toContain('Authorization');
    expect(combinedSource).not.toContain('fetch(');
  });
});
