import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const stylesSource = readFileSync(resolve(__dirname, 'TrainerHomeTab.styles.ts'), 'utf8');
const layoutStylesSource = readFileSync(resolve(__dirname, 'TrainerHomeTab.layoutStyles.ts'), 'utf8');
const componentSource = readFileSync(resolve(__dirname, 'TrainerHomeTab.tsx'), 'utf8');
const nextActionStylesSource = readFileSync(
  resolve(__dirname, 'TrainerHomeNextActionCard.styles.ts'),
  'utf8',
);
const coachDockSource = readFileSync(resolve(__dirname, 'SwanCoachDockTrainer.tsx'), 'utf8');

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

  it('uses a client-observatory inspired trainer command layout instead of the narrow stacked home column', () => {
    expect(componentSource).toContain('TrainerHomeHeroGrid');
    expect(componentSource).toContain('TrainerHomeMainGrid');
    expect(componentSource).toContain('TrainerHomePrimaryColumn');
    expect(componentSource).toContain('TrainerHomeSideColumn');
    expect(layoutStylesSource).toContain('max-width: 1720px');
    expect(layoutStylesSource).toContain('grid-template-columns: minmax(0, 1.28fr) minmax(340px, 0.72fr)');
    expect(layoutStylesSource).toContain('grid-template-columns: minmax(0, 1fr) minmax(340px, 0.42fr)');
    expect(stylesSource).not.toContain('max-width: 860px');
  });

  it('keeps compact trainer-home labels readable on the dark command surface', () => {
    const combinedSource = [
      stylesSource,
      readFileSync(resolve(__dirname, 'TrainerHomeQuickActions.styles.ts'), 'utf8'),
      coachDockSource,
    ].join('\n');

    expect(combinedSource).not.toMatch(/rgba\(224,\s*236,\s*244,\s*0\.(?:3|4)\d*\)/);
    expect(combinedSource).not.toMatch(/rgba\(255,\s*255,\s*255,\s*0\.(?:3|4)\d*\)/);
    expect(combinedSource).toContain('rgba(224, 236, 244, 0.68)');
  });

  it('keeps trainer coach dock chips as explicit non-submit buttons', () => {
    expect(coachDockSource).toContain('<Chip');
    expect(coachDockSource).toContain('type="button"');
  });
});
