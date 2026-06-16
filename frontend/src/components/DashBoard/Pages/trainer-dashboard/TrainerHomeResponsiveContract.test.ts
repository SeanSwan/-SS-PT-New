import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const stylesSource = readFileSync(resolve(__dirname, 'TrainerHomeTab.styles.ts'), 'utf8');
const nextActionStylesSource = readFileSync(
  resolve(__dirname, 'TrainerHomeNextActionCard.styles.ts'),
  'utf8',
);

describe('TrainerHomeTab responsive contract', () => {
  it('stacks today session rows on phone widths so Coach, Plan, and Log do not squeeze the client name', () => {
    expect(stylesSource).toContain('@media (max-width: 560px)');
    expect(stylesSource).toContain('flex-direction: column');
    expect(stylesSource).toContain('align-items: stretch');
    expect(stylesSource).toContain('justify-content: flex-start');
  });

  it('stacks the next-client command card before the flow rail and actions can overlap', () => {
    expect(nextActionStylesSource).toContain('grid-template-columns: minmax(0, 1fr) minmax(210px, 0.72fr) auto');
    expect(nextActionStylesSource).toContain('@media (max-width: 900px)');
    expect(nextActionStylesSource).toContain('grid-template-columns: 1fr');
    expect(nextActionStylesSource).toContain('export const NextActionFlow');
    expect(nextActionStylesSource).toContain('@media (max-width: 480px)');
  });
});
