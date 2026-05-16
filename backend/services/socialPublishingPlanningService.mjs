/**
 * SERVICE: Social Publishing Planning
 * ===================================
 * Supplies deterministic planning helpers for the Marketing command center.
 * Runtime post/account operations stay in postizClient; this service owns
 * schedule suggestions, posting windows, and app-data-backed templates.
 */

const CONTENT_THEMES = [
  {
    day: 'Sunday',
    theme: 'Motivation Monday Prep',
    content: 'Preview the week with a focused training goal and a clear call to action.',
    category: 'motivation',
    bestTime: '18:00',
  },
  {
    day: 'Monday',
    theme: 'Motivation Monday',
    content: 'Open the week with a client win, strength cue, or personal training prompt.',
    category: 'motivation',
    bestTime: '07:00',
  },
  {
    day: 'Tuesday',
    theme: 'Technique Tuesday',
    content: 'Break down one exercise cue and show the common mistake to avoid.',
    category: 'education',
    bestTime: '12:00',
  },
  {
    day: 'Wednesday',
    theme: 'Whole-Body Wednesday',
    content: 'Share recovery, stretching, flexibility, or nutrition guidance.',
    category: 'wellness',
    bestTime: '10:00',
  },
  {
    day: 'Thursday',
    theme: 'Proof Thursday',
    content: 'Feature a client milestone, training journey, or measurable progress signal.',
    category: 'social_proof',
    bestTime: '12:00',
  },
  {
    day: 'Friday',
    theme: 'Fitness Friday',
    content: 'Post a quick challenge or weekend routine that is easy to share.',
    category: 'engagement',
    bestTime: '16:00',
  },
  {
    day: 'Saturday',
    theme: 'Community Spotlight',
    content: 'Highlight a local training moment, event, or athlete achievement.',
    category: 'community',
    bestTime: '09:00',
  },
];

const BASE_HASHTAGS = '#SwanStudios #PersonalTraining #FitnessGoals';

const HASHTAGS_BY_CATEGORY = {
  motivation: `${BASE_HASHTAGS} #MotivationMonday #FitFam`,
  education: `${BASE_HASHTAGS} #FitnessTips #ExerciseForm`,
  wellness: `${BASE_HASHTAGS} #WellnessWednesday #Recovery #Flexibility`,
  social_proof: `${BASE_HASHTAGS} #ClientResults #StrengthTraining`,
  engagement: `${BASE_HASHTAGS} #FitnessChallenge #FitnessFriday`,
  community: `${BASE_HASHTAGS} #FitnessCommunity #LocalFitness`,
};

const times = list => list.map(([day, slots]) => ({ day, times: slots }));

export function getHashtags(category) {
  return HASHTAGS_BY_CATEGORY[category] || BASE_HASHTAGS;
}

export function getCalendarSuggestions(now = new Date()) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() + index);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const theme = CONTENT_THEMES.find(item => item.day === dayName) || CONTENT_THEMES[0];

    return {
      date: date.toISOString().split('T')[0],
      dayName,
      theme: theme.theme,
      suggestedContent: theme.content,
      category: theme.category,
      bestTime: theme.bestTime,
      hashtags: getHashtags(theme.category),
    };
  });
}

export function getBestTimes() {
  return {
    instagram: {
      best: times([
        ['Monday', ['06:00', '12:00', '18:00']],
        ['Tuesday', ['07:00', '12:00', '19:00']],
        ['Wednesday', ['07:00', '11:00', '18:00']],
        ['Thursday', ['06:00', '12:00', '19:00']],
        ['Friday', ['06:00', '11:00', '16:00']],
        ['Saturday', ['08:00', '11:00']],
        ['Sunday', ['09:00', '17:00']],
      ]),
      peakDay: 'Tuesday',
      peakTime: '07:00',
      note: 'Early morning and lunch breaks tend to fit fitness content.',
    },
    facebook: {
      best: times([
        ['Monday', ['09:00', '12:00']],
        ['Tuesday', ['09:00', '12:00', '15:00']],
        ['Wednesday', ['09:00', '12:00']],
        ['Thursday', ['09:00', '12:00', '14:00']],
        ['Friday', ['09:00', '11:00']],
        ['Saturday', ['10:00']],
        ['Sunday', ['10:00']],
      ]),
      peakDay: 'Thursday',
      peakTime: '09:00',
      note: 'Weekday mornings are usually better than late weekend posting.',
    },
    youtube: {
      best: times([
        ['Monday', ['14:00', '16:00']],
        ['Tuesday', ['14:00', '16:00']],
        ['Wednesday', ['14:00', '16:00']],
        ['Thursday', ['12:00', '15:00']],
        ['Friday', ['12:00', '15:00']],
        ['Saturday', ['09:00', '11:00']],
        ['Sunday', ['09:00', '11:00']],
      ]),
      peakDay: 'Thursday',
      peakTime: '15:00',
      note: 'Publish before likely viewing windows so processing and discovery have time.',
    },
    tiktok: {
      best: times([
        ['Monday', ['06:00', '10:00', '22:00']],
        ['Tuesday', ['09:00', '18:00']],
        ['Wednesday', ['07:00', '10:00', '20:00']],
        ['Thursday', ['09:00', '12:00', '19:00']],
        ['Friday', ['05:00', '13:00', '15:00']],
        ['Saturday', ['11:00', '19:00']],
        ['Sunday', ['07:00', '08:00', '16:00']],
      ]),
      peakDay: 'Tuesday',
      peakTime: '18:00',
      note: 'Short fitness clips often fit pre-workout and evening windows.',
    },
    bluesky: {
      best: times([
        ['Monday', ['08:00', '12:00', '17:00']],
        ['Tuesday', ['08:00', '12:00', '17:00']],
        ['Wednesday', ['08:00', '12:00', '17:00']],
        ['Thursday', ['08:00', '12:00', '17:00']],
        ['Friday', ['08:00', '12:00']],
        ['Saturday', ['10:00']],
        ['Sunday', ['10:00']],
      ]),
      peakDay: 'Wednesday',
      peakTime: '12:00',
      note: 'Consistent weekday posting matters more than chasing one slot.',
    },
    nextdoor: {
      best: times([
        ['Tuesday', ['08:00', '10:00']],
        ['Wednesday', ['08:00', '10:00', '18:00']],
        ['Thursday', ['08:00', '10:00']],
        ['Saturday', ['09:00', '11:00']],
      ]),
      peakDay: 'Wednesday',
      peakTime: '08:00',
      note: 'Local posts should align with planning, errands, and weekend activity windows.',
    },
  };
}

async function getCommunityStats() {
  try {
    const [{ default: User }, { default: Gamification }] = await Promise.all([
      import('../models/User.mjs'),
      import('../models/Gamification.mjs'),
    ]);
    const totalUsers = await User.count();
    const gamStats = await Gamification.findAll({ attributes: ['totalXP', 'totalWorkouts', 'longestStreak'] });
    return gamStats.reduce(
      (stats, row) => ({
        totalUsers,
        totalWorkouts: stats.totalWorkouts + (row.totalWorkouts || 0),
        totalXP: stats.totalXP + (row.totalXP || 0),
        topStreak: Math.max(stats.topStreak, row.longestStreak || 0),
      }),
      { totalUsers, totalWorkouts: 0, totalXP: 0, topStreak: 0 },
    );
  } catch {
    return { totalUsers: 0, totalWorkouts: 0, totalXP: 0, topStreak: 0 };
  }
}

export async function getAutoPostTemplates() {
  const stats = await getCommunityStats();
  const workouts = stats.totalWorkouts.toLocaleString();
  const xp = stats.totalXP.toLocaleString();

  return [
    {
      id: 'weekly_recap',
      name: 'Weekly Community Recap',
      template: `SwanStudios Weekly Recap\n\n${workouts} workouts completed\n${xp} XP earned across the community\nLongest active streak: ${stats.topStreak} days\n${stats.totalUsers} athletes strong and growing\n\nJoin the movement: sswanstudios.com\n\n#SwanStudios #FitnessJourney #PersonalTraining`,
      category: 'community',
      frequency: 'weekly',
    },
    {
      id: 'milestone_celebration',
      name: 'Milestone Celebration',
      template: `Milestone alert: SwanStudios just reached ${workouts} total workouts.\n\nEvery rep counts. Every session matters. Thank you for building this community with us.\n\n#SwanStudios #FitnessMilestone #Community`,
      category: 'celebration',
      frequency: 'milestone',
    },
    {
      id: 'daily_motivation',
      name: 'Daily Motivation',
      template: 'Your body rewards consistency, not perfection. Show up today.\n\n#SwanStudios #FitnessMotivation',
      category: 'motivation',
      frequency: 'daily',
    },
    {
      id: 'training_tip',
      name: 'Training Tip of the Week',
      template: 'Trainer tip: rest days are growth days. Build recovery into the plan with walking, stretching, and hydration.\n\n#TrainingTip #SwanStudios #Recovery',
      category: 'education',
      frequency: 'weekly',
    },
  ];
}
