#!/usr/bin/env node
/**
 * Social fresh-start reset — Sean-gated DESTRUCTIVE script
 * ========================================================
 * Deletes every SocialPosts row EXCEPT the keeper post(s), including the
 * polymorphic dependents that DB cascades do NOT cover (SocialLikes,
 * PostReports, comment-likes) and the R2 media object of deleted posts.
 *
 * SAFETY MODEL
 *   - DRY-RUN by default: prints the exact delete plan, touches nothing.
 *   - Execution requires BOTH:
 *       --keep <id[,id...]>            explicit keeper post id(s)
 *       --execute RESET-SOCIAL-POSTS   the literal confirm phrase
 *   - All row deletes run in ONE transaction; R2 media cleanup runs only
 *     after the transaction commits (best-effort, per deleted media post).
 *   - Refuses to run if a keeper id does not exist.
 *
 * Usage:
 *   node scripts/reset-social-posts-fresh-start.mjs --keep 40              # dry-run
 *   node scripts/reset-social-posts-fresh-start.mjs --keep 40 --execute RESET-SOCIAL-POSTS
 */

import 'dotenv/config';
import sequelize from '../database.mjs';

function parseArgs(argv) {
  const args = { keep: [], execute: null };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--keep' && argv[i + 1]) {
      args.keep = argv[i + 1].split(',').map((s) => parseInt(s.trim(), 10)).filter(Number.isInteger);
      i += 1;
    } else if (argv[i] === '--execute' && argv[i + 1]) {
      args.execute = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

async function main() {
  const { keep, execute } = parseArgs(process.argv);
  if (keep.length === 0) {
    console.error('Refusing to run: --keep <postId[,postId...]> is required (the post(s) to preserve).');
    process.exit(1);
  }
  const live = execute === 'RESET-SOCIAL-POSTS';
  if (execute && !live) {
    console.error('Refusing to run: --execute value must be the literal phrase RESET-SOCIAL-POSTS.');
    process.exit(1);
  }

  await sequelize.authenticate();

  const [keepers] = await sequelize.query(
    `SELECT id, "userId", type, ("mediaUrl" IS NOT NULL) AS has_media, left(content, 60) AS head
     FROM "SocialPosts" WHERE id IN (:keep)`,
    { replacements: { keep } }
  );
  if (keepers.length !== keep.length) {
    const found = new Set(keepers.map((k) => k.id));
    console.error(`Refusing to run: keeper id(s) not found: ${keep.filter((id) => !found.has(id)).join(', ')}`);
    process.exit(1);
  }
  console.log('KEEPERS:');
  for (const k of keepers) console.log(`  #${k.id} u${k.userId} ${k.type} media=${k.has_media} "${k.head}"`);

  const [victims] = await sequelize.query(
    `SELECT id, "mediaUrl" FROM "SocialPosts" WHERE id NOT IN (:keep) ORDER BY id`,
    { replacements: { keep } }
  );
  if (victims.length === 0) {
    console.log('Nothing to delete — only keeper posts exist.');
    await sequelize.close();
    return;
  }
  const victimIds = victims.map((v) => v.id);
  console.log(`\nDELETE PLAN: ${victims.length} posts → ${victimIds.join(', ')}`);

  // Count dependents up front (report either way).
  const [[likeN]] = await sequelize.query(
    `SELECT count(*) AS n FROM "SocialLikes" WHERE "targetType"='post' AND "targetId" IN (:v)`,
    { replacements: { v: victimIds } }
  );
  const [comments] = await sequelize.query(
    `SELECT id FROM "SocialComments" WHERE "postId" IN (:v)`,
    { replacements: { v: victimIds } }
  );
  const commentIds = comments.map((c) => c.id);
  const [[reportN]] = await sequelize.query(
    `SELECT count(*) AS n FROM "PostReports" WHERE "contentType"='post' AND "contentId" IN (:v)`,
    { replacements: { v: victimIds } }
  );
  const [[hashN]] = await sequelize.query(
    `SELECT count(*) AS n FROM "PostHashtags" WHERE "postId" IN (:v)`,
    { replacements: { v: victimIds } }
  );
  const mediaVictims = victims.filter((v) => v.mediaUrl);
  console.log(`  dependents: post-likes=${likeN.n} comments=${commentIds.length} comment-reports+post-reports=${reportN.n} hashtag-links=${hashN.n} media-objects=${mediaVictims.length}`);

  if (!live) {
    console.log('\nDRY-RUN — nothing deleted. Re-run with: --execute RESET-SOCIAL-POSTS');
    await sequelize.close();
    return;
  }

  console.log('\nEXECUTING inside one transaction…');
  await sequelize.transaction(async (t) => {
    const q = (sql, replacements) => sequelize.query(sql, { replacements, transaction: t });
    // 1. Polymorphic orphans first (no FK cascade covers these).
    await q(`DELETE FROM "PostReports" WHERE "contentType"='post' AND "contentId" IN (:v)`, { v: victimIds });
    await q(`DELETE FROM "SocialLikes" WHERE "targetType"='post' AND "targetId" IN (:v)`, { v: victimIds });
    if (commentIds.length > 0) {
      await q(`DELETE FROM "PostReports" WHERE "contentType"='comment' AND "contentId" IN (:c)`, { c: commentIds });
      await q(`DELETE FROM "SocialLikes" WHERE "targetType"='comment' AND "targetId" IN (:c)`, { c: commentIds });
    }
    // 2. Hashtag usage counters (PostHashtags rows cascade with the post).
    await q(
      `UPDATE "Hashtags" h SET "usageCount" = GREATEST(h."usageCount" - sub.n, 0),
                               "weeklyCount" = GREATEST(h."weeklyCount" - sub.n, 0)
       FROM (SELECT "hashtagId", count(*) AS n FROM "PostHashtags" WHERE "postId" IN (:v) GROUP BY "hashtagId") sub
       WHERE h.id = sub."hashtagId"`,
      { v: victimIds }
    );
    // 3. The posts (SocialComments + PostHashtags cascade at DB level).
    await q(`DELETE FROM "SocialPosts" WHERE id IN (:v)`, { v: victimIds });
  });
  console.log('Transaction committed.');

  // 4. Best-effort R2 media cleanup (post-commit; a storage failure must not undo the reset).
  if (mediaVictims.length > 0) {
    const { storageKeyFromMediaUrl } = await import('../services/social/socialPostDeletionCleanupService.mjs');
    const { deletePhoto } = await import('../services/photoStorageService.mjs');
    for (const v of mediaVictims) {
      const key = storageKeyFromMediaUrl(v.mediaUrl);
      if (!key) continue;
      try {
        await deletePhoto(key);
        console.log(`  media deleted: post #${v.id} (${key})`);
      } catch (err) {
        console.warn(`  media cleanup FAILED (non-fatal) for post #${v.id}: ${err.message}`);
      }
    }
  }

  const [[remaining]] = await sequelize.query(`SELECT count(*) AS n FROM "SocialPosts"`);
  console.log(`\nDONE. SocialPosts remaining: ${remaining.n} (expected ${keep.length}).`);
  await sequelize.close();
}

main().catch((err) => {
  console.error('reset-social-posts-fresh-start failed:', err.message);
  process.exit(1);
});
