import type { DailyWorkoutForm } from '../../services/nasmApiService';

type WorkoutSubmitReceiptInput = Pick<DailyWorkoutForm, 'billing'>;

const toWholeNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.floor(value));
};

const pluralizeCredit = (credits: number): string =>
  credits === 1 ? 'credit' : 'credits';

export const buildWorkoutSubmitSuccessMessage = (
  form: WorkoutSubmitReceiptInput,
  fallbackMessage?: string
): string => {
  const billing = form.billing;
  if (!billing) {
    return fallbackMessage || 'Workout logged successfully! Progress updated.';
  }

  if (billing.status === 'previously_deducted') {
    return 'Workout saved. Scheduled credit was already deducted.';
  }

  const creditsDeducted = toWholeNumber(billing.creditsDeducted);
  if (billing.status === 'deducted' && creditsDeducted && creditsDeducted > 0) {
    const remainingSessions = toWholeNumber(billing.remainingSessions);
    const balanceSuffix = remainingSessions === null
      ? ''
      : `; ${remainingSessions} remaining`;
    return `Workout saved. ${creditsDeducted} ${pluralizeCredit(creditsDeducted)} deducted${balanceSuffix}.`;
  }

  if (!billing.sessionDeducted || billing.creditsDeducted === 0) {
    return 'Workout saved. No paid session deducted.';
  }

  return fallbackMessage || 'Workout logged successfully! Progress updated.';
};
