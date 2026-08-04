/**
 * ============================================================================
 * FILE: DailyHealthLoop.tsx
 * PURPOSE: Daily mission surface for /user-dashboard Home.
 * AUTHOR: Codex GPT-5 | CREATED: 2026-05-07
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Gives members one clear daily health loop: the action,
 * the reason it matters, and the visible account impact. It uses only existing
 * HomeTab data and routes, so it does not create a new backend dependency.
 *
 * HOW IT FITS IN THE APP: Rendered by HomeTab between the MomentumCard and
 * SwanCoachDock. Daily Mission owns the single Log Workout CTA; the rail is
 * information-only so it does not duplicate the dashboard section nav.
 *
 * KEY DECISIONS:
 * - No fake XP claims. Reward language stays tied to existing visible surfaces.
 * - Privacy-safe social copy: sharing is framed as user choice, not automation.
 * - Styled-components only with Crystalline Swan token fallbacks.
 * - 44px minimum interactive targets and reduced-motion-safe interactions.
 */

import React from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  Dumbbell,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  Utensils,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Arrow,
  Eyebrow,
  IconWell,
  LoopShell,
  MicroCard,
  MicroSub,
  MicroText,
  MicroTitle,
  MissionCopy,
  MissionPanel,
  MissionTitle,
  PrimaryAction,
  RailPanel,
  ResultPill,
  ResultRow,
} from './DailyHealthLoop.styles';

interface DailyHealthLoopProps {
  streakDays: number;
  level: number;
  progressPercent: number;
  tierName: string;
  logWorkoutPath: string;
  nutritionAction?: {
    title: string;
    copy: string;
    label: string;
  } | null;
  onOpenNutrition?: () => void;
  /**
   * Whether the gamification record is known. `streakDays` resolves through
   * `?? 0` upstream, so on an outage this component told a member on a live
   * streak to "start today" and claimed "0% to next level".
   */
  gamificationKnown: boolean;
}

function getMissionCopy(
  streakDays: number,
  level: number,
  progressPercent: number,
  gamificationKnown: boolean,
) {
  // Unknown is not a zero-streak. Fall back to copy that is true either way.
  if (!gamificationKnown) {
    return {
      title: 'Log today’s session when you finish it.',
      copy: 'Your streak and level are still loading, but logging the work is what they are built from.',
    };
  }

  if (streakDays === 0) {
    return {
      title: 'Start today with one logged health action.',
      copy: 'A workout log gives your progress charts, level, and coach context something true to build from.',
    };
  }

  if (progressPercent >= 80) {
    return {
      title: `One more honest session pushes Level ${level} within reach.`,
      copy: 'Finish the loop by logging the work, then review what changed before you share anything.',
    };
  }

  return {
    title: `Protect your ${streakDays}-day rhythm with one clear action.`,
    copy: 'The win is not noise or pressure. It is proof: a logged session, a visible trend, and a next step you can trust.',
  };
}

const DailyHealthLoop: React.FC<DailyHealthLoopProps> = ({
  streakDays,
  level,
  progressPercent,
  tierName,
  logWorkoutPath,
  nutritionAction,
  onOpenNutrition,
  gamificationKnown,
}) => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const nutritionMission = nutritionAction && onOpenNutrition ? nutritionAction : null;
  const mission = nutritionMission || getMissionCopy(streakDays, level, progressPercent, gamificationKnown);
  const PrimaryIcon = nutritionMission ? Utensils : Dumbbell;
  const handlePrimaryAction = () => {
    if (nutritionMission && onOpenNutrition) {
      onOpenNutrition();
      return;
    }
    navigate(logWorkoutPath);
  };

  return (
    <LoopShell
      initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 }}
      aria-label="Daily health loop"
    >
      <MissionPanel>
        <Eyebrow>
          <HeartPulse size={14} />
          Today&apos;s Mission
        </Eyebrow>
        <MissionTitle>{mission.title}</MissionTitle>
        <MissionCopy>{mission.copy}</MissionCopy>
        <ResultRow aria-label="Completion impact">
          <ResultPill>
            {nutritionMission ? <Utensils size={13} /> : <ShieldCheck size={13} />}
            {nutritionMission ? ' Nutrition Today' : ' Progress updates'}
          </ResultPill>
          {gamificationKnown ? (
            <ResultPill><Sparkles size={13} /> {Math.round(progressPercent)}% to next level</ResultPill>
          ) : null}
          <ResultPill><Users size={13} /> Share only when ready</ResultPill>
        </ResultRow>
        <PrimaryAction onClick={handlePrimaryAction}>
          <PrimaryIcon size={17} />
          {nutritionMission ? nutritionMission.label : 'Log Workout'}
          <Arrow size={15} />
        </PrimaryAction>
      </MissionPanel>

      <RailPanel aria-label="Daily context">
        <MicroCard>
          <IconWell $tone="gold"><Sparkles size={18} /></IconWell>
          <MicroText>
            <MicroTitle>{tierName}</MicroTitle>
            <MicroSub>Review the trend before chasing the next badge.</MicroSub>
          </MicroText>
        </MicroCard>
        <MicroCard>
          <IconWell $tone="purple"><Users size={18} /></IconWell>
          <MicroText>
            <MicroTitle>Community Support</MicroTitle>
            <MicroSub>Ask for encouragement without auto-posting your private work.</MicroSub>
          </MicroText>
        </MicroCard>
      </RailPanel>
    </LoopShell>
  );
};

export default DailyHealthLoop;
