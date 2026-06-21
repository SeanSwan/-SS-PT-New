/**
 * Aegis HUD static configuration.
 *
 * Keeps the needs, action-replenish, and moodlet definitions separate from the
 * runtime service so the service file stays focused on state transitions.
 */

export const NEED_CONFIG = {
  athletic: {
    label: 'Athletic Power',
    icon: 'dumbbell',
    decayPerHour: 1.2,
    maxValue: 100,
    minValue: 0,
    color: '#8B5CF6', // Wing Purple
  },
  recovery: {
    label: 'Recovery',
    icon: 'heart-pulse',
    decayPerHour: 0.8,
    maxValue: 100,
    minValue: 0,
    color: '#60C0F0', // Ice Wing
  },
  social: {
    label: 'Social Energy',
    icon: 'users',
    decayPerHour: 1.0,
    maxValue: 100,
    minValue: 0,
    color: '#C6A84B', // Gilded Fern
  },
  discipline: {
    label: 'Mental Discipline',
    icon: 'brain',
    decayPerHour: 0.6,
    maxValue: 100,
    minValue: 0,
    color: '#50A0F0', // Arctic Cyan
  },
  vitality: {
    label: 'Vitality',
    icon: 'zap',
    decayPerHour: 0.5,
    maxValue: 100,
    minValue: 0,
    color: '#4070C0', // Swan Lavender
  },
};

export const ACTION_REPLENISH = {
  workout_completed: {
    athletic: 25,
    recovery: -10,
    discipline: 10,
    vitality: 15,
  },
  exercise_completed: {
    athletic: 5,
    vitality: 3,
  },
  stretching_completed: {
    recovery: 30,
    athletic: 5,
    vitality: 10,
  },
  social_post: {
    social: 20,
    vitality: 5,
  },
  social_comment: {
    social: 10,
    vitality: 3,
  },
  social_like: {
    social: 5,
  },
  daily_login: {
    vitality: 10,
    discipline: 5,
  },
  streak_maintained: {
    discipline: 15,
    vitality: 5,
  },
  challenge_completed: {
    discipline: 20,
    athletic: 10,
    vitality: 10,
  },
  rest_day: {
    recovery: 35,
    vitality: 15,
  },
  personal_record: {
    athletic: 30,
    discipline: 15,
    vitality: 20,
  },
};

export const MOODLETS = [
  { id: 'peak_form', label: 'Peak Form', icon: 'crown', minAvg: 85, priority: 1 },
  { id: 'energized', label: 'Energized', icon: 'zap', condition: (n) => n.athletic >= 80 && n.vitality >= 70, priority: 2 },
  { id: 'social_butterfly', label: 'Social Butterfly', icon: 'sparkles', condition: (n) => n.social >= 80, priority: 3 },
  { id: 'iron_will', label: 'Iron Will', icon: 'shield', condition: (n) => n.discipline >= 80, priority: 4 },
  { id: 'well_rested', label: 'Well Rested', icon: 'moon', condition: (n) => n.recovery >= 80, priority: 5 },
  { id: 'balanced', label: 'Balanced', icon: 'scale', minAvg: 60, priority: 6 },
  { id: 'recovering', label: 'Recovering', icon: 'bandage', condition: (n) => n.recovery < 25, priority: 7 },
  { id: 'drained', label: 'Drained', icon: 'battery-low', condition: (n) => n.vitality < 20, priority: 8 },
  { id: 'hermit', label: 'Hermit Mode', icon: 'ghost', condition: (n) => n.social < 15, priority: 9 },
  { id: 'neutral', label: 'Neutral', icon: 'minus', minAvg: 0, priority: 99 },
];

export function calculateMoodlet(needValues) {
  const avg = Object.values(needValues).reduce((sum, value) => sum + value, 0) / 5;

  for (const moodlet of MOODLETS) {
    if (moodlet.minAvg !== undefined && avg >= moodlet.minAvg) {
      return moodlet.id;
    }
    if (moodlet.condition && moodlet.condition(needValues)) {
      return moodlet.id;
    }
  }

  return 'neutral';
}
