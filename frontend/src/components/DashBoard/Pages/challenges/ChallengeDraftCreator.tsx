/**
 * Template-backed challenge draft creator.
 */

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import {
  buildChallengeDraftPayload,
  getDefaultDraftDates,
  type ChallengePublishMode,
} from './challengeDraftForm';
import { useChallengeDraftCreator } from './useChallengeDraftCreator';
import {
  CREATOR_STEPS,
  buildChallengeDraftCreatorModel,
  resolveCreatorStepNavigation,
  type CreatorStepId,
  type SummaryItem,
} from './ChallengeDraftCreator.model';
import type { ChallengeTemplate } from './useChallengeTemplates';
import * as S from './ChallengeDraftCreator.styles';

interface ChallengeDraftCreatorProps {
  template: ChallengeTemplate;
  onCancel: () => void;
  onCreated?: (created: unknown) => void;
}

const ChallengeDraftCreator: React.FC<ChallengeDraftCreatorProps> = ({ template, onCancel, onCreated }) => {
  const defaults = useMemo(() => getDefaultDraftDates(), []);
  const [activeStep, setActiveStep] = useState<CreatorStepId>('audience');
  const [title, setTitle] = useState(`${template.title} Draft`);
  const [description, setDescription] = useState(template.description);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [maxParticipants, setMaxParticipants] = useState('');
  const [publishMode, setPublishMode] = useState<ChallengePublishMode>('draft');
  const [localError, setLocalError] = useState<string | null>(null);
  const { createDraft, creating, error, created } = useChallengeDraftCreator();
  const model = useMemo(() => buildChallengeDraftCreatorModel({
    template,
    startDate,
    endDate,
    maxParticipants,
    publishMode,
  }), [endDate, maxParticipants, publishMode, startDate, template]);
  const activeStepIndex = CREATOR_STEPS.findIndex((step) => step.id === activeStep);
  const previousStep = activeStepIndex > 0 ? CREATOR_STEPS[activeStepIndex - 1] : null;
  const nextStep = activeStepIndex < CREATOR_STEPS.length - 1 ? CREATOR_STEPS[activeStepIndex + 1] : null;
  const activeStepLabel = CREATOR_STEPS[activeStepIndex]?.label ?? 'Audience';
  const getFormInput = () => ({ template, title, description, startDate, endDate, maxParticipants, publishMode });

  const navigateToStep = (targetStep: CreatorStepId) => {
    const result = resolveCreatorStepNavigation({ activeStep, targetStep, input: getFormInput() });
    setLocalError(result.error);
    setActiveStep(result.step);
    return result.error === null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    if (nextStep) {
      navigateToStep(nextStep.id);
      return;
    }

    try {
      const payload = buildChallengeDraftPayload({ template, title, description, startDate, endDate, maxParticipants, publishMode });
      const result = await createDraft(payload);
      onCreated?.(result);
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : 'Challenge draft could not be created');
    }
  };

  const renderRequirementItems = () => model.requirementItems.map((requirement) => <li key={requirement}>{requirement}</li>);

  const renderSummaryItem = ({ label, value, detail }: SummaryItem, setup = false) => {
    const SummaryBox = setup ? S.SetupItem : S.PreviewItem;
    return (
      <SummaryBox key={label}>
        <span>{label}</span>
        <strong>{value}</strong>
        {detail ? <small>{detail}</small> : null}
      </SummaryBox>
    );
  };

  const renderPreview = () => (
    <S.PreviewPanel aria-label="Challenge draft preview">
      <S.PreviewTitle>Review before publish</S.PreviewTitle>
      <S.PreviewGrid>{model.previewItems.map((item) => renderSummaryItem(item))}</S.PreviewGrid>
    </S.PreviewPanel>
  );

  const renderReadiness = () => (
    <S.SetupPanel aria-label="Challenge launch readiness">
      <S.PreviewTitle>Launch readiness</S.PreviewTitle>
      <S.SetupGrid>
        {model.readinessItems.map((item) => (
          <S.SetupItem key={item.label}>
            <span>{item.label}</span>
            <S.ReadinessBadge $ready={item.ready}>{item.value}</S.ReadinessBadge>
            {item.detail ? <small>{item.detail}</small> : null}
          </S.SetupItem>
        ))}
      </S.SetupGrid>
    </S.SetupPanel>
  );

  const renderOperationalSetup = () => (
    <S.SetupPanel aria-label="Challenge operational setup">
      <S.PreviewTitle>Operational setup</S.PreviewTitle>
      <S.SetupGrid>
        {renderSummaryItem({ label: 'Rule source', value: model.ruleSourcePreview }, true)}
        {renderSummaryItem({ label: 'Validation rule', value: template.rule.validation }, true)}
        {model.assignedSessionOnly
          ? renderSummaryItem({ label: 'Progress gate', value: 'Planned-session proof required', detail: 'Ad hoc workout logs stay out of this assigned-session challenge.' }, true)
          : null}
        <S.SetupItem>
          <span>Requirement</span>
          <S.RequirementList>{renderRequirementItems()}</S.RequirementList>
        </S.SetupItem>
        {renderSummaryItem({ label: 'Reward condition', value: model.rewardCondition }, true)}
        {renderSummaryItem({ label: 'Tags', value: model.tagSummary }, true)}
      </S.SetupGrid>
    </S.SetupPanel>
  );

  const renderAudienceStep = () => (
    <S.FieldGrid>
      <S.Field htmlFor="challenge-draft-publish-mode">
        Publish mode
        <S.Input as="select" id="challenge-draft-publish-mode" value={publishMode} onChange={(event) => setPublishMode(event.target.value as ChallengePublishMode)}>
          <option value="draft">Private draft</option>
          <option value="public">Public campaign</option>
        </S.Input>
      </S.Field>
      <S.Field htmlFor="challenge-draft-cap">
        Participant cap
        <S.Input id="challenge-draft-cap" inputMode="numeric" value={maxParticipants} onChange={(event) => setMaxParticipants(event.target.value)} placeholder="No cap" />
      </S.Field>
      {renderSummaryItem({ label: 'Audience shape', value: model.audiencePreview, detail: model.publishReadiness })}
      {renderSummaryItem({ label: 'Capacity', value: model.capPreview, detail: 'Leave empty for no hard cap.' })}
    </S.FieldGrid>
  );

  const renderGoalStep = () => (
    <S.FieldGrid>
      <S.Field htmlFor="challenge-draft-title">
        Draft title
        <S.Input id="challenge-draft-title" value={title} onChange={(event) => setTitle(event.target.value)} />
      </S.Field>
      {renderSummaryItem({ label: 'Template target', value: model.goalTarget, detail: template.title })}
      <S.FullWidthField htmlFor="challenge-draft-description">
        Draft description
        <S.TextArea id="challenge-draft-description" value={description} onChange={(event) => setDescription(event.target.value)} />
      </S.FullWidthField>
    </S.FieldGrid>
  );

  const renderScheduleStep = () => (
    <S.FieldGrid>
      <S.Field htmlFor="challenge-draft-start">
        Start date
        <S.Input id="challenge-draft-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
      </S.Field>
      <S.Field htmlFor="challenge-draft-end">
        End date
        <S.Input id="challenge-draft-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
      </S.Field>
      {renderSummaryItem({
        label: 'Schedule check',
        value: model.scheduleReady ? 'Schedule ready' : 'Fix schedule',
        detail: `${startDate || 'Start date'} to ${endDate || 'End date'}`,
      })}
    </S.FieldGrid>
  );

  const renderRewardsStep = () => (
    <S.SetupPanel aria-label="Challenge reward setup">
      <S.PreviewTitle>Rewards and requirements</S.PreviewTitle>
      <S.SetupGrid>
        {renderSummaryItem({ label: 'Reward', value: `${template.xpReward} XP`, detail: model.rewardCondition }, true)}
        <S.SetupItem>
          <span>Requirement</span>
          <S.RequirementList>{renderRequirementItems()}</S.RequirementList>
        </S.SetupItem>
        {renderSummaryItem({ label: 'Tags', value: model.tagSummary }, true)}
      </S.SetupGrid>
    </S.SetupPanel>
  );

  const renderActiveStep = () => {
    if (activeStep === 'audience') return renderAudienceStep();
    if (activeStep === 'goal') return renderGoalStep();
    if (activeStep === 'validation') return <>{renderReadiness()}{renderOperationalSetup()}</>;
    if (activeStep === 'schedule') return renderScheduleStep();
    if (activeStep === 'rewards') return renderRewardsStep();
    if (activeStep === 'preview') return <>{renderPreview()}{renderReadiness()}</>;
    return <>{renderPreview()}{renderReadiness()}{renderOperationalSetup()}</>;
  };

  const feedback = localError || error;

  return (
    <S.DraftPanel onSubmit={handleSubmit} aria-label="Create challenge draft">
      <S.DraftHeader>
        <S.DraftTitleGroup>
          <S.DraftKicker>Template Campaign</S.DraftKicker>
          <S.DraftTitle>{template.title}</S.DraftTitle>
          <S.TemplateSummary>{template.description}</S.TemplateSummary>
        </S.DraftTitleGroup>
      </S.DraftHeader>

      <S.StepList aria-label="Challenge setup steps">
        {CREATOR_STEPS.map((step, index) => (
          <S.StepItem key={step.id} $active={step.id === activeStep}>
            <S.StepButton type="button" onClick={() => navigateToStep(step.id)} aria-current={step.id === activeStep ? 'step' : undefined}>
              <small>{index + 1}</small>
              <span>{step.label}</span>
            </S.StepButton>
          </S.StepItem>
        ))}
      </S.StepList>

      <S.ActiveStepPanel aria-label={`${activeStepLabel} challenge setup`}>
        <S.PreviewTitle>{activeStepLabel} setup</S.PreviewTitle>
        {renderActiveStep()}
      </S.ActiveStepPanel>

      {feedback ? <S.Feedback $tone="error" role="alert">{feedback}</S.Feedback> : null}
      {created ? <S.Feedback $tone="success" role="status">{publishMode === 'draft' ? 'Draft created.' : 'Campaign created.'}</S.Feedback> : null}

      <S.ActionRow>
        <S.ActionButton type="button" $variant="ghost" onClick={onCancel} disabled={creating}><X size={16} />Cancel</S.ActionButton>
        {previousStep ? (
          <S.ActionButton type="button" $variant="ghost" onClick={() => navigateToStep(previousStep.id)} disabled={creating}>
            <ChevronLeft size={16} />Back to {previousStep.label}
          </S.ActionButton>
        ) : null}
        {nextStep ? (
          <S.ActionButton type="button" $variant="primary" onClick={() => navigateToStep(nextStep.id)} disabled={creating}>
            Next: {nextStep.label}<ChevronRight size={16} />
          </S.ActionButton>
        ) : (
          <S.ActionButton type="submit" $variant="primary" disabled={creating}><Plus size={16} />{creating ? 'Creating' : model.submitLabel}</S.ActionButton>
        )}
      </S.ActionRow>
    </S.DraftPanel>
  );
};

export default ChallengeDraftCreator;