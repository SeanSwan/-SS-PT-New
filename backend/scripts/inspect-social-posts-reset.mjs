#!/usr/bin/env node
/**
 * Social fresh-start reset — READ-ONLY inventory probe
 * ====================================================
 * Lists every SocialPosts row with dependent counts so Sean can pick the
 * single keeper post (his art/picture post) before the gated reset runs.
 * Diagnostic helper — read-only. No writes, no deletes.
 * Launch-fresh-start slice 2026-07-14.
 */

import 'dotenv/config';
import sequelize from '../database.mjs';

function snip(text, n = 60) {
  if (!text) return '';
  const clean = String(text).replace(/\s+/g, ' ').trim();
  return clean.length > n ? `${clean.slice(0, n)}…` : clean;
}

async function main() {
  await sequelize.authenticate();

  // 1. PK type sanity (migration history shows a UUID→INTEGER rebuild).
  const [pk] = await sequelize.query(
    `SELECT column_name AS cname, data_type AS dtype
     FROM information_schema.columns
     WHERE table_schema='public' AND table_name='SocialPosts' AND column_name='id'`
  );
  console.log(`SocialPosts.id type: ${pk[0]?.dtype ?? 'TABLE MISSING'}`);

  // 2. Full post inventory with dependent counts.
  const [posts] = await sequelize.query(
    `SELECT p.id, p."userId", u.username, u.role, p.type, p.visibility,
            p."moderationStatus", p."moderationNotes",
            (p."mediaUrl" IS NOT NULL) AS has_media, p."mediaType",
            p."createdAt", left(p.content, 80) AS content_head,
            (SELECT count(*) FROM "SocialComments" c WHERE c."postId" = p.id) AS comments,
            (SELECT count(*) FROM "SocialLikes" l WHERE l."targetType"='post' AND l."targetId" = p.id) AS likes,
            (SELECT count(*) FROM "PostReports" r WHERE r."contentType"='post' AND r."contentId" = p.id) AS reports,
            (SELECT count(*) FROM "PostHashtags" h WHERE h."postId" = p.id) AS hashtags
     FROM "SocialPosts" p
     LEFT JOIN "Users" u ON u.id = p."userId"
     ORDER BY p."createdAt" ASC`
  );
  console.log(`\nTOTAL POSTS: ${posts.length}`);
  for (const p of posts) {
    const media = p.has_media ? `MEDIA(${p.mediaType ?? '?'})` : 'text-only';
    const seed = p.moderationNotes === 'seed-content' ? ' [SEED]' : '';
    console.log(
      `  #${String(p.id).padEnd(5)} u${String(p.userId).padEnd(4)} ${String(p.role ?? '?').padEnd(7)} ` +
      `${String(p.type).padEnd(11)} ${media.padEnd(12)} ${new Date(p.createdAt).toISOString().slice(0, 10)}${seed} ` +
      `c:${p.comments} l:${p.likes} r:${p.reports} h:${p.hashtags}\n` +
      `         "${snip(p.content_head)}"`
    );
  }

  // 3. Keeper candidates: image posts (the art post has a picture).
  const keepers = posts.filter((p) => p.has_media);
  console.log(`\nKEEPER CANDIDATES (posts with media): ${keepers.length}`);
  for (const p of keepers) {
    console.log(`  → post #${p.id} by userId ${p.userId} (${p.username ?? 'unknown'}), type=${p.type}, ${new Date(p.createdAt).toISOString().slice(0, 10)}`);
  }

  // 4. Orphan-prone dependents grand totals (polymorphic — no FK cascade).
  const [[likeTotal]] = await sequelize.query(`SELECT count(*) AS n FROM "SocialLikes"`);
  const [[reportTotal]] = await sequelize.query(`SELECT count(*) AS n FROM "PostReports"`);
  const [[commentTotal]] = await sequelize.query(`SELECT count(*) AS n FROM "SocialComments"`);
  console.log(`\nDEPENDENT TABLE TOTALS: comments=${commentTotal.n} likes=${likeTotal.n} reports=${reportTotal.n}`);

  // 5. Parallel enhanced table — is it live?
  const [enh] = await sequelize.query(
    `SELECT to_regclass('public."EnhancedSocialPosts"') AS reg`
  );
  if (enh[0]?.reg) {
    const [[enhCount]] = await sequelize.query(`SELECT count(*) AS n FROM "EnhancedSocialPosts"`);
    console.log(`EnhancedSocialPosts rows: ${enhCount.n}`);
  } else {
    console.log('EnhancedSocialPosts table: absent');
  }

  await sequelize.close();
}

main().catch((err) => {
  console.error('inspect-social-posts-reset failed:', err.message);
  process.exit(1);
});
