/**
 * FILE: HomeTabVisionLeftRail.tsx
 * PURPOSE: Claude Design-inspired desktop left rail for /user-dashboard Home.
 */

import React from 'react';
import { Crown, Flame, Plus, Sparkles } from 'lucide-react';
import { LEFT_NAV_ITEMS, QUICK_ACTIONS, type VisionTarget } from './HomeTabVision.data';
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
  GlassButton,
  NavButton,
} from './HomeTabVisionCards.styles';

interface HomeTabVisionLeftRailProps {
  logoSrc: string;
  level: number;
  points: number;
  pointsToNext: number;
  progressPercent: number;
  streakDays: number;
  activeId: string;
  onAction: (target: VisionTarget) => void;
}

const week = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const HomeTabVisionLeftRail: React.FC<HomeTabVisionLeftRailProps> = ({
  logoSrc,
  level,
  points,
  pointsToNext,
  progressPercent,
  streakDays,
  activeId,
  onAction,
}) => {
  const filledDays = week.map((_, index) => index < Math.min(streakDays || 0, 7));

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
        <div style={{ marginTop: '0.8rem' }}>
          <GlassButton type="button" $variant="accent" onClick={() => onAction('feed')} style={{ width: '100%' }}>
            <Plus size={16} aria-hidden="true" />
            Create Post
          </GlassButton>
        </div>
      </Panel>

      <Panel>
        <ButtonRow style={{ justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <Eyebrow>
            <Crown size={14} aria-hidden="true" />
            Level {level}
          </Eyebrow>
          <Chip $tone="cyan">{progressPercent}%</Chip>
        </ButtonRow>
        <strong style={{ display: 'block', fontSize: '1.65rem', lineHeight: 1, marginBottom: '0.75rem' }}>
          {points.toLocaleString()} <span style={{ color: 'var(--vision-soft)', fontSize: '0.9rem' }}>XP</span>
        </strong>
        <Bar aria-label="XP progress">
          <Fill $pct={progressPercent} />
        </Bar>
        <div style={{ color: 'var(--vision-soft)', fontSize: '0.75rem', marginTop: '0.55rem' }}>
          {pointsToNext.toLocaleString()} XP to next level
        </div>
      </Panel>

      <Panel $tone="gold">
        <Eyebrow $tone="gold">
          <Flame size={14} aria-hidden="true" />
          Creator Streak
        </Eyebrow>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem', marginTop: '0.7rem' }}>
          <strong style={{ fontSize: '2.1rem', lineHeight: 1 }}>{streakDays}</strong>
          <span style={{ color: 'var(--vision-soft)', fontWeight: 800 }}>days</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.35rem', marginTop: '0.9rem' }}>
          {week.map((day, index) => (
            <div key={`${day}-${index}`} style={{ textAlign: 'center' }}>
              <div
                aria-hidden="true"
                style={{
                  height: 24,
                  borderRadius: 8,
                  display: 'grid',
                  placeItems: 'center',
                  background: filledDays[index]
                    ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 24%, transparent)'
                    : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent)',
                  color: 'var(--accent-gold, #C6A84B)',
                }}
              >
                {filledDays[index] ? <Sparkles size={12} /> : null}
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>{day}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <Eyebrow>Top Categories</Eyebrow>
        <ButtonRow style={{ marginTop: '0.8rem' }}>
          {QUICK_ACTIONS.map(({ id, Icon, target, label }) => (
            <GlassButton key={id} type="button" $variant="ghost" onClick={() => onAction(target)} aria-label={label}>
              <Icon size={17} aria-hidden="true" />
            </GlassButton>
          ))}
        </ButtonRow>
      </Panel>
    </LeftRail>
  );
};

export default HomeTabVisionLeftRail;
