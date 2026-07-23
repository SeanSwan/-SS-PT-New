import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const here = __dirname;
const source = (file: string) => readFileSync(resolve(here, file), 'utf8');

describe('Trainer home observatory parity', () => {
  it('uses a client-home observatory composition with trainer-specific modules', () => {
    const componentSource = source('TrainerHomeTab.tsx');
    const layoutSource = source('TrainerHomeTab.layoutStyles.ts');
    const heroSource = source('TrainerHomeObservatoryHero.tsx');
    const heroStylesSource = source('TrainerHomeObservatoryHero.styles.ts');

    expect(componentSource).toContain('TrainerHomeObservatoryHero');
    expect(componentSource).toContain('TrainerHomeObservatoryWidgets');
    expect(componentSource).toContain('TRAINER_OBSERVATORY_LENSES');
    expect(componentSource).toContain('TrainerHomePageShell');
    expect(componentSource).toContain('TrainerHomePrimaryColumn');
    expect(componentSource).toContain('TrainerHomeSideColumn');
    expect(componentSource).not.toContain('PageWrap');

    expect(layoutSource).toContain('TrainerHomePageShell');
    expect(layoutSource).toContain('max-width: 1720px');
    expect(layoutSource).toContain('grid-template-columns: minmax(0, 1.45fr) minmax(0, 0.7fr)');
    expect(heroSource).toContain('<HeroCard aria-label="Trainer dashboard observatory">');
    expect(heroSource).toContain('<HeroGrid>');
    expect(heroSource).toContain('<ArtworkPanel aria-label="Trainer observatory artwork">');
    expect(heroStylesSource).toContain('grid-template-columns: minmax(0, 0.88fr) minmax(0, 0.55fr)');
    expect(heroStylesSource).toContain('grid-template-columns: repeat(6, minmax(0, 1fr))');
  });

  it('declares trainer lenses and mobile dock actions instead of reusing client copy', () => {
    const dataPath = resolve(here, 'TrainerHomeObservatoryData.ts');

    expect(existsSync(dataPath)).toBe(true);

    const dataSource = readFileSync(dataPath, 'utf8');
    expect(dataSource).toContain('TRAINER_OBSERVATORY_LENSES');
    expect(dataSource).toContain("label: 'Today'");
    expect(dataSource).toContain("label: 'Clients'");
    expect(dataSource).toContain("label: 'Progress'");
    expect(dataSource).toContain("label: 'Schedule'");
    expect(dataSource).toContain("label: 'Build Plan'");
    expect(dataSource).toContain("label: 'Coach'");
    expect(dataSource).toContain('TRAINER_OBSERVATORY_MOBILE_DOCK');
    expect(dataSource).toContain('TRAINER_HOME_LOG_WORKOUT_PATH');
    expect(dataSource).toContain('/dashboard/trainer/client-progress');
    expect(dataSource).not.toContain('Active Lens');
    expect(dataSource).not.toContain('Friend Finder');
  });

  it('keeps trainer homepage sources ASCII-clean and within Swan dashboard line caps', () => {
    [
      'TrainerHomeTab.tsx',
      'TrainerHomeTab.layoutStyles.ts',
      'TrainerHomeObservatoryHero.tsx',
      'TrainerHomeObservatoryHero.styles.ts',
      'TrainerHomeObservatoryWidgets.tsx',
      'TrainerHomeObservatoryWidgets.styles.ts',
      'TrainerHomeObservatoryData.ts',
    ].forEach((file) => {
      const filePath = resolve(here, file);
      expect(existsSync(filePath), `${file} should exist`).toBe(true);
      const fileSource = readFileSync(filePath, 'utf8');
      expect(fileSource).not.toMatch(/\P{ASCII}/u);
      expect(fileSource.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(300);
    });
  });
});
