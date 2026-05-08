/**
 * CoachActionProposalDetailRows.ts
 * =================================
 * Detail-row formatting for structured Swan Coach proposal review cards.
 */
export type DetailRow = [string, string];

export function proposalTypeLabel(type: string) {
  const labels: Record<string, string> = {
    client_onboarding: 'Client onboarding',
    workout_log: 'Workout log',
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
export function hasDetailBlockingError(detail: Record<string, unknown> | null) {
  return Boolean(detail && (detail.errorCode || detail.error));
}

export function clarificationOptionsFromDetail(detail: Record<string, unknown> | null) {
  const clarification = detail && asRecord(detail.clarification);
  const options = clarification?.options;
  return Array.isArray(options)
    ? options.map((option) => String(option || '').trim()).filter(Boolean)
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
      ['First', client.firstName],
      ['Last', client.lastName],
      ['Email', client.email],
      ['Source', client.clientSource],
      ['Goal', client.fitnessGoal],
      ['Health', client.healthConcerns],
      ['Experience', client.trainingExperience],
      ['Notes', client.trainerNotes],
    ]));
  }
  const workout = asRecord(detail.workout);
  if (workout) {
    return withApprovalGateRows(detail, compactRows([
      ['Title', workout.title],
      ['Date', workout.date],
      ['Client', workout.clientId ? `#${workout.clientId}` : null],
      ['Exercises', workout.exercises],
      ['Notes', workout.notes],
    ]));
  }
  const clarification = asRecord(detail.clarification);
  if (clarification) {
    return withApprovalGateRows(detail, compactRows([
      ['Question', clarification.question],
      ['Options', clarification.options],
    ]));
  }
  const splitPlan = asRecord(detail.splitPlan);
  if (splitPlan) {
    return withApprovalGateRows(detail, compactRows([
      ['Splits', splitPlan.splitCount],
    ]));
  }
  const fallbackRows = Object.entries(detail).filter(([key]) => key !== 'approvalGate');
  return withApprovalGateRows(detail, compactRows(fallbackRows));
}
