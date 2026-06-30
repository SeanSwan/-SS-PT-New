/**
 * Blueprint: ChallengeWorkspaceNextAction
 * Purpose: Real-data operator guidance for the Admin/Trainer challenge workspace.
 * Owner: Codex
 * Last validated: 2026-06-30 focused vitest slice
 *
 * Wireframe:
 * [Next action tile + open tab button]
 * [Focus tile: campaign/submission/template context]
 * [Why it matters tile: operational reason]
 *
 * Data flow:
 * Props: template count/loading, managed challenge records, submission queue count/loading
 * State: none
 * API calls: none
 * Children: none
 *
 * Architecture:
 * ChallengeCommandWorkspace -> ChallengeWorkspaceNextAction -> buildChallengeWorkspaceNextAction
 *
 * Click outcomes:
 * Open button -> parent navigation handler(targetTab)
 */

import React from 'react';
import { ArrowRight, BarChart3, Rocket, ShieldCheck, Trophy, Users } from 'lucide-react';
import type { ChallengeWorkspaceTab } from './ChallengeCommandWorkspace.tabs';
import type { ManagedChallenge, ManagedChallengeParticipant } from './useManagedChallenges';
import * as S from './ChallengeCommandWorkspace.styles';

export interface ChallengeWorkspaceNextActionInput {
  templateCount: number;
  templatesLoading?: boolean;
  challenges: Array<Pick<ManagedChallenge, 'id' | 'title' | 'status' | 'startDate' | 'currentParticipants' | 'participants'>>;
  submissionCount: number;
  submissionsLoading?: boolean;
}

export interface ChallengeWorkspaceNextActionModel {
  title: string;
  detail: string;
  focusLabel: string;
  reason: string;
  targetTab: ChallengeWorkspaceTab;
  actionLabel: string;
  icon: 'templates' | 'audience' | 'live' | 'results' | 'submissions';
  disabled?: boolean;
}

interface ChallengeWorkspaceNextActionProps extends ChallengeWorkspaceNextActionInput {
  onNavigate: (tab: ChallengeWorkspaceTab) => void;
}

const toNonNegativeCount = (value: number | string | null | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
};

const participantCount = (challenge: Pick<ManagedChallenge, 'currentParticipants' | 'participants'>): number => Math.max(
  toNonNegativeCount(challenge.currentParticipants),
  (challenge.participants as ManagedChallengeParticipant[] | undefined)?.length ?? 0,
);

const startsInFuture = (startDate: string) => {
  const startTime = new Date(startDate).getTime();
  return Number.isFinite(startTime) && startTime > Date.now();
};

const openLabel = (tab: ChallengeWorkspaceTab): string => {
  if (tab === 'live') return 'Open Live Challenges';
  return `Open ${tab.charAt(0).toUpperCase()}${tab.slice(1)}`;
};

export const buildChallengeWorkspaceNextAction = ({
  templateCount,
  templatesLoading = false,
  challenges,
  submissionCount,
  submissionsLoading = false,
}: ChallengeWorkspaceNextActionInput): ChallengeWorkspaceNextActionModel => {
  if (templatesLoading) {
    return {
      title: 'Syncing the challenge catalog',
      detail: 'Templates are loading from the governed backend catalog.',
      focusLabel: 'Template catalog',
      reason: 'Staff should create campaigns only from known challenge rules.',
      targetTab: 'templates',
      actionLabel: 'Open Templates',
      icon: 'templates',
      disabled: true,
    };
  }

  if (templateCount <= 0) {
    return {
      title: 'Connect the challenge template catalog',
      detail: 'No governed templates are available for campaign creation.',
      focusLabel: 'Template catalog',
      reason: 'Templates keep challenge rules measurable and tied to workout evidence.',
      targetTab: 'templates',
      actionLabel: 'Open Templates',
      icon: 'templates',
    };
  }

  if (challenges.length === 0) {
    return {
      title: 'Create the first challenge draft',
      detail: 'Start from a measured template before choosing the audience and publish mode.',
      focusLabel: `${templateCount} templates ready`,
      reason: 'A draft keeps audience setup and validation review separate from publishing.',
      targetTab: 'templates',
      actionLabel: 'Open Templates',
      icon: 'templates',
    };
  }

  const draftNeedingAudience = challenges.find((challenge) => challenge.status === 'draft' && participantCount(challenge) === 0);
  if (draftNeedingAudience) {
    return {
      title: 'Add an audience before publishing',
      detail: 'A draft exists with no saved cohort yet.',
      focusLabel: draftNeedingAudience.title,
      reason: 'Private challenge publishing requires a real audience so progress starts from known clients.',
      targetTab: 'audience',
      actionLabel: 'Open Audience',
      icon: 'audience',
    };
  }

  if (submissionsLoading) {
    return {
      title: 'Syncing client submission queue',
      detail: 'Client-created submissions are loading from the governed moderation queue.',
      focusLabel: 'Moderation queue syncing',
      reason: 'Staff should not move campaign operations past client-submission moderation until the queue is known.',
      targetTab: 'submissions',
      actionLabel: 'Open Submissions',
      icon: 'submissions',
      disabled: true,
    };
  }

  if (submissionCount > 0) {
    return {
      title: 'Review client challenge submissions',
      detail: `${submissionCount} client-created ${submissionCount === 1 ? 'submission needs' : 'submissions need'} staff review.`,
      focusLabel: `${submissionCount} awaiting review`,
      reason: 'Client-originated challenges stay governed until moderation approves the next step.',
      targetTab: 'submissions',
      actionLabel: 'Open Submissions',
      icon: 'submissions',
    };
  }

  const scheduledChallenge = challenges.find((challenge) => challenge.status === 'active' && startsInFuture(challenge.startDate));
  if (scheduledChallenge) {
    return {
      title: 'Monitor scheduled challenge launch',
      detail: 'A campaign is scheduled; confirm the audience, start window, and launch readiness before results move.',
      focusLabel: scheduledChallenge.title,
      reason: 'Scheduled campaigns need launch readiness before staff can judge workout-event impact.',
      targetTab: 'live',
      actionLabel: 'Open Live Challenges',
      icon: 'live',
    };
  }

  const liveChallenge = challenges.find((challenge) => challenge.status === 'active' && !startsInFuture(challenge.startDate));
  if (liveChallenge) {
    return {
      title: 'Inspect live challenge impact',
      detail: 'A campaign is running; check participation, completion, and workout-event progress.',
      focusLabel: liveChallenge.title,
      reason: 'Results show whether the challenge is improving adherence or needs trainer action.',
      targetTab: 'results',
      actionLabel: 'Open Results',
      icon: 'results',
    };
  }

  const publishableDraft = challenges.find((challenge) => challenge.status === 'draft');
  if (publishableDraft) {
    return {
      title: 'Publish the ready draft',
      detail: 'A draft has audience setup and can move into live campaign operations.',
      focusLabel: publishableDraft.title,
      reason: 'Publishing turns the governed setup into a visible training campaign.',
      targetTab: 'live',
      actionLabel: 'Open Live Challenges',
      icon: 'live',
    };
  }

  return {
    title: 'Create the next measurable challenge',
    detail: 'The current queue is clear; use the catalog to start another campaign.',
    focusLabel: `${challenges.length} campaigns tracked`,
    reason: 'A steady challenge cadence keeps progress visible without inventing data.',
    targetTab: 'templates',
    actionLabel: 'Open Templates',
    icon: 'templates',
  };
};

const actionIcon = (icon: ChallengeWorkspaceNextActionModel['icon']) => {
  if (icon === 'audience') return <Users size={16} aria-hidden="true" />;
  if (icon === 'live') return <Rocket size={16} aria-hidden="true" />;
  if (icon === 'results') return <BarChart3 size={16} aria-hidden="true" />;
  if (icon === 'submissions') return <ShieldCheck size={16} aria-hidden="true" />;
  return <Trophy size={16} aria-hidden="true" />;
};

const ChallengeWorkspaceNextAction: React.FC<ChallengeWorkspaceNextActionProps> = ({ onNavigate, ...input }) => {
  const action = buildChallengeWorkspaceNextAction(input);
  const actionDetailId = 'challenge-next-action-detail';

  return (
    <S.PolicyGrid as="section" aria-label="Challenge command next action">
      <S.PolicyTile>
        <span>Next Action</span>
        <strong>{action.title}</strong>
        <small id={actionDetailId}>{action.detail}</small>
        <S.IconButton
          type="button"
          aria-label={action.actionLabel}
          aria-describedby={action.disabled ? actionDetailId : undefined}
          disabled={action.disabled}
          onClick={() => onNavigate(action.targetTab)}
        >
          {actionIcon(action.icon)}
          {action.actionLabel}
        </S.IconButton>
      </S.PolicyTile>
      <S.PolicyTile>
        <span>Focus</span>
        <strong>{action.focusLabel}</strong>
        <small>{openLabel(action.targetTab)} keeps this action on the mounted workspace.</small>
      </S.PolicyTile>
      <S.PolicyTile>
        <span>Why It Matters</span>
        <strong>{action.reason}</strong>
        <small><ArrowRight size={14} aria-hidden="true" /> Follow the next tab before moving campaigns forward.</small>
      </S.PolicyTile>
    </S.PolicyGrid>
  );
};

export default ChallengeWorkspaceNextAction;
