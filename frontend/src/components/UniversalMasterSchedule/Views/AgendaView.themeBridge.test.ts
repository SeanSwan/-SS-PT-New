import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/Views/AgendaView.tsx'),
  'utf8'
);
const LOGIC_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/Views/AgendaView.logic.ts'),
  'utf8'
);
const STYLES_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/Views/AgendaView.styles.ts'),
  'utf8'
);
const SOURCE_FILES = [SOURCE, LOGIC_SOURCE, STYLES_SOURCE];
const COMBINED_SOURCE = SOURCE_FILES.join('\n');

describe('AgendaView theme bridge', () => {
  it('uses Crystalline Swan theme variables instead of retired agenda colors', () => {
    expect(COMBINED_SOURCE).toContain('AGENDA_VIEW_THEME');
    expect(COMBINED_SOURCE).toContain('var(--accent-primary, #60C0F0)');
    expect(COMBINED_SOURCE).toContain('var(--accent-secondary, #8B5CF6)');
    expect(COMBINED_SOURCE).toContain('var(--text-primary, #E0ECF4)');
    expect(COMBINED_SOURCE).toContain('var(--success, #10b981)');
    expect(COMBINED_SOURCE).toContain('var(--danger, #ef4444)');

    expect(COMBINED_SOURCE).not.toContain('galaxySwanTheme');
    expect(COMBINED_SOURCE).not.toContain('#00FF88');
    expect(COMBINED_SOURCE).not.toContain('#FF4757');
    expect(COMBINED_SOURCE).not.toContain('Â·');
    expect(COMBINED_SOURCE).not.toMatch(/(?:color|background|border(?:-color)?):\s*#[0-9a-fA-F]{3,8}/);
  });

  it('keeps agenda view logic and styles split below the large-file threshold', () => {
    expect(SOURCE).toContain("from './AgendaView.logic'");
    expect(SOURCE).toContain("from './AgendaView.styles'");
    SOURCE_FILES.forEach((source) => {
      expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    });
  });
});
