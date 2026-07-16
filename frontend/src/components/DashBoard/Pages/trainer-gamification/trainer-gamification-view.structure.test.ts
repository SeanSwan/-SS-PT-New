import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const optionalRead = (fileName: string) => {
  const path = resolve(__dirname, fileName);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
};

describe('trainer gamification view structure', () => {
  it('keeps the trainer gamification route shell focused', () => {
    const source = read('trainer-gamification-view.tsx');

    expect(source).toContain("from './trainer-gamification-view.styles'");
    expect(source).not.toContain("import styled from 'styled-components'");
    expect(source).not.toMatch(/const SearchInput\s*=\s*styled/);
    expect(source).not.toContain('style={{');
    expect(source).not.toMatch(/\u00E2/);
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('moves interaction styling into a tokenized style module under the file cap', () => {
    const stylesSource = optionalRead('trainer-gamification-view.styles.ts');

    expect(stylesSource).toContain('export const SearchInput');
    expect(stylesSource).toContain('export const RpgUnavailableState');
    expect(stylesSource).not.toContain('rgba(');
    expect(stylesSource).not.toContain('clamp(');
    expect(stylesSource).not.toMatch(/\u00E2/);
    expect(stylesSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);

    const searchBlock = stylesSource.slice(
      stylesSource.indexOf('export const SearchInput'),
      stylesSource.indexOf('export const SearchInput') + 520
    );
    expect(searchBlock).toContain('min-height: 44px');
  });

  it('does not preview Streak Fortress with fabricated freeze counts', () => {
    const source = read('trainer-gamification-view.tsx');

    expect(source).not.toContain('streakFreezes={0}');
    expect(source).not.toContain('maxFreezes={3}');
    expect(source).toContain('requires live streak-freeze data');
  });

  it('uses a synchronous guard for trainer point-award submissions', () => {
    const source = read('trainer-gamification-view.tsx');

    expect(source).toContain('const awardingPointsInFlightRef = useRef(false);');
    expect(source).toContain('if (awardingPointsInFlightRef.current) return;');
    expect(source).toContain('awardingPointsInFlightRef.current = true;');
    expect(source).toContain('awardingPointsInFlightRef.current = false;');
    expect(source).toContain('isTrainerPointAwardAllowed(award.points)');
  });

  it('uses a synchronous guard for trainer achievement-award submissions', () => {
    const source = read('trainer-gamification-view.tsx');

    expect(source).toContain('const awardingAchievementInFlightRef = useRef(false);');
    expect(source).toContain('if (awardingAchievementInFlightRef.current) return;');
    expect(source).toContain('awardingAchievementInFlightRef.current = true;');
    expect(source).toContain('awardingAchievementInFlightRef.current = false;');
  });

  it('keeps child components tokenized and free of inline styles', () => {
    const componentFiles = [
      'components/ClientTable.tsx',
      'components/AchievementGrid.tsx',
      'components/AwardPointsDialog.tsx',
      'components/AwardAchievementDialog.tsx',
    ];

    for (const fileName of componentFiles) {
      const source = read(fileName);
      expect(source).toContain("from './trainer-gamification-components.styles'");
      expect(source).not.toContain("import styled from 'styled-components'");
      expect(source).not.toContain('style={{');
      expect(source).not.toContain('rgba(');
      expect(source).not.toContain('transition: all');
      expect(source).not.toMatch(/color="#[0-9A-Fa-f]{3,8}"/);
      expect(source).not.toMatch(/\P{ASCII}/u);
      expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    }

    const stylesSource = optionalRead('components/trainer-gamification-components.styles.ts');
    const pointDialogSource = read('components/AwardPointsDialog.tsx');
    expect(stylesSource).toContain('export const ActionBtn');
    expect(stylesSource).toContain('min-height: 44px');
    expect(stylesSource).not.toContain('rgba(');
    expect(stylesSource).not.toContain('transition: all');
    expect(stylesSource).not.toMatch(/#[0-9A-Fa-f]{4}\b/);
    expect(stylesSource).not.toMatch(/#[0-9A-Fa-f]{8}\b/);
    expect(stylesSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(pointDialogSource).toContain('max: MAX_TRAINER_POINT_AWARD');
    expect(pointDialogSource).toContain('normalizeTrainerPointInput(event.target.value)');
  });
});
