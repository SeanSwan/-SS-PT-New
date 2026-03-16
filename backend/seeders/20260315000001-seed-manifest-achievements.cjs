'use strict';

/**
 * Seed: 242 Achievements from Badge Manifest
 * ===========================================
 * Single source of truth: scripts/achievement-badge-manifest.json
 * Each template = 1 database row (no tier expansion).
 * Badge image paths stored in tags JSONB.
 *
 * Non-destructive: uses updateOnDuplicate to preserve UserAchievements FK refs.
 * Wrapped in transaction to prevent partial seeds.
 *
 * Crystalline Swan Tier System:
 *   Tier 1: Cygnus Initiate     — Midnight Sapphire #002060
 *   Tier 2: Frostwing Ascendant — Ice Wing #60C0F0
 *   Tier 3: Gilded Sovereign    — Gilded Fern #C6A84B
 *   Tier 4: Amethyst Apex       — Wing Purple #8B5CF6
 *   Tier 5: Crystalline Swan    — Frost White #E0ECF4 + animated aura
 */

const path = require('path');
const fs = require('fs');

// ─── XP defaults by category ───
const XP_BY_CATEGORY = {
  milestone: 50,
  fitness: 60,
  social: 30,
  streak: 75,
  special: 100,
  community: 40,
  mixed: 80,
};

// ─── Rarity assignment based on achievement difficulty ───
function assignRarity(name) {
  // Legendary: highest-tier achievements
  const legendaryPatterns = [
    /count_1000/, /count_500$/, /weight_500k/, /reps_100k/,
    /streak_365/, /streak_180/, /grandmaster/, /legend$/i,
    /crystalline/, /all_trees/, /total_weight_500k/,
  ];
  if (legendaryPatterns.some(p => p.test(name))) return 'legendary';

  // Epic: high-tier achievements
  const epicPatterns = [
    /count_250/, /count_100$/, /weight_100k/, /reps_50k/,
    /streak_90/, /streak_60/, /record_50/, /record_25/,
    /sets_5000/, /cert_progress_100/, /module_50/, /module_40/,
    /quiz_50/, /study_streak_30/, /progress_25$/, /count_100_/,
    /elite/i, /master$/i, /champion/i, /dominator/i,
  ];
  if (epicPatterns.some(p => p.test(name))) return 'epic';

  // Rare: mid-tier achievements
  const rarePatterns = [
    /count_50/, /count_25/, /weight_50k/, /reps_10k/,
    /streak_30/, /streak_14/, /record_10/, /record_5/,
    /sets_2000/, /cert_progress_75/, /cert_progress_50/,
    /module_25/, /module_20/, /module_15/, /module_10/,
    /quiz_25/, /quiz_10/, /study_streak_14/, /study_streak_7/,
    /variety_30/, /variety_20/, /progress_10/,
    /refer_5/, /refer_3/, /follower.*50/, /following.*50/,
    /received_100/, /received_50/, /given_100/, /given_50/,
    /count_50_/, /count_25_/,
    /pro$/i, /veteran/i, /collector/i,
  ];
  if (rarePatterns.some(p => p.test(name))) return 'rare';

  return 'common';
}

// ─── Progress unit inference from name ───
function inferProgressUnit(name) {
  if (/streak|consecutive|days/.test(name)) return 'days';
  if (/workout|session/.test(name)) return 'workouts';
  if (/reps/.test(name)) return 'custom';
  if (/sets/.test(name)) return 'custom';
  if (/weight/.test(name)) return 'custom';
  if (/exercise|variety/.test(name)) return 'exercises';
  if (/module|quiz|tutorial|cert/.test(name)) return 'completion';
  if (/xp_/.test(name)) return 'points';
  return 'completion';
}

// ─── Max progress inference from name (largest-number heuristic) ───
function inferMaxProgress(name) {
  // Extract ALL numbers from name, pick the largest
  const numbers = name.match(/(\d+)k?/g);
  if (numbers && numbers.length > 0) {
    const values = numbers.map(n => {
      const hasK = n.endsWith('k');
      const num = parseInt(n.replace('k', ''), 10);
      return hasK ? num * 1000 : num;
    });
    return Math.max(...values);
  }

  // Fallback: single-completion achievements
  return 1;
}

// ─── XP scaling by rarity ───
const XP_MULTIPLIER = {
  common: 1,
  rare: 2,
  epic: 4,
  legendary: 10,
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ─── Read manifest ───
    const manifestPath = path.resolve(__dirname, '../../scripts/achievement-badge-manifest.json');
    if (!fs.existsSync(manifestPath)) {
      console.warn('[Badge Seeder] Manifest not found, skipping');
      return;
    }

    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch (err) {
      console.error('[Badge Seeder] Failed to parse manifest:', err.message);
      return;
    }

    const templates = manifest?.templates;
    if (!templates || templates.length === 0) {
      console.warn('[Badge Seeder] No templates found in manifest, skipping');
      return;
    }

    console.log(`[Badge Seeder] Processing ${templates.length} achievement templates...`);

    // ─── Build rows ───
    const now = new Date();
    const rows = [];
    const treeCounters = {};

    templates.forEach((tpl) => {
      const rarity = assignRarity(tpl.name);
      const effectiveCategory = tpl.category === 'hidden' ? 'special' : tpl.category;
      const baseXp = XP_BY_CATEGORY[effectiveCategory] || 50;
      const xpReward = Math.round(baseXp * (XP_MULTIPLIER[rarity] || 1));
      const progressUnit = inferProgressUnit(tpl.name);
      const maxProgress = inferMaxProgress(tpl.name);
      const isHiddenAchievement = tpl.category === 'hidden';

      // Determine skill tree order within tree
      const tree = tpl.skillTree || 'none';
      treeCounters[tree] = (treeCounters[tree] || 0) + 1;
      const skillTreeOrder = treeCounters[tree];

      // Image paths
      const imagePaths = {
        claymation: `/badges/achievements/${tpl.name}_claymation.png`,
        glass: `/badges/achievements/${tpl.name}_glass.png`,
        metallic: `/badges/achievements/${tpl.name}_metallic.png`,
      };

      rows.push({
        name: tpl.name,
        title: tpl.title,
        description: tpl.description,
        iconEmoji: tpl.emoji || '🏆',
        category: ['fitness', 'social', 'streak', 'milestone', 'special', 'community'].includes(effectiveCategory)
          ? effectiveCategory
          : 'special',
        rarity,
        xpReward,
        maxProgress,
        progressUnit,
        requiredPoints: 0,
        requirements: JSON.stringify([]),
        tags: JSON.stringify({
          skillTree: tpl.skillTree,
          skillTreeOrder,
          templateId: tpl.name,
          tierLevel: 1,
          images: imagePaths,
        }),
        skillTree: tpl.skillTree || null,
        skillTreeOrder,
        templateId: tpl.name,
        tierLevel: 1,
        difficulty: rarity === 'legendary' ? 5 : rarity === 'epic' ? 4 : rarity === 'rare' ? 3 : 1,
        targetRoles: JSON.stringify(['user', 'client']),
        rewardType: 'badge',
        issuance: 'auto',
        rewards: JSON.stringify([{ type: 'badge', value: tpl.name, description: tpl.title }]),
        isActive: true,
        isHidden: isHiddenAchievement,
        isSecret: isHiddenAchievement,
        createdAt: now,
        updatedAt: now,
      });
    });

    // ─── Upsert in batches inside a transaction ───
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const BATCH_SIZE = 50;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        await queryInterface.bulkInsert('Achievements', batch, {
          transaction,
          updateOnDuplicate: [
            'title', 'description', 'iconEmoji', 'category', 'rarity',
            'xpReward', 'maxProgress', 'progressUnit', 'requirements',
            'tags', 'skillTree', 'skillTreeOrder', 'templateId',
            'tierLevel', 'difficulty', 'targetRoles', 'rewardType',
            'issuance', 'rewards', 'isActive', 'isHidden', 'isSecret',
            'updatedAt',
          ],
        });
      }

      await transaction.commit();
      console.log(`[Badge Seeder] Upserted ${rows.length} achievements (${templates.length} templates)`);
    } catch (err) {
      await transaction.rollback();
      console.error('[Badge Seeder] Transaction rolled back:', err.message);
      throw err;
    }

    // ─── Summary ───
    const byTree = {};
    rows.forEach(r => {
      const tree = r.skillTree || 'none';
      byTree[tree] = (byTree[tree] || 0) + 1;
    });
    console.log('[Badge Seeder] By skill tree:', JSON.stringify(byTree));

    const byRarity = {};
    rows.forEach(r => {
      byRarity[r.rarity] = (byRarity[r.rarity] || 0) + 1;
    });
    console.log('[Badge Seeder] By rarity:', JSON.stringify(byRarity));
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Achievements', null, {});
  },
};
