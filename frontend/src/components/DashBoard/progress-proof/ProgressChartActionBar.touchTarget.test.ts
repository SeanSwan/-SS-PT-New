import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const stylesSource = readFileSync(resolve(__dirname, './ProgressChartActionBar.styles.ts'), 'utf8');
const rangeButtonBlock = stylesSource.match(
  /export const RangeButton[\s\S]*?export const IconActionButton/,
)?.[0] ?? '';

describe('ProgressChartActionBar touch targets', () => {
  it('keeps range buttons at the SwanStudios 44px touch target minimum', () => {
    expect(rangeButtonBlock).toContain('min-height: 44px;');
    expect(rangeButtonBlock).not.toContain('min-height: 40px;');
  });
});
