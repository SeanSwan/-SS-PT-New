/**
 * ============================================================================
 * FILE: 20260324-seed-official-hashtags.mjs
 * PURPOSE: Seed official/curated hashtags for the SwanStudios social platform
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Creates 32 official hashtags across fitness, creative,
 * and community categories. These are pre-seeded so the platform has
 * discoverable tags from day one.
 */

import Hashtag from '../models/social/Hashtag.mjs';

const SEED_HASHTAGS = [
  // Fitness (14 tags)
  { name: 'fitness', category: 'fitness' },
  { name: 'legday', category: 'fitness' },
  { name: 'chestday', category: 'fitness' },
  { name: 'backday', category: 'fitness' },
  { name: 'armday', category: 'fitness' },
  { name: 'personalrecord', category: 'fitness' },
  { name: 'transformation', category: 'fitness' },
  { name: 'nutrition', category: 'fitness' },
  { name: 'stretching', category: 'fitness' },
  { name: 'bootcamp', category: 'fitness' },
  { name: 'hiit', category: 'fitness' },
  { name: 'cardio', category: 'fitness' },
  { name: 'strength', category: 'fitness' },
  { name: 'mobility', category: 'fitness' },

  // Creative (10 tags)
  { name: 'dance', category: 'creative' },
  { name: 'music', category: 'creative' },
  { name: 'singing', category: 'creative' },
  { name: 'art', category: 'creative' },
  { name: 'gaming', category: 'creative' },
  { name: 'comedy', category: 'creative' },
  { name: 'photography', category: 'creative' },
  { name: 'hiphop', category: 'creative' },
  { name: 'freestyle', category: 'creative' },
  { name: 'beats', category: 'creative' },

  // Community (8 tags)
  { name: 'swanstudios', category: 'community' },
  { name: 'swanfam', category: 'community' },
  { name: 'meetup', category: 'community' },
  { name: 'motivation', category: 'community' },
  { name: 'accountability', category: 'community' },
  { name: 'goals', category: 'community' },
  { name: 'challenge', category: 'community' },
  { name: 'newmember', category: 'community' },
];

async function seedOfficialHashtags() {
  console.log('🏷️  Seeding official hashtags...');
  let created = 0;
  let skipped = 0;

  for (const tag of SEED_HASHTAGS) {
    try {
      const [, wasCreated] = await Hashtag.findOrCreate({
        where: { name: tag.name },
        defaults: {
          name: tag.name,
          slug: tag.name,
          category: tag.category,
          isOfficial: true,
          isBanned: false,
          usageCount: 0,
          weeklyCount: 0
        }
      });
      if (wasCreated) {
        created++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.warn(`  ⚠️  Skipped hashtag "${tag.name}": ${err.message}`);
      skipped++;
    }
  }

  console.log(`  ✅ Hashtags: ${created} created, ${skipped} already existed`);
  return { created, skipped };
}

// Run directly if called as script
if (process.argv[1] && process.argv[1].includes('seed-official-hashtags')) {
  seedOfficialHashtags()
    .then(() => process.exit(0))
    .catch((err) => { console.error(err); process.exit(1); });
}

export default seedOfficialHashtags;
