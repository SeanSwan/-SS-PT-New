import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const source = (file: string) => readFileSync(resolve(__dirname, file), 'utf8');

const stylesSource = source('TrainerHomeTab.styles.ts');
const layoutStylesSource = source('TrainerHomeTab.layoutStyles.ts');
const componentSource = source('TrainerHomeTab.tsx');
const nextActionStylesSource = source('TrainerHomeNextActionCard.styles.ts');
const quickActionsStylesSource = source('TrainerHomeQuickActions.styles.ts');
const heroSource = source('TrainerHomeObservatoryHero.tsx');
const heroStylesSource = source('TrainerHomeObservatoryHero.styles.ts');
const widgetsSource = source('TrainerHomeObservatoryWidgets.tsx');
const widgetsStylesSource = source('TrainerHomeObservatoryWidgets.styles.ts');
const dataSource = source('TrainerHomeObservatoryData.ts');

describe('TrainerHomeTab responsive contract', () => {
  it('stacks today session rows on phone widths so Coach, Build, and Log do not squeeze the client name', () => {
    expect(stylesSource).toContain('@media (max-width: 560px)');
    expect(stylesSource).toContain('flex-direction: column');
    expect(stylesSource).toContain('align-items: stretch');
    expect(stylesSource).toContain('justify-content: flex-start');
  });

  it('uses a client-style proof board with responsive flow rail and actions', () => {
    expect(nextActionStylesSource).toContain('grid-template-columns: minmax(0, 1fr) minmax(0, 0.42fr)');
    expect(nextActionStylesSource).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(nextActionStylesSource).toContain('grid-template-columns: repeat(auto-fit, minmax(8.75rem, 1fr))');
    expect(nextActionStylesSource).toContain('export const NextActionFlow');
    expect(nextActionStylesSource).toContain('@media (max-width: 520px)');
    expect(nextActionStylesSource).not.toContain('overflow-wrap: anywhere');
    expect(nextActionStylesSource).toContain('word-break: normal');
  });
  it('keeps quick actions balanced across desktop, tablet, and phone widths', () => {
    expect(quickActionsStylesSource).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(quickActionsStylesSource).toContain('@media (max-width: 700px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }');
    expect(quickActionsStylesSource).toContain('@media (max-width: 520px) { grid-template-columns: 1fr; }');
  });


  it('renders the trainer profile directly in the client-parity hero', () => {
    expect(componentSource).toContain('trainerPhotoUrl={trainerPhotoUrl}');
    expect(componentSource).toContain('trainerHandle={trainerHandle}');
    expect(heroSource).toContain("import { sanitizeImageUrl } from '../../../../utils/imageUrl'");
    expect(heroSource).toContain('const safePhoto = sanitizeImageUrl(trainerPhotoUrl)');
    expect(heroSource).toContain('<HeroAvatar src={safePhoto} alt={`${trainerName} profile`} />');
    expect(heroSource).toContain('<HeroHandle>{handleLabel}</HeroHandle>');
  });

  it('keeps the trainer hero action rail and lens rail mobile-safe', () => {
    expect(heroStylesSource).toContain('grid-template-columns: repeat(5, minmax(0, 1fr))');
    expect(heroStylesSource).toContain('@media (max-width: 860px)');
    expect(heroStylesSource).toContain('grid-template-columns: repeat(6, minmax(0, 1fr))');
    expect(heroStylesSource).toContain('overflow-x: auto');
    expect(heroStylesSource).toContain('flex: 0 0 13rem');
  });

  it('uses the client-observatory hero anatomy instead of the old narrow dock stack', () => {
    expect(componentSource).toContain('TrainerHomeObservatoryHero');
    expect(componentSource).toContain('TrainerHomeObservatoryWidgets');
    expect(componentSource).toContain('TrainerHomePageShell');
    expect(componentSource).toContain('TrainerHomePrimaryColumn');
    expect(componentSource).toContain('TrainerHomeSideColumn');
    expect(componentSource).not.toContain('PageWrap');
    expect(heroSource).toContain('<HeroCard aria-label="Trainer dashboard observatory">');
    expect(heroSource).toContain('<HeroGrid>');
    expect(heroSource).toContain('<ArtworkPanel aria-label="Trainer observatory artwork">');
    expect(heroSource).not.toContain('SwanCoachDockTrainer');
    expect(layoutStylesSource).toContain('max-width: 1720px');
    expect(layoutStylesSource).toContain('grid-template-columns: minmax(0, 1.45fr) minmax(0, 0.7fr)');
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
    expect(dataSource).toContain("label: 'Schedule'");
    expect(dataSource).toContain("label: 'Build Plan'");
    expect(dataSource).toContain("label: 'Coach'");
    expect(dataSource).toContain('TRAINER_HOME_LOG_WORKOUT_PATH');
  });

  it('keeps compact trainer-home labels readable on the dark command surface', () => {
    const combinedSource = [
      stylesSource,
      quickActionsStylesSource,
      nextActionStylesSource,
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
      heroSource,
      heroStylesSource,
      widgetsSource,
      widgetsStylesSource,
      dataSource,
    ].forEach((fileSource) => {
      expect(fileSource).not.toMatch(/\P{ASCII}/u);
      expect(fileSource.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
    });
  });

  it('keeps trainer lens controls as explicit non-submit buttons', () => {
    expect(heroSource).toContain('<LensButton');
    expect(heroSource).toContain('type="button"');
  });

  it('keeps the mounted trainer home component free of inline styles', () => {
    expect(componentSource).not.toContain('style={{');
    expect(componentSource).toContain('$index={i}');
  });
});
