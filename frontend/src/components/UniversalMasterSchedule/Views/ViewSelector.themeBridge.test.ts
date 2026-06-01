import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/Views/ViewSelector.tsx'),
  'utf8'
);
const LOGIC_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/Views/ViewSelector.logic.ts'),
  'utf8'
);
const STYLES_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/Views/ViewSelector.styles.ts'),
  'utf8'
);
const SOURCE_FILES = [SOURCE, LOGIC_SOURCE, STYLES_SOURCE];
const COMBINED_SOURCE = SOURCE_FILES.join('\n');

describe('ViewSelector theme bridge', () => {
  it('uses Crystalline Swan theme variables instead of the retired galaxy theme', () => {
    expect(COMBINED_SOURCE).toContain('VIEW_SELECTOR_THEME');
    expect(COMBINED_SOURCE).toContain('var(--accent-primary, #60C0F0)');
    expect(COMBINED_SOURCE).toContain('var(--accent-secondary, #8B5CF6)');
    expect(COMBINED_SOURCE).toContain('var(--bg-base, #0A0A0F)');
    expect(COMBINED_SOURCE).toContain('var(--text-primary, #E0ECF4)');

    expect(COMBINED_SOURCE).not.toContain('galaxySwanTheme');
    expect(COMBINED_SOURCE).not.toContain('#00e5e5');
    expect(COMBINED_SOURCE).not.toMatch(/(?:color|background|border(?:-color)?):\s*#[0-9a-fA-F]{3,8}/);
  });

  it('keeps view logic and styles split below the large-file threshold', () => {
    expect(SOURCE).toContain("from './ViewSelector.logic'");
    expect(SOURCE).toContain("from './ViewSelector.styles'");
    SOURCE_FILES.forEach((source) => {
      expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    });
  });
});
