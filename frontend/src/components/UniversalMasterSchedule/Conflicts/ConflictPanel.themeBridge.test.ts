import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/Conflicts/ConflictPanel.tsx'),
  'utf8'
);
const STYLES_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/Conflicts/ConflictPanel.styles.ts'),
  'utf8'
);
const COMBINED_SOURCE = `${SOURCE}\n${STYLES_SOURCE}`;

describe('ConflictPanel theme bridge', () => {
  it('uses active Crystalline Swan tokens instead of retired Galaxy Swan styling', () => {
    expect(COMBINED_SOURCE).not.toContain('galaxySwanTheme');
    expect(COMBINED_SOURCE).not.toContain('#FF4757');
    expect(COMBINED_SOURCE).not.toContain('#FFD700');
    expect(COMBINED_SOURCE).not.toContain('rgba(10, 10, 30');
    expect(COMBINED_SOURCE).toContain('var(--danger, #ef4444)');
    expect(COMBINED_SOURCE).toContain('var(--warning, #f59e0b)');
    expect(COMBINED_SOURCE).toContain('var(--accent-primary, #60C0F0)');
    expect(COMBINED_SOURCE).toContain('var(--text-primary, #E0ECF4)');
  });

  it('keeps modal actions at mobile-safe touch target sizes', () => {
    expect(COMBINED_SOURCE).toContain('min-width: 44px;');
    expect(COMBINED_SOURCE).toContain('min-height: 44px;');
  });

  it('keeps component and style files below the large-file threshold', () => {
    expect(SOURCE).toContain("from './ConflictPanel.styles'");
    expect(SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(STYLES_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
