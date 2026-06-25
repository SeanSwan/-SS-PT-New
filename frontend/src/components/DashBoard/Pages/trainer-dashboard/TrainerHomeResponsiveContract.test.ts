import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const source = (file: string) => readFileSync(resolve(__dirname, file), 'utf8');

const stylesSource = source('TrainerHomeTab.styles.ts');
const layoutStylesSource = source('TrainerHomeTab.layoutStyles.ts');
const componentSource = source('TrainerHomeTab.tsx');
const nextActionStylesSource = source('TrainerHomeNextActionCard.styles.ts');
const quickActionsStylesSource = source('TrainerHomeQuickActions.styles.ts');
const coachDockSource = source('SwanCoachDockTrainer.tsx');
const heroSource = source('TrainerHomeObservatoryHero.tsx');
const heroStylesSource = source('TrainerHomeObservatoryHero.styles.ts');
const widgetsSource = source('TrainerHomeObservatoryWidgets.tsx');
const widgetsStylesSource = source('TrainerHomeObservatoryWidgets.styles.ts');
const dataSource = source('TrainerHomeObservatoryData.ts');

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

  it('renders a real trainer profile photo slot through the trainer observatory hero dock', () => {
    expect(componentSource).toContain('trainerPhotoUrl={trainerPhotoUrl}');
    expect(componentSource).toContain('trainerHandle={trainerHandle}');
    expect(heroSource).toContain('trainerPhotoUrl={trainerPhotoUrl}');
    expect(heroSource).toContain('trainerHandle={trainerHandle}');
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
    expect(coachDockSource).not.toContain('&nbsp;');
  });

  it('uses a client-observatory inspired trainer command layout instead of the old narrow stack', () => {
    expect(componentSource).toContain('TrainerHomeObservatoryHero');
    expect(componentSource).toContain('TrainerHomeObservatoryWidgets');
    expect(componentSource).toContain('TrainerHomePageShell');
    expect(componentSource).toContain('TrainerHomePrimaryColumn');
    expect(componentSource).toContain('TrainerHomeSideColumn');
    expect(componentSource).not.toContain('PageWrap');
    expect(heroSource).toContain('TrainerHomeHeroGrid');
    expect(layoutStylesSource).toContain('max-width: 1720px');
    expect(layoutStylesSource).toContain('grid-template-columns: minmax(0, 1.28fr) minmax(340px, 0.72fr)');
    expect(layoutStylesSource).toContain('grid-template-columns: minmax(0, 1fr) minmax(340px, 0.42fr)');
    expect(stylesSource).not.toContain('max-width: 860px');
  });

  it('declares trainer-specific observatory lenses and phone dock actions', () => {
    expect(componentSource).toContain('TRAINER_OBSERVATORY_LENSES');
    expect(heroSource).toContain('Trainer observatory lenses');
    expect(widgetsSource).toContain('TRAINER_OBSERVATORY_MOBILE_DOCK');
    expect(widgetsStylesSource).toContain('grid-template-columns: repeat(5, minmax(0, 1fr))');
    expect(dataSource).toContain("label: 'Today'");
    expect(dataSource).toContain("label: 'Clients'");
    expect(dataSource).toContain("label: 'Progress'");
    expect(dataSource).toContain("label: 'Coach'");
    expect(dataSource).toContain('TRAINER_HOME_LOG_WORKOUT_PATH');
  });

  it('keeps compact trainer-home labels readable on the dark command surface', () => {
    const combinedSource = [
      stylesSource,
      quickActionsStylesSource,
      nextActionStylesSource,
      coachDockSource,
      heroStylesSource,
      widgetsStylesSource,
    ].join('\n');

    expect(combinedSource).not.toContain('rgba(');
    expect(combinedSource).toContain('color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, var(--bg-elevated, #141419))');
  });

  it('uses fixed-format trainer-home type and explicit motion', () => {
    const combinedSource = [
      stylesSource,
      quickActionsStylesSource,
      nextActionStylesSource,
      coachDockSource,
      heroStylesSource,
      widgetsStylesSource,
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
      quickActionsStylesSource,
      coachDockSource,
      heroSource,
      heroStylesSource,
      widgetsSource,
      widgetsStylesSource,
      dataSource,
    ].forEach((fileSource) => {
      expect(fileSource).not.toMatch(/[^\x00-\x7F]/);
      expect(fileSource.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
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