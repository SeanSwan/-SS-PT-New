/**
 * FILE: HomeTabVisionRightRail.tsx
 * PURPOSE: Claude Design-inspired right rail widgets for /user-dashboard Home.
 */

import React from 'react';
import {
  ArrowRight,
  Crown,
  Dumbbell,
  Flame,
  Heart,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { STORY_ITEMS, TRENDING_TAGS, type VisionTarget } from './HomeTabVision.data';
import { Eyebrow, Panel, RightRail } from './HomeTabVision.styles';
import {
  Bar,
  ButtonRow,
  Chip,
  Fill,
  GlassButton,
  StoryBubble,
  StoryItem,
  StoryStrip,
} from './HomeTabVisionCards.styles';
import { CrystalScene, MiniScene, Sparkline } from './HomeTabVisionScenes';

interface HomeTabVisionRightRailProps {
  logoSrc: string;
  displayName: string;
  streakDays: number;
  progressPercent: number;
  onAction: (target: VisionTarget) => void;
}

const HomeTabVisionRightRail: React.FC<HomeTabVisionRightRailProps> = ({
  logoSrc,
  displayName,
  streakDays,
  progressPercent,
  onAction,
}) => {
  const liveActivityItems: { user: string; action: string; Icon: React.ElementType }[] = [
    { user: 'IronMuse', action: 'completed a challenge', Icon: Trophy },
    { user: 'PixelPainter', action: 'earned a badge', Icon: Sparkles },
    { user: 'BeatCraft', action: 'posted a reel', Icon: Users },
    { user: displayName, action: 'kept momentum', Icon: Heart },
  ];

  return (
  <RightRail aria-label="Creator observatory widgets">
    <Panel>
      <ButtonRow style={{ justifyContent: 'space-between', marginBottom: '0.8rem' }}>
        <Eyebrow>Stories from the Garden</Eyebrow>
        <button type="button" onClick={() => onAction('feed')} style={linkButtonStyle}>View all</button>
      </ButtonRow>
      <StoryStrip>
        {STORY_ITEMS.map((story) => (
          <StoryItem key={story.label} type="button" onClick={() => onAction(story.isCreate ? 'feed' : 'community')}>
            <StoryBubble>
              <div>
                {story.isCreate ? (
                  <img src={logoSrc} alt="" aria-hidden="true" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <MiniScene tone={story.tone} />
                )}
              </div>
            </StoryBubble>
            <span>{story.label}</span>
          </StoryItem>
        ))}
      </StoryStrip>
    </Panel>

    <Panel>
      <Eyebrow>Live Activity</Eyebrow>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem', marginTop: '0.9rem' }}>
        {liveActivityItems.map(({ user, action, Icon }) => (
          <div key={`${user}-${action}`} style={{ display: 'flex', gap: '0.55rem', minWidth: 0 }}>
            <Chip>
              <Icon size={13} aria-hidden="true" />
            </Chip>
            <div style={{ minWidth: 0, fontSize: '0.76rem', color: 'var(--vision-soft)' }}>
              <strong style={{ color: 'var(--text-primary, #E0ECF4)' }}>{user}</strong> {action}
              <div style={{ color: 'var(--text-muted, rgba(224,236,244,0.55))', fontSize: '0.68rem' }}>just now</div>
            </div>
          </div>
        ))}
      </div>
    </Panel>

    <Panel $tone="gold">
      <ButtonRow style={{ justifyContent: 'space-between' }}>
        <Eyebrow $tone="gold">Active Challenge</Eyebrow>
        <span style={{ color: 'var(--accent-gold, #C6A84B)', fontSize: '0.75rem', fontWeight: 900 }}>5D : 12H</span>
      </ButtonRow>
      <ButtonRow style={{ alignItems: 'stretch', marginTop: '0.9rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ButtonRow>
            <Chip $tone="gold">
              <Dumbbell size={14} aria-hidden="true" />
            </Chip>
            <strong style={{ fontSize: '1.05rem' }}>Strength Surge</strong>
          </ButtonRow>
          <p style={{ margin: '0.6rem 0 0.8rem', color: 'var(--vision-soft)', lineHeight: 1.45 }}>
            7 intense workouts. Show up. Level up.
          </p>
          <Bar>
            <Fill $pct={57} $gold />
          </Bar>
        </div>
        <div style={{ display: 'grid', placeItems: 'center', width: 86 }}>
          <Chip $tone="gold">
            <Crown size={30} aria-hidden="true" />
          </Chip>
        </div>
      </ButtonRow>
      <GlassButton type="button" $variant="accent" onClick={() => onAction('progress')} style={{ width: '100%', marginTop: '0.9rem' }}>
        Join Challenge
      </GlassButton>
    </Panel>

    <Panel>
      <ButtonRow style={{ justifyContent: 'space-between', marginBottom: '0.8rem' }}>
        <Eyebrow>Badges</Eyebrow>
        <Eyebrow>Leaderboard</Eyebrow>
      </ButtonRow>
      <ButtonRow>
        {[Sparkles, Trophy, Flame].map((Icon, index) => (
          <Chip key={index} $tone={index === 1 ? 'gold' : index === 2 ? 'violet' : 'cyan'}>
            <Icon size={18} aria-hidden="true" />
          </Chip>
        ))}
      </ButtonRow>
      <div style={{ marginTop: '0.9rem', display: 'grid', gap: '0.45rem' }}>
        {['PhoenixFlex', displayName, 'IronMuse'].map((name, index) => (
          <div key={name} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: '0.55rem', alignItems: 'center' }}>
            <span style={{ color: index === 0 ? 'var(--accent-gold, #C6A84B)' : 'var(--vision-soft)', fontWeight: 900 }}>{index + 1}</span>
            <strong style={{ minWidth: 0 }}>{name}</strong>
            <span style={{ color: 'var(--vision-soft)', fontSize: '0.72rem' }}>{index === 1 ? '18.4K' : index === 0 ? '24.9K' : '16.2K'} XP</span>
          </div>
        ))}
      </div>
    </Panel>

    <Panel>
      <Eyebrow>Trending</Eyebrow>
      <div style={{ display: 'grid', gap: '0.6rem', marginTop: '0.8rem' }}>
        {TRENDING_TAGS.map((tag, index) => (
          <div key={tag} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.8rem', alignItems: 'center' }}>
            <strong style={{ color: 'var(--accent-primary, #60C0F0)', fontSize: '0.82rem' }}>#{tag}</strong>
            <Sparkline seed={index + 1} />
          </div>
        ))}
      </div>
    </Panel>

    <Panel>
      <ButtonRow style={{ justifyContent: 'space-between', marginBottom: '0.8rem' }}>
        <Eyebrow>Weekly Momentum</Eyebrow>
        <Chip>{progressPercent}%</Chip>
      </ButtonRow>
      <div style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 92, height: 92 }}>
          <svg width="92" height="92" viewBox="0 0 92 92" aria-hidden="true">
            <circle cx="46" cy="46" r="36" stroke="color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent)" strokeWidth="7" fill="none" />
            <circle cx="46" cy="46" r="36" stroke="var(--accent-primary, #60C0F0)" strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray="226" strokeDashoffset={226 * (1 - progressPercent / 100)} transform="rotate(-90 46 46)" />
          </svg>
          <strong style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{progressPercent}%</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 4, height: 76 }}>
          {[38, 52, 60, 70, 78, 86, 100].map((height, index) => (
            <div key={height} style={{ width: 18, height: `${height}%`, borderRadius: 5, background: index === 6 ? 'var(--accent-gold, #C6A84B)' : 'var(--accent-primary, #60C0F0)' }} />
          ))}
        </div>
      </div>
    </Panel>

    <Panel>
      <Eyebrow>Transformation</Eyebrow>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 34px 1fr', gap: '0.55rem', alignItems: 'center', marginTop: '0.8rem' }}>
        <div style={{ borderRadius: 14, overflow: 'hidden', aspectRatio: '4 / 3' }}><CrystalScene tone="violet" /></div>
        <Chip><ArrowRight size={16} aria-hidden="true" /></Chip>
        <div style={{ borderRadius: 14, overflow: 'hidden', aspectRatio: '4 / 3' }}><CrystalScene tone="cyan" /></div>
      </div>
    </Panel>

    <Panel>
      <Eyebrow>Next Best Action</Eyebrow>
      <p style={{ color: 'var(--vision-soft)', margin: '0.55rem 0 0.9rem', lineHeight: 1.45 }}>
        Share progress and turn today into visible momentum.
      </p>
      <ButtonRow>
        <GlassButton type="button" $variant="accent" onClick={() => onAction('reels')}>Create Reel</GlassButton>
        <GlassButton type="button" $variant="primary" onClick={() => onAction('feed')}>Share Update</GlassButton>
      </ButtonRow>
    </Panel>
  </RightRail>
  );
};

const linkButtonStyle: React.CSSProperties = {
  border: 0,
  background: 'transparent',
  color: 'var(--accent-primary, #60C0F0)',
  minHeight: 44,
  padding: '0 0.35rem',
  display: 'inline-flex',
  alignItems: 'center',
  fontWeight: 800,
  cursor: 'pointer',
};

export default HomeTabVisionRightRail;
