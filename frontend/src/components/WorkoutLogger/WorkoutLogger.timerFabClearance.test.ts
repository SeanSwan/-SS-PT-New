import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const stylesSource = readFileSync(resolve(__dirname, './WorkoutLogger.styles.ts'), 'utf8');
const stickySource = readFileSync(resolve(__dirname, './StickyLogActionBar.tsx'), 'utf8');

describe('WorkoutLogger fixed action clearance', () => {
  it('lifts the timer FAB with the same safe-area inset used by the sticky Save bar', () => {
    expect(stickySource).toContain('env(safe-area-inset-bottom, 0px)');
    expect(stylesSource).toContain('calc(5.75rem + env(safe-area-inset-bottom, 0px))');
    expect(stylesSource).toContain('calc(5.25rem + env(safe-area-inset-bottom, 0px))');
  });
});
