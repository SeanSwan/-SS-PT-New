import { describe, expect, it } from 'vitest';
import {
  SKILL_TREE_DISPLAY,
  calculateLevel,
  getLevelProgress,
  getRankTitles,
  getTier,
  getTierDisplay,
  pointsForLevel,
} from './gamification';

const retiredPublicLabels = [
  'Bronze Forge',
  'Silver Edge',
  'Titanium Core',
  'Obsidian Warrior',
  'Cygnus Initiate',
  'Frostwing Ascendant',
  'Gilded Sovereign',
  'Amethyst Apex',
];

const retiredSkillTreeCopy = [
  'The Awakening',
  'The Forge',
  'Coachcraft Forge',
  'Iron and Gravity',
  'The Tribe',
  'The Free Spirit',
  'The Unbroken',
  'Holistic wellness',
];

describe('frontend gamification level contract', () => {
  it('matches the backend Level 1 starting contract and first Swan rank', () => {
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(10)).toBe(1);
    expect(getTier(calculateLevel(0))).toBe('first_flight');
    expect(getTierDisplay(getTier(1)).name).toBe('First Flight');
  });

  it('mirrors the approved exact 100-rank ladder', () => {
    const titles = getRankTitles();

    expect(titles).toHaveLength(100);
    expect(titles[0]).toMatchObject({ key: 'first_flight', name: 'First Flight', minLevel: 1, maxLevel: 10 });
    expect(titles[1]).toMatchObject({ key: 'swan_initiate', name: 'Swan Initiate', minLevel: 11, maxLevel: 20 });
    expect(titles[50]).toMatchObject({ key: 'aurelian_canopy', name: 'Aurelian Canopy', minLevel: 501, maxLevel: 510 });
    expect(titles[80]).toMatchObject({ key: 'sapphire_tide', name: 'Sapphire Tide', minLevel: 801, maxLevel: 810 });
    expect(titles[98]).toMatchObject({ key: 'apex_crystalline_swan', name: 'Apex Crystalline Swan', minLevel: 981, maxLevel: 990 });
    expect(titles[99]).toMatchObject({ key: 'eternal_crystalline_swan', name: 'Eternal Crystalline Swan', minLevel: 991, maxLevel: 1000, color: 'var(--accent-primary, #60C0F0)' });
  });

  it('keeps retired public rank labels out of the active Swan ladder', () => {
    const rankNames = getRankTitles().map((rank) => rank.name);

    retiredPublicLabels.forEach((label) => {
      expect(rankNames).not.toContain(label);
    });
    expect(rankNames).toContain('Frostwing Vanguard');
    expect(getTierDisplay('frostwing_ascendant').name).toBe('Frostwing Vanguard');
  });

  it('changes rank names every 10 levels and caps overflow at Eternal Crystalline Swan', () => {
    expect(getTier(1)).toBe('first_flight');
    expect(getTier(10)).toBe('first_flight');
    expect(getTier(11)).toBe('swan_initiate');
    expect(getTier(100)).toBe('first_crest');
    expect(getTier(101)).toBe('riverwing');
    expect(getTier(500)).toBe('amethyst_sovereign');
    expect(getTier(501)).toBe('aurelian_canopy');
    expect(getTier(900)).toBe('sapphire_paragon');
    expect(getTier(901)).toBe('celestial_swan');
    expect(getTier(990)).toBe('apex_crystalline_swan');
    expect(getTier(991)).toBe('eternal_crystalline_swan');
    expect(getTier(1000)).toBe('eternal_crystalline_swan');
    expect(getTier(1001)).toBe('eternal_crystalline_swan');
  });

  it('caps calculated levels at 1000 and renders complete max-level progress', () => {
    expect(calculateLevel(pointsForLevel(1001))).toBe(1000);

    const progress = getLevelProgress(pointsForLevel(1000));

    expect(progress.level).toBe(1000);
    expect(progress.tier).toBe('eternal_crystalline_swan');
    expect(progress.tierDisplay.name).toBe('Eternal Crystalline Swan');
    expect(progress.pointsNeededForNext).toBe(0);
    expect(progress.progressPercent).toBe(100);
    expect(progress.nextLevelAt).toBe(pointsForLevel(1000));
  });

  it('keeps the visible next-level progress non-negative for empty profiles', () => {
    const progress = getLevelProgress(0);

    expect(pointsForLevel(1)).toBe(0);
    expect(progress.level).toBe(1);
    expect(progress.pointsIntoLevel).toBe(0);
    expect(progress.pointsNeededForNext).toBe(400);
    expect(progress.progressPercent).toBe(0);
  });

  it('uses Swan biome workout copy for visible skill trees', () => {
    expect(SKILL_TREE_DISPLAY).toMatchObject({
      awakening: { name: 'Dawnflight Path', description: 'First wins, profile setup, and launch milestones' },
      forge_nasm: { name: 'Coachcraft Grove', description: 'Technique study, coaching knowledge, and certification progress' },
      iron_gravity: { name: 'Ironwood Flight', description: 'Workout logs, PRs, strength, and conditioning' },
      tribe_social: { name: 'Flock Council', description: 'Team support, posts, groups, and community boosts' },
      free_spirit: { name: 'Vitality Grove', description: 'Nutrition, recovery, flexibility, sleep, and daily health habits' },
      unbroken_streaks: { name: 'Evergreen Current', description: 'Consistency chains, comeback arcs, and long-term discipline' },
    });

    const visibleCopy = Object.values(SKILL_TREE_DISPLAY).flatMap((tree) => [tree.name, tree.description]).join(' ');
    retiredSkillTreeCopy.forEach((label) => {
      expect(visibleCopy).not.toContain(label);
    });
  });

  it('maps legacy public tier keys to the new Swan rank language', () => {
    const legacyDisplays = [
      getTierDisplay('bronze_forge'),
      getTierDisplay('silver_edge'),
      getTierDisplay('titanium_core'),
      getTierDisplay('obsidian_warrior'),
      getTierDisplay('crystalline_swan'),
    ];

    legacyDisplays.forEach((display) => {
      expect(retiredPublicLabels).not.toContain(display.name);
    });

    expect(getTierDisplay('bronze_forge').name).toBe('First Flight');
    expect(getTierDisplay('silver_edge').name).toBe('Riverwing');
    expect(getTierDisplay('titanium_core').name).toBe('Iron Grove');
    expect(getTierDisplay('obsidian_warrior').name).toBe('Frostwing Aegis');
    expect(getTierDisplay('crystalline_swan').name).toBe('Grand Crystalline Swan');
  });

  it('normalizes legacy human tier labels before display', () => {
    expect(getTierDisplay('Bronze Forge').name).toBe('First Flight');
    expect(getTierDisplay('Silver Edge').name).toBe('Riverwing');
    expect(getTierDisplay('Titanium Core').name).toBe('Iron Grove');
    expect(getTierDisplay('Obsidian Warrior').name).toBe('Frostwing Aegis');
    expect(getTierDisplay('Sapphire Tide').name).toBe('Sapphire Tide');
  });
});
