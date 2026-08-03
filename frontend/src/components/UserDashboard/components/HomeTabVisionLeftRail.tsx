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
  /** REAL Mon..Sun training days from logged sessions — never derived from the streak count. */
  weekDays: WeekTrainingDay[];
  activeId: string;
  onAction: (target: VisionTarget) => void;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

const WeekTile = styled.div<{ $filled: boolean; $upcoming: boolean }>`
  height: 24px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: ${({ $filled }) => (
    $filled
      ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 24%, transparent)'
      : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent)'
  )};
  /* A day still ahead reads as pending, never as a missed day. */
  border: 1px dashed ${({ $upcoming }) => (
    $upcoming
      ? 'color-mix(in srgb, var(--text-primary, #E0ECF4) 16%, transparent)'
      : 'transparent'
  )};
  color: var(--accent-gold, #C6A84B);
`;

const WeekDayLabel = styled.span`
  color: var(--text-muted);
  font-size: 0.62rem;
`;

const HomeTabVisionLeftRail: React.FC<HomeTabVisionLeftRailProps> = ({
  logoSrc,
  level,
  points,
  pointsToNext,
  progressPercent,
  streakDays,
  weekDays,
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

      <Panel $tone="gold">
        <Eyebrow $tone="gold">
          <Flame size={14} aria-hidden="true" />
          Creator Streak
        </Eyebrow>
        <StreakValueRow>
          <StreakNumber>{streakDays}</StreakNumber>
          <StreakUnit>days</StreakUnit>
        </StreakValueRow>
        <WeekGrid role="list" aria-label="This week's logged workouts">
          {weekDays.map((day, index) => (
            <WeekDay
              key={DAY_NAMES[index]}
              role="listitem"
              aria-label={`${DAY_NAMES[index]}: ${
                day.trained
                  ? 'workout logged'
                  : day.isUpcoming
                    ? 'not yet'
                    : 'no workout logged'
              }`}
            >
              <WeekTile aria-hidden="true" $filled={day.trained} $upcoming={day.isUpcoming}>
                {day.trained ? <Sparkles size={12} /> : null}
              </WeekTile>
              <WeekDayLabel aria-hidden="true">{day.label}</WeekDayLabel>
            </WeekDay>
          ))}
        </WeekGrid>
      </Panel>

    </LeftRail>
  );
};

export default HomeTabVisionLeftRail;
