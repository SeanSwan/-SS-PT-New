/**
 * FILE: SwanAuraPanel.tsx
 * PURPOSE: Read-only Unity Weaver / Swan Aura dashboard surface.
 *
 * Slice 1 boundary:
 * - No moderation writes
 * - No AI provider calls
 * - No social post mutation
 * - No gamification mutation
 *
 * This panel converts existing dashboard state into warm, prosocial, health-first
 * nudges so Unity Weaver can enter the product safely before command or
 * moderation workflows are introduced.
 */
import React, { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowRight, HeartHandshake, Sparkles } from 'lucide-react';
import { buildAuraNudge, compactAuraNumber, getNudgeIcon } from './SwanAuraPanel.logic';
import type { SwanAuraPanelProps } from './SwanAuraPanel.types';
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

const SwanAuraPanel: React.FC<SwanAuraPanelProps> = (props) => {
  const prefersReducedMotion = useReducedMotion();
  const nudge = useMemo(() => buildAuraNudge(props), [props]);
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
          <AuraTitle>{props.userName}, good energy is part of the training.</AuraTitle>
          <AuraSubtext>
            Unity Weaver’s dashboard presence is read-only in this slice: motivation, kindness prompts, and honest momentum — no posts or records change from this card.
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
          <MetaValue>{compactAuraNumber(props.points)}</MetaValue>
          <MetaLabel>XP</MetaLabel>
        </AuraMeta>
        <AuraMeta>
          <MetaValue>{props.streakDays}</MetaValue>
          <MetaLabel>Streak</MetaLabel>
        </AuraMeta>
        <AuraMeta>
          <MetaValue>{props.badges.length}</MetaValue>
          <MetaLabel>Top badges</MetaLabel>
        </AuraMeta>
      </AuraMetaGrid>
    </AuraShell>
  );
};

export default React.memo(SwanAuraPanel);
