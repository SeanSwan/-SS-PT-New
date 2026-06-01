import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const viewPath = 'src/components/UniversalMasterSchedule/Views';
const SOURCE = readFileSync(resolve(process.cwd(), viewPath, 'WeekView.tsx'), 'utf8');
const LOGIC_SOURCE = readFileSync(resolve(process.cwd(), viewPath, 'WeekView.logic.ts'), 'utf8');
const LAYOUT_STYLES_SOURCE = readFileSync(
  resolve(process.cwd(), viewPath, 'WeekView.layoutStyles.ts'),
  'utf8'
);
const SESSION_STYLES_SOURCE = readFileSync(
  resolve(process.cwd(), viewPath, 'WeekView.sessionStyles.ts'),
  'utf8'
);

const SOURCE_FILES = [
  SOURCE,
  LOGIC_SOURCE,
  LAYOUT_STYLES_SOURCE,
  SESSION_STYLES_SOURCE,
];

describe('WeekView extraction contract', () => {
  it('keeps active week view logic and styles split below the large-file threshold', () => {
    expect(SOURCE).toContain("from './WeekView.logic'");
    expect(SOURCE).toContain("from './WeekView.layoutStyles'");
    expect(SOURCE).toContain("from './WeekView.sessionStyles'");
    expect(SOURCE).not.toContain('styled.');
    expect(SOURCE).not.toContain('keyframes');

    SOURCE_FILES.forEach((source) => {
      expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    });
  });
});
