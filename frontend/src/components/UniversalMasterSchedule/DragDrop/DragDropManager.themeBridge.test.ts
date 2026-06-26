import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const routeComponentsSource = readSource('src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx');
const dashboardRoutesSource = readSource('src/components/DashBoard/UniversalDashboardLayout.routes.tsx');
const masterScheduleSource = readSource('src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx');
const calendarSource = readSource('src/components/UniversalMasterSchedule/components/ScheduleCalendar.tsx');
const dragSource = readSource('src/components/UniversalMasterSchedule/DragDrop/DragDropManager.tsx');

describe('DragDropManager theme bridge', () => {
  it('is mounted through the active schedule calendar route chain', () => {
    expect(routeComponentsSource).toContain("import UniversalSchedule from '../Schedule/UniversalSchedule'");
    expect(dashboardRoutesSource).toContain("{ path: '/master-schedule', component: UniversalSchedule");
    expect(masterScheduleSource).toContain("import ScheduleCalendar from './components/ScheduleCalendar'");
    expect(masterScheduleSource).toContain('<ScheduleCalendar');
    expect(calendarSource).toContain("import DragDropManager from '../DragDrop/DragDropManager'");
    expect(calendarSource).toContain('<DragDropManager');
  });

  it('uses theme variables for drag preview validity shadows', () => {
    expect(dragSource).toContain('DRAG_PREVIEW_THEME');
    expect(dragSource).toContain('var(--accent-secondary, #8B5CF6)');
    expect(dragSource).toContain('var(--danger, #ef4444)');
    expect(dragSource).toContain('color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent)');
    expect(dragSource).toContain('color-mix(in srgb, var(--danger, #ef4444) 50%, transparent)');

    expect(dragSource).not.toContain('0 0 30px rgba(139, 92, 246, 0.5)');
    expect(dragSource).not.toContain('0 0 30px rgba(255, 71, 87, 0.5)');
    expect(dragSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
