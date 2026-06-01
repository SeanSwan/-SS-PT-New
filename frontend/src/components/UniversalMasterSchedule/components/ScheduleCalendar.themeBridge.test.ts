import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/components/ScheduleCalendar.tsx'),
  'utf8'
);

describe('ScheduleCalendar theme bridge', () => {
  it('keeps the active schedule canvas connected to theme variables', () => {
    expect(SOURCE).toContain('CALENDAR_CONTAINER_THEME');
    expect(SOURCE).toContain('var(--card-bg, rgba(10, 10, 15, 0.88))');
    expect(SOURCE).toContain('var(--border, rgba(96, 192, 240, 0.16))');
    expect(SOURCE).toContain('var(--accent-primary, #60C0F0)');

    expect(SOURCE).not.toContain('rgba(255, 255, 255');
    expect(SOURCE).not.toMatch(/(?:color|background|border(?:-color)?):\s*#[0-9a-fA-F]{3,8}/);
    expect(SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
