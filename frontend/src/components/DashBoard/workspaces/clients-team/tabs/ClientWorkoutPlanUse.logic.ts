export interface ClientPlanUseSummary {
  assignmentDefault?: string | null;
  billingIntent?: string | null;
  defaultShouldDeductSession?: boolean;
}

const toRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' ? value as Record<string, unknown> : {}
);

const compactString = (value: unknown) => (
  typeof value === 'string' && value.trim() ? value.trim() : null
);

export const normalizeClientPlanUse = (plan: Record<string, unknown>): ClientPlanUseSummary => {
  const metadata = toRecord(plan.metadata);
  const planData = toRecord(plan.planData);
  const assignmentDefaults = toRecord(planData.assignmentDefaults);
  const assignmentDefault = compactString(
    plan.assignmentDefault
    || plan.defaultAssignmentType
    || metadata.defaultAssignmentType
    || assignmentDefaults.defaultAssignmentType,
  );
  const billingIntent = compactString(
    plan.billingIntent
    || metadata.billingIntent
    || assignmentDefaults.billingIntent,
  );

  return {
    assignmentDefault,
    billingIntent,
    defaultShouldDeductSession: plan.defaultShouldDeductSession === true
      || metadata.defaultShouldDeductSession === true
      || assignmentDefaults.shouldDeductSession === true,
  };
};

export const formatPlanUseLabel = (value?: string | null) => {
  const normalized = compactString(value)?.toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'trainer_session' || normalized === 'trainer_led') return 'Trainer-led';
  if (normalized === 'active_recovery') return 'Active recovery';
  if (normalized === 'rest') return 'Recovery';
  if (normalized === 'assessment') return 'Assessment';
  return 'Homework diary';
};
