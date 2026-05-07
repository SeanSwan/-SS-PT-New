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

function compactRows(rows: Array<[string, unknown]>): DetailRow[] {
  return rows
    .map(([label, value]) => [label, displayValue(value)] as [string, string | null])
    .filter((row): row is DetailRow => Boolean(row[1]));
}

function compactList(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const items = value.map((item) => String(item || '').trim()).filter(Boolean);
  return items.length > 0 ? items.join(', ') : null;
}

function readableConfirmationMode(value: unknown): string | null {
  if (value === 'trainer_approval_required') return 'Trainer approval required';
  return displayValue(value);
}

function approvalGateRows(detail: Record<string, unknown>): DetailRow[] {
  const gate = asRecord(detail.approvalGate);
  if (!gate) return [];
  return compactRows([
    ['Approval', readableConfirmationMode(gate.confirmationMode)],
    ['Evidence refs', compactList(gate.evidenceRefs)],
    ['Safety flags', compactList(gate.safetyFlags)],
    ['Writer', gate.writer],
  ]);
}

function withApprovalGateRows(detail: Record<string, unknown>, rows: DetailRow[]) {
  return [...rows, ...approvalGateRows(detail)];
}
export function hasDetailBlockingError(detail: Record<string, unknown> | null) {
  return Boolean(detail && (detail.errorCode || detail.error));
}

export function buildDetailRows(detail: Record<string, unknown> | null): DetailRow[] {
  if (!detail) return [];
  if (hasDetailBlockingError(detail)) {
    return withApprovalGateRows(detail, compactRows([
      ['Issue', detail.error],
      ['Code', detail.errorCode],
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
      ['Plan', splitPlan.splits],
    ]));
  }
  const fallbackRows = Object.entries(detail).filter(([key]) => key !== 'approvalGate');
  return withApprovalGateRows(detail, compactRows(fallbackRows));
}
