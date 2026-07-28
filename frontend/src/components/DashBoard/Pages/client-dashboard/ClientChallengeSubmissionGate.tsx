/**
 * Blueprint: ClientChallengeSubmissionGate
 * Purpose: Client-facing challenge idea policy gate for the canonical client Challenges route.
 * Owner: Codex
 * Last validated: 2026-06-30 focused vitest slice
 *
 * Wireframe:
 * [title + policy message] [locked submit] [refresh]
 * [status badges: pilot locked | review required | no UGC | no public publish]
 * [next-step checklist from backend policy]
 *
 * Data flow:
 * Hook: useClientChallengeSubmissionGate -> GET /api/v1/gamification/challenge-submissions/policy
 * Submit path: disabled while canSubmit=false; hook refuses local POST while policy is closed
 * Children: none
 *
 * Click outcomes:
 * Refresh access -> policy reload only
 * Submit idea locked -> disabled control, no submission write
 * Submit idea open -> private or trainer-visible review POST through governed hook
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { LockKeyhole, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import {
  type ClientChallengeIdeaArchetype,
  type ClientChallengeIdeaType,
  type ClientChallengeIdeaVisibility,
  useClientChallengeSubmissionGate,
} from './useClientChallengeSubmissionGate';
import * as F from './ClientChallengeSubmissionGate.formStyles';

const GateShell = styled.section`
  position: relative;
  display: grid;
  gap: 18px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  border-radius: 8px;
  padding: clamp(20px, 3vw, 30px);
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--surface-primary, #003080) 72%, var(--bg-base, #0A0A0F)) 0%,
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, var(--bg-surface, #141419)) 100%);
  box-shadow: 0 22px 54px color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent);
`;

const GateHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: start;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const CopyStack = styled.div`
  display: grid;
  gap: 10px;
  min-width: 0;
`;

const Kicker = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--accent-primary, #60C0F0);
  font: 800 0.8rem/1.2 var(--font-ui, 'Sora', sans-serif);
  text-transform: uppercase;
`;

const Title = styled.h2`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 900 clamp(1.35rem, 3vw, 2rem)/1.05 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
`;

const Copy = styled.p`
  max-width: 72ch;
  margin: 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 74%, transparent);
  font: 600 0.95rem/1.6 var(--font-ui, 'Sora', sans-serif);
`;

const StatusBadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  border-radius: 999px;
  padding: 0 12px;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 42%, transparent);
  font: 800 0.76rem/1 var(--font-ui, 'Sora', sans-serif);
`;

const ActionColumn = styled.div`
  display: grid;
  gap: 10px;
  justify-items: end;

  @media (max-width: 680px) {
    justify-items: stretch;
  }
`;

const NextStepList = styled.ul`
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const NextStepItem = styled.li`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent);
  font: 650 0.9rem/1.5 var(--font-ui, 'Sora', sans-serif);
`;

const InlineNotice = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--accent-gold, #C6A84B) 84%, var(--text-primary, #E0ECF4));
  font: 800 0.82rem/1.4 var(--font-ui, 'Sora', sans-serif);
`;
const challengeTypeOptions: { value: ClientChallengeIdeaType; label: string }[] = [
  { value: 'weekly', label: 'Weekly rhythm' },
  { value: 'daily', label: 'Daily streak' },
  { value: 'monthly', label: 'Monthly build' },
  { value: 'custom', label: 'Custom window' },
];

const challengeArchetypeOptions: { value: ClientChallengeIdeaArchetype; label: string }[] = [
  { value: 'consistency', label: 'Consistency' },
  { value: 'session_completion', label: 'Session completion' },
  { value: 'time_activity', label: 'Time / activity' },
  { value: 'exercise_family', label: 'Exercise family' },
  { value: 'improvement', label: 'Improvement goal' },
  { value: 'team', label: 'Team challenge' },
];

const fallbackNextSteps = [
  'Keep logging workouts so your trainer can nominate challenge ideas from real progress.',
  'Ask your trainer or admin to enable client challenge submissions when the pilot opens.',
];
const TITLE_LIMIT = 72;
const DESCRIPTION_LIMIT = 240;

const ClientChallengeSubmissionGate: React.FC = () => {
  const gate = useClientChallengeSubmissionGate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requestedVisibility, setRequestedVisibility] = useState<ClientChallengeIdeaVisibility>('trainer_visible');
  const [challengeType, setChallengeType] = useState<ClientChallengeIdeaType>('weekly');
  const [archetype, setArchetype] = useState<ClientChallengeIdeaArchetype>('consistency');
  const message = gate.loading
    ? 'Checking challenge idea access.'
    : gate.error || gate.message || 'Challenge idea submissions are not open yet.';
  const nextSteps = gate.nextSteps.length > 0 ? gate.nextSteps : fallbackNextSteps;
  const isPrivateIdea = requestedVisibility === 'private';
  const titleText = title.trim();
  const descriptionText = description.trim();
  const hasTitle = titleText.length > 0;
  const hasDescription = descriptionText.length > 0;
  const readinessMessage = !hasTitle && !hasDescription
    ? 'Add a title and description to unlock submission.'
    : !hasTitle
      ? 'Add a title to unlock submission.'
      : !hasDescription
        ? 'Add a description to unlock submission.'
        : isPrivateIdea ? 'Ready for private staff review.' : 'Ready for trainer review.';
  const canSendIdea = gate.canSubmit && hasTitle && hasDescription && !gate.loading;

  const submitIdea = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSendIdea) return;
    const submitted = await gate.submitChallengeIdea({
      title: title.trim(),
      description: description.trim(),
      requestedVisibility,
      challengeType,
      archetype,
    });
    if (submitted) {
      setTitle('');
      setDescription('');
      setRequestedVisibility('trainer_visible');
      setChallengeType('weekly');
      setArchetype('consistency');
    }
  };

  return (
    <GateShell aria-labelledby="client-challenge-idea-title">
      <GateHeader>
        <CopyStack>
          <Kicker><Sparkles size={15} aria-hidden="true" /> Client challenge ideas</Kicker>
          <Title id="client-challenge-idea-title">Challenge Idea Lab</Title>
          <Copy>{message}</Copy>
          <StatusBadgeRow aria-label="Challenge idea gate status">
            <StatusBadge>{gate.canSubmit ? 'Entitlement Open' : 'Pilot Locked'}</StatusBadge>
            <StatusBadge>Trainer review required</StatusBadge>
            <StatusBadge>No media or comments</StatusBadge>
            <StatusBadge>No public publishing</StatusBadge>
          </StatusBadgeRow>
        </CopyStack>
        <ActionColumn>
          {!gate.canSubmit && (
            <F.GateButton type="button" aria-label="Submit challenge idea locked" disabled>
              <LockKeyhole size={16} aria-hidden="true" />
              Submit idea locked
            </F.GateButton>
          )}
          <F.GateButton type="button" aria-label="Refresh challenge idea access" onClick={() => { void gate.reload(); }}>
            <RefreshCw size={16} aria-hidden="true" />
            Refresh access
          </F.GateButton>
        </ActionColumn>
      </GateHeader>

      {gate.canSubmit && (
        <F.IdeaForm aria-label="Submit challenge idea" onSubmit={submitIdea}>
          <F.Field>
            <span>Challenge idea title</span>
            <F.FieldInput value={title} maxLength={TITLE_LIMIT} aria-label="Challenge idea title" aria-describedby="challenge-idea-title-count" onChange={(event) => setTitle(event.target.value)} />
            <F.FieldMeta id="challenge-idea-title-count">{title.length}/{TITLE_LIMIT} title characters</F.FieldMeta>
          </F.Field>
          <F.Field>
            <span>Challenge idea description</span>
            <F.FieldTextArea value={description} maxLength={DESCRIPTION_LIMIT} aria-label="Challenge idea description" aria-describedby="challenge-idea-description-count" onChange={(event) => setDescription(event.target.value)} />
            <F.FieldMeta id="challenge-idea-description-count">{description.length}/{DESCRIPTION_LIMIT} description characters</F.FieldMeta>
          </F.Field>
          <F.IntentGrid>
            <F.Field>
              <span>Challenge format</span>
              <F.FieldSelect value={challengeType} onChange={(event) => setChallengeType(event.target.value as ClientChallengeIdeaType)}>
                {challengeTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </F.FieldSelect>
            </F.Field>
            <F.Field>
              <span>Challenge focus</span>
              <F.FieldSelect value={archetype} onChange={(event) => setArchetype(event.target.value as ClientChallengeIdeaArchetype)}>
                {challengeArchetypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </F.FieldSelect>
            </F.Field>
          </F.IntentGrid>
          <F.VisibilityFieldset>
            <legend>Challenge idea visibility</legend>
            <F.VisibilityChoiceGrid>
              <F.VisibilityOption>
                <input type="radio" name="challenge-idea-visibility" checked={requestedVisibility === 'trainer_visible'} onChange={() => setRequestedVisibility('trainer_visible')} />
                <span><strong>Trainer review</strong><small>Send this idea to your trainer or admin before any challenge draft exists.</small></span>
              </F.VisibilityOption>
              <F.VisibilityOption>
                <input type="radio" name="challenge-idea-visibility" checked={isPrivateIdea} onChange={() => setRequestedVisibility('private')} />
                <span><strong>Private self-challenge</strong><small>Keep the idea scoped to you and staff review before activation.</small></span>
              </F.VisibilityOption>
            </F.VisibilityChoiceGrid>
          </F.VisibilityFieldset>
          <F.FormReadiness id="challenge-idea-readiness" role="status">{readinessMessage}</F.FormReadiness>
          <F.GateButton type="submit" aria-label={isPrivateIdea ? 'Submit private challenge idea' : 'Submit challenge idea for trainer review'} aria-describedby="challenge-idea-readiness" disabled={!canSendIdea} title={readinessMessage}>
            <Sparkles size={16} aria-hidden="true" />
            {isPrivateIdea ? 'Submit private idea' : 'Submit for trainer review'}
          </F.GateButton>
          <Copy>{isPrivateIdea ? 'No public publishing' : 'Trainer review only. No media, comments, or public publishing.'}</Copy>
        </F.IdeaForm>
      )}

      <NextStepList aria-label="Challenge idea gate next steps">
        {nextSteps.map((step) => (
          <NextStepItem key={step}>
            <ShieldCheck size={16} aria-hidden="true" />
            <span>{step}</span>
          </NextStepItem>
        ))}
      </NextStepList>

      {gate.actionError && <InlineNotice role="alert">{gate.actionError}</InlineNotice>}
      {gate.actionMessage && <InlineNotice role="status">{gate.actionMessage}</InlineNotice>}
    </GateShell>
  );
};

export default ClientChallengeSubmissionGate;