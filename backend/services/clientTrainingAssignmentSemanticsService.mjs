/**
 * Client Training Assignment Semantics Service
 * ============================================
 *
 * Normalizes plan-level assignment defaults shared by dashboard read models,
 * Swan Coach context, and generated-plan save flows.
 */

const toPlainObject = (value) => (typeof value?.toJSON === 'function' ? value.toJSON() : value);
const compactString = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const normalizeKey = (value) => compactString(value)?.toLowerCase().replace(/[\s-]+/g, '_') || null;

const ASSIGNMENT_TYPE_ALIASES = new Map([
  ['trainer_session', 'trainer_session'],
  ['trainer_led', 'trainer_session'],
  ['trainer', 'trainer_session'],
  ['in_person', 'trainer_session'],
  ['active_recovery', 'active_recovery'],
  ['recovery', 'active_recovery'],
  ['mobility', 'active_recovery'],
  ['flexibility', 'active_recovery'],
  ['rest', 'rest'],
  ['rest_day', 'rest'],
  ['assessment', 'assessment'],
  ['screen', 'assessment'],
  ['homework', 'homework'],
  ['solo', 'homework'],
  ['conditioning', 'homework'],
]);

const BILLING_INTENTS = new Set([
  'non_billable_assignment',
  'trainer_led_scheduled_flow',
]);

export const normalizeAssignmentType = (value, exerciseCount) => {
  const raw = normalizeKey(value);
  return ASSIGNMENT_TYPE_ALIASES.get(raw) || (exerciseCount > 0 ? 'homework' : 'rest');
};

const normalizeKnownAssignmentType = (value) => {
  const raw = normalizeKey(value);
  return ASSIGNMENT_TYPE_ALIASES.get(raw) || null;
};

const defaultBillingIntentFor = (assignmentType) => {
  if (assignmentType === 'trainer_session') return 'trainer_led_scheduled_flow';
  if (assignmentType) return 'non_billable_assignment';
  return null;
};

const normalizeBillingIntent = (value, assignmentType) => {
  const raw = normalizeKey(value);
  return BILLING_INTENTS.has(raw) ? raw : defaultBillingIntentFor(assignmentType);
};

export const buildPlanAssignmentSemantics = (plan) => {
  const raw = toPlainObject(plan) || {};
  const metadata = toPlainObject(raw.metadata) || {};
  const planData = toPlainObject(raw.planData) || {};
  const assignmentDefaults = toPlainObject(planData.assignmentDefaults) || {};
  const defaultAssignmentType = normalizeKnownAssignmentType(
    metadata.defaultAssignmentType
    || assignmentDefaults.defaultAssignmentType
    || planData.defaultAssignmentType,
  );

  return {
    defaultAssignmentType,
    billingIntent: normalizeBillingIntent(
      metadata.billingIntent || assignmentDefaults.billingIntent,
      defaultAssignmentType,
    ),
    shouldDeductSession: metadata.defaultShouldDeductSession === true
      || assignmentDefaults.shouldDeductSession === true,
  };
};
