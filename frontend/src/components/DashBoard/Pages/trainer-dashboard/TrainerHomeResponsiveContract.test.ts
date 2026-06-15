import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const stylesSource = readFileSync(resolve(__dirname, 'TrainerHomeTab.styles.ts'), 'utf8');

describe('TrainerHomeTab responsive contract', () => {
  it('stacks today session rows on phone widths so Coach, Plan, and Log do not squeeze the client name', () => {
    expect(stylesSource).toContain('@media (max-width: 560px)');
    expect(stylesSource).toContain('flex-direction: column');
    expect(stylesSource).toContain('align-items: stretch');
    expect(stylesSource).toContain('justify-content: flex-start');
  });
});
