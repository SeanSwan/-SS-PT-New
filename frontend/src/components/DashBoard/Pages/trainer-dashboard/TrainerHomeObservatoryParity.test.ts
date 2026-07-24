import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const here = __dirname;
const source = (file: string) => readFileSync(resolve(here, file), 'utf8');

describe('Trainer home observatory parity', () => {
  // Rewritten 2026-07-23 (Kimi K3): assert BEHAVIOR, not anatomy. The trainer
  // home was de-duplicated — the observatory hero (stats/actions/lens rail) was
  // a client-dashboard copy-paste; it is now a slim identity bar, metrics own
  // the KPI strip alone, and interventions are promoted to the primary column.
  it('composes a slim-identity trainer home: one metrics owner, promoted interventions, no duplicate hero', () => {
    const componentSource = source('TrainerHomeTab.tsx');
    const layoutSource = source('TrainerHomeTab.layoutStyles.ts');
    const heroSource = source('TrainerHomeObservatoryHero.tsx');

    // still a real composition of the trainer modules
    expect(componentSource).toContain('TrainerHomeObservatoryHero');
    expect(componentSource).toContain('TrainerHomeNextActionCard');
    expect(componentSource).toContain('KpiStrip'); // sole metrics owner
    expect(componentSource).toContain('TrainerInterventionQueue'); // promoted radar
    expect(componentSource).toContain('TrainerHomePageShell');
    expect(componentSource).toContain('TrainerHomePrimaryColumn');
    expect(componentSource).not.toContain('PageWrap');

    // de-dup: the background-theme picker was evicted from the page flow
    expect(componentSource).not.toContain('DashboardBackgroundSettingsPanel');

    // slim identity hero — no duplicate stats / actions / lens rail
    expect(heroSource).toContain('aria-label="Trainer identity"');
    expect(heroSource).toContain('IdentityBar');
    expect(heroSource).not.toContain('<HeroActions');
    expect(heroSource).not.toContain('<LensRail');
    expect(heroSource).not.toContain('<HeroStats');

    // 4K wide law: cap ~2240 (not the old 1720 island)
    expect(layoutSource).toContain('max-width: 2240px');
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
