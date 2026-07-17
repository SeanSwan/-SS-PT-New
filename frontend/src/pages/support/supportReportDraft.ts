/**
 * FILE: supportReportDraft.ts
 * PURPOSE: Shared, deterministic support-draft structure and preview formatting.
 * PRIVACY: This module never accepts reporter identity and never calls an LLM.
 */
import type { CreateSupportIssueRequest } from '../../services/supportIssueService';

export type SupportDraft = Omit<
  CreateSupportIssueRequest,
  'clientRequestId' | 'source' | 'reproductionSteps' | 'diagnostics'
> & { steps: string };

export type GuidedField = 'description' | 'expectedBehavior' | 'impact' | 'steps';

export const initialSupportDraft: SupportDraft = {
  category: 'bug',
  severity: 'medium',
  title: '',
  description: '',
  expectedBehavior: '',
  impact: '',
  steps: '',
};

const guidedFields: GuidedField[] = [
  'description',
  'expectedBehavior',
  'impact',
  'steps',
];

export function completedGuidedFields(draft: SupportDraft): number {
  return guidedFields.filter((field) => draft[field].trim().length > 0).length;
}

export function nextGuidedField(draft: SupportDraft): GuidedField | null {
  return guidedFields.find((field) => draft[field].trim().length === 0) ?? null;
}

function valueOrPending(value: string): string {
  return value.trim() || 'Not provided yet.';
}

export function buildSupportReportPreview(draft: SupportDraft): string {
  const steps = draft.steps
    .split(/\r?\n/)
    .map((step) => step.trim())
    .filter(Boolean);
  const stepLines = steps.length > 0
    ? steps.map((step, index) => `${index + 1}. ${step}`).join('\n')
    : 'Not provided yet.';

  return [
    `# ${valueOrPending(draft.title)}`,
    '',
    `- Issue type: ${draft.category}`,
    `- Urgency: ${draft.severity}`,
    '',
    '## What happened',
    valueOrPending(draft.description),
    '',
    '## Expected behavior',
    valueOrPending(draft.expectedBehavior),
    '',
    '## Impact',
    valueOrPending(draft.impact),
    '',
    '## Reproduction steps',
    stepLines,
  ].join('\n');
}
