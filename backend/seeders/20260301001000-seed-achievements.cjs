'use strict';

/**
 * Seeder: Gamification Achievements (Phase 2 -- Octalysis Framework)
 * ===================================================================
 *
 * Creates ~550 achievement rows across 6 Skill Trees using a template-
 * and-tier expansion pattern.  Each core template generates 1-5 tier
 * variants (Bronze / Silver / Gold / Platinum / Diamond).
 *
 * Skill Trees:
 *   1. The Awakening       (15 templates)  -> milestone
 *   2. The Forge / NASM    (35 templates)  -> milestone
 *   3. Iron & Gravity      (40 templates)  -> fitness
 *   4. The Tribe / Social  (40 templates)  -> social
 *   5. The Free Spirit     (35 templates)  -> fitness / special
 *   6. The Unbroken        (35 templates)  -> streak
 *   + 50 hidden / secret easter-egg achievements
 *
 * Tier multipliers:
 *   Tier 1 (Bronze)   : base requirement,  common,    XP x1
 *   Tier 2 (Silver)   : 2.5x requirement,  common,    XP x2
 *   Tier 3 (Gold)     : 5x requirement,    rare,      XP x4
 *   Tier 4 (Platinum) : 10x requirement,   epic,      XP x8
 *   Tier 5 (Diamond)  : 25x requirement,   legendary, XP x16
 *
 * Database columns used (see reconcile migration 20260301000200):
 *   id, name, title, description, iconEmoji, category, rarity, xpReward,
 *   requiredPoints, maxProgress, progressUnit, requirements, tags,
 *   tier, isActive, isHidden, isSecret, difficulty, createdAt, updatedAt
 *
 * Usage:
 *   npx sequelize-cli db:seed --seed 20260301001000-seed-achievements.cjs
 *
 * Rollback:
 *   npx sequelize-cli db:seed:undo --seed 20260301001000-seed-achievements.cjs
 */

// crypto.randomUUID() removed — let PostgreSQL auto-generate id column

// ---------------------------------------------------------------------------
// Tier expansion engine
// ---------------------------------------------------------------------------

const TIER_NAMES   = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
const RARITY_MAP   = ['common', 'common', 'rare', 'epic', 'legendary'];
const XP_MULT      = [1, 2, 4, 8, 16];
const REQ_MULT     = [1, 2.5, 5, 10, 25];

const DIFFICULTY_MAP = [1, 2, 3, 4, 5]; // INTEGER 1-5 matches tier index

/**
 * Expand a single achievement template into 1..maxTiers rows.
 *
 * @param {object}  tpl       - Core template definition
 * @param {number}  maxTiers  - How many tiers to generate (1 for one-time achievements)
 * @returns {object[]}        - Array of row objects ready for bulkInsert
 */
function expandToTiers(tpl, maxTiers = 5) {
  const now = new Date();
  const rows = [];

  for (let i = 0; i < maxTiers; i++) {
    const tierIndex = i;
    const tierNum   = i + 1;

    rows.push({
      // Let PostgreSQL auto-generate id (works with both INTEGER and UUID columns)
      // identity
      name:          tierNum === 1 ? tpl.name : `${tpl.name}_tier${tierNum}`,
      title:         tierNum === 1 ? tpl.title : `${tpl.title} ${TIER_NAMES[tierIndex]}`,
      description:   tpl.description,
      // visuals
      iconEmoji:     tpl.iconEmoji || '\u{1F3C6}',
      // classification
      category:      tpl.category,
      rarity:        RARITY_MAP[tierIndex],
      // rewards
      xpReward:      Math.round((tpl.xpReward || 50) * XP_MULT[tierIndex]),
      requiredPoints: Math.round((tpl.requiredPoints || 0) * REQ_MULT[tierIndex]),
      // progress
      maxProgress:   Math.round(tpl.maxProgress * REQ_MULT[tierIndex]),
      progressUnit:  tpl.progressUnit || 'completion',
      // structured metadata (JSONB) -- encodes skill tree, template, tier info
      requirements:  JSON.stringify(tpl.requirements || []),
      tags:          JSON.stringify({
        skillTree:      tpl.skillTree,
        skillTreeOrder: tpl.skillTreeOrder,
        templateId:     tpl.name,
        tierLevel:      tierNum,
        tierLabel:      TIER_NAMES[tierIndex],
        sortOrder:      (tpl.skillTreeOrder * 10) + tierNum,
      }),
      // Octalysis skill tree fields (top-level model columns)
      skillTree:     tpl.skillTree || null,
      skillTreeOrder: tpl.skillTreeOrder || null,
      templateId:    tpl.name,
      tierLevel:     tierNum,
      // difficulty
      difficulty:    DIFFICULTY_MAP[tierIndex],
      // flags
      isActive:      true,
      isHidden:      tpl.isHidden || false,
      isSecret:      tpl.isSecret || false,
      // timestamps
      createdAt:     now,
      updatedAt:     now,
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Template definitions by Skill Tree
// ---------------------------------------------------------------------------

// Helper to build a template object concisely
function t(name, title, desc, emoji, maxProgress, extra = {}) {
  return { name, title, description: desc, iconEmoji: emoji, maxProgress, ...extra };
}

// ============================
// 1. THE AWAKENING (15 cores)
// ============================
function awakeningTemplates() {
  const tree = 'awakening';
  const cat  = 'milestone';
  const base = { skillTree: tree, category: cat, xpReward: 25, requiredPoints: 0 };

  return [
    // One-time achievements (tier 1 only)
    { ...base, ...t('first_login',       'First Steps',          'Log in for the first time',                  '\u{1F305}', 1), skillTreeOrder: 1 },
    { ...base, ...t('complete_profile',  'Identity Forged',      'Complete your profile information',           '\u{1F464}', 1), skillTreeOrder: 2 },
    { ...base, ...t('first_workout',     'Iron Initiation',      'Log your first workout',                     '\u{1F4AA}', 1), skillTreeOrder: 3 },
    { ...base, ...t('first_post',        'Voice Found',          'Create your first social post',              '\u{1F4DD}', 1), skillTreeOrder: 4 },
    { ...base, ...t('first_like',        'First Connection',     'Like someone\'s post for the first time',    '\u{2764}\uFE0F', 1), skillTreeOrder: 5 },
    { ...base, ...t('first_comment',     'Conversation Starter', 'Comment on a post for the first time',       '\u{1F4AC}', 1), skillTreeOrder: 6 },
    { ...base, ...t('first_follow',      'Building Bonds',       'Follow another member',                      '\u{1F91D}', 1), skillTreeOrder: 7 },
    { ...base, ...t('upload_photo',      'Picture Perfect',      'Upload a profile photo',                     '\u{1F4F8}', 1), skillTreeOrder: 8 },
    { ...base, ...t('first_achievement', 'Achievement Unlocked', 'Earn your very first achievement',           '\u{1F3C6}', 1), skillTreeOrder: 10 },
    { ...base, ...t('set_goal',          'Goal Setter',          'Set your first fitness goal',                '\u{1F3AF}', 1), skillTreeOrder: 11 },
    { ...base, ...t('invite_friend',     'Recruiter',            'Invite a friend to join SwanStudios',        '\u{1F4E7}', 1), skillTreeOrder: 12 },
    { ...base, ...t('customize_profile', 'Personal Touch',       'Customize your profile background',          '\u{1F3A8}', 1), skillTreeOrder: 14 },
    { ...base, ...t('read_tutorial',     'Knowledge Seeker',     'Read the getting started guide',             '\u{1F4D6}', 1), skillTreeOrder: 15 },
    // Multi-step awakening achievements (tiered)
    { ...base, ...t('explore_dashboard', 'Navigator',            'Visit all dashboard tabs',                   '\u{1F9ED}', 5), skillTreeOrder: 9,  xpReward: 40 },
    { ...base, ...t('first_week',        'One Week Strong',      'Be active for 7 consecutive days',           '\u{1F4C5}', 7, { progressUnit: 'days' }), skillTreeOrder: 13, xpReward: 50 },
  ];
}

// ============================
// 2. THE FORGE / NASM (35 cores)
// ============================
function forgeNasmTemplates() {
  const tree = 'forge_nasm';
  const cat  = 'milestone';
  const base = { skillTree: tree, category: cat, xpReward: 50, requiredPoints: 0 };
  let order = 1;

  return [
    // Assessment
    { ...base, ...t('complete_assessment',    'First Assessment',       'Complete your first NASM assessment',        '\u{1F4CB}', 1),  skillTreeOrder: order++ },
    // Watch tutorials (5 tiers implicit via maxProgress)
    { ...base, ...t('watch_tutorial_1',       'Tutorial Viewer',        'Watch your first tutorial video',            '\u{1F4FA}', 1),  skillTreeOrder: order++ },
    { ...base, ...t('watch_tutorial_5',       'Avid Learner',           'Watch 5 tutorial videos',                    '\u{1F4FA}', 5),  skillTreeOrder: order++ },
    { ...base, ...t('watch_tutorial_10',      'Knowledge Hungry',       'Watch 10 tutorial videos',                   '\u{1F4FA}', 10), skillTreeOrder: order++ },
    { ...base, ...t('watch_tutorial_25',      'Video Scholar',          'Watch 25 tutorial videos',                   '\u{1F4FA}', 25), skillTreeOrder: order++ },
    { ...base, ...t('watch_tutorial_50',      'Tutorial Master',        'Watch 50 tutorial videos',                   '\u{1F4FA}', 50), skillTreeOrder: order++ },
    // Complete modules (10 tiers)
    { ...base, ...t('complete_module_1',      'First Module',           'Complete your first learning module',         '\u{1F4DA}', 1),   skillTreeOrder: order++ },
    { ...base, ...t('complete_module_3',      'Committed Learner',      'Complete 3 learning modules',                '\u{1F4DA}', 3),   skillTreeOrder: order++ },
    { ...base, ...t('complete_module_5',      'Module Collector',       'Complete 5 learning modules',                '\u{1F4DA}', 5),   skillTreeOrder: order++ },
    { ...base, ...t('complete_module_10',     'Course Conqueror',       'Complete 10 learning modules',               '\u{1F4DA}', 10),  skillTreeOrder: order++ },
    { ...base, ...t('complete_module_15',     'Education Enthusiast',   'Complete 15 learning modules',               '\u{1F4DA}', 15),  skillTreeOrder: order++ },
    { ...base, ...t('complete_module_20',     'Study Champion',         'Complete 20 learning modules',               '\u{1F4DA}', 20),  skillTreeOrder: order++ },
    { ...base, ...t('complete_module_25',     'Curriculum Master',      'Complete 25 learning modules',               '\u{1F4DA}', 25),  skillTreeOrder: order++ },
    { ...base, ...t('complete_module_30',     'Module Maven',           'Complete 30 learning modules',               '\u{1F4DA}', 30),  skillTreeOrder: order++ },
    { ...base, ...t('complete_module_40',     'Academic Elite',         'Complete 40 learning modules',               '\u{1F4DA}', 40),  skillTreeOrder: order++ },
    { ...base, ...t('complete_module_50',     'Module Grandmaster',     'Complete 50 learning modules',               '\u{1F4DA}', 50),  skillTreeOrder: order++ },
    // Pass quizzes
    { ...base, ...t('pass_quiz_1',            'First Quiz',             'Pass your first quiz',                       '\u{2705}', 1),   skillTreeOrder: order++ },
    { ...base, ...t('pass_quiz_5',            'Quiz Pro',               'Pass 5 quizzes',                             '\u{2705}', 5),   skillTreeOrder: order++ },
    { ...base, ...t('pass_quiz_10',           'Quiz Champion',          'Pass 10 quizzes',                            '\u{2705}', 10),  skillTreeOrder: order++ },
    { ...base, ...t('pass_quiz_25',           'Quiz Dominator',         'Pass 25 quizzes',                            '\u{2705}', 25),  skillTreeOrder: order++ },
    { ...base, ...t('pass_quiz_50',           'Quiz Grandmaster',       'Pass 50 quizzes',                            '\u{2705}', 50),  skillTreeOrder: order++ },
    // Study streaks
    { ...base, ...t('study_streak_3',         'Study Habit',            'Maintain a 3-day study streak',              '\u{1F4D6}', 3, { progressUnit: 'days' }),  skillTreeOrder: order++ },
    { ...base, ...t('study_streak_7',         'Weekly Scholar',         'Maintain a 7-day study streak',              '\u{1F4D6}', 7, { progressUnit: 'days' }),  skillTreeOrder: order++ },
    { ...base, ...t('study_streak_14',        'Two-Week Thinker',       'Maintain a 14-day study streak',             '\u{1F4D6}', 14, { progressUnit: 'days' }), skillTreeOrder: order++ },
    { ...base, ...t('study_streak_30',        'Monthly Mind',           'Maintain a 30-day study streak',             '\u{1F4D6}', 30, { progressUnit: 'days' }), skillTreeOrder: order++, xpReward: 100 },
    // Certification progress
    { ...base, ...t('cert_progress_25',       'Certification Started',  'Complete 25% of certification curriculum',   '\u{1F4DC}', 1),  skillTreeOrder: order++, xpReward: 75, requirements: [{ type: 'cert_percent', value: 25 }] },
    { ...base, ...t('cert_progress_50',       'Halfway Certified',      'Complete 50% of certification curriculum',   '\u{1F4DC}', 1),  skillTreeOrder: order++, xpReward: 150, requirements: [{ type: 'cert_percent', value: 50 }] },
    { ...base, ...t('cert_progress_75',       'Almost Certified',       'Complete 75% of certification curriculum',   '\u{1F4DC}', 1),  skillTreeOrder: order++, xpReward: 250, requirements: [{ type: 'cert_percent', value: 75 }] },
    { ...base, ...t('cert_progress_100',      'Fully Certified',        'Complete 100% of certification curriculum',  '\u{1F4DC}', 1),  skillTreeOrder: order++, xpReward: 500, requirements: [{ type: 'cert_percent', value: 100 }] },
    // Knowledge sharing
    { ...base, ...t('share_knowledge',        'Knowledge Sharer',       'Share an educational insight with the community',  '\u{1F4E2}', 1),  skillTreeOrder: order++ },
    { ...base, ...t('mentor_session',         'Mentor',                 'Complete a mentor session with another member',    '\u{1F9D1}\u200D\u{1F3EB}', 1), skillTreeOrder: order++, xpReward: 100 },
    // Specialty certifications
    { ...base, ...t('nutrition_cert',         'Nutrition Expert',       'Complete the nutrition certification track',        '\u{1F34E}', 1), skillTreeOrder: order++, xpReward: 200 },
    { ...base, ...t('exercise_science_cert',  'Exercise Scientist',    'Complete the exercise science certification track', '\u{1F52C}', 1), skillTreeOrder: order++, xpReward: 200 },
    { ...base, ...t('behavior_change_cert',   'Behavior Change Pro',   'Complete the behavior change certification track',  '\u{1F9E0}', 1), skillTreeOrder: order++, xpReward: 200 },
    { ...base, ...t('program_design_cert',    'Program Designer',      'Complete the program design certification track',   '\u{1F4D0}', 1), skillTreeOrder: order++, xpReward: 200 },
  ];
}

// ============================
// 3. IRON & GRAVITY (40 cores)
// ============================
function ironGravityTemplates() {
  const tree = 'iron_gravity';
  const cat  = 'fitness';
  const base = { skillTree: tree, category: cat, xpReward: 50, requiredPoints: 0, progressUnit: 'workouts' };
  let order = 1;

  return [
    // Workout counts
    { ...base, ...t('workout_count_10',    'Getting Started',       'Complete 10 workouts',                       '\u{1F3CB}\uFE0F', 10),   skillTreeOrder: order++ },
    { ...base, ...t('workout_count_25',    'Gym Regular',           'Complete 25 workouts',                       '\u{1F3CB}\uFE0F', 25),   skillTreeOrder: order++ },
    { ...base, ...t('workout_count_50',    'Dedicated Lifter',      'Complete 50 workouts',                       '\u{1F3CB}\uFE0F', 50),   skillTreeOrder: order++, xpReward: 75 },
    { ...base, ...t('workout_count_100',   'Century Club',          'Complete 100 workouts',                      '\u{1F3CB}\uFE0F', 100),  skillTreeOrder: order++, xpReward: 100 },
    { ...base, ...t('workout_count_250',   'Iron Veteran',          'Complete 250 workouts',                      '\u{1F3CB}\uFE0F', 250),  skillTreeOrder: order++, xpReward: 150 },
    { ...base, ...t('workout_count_500',   'Half-Thousand',         'Complete 500 workouts',                      '\u{1F3CB}\uFE0F', 500),  skillTreeOrder: order++, xpReward: 250 },
    { ...base, ...t('workout_count_1000',  'Thousand Strong',       'Complete 1000 workouts',                     '\u{1F3CB}\uFE0F', 1000), skillTreeOrder: order++, xpReward: 500 },
    // Exercise variety
    { ...base, ...t('exercise_variety_5',  'Explorer',              'Try 5 different exercises',                  '\u{1F50D}', 5, { progressUnit: 'exercises' }),  skillTreeOrder: order++ },
    { ...base, ...t('exercise_variety_10', 'Diverse Mover',         'Try 10 different exercises',                 '\u{1F50D}', 10, { progressUnit: 'exercises' }), skillTreeOrder: order++ },
    { ...base, ...t('exercise_variety_20', 'Variety King',          'Try 20 different exercises',                 '\u{1F50D}', 20, { progressUnit: 'exercises' }), skillTreeOrder: order++ },
    { ...base, ...t('exercise_variety_30', 'Exercise Encyclopedia', 'Try 30 different exercises',                 '\u{1F50D}', 30, { progressUnit: 'exercises' }), skillTreeOrder: order++, xpReward: 100 },
    // Personal records
    { ...base, ...t('personal_record_1',   'First PR',              'Set your first personal record',             '\u{1F4C8}', 1, { progressUnit: 'completion' }),  skillTreeOrder: order++ },
    { ...base, ...t('personal_record_5',   'Record Breaker',        'Set 5 personal records',                     '\u{1F4C8}', 5, { progressUnit: 'completion' }),  skillTreeOrder: order++ },
    { ...base, ...t('personal_record_10',  'PR Machine',            'Set 10 personal records',                    '\u{1F4C8}', 10, { progressUnit: 'completion' }), skillTreeOrder: order++ },
    { ...base, ...t('personal_record_25',  'Record Collector',      'Set 25 personal records',                    '\u{1F4C8}', 25, { progressUnit: 'completion' }), skillTreeOrder: order++, xpReward: 100 },
    { ...base, ...t('personal_record_50',  'PR Legend',              'Set 50 personal records',                    '\u{1F4C8}', 50, { progressUnit: 'completion' }), skillTreeOrder: order++, xpReward: 200 },
    // Total reps
    { ...base, ...t('total_reps_1k',       'Rep Rookie',            'Perform 1,000 total reps',                   '\u{1F4AA}', 1000, { progressUnit: 'custom' }),  skillTreeOrder: order++ },
    { ...base, ...t('total_reps_5k',       'Rep Builder',           'Perform 5,000 total reps',                   '\u{1F4AA}', 5000, { progressUnit: 'custom' }),  skillTreeOrder: order++ },
    { ...base, ...t('total_reps_10k',      'Ten Thousand Reps',     'Perform 10,000 total reps',                  '\u{1F4AA}', 10000, { progressUnit: 'custom' }), skillTreeOrder: order++, xpReward: 100 },
    { ...base, ...t('total_reps_50k',      'Rep Monster',           'Perform 50,000 total reps',                  '\u{1F4AA}', 50000, { progressUnit: 'custom' }), skillTreeOrder: order++, xpReward: 200 },
    { ...base, ...t('total_reps_100k',     'Hundred-K Reps',        'Perform 100,000 total reps',                 '\u{1F4AA}', 100000, { progressUnit: 'custom' }), skillTreeOrder: order++, xpReward: 500 },
    // Total sets
    { ...base, ...t('total_sets_500',      'Set Builder',           'Complete 500 total sets',                    '\u{1F9F1}', 500, { progressUnit: 'custom' }),   skillTreeOrder: order++ },
    { ...base, ...t('total_sets_2000',     'Set Machine',           'Complete 2,000 total sets',                  '\u{1F9F1}', 2000, { progressUnit: 'custom' }),  skillTreeOrder: order++ },
    { ...base, ...t('total_sets_5000',     'Set Legend',             'Complete 5,000 total sets',                  '\u{1F9F1}', 5000, { progressUnit: 'custom' }),  skillTreeOrder: order++, xpReward: 150 },
    // Total weight lifted (cumulative pounds)
    { ...base, ...t('total_weight_10k',    'Ton Lifter',            'Lift 10,000 cumulative pounds',              '\u{1FAAB}', 10000, { progressUnit: 'custom' }),  skillTreeOrder: order++ },
    { ...base, ...t('total_weight_50k',    'Heavy Hitter',          'Lift 50,000 cumulative pounds',              '\u{1FAAB}', 50000, { progressUnit: 'custom' }),  skillTreeOrder: order++, xpReward: 100 },
    { ...base, ...t('total_weight_100k',   'Iron Mountain',         'Lift 100,000 cumulative pounds',             '\u{1FAAB}', 100000, { progressUnit: 'custom' }), skillTreeOrder: order++, xpReward: 200 },
    { ...base, ...t('total_weight_500k',   'Gravity Defier',        'Lift 500,000 cumulative pounds',             '\u{1FAAB}', 500000, { progressUnit: 'custom' }), skillTreeOrder: order++, xpReward: 500 },
    // Workout duration (total hours)
    { ...base, ...t('workout_hours_10',    'Ten Hour Athlete',      'Spend 10 total hours working out',           '\u{23F1}\uFE0F', 10, { progressUnit: 'custom' }),  skillTreeOrder: order++ },
    { ...base, ...t('workout_hours_50',    'Fifty Hour Grinder',    'Spend 50 total hours working out',           '\u{23F1}\uFE0F', 50, { progressUnit: 'custom' }),  skillTreeOrder: order++, xpReward: 100 },
    { ...base, ...t('workout_hours_100',   'Hundred Hour Hero',     'Spend 100 total hours working out',          '\u{23F1}\uFE0F', 100, { progressUnit: 'custom' }), skillTreeOrder: order++, xpReward: 200 },
    // Specific exercise mastery
    { ...base, ...t('squat_master',        'Squat Master',          'Complete 100 squat sets with progressive overload', '\u{1F9CE}', 100, { progressUnit: 'custom', requirements: [{ type: 'exercise', name: 'squat' }] }), skillTreeOrder: order++, xpReward: 150 },
    { ...base, ...t('bench_master',        'Bench Press King',      'Complete 100 bench press sets',              '\u{1F3CB}\uFE0F', 100, { progressUnit: 'custom', requirements: [{ type: 'exercise', name: 'bench_press' }] }), skillTreeOrder: order++, xpReward: 150 },
    { ...base, ...t('deadlift_master',     'Deadlift Titan',        'Complete 100 deadlift sets',                 '\u{1FAAB}', 100, { progressUnit: 'custom', requirements: [{ type: 'exercise', name: 'deadlift' }] }), skillTreeOrder: order++, xpReward: 150 },
    { ...base, ...t('ohp_master',          'Overhead Champion',     'Complete 100 overhead press sets',           '\u{1F3CB}\uFE0F', 100, { progressUnit: 'custom', requirements: [{ type: 'exercise', name: 'overhead_press' }] }), skillTreeOrder: order++, xpReward: 150 },
    // Workout style badges
    { ...base, ...t('bodyweight_master',   'Bodyweight Boss',       'Complete 50 bodyweight-only workouts',       '\u{1F938}', 50),  skillTreeOrder: order++, xpReward: 100 },
    { ...base, ...t('cardio_king',         'Cardio King',           'Complete 50 cardio workouts',                '\u{1F3C3}', 50),  skillTreeOrder: order++, xpReward: 100 },
    { ...base, ...t('flexibility_pro',     'Flexibility Pro',       'Complete 30 flexibility/mobility sessions',  '\u{1F9D8}', 30, { progressUnit: 'sessions' }),  skillTreeOrder: order++, xpReward: 75 },
    { ...base, ...t('morning_warrior',     'Morning Warrior',       'Complete 25 workouts before 8 AM',           '\u{1F305}', 25, { requirements: [{ type: 'time_window', before: '08:00' }] }), skillTreeOrder: order++, xpReward: 75 },
    { ...base, ...t('weekend_warrior',     'Weekend Warrior',       'Complete 20 weekend workouts',               '\u{1F4AA}', 20, { requirements: [{ type: 'day_of_week', days: [0, 6] }] }),  skillTreeOrder: order++, xpReward: 75 },
  ];
}

// ============================
// 4. THE TRIBE / SOCIAL (40 cores)
// ============================
function tribeSocialTemplates() {
  const tree = 'tribe_social';
  const cat  = 'social';
  const base = { skillTree: tree, category: cat, xpReward: 30, requiredPoints: 0, progressUnit: 'completion' };
  let order = 1;

  return [
    // Post counts
    { ...base, ...t('post_count_5',        'New Poster',            'Create 5 social posts',                      '\u{1F4DD}', 5),   skillTreeOrder: order++ },
    { ...base, ...t('post_count_10',       'Active Poster',         'Create 10 social posts',                     '\u{1F4DD}', 10),  skillTreeOrder: order++ },
    { ...base, ...t('post_count_25',       'Prolific Writer',       'Create 25 social posts',                     '\u{1F4DD}', 25),  skillTreeOrder: order++, xpReward: 50 },
    { ...base, ...t('post_count_50',       'Content Creator',       'Create 50 social posts',                     '\u{1F4DD}', 50),  skillTreeOrder: order++, xpReward: 75 },
    { ...base, ...t('post_count_100',      'Publishing Legend',     'Create 100 social posts',                    '\u{1F4DD}', 100), skillTreeOrder: order++, xpReward: 150 },
    // Likes given
    { ...base, ...t('like_given_10',       'Generous Heart',        'Give 10 likes to others',                    '\u{1F44D}', 10),  skillTreeOrder: order++ },
    { ...base, ...t('like_given_50',       'Encourager',            'Give 50 likes to others',                    '\u{1F44D}', 50),  skillTreeOrder: order++ },
    { ...base, ...t('like_given_100',      'Cheerleader',           'Give 100 likes to others',                   '\u{1F44D}', 100), skillTreeOrder: order++, xpReward: 50 },
    { ...base, ...t('like_given_500',      'Like Machine',          'Give 500 likes to others',                   '\u{1F44D}', 500), skillTreeOrder: order++, xpReward: 100 },
    // Likes received
    { ...base, ...t('like_received_10',    'Getting Noticed',       'Receive 10 likes on your posts',             '\u{2764}\uFE0F', 10),  skillTreeOrder: order++ },
    { ...base, ...t('like_received_50',    'Community Favorite',    'Receive 50 likes on your posts',             '\u{2764}\uFE0F', 50),  skillTreeOrder: order++, xpReward: 50 },
    { ...base, ...t('like_received_100',   'Beloved Member',        'Receive 100 likes on your posts',            '\u{2764}\uFE0F', 100), skillTreeOrder: order++, xpReward: 100 },
    { ...base, ...t('like_received_500',   'Heart Magnet',          'Receive 500 likes on your posts',            '\u{2764}\uFE0F', 500), skillTreeOrder: order++, xpReward: 200 },
    // Comments
    { ...base, ...t('comment_count_10',    'Commenter',             'Write 10 comments',                          '\u{1F4AC}', 10),  skillTreeOrder: order++ },
    { ...base, ...t('comment_count_50',    'Discussion Leader',     'Write 50 comments',                          '\u{1F4AC}', 50),  skillTreeOrder: order++, xpReward: 50 },
    { ...base, ...t('comment_count_100',   'Commentator Pro',       'Write 100 comments',                         '\u{1F4AC}', 100), skillTreeOrder: order++, xpReward: 100 },
    // Followers
    { ...base, ...t('follower_count_5',    'Small Following',       'Gain 5 followers',                           '\u{1F465}', 5),   skillTreeOrder: order++ },
    { ...base, ...t('follower_count_10',   'Growing Influence',     'Gain 10 followers',                          '\u{1F465}', 10),  skillTreeOrder: order++ },
    { ...base, ...t('follower_count_25',   'Community Leader',      'Gain 25 followers',                          '\u{1F465}', 25),  skillTreeOrder: order++, xpReward: 75 },
    { ...base, ...t('follower_count_50',   'Influencer',            'Gain 50 followers',                          '\u{1F465}', 50),  skillTreeOrder: order++, xpReward: 150 },
    { ...base, ...t('follower_count_100',  'SwanStudios Celebrity', 'Gain 100 followers',                         '\u{1F465}', 100), skillTreeOrder: order++, xpReward: 300 },
    // Following
    { ...base, ...t('following_count_10',  'Network Builder',       'Follow 10 members',                          '\u{1F517}', 10),  skillTreeOrder: order++ },
    { ...base, ...t('following_count_25',  'Connected',             'Follow 25 members',                          '\u{1F517}', 25),  skillTreeOrder: order++ },
    { ...base, ...t('following_count_50',  'Deeply Connected',      'Follow 50 members',                          '\u{1F517}', 50),  skillTreeOrder: order++, xpReward: 50 },
    // Sharing activities
    { ...base, ...t('share_workout',       'Workout Sharer',        'Share a workout summary with the community', '\u{1F4E4}', 1),   skillTreeOrder: order++ },
    { ...base, ...t('share_progress_photo','Progress Photographer', 'Share a progress photo',                     '\u{1F4F7}', 1),   skillTreeOrder: order++, xpReward: 50 },
    // Events and groups
    { ...base, ...t('event_attendance_1',  'Event Goer',            'Attend your first community event',          '\u{1F389}', 1),   skillTreeOrder: order++ },
    { ...base, ...t('event_attendance_5',  'Event Regular',         'Attend 5 community events',                  '\u{1F389}', 5),   skillTreeOrder: order++ },
    { ...base, ...t('event_attendance_10', 'Event Enthusiast',      'Attend 10 community events',                 '\u{1F389}', 10),  skillTreeOrder: order++, xpReward: 75 },
    { ...base, ...t('group_join_1',        'Team Player',           'Join your first group',                      '\u{1F46B}', 1),   skillTreeOrder: order++ },
    { ...base, ...t('group_join_3',        'Social Butterfly',      'Join 3 groups',                              '\u{1F46B}', 3),   skillTreeOrder: order++ },
    { ...base, ...t('group_join_5',        'Group Collector',       'Join 5 groups',                              '\u{1F46B}', 5),   skillTreeOrder: order++, xpReward: 50 },
    // Helping and motivating
    { ...base, ...t('help_newbie',         'Helpful Hand',          'Help a new member get started',              '\u{1F91D}', 1),   skillTreeOrder: order++, xpReward: 50 },
    { ...base, ...t('motivate_others',     'Motivator',             'Send 10 motivational messages',              '\u{1F4AA}', 10),  skillTreeOrder: order++ },
    // Popular posts
    { ...base, ...t('popular_post',        'Popular Post',          'Get 10 or more likes on a single post',      '\u{1F525}', 1, { requirements: [{ type: 'single_post_likes', min: 10 }] }),  skillTreeOrder: order++, xpReward: 75 },
    { ...base, ...t('viral_post',          'Viral Post',            'Get 50 or more likes on a single post',      '\u{1F680}', 1, { requirements: [{ type: 'single_post_likes', min: 50 }] }),  skillTreeOrder: order++, xpReward: 200 },
    // Community pillar
    { ...base, ...t('conversation_leader', 'Conversation Leader',   'Start 25 discussions that get 5+ replies',   '\u{1F5E3}\uFE0F', 25, { requirements: [{ type: 'thread_replies', min: 5 }] }), skillTreeOrder: order++, xpReward: 100 },
    { ...base, ...t('community_pillar',    'Community Pillar',      'Be active every day for 30 days and help 10 members', '\u{1F3DB}\uFE0F', 1, { requirements: [{ type: 'composite', active_days: 30, helped_members: 10 }] }), skillTreeOrder: order++, xpReward: 300 },
    // Additional social
    { ...base, ...t('first_group_post',    'Group Voice',           'Create your first post in a group',          '\u{1F4E3}', 1),   skillTreeOrder: order++ },
    { ...base, ...t('profile_visitor',     'Profile Visitor',       'Visit 20 other members\' profiles',          '\u{1F440}', 20),  skillTreeOrder: order++ },
  ];
}

// ============================
// 5. THE FREE SPIRIT / HOLISTIC (35 cores)
// ============================
function freeSpiritTemplates() {
  const tree = 'free_spirit';
  const cat  = 'special';
  const base = { skillTree: tree, category: cat, xpReward: 40, requiredPoints: 0, progressUnit: 'days' };
  let order = 1;

  return [
    // Nutrition logging
    { ...base, ...t('log_nutrition_1',     'First Fuel Log',        'Log your nutrition for the first time',      '\u{1F34E}', 1),   skillTreeOrder: order++ },
    { ...base, ...t('log_nutrition_7',     'Week of Fuel',          'Log your nutrition for 7 days',              '\u{1F34E}', 7),   skillTreeOrder: order++ },
    { ...base, ...t('log_nutrition_30',    'Month of Mindful Eating', 'Log your nutrition for 30 days',           '\u{1F34E}', 30),  skillTreeOrder: order++, xpReward: 75 },
    { ...base, ...t('log_nutrition_90',    'Quarterly Nutrition',   'Log your nutrition for 90 days',             '\u{1F34E}', 90),  skillTreeOrder: order++, xpReward: 150 },
    // Meditation logging
    { ...base, ...t('log_meditation_1',    'First Calm',            'Log your first meditation session',          '\u{1F9D8}', 1),   skillTreeOrder: order++ },
    { ...base, ...t('log_meditation_7',    'Inner Peace Week',      'Meditate for 7 days',                        '\u{1F9D8}', 7),   skillTreeOrder: order++ },
    { ...base, ...t('log_meditation_30',   'Zen Master',            'Meditate for 30 days',                       '\u{1F9D8}', 30),  skillTreeOrder: order++, xpReward: 100 },
    { ...base, ...t('log_meditation_90',   'Enlightened',           'Meditate for 90 days',                       '\u{1F9D8}', 90),  skillTreeOrder: order++, xpReward: 200 },
    // Sleep logging
    { ...base, ...t('log_sleep_1',         'Sleep Tracker',         'Log your sleep for the first time',          '\u{1F634}', 1),   skillTreeOrder: order++ },
    { ...base, ...t('log_sleep_7',         'Sleep Conscious',       'Log your sleep for 7 days',                  '\u{1F634}', 7),   skillTreeOrder: order++ },
    { ...base, ...t('log_sleep_30',        'Sleep Scientist',       'Log your sleep for 30 days',                 '\u{1F634}', 30),  skillTreeOrder: order++, xpReward: 75 },
    // Recovery days
    { ...base, ...t('recovery_day_1',      'Rest Respected',        'Log your first recovery day',                '\u{1F6CF}\uFE0F', 1, { progressUnit: 'completion' }),  skillTreeOrder: order++ },
    { ...base, ...t('recovery_day_10',     'Recovery Rhythm',       'Log 10 recovery days',                       '\u{1F6CF}\uFE0F', 10, { progressUnit: 'completion' }), skillTreeOrder: order++ },
    { ...base, ...t('recovery_day_30',     'Recovery Master',       'Log 30 recovery days',                       '\u{1F6CF}\uFE0F', 30, { progressUnit: 'completion' }), skillTreeOrder: order++, xpReward: 100 },
    // Hydration streak
    { ...base, ...t('hydration_streak_3',  'Hydration Start',       'Track hydration for 3 consecutive days',     '\u{1F4A7}', 3),   skillTreeOrder: order++ },
    { ...base, ...t('hydration_streak_7',  'Water Week',            'Track hydration for 7 consecutive days',     '\u{1F4A7}', 7),   skillTreeOrder: order++ },
    { ...base, ...t('hydration_streak_30', 'Hydration Hero',        'Track hydration for 30 consecutive days',    '\u{1F4A7}', 30),  skillTreeOrder: order++, xpReward: 75 },
    // Balanced week
    { ...base, ...t('balanced_week',       'Balanced Week',         'Complete workout, nutrition, and recovery in one week', '\u{2696}\uFE0F', 1, { progressUnit: 'completion', requirements: [{ type: 'composite', workout: true, nutrition: true, recovery: true }] }), skillTreeOrder: order++, xpReward: 75 },
    // Mind-body
    { ...base, ...t('mind_body_connection','Mind-Body Connection',  'Complete a combined mindfulness and workout session', '\u{1F54A}\uFE0F', 1, { progressUnit: 'completion' }),  skillTreeOrder: order++, xpReward: 50 },
    // Outdoor workouts
    { ...base, ...t('outdoor_workout_1',   'Fresh Air',             'Complete your first outdoor workout',         '\u{1F332}', 1, { progressUnit: 'workouts' }),  skillTreeOrder: order++ },
    { ...base, ...t('outdoor_workout_10',  'Nature Athlete',        'Complete 10 outdoor workouts',                '\u{1F332}', 10, { progressUnit: 'workouts' }), skillTreeOrder: order++ },
    { ...base, ...t('outdoor_workout_25',  'Outdoor Champion',      'Complete 25 outdoor workouts',                '\u{1F332}', 25, { progressUnit: 'workouts' }), skillTreeOrder: order++, xpReward: 75 },
    // Yoga
    { ...base, ...t('yoga_session_1',      'First Flow',            'Complete your first yoga session',            '\u{1F9D8}\u200D\u2640\uFE0F', 1, { progressUnit: 'sessions' }),  skillTreeOrder: order++ },
    { ...base, ...t('yoga_session_10',     'Yoga Practitioner',     'Complete 10 yoga sessions',                   '\u{1F9D8}\u200D\u2640\uFE0F', 10, { progressUnit: 'sessions' }), skillTreeOrder: order++ },
    { ...base, ...t('yoga_session_30',     'Yoga Devotee',          'Complete 30 yoga sessions',                   '\u{1F9D8}\u200D\u2640\uFE0F', 30, { progressUnit: 'sessions' }), skillTreeOrder: order++, xpReward: 100 },
    // Stretching
    { ...base, ...t('stretching_routine_10','Stretch Starter',      'Complete 10 stretching routines',             '\u{1F938}\u200D\u2640\uFE0F', 10, { progressUnit: 'sessions' }), skillTreeOrder: order++ },
    { ...base, ...t('stretching_routine_30','Flexibility Fanatic',  'Complete 30 stretching routines',             '\u{1F938}\u200D\u2640\uFE0F', 30, { progressUnit: 'sessions' }), skillTreeOrder: order++, xpReward: 75 },
    // Rest day honored
    { ...base, ...t('rest_day_honored',    'Rest Day Honored',      'Take a scheduled rest day instead of overtraining', '\u{1F6D1}', 1, { progressUnit: 'completion' }), skillTreeOrder: order++ },
    // Stress management
    { ...base, ...t('stress_management',   'Stress Slayer',         'Log 10 stress management activities',        '\u{1F9E7}', 10, { progressUnit: 'completion' }), skillTreeOrder: order++ },
    // Healthy meal prep
    { ...base, ...t('healthy_meal_prep_5', 'Meal Prepper',          'Log 5 meal prep sessions',                   '\u{1F957}', 5, { progressUnit: 'completion' }),  skillTreeOrder: order++ },
    { ...base, ...t('healthy_meal_prep_20','Meal Prep Pro',         'Log 20 meal prep sessions',                  '\u{1F957}', 20, { progressUnit: 'completion' }), skillTreeOrder: order++, xpReward: 75 },
    // Supplement tracking
    { ...base, ...t('supplement_tracking_7','Supplement Starter',   'Track supplements for 7 days',               '\u{1F48A}', 7),   skillTreeOrder: order++ },
    { ...base, ...t('supplement_tracking_30','Supplement Consistent','Track supplements for 30 days',              '\u{1F48A}', 30),  skillTreeOrder: order++, xpReward: 75 },
    // Wellness journal
    { ...base, ...t('wellness_journal_7',  'Journal Beginner',      'Write in your wellness journal for 7 days',  '\u{1F4D3}', 7),   skillTreeOrder: order++ },
    { ...base, ...t('wellness_journal_30', 'Journal Master',        'Write in your wellness journal for 30 days', '\u{1F4D3}', 30),  skillTreeOrder: order++, xpReward: 100 },
  ];
}

// ============================
// 6. THE UNBROKEN / STREAKS (35 cores)
// ============================
function unbrokenStreakTemplates() {
  const tree = 'unbroken_streaks';
  const cat  = 'streak';
  const base = { skillTree: tree, category: cat, xpReward: 40, requiredPoints: 0, progressUnit: 'days' };
  let order = 1;

  return [
    // Login streaks
    { ...base, ...t('login_streak_3',      'Three-Day Spark',       'Log in for 3 consecutive days',              '\u{1F525}', 3),    skillTreeOrder: order++ },
    { ...base, ...t('login_streak_7',      'Weekly Ritual',         'Log in for 7 consecutive days',              '\u{1F525}', 7),    skillTreeOrder: order++, xpReward: 50 },
    { ...base, ...t('login_streak_14',     'Two-Week Flame',        'Log in for 14 consecutive days',             '\u{1F525}', 14),   skillTreeOrder: order++, xpReward: 75 },
    { ...base, ...t('login_streak_30',     'Monthly Blaze',         'Log in for 30 consecutive days',             '\u{1F525}', 30),   skillTreeOrder: order++, xpReward: 150 },
    { ...base, ...t('login_streak_60',     'Two-Month Inferno',     'Log in for 60 consecutive days',             '\u{1F525}', 60),   skillTreeOrder: order++, xpReward: 300 },
    { ...base, ...t('login_streak_90',     'Quarterly Dedication',  'Log in for 90 consecutive days',             '\u{1F525}', 90),   skillTreeOrder: order++, xpReward: 500 },
    { ...base, ...t('login_streak_180',    'Half-Year Hero',        'Log in for 180 consecutive days',            '\u{1F525}', 180),  skillTreeOrder: order++, xpReward: 1000 },
    { ...base, ...t('login_streak_365',    'Year of Fire',          'Log in for 365 consecutive days',            '\u{1F525}', 365),  skillTreeOrder: order++, xpReward: 2500 },
    // Workout streaks
    { ...base, ...t('workout_streak_3',    'Three-Day Push',        'Work out for 3 consecutive days',            '\u{1F4AA}', 3),    skillTreeOrder: order++ },
    { ...base, ...t('workout_streak_7',    'Iron Week',             'Work out for 7 consecutive days',            '\u{1F4AA}', 7),    skillTreeOrder: order++, xpReward: 75 },
    { ...base, ...t('workout_streak_14',   'Fortnight of Iron',     'Work out for 14 consecutive days',           '\u{1F4AA}', 14),   skillTreeOrder: order++, xpReward: 150 },
    { ...base, ...t('workout_streak_30',   'Monthly Grind',         'Work out for 30 consecutive days',           '\u{1F4AA}', 30),   skillTreeOrder: order++, xpReward: 300 },
    { ...base, ...t('workout_streak_60',   'Two-Month Machine',     'Work out for 60 consecutive days',           '\u{1F4AA}', 60),   skillTreeOrder: order++, xpReward: 600 },
    { ...base, ...t('workout_streak_90',   'Quarterly Beast',       'Work out for 90 consecutive days',           '\u{1F4AA}', 90),   skillTreeOrder: order++, xpReward: 1000 },
    // Posting streaks
    { ...base, ...t('posting_streak_3',    'Chat Streak',           'Post for 3 consecutive days',                '\u{1F4DD}', 3),    skillTreeOrder: order++ },
    { ...base, ...t('posting_streak_7',    'Voice of the Week',     'Post for 7 consecutive days',                '\u{1F4DD}', 7),    skillTreeOrder: order++, xpReward: 50 },
    { ...base, ...t('posting_streak_30',   'Daily Voice',           'Post every day for 30 days',                 '\u{1F4DD}', 30),   skillTreeOrder: order++, xpReward: 200 },
    // Nutrition streaks
    { ...base, ...t('nutrition_streak_3',  'Fuel Streak',           'Log nutrition for 3 consecutive days',       '\u{1F34E}', 3),    skillTreeOrder: order++ },
    { ...base, ...t('nutrition_streak_7',  'Nutrition Week',        'Log nutrition for 7 consecutive days',       '\u{1F34E}', 7),    skillTreeOrder: order++, xpReward: 50 },
    { ...base, ...t('nutrition_streak_30', 'Nutrition Month',       'Log nutrition for 30 consecutive days',      '\u{1F34E}', 30),   skillTreeOrder: order++, xpReward: 200 },
    // Perfect periods
    { ...base, ...t('perfect_week',        'Perfect Week',          'Be active all 7 days of the week',           '\u{2B50}', 7),     skillTreeOrder: order++, xpReward: 100 },
    { ...base, ...t('perfect_month',       'Perfect Month',         'Be active every day for an entire month',    '\u{1F31F}', 30),   skillTreeOrder: order++, xpReward: 500 },
    // Early bird
    { ...base, ...t('early_bird_streak_3', 'Early Riser',           'Work out before 6 AM for 3 days',            '\u{1F305}', 3, { requirements: [{ type: 'time_window', before: '06:00' }] }),  skillTreeOrder: order++ },
    { ...base, ...t('early_bird_streak_7', 'Dawn Warrior',          'Work out before 6 AM for 7 days',            '\u{1F305}', 7, { requirements: [{ type: 'time_window', before: '06:00' }] }),  skillTreeOrder: order++, xpReward: 100 },
    { ...base, ...t('early_bird_streak_30','Sunrise Legend',         'Work out before 6 AM for 30 days',           '\u{1F305}', 30, { requirements: [{ type: 'time_window', before: '06:00' }] }), skillTreeOrder: order++, xpReward: 300 },
    // Mindset / willpower
    { ...base, ...t('consistency_king',    'Consistency King',      'Maintain any streak for 60+ days',            '\u{1F451}', 60),   skillTreeOrder: order++, xpReward: 400 },
    { ...base, ...t('iron_will',           'Iron Will',             'Never miss a scheduled workout for 30 days',  '\u{1F9BE}', 30, { requirements: [{ type: 'no_missed_scheduled', days: 30 }] }), skillTreeOrder: order++, xpReward: 300 },
    { ...base, ...t('unstoppable',         'Unstoppable',           'Maintain a 100-day activity streak',          '\u{26A1}', 100),   skillTreeOrder: order++, xpReward: 1000 },
    // Comeback achievements
    { ...base, ...t('phoenix',             'Phoenix Rising',        'Resume activity after a 14+ day break',       '\u{1F426}\u200D\u{1F525}', 1, { progressUnit: 'completion', requirements: [{ type: 'comeback', min_break_days: 14 }] }), skillTreeOrder: order++, xpReward: 100 },
    { ...base, ...t('comeback_kid',        'Comeback Kid',          'Hit a new PR after returning from a break',   '\u{1F4A5}', 1, { progressUnit: 'completion', requirements: [{ type: 'pr_after_break' }] }), skillTreeOrder: order++, xpReward: 150 },
    // Mastery
    { ...base, ...t('discipline_master',   'Discipline Master',     'Complete 200 days of tracked activity in a year', '\u{1F3C5}', 200), skillTreeOrder: order++, xpReward: 500 },
    { ...base, ...t('yearly_champion',     'Yearly Champion',       'Be active 365 days in a single calendar year',    '\u{1F3C6}', 365), skillTreeOrder: order++, xpReward: 2500 },
    // Additional streak variants
    { ...base, ...t('evening_warrior_7',   'Night Owl',             'Work out after 8 PM for 7 consecutive days',  '\u{1F319}', 7, { requirements: [{ type: 'time_window', after: '20:00' }] }), skillTreeOrder: order++, xpReward: 75 },
    { ...base, ...t('weekend_streak_4',    'Weekend Regular',       'Work out every weekend for 4 weeks',          '\u{1F4AA}', 4, { progressUnit: 'completion', requirements: [{ type: 'weekend_consecutive', weeks: 4 }] }), skillTreeOrder: order++ },
    { ...base, ...t('double_streak',       'Double Threat',         'Maintain workout + nutrition streaks simultaneously for 14 days', '\u{1F4AB}', 14, { requirements: [{ type: 'dual_streak', streak_a: 'workout', streak_b: 'nutrition' }] }), skillTreeOrder: order++, xpReward: 200 },
  ];
}

// ============================
// 7. HIDDEN / SECRET (50 achievements -- single tier only)
// ============================
function hiddenAchievements() {
  const now = new Date();
  const hidden = { isHidden: true, isSecret: true };

  const templates = [
    // Time-based easter eggs
    { name: 'midnight_warrior',     title: 'Midnight Warrior',       description: 'Complete a workout between midnight and 4 AM',       iconEmoji: '\u{1F319}', category: 'fitness',    xpReward: 100, maxProgress: 1, progressUnit: 'completion', requirements: [{ type: 'time_window', after: '00:00', before: '04:00' }], skillTree: 'iron_gravity', skillTreeOrder: 99 },
    { name: 'holiday_hero',         title: 'Holiday Hero',           description: 'Complete a workout on Christmas Day',                iconEmoji: '\u{1F384}', category: 'fitness',    xpReward: 150, maxProgress: 1, progressUnit: 'completion', requirements: [{ type: 'date', month: 12, day: 25 }], skillTree: 'iron_gravity', skillTreeOrder: 99 },
    { name: 'leap_day_warrior',     title: 'Leap Day Warrior',       description: 'Complete a workout on February 29',                  iconEmoji: '\u{1F438}', category: 'special',    xpReward: 250, maxProgress: 1, progressUnit: 'completion', requirements: [{ type: 'date', month: 2, day: 29 }], skillTree: 'iron_gravity', skillTreeOrder: 99 },
    { name: 'new_year_new_me',      title: 'New Year New Me',        description: 'Work out on January 1st',                            iconEmoji: '\u{1F386}', category: 'special',    xpReward: 100, maxProgress: 1, progressUnit: 'completion', requirements: [{ type: 'date', month: 1, day: 1 }], skillTree: 'iron_gravity', skillTreeOrder: 99 },
    { name: 'valentines_sweat',     title: 'Valentine\'s Sweat',     description: 'Work out on Valentine\'s Day',                       iconEmoji: '\u{1F498}', category: 'special',    xpReward: 100, maxProgress: 1, progressUnit: 'completion', requirements: [{ type: 'date', month: 2, day: 14 }], skillTree: 'iron_gravity', skillTreeOrder: 99 },
    { name: 'independence_day',     title: 'Independence Day Iron',  description: 'Work out on July 4th',                               iconEmoji: '\u{1F1FA}\u{1F1F8}', category: 'special', xpReward: 100, maxProgress: 1, progressUnit: 'completion', requirements: [{ type: 'date', month: 7, day: 4 }], skillTree: 'iron_gravity', skillTreeOrder: 99 },
    { name: 'halloween_workout',    title: 'Spooky Gains',           description: 'Work out on Halloween',                              iconEmoji: '\u{1F383}', category: 'special',    xpReward: 100, maxProgress: 1, progressUnit: 'completion', requirements: [{ type: 'date', month: 10, day: 31 }], skillTree: 'iron_gravity', skillTreeOrder: 99 },
    { name: 'friday_13th',          title: 'Lucky Lifter',           description: 'Work out on a Friday the 13th',                      iconEmoji: '\u{1F3F4}\u200D\u2620\uFE0F', category: 'special', xpReward: 150, maxProgress: 1, progressUnit: 'completion', requirements: [{ type: 'day_combo', dayOfWeek: 5, dayOfMonth: 13 }], skillTree: 'iron_gravity', skillTreeOrder: 99 },
    // Milestone easter eggs
    { name: 'century_club',         title: 'Century Club',           description: 'Complete your 100th workout',                         iconEmoji: '\u{1F4AF}', category: 'fitness',    xpReward: 500, maxProgress: 100, progressUnit: 'workouts', skillTree: 'iron_gravity', skillTreeOrder: 99 },
    { name: 'thousand_club',        title: 'Thousand Club',          description: 'Complete your 1,000th workout',                       iconEmoji: '\u{1F3C6}', category: 'fitness',    xpReward: 2500, maxProgress: 1000, progressUnit: 'workouts', skillTree: 'iron_gravity', skillTreeOrder: 99 },
    { name: 'perfect_form',         title: 'Perfect Form',           description: 'Receive a perfect form rating from your trainer',     iconEmoji: '\u{1F947}', category: 'fitness',    xpReward: 200, maxProgress: 1, progressUnit: 'completion', skillTree: 'forge_nasm', skillTreeOrder: 99 },
    { name: 'speed_demon',          title: 'Speed Demon',            description: 'Complete a workout in under 20 minutes',              iconEmoji: '\u{26A1}',  category: 'fitness',    xpReward: 75,  maxProgress: 1, progressUnit: 'completion', requirements: [{ type: 'duration_max', minutes: 20 }], skillTree: 'iron_gravity', skillTreeOrder: 99 },
    { name: 'marathon_session',     title: 'Marathon Session',        description: 'Complete a workout lasting 3+ hours',                 iconEmoji: '\u{1F3C3}', category: 'fitness',    xpReward: 200, maxProgress: 1, progressUnit: 'completion', requirements: [{ type: 'duration_min', minutes: 180 }], skillTree: 'iron_gravity', skillTreeOrder: 99 },
    { name: 'social_butterfly_30',  title: 'Social Butterfly',        description: 'Post every single day for a month',                  iconEmoji: '\u{1F98B}', category: 'social',     xpReward: 300, maxProgress: 30, progressUnit: 'days', skillTree: 'tribe_social', skillTreeOrder: 99 },
    { name: 'triple_digit_streak',  title: 'Triple Digit Streak',    description: 'Reach a 100-day login streak',                        iconEmoji: '\u{1F4AF}', category: 'streak',     xpReward: 1000, maxProgress: 100, progressUnit: 'days', skillTree: 'unbroken_streaks', skillTreeOrder: 99 },
    // Fun / quirky
    { name: 'round_number',         title: 'Nice Round Number',      description: 'Have exactly 1,000 XP at any point',                  iconEmoji: '\u{1F4B0}', category: 'special',    xpReward: 50,  maxProgress: 1, progressUnit: 'completion', skillTree: 'awakening', skillTreeOrder: 99 },
    { name: 'palindrome_streak',    title: 'Palindrome Streak',      description: 'Reach a streak of exactly 11, 22, 33, 44, or 55 days', iconEmoji: '\u{1F500}', category: 'streak', xpReward: 75, maxProgress: 1, progressUnit: 'completion', requirements: [{ type: 'streak_palindrome' }], skillTree: 'unbroken_streaks', skillTreeOrder: 99 },
    { name: 'early_adopter',        title: 'Early Adopter',          description: 'Join SwanStudios within the first 90 days of launch',  iconEmoji: '\u{1F680}', category: 'milestone',  xpReward: 200, maxProgress: 1, progressUnit: 'completion', requirements: [{ type: 'join_within_days', days: 90 }], skillTree: 'awakening', skillTreeOrder: 99 },
    { name: 'night_owl_50',         title: 'Night Owl',              description: 'Complete 50 workouts after 9 PM',                      iconEmoji: '\u{1F989}', category: 'fitness',    xpReward: 150, maxProgress: 50, progressUnit: 'workouts', requirements: [{ type: 'time_window', after: '21:00' }], skillTree: 'iron_gravity', skillTreeOrder: 99 },
    { name: 'rain_or_shine',        title: 'Rain or Shine',          description: 'Work out on a day with severe weather alerts',          iconEmoji: '\u{1F327}\uFE0F', category: 'special', xpReward: 100, maxProgress: 1, progressUnit: 'completion', skillTree: 'iron_gravity', skillTreeOrder: 99 },
    { name: 'full_moon_workout',    title: 'Lunar Lifter',           description: 'Work out during a full moon',                          iconEmoji: '\u{1F315}', category: 'special',    xpReward: 100, maxProgress: 1, progressUnit: 'completion', skillTree: 'free_spirit', skillTreeOrder: 99 },
    // Social easter eggs
    { name: 'first_viral',          title: 'Gone Viral',             description: 'Get 100+ likes on a single post',                      iconEmoji: '\u{1F4A3}', category: 'social',     xpReward: 500, maxProgress: 1, progressUnit: 'completion', requirements: [{ type: 'single_post_likes', min: 100 }], skillTree: 'tribe_social', skillTreeOrder: 99 },
    { name: 'reply_chain_10',       title: 'Thread Master',          description: 'Create a comment thread with 10+ replies',              iconEmoji: '\u{1F9F5}', category: 'social',     xpReward: 100, maxProgress: 1, progressUnit: 'completion', requirements: [{ type: 'thread_length', min: 10 }], skillTree: 'tribe_social', skillTreeOrder: 99 },
    { name: 'mutual_follow_10',     title: 'Mutual Respect',         description: 'Have 10 mutual follows (you follow them, they follow you)', iconEmoji: '\u{1F91D}', category: 'social', xpReward: 75, maxProgress: 10, progressUnit: 'completion', skillTree: 'tribe_social', skillTreeOrder: 99 },
    { name: 'every_group',          title: 'Everywhere At Once',     description: 'Join every available group',                            iconEmoji: '\u{1F30D}', category: 'social',     xpReward: 150, maxProgress: 1, progressUnit: 'completion', skillTree: 'tribe_social', skillTreeOrder: 99 },
    { name: 'first_to_comment',     title: 'First!',                 description: 'Be the first to comment on 10 different posts',         iconEmoji: '\u{261D}\uFE0F', category: 'social', xpReward: 50, maxProgress: 10, progressUnit: 'completion', skillTree: 'tribe_social', skillTreeOrder: 99 },
    // Wellness easter eggs
    { name: 'zen_streak_21',        title: 'Zen Master',             description: 'Meditate for 21 consecutive days',                      iconEmoji: '\u{1F54E}', category: 'special',    xpReward: 200, maxProgress: 21, progressUnit: 'days', skillTree: 'free_spirit', skillTreeOrder: 99 },
    { name: 'sleep_8_hours_7',      title: 'Well Rested',            description: 'Log 8+ hours of sleep for 7 consecutive days',          iconEmoji: '\u{1F6CC}', category: 'special',    xpReward: 100, maxProgress: 7, progressUnit: 'days', requirements: [{ type: 'sleep_hours', min: 8 }], skillTree: 'free_spirit', skillTreeOrder: 99 },
    { name: 'no_sugar_7',           title: 'Sugar Free',             description: 'Log zero added sugar for 7 consecutive days',            iconEmoji: '\u{1F36C}', category: 'special',    xpReward: 100, maxProgress: 7, progressUnit: 'days', skillTree: 'free_spirit', skillTreeOrder: 99 },
    { name: 'gallon_a_day',         title: 'Gallon Gang',            description: 'Drink a gallon of water in a single day',               iconEmoji: '\u{1F4A7}', category: 'special',    xpReward: 75, maxProgress: 1, progressUnit: 'completion', skillTree: 'free_spirit', skillTreeOrder: 99 },
    { name: 'mindful_eating_14',    title: 'Mindful Eater',          description: 'Practice mindful eating for 14 consecutive days',        iconEmoji: '\u{1F9D8}', category: 'special',    xpReward: 150, maxProgress: 14, progressUnit: 'days', skillTree: 'free_spirit', skillTreeOrder: 99 },
    // Streak easter eggs
    { name: 'unbreakable_180',      title: 'Unbreakable',            description: 'Maintain a 180-day workout streak',                     iconEmoji: '\u{1F48E}', category: 'streak',     xpReward: 2000, maxProgress: 180, progressUnit: 'days', skillTree: 'unbroken_streaks', skillTreeOrder: 99 },
    { name: 'never_skip_leg_day',   title: 'Never Skip Leg Day',     description: 'Include legs in every workout for 30 days',             iconEmoji: '\u{1F9B5}', category: 'fitness',    xpReward: 200, maxProgress: 30, progressUnit: 'days', requirements: [{ type: 'muscle_group', group: 'legs' }], skillTree: 'iron_gravity', skillTreeOrder: 99 },
    { name: 'five_am_club_30',      title: '5 AM Club',              description: 'Work out before 5 AM for 30 days',                      iconEmoji: '\u{23F0}', category: 'streak',      xpReward: 500, maxProgress: 30, progressUnit: 'days', requirements: [{ type: 'time_window', before: '05:00' }], skillTree: 'unbroken_streaks', skillTreeOrder: 99 },
    { name: 'same_time_7',          title: 'Creature of Habit',      description: 'Work out at the same time (within 30 min) for 7 days',  iconEmoji: '\u{23F1}\uFE0F', category: 'streak', xpReward: 100, maxProgress: 7, progressUnit: 'days', requirements: [{ type: 'consistent_time', tolerance_minutes: 30 }], skillTree: 'unbroken_streaks', skillTreeOrder: 99 },
    // Education easter eggs
    { name: 'binge_learner',        title: 'Binge Learner',          description: 'Complete 5 learning modules in a single day',            iconEmoji: '\u{1F4DA}', category: 'milestone',  xpReward: 150, maxProgress: 5, progressUnit: 'completion', requirements: [{ type: 'same_day', count: 5 }], skillTree: 'forge_nasm', skillTreeOrder: 99 },
    { name: 'perfect_score',        title: 'Perfect Score',          description: 'Score 100% on any quiz',                                 iconEmoji: '\u{1F4AF}', category: 'milestone',  xpReward: 100, maxProgress: 1, progressUnit: 'completion', skillTree: 'forge_nasm', skillTreeOrder: 99 },
    { name: 'quiz_speed_run',       title: 'Speed Reader',           description: 'Complete a quiz in under 60 seconds with 80%+ score',    iconEmoji: '\u{26A1}', category: 'milestone',   xpReward: 100, maxProgress: 1, progressUnit: 'completion', requirements: [{ type: 'quiz_time_max', seconds: 60, min_score: 80 }], skillTree: 'forge_nasm', skillTreeOrder: 99 },
    // Platform engagement easter eggs
    { name: 'all_trees_started',    title: 'Skill Tree Explorer',    description: 'Earn at least one achievement in every skill tree',       iconEmoji: '\u{1F333}', category: 'milestone',  xpReward: 300, maxProgress: 6, progressUnit: 'completion', skillTree: 'awakening', skillTreeOrder: 99 },
    { name: 'fifty_achievements',   title: 'Achievement Hunter',     description: 'Unlock 50 different achievements',                       iconEmoji: '\u{1F3AF}', category: 'milestone',  xpReward: 500, maxProgress: 50, progressUnit: 'completion', skillTree: 'awakening', skillTreeOrder: 99 },
    { name: 'hundred_achievements', title: 'Completionist',          description: 'Unlock 100 different achievements',                      iconEmoji: '\u{1F48E}', category: 'milestone',  xpReward: 1000, maxProgress: 100, progressUnit: 'completion', skillTree: 'awakening', skillTreeOrder: 99 },
    { name: 'max_level',            title: 'Crystalline Swan',       description: 'Reach the maximum level (Level 100)',                     iconEmoji: '\u{1F9A2}', category: 'milestone',  xpReward: 5000, maxProgress: 1, progressUnit: 'completion', requirements: [{ type: 'level_reached', level: 100 }], skillTree: 'awakening', skillTreeOrder: 99 },
    { name: 'first_hour',           title: 'First Hour',             description: 'Be active within the first hour of joining',              iconEmoji: '\u{23F0}', category: 'milestone',   xpReward: 50, maxProgress: 1, progressUnit: 'completion', requirements: [{ type: 'time_since_join', max_hours: 1 }], skillTree: 'awakening', skillTreeOrder: 99 },
    { name: 'share_milestone',      title: 'Milestone Sharer',       description: 'Share a milestone achievement on social',                 iconEmoji: '\u{1F4E3}', category: 'social',     xpReward: 50, maxProgress: 1, progressUnit: 'completion', skillTree: 'tribe_social', skillTreeOrder: 99 },
    { name: 'invite_accepted_5',    title: 'Talent Scout',           description: 'Have 5 invited friends join and complete their first workout', iconEmoji: '\u{1F50E}', category: 'social', xpReward: 250, maxProgress: 5, progressUnit: 'completion', skillTree: 'tribe_social', skillTreeOrder: 99 },
    { name: 'trainer_favorite',     title: 'Trainer\'s Favorite',    description: 'Receive 10 trainer endorsements',                         iconEmoji: '\u{2B50}', category: 'special',     xpReward: 200, maxProgress: 10, progressUnit: 'completion', skillTree: 'forge_nasm', skillTreeOrder: 99 },
    { name: 'comeback_phoenix',     title: 'Triple Phoenix',         description: 'Come back from a break three separate times',             iconEmoji: '\u{1F525}', category: 'streak',     xpReward: 300, maxProgress: 3, progressUnit: 'completion', requirements: [{ type: 'comeback_count', min: 3 }], skillTree: 'unbroken_streaks', skillTreeOrder: 99 },
    { name: 'birthday_workout',     title: 'Birthday Gains',         description: 'Work out on your birthday',                               iconEmoji: '\u{1F382}', category: 'special',    xpReward: 150, maxProgress: 1, progressUnit: 'completion', requirements: [{ type: 'birthday' }], skillTree: 'iron_gravity', skillTreeOrder: 99 },
    { name: 'anniversary_workout',  title: 'Anniversary Iron',       description: 'Work out on your SwanStudios anniversary date',            iconEmoji: '\u{1F389}', category: 'special',    xpReward: 200, maxProgress: 1, progressUnit: 'completion', requirements: [{ type: 'anniversary' }], skillTree: 'awakening', skillTreeOrder: 99 },
    { name: 'two_am_grind',        title: '2 AM Grind',             description: 'Log a workout at exactly 2 AM',                             iconEmoji: '\u{1F319}', category: 'fitness',    xpReward: 100, maxProgress: 1, progressUnit: 'completion', requirements: [{ type: 'time_window', after: '02:00', before: '02:15' }], skillTree: 'iron_gravity', skillTreeOrder: 99 },
  ];

  return templates.map(tpl => ({
    // Let PostgreSQL auto-generate id (works with both INTEGER and UUID columns)
    name:           tpl.name,
    title:          tpl.title,
    description:    tpl.description,
    iconEmoji:      tpl.iconEmoji,
    category:       tpl.category,
    rarity:         'legendary',
    xpReward:       tpl.xpReward,
    requiredPoints: 0,
    maxProgress:    tpl.maxProgress,
    progressUnit:   tpl.progressUnit,
    requirements:   JSON.stringify(tpl.requirements || []),
    tags:           JSON.stringify({
      skillTree:      tpl.skillTree,
      skillTreeOrder: tpl.skillTreeOrder,
      templateId:     tpl.name,
      tierLevel:      1,
      tierLabel:      'Hidden',
      sortOrder:      9999,
      hidden:         true,
    }),
    // Octalysis skill tree fields (top-level model columns)
    skillTree:      tpl.skillTree || null,
    skillTreeOrder: tpl.skillTreeOrder || null,
    templateId:     tpl.name,
    tierLevel:      1,
    difficulty:     5,
    isActive:       true,
    isHidden:       true,
    isSecret:       true,
    createdAt:      now,
    updatedAt:      now,
  }));
}

// ---------------------------------------------------------------------------
// Determine which templates get full tier expansion vs single-tier only
// ---------------------------------------------------------------------------

// One-time achievements that only make sense as a single tier
const ONE_TIME_NAMES = new Set([
  'first_login', 'complete_profile', 'first_workout', 'first_post',
  'first_like', 'first_comment', 'first_follow', 'upload_photo',
  'first_achievement', 'set_goal', 'invite_friend', 'customize_profile',
  'read_tutorial',
  // Forge one-timers
  'complete_assessment', 'watch_tutorial_1', 'complete_module_1',
  'pass_quiz_1', 'cert_progress_25', 'cert_progress_50', 'cert_progress_75',
  'cert_progress_100', 'share_knowledge', 'mentor_session',
  'nutrition_cert', 'exercise_science_cert', 'behavior_change_cert',
  'program_design_cert',
  // Iron & Gravity one-timers
  'personal_record_1', 'bodyweight_master', 'cardio_king', 'flexibility_pro',
  // Tribe one-timers
  'share_workout', 'share_progress_photo', 'event_attendance_1',
  'group_join_1', 'help_newbie', 'popular_post', 'viral_post',
  'first_group_post',
  // Free Spirit one-timers
  'log_nutrition_1', 'log_meditation_1', 'log_sleep_1', 'recovery_day_1',
  'balanced_week', 'mind_body_connection', 'outdoor_workout_1',
  'yoga_session_1', 'rest_day_honored',
  // Unbroken one-timers
  'phoenix', 'comeback_kid',
]);

// Templates that get 3 tiers (meaningful mid-range progression)
const THREE_TIER_NAMES = new Set([
  'explore_dashboard', 'first_week',
  'study_streak_3', 'study_streak_7',
  'hydration_streak_3', 'hydration_streak_7',
  'posting_streak_3',
  'nutrition_streak_3',
  'login_streak_3', 'workout_streak_3',
  'early_bird_streak_3',
  'stretching_routine_10',
  'log_sleep_7',
  'recovery_day_10',
  'supplement_tracking_7',
  'wellness_journal_7',
  'group_join_3',
  'following_count_10',
  'like_given_10',
  'like_received_10',
  'comment_count_10',
  'evening_warrior_7',
  'weekend_streak_4',
]);

function getTierCount(templateName) {
  if (ONE_TIME_NAMES.has(templateName)) return 1;
  if (THREE_TIER_NAMES.has(templateName)) return 3;
  return 5;
}

// ---------------------------------------------------------------------------
// Main seeder
// ---------------------------------------------------------------------------

module.exports = {
  async up(queryInterface, _Sequelize) {
    console.log('\n=== Seeding Gamification Achievements (Phase 2) ===\n');

    // Collect all templates from every skill tree
    const allTreeTemplates = [
      ...awakeningTemplates(),
      ...forgeNasmTemplates(),
      ...ironGravityTemplates(),
      ...tribeSocialTemplates(),
      ...freeSpiritTemplates(),
      ...unbrokenStreakTemplates(),
    ];

    console.log(`  Core templates defined: ${allTreeTemplates.length}`);

    // Expand each template into its appropriate tier count
    let expandedRows = [];
    for (const tpl of allTreeTemplates) {
      const tierCount = getTierCount(tpl.name);
      expandedRows.push(...expandToTiers(tpl, tierCount));
    }

    console.log(`  Tiered achievement rows: ${expandedRows.length}`);

    // Add hidden / secret achievements (no tier expansion)
    const hiddenRows = hiddenAchievements();
    console.log(`  Hidden/secret rows: ${hiddenRows.length}`);

    const allRows = [...expandedRows, ...hiddenRows];
    console.log(`  TOTAL rows to insert: ${allRows.length}`);

    // Insert in batches to avoid hitting PG parameter limits
    // (each row has ~20 params; PG max is ~65535 params)
    const BATCH_SIZE = 100;
    for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
      const batch = allRows.slice(i, i + BATCH_SIZE);
      await queryInterface.bulkInsert('Achievements', batch);
      console.log(`  Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allRows.length / BATCH_SIZE)} (${batch.length} rows)`);
    }

    console.log('\n=== Achievement seeding complete ===\n');

    // Print summary by skill tree
    const treeCounts = {};
    for (const row of allRows) {
      const parsed = JSON.parse(row.tags);
      const tree = parsed.skillTree || 'unknown';
      treeCounts[tree] = (treeCounts[tree] || 0) + 1;
    }
    console.log('  Rows by Skill Tree:');
    for (const [tree, count] of Object.entries(treeCounts).sort()) {
      console.log(`    ${tree}: ${count}`);
    }
    console.log('');
  },

  async down(queryInterface, _Sequelize) {
    console.log('\n=== Removing seeded achievements ===\n');
    await queryInterface.bulkDelete('Achievements', null, {});
    console.log('  All achievement rows deleted.\n');
  },
};
