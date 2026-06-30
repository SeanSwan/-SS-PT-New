/**
 * Governed challenge template card for the command workspace catalog.
 */

import React from 'react';
import { Plus, Target, Users } from 'lucide-react';
import { isAssignedSessionChallengeTemplate } from './challengeTemplateRules';
import type { ChallengeTemplate } from './useChallengeTemplates';
import * as S from './ChallengeCommandWorkspace.styles';

interface ChallengeTemplateCardProps {
  template: ChallengeTemplate;
  onCreateDraft: (template: ChallengeTemplate) => void;
}

const labelize = (value: string) => value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatTarget = (template: ChallengeTemplate) => `${template.maxProgress} ${labelize(template.progressUnit)}`;

const ChallengeTemplateCard: React.FC<ChallengeTemplateCardProps> = ({ template, onCreateDraft }) => (
  <S.TemplateCardShell>
    <S.CardHeader>
      <S.CardTitleGroup>
        <S.CardMeta>{labelize(template.archetype)}</S.CardMeta>
        <S.CardTitle>{template.title}</S.CardTitle>
      </S.CardTitleGroup>
      <S.TemplateIcon aria-hidden="true">
        {template.allowTeams ? <Users size={20} /> : <Target size={20} />}
      </S.TemplateIcon>
    </S.CardHeader>

    <div>
      <S.CardDescription>{template.description}</S.CardDescription>
      <S.BadgeRow aria-label={`${template.title} tags`}>
        <S.Badge>{labelize(template.challengeType)}</S.Badge>
        <S.Badge>{formatTarget(template)}</S.Badge>
        <S.Badge>{template.allowTeams ? `Teams up to ${template.maxTeamSize ?? 4}` : 'Individual'}</S.Badge>
        {isAssignedSessionChallengeTemplate(template) ? <S.Badge>Assigned sessions only</S.Badge> : null}
      </S.BadgeRow>
      {isAssignedSessionChallengeTemplate(template) ? (
        <S.CardRuleNote>Counts planned or trainer-assigned workout completions.</S.CardRuleNote>
      ) : null}
    </div>

    <S.MetricRow>
      <S.MetricPill>
        <small>XP</small>
        <strong>{template.xpReward}</strong>
      </S.MetricPill>
      <S.MetricPill>
        <small>Difficulty</small>
        <strong>{template.difficulty}/5</strong>
      </S.MetricPill>
      <S.MetricPill>
        <small>Metric</small>
        <strong>{labelize(template.rule.metric)}</strong>
      </S.MetricPill>
      <S.IconButton type="button" aria-label={`Create draft from ${template.title}`} onClick={() => onCreateDraft(template)}>
        <Plus size={16} />
        Create Draft
      </S.IconButton>
    </S.MetricRow>
  </S.TemplateCardShell>
);

export default ChallengeTemplateCard;