/**
 * Blueprint: ChallengeSettingsPanel
 * Purpose: Shows governed client-created challenge rollout controls without pretending unsupported toggles are live.
 * Owner: Codex
 * Last validated: 2026-06-30 focused vitest slice
 *
 * Wireframe:
 * [status copy: client challenge policy]
 * [policy grid: private | trainer-visible | public/team | media | comments]
 * [safety gates: filtering | reporting | blocking | contact | terms]
 * [operational gates: auto-publish | moderation | creator roles]
 *
 * Data flow:
 * Props: governance policy from useChallengeTemplates catalog endpoint
 * State: none
 * API calls: none in this component; source data loaded by parent workspace
 * Events: none; policy rows are read-only governance receipts
 * Children: shared challenge status and policy tile primitives
 *
 * Architecture:
 * ChallengeCommandWorkspace -> ChallengeSettingsPanel -> PolicyGrid -> PolicyTile
 */

import React from 'react';
import styled from 'styled-components';
import type { ChallengeGovernancePolicy } from './useChallengeTemplates';
import * as S from './ChallengeCommandWorkspace.styles';

interface ChallengeSettingsPanelProps {
  governance: ChallengeGovernancePolicy | null;
}

const SettingsShell = styled.section`
  display: grid;
  gap: 14px;
`;

interface PolicyRow {
  key: string;
  label: string;
  value: string;
  detail: string;
  enabled?: boolean;
}

const labelize = (value: string) => value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const rolesLabel = (roles?: string[]) => (roles?.length ? roles.map(labelize).join(' + ') : 'Admin + Trainer');

const isClientCreationClosed = (governance: ChallengeGovernancePolicy | null) => (
  !governance || governance.clientCreation === 'disabled_by_default'
);

const moderationLabel = (governance: ChallengeGovernancePolicy | null) => (
  governance?.requiresModerationForClientPublish ? 'Moderation required' : 'Policy pending'
);

const buildDefaultPolicyRows = (governance: ChallengeGovernancePolicy | null): PolicyRow[] => {
  const closedLabel = isClientCreationClosed(governance) ? 'Closed until entitlement' : 'Enabled by entitlement';
  const moderation = moderationLabel(governance);

  return [
    {
      key: 'private_self_challenges',
      label: 'Private self-challenges',
      value: closedLabel,
      detail: 'Client-only drafts stay gated until an admin entitlement exists.',
    },
    {
      key: 'trainer_visible_submissions',
      label: 'Trainer-visible submissions',
      value: moderation,
      detail: 'Client ideas require a review queue before trainers can act on them.',
    },
    {
      key: 'public_or_team_publish',
      label: 'Public or team publish',
      value: closedLabel,
      detail: 'Shared challenge publishing waits for reporting, blocking, and review safeguards.',
    },
    {
      key: 'media_uploads',
      label: 'Media uploads',
      value: closedLabel,
      detail: 'Images and video stay off until moderation tooling is connected.',
    },
    {
      key: 'comments',
      label: 'Comments',
      value: closedLabel,
      detail: 'Discussion controls stay closed until reporting and blocking flows exist.',
    },
    {
      key: 'content_filtering',
      label: 'Content filtering',
      value: 'Required before public release',
      detail: 'Shared challenge names, descriptions, and media need connected filtering before public discovery.',
    },
    {
      key: 'reporting_flow',
      label: 'Reporting flow',
      value: 'Required before public release',
      detail: 'Clients need a visible way to report unsafe or objectionable shared challenge content.',
    },
    {
      key: 'blocking_flow',
      label: 'Blocking flow',
      value: 'Required before public release',
      detail: 'Community challenge rollout waits for block controls that protect clients from abusive creators.',
    },
    {
      key: 'safety_contact',
      label: 'Safety contact',
      value: 'Published contact required',
      detail: 'Public UGC launch needs a maintained support contact for challenge safety escalations.',
    },
    {
      key: 'terms_acceptance',
      label: 'Terms acceptance',
      value: 'Required at rollout',
      detail: 'Shared challenge creation waits for creator terms and conduct acknowledgement.',
    },
    {
      key: 'auto_publish',
      label: 'Auto-publish',
      value: 'Disabled',
      detail: 'Client-originated challenges require human review before any shared visibility.',
    },
    {
      key: 'moderation_default',
      label: 'Moderation default',
      value: moderation,
      detail: 'Review remains the default gate for public or team challenge proposals.',
    },
    {
      key: 'creator_roles',
      label: 'Creator roles',
      value: rolesLabel(governance?.creatorRoles),
      detail: 'Operational challenge creation remains owned by staff roles.',
    },
  ];
};

const buildPolicyRows = (governance: ChallengeGovernancePolicy | null): PolicyRow[] => {
  const defaultRows = buildDefaultPolicyRows(governance);

  if (!governance?.clientCreationControls?.length) return defaultRows;

  const backendRows = governance.clientCreationControls.map((control) => ({
    key: control.key,
    label: control.label,
    value: control.value,
    detail: control.detail,
    enabled: control.enabled,
  }));
  const coveredKeys = new Set(backendRows.map((row) => row.key));
  const coveredLabels = new Set(backendRows.map((row) => row.label));
  const missingDefaults = defaultRows.filter((row) => !coveredKeys.has(row.key) && !coveredLabels.has(row.label));

  return [...backendRows, ...missingDefaults];
};

const ChallengeSettingsPanel: React.FC<ChallengeSettingsPanelProps> = ({ governance }) => {
  const policyRows = buildPolicyRows(governance);

  return (
    <SettingsShell aria-labelledby="challenge-settings-title">
      <S.StatusStack>
        <S.StatusTitle id="challenge-settings-title">Client challenge policy</S.StatusTitle>
        <S.StatusCopy>
          Client-created challenges are staged as entitlement-gated controls, not a single public switch.
        </S.StatusCopy>
      </S.StatusStack>

      <S.PolicyGrid as="section" aria-label="Client challenge creation policy">
        {policyRows.map((row) => (
          <S.PolicyTile key={row.key}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
            {typeof row.enabled === 'boolean' && (
              <S.ChallengeStatusBadge $status={row.enabled ? 'active' : 'draft'}>
                {row.enabled ? 'Enabled' : 'Gated'}
              </S.ChallengeStatusBadge>
            )}
            <small>{row.detail}</small>
          </S.PolicyTile>
        ))}
      </S.PolicyGrid>
    </SettingsShell>
  );
};

export default ChallengeSettingsPanel;
