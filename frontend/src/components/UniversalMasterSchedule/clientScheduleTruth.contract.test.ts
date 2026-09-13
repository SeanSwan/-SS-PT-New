/**
 * Client schedule truth — waiver-wall surfacing contract
 * ======================================================
 * Client-dashboard schedule fix (2026-09-12, Sean report: client dashboard
 * shows no schedule while admin/trainer do).
 *
 * Regression intent: the backend waiver gate (waiverGate.mjs) 403s
 * `/api/sessions` for waiver-less client/user accounts (live probe
 * 2026-09-12: 2 of 4 clients and the only role-'user' account have no
 * linked waiver). The frontend swallowed that 403 into a silent empty
 * list — fetchEvents rejects via rejectWithValue so dispatch RESOLVES,
 * useCalendarData.loadSessions' catch never fires, errors.sessions stays
 * null, and ClientTimeline renders "No Upcoming Sessions" with no
 * explanation and no path to fix it.
 *
 * Post-fix contract:
 *   1. universalMasterScheduleService.getSessions tags 403 WAIVER_REQUIRED
 *      responses with a typed error code.
 *   2. scheduleSlice.fetchEvents rejects with a structured payload for the
 *      waiver case (plain string preserved for every other error).
 *   3. useCalendarData inspects the rejected action and exposes the
 *      SESSIONS_WAIVER_REQUIRED sentinel through errors.sessions.
 *   4. UniversalMasterSchedule renders WaiverRequiredNotice (client mode)
 *      with a 44px+ sign-waiver CTA.
 *   5. ClientTimeline no longer claims "browse available time slots" when
 *      the client has history but nothing upcoming.
 *
 * Mocking strategy: source-contract pins (house pattern — see
 * useCalendarData.realtimeContract.test.ts).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SERVICE = readFileSync(
  resolve(process.cwd(), 'src/services/universal-master-schedule-service.ts'),
  'utf8'
);
const SLICE = readFileSync(
  resolve(process.cwd(), 'src/redux/slices/scheduleSlice.ts'),
  'utf8'
);
const HOOK = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/hooks/useCalendarData.ts'),
  'utf8'
);
const MASTER = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx'),
  'utf8'
);
const TIMELINE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/components/ClientTimeline.tsx'),
  'utf8'
);

describe('client schedule truth — waiver wall surfacing', () => {
  it('service tags 403 WAIVER_REQUIRED responses with a typed error code', () => {
    const start = SERVICE.indexOf('async getSessions(filters?: FilterOptions)');
    expect(start).toBeGreaterThan(-1);
    const block = SERVICE.slice(start, SERVICE.indexOf('async getSessionById', start));
    expect(block).toContain('WAIVER_REQUIRED');
    expect(block).toContain('response?.status === 403');
  });

  it('fetchEvents rejects with a structured payload for the waiver case only', () => {
    const start = SLICE.indexOf("export const fetchEvents = createAsyncThunk(");
    expect(start).toBeGreaterThan(-1);
    const block = SLICE.slice(start, SLICE.indexOf('export const fetchCalendarEvents', start));
    expect(block).toContain('WAIVER_REQUIRED');
  });

  it('rejected reducer keeps scheduleError a human-readable string for object payloads', () => {
    const start = SLICE.indexOf('.addCase(fetchEvents.rejected');
    expect(start).toBeGreaterThan(-1);
    const block = SLICE.slice(start, SLICE.indexOf('FETCH CALENDAR', start));
    expect(block).toContain("typeof action.payload === 'string'");
  });

  it('useCalendarData exposes the waiver sentinel through errors.sessions', () => {
    expect(HOOK).toContain('SESSIONS_WAIVER_REQUIRED');
    expect(HOOK).toContain('fetchEvents.rejected.match(action)');
    const start = HOOK.indexOf('const loadSessions');
    expect(start).toBeGreaterThan(-1);
    const block = HOOK.slice(start, HOOK.indexOf('const loadClients', start));
    expect(block).toContain('SESSIONS_WAIVER_REQUIRED');
  });

  it('UniversalMasterSchedule renders the waiver notice for blocked client schedules', () => {
    expect(MASTER).toContain('WaiverRequiredNotice');
    const start = MASTER.indexOf("mode === 'client' ? (");
    expect(start).toBeGreaterThan(-1);
    const block = MASTER.slice(Math.max(0, start - 800), start);
    expect(block).toContain('SESSIONS_WAIVER_REQUIRED');
  });

  it('waiver notice CTA is a 44px+ token-styled link to the waiver flow', () => {
    const notice = readFileSync(
      resolve(process.cwd(), 'src/components/UniversalMasterSchedule/components/WaiverRequiredNotice.tsx'),
      'utf8'
    );
    expect(notice).toContain('/waiver');
    expect(notice).toMatch(/min-height:\s*44px|minHeight:\s*44/);
    expect(notice).toMatch(/var\(--/);
  });

  it('ClientTimeline stays honest when history exists but nothing is upcoming', () => {
    const start = TIMELINE.indexOf('upcoming.length === 0');
    expect(start).toBeGreaterThan(-1);
    const block = TIMELINE.slice(start, TIMELINE.indexOf(') : (', start));
    expect(block).toContain('past.length > 0');
    expect(block).toContain('Your orbit is clear');
  });
});
