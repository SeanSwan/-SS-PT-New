import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

describe('LongHorizonScheduleView structure', () => {
  it('keeps styled-components in a focused sibling styles module', () => {
    const viewSource = read('LongHorizonScheduleView.tsx');
    const styleSource = read('LongHorizonScheduleView.styles.ts');

    expect(viewSource).toContain("from './LongHorizonScheduleView.styles'");
    expect(viewSource).not.toContain("from 'styled-components'");
    expect(viewSource).not.toMatch(/const\s+\w+\s*=\s*styled\./);
    expect(styleSource).toContain("from 'styled-components'");
    expect(styleSource).toContain('export const Wrapper');
    expect(styleSource).toContain('export const FallbackBadge');
  });
});
