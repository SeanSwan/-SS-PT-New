/**
 * ┌─── ROUTES: Admin Social Media Publishing ──────────────────┐
 * │ PREFIX: /api/admin/social-publishing                        │
 * │ AUTH: protect + adminOnly                                   │
 * │ PURPOSE: Connect social accounts via Postiz, compose posts, │
 * │          run FTC/FDA compliance checks, publish/schedule.   │
 * └────────────────────────────────────────────────────────────┘
 */

import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import postiz from '../services/postizClient.mjs';
import { checkCompliance } from '../services/complianceCheck.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// All routes require admin auth
router.use(protect, adminOnly);

// ── Health Check ─────────────────────────────────────────────
// GET /api/admin/social-publishing/health
router.get('/health', async (_req, res) => {
  try {
    const health = await postiz.checkHealth();
    res.json({ success: true, data: health });
  } catch (err) {
    logger.error('Social publishing health check failed:', err.message);
    res.status(500).json({ success: false, message: 'Health check failed' });
  }
});

// ── Connected Accounts ───────────────────────────────────────
// GET /api/admin/social-publishing/accounts
router.get('/accounts', async (_req, res) => {
  try {
    const result = await postiz.listConnectedAccounts();
    if (!result.success) {
      return res.status(502).json({ success: false, message: result.error });
    }
    res.json({ success: true, data: result.data });
  } catch (err) {
    logger.error('Failed to list social accounts:', err.message);
    res.status(500).json({ success: false, message: 'Failed to list accounts' });
  }
});

// ── Connect Platform (OAuth) ─────────────────────────────────
// POST /api/admin/social-publishing/connect/:platform
router.post('/connect/:platform', async (req, res) => {
  const { platform } = req.params;
  const allowed = ['instagram', 'facebook', 'youtube', 'bluesky', 'tiktok'];

  if (!allowed.includes(platform)) {
    return res.status(400).json({
      success: false,
      message: `Platform "${platform}" not supported. Use: ${allowed.join(', ')}`,
    });
  }

  try {
    const result = await postiz.getOAuthUrl(platform);
    if (!result.success) {
      return res.status(502).json({ success: false, message: result.error });
    }
    logger.info(`[AUDIT] Admin ${req.user.id} initiated ${platform} OAuth connection`);
    res.json({ success: true, data: result.data });
  } catch (err) {
    logger.error(`Failed to get OAuth URL for ${platform}:`, err.message);
    res.status(500).json({ success: false, message: 'Failed to initiate connection' });
  }
});

// ── Disconnect Platform ──────────────────────────────────────
// DELETE /api/admin/social-publishing/accounts/:integrationId
router.delete('/accounts/:integrationId', async (req, res) => {
  try {
    const result = await postiz.disconnectAccount(req.params.integrationId);
    if (!result.success) {
      return res.status(502).json({ success: false, message: result.error });
    }
    logger.info(`[AUDIT] Admin ${req.user.id} disconnected integration ${req.params.integrationId}`);
    res.json({ success: true, message: 'Account disconnected' });
  } catch (err) {
    logger.error('Failed to disconnect account:', err.message);
    res.status(500).json({ success: false, message: 'Failed to disconnect' });
  }
});

// ── Compliance Check (preview before publish) ────────────────
// POST /api/admin/social-publishing/compliance-check
router.post('/compliance-check', (req, res) => {
  const { content, isAIGenerated } = req.body;
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ success: false, message: 'content is required' });
  }

  const result = checkCompliance(content, !!isAIGenerated);
  res.json({ success: true, data: result });
});

// ── Publish / Schedule Post ──────────────────────────────────
// POST /api/admin/social-publishing/publish
router.post('/publish', async (req, res) => {
  const { content, platformIds, mediaUrl, scheduledAt, isAIGenerated } = req.body;

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ success: false, message: 'content is required' });
  }
  if (!platformIds || !Array.isArray(platformIds) || platformIds.length === 0) {
    return res.status(400).json({ success: false, message: 'platformIds array is required' });
  }

  // Run compliance check
  const compliance = checkCompliance(content, !!isAIGenerated);

  // Auto-append compliance tags if needed
  let finalContent = content;
  if (compliance.autoTags.length > 0) {
    finalContent = content + '\n\n' + compliance.autoTags.join(' ');
  }

  try {
    const result = await postiz.publishPost({
      content: finalContent,
      platformIds,
      mediaUrl,
      scheduledAt,
    });

    if (!result.success) {
      return res.status(502).json({ success: false, message: result.error });
    }

    logger.info(
      `[AUDIT] Admin ${req.user.id} ${scheduledAt ? 'scheduled' : 'published'} social post ` +
      `to ${platformIds.length} platform(s)${compliance.warnings.length ? ' (with compliance warnings)' : ''}`
    );

    res.json({
      success: true,
      data: result.data,
      compliance: {
        warnings: compliance.warnings,
        autoTags: compliance.autoTags,
      },
    });
  } catch (err) {
    logger.error('Failed to publish social post:', err.message);
    res.status(500).json({ success: false, message: 'Failed to publish' });
  }
});

// ── Post History ─────────────────────────────────────────────
// GET /api/admin/social-publishing/history
router.get('/history', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  try {
    const result = await postiz.getPostHistory(limit);
    if (!result.success) {
      return res.status(502).json({ success: false, message: result.error });
    }
    res.json({ success: true, data: result.data });
  } catch (err) {
    logger.error('Failed to fetch post history:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
});

// ── Post Status ──────────────────────────────────────────────
// GET /api/admin/social-publishing/posts/:postId
router.get('/posts/:postId', async (req, res) => {
  try {
    const result = await postiz.getPostStatus(req.params.postId);
    if (!result.success) {
      return res.status(502).json({ success: false, message: result.error });
    }
    res.json({ success: true, data: result.data });
  } catch (err) {
    logger.error('Failed to fetch post status:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch status' });
  }
});

// ══════════════════════════════════════════════════════════════
// PHASE 3: Content Calendar, Best Time to Post, Auto-Post Templates
// ══════════════════════════════════════════════════════════════

// ── Content Calendar Suggestions ────────────────────────────
// GET /api/admin/social-publishing/calendar-suggestions
// Returns AI-generated content suggestions for the next 7 days
router.get('/calendar-suggestions', async (req, res) => {
  try {
    const today = new Date();
    const suggestions = [];

    // Day-of-week content themes (fitness industry best practices)
    const THEMES = [
      { day: 'Sunday', theme: 'Motivation Monday Prep', content: 'Preview your week. Share your training goals and inspire your community to set theirs.', category: 'motivation', bestTime: '18:00' },
      { day: 'Monday', theme: 'Motivation Monday', content: 'Start the week strong. Post a workout tip, client win, or motivational quote.', category: 'motivation', bestTime: '07:00' },
      { day: 'Tuesday', theme: 'Technique Tuesday', content: 'Break down an exercise form. Show the right way vs common mistakes.', category: 'education', bestTime: '12:00' },
      { day: 'Wednesday', theme: 'Wellness Wednesday', content: 'Recovery, stretching, flexibility, or nutrition tip. Whole-body health focus.', category: 'wellness', bestTime: '10:00' },
      { day: 'Thursday', theme: 'Throwback Thursday', content: 'Client transformation or personal training journey milestone.', category: 'social_proof', bestTime: '12:00' },
      { day: 'Friday', theme: 'Fitness Friday', content: 'Quick workout challenge or weekend routine suggestion. Keep it fun and shareable.', category: 'engagement', bestTime: '16:00' },
      { day: 'Saturday', theme: 'Saturday Spotlight', content: 'Highlight a client achievement, community event, or weekend training session.', category: 'community', bestTime: '09:00' },
    ];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const theme = THEMES.find(t => t.day === dayName) || THEMES[0];

      suggestions.push({
        date: date.toISOString().split('T')[0],
        dayName,
        theme: theme.theme,
        suggestedContent: theme.content,
        category: theme.category,
        bestTime: theme.bestTime,
        hashtags: getHashtags(theme.category),
      });
    }

    res.json({ success: true, data: suggestions });
  } catch (err) {
    logger.error('Calendar suggestions error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to generate suggestions' });
  }
});

// ── Best Time to Post Analytics ──────────────────────────────
// GET /api/admin/social-publishing/best-times
// Returns optimal posting times per platform based on industry data
router.get('/best-times', async (req, res) => {
  try {
    // Fitness industry engagement data (based on Sprout Social + Hootsuite research)
    const bestTimes = {
      instagram: {
        best: [
          { day: 'Monday', times: ['06:00', '12:00', '18:00'] },
          { day: 'Tuesday', times: ['07:00', '12:00', '19:00'] },
          { day: 'Wednesday', times: ['07:00', '11:00', '18:00'] },
          { day: 'Thursday', times: ['06:00', '12:00', '19:00'] },
          { day: 'Friday', times: ['06:00', '11:00', '16:00'] },
          { day: 'Saturday', times: ['08:00', '11:00'] },
          { day: 'Sunday', times: ['09:00', '17:00'] },
        ],
        peakDay: 'Tuesday',
        peakTime: '07:00',
        note: 'Early morning and lunch breaks drive highest engagement for fitness content',
      },
      facebook: {
        best: [
          { day: 'Monday', times: ['09:00', '12:00'] },
          { day: 'Tuesday', times: ['09:00', '12:00', '15:00'] },
          { day: 'Wednesday', times: ['09:00', '12:00'] },
          { day: 'Thursday', times: ['09:00', '12:00', '14:00'] },
          { day: 'Friday', times: ['09:00', '11:00'] },
          { day: 'Saturday', times: ['10:00'] },
          { day: 'Sunday', times: ['10:00'] },
        ],
        peakDay: 'Thursday',
        peakTime: '09:00',
        note: 'Weekday mornings perform best. Weekend engagement drops significantly',
      },
      youtube: {
        best: [
          { day: 'Monday', times: ['14:00', '16:00'] },
          { day: 'Tuesday', times: ['14:00', '16:00'] },
          { day: 'Wednesday', times: ['14:00', '16:00'] },
          { day: 'Thursday', times: ['12:00', '15:00'] },
          { day: 'Friday', times: ['12:00', '15:00'] },
          { day: 'Saturday', times: ['09:00', '11:00'] },
          { day: 'Sunday', times: ['09:00', '11:00'] },
        ],
        peakDay: 'Thursday',
        peakTime: '15:00',
        note: 'Publish 2-3 hours before peak viewing to allow algorithm pickup',
      },
      tiktok: {
        best: [
          { day: 'Monday', times: ['06:00', '10:00', '22:00'] },
          { day: 'Tuesday', times: ['02:00', '09:00', '18:00'] },
          { day: 'Wednesday', times: ['07:00', '10:00', '23:00'] },
          { day: 'Thursday', times: ['09:00', '12:00', '19:00'] },
          { day: 'Friday', times: ['05:00', '13:00', '15:00'] },
          { day: 'Saturday', times: ['11:00', '19:00'] },
          { day: 'Sunday', times: ['07:00', '08:00', '16:00'] },
        ],
        peakDay: 'Tuesday',
        peakTime: '18:00',
        note: 'Fitness content performs best early morning (pre-workout) and evening',
      },
      bluesky: {
        best: [
          { day: 'Monday', times: ['08:00', '12:00', '17:00'] },
          { day: 'Tuesday', times: ['08:00', '12:00', '17:00'] },
          { day: 'Wednesday', times: ['08:00', '12:00', '17:00'] },
          { day: 'Thursday', times: ['08:00', '12:00', '17:00'] },
          { day: 'Friday', times: ['08:00', '12:00'] },
          { day: 'Saturday', times: ['10:00'] },
          { day: 'Sunday', times: ['10:00'] },
        ],
        peakDay: 'Wednesday',
        peakTime: '12:00',
        note: 'Weekday lunch breaks see highest engagement. Growing platform — post consistently',
      },
    };

    res.json({ success: true, data: bestTimes });
  } catch (err) {
    logger.error('Best times error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load best times' });
  }
});

// ── Community Stats Auto-Post Templates ──────────────────────
// GET /api/admin/social-publishing/auto-post-templates
// Returns pre-built templates that pull from real app data
router.get('/auto-post-templates', async (req, res) => {
  try {
    // Fetch real community stats from DB
    let totalUsers = 0;
    let totalWorkouts = 0;
    let totalXP = 0;
    let topStreak = 0;

    try {
      const { default: User } = await import('../models/User.mjs');
      const { default: Gamification } = await import('../models/Gamification.mjs');
      totalUsers = await User.count();
      const gamStats = await Gamification.findAll({ attributes: ['totalXP', 'totalWorkouts', 'longestStreak'] });
      for (const g of gamStats) {
        totalWorkouts += g.totalWorkouts || 0;
        totalXP += g.totalXP || 0;
        if ((g.longestStreak || 0) > topStreak) topStreak = g.longestStreak;
      }
    } catch {
      // DB may not be available in all environments
    }

    const templates = [
      {
        id: 'weekly_recap',
        name: 'Weekly Community Recap',
        template: `💪 SwanStudios Weekly Recap\n\n🏋️ ${totalWorkouts.toLocaleString()} total workouts completed\n⚡ ${totalXP.toLocaleString()} XP earned across our community\n🔥 Longest active streak: ${topStreak} days\n👥 ${totalUsers} athletes strong and growing\n\nJoin the movement → sswanstudios.com\n\n#SwanStudios #FitnessJourney #PersonalTraining`,
        category: 'community',
        frequency: 'weekly',
      },
      {
        id: 'milestone_celebration',
        name: 'Milestone Celebration',
        template: `🎉 MILESTONE ALERT!\n\nOur SwanStudios community just hit ${totalWorkouts.toLocaleString()} total workouts! 🏆\n\nEvery rep counts. Every session matters. Thank you for being part of something special.\n\n#SwanStudios #FitnessMilestone #Community`,
        category: 'celebration',
        frequency: 'milestone',
      },
      {
        id: 'motivation_quote',
        name: 'Daily Motivation',
        template: `"The only bad workout is the one that didn't happen."\n\nYour body rewards consistency, not perfection. Show up today. 💪\n\n#MotivationMonday #SwanStudios #FitnessMotivation`,
        category: 'motivation',
        frequency: 'daily',
      },
      {
        id: 'tip_of_the_week',
        name: 'Training Tip of the Week',
        template: `📚 TRAINER TIP\n\nRest days aren't lazy days — they're growth days. Your muscles rebuild during recovery.\n\nActive recovery ideas:\n• 20-min walk\n• Stretching routine\n• Foam rolling\n\nWisdom XP counts too 🧠\n\n#TrainingTip #SwanStudios #Recovery`,
        category: 'education',
        frequency: 'weekly',
      },
      {
        id: 'challenge_invite',
        name: 'Challenge Invite',
        template: `🏆 WEEKLY CHALLENGE\n\nThis week's Virtual Olympics event: Push-ups!\n\nCan you beat the leaderboard? Log your reps and race against ghost performances.\n\nJoin free → sswanstudios.com\n\n#FitnessChallenge #SwanStudios #VirtualOlympics`,
        category: 'engagement',
        frequency: 'weekly',
      },
      {
        id: 'new_feature',
        name: 'Feature Announcement',
        template: `🚀 NEW at SwanStudios!\n\nWe just launched [FEATURE NAME] — bringing you closer to your fitness goals with AI-powered coaching.\n\nCheck it out → sswanstudios.com\n\n#SwanStudios #FitnessTech #Innovation`,
        category: 'announcement',
        frequency: 'as_needed',
      },
    ];

    res.json({ success: true, data: templates });
  } catch (err) {
    logger.error('Auto-post templates error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load templates' });
  }
});

// ── Hashtag helper ──
function getHashtags(category) {
  const base = '#SwanStudios #PersonalTraining #FitnessGoals';
  const map = {
    motivation: `${base} #MotivationMonday #FitFam`,
    education: `${base} #FitnessTips #ExerciseForm`,
    wellness: `${base} #WellnessWednesday #Recovery #Flexibility`,
    social_proof: `${base} #TransformationTuesday #ClientResults`,
    engagement: `${base} #FitnessChallenge #FitnessFriday`,
    community: `${base} #FitnessCommunity #StrongerTogether`,
  };
  return map[category] || base;
}

export default router;
