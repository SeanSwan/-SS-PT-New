import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/components/ScheduleStats.tsx'),
  'utf8'
);
const LOGIC_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/components/ScheduleStats.logic.ts'),
  'utf8'
);
const STYLES_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/components/ScheduleStats.styles.ts'),
  'utf8'
);
const CARD_STYLES_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/components/ScheduleStats.cardStyles.ts'),
  'utf8'
);
const DRILLDOWN_STYLES_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/components/ScheduleStats.drilldownStyles.ts'),
  'utf8'
);
const TABLE_STYLES_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/components/ScheduleStats.tableStyles.ts'),
  'utf8'
);
const SOURCE_FILES = [
  SOURCE,
  LOGIC_SOURCE,
  STYLES_SOURCE,
  CARD_STYLES_SOURCE,
  DRILLDOWN_STYLES_SOURCE,
  TABLE_STYLES_SOURCE,
];
const COMBINED_SOURCE = SOURCE_FILES.join('\n');

describe('ScheduleStats theme bridge', () => {
  it('uses Crystalline Swan theme variables instead of the retired local schedule palette', () => {
    expect(COMBINED_SOURCE).toContain('SCHEDULE_STAT_COLORS');
    expect(COMBINED_SOURCE).toContain('var(--accent-primary, #60C0F0)');
    expect(COMBINED_SOURCE).toContain('var(--accent-secondary, #8B5CF6)');
    expect(COMBINED_SOURCE).toContain('var(--success, #10b981)');
    expect(COMBINED_SOURCE).toContain('var(--warning, #f59e0b)');
    expect(COMBINED_SOURCE).toContain('var(--danger, #ef4444)');

    expect(COMBINED_SOURCE).not.toContain('galaxySwanTheme');
    expect(COMBINED_SOURCE).not.toContain('const TEAL =');
    expect(COMBINED_SOURCE).not.toContain("style={{ fontSize: '1.5rem', marginBottom: 0, color: '#e2e8f0' }}");
    expect(COMBINED_SOURCE).not.toMatch(/color:\s*#[0-9a-fA-F]{3,8}/);
    expect(COMBINED_SOURCE).not.toMatch(/background:\s*#[0-9a-fA-F]{3,8}/);
    expect(COMBINED_SOURCE).not.toMatch(/border(?:-color)?:\s*#[0-9a-fA-F]{3,8}/);
  });

  it('keeps the mounted component split below the large-file threshold', () => {
    expect(SOURCE).toContain("from './ScheduleStats.logic'");
    expect(SOURCE).toContain("from './ScheduleStats.styles'");
    SOURCE_FILES.forEach((source) => {
      expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    });
  });
});
