/**
 * FILE: ClientObservatoryWidgets.tsx
 * PURPOSE: Live right-rail widgets for the canonical client observatory.
 */

import React from 'react';
import { Award, Crown, Flame, Hash, Heart, Sparkles, Trophy, Users } from 'lucide-react';
import {
  OBSERVATORY_ASSETS,
  compactNumber,
  countCollection,
  iconLabel,
} from './ClientObservatoryData';
import {
  CardInner,
  MutedText,
  ProgressFill,
  ProgressTrack,
  SectionKicker,
  SectionTitle,
} from './ClientObservatoryShell.styles';
import {
  ActivityGrid,
  ActivityItem,
  BadgeGrid,
  BadgeHex,
  ChallengeStage,
  CrystalBadge,
  MomentumBar,
  MomentumBars,
  MomentumGrid,
  MomentumRing,
  StatusPill,
  StoryItem,
  StoryOrb,
  StoryStrip,
  WidgetCard,
  WidgetHeader,
  WidgetLabel,
  WidgetList,
  WidgetMeta,
  WidgetRow,
  WidgetValue,
} from './ClientObservatoryWidgets.styles';
import {
  MOMENTUM_SHAPE,
  WIDGET_TONES,
  activityPosts,
  challengeProgress,
  leaderName,
  postAuthor,
  storyPosts,
  type ClientObservatoryWidgetsProps,
} from './ClientObservatoryWidgetModels';

const ClientObservatoryWidgets: React.FC<ClientObservatoryWidgetsProps> = ({
  achievements,
  challenge,
  displayName,
  feedLoading,
  leaderboard,
  points,
  posts,
  progress,
  streakDays,
  tags,
}) => {
  const challengePct = challengeProgress(challenge);
  const stories = storyPosts(posts);
  const activity = activityPosts(posts, displayName);
  const challengeTitle = challenge?.title || challenge?.name || 'No active challenge yet';
  const badgeTone = (index: number) => WIDGET_TONES[index % WIDGET_TONES.length];

  return (
    <>
      <WidgetCard>
        <CardInner>
          <WidgetHeader>
            <div>
              <SectionKicker>
                <Sparkles size={14} aria-hidden="true" />
                Stories from the Garden
              </SectionKicker>
              <SectionTitle>Creator moments</SectionTitle>
            </div>
            <StatusPill>{stories.length + 1} stories</StatusPill>
          </WidgetHeader>
          <StoryStrip>
            <StoryItem>
              <StoryOrb $tone="violet">
                <img src={OBSERVATORY_ASSETS.profileMark} alt="" aria-hidden="true" />
              </StoryOrb>
              <span>Your Story</span>
            </StoryItem>
            {stories.map((post, index) => (
              <StoryItem key={post.id || index}>
                <StoryOrb $tone={badgeTone(index)}>
                  <img src={post.mediaUrl} alt="" aria-hidden="true" />
                </StoryOrb>
                <span>{postAuthor(post, displayName)}</span>
              </StoryItem>
            ))}
          </StoryStrip>
        </CardInner>
      </WidgetCard>

      <WidgetCard>
        <CardInner>
          <WidgetHeader>
            <div>
              <SectionKicker>
                <Heart size={14} aria-hidden="true" />
                Live Activity
              </SectionKicker>
              <SectionTitle>Community pulse</SectionTitle>
            </div>
            <StatusPill $tone={feedLoading ? 'violet' : 'cyan'}>
              {feedLoading ? 'Syncing' : 'Recent'}
            </StatusPill>
          </WidgetHeader>
          {activity.length ? (
            <ActivityGrid>
              {activity.map((item) => (
                <ActivityItem key={item.id}>
                  <StatusPill aria-hidden="true">
                    <Heart size={13} />
                  </StatusPill>
                  <span><strong>{item.user}</strong> {item.action}<br />{item.time}</span>
                </ActivityItem>
              ))}
            </ActivityGrid>
          ) : (
            <MutedText>No community activity has landed yet.</MutedText>
          )}
        </CardInner>
      </WidgetCard>

      <WidgetCard>
        <CardInner>
          <WidgetHeader>
            <div>
              <SectionKicker>
                <Trophy size={14} aria-hidden="true" />
                Active Challenge
              </SectionKicker>
              <SectionTitle>{challengeTitle}</SectionTitle>
            </div>
            <StatusPill $tone="gold">{challenge ? `${challengePct}%` : 'Ready'}</StatusPill>
          </WidgetHeader>
          {challenge ? (
            <ChallengeStage>
              <div>
                <ProgressTrack role="progressbar" aria-label="Challenge progress" aria-valuenow={challengePct} aria-valuemin={0} aria-valuemax={100}>
                  <ProgressFill $pct={challengePct} />
                </ProgressTrack>
                <WidgetMeta>
                  {compactNumber(challenge.participants || 0)} creators joined. {challenge.description || 'Progress syncs from the challenge board.'}
                </WidgetMeta>
              </div>
              <CrystalBadge>
                <Crown size={32} aria-hidden="true" />
              </CrystalBadge>
            </ChallengeStage>
          ) : (
            <MutedText>No real active challenge is live yet.</MutedText>
          )}
        </CardInner>
      </WidgetCard>

      <WidgetCard>
        <CardInner>
          <WidgetHeader>
            <div>
              <SectionKicker>
                <Award size={14} aria-hidden="true" />
                Badges
              </SectionKicker>
              <SectionTitle>Leaderboard</SectionTitle>
            </div>
            <StatusPill $tone="gold">+{compactNumber(points)} XP</StatusPill>
          </WidgetHeader>
          {achievements.length ? (
            <BadgeGrid>
              {achievements.slice(0, 3).map((item, index) => (
                <BadgeHex key={item.id || index} $tone={badgeTone(index)} title={item.achievement?.name || item.achievement?.title}>
                  {iconLabel(item.achievement?.icon || item.achievement?.iconEmoji)}
                </BadgeHex>
              ))}
            </BadgeGrid>
          ) : (
            <WidgetMeta>Earn a badge to fill this showcase.</WidgetMeta>
          )}
          <WidgetList>
            {leaderboard.slice(0, 3).map((entry, index) => (
              <WidgetRow key={entry.userId || index}>
                <WidgetLabel>{index + 1}. {leaderName(entry)}</WidgetLabel>
                <WidgetValue>{compactNumber(entry.points || entry.overallLevel || entry.level || 0)} XP</WidgetValue>
              </WidgetRow>
            ))}
            {leaderboard.length === 0 && (
              <WidgetRow>
                <WidgetLabel>Your XP</WidgetLabel>
                <WidgetValue>{compactNumber(points)} XP</WidgetValue>
              </WidgetRow>
            )}
          </WidgetList>
        </CardInner>
      </WidgetCard>

      <WidgetCard>
        <CardInner>
          <WidgetHeader>
            <div>
              <SectionKicker>
                <Flame size={14} aria-hidden="true" />
                Weekly Momentum
              </SectionKicker>
              <SectionTitle>{streakDays} day streak</SectionTitle>
            </div>
            <StatusPill>{progress}%</StatusPill>
          </WidgetHeader>
          <MomentumGrid>
            <MomentumRing>
              <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
                <circle cx="44" cy="44" r="34" stroke="color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent)" strokeWidth="7" fill="none" />
                <circle cx="44" cy="44" r="34" stroke="var(--accent-primary, #60C0F0)" strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray="214" strokeDashoffset={214 * (1 - progress / 100)} transform="rotate(-90 44 44)" />
              </svg>
              <strong>{progress}%</strong>
            </MomentumRing>
            <MomentumBars>
              {MOMENTUM_SHAPE.map((height, index) => (
                <MomentumBar key={height} $height={Math.max(12, Math.round((height * Math.max(progress, 12)) / 100))} $gold={index === MOMENTUM_SHAPE.length - 1} />
              ))}
            </MomentumBars>
          </MomentumGrid>
        </CardInner>
      </WidgetCard>

      <WidgetCard>
        <CardInner>
          <WidgetHeader>
            <div>
              <SectionKicker>
                <Hash size={14} aria-hidden="true" />
                Trending
              </SectionKicker>
              <SectionTitle>Feed tags</SectionTitle>
            </div>
            <StatusPill>{tags.length} tags</StatusPill>
          </WidgetHeader>
          <WidgetList>
            {(tags.length ? tags : ['No tags yet']).map((tag) => (
              <WidgetRow key={tag}>
                <WidgetLabel>{tag}</WidgetLabel>
                <WidgetValue>{tag.startsWith('#') ? compactNumber(countCollection(posts)) : '--'}</WidgetValue>
              </WidgetRow>
            ))}
          </WidgetList>
        </CardInner>
      </WidgetCard>

      <WidgetCard>
        <CardInner>
          <SectionKicker>
            <Users size={14} aria-hidden="true" />
            Next Best Action
          </SectionKicker>
          <SectionTitle>Turn today into visible progress.</SectionTitle>
          <WidgetMeta>Your next update can carry the day forward.</WidgetMeta>
        </CardInner>
      </WidgetCard>
    </>
  );
};

export default ClientObservatoryWidgets;
