/**
 * ============================================================================
 * FILE: TrainingPlanProjectionLayer.mount.test.ts
 * PURPOSE: Lock the projection layer outside the appointment mutation surface.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx'),
  'utf8',
);

describe('UniversalMasterSchedule projection mount', () => {
  it('mounts planned training ahead of canonical client and staff appointment views', () => {
    expect(source).toContain("import TrainingPlanProjectionLayer from './TrainingPlanProjectionLayer';");

    const projectionIndex = source.indexOf('<TrainingPlanProjectionLayer');
    const timelineIndex = source.indexOf('<ClientTimeline');
    const calendarIndex = source.indexOf('<ScheduleCalendar');

    expect(projectionIndex).toBeGreaterThan(0);
    expect(timelineIndex).toBeGreaterThan(projectionIndex);
    expect(calendarIndex).toBeGreaterThan(projectionIndex);
  });

  it('passes only lens, roster, and coexistence inputs to the projection layer', () => {
    const projectionIndex = source.indexOf('<TrainingPlanProjectionLayer');
    const projectionEnd = source.indexOf('/>', projectionIndex);
    const mount = source.slice(projectionIndex, projectionEnd);

    expect(mount).toContain('mode={mode}');
    expect(mount).toContain('activeView={activeView}');
    expect(mount).toContain('currentDate={currentDate}');
    expect(mount).toContain('clients={clients}');
    expect(mount).toContain('sessions={displaySessions}');
    expect(mount).toContain('clientRosterLoading={dataLoading.clients}');
    expect(mount).not.toMatch(/onBook|onSelect|onReschedule|credits|payment|dispatch/);
  });

  it('does not inject projection objects into ScheduleCalendar', () => {
    const calendarIndex = source.indexOf('<ScheduleCalendar');
    const calendarEnd = source.indexOf('/>', calendarIndex);
    const calendarMount = source.slice(calendarIndex, calendarEnd);

    expect(calendarMount).not.toMatch(/projection|plannedTraining|trainingPlan/i);
  });
});