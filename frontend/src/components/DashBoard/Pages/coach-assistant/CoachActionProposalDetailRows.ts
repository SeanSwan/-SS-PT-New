/**
 * CoachActionProposalDetailRows.ts
 * =================================
 * Detail-row formatting for structured Swan Coach proposal review cards.
 */
import { nutritionDetailRows } from './CoachActionProposalNutritionRows';

export type DetailRow = [string, string];
export type ClarificationOption = { value: string; label: string };

export function proposalTypeLabel(type: string) {
  const labels: Record<string, string> = {
    client_onboarding: 'Client onboarding',
    workout_log: 'Workout log',
    nutrition_log: 'Nutrition log',
    client_data_update: 'Client data update',
    frontend_dispatch: 'Workout form action',
    clarification: 'Clarification',
    split_plan: 'Split plan',
  };
  return labels[type] || 'Coach proposal';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function displayValue(value: unknown) {
  if (value == null || value === '') return null;
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
  if (typeof value === 'object') return 'Review structured fields';
  return String(value);
}

const SAFE_BLOCKING_ERRORS: Record<string, string> = {
  ONBOARDING_REQUIRED_FIELDS_MISSING: 'Client first and last name are required before approval.',
};

export function safeProposalBlockingErrorMessage(detail: Record<string, unknown> | null): string {
  const code = typeof detail?.errorCode === 'string' ? detail.errorCode : '';
  return SAFE_BLOCKING_ERRORS[code] || 'Draft details need correction before approval.';
}

function safeProposalBlockingErrorCode(detail: Record<string, unknown>): string {
  const code = typeof detail.errorCode === 'string' ? detail.errorCode : '';
  return SAFE_BLOCKING_ERRORS[code] ? code : 'COACH_PROPOSAL_ERROR';
}

function compactRows(rows: Array<[string, unknown]>): DetailRow[] {
  return rows
    .map(([label, value]) => [label, displayValue(value)] as [string, string | null])
    .filter((row): row is DetailRow => Boolean(row[1]));
}

function compactCount(value: unknown, singular: string): string | null {
  if (!Array.isArray(value)) return null;
  const count = value.map((item) => String(item || '').trim()).filter(Boolean).length;
  if (count <= 0) return null;
  return `${count} ${singular}${count === 1 ? '' : 's'} available`;
}

function hasProvidedValue(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return String(value).trim().length > 0;
}

function withheldCount(value: unknown, singular: string): string | null {
  const count = Number(value || 0);
  if (!Number.isFinite(count) || count <= 0) return null;
  return `${count} ${singular}${count === 1 ? '' : 's'} withheld`;
}

const SAFE_SAFETY_FLAGS: Record<string, string> = {
  duplicate_check_required: 'Duplicate risk check required',
  future_date_blocked: 'Future date check required',
  client_confirmation_required: 'Client confirmation required',
  scope_of_practice_review: 'Scope-of-practice review required',
};

function safeSafetyFlags(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const labels = value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .map((item) => SAFE_SAFETY_FLAGS[item])
    .filter(Boolean);
  if (labels.length) return labels.join(', ');
  return compactCount(value, 'safety flag')?.replace('available', 'needs review') || null;
}

function readableConfirmationMode(value: unknown): string | null {
  if (value === 'trainer_approval_required') return 'Trainer approval required';
  return value ? 'Approval review required' : null;
}

function safeWriter(value: unknown): string | null {
  const writer = String(value || '').trim();
  if (!writer) return null;
  if (writer === 'deterministic') return 'Deterministic writer';
  return 'Review-gated writer';
}

const SAFE_CLIENT_SOURCE_LABELS: Record<string, string> = {
  swanstudios: 'SwanStudios source',
  move_fitness: 'Move Fitness source',
  external: 'External source',
};

function safeClientSource(value: unknown): string | null {
  const source = String(value || '').trim();
  if (!source) return null;
  return SAFE_CLIENT_SOURCE_LABELS[source] || 'Source ready for review';
}

function safeDate(value: unknown): string | null {
  const date = String(value || '').trim();
  if (!date) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : 'Date needs review';
}

function safeClientId(value: unknown): string | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? `#${id}` : null;
}

function exerciseCount(value: unknown): string | null {
  if (!Array.isArray(value) || value.length <= 0) return null;
  return `${value.length} exercise${value.length === 1 ? '' : 's'} available`;
}

function readyIfPresent(value: unknown, label: string): string | null {
  return hasProvidedValue(value) ? label : null;
}

function approvalGateRows(detail: Record<string, unknown>): DetailRow[] {
  const gate = asRecord(detail.approvalGate);
  if (!gate) return [];
  return compactRows([
    ['Approval', readableConfirmationMode(gate.confirmationMode)],
    ['Evidence refs', compactCount(gate.evidenceRefs, 'evidence ref')],
    ['Evidence withheld', withheldCount(gate.redactedEvidenceRefCount, 'evidence ref')],
    ['Safety flags', safeSafetyFlags(gate.safetyFlags)],
    ['Safety withheld', withheldCount(gate.redactedSafetyFlagCount, 'safety flag')],
    ['Writer', safeWriter(gate.writer)],
  ]);
}

function withApprovalGateRows(detail: Record<string, unknown>, rows: DetailRow[]) {
  return [...rows, ...approvalGateRows(detail)];
}

function onboardingContextRows(value: unknown): Array<[string, unknown]> {
  const context = asRecord(value);
  if (!context) return [];
  return [
    ['Limitations', readyIfPresent(context.limitations, 'Limitations context ready for review')],
    ['Pain notes', readyIfPresent(context.painNotes, 'Pain context ready for review')],
    ['Equipment', readyIfPresent(context.equipmentAccess, 'Equipment context ready for review')],
    ['Availability', readyIfPresent(context.availability, 'Availability context ready for review')],
    ['Priorities', readyIfPresent(context.firstSessionPriorities, 'First-session context ready for review')],
  ];
}

export function hasDetailBlockingError(detail: Record<string, unknown> | null) {
  return Boolean(detail && (detail.errorCode || detail.error));
}

const SAFE_CLARIFICATION_OPTION_LABELS: Record<string, string> = {
  move_fitness: 'Move Fitness',
  swanstudios: 'SwanStudios',
  external: 'External source',
  new_client: 'New client',
};

function safeClarificationOption(value: unknown): ClarificationOption | null {
  const token = String(value || '').trim();
  if (!token) return null;
  const candidateMatch = token.match(/^client_candidate:C(\d{1,3})$/i);
  if (candidateMatch) {
    return { value: token, label: `Client candidate C${candidateMatch[1]}` };
  }
  const clientIdMatch = token.match(/^Client #(\d{1,6})$/);
  if (clientIdMatch) {
    return { value: token, label: `Client #${clientIdMatch[1]}` };
  }
  const label = SAFE_CLARIFICATION_OPTION_LABELS[token];
  return label ? { value: token, label } : null;
}

function safeClarificationOptionCount(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const count = value.map(safeClarificationOption).filter(Boolean).length;
  return count > 0 ? `${count} answer option${count === 1 ? '' : 's'} available` : null;
}

export function clarificationOptionsFromDetail(detail: Record<string, unknown> | null): ClarificationOption[] {
  const clarification = detail && asRecord(detail.clarification);
  const options = clarification?.options;
  return Array.isArray(options)
    ? options.map(safeClarificationOption).filter((option): option is ClarificationOption => Boolean(option))
    : [];
}

export function buildDetailRows(detail: Record<string, unknown> | null): DetailRow[] {
  if (!detail) return [];
  if (hasDetailBlockingError(detail)) {
    return withApprovalGateRows(detail, compactRows([
      ['Issue', safeProposalBlockingErrorMessage(detail)],
      ['Code', safeProposalBlockingErrorCode(detail)],
    ]));
  }
  const client = asRecord(detail.client);
  if (client) {
    return withApprovalGateRows(detail, compactRows([
      ['Client draft', 'Client draft ready for trainer review'],
      ['First name', readyIfPresent(client.firstName, 'First name provided')],
      ['Last name', readyIfPresent(client.lastName, 'Last name provided')],
      ['Contact', readyIfPresent(client.email, 'Contact detail provided')],
      ['Source', safeClientSource(client.clientSource)],
      ['Goal', readyIfPresent(client.fitnessGoal, 'Fitness goal ready for review')],
      ['Health', readyIfPresent(client.healthConcerns, 'Health context requires trainer review')],
      ['Experience', readyIfPresent(client.trainingExperience, 'Training experience ready for review')],
      ['Notes', readyIfPresent(client.trainerNotes, 'Trainer notes ready for review')],
      ...onboardingContextRows(client.onboardingContext),
    ]));
  }
  const workout = asRecord(detail.workout);
  if (workout) {
    return withApprovalGateRows(detail, compactRows([
      ['Workout draft', 'Workout draft ready for trainer review'],
      ['Date', safeDate(workout.date)],
      ['Client', safeClientId(workout.clientId)],
      ['Exercises', exerciseCount(workout.exercises)],
      ['Notes', readyIfPresent(workout.notes, 'Workout notes ready for review')],
    ]));
  }
  const nutrition = asRecord(detail.nutrition);
  if (nutrition) {
    return withApprovalGateRows(detail, compactRows(nutritionDetailRows(nutrition)));
  }
  const clarification = asRecord(detail.clarification);
  if (clarification) {
    return withApprovalGateRows(detail, compactRows([
      ['Question', 'Coach needs one clarification before deterministic approval can continue.'],
      ['Options', safeClarificationOptionCount(clarification.options)],
    ]));
  }
  const splitPlan = asRecord(detail.splitPlan);
  if (splitPlan) {
    return withApprovalGateRows(detail, compactRows([
      ['Splits', splitPlan.splitCount],
    ]));
  }
  return withApprovalGateRows(detail, [
    ['Details', 'Structured proposal detail available for review.'],
  ]);
}
