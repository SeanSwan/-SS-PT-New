/**
 * ============================================================================
 * FILE: HomeTabNextBestAction.tsx
 * PURPOSE: The Next Best Action panel for Home's right rail (workstream O3,
 *          extracted from HomeTabVisionRightRail for the rule-4 cap) — now
 *          with STREAK RESCUE: when a live streak has no logged session today
 *          and the evening window opens (assessStreakRisk), the panel
 *          escalates to an urgent gold state so the streak survives.
 * DATA TRUTH: urgency derives from real logged sessions + the real streak —
 *          never fabricated pressure.
 * ============================================================================
 */
import React from 'react';
import styled, { css } from 'styled-components';
import { Flame } from 'lucide-react';
import { Eyebrow, Panel } from './HomeTabVision.styles';
import { Chip } from './HomeTabVisionCards.styles';
import {
  FullWidthAction,
  RailHeader,
  SoftParagraph,
} from './HomeTabVisionRightRail.styles';

const UrgentPanel = styled(Panel)<{ $urgent?: boolean }>`
  ${({ $urgent }) => $urgent && css`
    border-color: color-mix(in srgb, var(--accent-gold, #C6A84B) 60%, transparent);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, var(--accent-gold, #C6A84B) 16%, transparent),
      0 0 28px color-mix(in srgb, var(--accent-gold, #C6A84B) 22%, transparent);
  `}
`;

interface HomeTabNextBestActionProps {
  /** True when the streak is alive, today is unlogged, and evening started. */
  streakAtRisk: boolean;
  streakDays: number;
  onLogWorkout: () => void;
}

const HomeTabNextBestAction: React.FC<HomeTabNextBestActionProps> = ({
  streakAtRisk,
  streakDays,
  onLogWorkout,
}) => (
  <UrgentPanel $urgent={streakAtRisk} $tone={streakAtRisk ? 'gold' : undefined}>
    <RailHeader>
      <Eyebrow $tone={streakAtRisk ? 'gold' : undefined}>Next Best Action</Eyebrow>
      {streakAtRisk && (
        <Chip $tone="gold">
          <Flame size={12} aria-hidden="true" />
          Streak at risk
        </Chip>
      )}
    </RailHeader>
    <SoftParagraph>
      {streakAtRisk
        ? `Your ${streakDays}-day streak ends tonight without a logged workout — keep it alive.`
        : "Log today's training — workouts become visible progress proof."}
    </SoftParagraph>
    <FullWidthAction type="button" $variant="accent" onClick={onLogWorkout}>
      {streakAtRisk ? `Save my ${streakDays}-day streak` : 'Log a Workout'}
    </FullWidthAction>
  </UrgentPanel>
);

export default HomeTabNextBestAction;
