import type { GoalData, GoalTrackingData } from '../../../../services/enhanced-progress-analytics-service';

export type GoalFilter = 'all' | 'active' | 'completed' | 'overdue';

export interface NewGoalDraft {
  title: string;
  targetValue: string;
  unit: string;
  category: string;
  deadline: string;
}

export const DEFAULT_GOAL_DRAFT: NewGoalDraft = {
  title: '',
  targetValue: '',
  unit: 'reps',
  category: 'fitness',
  deadline: '',
};

export const GOAL_CATEGORY_OPTIONS = [
  { value: 'fitness', label: 'Fitness' },
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'habit', label: 'Habit' },
  { value: 'custom', label: 'Custom' },
];

export const NOT_ENOUGH_EVIDENCE = 'Not enough evidence yet';

export const clampPercent = (value: number): number => (
  Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0
);

export const formatPredictedCompletion = (value?: string | null): string => {
  if (!value) return NOT_ENOUGH_EVIDENCE;

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return NOT_ENOUGH_EVIDENCE;

  return new Date(timestamp).toLocaleDateString();
};

export const formatSuccessLikelihood = (value?: number | null): string => {
  if (!Number.isFinite(value)) return NOT_ENOUGH_EVIDENCE;

  return `${clampPercent(value as number)}%`;
};

export const isGoalTrackingData = (payload: unknown): payload is GoalTrackingData => {
  const candidate = payload as GoalTrackingData | null;
  return Boolean(candidate && Array.isArray(candidate.goals));
};

export const filterGoals = (data: GoalTrackingData | null, filter: GoalFilter): GoalData[] => {
  if (!data) return [];
  if (filter === 'all') return data.goals;
  return data.goals.filter((goal) => goal.status === filter);
};

export const goalRowKey = (goal: GoalData): string => (
  [goal.id, goal.status, goal.targetDate].filter(Boolean).join(':')
);

export const milestoneKey = (goal: GoalData, milestoneId: string): string => (
  `${goal.id}:milestone:${milestoneId}`
);

export const progressHistoryPointKey = (goal: GoalData, date: string): string => (
  `${goal.id}:progress:${date}`
);

export const goalStatusTone = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'var(--feedback-success, #4CAF50)';
    case 'active':
      return 'var(--accent-primary, #60C0F0)';
    case 'overdue':
      return 'var(--feedback-error, #FF6B6B)';
    case 'paused':
      return 'var(--feedback-warning, #FFC107)';
    default:
      return 'var(--text-muted, #A0A0A0)';
  }
};

export const goalStatusTextTone = (status: string): string => {
  switch (status) {
    case 'active':
    case 'paused':
      return 'var(--button-primary-text, #002060)';
    case 'completed':
    case 'overdue':
      return 'var(--text-on-danger, #ffffff)';
    default:
      return 'var(--text-primary, #e2e8f0)';
  }
};

export const goalPriorityTone = (priority: string): string => {
  switch (priority) {
    case 'high':
      return 'var(--feedback-error, #FF6B6B)';
    case 'medium':
      return 'var(--feedback-warning, #FFC107)';
    case 'low':
      return 'var(--feedback-success, #4CAF50)';
    default:
      return 'var(--text-muted, #A0A0A0)';
  }
};

export const goalPriorityTextTone = (priority: string): string => {
  switch (priority) {
    case 'medium':
      return 'var(--button-primary-text, #002060)';
    case 'high':
    case 'low':
      return 'var(--text-on-danger, #ffffff)';
    default:
      return 'var(--text-primary, #e2e8f0)';
  }
};

export const goalAccentTone = (
  tone: 'primary' | 'success' | 'warning' | 'purple' | 'muted',
): string => {
  switch (tone) {
    case 'success':
      return 'var(--feedback-success, #4CAF50)';
    case 'warning':
      return 'var(--feedback-warning, #FFC107)';
    case 'purple':
      return 'var(--accent-secondary, #8B5CF6)';
    case 'muted':
      return 'var(--text-muted, #A0A0A0)';
    default:
      return 'var(--accent-primary, #60C0F0)';
  }
};
