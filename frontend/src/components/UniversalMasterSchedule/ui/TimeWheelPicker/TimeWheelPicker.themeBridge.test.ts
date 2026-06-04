import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) =>
  readFileSync(resolve(process.cwd(), `src/components/UniversalMasterSchedule/ui/TimeWheelPicker/${path}`), 'utf8');

const PICKER_SOURCE = readSource('TimeWheelPicker.tsx');
const DROPDOWN_SOURCE = readSource('TimeDropdown.tsx');
const WHEEL_SOURCE = readSource('TimeWheel.tsx');
const THEME_SOURCE = readSource('TimeWheel.theme.ts');
const PICKER_STYLE_SOURCE = readSource('TimeWheelPicker.styles.ts');
const DROPDOWN_STYLE_SOURCE = readSource('TimeDropdown.styles.ts');
const WHEEL_STYLE_SOURCE = readSource('TimeWheel.styles.ts');

describe('UniversalMasterSchedule TimeWheelPicker theme bridge', () => {
  it('keeps adaptive time controls on shared Crystalline Swan tokens', () => {
    expect(PICKER_SOURCE).toContain('./TimeWheelPicker.styles');
    expect(DROPDOWN_SOURCE).toContain('./TimeDropdown.styles');
    expect(WHEEL_SOURCE).toContain('./TimeWheel.styles');
    expect(THEME_SOURCE).toContain('TIME_WHEEL_THEME');
    expect(THEME_SOURCE).toContain('var(--accent-primary, #60C0F0)');
    const combinedStyles = `${PICKER_STYLE_SOURCE}\n${DROPDOWN_STYLE_SOURCE}\n${WHEEL_STYLE_SOURCE}`;
    expect(combinedStyles).not.toContain('#0EA5E9');
    expect(combinedStyles).not.toContain('rgba(255');
    expect(combinedStyles).not.toContain('#ffffff');
    expect(combinedStyles).not.toContain('#e2e8f0');
    expect(PICKER_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(DROPDOWN_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(WHEEL_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(WHEEL_STYLE_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
