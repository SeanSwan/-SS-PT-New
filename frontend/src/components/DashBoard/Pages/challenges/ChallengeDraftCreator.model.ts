/**
 * View model helpers for the template-backed challenge draft creator.
 */

import { isAssignedSessionChallengeTemplate } from './challengeTemplateRules';
import type { ChallengeTemplate } from './useChallengeTemplates';
import {
  validateChallengeDraftSection,
  type ChallengeDraftFormInput,
  type ChallengeDraftValidationSection,
  type ChallengePublishMode,
} from './challengeDraftForm';

export type CreatorStepId = 'audience' | 'goal' | 'validation' | 'schedule' | 'rewards' | 'preview' | 'publish';

export type SummaryItem = { label: string; value: string; detail?: string };
export type ReadinessItem = SummaryItem & { ready: boolean };

export const CREATOR_STEPS: Array<{ id: CreatorStepId; label: string }> = [
  { id: 'audience', label: 'Audience' },
  { id: 'goal', label: 'Goal' },
  { id: 'validation', label: 'Validation' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'preview', label: 'Preview' },
  { id: 'publish', label: 'Publish' },
];
const STEP_VALIDATORS: Array<{ step: CreatorStepId; section: ChallengeDraftValidationSection }> = [
  { step: 'audience', section: 'audience' },
  { step: 'goal', section: 'goal' },
  { step: 'schedule', section: 'schedule' },
];

const getCreatorStepIndex = (stepId: CreatorStepId) => CREATOR_STEPS.findIndex((step) => step.id === stepId);

interface ResolveCreatorStepNavigationOptions {
  activeStep: CreatorStepId;
  targetStep: CreatorStepId;
  input: ChallengeDraftFormInput;
}

export const resolveCreatorStepNavigation = ({ activeStep, targetStep, input }: ResolveCreatorStepNavigationOptions) => {
  const targetIndex = getCreatorStepIndex(targetStep);
  if (targetIndex <= getCreatorStepIndex(activeStep)) return { step: targetStep, error: null };

  for (const { step, section } of STEP_VALIDATORS) {
    if (getCreatorStepIndex(step) >= targetIndex) continue;
    try {
      validateChallengeDraftSection(section, input);
    } catch (caught) {
      return { step, error: caught instanceof Error ? caught.message : 'Challenge draft could not advance' };
    }
  }

  return { step: targetStep, error: null };
};

const labelize = (value: string) => value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const PUBLISH_MODE_LABELS: Record<ChallengePublishMode, string> = { draft: 'Private draft', public: 'Scheduled public campaign' };
const RULE_SOURCE_LABELS: Record<string, string> = { canonical_workout_event: 'Workout completion events' };

interface BuildChallengeDraftCreatorModelOptions {
  template: ChallengeTemplate;
  startDate: string;
  endDate: string;
  maxParticipants: string;
  publishMode: ChallengePublishMode;
}

export interface ChallengeDraftCreatorModel {
  submitLabel: string;
  capPreview: string;
  audiencePreview: string;
  ruleSourcePreview: string;
  assignedSessionOnly: boolean;
  requirementItems: string[];
  rewardCondition: string;
  tagSummary: string;
  scheduleReady: boolean;
  publishReadiness: string;
  goalTarget: string;
  previewItems: SummaryItem[];
  readinessItems: ReadinessItem[];
}

export const buildChallengeDraftCreatorModel = ({
  template,
  startDate,
  endDate,
  maxParticipants,
  publishMode,
}: BuildChallengeDraftCreatorModelOptions): ChallengeDraftCreatorModel => {
  const submitLabel = publishMode === 'draft' ? 'Create Draft' : 'Create Campaign';
  const capPreview = maxParticipants.trim() ? `${maxParticipants.trim()} participant cap` : 'No cap set';
  const audiencePreview = template.allowTeams ? `Team pods up to ${template.maxTeamSize ?? 4}` : 'Individual or cohort roster';
  const requirements = Array.isArray(template.requirements) ? template.requirements : [];
  const tags = Array.isArray(template.tags) ? template.tags : [];
  const ruleSourcePreview = RULE_SOURCE_LABELS[template.rule.source] ?? labelize(template.rule.source);
  const assignedSessionOnly = isAssignedSessionChallengeTemplate(template);
  const validationStatus = assignedSessionOnly ? 'Assigned sessions only' : 'Workout-event validation';
  const validationDetail = assignedSessionOnly
    ? 'Only planned or trainer-assigned workout completions can move progress.'
    : ruleSourcePreview;
  const progressGatePreview = assignedSessionOnly ? 'Planned completions only' : 'Matching workout events';
  const requirementItems = requirements.length ? requirements : ['No additional requirements configured.'];
  const rewardCondition = template.xpReward > 0
    ? 'Reward is earned when challenge progress reaches 100%.'
    : 'No XP reward configured.';
  const tagSummary = tags.length ? tags.slice(0, 4).map(labelize).join(' + ') : 'No tags configured';
  const scheduleReady = Boolean(startDate && endDate && endDate > startDate);
  const publishReadiness = publishMode === 'public'
    ? 'Creates a public campaign scheduled for the selected start date.'
    : 'Creates a private draft for audience setup.';
  const goalTarget = `${template.maxProgress} ${labelize(template.progressUnit)}`;
  const validationMetric = labelize(template.rule.metric);

  return {
    submitLabel,
    capPreview,
    audiencePreview,
    ruleSourcePreview,
    assignedSessionOnly,
    requirementItems,
    rewardCondition,
    tagSummary,
    scheduleReady,
    publishReadiness,
    goalTarget,
    previewItems: [
      { label: 'Audience', value: audiencePreview },
      { label: 'Goal', value: goalTarget },
      { label: 'Validation', value: validationMetric },
      { label: 'Counts', value: progressGatePreview },
      { label: 'Schedule', value: `${startDate} to ${endDate}` },
      { label: 'Rewards', value: `${template.xpReward} XP` },
      { label: 'Publish state', value: PUBLISH_MODE_LABELS[publishMode] },
      { label: 'Capacity', value: capPreview },
    ],
    readinessItems: [
      { label: 'Audience', value: PUBLISH_MODE_LABELS[publishMode], ready: true, detail: publishReadiness },
      { label: 'Schedule', value: scheduleReady ? 'Schedule ready' : 'Fix schedule', ready: scheduleReady, detail: `${startDate || 'Start date'} to ${endDate || 'End date'}` },
      { label: 'Validation', value: validationStatus, ready: true, detail: validationDetail },
      { label: 'Rewards', value: template.xpReward > 0 ? `${template.xpReward} XP ready` : 'No XP reward', ready: template.xpReward > 0, detail: rewardCondition },
    ],
  };
};