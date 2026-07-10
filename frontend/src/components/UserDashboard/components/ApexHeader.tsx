/**
 * FILE: ApexHeader.tsx
 * PURPOSE: Apex Home header — the single orientation beat for /user-dashboard Home.
 *
 * BLUEPRINT
 * ─────────
 * WHY: Apex redesign Phase 1b. The Home left rail (HomeTabVisionLeftRail) was one
 *      of three disagreeing navs AND the only carrier of Level / XP / streak on
 *      desktop. This header absorbs that data so the rail can be removed without
 *      stranding it; the top tab bar becomes the sole Home nav.
 *
 * DATA TRUTH (CLAUDE.md Product Core Loop): every number here comes from real
 *      gamification data (useGamificationData) via HomeTab. Nothing is mocked.
 *      The mockup's workouts/volume rings are intentionally NOT built — they need
 *      weekly workout aggregates that do not exist yet. Deferred, not faked.
 *
 * A11Y: each ring is role="progressbar" with aria-valuenow/min/max/valuetext and a
 *      visible text value + label, so status is never conveyed by color alone
 *      (WCAG 1.4.1). Focus rings use :focus-visible (WCAG 2.4.13).
 *
 * MOTION: ring/XP fills transition only under prefers-reduced-motion: no-preference.
 *
 * STYLES: extracted to ApexHeader.styles.ts (rule 4, 300-line cap).
 */
import React from 'react';
import { Crown, Dumbbell, Flame, type LucideIcon } from 'lucide-react';
import {
  Eyebrow,
  Fill,
  Header,
  Intro,
  LevelHex,
  LevelRow,
  LogButton,
  RingCenter,
  RingLabel,
  RingWrap,
  Rings,
  Subtitle,
  Title,
  Track,
  XpBlock,
  XpFill,
  XpMeta,
  XpTrack,
} from './ApexHeader.styles';

interface ApexHeaderProps {
  /** Real: canonical level from gamification. */
  level: number;
  /** Real: tier display name (e.g. "Crystalline Ascendant"). */
  tierName: string;
  /** Real: lifetime XP. */
  points: number;
  /** Real: XP remaining to the next level. */
  pointsToNext: number;
  /** Real: 0-100 progress toward next level. */
  progressPercent: number;
  /** Real: consecutive-day streak. */
  streakDays: number;
  /** Routes to the personal log-workout surface. */
  onLogWorkout: () => void;
}

const RING_RADIUS = 34;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Next meaningful streak milestone — derived from the real streak, never invented. */
const streakMilestone = (days: number): number => {
  if (days < 7) return 7;
  if (days < 30) return 30;
  if (days < 100) return 100;
  return Math.ceil((days + 1) / 100) * 100;
};

interface RingProps {
  label: string;
  value: number;
  max: number;
  display: string;
  unit: string;
  tone: 'gold' | 'cyan';
  Icon: LucideIcon;
}

const AscensionRing: React.FC<RingProps> = ({ label, value, max, display, unit, tone, Icon }) => {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const offset = RING_CIRCUMFERENCE - (pct / 100) * RING_CIRCUMFERENCE;

  return (
    <RingWrap
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuetext={`${display} ${unit}, ${Math.round(pct)}% toward ${max}`}
    >
      <svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">
        <Track cx="40" cy="40" r={RING_RADIUS} />
        <Fill
          cx="40"
          cy="40"
          r={RING_RADIUS}
          $tone={tone}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      {/* Visible value + label: status is never color-only (WCAG 1.4.1). */}
      <RingCenter aria-hidden="true">
        <strong>{display}</strong>
        <span>{unit}</span>
      </RingCenter>
      <RingLabel aria-hidden="true">
        <Icon size={13} />
        {label}
      </RingLabel>
    </RingWrap>
  );
};

const ApexHeader: React.FC<ApexHeaderProps> = ({
  level,
  tierName,
  points,
  pointsToNext,
  progressPercent,
  streakDays,
  onLogWorkout,
}) => (
  <Header aria-label="Your ascension status">
    <Intro>
      <Eyebrow>Today</Eyebrow>
      <Title>Ready to train?</Title>
      <Subtitle>
        {pointsToNext > 0
          ? `${pointsToNext.toLocaleString()} XP to Level ${level + 1}`
          : `Level ${level} — next tier within reach`}
      </Subtitle>

      <LogButton type="button" onClick={onLogWorkout}>
        <Dumbbell size={18} aria-hidden="true" />
        Log today&apos;s workout
      </LogButton>

      <LevelRow>
        <LevelHex aria-hidden="true">Lv {level}</LevelHex>
        <XpBlock>
          <XpMeta>
            <span>
              <strong>{tierName}</strong> · Level {level}
            </span>
            <span>{points.toLocaleString()} XP</span>
          </XpMeta>
          <XpTrack
            role="progressbar"
            aria-label="XP toward next level"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${progressPercent}% toward level ${level + 1}`}
          >
            <XpFill $pct={progressPercent} />
          </XpTrack>
        </XpBlock>
      </LevelRow>
    </Intro>

    <Rings>
      <AscensionRing
        label="Streak"
        value={streakDays}
        max={streakMilestone(streakDays)}
        display={`${streakDays}`}
        unit="days"
        tone="gold"
        Icon={Flame}
      />
      <AscensionRing
        label="Level progress"
        value={progressPercent}
        max={100}
        display={`${progressPercent}%`}
        unit={`to L${level + 1}`}
        tone="cyan"
        Icon={Crown}
      />
    </Rings>
  </Header>
);

export default React.memo(ApexHeader);
