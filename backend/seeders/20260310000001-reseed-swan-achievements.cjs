'use strict';

/**
 * Reseed: Swan-Themed Gamification Achievements
 * =============================================
 * Wipes ALL duplicate achievements and reseeds with a clean,
 * comprehensive, Swan-branded achievement system.
 *
 * Tier System (Crystalline Swan — designed by Gemini 3.1 Pro):
 *   Tier 1: Cygnus Initiate     — Midnight Sapphire #002060
 *   Tier 2: Frostwing Ascendant — Ice Wing #60C0F0
 *   Tier 3: Gilded Sovereign    — Gilded Fern #C6A84B
 *   Tier 4: Amethyst Apex       — Wing Purple #8B5CF6
 *   Tier 5: Crystalline Swan    — Frost White #E0ECF4 + animated aura
 *
 * Rarity:  common → rare → epic → legendary
 * XP Mult: x1 → x2 → x4 → x8 → x16
 *
 * Categories:
 *   - fitness:   Iron & Ice (workouts, exercises, PRs)
 *   - streak:    The Unbroken (consistency streaks)
 *   - social:    Echoes of the Flock (posts, likes, shares, referrals)
 *   - milestone: The Awakening + The Forge (onboarding, learning, certs)
 *   - special:   Reflections & Vault (gallery, store, seasonal, hidden)
 */

const TIER_LABELS = ['Cygnus Initiate', 'Frostwing Ascendant', 'Gilded Sovereign', 'Amethyst Apex', 'Crystalline Swan'];
const RARITY_MAP  = ['common', 'common', 'rare', 'epic', 'legendary'];
const XP_MULT     = [1, 2, 4, 8, 16];
const REQ_MULT    = [1, 2.5, 5, 10, 25];
const DIFF_MAP    = [1, 2, 3, 4, 5];

// Map tierLevel to the legacy `tier` ENUM (bronze/silver/gold/platinum)
// Tier 5 (Diamond) maps to 'platinum' since ENUM only has 4 values
const LEGACY_TIER = ['bronze', 'silver', 'gold', 'platinum', 'platinum'];

function expandToTiers(tpl, maxTiers = 5) {
  const now = new Date();
  const rows = [];
  for (let i = 0; i < maxTiers; i++) {
    const tierNum = i + 1;
    rows.push({
      name:            tierNum === 1 ? tpl.name : `${tpl.name}_tier${tierNum}`,
      title:           tierNum === 1 ? tpl.title : `${tpl.title} — ${TIER_LABELS[i]}`,
      description:     tpl.description,
      iconEmoji:       tpl.iconEmoji || '🏆',
      category:        tpl.category,
      rarity:          RARITY_MAP[i],
      xpReward:        Math.round((tpl.xpReward || 50) * XP_MULT[i]),
      requiredPoints:  Math.round((tpl.requiredPoints || 0) * REQ_MULT[i]),
      maxProgress:     Math.round(tpl.maxProgress * REQ_MULT[i]),
      progressUnit:    tpl.progressUnit || 'completion',
      requirements:    JSON.stringify(tpl.requirements || []),
      tags:            JSON.stringify({
        skillTree:      tpl.skillTree,
        skillTreeOrder: tpl.skillTreeOrder,
        templateId:     tpl.name,
        tierLevel:      tierNum,
        tierLabel:      TIER_LABELS[i],
        sortOrder:      (tpl.skillTreeOrder * 10) + tierNum,
      }),
      tier:            LEGACY_TIER[i],
      skillTree:       tpl.skillTree || null,
      skillTreeOrder:  tpl.skillTreeOrder || null,
      templateId:      tpl.name,
      tierLevel:       tierNum,
      difficulty:      DIFF_MAP[i],
      isActive:        true,
      isHidden:        tpl.isHidden || false,
      isSecret:        tpl.isSecret || false,
      createdAt:       now,
      updatedAt:       now,
    });
  }
  return rows;
}

function t(name, title, desc, emoji, maxProgress, extra = {}) {
  return { name, title, description: desc, iconEmoji: emoji, maxProgress, ...extra };
}

// ═══════════════════════════════════════════════════════
// 1. THE AWAKENING — First Steps (one-time + tiered)
// ═══════════════════════════════════════════════════════
function awakeningTemplates() {
  const tree = 'awakening';
  const cat  = 'milestone';
  const base = { skillTree: tree, category: cat, xpReward: 25, requiredPoints: 0 };
  return [
    { ...base, ...t('first_login',       'First Flight',           'Log in for the first time — spread your wings',                '🌅', 1), skillTreeOrder: 1 },
    { ...base, ...t('complete_profile',  'Identity Forged',        'Complete your profile information',                             '🪪', 1), skillTreeOrder: 2 },
    { ...base, ...t('first_workout',     'Iron Initiation',        'Log your first workout — the journey begins',                  '💪', 1), skillTreeOrder: 3 },
    { ...base, ...t('first_post',        'Voice of the Flock',     'Create your first social post',                                '📝', 1), skillTreeOrder: 4 },
    { ...base, ...t('first_like',        'First Connection',       'Like someone\'s post for the first time',                      '❤️', 1), skillTreeOrder: 5 },
    { ...base, ...t('first_comment',     'Conversation Starter',   'Comment on a post for the first time',                         '💬', 1), skillTreeOrder: 6 },
    { ...base, ...t('upload_photo',      'Swan Portrait',          'Upload a profile photo',                                       '📸', 1), skillTreeOrder: 7 },
    { ...base, ...t('set_goal',          'Goal Setter',            'Set your first fitness goal',                                  '🎯', 1), skillTreeOrder: 8 },
    { ...base, ...t('first_achievement', 'Achievement Unlocked',   'Earn your very first achievement',                             '🏆', 1), skillTreeOrder: 9 },
    { ...base, ...t('invite_friend',     'Flock Recruiter',        'Invite a friend to join SwanStudios',                          '📧', 1), skillTreeOrder: 10 },
    { ...base, ...t('first_purchase',    'Vault Opener',           'Make your first purchase in the SwanStudios Store',            '🛍️', 1), skillTreeOrder: 11 },
    { ...base, ...t('explore_dashboard', 'Navigator',              'Visit all dashboard tabs',                                     '🧭', 5), skillTreeOrder: 12, xpReward: 40 },
    { ...base, ...t('first_week',        'One Week Strong',        'Be active for 7 consecutive days',                             '📅', 7, { progressUnit: 'days' }), skillTreeOrder: 13, xpReward: 50 },
  ];
}

// ═══════════════════════════════════════════════════════
// 2. IRON & ICE — Workout Mastery (multi-tiered)
// ═══════════════════════════════════════════════════════
function ironIceTemplates() {
  const tree = 'iron_gravity';
  const cat  = 'fitness';
  const base = { skillTree: tree, category: cat, xpReward: 50, requiredPoints: 0, progressUnit: 'workouts' };
  let order = 1;
  return [
    // Workout count milestones
    { ...base, ...t('workout_count_5',    'Warming Up',             'Complete 5 workout sessions',                                  '🔥', 5),   skillTreeOrder: order++ },
    { ...base, ...t('workout_count_10',   'Iron Will',              'Complete 10 workout sessions — discipline forged',             '⚒️', 10),  skillTreeOrder: order++, xpReward: 75 },
    { ...base, ...t('workout_count_25',   'Dedicated Swan',         'Complete 25 workout sessions',                                 '🦢', 25),  skillTreeOrder: order++, xpReward: 100 },
    { ...base, ...t('workout_count_50',   'Unstoppable Force',      'Complete 50 workout sessions — a force of nature',             '💨', 50),  skillTreeOrder: order++, xpReward: 150 },
    { ...base, ...t('workout_count_100',  'Century Swan',           'Complete 100 workout sessions — welcome to the elite',         '🏛️', 100), skillTreeOrder: order++, xpReward: 250 },
    { ...base, ...t('workout_count_250',  'Swan Warrior',           'Complete 250 workout sessions',                                '⚔️', 250), skillTreeOrder: order++, xpReward: 500 },
    { ...base, ...t('workout_count_500',  'Frozen Legend',          'Complete 500 workout sessions — legendary status',             '🧊', 500), skillTreeOrder: order++, xpReward: 1000 },
    // Strength PRs
    { ...base, ...t('bench_pr',           'Bench Press Titan',      'Set a new personal record on bench press',                     '🏋️', 1, { progressUnit: 'completion' }), skillTreeOrder: order++ },
    { ...base, ...t('squat_pr',           'Squat Sovereign',        'Set a new personal record on squats',                          '🦵', 1, { progressUnit: 'completion' }), skillTreeOrder: order++ },
    { ...base, ...t('deadlift_pr',        'Deadlift Dragon',        'Set a new personal record on deadlift',                        '🐉', 1, { progressUnit: 'completion' }), skillTreeOrder: order++ },
    // Exercise variety
    { ...base, ...t('exercise_variety_10', 'Versatile Athlete',     'Log 10 different exercise types',                              '🎪', 10, { progressUnit: 'exercises' }), skillTreeOrder: order++ },
    { ...base, ...t('exercise_variety_25', 'Movement Master',       'Log 25 different exercise types',                              '🌊', 25, { progressUnit: 'exercises' }), skillTreeOrder: order++, xpReward: 100 },
    { ...base, ...t('exercise_variety_50', 'Complete Athlete',       'Log 50 different exercise types — true versatility',           '🏅', 50, { progressUnit: 'exercises' }), skillTreeOrder: order++, xpReward: 200 },
    // Workout types
    { ...base, ...t('cardio_sessions_25', 'Cardio Crusader',        'Complete 25 cardio workouts',                                  '🫀', 25),  skillTreeOrder: order++ },
    { ...base, ...t('strength_sessions_25','Strength Sculptor',     'Complete 25 strength training sessions',                       '💎', 25),  skillTreeOrder: order++ },
    { ...base, ...t('bodyweight_25',      'Bodyweight Phoenix',     'Complete 25 bodyweight-only workouts',                          '🔱', 25),  skillTreeOrder: order++ },
    // Time-based
    { ...base, ...t('early_bird_10',      'Dawn Patrol',            'Complete 10 workouts before 7 AM',                             '🌅', 10, { progressUnit: 'sessions' }), skillTreeOrder: order++ },
    { ...base, ...t('night_owl_10',       'Midnight Iron',          'Complete 10 workouts after 8 PM',                              '🌙', 10, { progressUnit: 'sessions' }), skillTreeOrder: order++ },
    { ...base, ...t('weekend_warrior_10', 'Weekend Warrior',        'Complete 10 weekend workouts',                                 '🗓️', 10, { progressUnit: 'sessions' }), skillTreeOrder: order++ },
  ];
}

// ═══════════════════════════════════════════════════════
// 3. THE UNBROKEN — Streak Achievements
// ═══════════════════════════════════════════════════════
function unbrokenTemplates() {
  const tree = 'unbroken_streaks';
  const cat  = 'streak';
  const base = { skillTree: tree, category: cat, xpReward: 50, requiredPoints: 0, progressUnit: 'days' };
  let order = 1;
  return [
    { ...base, ...t('streak_3',          'Spark Ignited',           'Maintain a 3-day workout streak',                              '✨', 3),   skillTreeOrder: order++ },
    { ...base, ...t('streak_7',          'Glacial Momentum',        'Maintain a 7-day workout streak — ice cold consistency',       '❄️', 7),   skillTreeOrder: order++, xpReward: 75 },
    { ...base, ...t('streak_14',         'Two-Week Titan',          'Maintain a 14-day workout streak',                             '⚡', 14),  skillTreeOrder: order++, xpReward: 100 },
    { ...base, ...t('streak_30',         'Month of Steel',          'Maintain a 30-day workout streak — iron discipline',           '🛡️', 30),  skillTreeOrder: order++, xpReward: 200 },
    { ...base, ...t('streak_60',         'Relentless Swan',         'Maintain a 60-day workout streak',                             '🦢', 60),  skillTreeOrder: order++, xpReward: 400 },
    { ...base, ...t('streak_90',         'Quarter Dominator',       'Maintain a 90-day workout streak — 3 months unbroken',         '👑', 90),  skillTreeOrder: order++, xpReward: 750 },
    { ...base, ...t('streak_180',        'Half-Year Sovereign',     'Maintain a 180-day workout streak — half a year of power',     '🔥', 180), skillTreeOrder: order++, xpReward: 1500 },
    { ...base, ...t('streak_365',        'Unbreakable Frost',       'Maintain a 365-day workout streak — a full year. Legendary.', '🏔️', 365), skillTreeOrder: order++, xpReward: 5000 },
    // Comeback streaks
    { ...base, ...t('comeback_kid',      'Comeback Swan',           'Hit a new PR after returning from a 14+ day break',           '🔄', 1, { progressUnit: 'completion' }), skillTreeOrder: order++ },
    { ...base, ...t('comeback_phoenix',  'Phoenix Rising',          'Come back from a break three separate times and rebuild',     '🐦‍🔥', 3, { progressUnit: 'completion' }), skillTreeOrder: order++, xpReward: 150 },
    // Weekly consistency
    { ...base, ...t('weekly_3x_4wk',     'Consistent Flyer',        'Work out 3x/week for 4 consecutive weeks',                   '📊', 12, { progressUnit: 'workouts' }), skillTreeOrder: order++, xpReward: 200 },
    { ...base, ...t('weekly_4x_4wk',     'Elite Discipline',        'Work out 4x/week for 4 consecutive weeks',                   '📈', 16, { progressUnit: 'workouts' }), skillTreeOrder: order++, xpReward: 300 },
  ];
}

// ═══════════════════════════════════════════════════════
// 4. ECHOES OF THE FLOCK — Social & Community
// ═══════════════════════════════════════════════════════
function socialTemplates() {
  const tree = 'tribe_social';
  const cat  = 'social';
  const base = { skillTree: tree, category: cat, xpReward: 30, requiredPoints: 0 };
  let order = 1;
  return [
    // Post milestones
    { ...base, ...t('post_count_5',       'Finding Your Voice',      'Create 5 social posts',                                       '📢', 5, { progressUnit: 'completion' }),  skillTreeOrder: order++ },
    { ...base, ...t('post_count_25',      'Storyteller',             'Create 25 social posts — your story inspires',                '📖', 25, { progressUnit: 'completion' }), skillTreeOrder: order++, xpReward: 75 },
    { ...base, ...t('post_count_50',      'Swan Chronicler',         'Create 50 social posts',                                      '✍️', 50, { progressUnit: 'completion' }), skillTreeOrder: order++, xpReward: 150 },
    { ...base, ...t('post_count_100',     'Flock Legend',            'Create 100 social posts — a true community pillar',           '🗼', 100, { progressUnit: 'completion' }), skillTreeOrder: order++, xpReward: 300 },
    // Engagement (likes received)
    { ...base, ...t('likes_received_10',  'Liked by the Flock',      'Receive 10 likes on your posts',                              '👍', 10, { progressUnit: 'completion' }),  skillTreeOrder: order++ },
    { ...base, ...t('likes_received_50',  'Crowd Favorite',          'Receive 50 likes on your posts',                              '🌟', 50, { progressUnit: 'completion' }),  skillTreeOrder: order++, xpReward: 75 },
    { ...base, ...t('likes_received_100', 'Swan Influencer',         'Receive 100 likes — you\'re an inspiration',                  '💫', 100, { progressUnit: 'completion' }), skillTreeOrder: order++, xpReward: 150 },
    // Comments
    { ...base, ...t('comment_count_10',   'Engaged Swan',            'Write 10 comments on others\' posts',                         '💬', 10, { progressUnit: 'completion' }),  skillTreeOrder: order++ },
    { ...base, ...t('comment_count_50',   'Community Builder',       'Write 50 comments — building connections',                    '🏗️', 50, { progressUnit: 'completion' }),  skillTreeOrder: order++, xpReward: 75 },
    { ...base, ...t('comment_count_100',  'Heart of the Flock',      'Write 100 comments — the heart of the community',            '💖', 100, { progressUnit: 'completion' }), skillTreeOrder: order++, xpReward: 150 },
    // Referrals
    { ...base, ...t('refer_1',           'Flock Gatherer',           'Refer 1 friend who signs up',                                 '🤝', 1, { progressUnit: 'completion' }),  skillTreeOrder: order++, xpReward: 100 },
    { ...base, ...t('refer_3',           'Swan Ambassador',          'Refer 3 friends who sign up',                                 '🏅', 3, { progressUnit: 'completion' }),  skillTreeOrder: order++, xpReward: 300 },
    { ...base, ...t('refer_5',           'Elite Recruiter',          'Refer 5 friends — growing the flock',                         '👑', 5, { progressUnit: 'completion' }),  skillTreeOrder: order++, xpReward: 750 },
    { ...base, ...t('refer_10',          'Legendary Evangelist',     'Refer 10 friends — legendary flock builder',                  '🦢', 10, { progressUnit: 'completion' }), skillTreeOrder: order++, xpReward: 1500 },
    // Social sharing
    { ...base, ...t('share_workout_ig',   'Instagram Swan',          'Share a workout achievement to Instagram',                    '📱', 1, { progressUnit: 'completion' }),  skillTreeOrder: order++, xpReward: 50 },
    { ...base, ...t('share_progress_5',   'Progress Broadcaster',    'Share 5 progress updates on social media',                   '📡', 5, { progressUnit: 'completion' }),  skillTreeOrder: order++, xpReward: 100 },
    { ...base, ...t('transformation_post','Transformation Tale',     'Post a before/after transformation photo',                   '🦋', 1, { progressUnit: 'completion' }),  skillTreeOrder: order++, xpReward: 200 },
  ];
}

// ═══════════════════════════════════════════════════════
// 5. REFLECTIONS — Gallery, Content & Photography
// ═══════════════════════════════════════════════════════
function reflectionsTemplates() {
  const tree = 'free_spirit';
  const cat  = 'special';
  const base = { skillTree: tree, category: cat, xpReward: 40, requiredPoints: 0 };
  let order = 1;
  return [
    // Gallery / Photography
    { ...base, ...t('upload_progress_1',  'First Reflection',        'Upload your first progress photo to the gallery',             '📷', 1, { progressUnit: 'completion' }),  skillTreeOrder: order++ },
    { ...base, ...t('upload_progress_5',  'Frozen in Time',          'Upload 5 progress photos — documenting the journey',          '🖼️', 5, { progressUnit: 'completion' }),  skillTreeOrder: order++, xpReward: 75 },
    { ...base, ...t('upload_progress_10', 'Gallery Curator',         'Upload 10 progress photos',                                   '🎨', 10, { progressUnit: 'completion' }), skillTreeOrder: order++, xpReward: 150 },
    { ...base, ...t('upload_progress_25', 'Visual Storyteller',      'Upload 25 progress photos — a visual journey',               '📸', 25, { progressUnit: 'completion' }), skillTreeOrder: order++, xpReward: 300 },
    // Event participation
    { ...base, ...t('attend_event_1',     'Event Explorer',          'Attend your first SwanStudios event',                          '🎪', 1, { progressUnit: 'completion' }),  skillTreeOrder: order++ },
    { ...base, ...t('attend_event_5',     'Event Enthusiast',        'Attend 5 SwanStudios events',                                 '🎉', 5, { progressUnit: 'completion' }),  skillTreeOrder: order++, xpReward: 100 },
    { ...base, ...t('attend_event_10',    'Event Swan',              'Attend 10 events — a true community member',                 '🦢', 10, { progressUnit: 'completion' }), skillTreeOrder: order++, xpReward: 250 },
    // Content creation
    { ...base, ...t('video_watched_5',    'Student of the Game',     'Watch 5 training videos in the Video Library',                '📺', 5, { progressUnit: 'completion' }),  skillTreeOrder: order++ },
    { ...base, ...t('video_watched_25',   'Knowledge Seeker',        'Watch 25 training videos',                                    '🎓', 25, { progressUnit: 'completion' }), skillTreeOrder: order++, xpReward: 100 },
    { ...base, ...t('video_watched_50',   'Video Scholar',           'Watch 50 training videos — deep knowledge',                  '🏛️', 50, { progressUnit: 'completion' }), skillTreeOrder: order++, xpReward: 200 },
    // Year transformation
    { ...base, ...t('yearly_transform',   'Crystalline Transformation', 'Document a 1-year before/after transformation',           '💎', 1, { progressUnit: 'completion' }),  skillTreeOrder: order++, xpReward: 2500 },
  ];
}

// ═══════════════════════════════════════════════════════
// 6. THE VAULT — Store & Purchases
// ═══════════════════════════════════════════════════════
function vaultTemplates() {
  const tree = 'forge_nasm';
  const cat  = 'milestone';
  const base = { skillTree: tree, category: cat, xpReward: 50, requiredPoints: 0 };
  let order = 50; // offset to avoid collisions with forge templates
  return [
    { ...base, ...t('first_store_purchase', 'Vault Initiate',       'Make your first purchase in the SwanStudios Store',            '🛒', 1, { progressUnit: 'completion' }),  skillTreeOrder: order++ },
    { ...base, ...t('purchase_package',     'Session Investor',     'Purchase a training session package',                          '💰', 1, { progressUnit: 'completion' }),  skillTreeOrder: order++, xpReward: 100 },
    { ...base, ...t('purchase_3_packages',  'Committed Investor',   'Purchase 3 training packages',                                 '📈', 3, { progressUnit: 'completion' }),  skillTreeOrder: order++, xpReward: 250 },
    { ...base, ...t('purchase_5_packages',  'Swan Patron',          'Purchase 5 training packages — a true patron',                '🏛️', 5, { progressUnit: 'completion' }),  skillTreeOrder: order++, xpReward: 500 },
    { ...base, ...t('purchase_10_packages', 'Gilded Patron',        'Purchase 10 training packages — lifetime commitment',         '👑', 10, { progressUnit: 'completion' }), skillTreeOrder: order++, xpReward: 1000 },
  ];
}

// ═══════════════════════════════════════════════════════
// 7. XP & LEVEL MILESTONES
// ═══════════════════════════════════════════════════════
function xpMilestoneTemplates() {
  const cat  = 'milestone';
  const base = { category: cat, xpReward: 50, progressUnit: 'points' };
  return [
    { ...base, ...t('xp_500',             'Rising Swan',            'Earn 500 XP — your wings are growing',                         '⭐', 500, { requiredPoints: 500 }),     skillTreeOrder: 1 },
    { ...base, ...t('xp_1000',            'Cygnus Rising',          'Earn 1,000 XP — Cygnus Initiate rank unlocked',                '🌟', 1000, { requiredPoints: 1000 }),   skillTreeOrder: 2, xpReward: 100 },
    { ...base, ...t('xp_5000',            'Frostwing Status',       'Earn 5,000 XP — Frostwing Ascendant rank achieved',            '❄️', 5000, { requiredPoints: 5000 }),   skillTreeOrder: 3, xpReward: 250 },
    { ...base, ...t('xp_15000',           'Gilded Ascension',       'Earn 15,000 XP — Gilded Sovereign rank achieved',              '🏆', 15000, { requiredPoints: 15000 }), skillTreeOrder: 4, xpReward: 500 },
    { ...base, ...t('xp_50000',           'Amethyst Transcendence', 'Earn 50,000 XP — Amethyst Apex rank achieved',                 '💜', 50000, { requiredPoints: 50000 }), skillTreeOrder: 5, xpReward: 1000 },
    { ...base, ...t('xp_100000',          'Crystalline Ascension',  'Earn 100,000 XP — Crystalline Swan. The pinnacle.',            '🦢', 100000, { requiredPoints: 100000 }), skillTreeOrder: 6, xpReward: 5000 },
  ];
}

// ═══════════════════════════════════════════════════════
// 8. HIDDEN / SECRET ACHIEVEMENTS
// ═══════════════════════════════════════════════════════
function hiddenTemplates() {
  const cat  = 'special';
  const base = { category: cat, xpReward: 100, requiredPoints: 0, isHidden: true, isSecret: true };
  return [
    { ...base, ...t('birthday_workout',    'Birthday Swan',          'Work out on your birthday — dedication knows no holidays',    '🎂', 1, { progressUnit: 'completion' }),  skillTreeOrder: 1 },
    { ...base, ...t('anniversary_workout', 'Anniversary Wings',      'Work out on your SwanStudios anniversary',                    '🎊', 1, { progressUnit: 'completion' }),  skillTreeOrder: 2 },
    { ...base, ...t('new_year_workout',    'Resolution Keeper',      'Work out on January 1st',                                     '🎆', 1, { progressUnit: 'completion' }),  skillTreeOrder: 3 },
    { ...base, ...t('midnight_workout',    'Midnight Swan',           'Log a workout between midnight and 4 AM',                    '🌌', 1, { progressUnit: 'completion' }),  skillTreeOrder: 4, xpReward: 150 },
    { ...base, ...t('holiday_workout',     'No Days Off',             'Work out on a major holiday',                                '🎄', 1, { progressUnit: 'completion' }),  skillTreeOrder: 5 },
    { ...base, ...t('perfect_month',       'Flawless Month',          'Complete every scheduled workout in a calendar month',       '✨', 1, { progressUnit: 'completion' }),  skillTreeOrder: 6, xpReward: 500 },
    { ...base, ...t('balanced_week',       'Balanced Swan',           'Complete workout, nutrition, and recovery in one week',      '⚖️', 1, { progressUnit: 'completion' }),  skillTreeOrder: 7 },
    { ...base, ...t('all_trees_started',   'Explorer of All Paths',  'Earn at least one achievement in every skill tree',          '🗺️', 1, { progressUnit: 'completion' }),  skillTreeOrder: 8, xpReward: 300 },
    { ...base, ...t('speed_demon',         'Speed Demon',             'Complete a full workout in under 30 minutes',                '⚡', 1, { progressUnit: 'completion' }),  skillTreeOrder: 9 },
    { ...base, ...t('endurance_beast',     'Endurance Beast',         'Complete a workout lasting over 2 hours',                    '🦣', 1, { progressUnit: 'completion' }),  skillTreeOrder: 10, xpReward: 200 },
  ];
}


// ═══════════════════════════════════════════════════════
// MAIN SEEDER
// ═══════════════════════════════════════════════════════

// Which templates get how many tiers
const ONE_TIME = new Set([
  'first_login', 'complete_profile', 'first_workout', 'first_post',
  'first_like', 'first_comment', 'upload_photo', 'set_goal',
  'first_achievement', 'invite_friend', 'first_purchase',
  'bench_pr', 'squat_pr', 'deadlift_pr',
  'share_workout_ig', 'transformation_post', 'yearly_transform',
  'first_store_purchase', 'purchase_package',
  'birthday_workout', 'anniversary_workout', 'new_year_workout',
  'midnight_workout', 'holiday_workout', 'perfect_month',
  'balanced_week', 'all_trees_started', 'speed_demon', 'endurance_beast',
  'comeback_kid', 'upload_progress_1', 'attend_event_1',
]);

const THREE_TIER = new Set([
  'explore_dashboard', 'first_week', 'streak_3', 'comeback_phoenix',
  'refer_1', 'video_watched_5',
]);

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // ─── Step 1: Wipe ALL existing achievements (clean slate) ───
    await queryInterface.bulkDelete('Achievements', null, {});

    // ─── Step 2: Gather all templates ───
    const allTemplates = [
      ...awakeningTemplates(),
      ...ironIceTemplates(),
      ...unbrokenTemplates(),
      ...socialTemplates(),
      ...reflectionsTemplates(),
      ...vaultTemplates(),
      ...xpMilestoneTemplates(),
      ...hiddenTemplates(),
    ];

    // ─── Step 3: Expand templates to tiered rows ───
    const allRows = [];
    for (const tpl of allTemplates) {
      let maxTiers = 5;
      if (ONE_TIME.has(tpl.name)) maxTiers = 1;
      else if (THREE_TIER.has(tpl.name)) maxTiers = 3;

      allRows.push(...expandToTiers(tpl, maxTiers));
    }

    // ─── Step 4: Insert in batches to avoid memory issues ───
    const BATCH_SIZE = 50;
    for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
      const batch = allRows.slice(i, i + BATCH_SIZE);
      await queryInterface.bulkInsert('Achievements', batch, {});
    }

    console.log(`[Swan Achievements] Seeded ${allRows.length} achievements from ${allTemplates.length} templates`);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Achievements', null, {});
  },
};
