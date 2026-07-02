/**
 * COMPONENT: ProgressPulsePanel
 * OWNER: Client Dashboard / Progress (Slice 8 — Progress Intelligence)
 * PURPOSE: The "coach compass" — surfaces the next best training action plus
 *          three live pulse metrics (weekly streak, push/pull balance,
 *          variety) computed from real logged workouts.
 * DATA: useProgressPulse -> GET /api/client/analytics/progress-pulse.
 * STATES: loading -> skeleton; error -> self-hides (renders null, never a
 *         fake zero-progress story); ready -> full panel. An empty history
 *         is NOT an error — the compass then drives the first-workout loop.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  Compass,
  Flame,
  PartyPopper,
  PlayCircle,
  RotateCcw,
  Sparkles,
  Target,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react';
import useProgressPulse, { type PulseAction } from '../../../../hooks/analytics/useProgressPulse';
import {
  BalanceMidline,
  BalancePush,
  BalanceTrack,
  CompassCta,
  CompassKicker,
  CompassMessage,
  CompassTitle,
  CompassZone,
  MetricHint,
  MetricLabel,
  MetricRail,
  MetricTile,
  MetricValue,
  PatternDot,
  PatternDots,
  PulseSkeleton,
  PulseWrap,
  SecondaryChip,
  SecondaryRow,
} from './ProgressPulsePanel.styles';

const ACTION_ICONS: Record<string, LucideIcon> = {
  log_first_workout: PlayCircle,
  return_after_gap: RotateCcw,
  streak_at_risk: Flame,
  balance_pull: ArrowLeftRight,
  balance_push: ArrowLeftRight,
  add_variety: Sparkles,
  volume_drop: TrendingDown,
  celebrate_streak: PartyPopper,
  keep_momentum: Target,
};

const actionIcon = (code: string) => ACTION_ICONS[code] ?? Target;

const balanceLabel: Record<string, string> = {
  balanced: 'Balanced',
  push_heavy: 'Push heavy',
  pull_heavy: 'Pull heavy',
  insufficient_data: 'Not enough data',
};

const ProgressPulsePanel: React.FC = () => {
  const navigate = useNavigate();
  const { status, pulse } = useProgressPulse();

  if (status === 'loading') {
    return <PulseSkeleton data-testid="progress-pulse-skeleton" aria-hidden="true" />;
  }
  if (status !== 'ready' || !pulse) return null;

  const { streak, pushPull, variety, nextBestAction } = pulse;
  const primary: PulseAction = nextBestAction.primary;
  const PrimaryIcon = actionIcon(primary.code);

  const totalPp = pushPull.pushVolume + pushPull.pullVolume;
  const pushPct = totalPp > 0 ? (pushPull.pushVolume / totalPp) * 100 : 50;
  const hasBalance = pushPull.ratio !== null;

  const streakHint = streak.currentWeekPending
    ? `${Math.max(0, streak.weekTarget - streak.daysThisWeek)} more ${streak.weekTarget - streak.daysThisWeek === 1 ? 'day' : 'days'} this week`
    : `best: ${streak.weeklyLongest} ${streak.weeklyLongest === 1 ? 'week' : 'weeks'}`;

  return (
    <PulseWrap role="region" aria-label="Coach compass and progress pulse">
      <CompassZone>
        <CompassKicker>
          <Compass size={13} aria-hidden="true" /> Coach Compass
        </CompassKicker>
        <CompassTitle>
          <PrimaryIcon size={19} aria-hidden="true" />
          {primary.title}
        </CompassTitle>
        <CompassMessage>{primary.message}</CompassMessage>
        {primary.cta && (
          <CompassCta
            type="button"
            onClick={() => navigate(primary.cta!.href)}
            aria-label={primary.cta.label}
          >
            {primary.cta.label}
          </CompassCta>
        )}
        {nextBestAction.secondary.length > 0 && (
          <SecondaryRow aria-label="Also worth a look">
            {nextBestAction.secondary.map((s) => {
              const SecondaryIcon = actionIcon(s.code);
              return (
                <SecondaryChip key={s.code} title={s.message}>
                  <SecondaryIcon size={12} aria-hidden="true" />
                  {s.title}
                </SecondaryChip>
              );
            })}
          </SecondaryRow>
        )}
      </CompassZone>

      <MetricRail>
        <MetricTile
          data-testid="pulse-streak"
          aria-label={`Weekly streak ${streak.weeklyCurrent} ${streak.weeklyCurrent === 1 ? 'week' : 'weeks'}`}
        >
          <MetricLabel>Weekly Streak</MetricLabel>
          <MetricValue $color="var(--accent-gold, #C6A84B)">
            {streak.weeklyCurrent}{streak.weeklyCurrent === 1 ? ' wk' : ' wks'}
          </MetricValue>
          <MetricHint>{streakHint}</MetricHint>
        </MetricTile>

        <MetricTile
          data-testid="pulse-balance"
          aria-label={`Push pull balance: ${balanceLabel[pushPull.label] ?? pushPull.label}`}
        >
          <MetricLabel>Push : Pull</MetricLabel>
          {hasBalance ? (
            <>
              <MetricValue>{pushPull.ratio}:1</MetricValue>
              <BalanceTrack aria-hidden="true">
                <BalancePush $pct={pushPct} />
                <BalanceMidline />
              </BalanceTrack>
              <MetricHint>{balanceLabel[pushPull.label]}</MetricHint>
            </>
          ) : (
            <>
              <MetricValue aria-hidden="true">—</MetricValue>
              <MetricHint>Log push and pull work to unlock</MetricHint>
            </>
          )}
        </MetricTile>

        <MetricTile
          data-testid="pulse-variety"
          aria-label={variety.score === null
            ? 'Variety score unavailable'
            : `Variety score ${variety.score} out of 100`}
        >
          <MetricLabel>Variety</MetricLabel>
          {variety.score === null ? (
            <>
              <MetricValue aria-hidden="true">—</MetricValue>
              <MetricHint>Unlocks after your first logged month</MetricHint>
            </>
          ) : (
            <>
              <MetricValue $color="var(--accent-secondary, #8B5CF6)">{variety.score}</MetricValue>
              <PatternDots aria-hidden="true">
                {Array.from({ length: variety.patternsTotal }, (_, i) => (
                  <PatternDot key={i} $on={i < variety.patternsCovered} />
                ))}
              </PatternDots>
              <MetricHint>
                {variety.patternsCovered}/{variety.patternsTotal} movement patterns
              </MetricHint>
            </>
          )}
        </MetricTile>
      </MetricRail>
    </PulseWrap>
  );
};

export default ProgressPulsePanel;
