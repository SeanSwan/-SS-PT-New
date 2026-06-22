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
    expect(nextActionStylesSource).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(nextActionStylesSource).toContain('grid-template-columns: repeat(auto-fit, minmax(7.4rem, 1fr))');
    expect(nextActionStylesSource).toContain('grid-template-columns: repeat(auto-fit, minmax(9.25rem, 1fr))');
    expect(nextActionStylesSource).toContain('export const NextActionFlow');
    expect(nextActionStylesSource).toContain('@media (max-width: 380px)');
    expect(nextActionStylesSource).not.toContain('overflow-wrap: anywhere');
    expect(nextActionStylesSource).toContain('word-break: normal');
  });

  it('renders a real trainer profile photo slot on the trainer hero dock', () => {
    expect(componentSource).toContain('trainerPhotoUrl={trainerPhotoUrl}');
    expect(componentSource).toContain('trainerHandle={trainerHandle}');
    expect(coachDockSource).toContain("import { sanitizeImageUrl } from '../../../../utils/imageUrl'");
    expect(coachDockSource).toContain('trainerPhotoUrl?: string | null');
    expect(coachDockSource).toContain('<img src={safePhoto} alt={`${trainerName} profile`} />');
    expect(coachDockSource).toContain('{trainerHandle && <CoachHandle>{trainerHandle}</CoachHandle>}');
  });

  it('keeps the trainer hero chips and meta text mobile-safe', () => {
    expect(coachDockSource).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(coachDockSource).toContain('flex: 1 1 10rem');
    expect(coachDockSource).toContain('justify-content: center');
    expect(coachDockSource).toContain('<CoachMeta>{sessLabel} - Lv.{level}</CoachMeta>');
    expect(coachDockSource).not.toContain('&nbsp;·&nbsp;');
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
      nextActionStylesSource,
      coachDockSource,
    ].join('\n');

    expect(combinedSource).not.toContain('rgba(');
    // Updated 2026-06-20 (GLM 5.2 Finding 1, accepted by Gemini): muted text must mix with the
    // SOLID card surface, not `transparent` — mixing with transparent makes contrast depend on
    // whatever sits behind the text (WCAG risk). Mixing with --bg-elevated guarantees the ratio.
    expect(combinedSource).toContain('color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, var(--bg-elevated, #141419))');
  });

  it('uses fixed-format trainer-home type and explicit motion', () => {
    const combinedSource = [
      stylesSource,
      readFileSync(resolve(__dirname, 'TrainerHomeQuickActions.styles.ts'), 'utf8'),
      nextActionStylesSource,
      coachDockSource,
    ].join('\n');

    expect(combinedSource).not.toContain('clamp(');
    expect(combinedSource).not.toContain('transition: all');
    expect(combinedSource).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('keeps trainer-home sources ASCII-clean and under the dashboard line cap', () => {
    [
      componentSource,
      stylesSource,
      layoutStylesSource,
      nextActionStylesSource,
      readFileSync(resolve(__dirname, 'TrainerHomeQuickActions.styles.ts'), 'utf8'),
      coachDockSource,
    ].forEach((source) => {
      expect(source).not.toMatch(/[^\x00-\x7F]/);
      expect(source.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
    });
  });

  it('keeps trainer coach dock chips as explicit non-submit buttons', () => {
    expect(coachDockSource).toContain('<Chip');
    expect(coachDockSource).toContain('type="button"');
  });

  it('keeps the mounted trainer home component free of inline styles', () => {
    expect(componentSource).not.toContain('style={{');
    expect(componentSource).toContain('$index={i}');
  });
});
