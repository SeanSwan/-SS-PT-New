import type { NutritionTodayTarget } from './NutritionTodayPanel.logic';

interface HydrationProgress {
  filled: number;
  dailyGoal: number;
  ounces: number;
}

interface TodayAction {
  title: string;
  copy: string;
  target: NutritionTodayTarget;
}

interface TodayViewModelInput {
  gentleMode: boolean;
  hydration: HydrationProgress;
  hydrationLoading: boolean;
  meals: number;
  nextAction: TodayAction;
  streakDays: number;
}

interface CareMilestoneInput {
  gentleMode: boolean;
  hydration: HydrationProgress;
  meals: number;
  streakDays: number;
}

export const gentleMetrics = [
  { label: 'Meal rhythm', value: 'Logged', tone: 'cyan' as const },
  { label: 'Hydration', value: 'Check in', tone: 'purple' as const },
  { label: 'Recovery', value: 'Coach', tone: 'gold' as const },
  { label: 'Progress', value: 'No pressure', tone: 'fern' as const },
];

export const getInsightActionLabel = (target: NutritionTodayTarget) => {
  if (target === 'hydration') return 'Open hydration';
  if (target === 'macros') return 'Review macros';
  if (target === 'voice') return 'Speak a meal';
  if (target === 'search') return 'Search food';
  return 'Open logger';
};

export const getInsightActionName = (target: NutritionTodayTarget, title: string) => {
  if (target === 'hydration') return `Open hydration for ${title}`;
  if (target === 'macros') return `Open macro review for ${title}`;
  if (target === 'voice') return `Open voice logging for ${title}`;
  if (target === 'search') return `Open nutrition search for ${title}`;
  return `Open logger for ${title}`;
};

export const getNutritionCareMilestone = ({
  gentleMode,
  hydration,
  meals,
  streakDays,
}: CareMilestoneInput) => {
  if (gentleMode) {
    return {
      copy: 'No numbers required. Keep steady check-ins and coach support without pressure.',
      label: 'Gentle milestone',
      title: 'Care rhythm protected',
      tone: 'purple' as const,
    };
  }

  if (streakDays >= 2) {
    return {
      copy: 'Consistency counts as progress. Keep logging honestly; perfection is not the goal.',
      label: 'Consistency milestone',
      title: `${streakDays}-day logging rhythm`,
      tone: 'cyan' as const,
    };
  }

  if (hydration.filled < hydration.dailyGoal) {
    return {
      copy: 'A water check-in is a useful correction. Small fixes count when they match the real day.',
      label: 'Correction milestone',
      title: 'Hydration adjustment open',
      tone: 'gold' as const,
    };
  }

  return {
    copy: 'Learning from real entries beats perfect days. Use the next clear meal to keep the pattern true.',
    label: 'Learning milestone',
    title: meals > 0 ? 'Meal pattern captured' : 'First honest log',
    tone: 'fern' as const,
  };
};

export const getNutritionTodayViewModel = ({
  gentleMode,
  hydration,
  hydrationLoading,
  meals,
  nextAction,
  streakDays,
}: TodayViewModelInput) => {
  const gentlePrimaryTarget: NutritionTodayTarget = hydration.filled < hydration.dailyGoal
    ? 'hydration'
    : meals === 0
      ? 'log'
      : 'voice';
  const hydrationText = hydrationLoading
    ? 'Loading hydration...'
    : gentleMode
      ? hydration.filled < hydration.dailyGoal
        ? 'Hydration check-in is open when it feels manageable.'
        : 'Hydration is checked in for today.'
      : `${hydration.filled} of ${hydration.dailyGoal} glasses (${hydration.ounces} oz)`;
  const rhythmText = gentleMode
    ? streakDays > 0
      ? 'Your check-in rhythm is active. Keep today steady and low-pressure.'
      : 'No streak pressure here. One honest check-in is enough to restart.'
    : streakDays > 0
      ? `${streakDays}-day nutrition logging streak. ${meals} meal${meals === 1 ? '' : 's'} logged today.`
      : `No nutrition streak yet. ${meals} meal${meals === 1 ? '' : 's'} logged today.`;

  return {
    heroText: gentleMode
      ? 'Use meal rhythm, hydration check-ins, and coach support without pressure. Macro numbers stay hidden while Gentle Mode is on.'
      : nextAction.copy,
    heroTitle: gentleMode ? 'Keep nutrition gentle today.' : nextAction.title,
    hydrationText,
    primaryTarget: gentleMode ? gentlePrimaryTarget : nextAction.target,
    rhythmText,
  };
};
