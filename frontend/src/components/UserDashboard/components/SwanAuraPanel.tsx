/**
 * FILE: SwanAuraPanel.tsx
 * PURPOSE: Read-only Unity Weaver / Swan Aura dashboard surface.
 */
import React from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowRight, HeartHandshake, Sparkles } from 'lucide-react';
import { compactAuraNumber, getNudgeIcon } from './SwanAuraPanel.logic';
import type { SwanAuraPanelProps } from './SwanAuraPanel.types';
import { useSwanAuraNudges } from './useSwanAuraNudges';
import {
  AuraAvatar,
  AuraButton,
  AuraCopy,
  AuraEyebrow,
  AuraGlow,
  AuraHeader,
  AuraMeta,
  AuraMetaGrid,
  AuraShell,
  AuraSubtext,
  AuraTitle,
  MetaLabel,
  MetaValue,
  NudgeBody,
  NudgeCard,
  NudgeEyebrow,
  NudgeIcon,
  NudgeText,
  NudgeTitle,
  NudgeTop,
} from './SwanAuraPanel.styles';

const SwanAuraPanel: React.FC<SwanAuraPanelProps> = ({
  activeChallenge,
  badges,
  latestPost,
  level,
  points,
  pointsToNext,
  progressPercent,
  streakAtRisk,
  streakDays,
  userName,
  onEncourageFriend,
  onLogWorkout,
  onOpenChallenges,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const nudge = useSwanAuraNudges({
    activeChallenge,
    badges,
    latestPost,
    level,
    pointsToNext,
    progressPercent,
    streakAtRisk,
    streakDays,
    onEncourageFriend,
    onLogWorkout,
    onOpenChallenges,
  });
  const Icon = getNudgeIcon(nudge.tone);

  return (
    <AuraShell
      aria-label="Swan Aura positive community guide"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: 0.08 }}
    >
      <AuraGlow />
      <AuraHeader>
        <AuraAvatar aria-hidden="true">
          <Sparkles size={22} />
        </AuraAvatar>
        <AuraCopy>
          <AuraEyebrow>
            <HeartHandshake size={13} aria-hidden="true" />
            Swan Aura
          </AuraEyebrow>
          <AuraTitle>{userName}, good energy is part of the community.</AuraTitle>
          <AuraSubtext>
            The user dashboard is your social home. Swan Aura is the benevolent Unity Weaver presence here: motivation, kindness prompts, and honest momentum.
          </AuraSubtext>
        </AuraCopy>
      </AuraHeader>

      <NudgeCard $tone={nudge.tone}>
        <NudgeTop>
          <NudgeIcon $tone={nudge.tone} aria-hidden="true">
            <Icon size={18} />
          </NudgeIcon>
          <NudgeBody>
            <NudgeEyebrow>{nudge.eyebrow}</NudgeEyebrow>
            <NudgeTitle>{nudge.title}</NudgeTitle>
            <NudgeText>{nudge.body}</NudgeText>
          </NudgeBody>
        </NudgeTop>
        <AuraButton type="button" onClick={nudge.onAction}>
          {nudge.ctaLabel}
          <ArrowRight size={15} aria-hidden="true" />
        </AuraButton>
      </NudgeCard>

      <AuraMetaGrid aria-label="Swan Aura context summary">
        <AuraMeta>
          <MetaValue>{compactAuraNumber(points)}</MetaValue>
          <MetaLabel>XP</MetaLabel>
        </AuraMeta>
        <AuraMeta>
          <MetaValue>{streakDays}</MetaValue>
          <MetaLabel>Streak</MetaLabel>
        </AuraMeta>
        <AuraMeta>
          <MetaValue>{badges.length}</MetaValue>
          <MetaLabel>Top badges</MetaLabel>
        </AuraMeta>
      </AuraMetaGrid>
    </AuraShell>
  );
};

export default React.memo(SwanAuraPanel);
