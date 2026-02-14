#!/usr/bin/env node
/**
 * seed-gamification-mvp.mjs
 * =========================
 * Seeds MVP achievements from the gamification rewards catalog.
 * Reads docs/ai-workflow/gamification/gamification-rewards.catalog.v1.json
 * and creates Achievement records. Idempotent via findOrCreate by name.
 *
 * Usage: node backend/scripts/seed-gamification-mvp.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Import database and models
import db from '../database.mjs';
import { getAllModels } from '../models/index.mjs';

/**
 * Parse an unlock rule string into structured criteria.
 * Catalog format: "profile_completion == 100", "qualified_activity_count >= 1"
 */
function parseUnlockRule(ruleStr) {
  const match = ruleStr.match(/^(\w+)\s*(==|>=|<=|>|<)\s*(.+)$/);
  if (!match) return { raw: ruleStr };
  return {
    metric: match[1],
    operator: match[2],
    threshold: match[3].trim()
  };
}

/**
 * Map catalog category to Achievement model category enum.
 * Achievement categories: fitness, social, streak, milestone, special
 */
function mapCategory(catalogCategory) {
  const map = {
    user: 'milestone',
    client: 'fitness',
    trainer: 'special',
    creator: 'special',
    moderator: 'special'
  };
  return map[catalogCategory] || 'milestone';
}

/**
 * Map catalog rewardType to Achievement rarity.
 */
function mapRarity(rewardType, pointsRequired) {
  if (rewardType === 'honor' || rewardType === 'item') return 'legendary';
  if (rewardType === 'unlock' || rewardType === 'discount') return 'epic';
  if (pointsRequired > 100) return 'rare';
  return 'common';
}

async function seedMVPAchievements() {
  console.log('[Seed] Starting MVP gamification seed...');

  // Read catalog
  const catalogPath = resolve(__dirname, '../../docs/ai-workflow/gamification/gamification-rewards.catalog.v1.json');
  let catalog;
  try {
    const raw = readFileSync(catalogPath, 'utf-8');
    catalog = JSON.parse(raw);
  } catch (err) {
    console.error('[Seed] Failed to read catalog:', err.message);
    process.exit(1);
  }

  const mvpRewards = catalog.catalog.filter(r => r.phase === 'mvp' && r.enabled);
  console.log(`[Seed] Found ${mvpRewards.length} MVP rewards to seed.`);

  // Ensure DB connection
  try {
    await db.authenticate();
    console.log('[Seed] Database connected.');
  } catch (err) {
    console.error('[Seed] Database connection failed:', err.message);
    process.exit(1);
  }

  const { Achievement } = getAllModels();
  if (!Achievement) {
    console.error('[Seed] Achievement model not available.');
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;

  for (const reward of mvpRewards) {
    const unlockCriteria = (reward.unlockRules || []).map(parseUnlockRule);

    try {
      const [, wasCreated] = await Achievement.findOrCreate({
        where: { name: reward.code },
        defaults: {
          title: reward.title,
          name: reward.code,
          description: reward.description || `Achievement: ${reward.title}`,
          category: mapCategory(reward.category),
          rarity: mapRarity(reward.rewardType, reward.pointsRequired || 0),
          xpReward: reward.pointsRequired || 50,
          requiredPoints: reward.pointsRequired || 0,
          maxProgress: 1,
          progressUnit: 'completion',
          unlockConditions: {
            rules: unlockCriteria,
            issuance: reward.issuance,
            legacyId: reward.legacyId,
            rewardType: reward.rewardType
          },
          isActive: true,
          isHidden: false
        }
      });

      if (wasCreated) {
        created++;
        console.log(`  + Created: ${reward.code} — ${reward.title}`);
      } else {
        skipped++;
        console.log(`  = Exists:  ${reward.code} — ${reward.title}`);
      }
    } catch (err) {
      console.error(`  ! Failed:  ${reward.code} — ${err.message}`);
    }
  }

  console.log(`\n[Seed] Complete. Created: ${created}, Skipped: ${skipped}, Total: ${mvpRewards.length}`);
  await db.close();
}

seedMVPAchievements().catch(err => {
  console.error('[Seed] Fatal error:', err);
  process.exit(1);
});
