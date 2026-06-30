import type { ChallengeProgressImpactUpdate, DailyWorkoutForm } from '../../services/nasmApiService';

type WorkoutSubmitReceiptInput = Pick<DailyWorkoutForm, 'billing' | 'challengeProgress'>;

export interface WorkoutChallengeImpactItem {
  challengeId: string | null;
  title: string;
  completed: boolean;
  detail: string;
  xpEarned: number | null;
  deltaLabel: string;
  unitLabel: string;
  percentLabel: string;
}

export interface WorkoutChallengeImpactSummary {
  title: string;
  completed: boolean;
  headline: string;
  detail: string;
  moreCount: number;
  moreDetail: string | null;
  xpEarned: number | null;
  deltaLabel: string;
  unitLabel: string;
  percentLabel: string;
  updateItems: WorkoutChallengeImpactItem[];
}

const toWholeNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.floor(value));
};

const pluralizeCredit = (credits: number): string =>
  credits === 1 ? 'credit' : 'credits';

const singularUnit = (unit: string, amount: number): string => {
  const trimmed = unit.trim().toLowerCase() || 'progress';
  if (amount !== 1) return trimmed;
  if (trimmed.endsWith('ies')) return `${trimmed.slice(0, -3)}y`;
  if (trimmed.endsWith('s')) return trimmed.slice(0, -1);
  return trimmed;
};

const isAssignedSessionProgressUnit = (unit: string): boolean => {
  const normalized = unit.trim().toLowerCase();
  return normalized === 'sessions' || normalized === 'workouts';
};

const formatDelta = (value: number): string => {
  if (!Number.isFinite(value)) return '+0';
  return `+${Number.isInteger(value) ? value : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}`;
};

const buildWorkoutChallengeImpactItem = (update: ChallengeProgressImpactUpdate): WorkoutChallengeImpactItem => {
  const delta = Number(update.delta) || 0;
  const percent = typeof update.progressPercentage === 'number' && Number.isFinite(update.progressPercentage)
    ? Math.max(0, Math.round(update.progressPercentage))
    : null;
  const assignedSessionMove = update.assignedSessionOnly === true
    && isAssignedSessionProgressUnit(update.progressUnit);
  const unitLabel = assignedSessionMove
    ? `assigned ${singularUnit('sessions', delta)}`
    : singularUnit(update.progressUnit, delta);
  const movementVerb = assignedSessionMove ? 'completed' : 'logged';
  const workoutSource = assignedSessionMove ? 'this assigned workout' : 'this workout';
  const deltaLabel = formatDelta(delta);
  const percentLabel = percent === null ? '' : ` (${percent}%)`;
  const xpEarned = toWholeNumber(update.xpEarned);

  return {
    challengeId: update.challengeId,
    title: update.title,
    completed: update.completed,
    detail: update.completed
      ? (xpEarned && xpEarned > 0
        ? `+${xpEarned} XP earned from ${workoutSource}.`
        : `Completion saved from ${workoutSource}.`)
      : `${deltaLabel} ${unitLabel} ${movementVerb}.${percent === null ? '' : ` ${percent}% complete.`}`,
    xpEarned,
    deltaLabel,
    unitLabel,
    percentLabel,
  };
};

const orderImpactUpdates = (updates: ChallengeProgressImpactUpdate[]): ChallengeProgressImpactUpdate[] => {
  const completedIndex = updates.findIndex((update) => update.completed);
  if (completedIndex <= 0) return [...updates];
  const completed = updates[completedIndex];
  return [completed, ...updates.filter((_, index) => index !== completedIndex)];
};

export const buildWorkoutChallengeImpactSummary = (
  progress?: WorkoutSubmitReceiptInput['challengeProgress'] | null
): WorkoutChallengeImpactSummary | null => {
  const rawUpdates = Array.isArray(progress?.updates) ? progress.updates : [];
  const orderedUpdates = orderImpactUpdates(rawUpdates);
  const featuredUpdate = orderedUpdates[0];
  if (!featuredUpdate || progress?.status !== 'processed') return null;

  const updateItems = orderedUpdates.map(buildWorkoutChallengeImpactItem);
  const featuredItem = updateItems[0];
  const moreCount = Math.max(0, (progress.updatedCount || rawUpdates.length) - 1);
  const moreDetail = moreCount > 0
    ? `${moreCount} more challenge${moreCount === 1 ? '' : 's'} also updated.`
    : null;

  return {
    title: featuredItem.title,
    completed: featuredItem.completed,
    headline: `${featuredItem.title} ${featuredItem.completed ? 'completed' : 'moved'}`,
    detail: featuredItem.detail,
    moreCount,
    moreDetail,
    xpEarned: featuredItem.completed ? featuredItem.xpEarned : null,
    deltaLabel: featuredItem.deltaLabel,
    unitLabel: featuredItem.unitLabel,
    percentLabel: featuredItem.percentLabel,
    updateItems,
  };
};

const challengeImpactSuffix = (form: WorkoutSubmitReceiptInput): string => {
  const summary = buildWorkoutChallengeImpactSummary(form.challengeProgress);
  if (!summary) return '';

  const moreSuffix = summary.moreCount > 0 ? ` +${summary.moreCount} more` : '';
  if (summary.completed) {
    const xpSuffix = summary.xpEarned && summary.xpEarned > 0 ? ` (+${summary.xpEarned} XP)` : '';
    return ` Challenge completed: ${summary.title}${xpSuffix}${moreSuffix}.`;
  }

  return ` Challenge moved: ${summary.title} ${summary.deltaLabel} ${summary.unitLabel}${summary.percentLabel}${moreSuffix}.`;
};

export const buildWorkoutSubmitSuccessMessage = (
  form: WorkoutSubmitReceiptInput,
  fallbackMessage?: string
): string => {
  const billing = form.billing;
  const suffix = challengeImpactSuffix(form);
  if (!billing) {
    return `${fallbackMessage || 'Workout logged successfully! Progress updated.'}${suffix}`;
  }

  if (billing.status === 'previously_deducted') {
    return `Workout saved. Scheduled credit was already deducted.${suffix}`;
  }

  const creditsDeducted = toWholeNumber(billing.creditsDeducted);
  if (billing.status === 'deducted' && creditsDeducted && creditsDeducted > 0) {
    const remainingSessions = toWholeNumber(billing.remainingSessions);
    const balanceSuffix = remainingSessions === null
      ? ''
      : `; ${remainingSessions} remaining`;
    return `Workout saved. ${creditsDeducted} ${pluralizeCredit(creditsDeducted)} deducted${balanceSuffix}.${suffix}`;
  }

  if (!billing.sessionDeducted || billing.creditsDeducted === 0) {
    return `Workout saved. No paid session deducted.${suffix}`;
  }

  return `${fallbackMessage || 'Workout logged successfully! Progress updated.'}${suffix}`;
};