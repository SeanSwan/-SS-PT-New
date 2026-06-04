import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readComponentSource = (path: string) =>
  readFileSync(resolve(process.cwd(), `src/components/UniversalMasterSchedule/components/${path}`), 'utf8');

const COMPONENT_SOURCE = readComponentSource('ScheduleModals.tsx');
const STYLE_SOURCE = readComponentSource('ScheduleModals.styles.ts');
const THEME_SOURCE = readComponentSource('ScheduleModals.theme.ts');

describe('UniversalMasterSchedule ScheduleModals theme bridge', () => {
  it('keeps premium lock and booking modal chrome on Crystalline Swan tokens', () => {
    expect(COMPONENT_SOURCE).toContain('./ScheduleModals.styles');
    expect(THEME_SOURCE).toContain('SCHEDULE_MODALS_THEME');
    expect(THEME_SOURCE).toContain('var(--accent-primary, #60C0F0)');

    const combinedRuntime = `${COMPONENT_SOURCE}\n${STYLE_SOURCE}`;
    expect(combinedRuntime).not.toContain('rgba(0, 32, 96');
    expect(combinedRuntime).not.toContain('rgba(255');
    expect(combinedRuntime).not.toContain('#8B5CF6');
    expect(combinedRuntime).not.toContain('#ef4444');
    expect(combinedRuntime).not.toContain('#f59e0b');
    expect(STYLE_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
