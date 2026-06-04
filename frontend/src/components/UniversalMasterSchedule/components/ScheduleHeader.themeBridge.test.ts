import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const SOURCE = readFileSync(resolve(__dirname, 'ScheduleHeader.tsx'), 'utf8');
const STYLES_PATH = resolve(__dirname, 'ScheduleHeader.styles.ts');
const TYPES_PATH = resolve(__dirname, 'ScheduleHeader.types.ts');
const STYLES_SOURCE = existsSync(STYLES_PATH) ? readFileSync(STYLES_PATH, 'utf8') : '';
const THEME_SOURCE = `${SOURCE}\n${STYLES_SOURCE}`;

describe('ScheduleHeader theme bridge', () => {
  it('uses dashboard CSS variables instead of fixed legacy schedule accents', () => {
    expect(THEME_SOURCE).toContain('var(--accent-primary, #60C0F0)');
    expect(THEME_SOURCE).toContain('var(--accent-secondary, #8B5CF6)');
    expect(THEME_SOURCE).toContain('var(--bg-base, #0A0A0F)');
    expect(THEME_SOURCE).toContain('var(--bg-surface, #1A1A24)');

    expect(THEME_SOURCE).not.toContain('color="#3b82f6"');
    expect(THEME_SOURCE).not.toContain('#00d4ff');
    expect(THEME_SOURCE).not.toContain('#7c3aed');
    expect(THEME_SOURCE).not.toContain('#1a1a2e');
  });

  it('keeps the canonical schedule header split below project file caps', () => {
    expect(SOURCE).toContain("from './ScheduleHeader.styles'");
    expect(SOURCE).toContain("from './ScheduleHeader.types'");
    expect(existsSync(STYLES_PATH)).toBe(true);
    expect(existsSync(TYPES_PATH)).toBe(true);

    const files = [
      resolve(__dirname, 'ScheduleHeader.tsx'),
      STYLES_PATH,
      TYPES_PATH,
    ];

    files.forEach((filePath) => {
      const lineCount = readFileSync(filePath, 'utf8').split(/\r?\n/).length;
      expect(lineCount, filePath).toBeLessThanOrEqual(300);
    });
  });
});
