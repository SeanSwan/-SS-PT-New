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

  // Rewritten 2026-07-23 (Kimi K3): the hero action rail and lens rail were
  // removed in the de-dup. The slim identity bar owns only min-width:0 tracks so
  // the avatar + level meta never overflow the clipped content area.
  it('keeps the slim identity hero overflow-safe on every width', () => {
    expect(heroStylesSource).toContain('grid-template-columns: minmax(0, 1fr) minmax(0, auto)');
    expect(heroStylesSource).toContain('@media (max-width: 720px)');
    expect(heroStylesSource).toContain('overflow-wrap: anywhere'); // long trainer name cannot push wide
    expect(heroStylesSource).toContain('text-overflow: ellipsis'); // long @handle clips, never overflows
    expect(heroStylesSource).not.toContain('LensRail');
    expect(heroStylesSource).not.toContain('HeroActions');
  });

  // Rewritten 2026-07-23 (Kimi K3): assert BEHAVIOR not anatomy. Slim identity
  // hero + de-dup; the observatory hero's stats/actions/lens rail were removed.
  it('uses a slim identity hero and a 4K-correct shell (no duplicate hero blocks)', () => {
    expect(componentSource).toContain('TrainerHomeObservatoryHero');
    expect(componentSource).toContain('TrainerHomeNextActionCard');
    expect(componentSource).toContain('TrainerHomePageShell');
    expect(componentSource).toContain('TrainerHomePrimaryColumn');
    expect(componentSource).not.toContain('PageWrap');
    expect(heroSource).toContain('aria-label="Trainer identity"');
    expect(heroSource).toContain('IdentityBar');
    expect(heroSource).not.toContain('SwanCoachDockTrainer');
    expect(heroSource).not.toContain('HeroActions');
    expect(heroSource).not.toContain('LensRail');
    expect(layoutStylesSource).toContain('max-width: 2240px'); // wide law
    expect(stylesSource).not.toContain('max-width: 860px');
  });

  // Rewritten 2026-07-23: the hero lens rail was removed (nav belongs in the
  // shell). The phone dock still surfaces the trainer's quick destinations.
  it('declares trainer-specific phone dock actions', () => {
    expect(widgetsSource).toContain('TRAINER_OBSERVATORY_MOBILE_DOCK');
    expect(widgetsStylesSource).toContain('grid-template-columns: repeat(5, minmax(0, 1fr))');
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

  // Rewritten 2026-07-23: lens rail removed; the phone dock buttons remain the
  // explicit non-submit controls.
  it('keeps trainer phone-dock controls as explicit non-submit buttons', () => {
    expect(widgetsSource).toContain('MobileDockButton');
    expect(widgetsSource).toContain('type="button"');
  });

  it('keeps the mounted trainer home component free of inline styles', () => {
    expect(componentSource).not.toContain('style={{');
    expect(componentSource).toContain('$index={i}');
  });
});
