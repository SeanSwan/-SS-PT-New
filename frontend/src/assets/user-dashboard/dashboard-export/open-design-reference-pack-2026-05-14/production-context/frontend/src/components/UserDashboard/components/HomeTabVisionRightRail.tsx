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
import { compactNumber, type VisionTarget } from './HomeTabVision.data';
import type {
  HomeBadgeItem,
  HomeChallengeSummary,
  HomeLeaderboardRow,
  HomeLiveActivityItem,
  HomeStoryItem,
  TrendingTagSummary,
} from './HomeTabViewModel';
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
import {
  LeaderboardList,
  LeaderboardName,
  LeaderboardPoints,
  LeaderboardRank,
  LeaderboardRow,
} from './HomeTabVisionRightRail.styles';
import { CrystalScene, MiniScene, Sparkline } from './HomeTabVisionScenes';

interface HomeTabVisionRightRailProps {
  logoSrc: string;
  progressPercent: number;
  stories: HomeStoryItem[];
  liveActivityItems: HomeLiveActivityItem[];
  liveActivityConnected: boolean;
  activeChallenge: HomeChallengeSummary | null;
  challengeLoading: boolean;
  badges: HomeBadgeItem[];
  leaderboardRows: HomeLeaderboardRow[];
  trendingTags: TrendingTagSummary[];
  trendingLoading: boolean;
  onAction: (target: VisionTarget) => void;
}

function iconForActivity(item: HomeLiveActivityItem): React.ElementType {
  const text = item.action.toLowerCase();
  if (text.includes('challenge')) return Trophy;
  if (text.includes('badge')) return Sparkles;
  if (text.includes('workout')) return Dumbbell;
  if (text.includes('reel')) return Users;
  return Heart;
}

const HomeTabVisionRightRail: React.FC<HomeTabVisionRightRailProps> = ({
  logoSrc,
  progressPercent,
  stories,
  liveActivityItems,
  liveActivityConnected,
  activeChallenge,
  challengeLoading,
  badges,
  leaderboardRows,
  trendingTags,
  trendingLoading,
  onAction,
}) => {
  const challengeButtonTarget: VisionTarget = activeChallenge?.joined ? 'progress' : 'challenges';
  const challengeButtonLabel = activeChallenge
    ? activeChallenge.joined ? 'View Progress' : 'Open Challenges'
    : 'Explore Challenges';

  return (
  <RightRail aria-label="Creator observatory widgets">
    <Panel>
      <ButtonRow style={{ justifyContent: 'space-between', marginBottom: '0.8rem' }}>
        <Eyebrow>Stories from the Garden</Eyebrow>
        <button type="button" onClick={() => onAction('feed')} style={linkButtonStyle}>View all</button>
      </ButtonRow>
      <StoryStrip>
        {stories.map((story) => (
          <StoryItem key={story.id} type="button" onClick={() => onAction(story.isCreate ? 'feed' : 'community')}>
            <StoryBubble>
              <div>
                {story.isCreate ? (
                  <img src={logoSrc} alt="" aria-hidden="true" style={imageFillStyle} />
                ) : story.mediaUrl ? (
                  <img src={story.mediaUrl} alt="" aria-hidden="true" style={imageFillStyle} />
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
      <ButtonRow style={{ justifyContent: 'space-between' }}>
        <Eyebrow>Live Activity</Eyebrow>
        <Chip $tone={liveActivityConnected ? 'cyan' : 'violet'}>
          {liveActivityConnected ? 'Live' : 'Recent'}
        </Chip>
      </ButtonRow>
      {liveActivityItems.length ? (
        <div style={activityGridStyle}>
          {liveActivityItems.map((item) => {
            const Icon = iconForActivity(item);
            return (
              <div key={item.id} style={activityItemStyle}>
                <Chip>
                  <Icon size={13} aria-hidden="true" />
                </Chip>
                <div style={activityCopyStyle}>
                  <strong style={{ color: 'var(--text-primary, #E0ECF4)' }}>{item.user}</strong> {item.action}
                  <div style={mutedTinyStyle}>{item.time}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p style={emptyStateStyle}>No community activity has landed yet.</p>
      )}
    </Panel>

    <Panel $tone="gold">
      <ButtonRow style={{ justifyContent: 'space-between' }}>
        <Eyebrow $tone="gold">Active Challenge</Eyebrow>
        <span style={goldMetaStyle}>
          {activeChallenge ? `${activeChallenge.daysLeft}D left` : challengeLoading ? 'Syncing' : 'Ready'}
        </span>
      </ButtonRow>
      {activeChallenge ? (
        <ButtonRow style={{ alignItems: 'stretch', marginTop: '0.9rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <ButtonRow>
              <Chip $tone="gold">
                <Dumbbell size={14} aria-hidden="true" />
              </Chip>
              <strong style={{ fontSize: '1.05rem' }}>{activeChallenge.title}</strong>
            </ButtonRow>
            <p style={softParagraphStyle}>
              {compactNumber(activeChallenge.participants)} creators are in. Reward: {activeChallenge.reward}.
            </p>
            <Bar>
              <Fill $pct={activeChallenge.progress} $gold />
            </Bar>
          </div>
          <div style={challengeCrownStyle}>
            <Chip $tone="gold">
              <Crown size={30} aria-hidden="true" />
            </Chip>
          </div>
        </ButtonRow>
      ) : (
        <p style={emptyStateStyle}>
          {challengeLoading ? 'Checking the challenge board.' : 'No real active challenge is live yet.'}
        </p>
      )}
      <GlassButton type="button" $variant="accent" onClick={() => onAction(challengeButtonTarget)} style={{ width: '100%', marginTop: '0.9rem' }}>
        {challengeButtonLabel}
      </GlassButton>
    </Panel>

    <Panel>
      <ButtonRow style={{ justifyContent: 'space-between', marginBottom: '0.8rem' }}>
        <Eyebrow>Badges</Eyebrow>
        <Eyebrow>Leaderboard</Eyebrow>
      </ButtonRow>
      {badges.length ? (
        <ButtonRow>
          {badges.map((badge, index) => (
            <Chip key={badge.id} $tone={index === 1 ? 'gold' : index === 2 ? 'violet' : 'cyan'} title={badge.name}>
              {badge.imageUrl ? <img src={badge.imageUrl} alt="" aria-hidden="true" style={badgeImageStyle} /> : badge.icon}
            </Chip>
          ))}
        </ButtonRow>
      ) : (
        <p style={emptyStateStyle}>Earn a badge to fill this showcase.</p>
      )}
      <LeaderboardList>
        {leaderboardRows.map((row, index) => (
          <LeaderboardRow key={row.id}>
            <LeaderboardRank $gold={index === 0}>{index + 1}</LeaderboardRank>
            <LeaderboardName>{row.name}</LeaderboardName>
            <LeaderboardPoints>{compactNumber(row.points)} XP</LeaderboardPoints>
          </LeaderboardRow>
        ))}
      </LeaderboardList>
    </Panel>

    <Panel>
      <Eyebrow>Trending</Eyebrow>
      {trendingTags.length ? (
        <div style={trendingGridStyle}>
          {trendingTags.map((tag, index) => (
            <div key={tag.name} style={trendingRowStyle}>
              <div>
                <strong style={tagNameStyle}>#{tag.name}</strong>
                <div style={mutedTinyStyle}>{tag.count ? `${compactNumber(tag.count)} posts` : 'new'}</div>
              </div>
              <Sparkline seed={index + 1} />
            </div>
          ))}
        </div>
      ) : (
        <p style={emptyStateStyle}>{trendingLoading ? 'Loading trend signals.' : 'No trending tags yet.'}</p>
      )}
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
      <p style={softParagraphStyle}>Share progress and turn today into visible momentum.</p>
      <ButtonRow>
        <GlassButton type="button" $variant="accent" onClick={() => onAction('reels')}>Create Reel</GlassButton>
        <GlassButton type="button" $variant="primary" onClick={() => onAction('feed')}>Share Update</GlassButton>
      </ButtonRow>
    </Panel>
  </RightRail>
  );
};

const imageFillStyle: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' };
const badgeImageStyle: React.CSSProperties = { width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' };
const activityGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem', marginTop: '0.9rem' };
const activityItemStyle: React.CSSProperties = { display: 'flex', gap: '0.55rem', minWidth: 0 };
const activityCopyStyle: React.CSSProperties = { minWidth: 0, fontSize: '0.76rem', color: 'var(--vision-soft)' };
const emptyStateStyle: React.CSSProperties = { color: 'var(--vision-soft)', margin: '0.8rem 0 0', lineHeight: 1.45 };
const softParagraphStyle: React.CSSProperties = { margin: '0.6rem 0 0.8rem', color: 'var(--vision-soft)', lineHeight: 1.45 };
const mutedTinyStyle: React.CSSProperties = { color: 'var(--text-muted, rgba(224,236,244,0.55))', fontSize: '0.68rem' };
const goldMetaStyle: React.CSSProperties = { color: 'var(--accent-gold, #C6A84B)', fontSize: '0.75rem', fontWeight: 900 };
const challengeCrownStyle: React.CSSProperties = { display: 'grid', placeItems: 'center', width: 86 };
const trendingGridStyle: React.CSSProperties = { display: 'grid', gap: '0.6rem', marginTop: '0.8rem' };
const trendingRowStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.8rem', alignItems: 'center' };
const tagNameStyle: React.CSSProperties = { color: 'var(--accent-primary, #60C0F0)', fontSize: '0.82rem' };

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
