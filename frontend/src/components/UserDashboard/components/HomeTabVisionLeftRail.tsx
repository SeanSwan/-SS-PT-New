/**
 * FILE: HomeTabVisionLeftRail.tsx
 * PURPOSE: Claude Design-inspired desktop left rail for /user-dashboard Home.
 */

import React from 'react';
import { Crown, Flame, Sparkles } from 'lucide-react';
import styled from 'styled-components';
import { LEFT_NAV_ITEMS, type VisionTarget } from './HomeTabVision.data';
import {
  BrandBlock,
  BrandMark,
  Eyebrow,
  LeftRail,
  Panel,
} from './HomeTabVision.styles';
import {
  Bar,
  ButtonRow,
  Chip,
  Fill,
  NavButton,
} from './HomeTabVisionCards.styles';
import type { WeekTrainingDay } from './HomeTabProofViewModel';

interface HomeTabVisionLeftRailProps {
  logoSrc: string;
  level: number;
  points: number;
  pointsToNext: number;
  progressPercent: number;
  streakDays: number;
  /** REAL trailing-7-day training days from logged sessions — never derived from the streak count. */
  weekDays: WeekTrainingDay[];
  /** True when the gamification queries failed. Zeros are then NOT the member's record. */
  statsUnavailable?: boolean;
  /** True when the workout-sessions fetch failed. Untrained tiles are then UNKNOWN, not "missed". */
  sessionsUnavailable?: boolean;
  onRetryStats?: () => void;
  activeId: string;
  onAction: (target: VisionTarget) => void;
}


const LevelHeader = styled(ButtonRow)`
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

const XpTotal = styled.strong`
  display: block;
  font-size: 1.65rem;
  line-height: 1;
  margin-bottom: 0.75rem;
`;

const XpUnit = styled.span`
  color: var(--vision-soft);
  font-size: 0.9rem;
`;

const NextLevelText = styled.div`
  color: var(--vision-soft);
  font-size: 0.75rem;
  margin-top: 0.55rem;
`;

const StreakValueRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
  margin-top: 0.7rem;
`;

const StreakNumber = styled.strong`
  font-size: 2.1rem;
  line-height: 1;
`;

const StreakUnit = styled.span`
  color: var(--vision-soft);
  font-weight: 800;
`;

const WeekGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.35rem;
  margin-top: 0.9rem;
`;

const WeekDay = styled.div`
  text-align: center;
`;

const WeekTile = styled.div<{ $filled: boolean; $unknown: boolean; $today: boolean }>`
  height: 24px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: ${({ $filled }) => (
    $filled
      ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 24%, transparent)'
      : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent)'
  )};
  /* Unknown (fetch failed) reads as dashed-indeterminate, never as a miss.
     Today gets a solid ring so "not yet" is distinguishable from "missed". */
  border: 1px ${({ $unknown }) => ($unknown ? 'dashed' : 'solid')} ${({ $unknown, $today }) => {
    if ($unknown) return 'color-mix(in srgb, var(--text-primary, #E0ECF4) 22%, transparent)';
    if ($today) return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 55%, transparent)';
    return 'transparent';
  }};
  color: var(--accent-gold, #C6A84B);
`;

const WeekDayLabel = styled.span`
  color: var(--text-muted);
  font-size: 0.62rem;
`;

const UnavailableText = styled.p`
  color: var(--vision-soft, #9FB6C9);
  font-size: 0.78rem;
  line-height: 1.45;
  margin: 0.4rem 0 0.75rem;
`;

const RetryButton = styled.button`
  min-height: 44px;
  width: 100%;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--glow-accent, #8B5CF6);
    outline-offset: 2px;
  }
`;

const HomeTabVisionLeftRail: React.FC<HomeTabVisionLeftRailProps> = ({
  logoSrc,
  level,
  points,
  pointsToNext,
  progressPercent,
  streakDays,
  weekDays,
  statsUnavailable = false,
  sessionsUnavailable = false,
  onRetryStats,
  activeId,
  onAction,
}) => {

  return (
    <LeftRail aria-label="Creator dashboard navigation">
      <BrandBlock>
        <BrandMark>
          <img src={logoSrc} alt="" aria-hidden="true" />
        </BrandMark>
        <div>
          <strong>SwanStudios</strong>
          <Eyebrow>Crystalline Observatory</Eyebrow>
        </div>
      </BrandBlock>

      <Panel>
        {LEFT_NAV_ITEMS.map(({ id, label, Icon, target }) => (
          <NavButton
            key={id}
            type="button"
            $active={activeId === id}
            onClick={() => onAction(target)}
            aria-current={activeId === id ? 'page' : undefined}
          >
            <Icon size={19} aria-hidden="true" />
            {label}
          </NavButton>
        ))}
      </Panel>

      {/* An outage must read as an outage. Rendering the `?? 0` fallback here
          told every member they were Level 1 with 0 XP and no streak. */}
      {statsUnavailable ? (
        <Panel>
          <Eyebrow>
            <Crown size={14} aria-hidden="true" />
            Progress
          </Eyebrow>
          <UnavailableText role="status">
            We couldn&apos;t load your level and streak just now. Your logged
            workouts are safe.
          </UnavailableText>
          {onRetryStats ? (
            <RetryButton type="button" onClick={onRetryStats}>
              Retry
            </RetryButton>
          ) : null}
        </Panel>
      ) : (
        <Panel>
          <LevelHeader>
            <Eyebrow>
              <Crown size={14} aria-hidden="true" />
              Level {level}
            </Eyebrow>
            <Chip $tone="cyan">{progressPercent}%</Chip>
          </LevelHeader>
          <XpTotal>
            {points.toLocaleString()} <XpUnit>XP</XpUnit>
          </XpTotal>
          <Bar aria-label="XP progress">
            <Fill $pct={progressPercent} />
          </Bar>
          <NextLevelText>
            {pointsToNext.toLocaleString()} XP to next level
          </NextLevelText>
        </Panel>
      )}

      <Panel $tone="gold">
        <Eyebrow $tone="gold">
          <Flame size={14} aria-hidden="true" />
          Creator Streak
        </Eyebrow>
        {statsUnavailable ? null : (
          <StreakValueRow>
            <StreakNumber>{streakDays}</StreakNumber>
            <StreakUnit>days</StreakUnit>
          </StreakValueRow>
        )}
        {/* An untrained tile is only a MISSED day if we actually loaded the
            sessions. During a fetch failure it is unknown, and saying "no
            workout logged" seven times is the same lie this grid replaced. */}
        <WeekGrid
          role="list"
          aria-label={sessionsUnavailable
            ? 'Last 7 days — training history unavailable'
            : "Last 7 days' logged workouts"}
        >
          {weekDays.map((day, index) => (
            <WeekDay
              key={`${day.dayName}-${index}`}
              role="listitem"
              aria-label={`${day.dayName}${day.isToday ? ' (today)' : ''}: ${
                sessionsUnavailable
                  ? 'unavailable'
                  : day.trained
                    ? 'workout logged'
                    : 'no workout logged'
              }`}
            >
              <WeekTile
                aria-hidden="true"
                $filled={!sessionsUnavailable && day.trained}
                $unknown={sessionsUnavailable}
                $today={day.isToday}
              >
                {!sessionsUnavailable && day.trained ? <Sparkles size={12} /> : null}
              </WeekTile>
              <WeekDayLabel aria-hidden="true">{day.label}</WeekDayLabel>
            </WeekDay>
          ))}
        </WeekGrid>
        {sessionsUnavailable ? (
          <UnavailableText>Training history unavailable right now.</UnavailableText>
        ) : null}
      </Panel>

    </LeftRail>
  );
};

export default HomeTabVisionLeftRail;
