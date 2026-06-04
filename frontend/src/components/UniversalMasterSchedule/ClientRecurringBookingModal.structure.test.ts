import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE_PATH = resolve(__dirname, 'ClientRecurringBookingModal.tsx');
const STEPS_PATH = resolve(__dirname, 'ClientRecurringBookingModal.steps.tsx');
const STYLES_PATH = resolve(__dirname, 'ClientRecurringBookingModal.styles.ts');
const SESSION_STYLES_PATH = resolve(__dirname, 'ClientRecurringBookingModal.sessionStyles.ts');
const LOGIC_PATH = resolve(__dirname, 'ClientRecurringBookingModal.logic.ts');
const TYPES_PATH = resolve(__dirname, 'ClientRecurringBookingModal.types.ts');

const readIfExists = (path: string) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const SOURCE = readFileSync(SOURCE_PATH, 'utf8');
const COMBINED_SOURCE = [
  SOURCE,
  readIfExists(STEPS_PATH),
  readIfExists(STYLES_PATH),
  readIfExists(SESSION_STYLES_PATH),
  readIfExists(LOGIC_PATH),
  readIfExists(TYPES_PATH),
].join('\n');

describe('ClientRecurringBookingModal structure and theme bridge', () => {
  it('keeps the mounted client recurring booking modal split below project file caps', () => {
    expect(SOURCE).toContain("from './ClientRecurringBookingModal.steps'");
    expect(SOURCE).toContain("from './ClientRecurringBookingModal.logic'");
    expect(SOURCE).toContain("from './ClientRecurringBookingModal.styles'");
    expect(SOURCE).toContain("from './ClientRecurringBookingModal.types'");

    const files = [
      SOURCE_PATH,
      STEPS_PATH,
      STYLES_PATH,
      SESSION_STYLES_PATH,
      LOGIC_PATH,
      TYPES_PATH,
    ];

    files.forEach((filePath) => {
      expect(existsSync(filePath), filePath).toBe(true);
      const lineCount = readFileSync(filePath, 'utf8').split(/\r?\n/).length;
      expect(lineCount, filePath).toBeLessThanOrEqual(300);
    });
  });

  it('uses active Crystalline Swan variables instead of retired local modal colors', () => {
    expect(COMBINED_SOURCE).toContain('var(--accent-primary, #60C0F0)');
    expect(COMBINED_SOURCE).toContain('var(--bg-surface, #1A1A24)');
    expect(COMBINED_SOURCE).toContain('var(--text-primary, #E0ECF4)');

    expect(COMBINED_SOURCE).not.toContain('#00d4ff');
    expect(COMBINED_SOURCE).not.toContain('rgba(0, 212, 255');
    expect(COMBINED_SOURCE).not.toContain('#ffffff');
    expect(COMBINED_SOURCE).not.toContain('rgba(255, 255, 255');
  });
});
