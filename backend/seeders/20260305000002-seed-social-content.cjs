'use strict';

/**
 * Seed starter social posts + challenges so the platform never looks empty.
 * Idempotent — checks for existing content before inserting.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── Find admin user ──────────────────────────────────────────────
    const [admins] = await queryInterface.sequelize.query(
      `SELECT id FROM "Users" WHERE role = 'admin' LIMIT 1;`
    );
    if (!admins.length) {
      console.log('⚠️  No admin user found — skipping social seed.');
      return;
    }
    const adminId = admins[0].id;

    // ── Seed Posts (idempotent) ───────────────────────────────────────
    const [existingPosts] = await queryInterface.sequelize.query(
      `SELECT COUNT(*) AS cnt FROM "SocialPosts" WHERE "userId" = ${adminId} AND "moderationNotes" = 'seed-content';`
    );
    if (parseInt(existingPosts[0].cnt) === 0) {
      const now = new Date().toISOString();
      await queryInterface.bulkInsert('SocialPosts', [
        {
          userId: adminId, type: 'general', visibility: 'public', moderationStatus: 'approved',
          moderationNotes: 'seed-content',
          content: "Welcome to SwanStudios! This is your fitness + creative community. Post workouts, share dance moves, drop your playlist — let's build something incredible together. 💪🎶🎨",
          createdAt: now, updatedAt: now,
        },
        {
          userId: adminId, type: 'workout', visibility: 'public', moderationStatus: 'approved',
          moderationNotes: 'seed-content',
          content: "Pro tip: Consistency beats intensity. A 20-minute workout you do every day is better than a 2-hour session once a week. Start small, stay consistent. 🔥",
          createdAt: now, updatedAt: now,
        },
        {
          userId: adminId, type: 'general', visibility: 'public', moderationStatus: 'approved',
          moderationNotes: 'seed-content',
          content: "NEW: Dance & Movement challenges are here! Whether you're into hip-hop, salsa, or freestyle — post your best moves and earn points. Let's see what you've got! 💃🕺",
          createdAt: now, updatedAt: now,
        },
        {
          userId: adminId, type: 'general', visibility: 'public', moderationStatus: 'approved',
          moderationNotes: 'seed-content',
          content: "Music lovers — share your workout playlist! Drop a link or tell us your top 3 songs that keep you grinding in the gym. 🎵🎧",
          createdAt: now, updatedAt: now,
        },
        {
          userId: adminId, type: 'general', visibility: 'public', moderationStatus: 'approved',
          moderationNotes: 'seed-content',
          content: "Art & Expression showcase every Friday! Share your fitness-inspired art, photography, or creative projects. This community celebrates ALL forms of self-expression. 🎨📸",
          createdAt: now, updatedAt: now,
        },
        {
          userId: adminId, type: 'general', visibility: 'public', moderationStatus: 'approved',
          moderationNotes: 'seed-content',
          content: "Gaming + Fitness crossover: Try the 30-Minute Challenge — 30 minutes of gaming followed by 30 minutes of exercise. Best of both worlds! 🎮💪",
          createdAt: now, updatedAt: now,
        },
        {
          userId: adminId, type: 'general', visibility: 'public', moderationStatus: 'approved',
          moderationNotes: 'seed-content',
          content: "Community meetups are coming soon! Stay tuned for local workout sessions, group hikes, and social events. Real connections, real community. 🤝🏔️",
          createdAt: now, updatedAt: now,
        },
        {
          userId: adminId, type: 'general', visibility: 'public', moderationStatus: 'approved',
          moderationNotes: 'seed-content',
          content: "Transformation Tuesday is every week! Share your progress photos, before/after, or just tell your story. You inspire someone every time you post. ✨",
          createdAt: now, updatedAt: now,
        },
      ]);
      console.log('✅ Seeded 8 starter social posts.');
    } else {
      console.log('ℹ️  Social posts already seeded — skipping.');
    }

    // ── Seed Challenges (idempotent) ─────────────────────────────────
    const [existingChallenges] = await queryInterface.sequelize.query(
      `SELECT COUNT(*) AS cnt FROM "challenges" WHERE "description" LIKE '%[seed]%';`
    );
    if (parseInt(existingChallenges[0].cnt) === 0) {
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const nowISO = now.toISOString();

      const { v4: uuidv4 } = require('uuid');
      await queryInterface.bulkInsert('challenges', [
        {
          id: uuidv4(),
          title: '7-Day Fitness Streak',
          description: 'Complete a workout every day for 7 days straight. Any workout counts! [seed]',
          category: 'fitness', challengeType: 'weekly', difficulty: 2,
          xpReward: 200,
          startDate: nowISO, endDate: weekFromNow,
          status: 'active', isPublic: true, isFeatured: true,
          maxParticipants: 500, currentParticipants: 0,
          createdBy: adminId, createdAt: nowISO, updatedAt: nowISO,
        },
        {
          id: uuidv4(),
          title: 'Post Your Best Dance Move',
          description: 'Share a video or photo of your best dance move. Any style — hip-hop, salsa, freestyle, you name it! [seed]',
          category: 'dance', challengeType: 'weekly', difficulty: 1,
          xpReward: 150,
          startDate: nowISO, endDate: weekFromNow,
          status: 'active', isPublic: true, isFeatured: true,
          maxParticipants: 500, currentParticipants: 0,
          createdBy: adminId, createdAt: nowISO, updatedAt: nowISO,
        },
        {
          id: uuidv4(),
          title: 'Share Your Workout Playlist',
          description: 'Drop your top 5 workout songs in a post. Bonus points for songs nobody else picks! [seed]',
          category: 'music', challengeType: 'weekly', difficulty: 1,
          xpReward: 100,
          startDate: nowISO, endDate: weekFromNow,
          status: 'active', isPublic: true, isFeatured: false,
          maxParticipants: 500, currentParticipants: 0,
          createdBy: adminId, createdAt: nowISO, updatedAt: nowISO,
        },
        {
          id: uuidv4(),
          title: 'Create Fan Art Friday',
          description: 'Create and share fitness-inspired art, digital or physical. Photography, drawings, edits — all welcome! [seed]',
          category: 'art', challengeType: 'weekly', difficulty: 2,
          xpReward: 200,
          startDate: nowISO, endDate: weekFromNow,
          status: 'active', isPublic: true, isFeatured: false,
          maxParticipants: 500, currentParticipants: 0,
          createdBy: adminId, createdAt: nowISO, updatedAt: nowISO,
        },
        {
          id: uuidv4(),
          title: '30-Min Gaming + 30-Min Workout',
          description: 'Balance your screen time! Log 30 minutes of gaming AND 30 minutes of exercise in the same day. [seed]',
          category: 'gaming', challengeType: 'monthly', difficulty: 3,
          xpReward: 300,
          startDate: nowISO, endDate: monthFromNow,
          status: 'active', isPublic: true, isFeatured: true,
          maxParticipants: 500, currentParticipants: 0,
          createdBy: adminId, createdAt: nowISO, updatedAt: nowISO,
        },
      ]);
      console.log('✅ Seeded 5 starter challenges.');
    } else {
      console.log('ℹ️  Challenges already seeded — skipping.');
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM "SocialPosts" WHERE "moderationNotes" = 'seed-content';`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM "challenges" WHERE "description" LIKE '%[seed]%';`
    );
  },
};
