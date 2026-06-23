/**
 * FILE: ClientDashboardHome.feedSections.tsx
 * PURPOSE: Feed, composer, workout, and insight sections for client Home.
 */
import React from 'react';
import {
  Activity,
  Apple,
  BarChart3,
  Camera,
  Dumbbell,
  Heart,
  ImagePlus,
  MessageCircle,
  Send,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import {
  ActionButton,
  CardBody,
  CardTitle,
  Kicker,
  ListStack,
  MutedText,
  PanelCard,
  PanelHeader,
  ProgressFill,
  ProgressTrack,
  RowItem,
  TinyText,
} from './ClientDashboardHome.cardStyles';
import {
  ChipRow,
  ComposerFooter,
  ComposerForm,
  ComposerTextArea,
  FeedPost,
  InsightGrid,
  InsightTile,
  MoodChip,
  PostHeader,
  PostMedia,
  SocialStats,
  SparkBar,
  Sparkline,
} from './ClientDashboardHome.feedStyles';
import type { ClientDashboardHomeProps } from './ClientDashboardHome.types';

const moodOptions = [
  ['workout', 'Training'],
  ['achievement', 'Progress'],
  ['community', 'Community'],
  ['achievement', 'Win'],
  ['community', 'Nutrition'],
] as const;

export function TrainingFocusCard({ featureImageSrc, trainingProof, onNavigate }: Pick<ClientDashboardHomeProps,
  'featureImageSrc' | 'trainingProof' | 'onNavigate'>) {
  return (
    <PanelCard>
      <PostMedia aria-hidden="true"><img src={featureImageSrc} alt="" /></PostMedia>
      <CardBody>
        <Kicker><Dumbbell size={13} /> Featured workout</Kicker>
        <CardTitle>{trainingProof.lastSession?.title || 'Start today strong'}</CardTitle>
        <MutedText>{trainingProof.shareLine || 'Log a workout to build your weekly progress proof.'}</MutedText>
        <SocialStats><span>45 min</span><span>Performance training</span><span>{trainingProof.thisWeekCount} this week</span></SocialStats>
        <ChipRow>
          <ActionButton type="button" $primary onClick={() => onNavigate('/dashboard/client/log-workout?loadPlan=today')}>Start Workout</ActionButton>
          <ActionButton type="button" onClick={() => onNavigate('/dashboard/client/workouts')}>Details</ActionButton>
        </ChipRow>
      </CardBody>
    </PanelCard>
  );
}

export function QuickPostCard(props: Pick<ClientDashboardHomeProps,
  'postText' | 'activeMood' | 'selectedMediaName' | 'mediaError' | 'proofAttached' | 'postIntentLabel' |
  'postIntentTags' | 'canPost' | 'isPosting' | 'onSetMood' | 'onAddMediaClick' | 'onPostTextChange' |
  'onSubmitPost' | 'onShareProgress'>) {
  return (
    <PanelCard>
      <PanelHeader><Kicker><Camera size={13} /> Quick post</Kicker><TinyText>{props.proofAttached ? 'Workout proof attached' : 'Community feed'}</TinyText></PanelHeader>
      <ComposerForm onSubmit={props.onSubmitPost}>
        <ComposerTextArea
          value={props.postText}
          onChange={(event) => props.onPostTextChange(event.target.value)}
          placeholder="Share a training win, check-in, or progress note."
          aria-label="Write a community post"
        />
        <ChipRow>
          {moodOptions.map(([mood, label]) => (
            <MoodChip key={`${label}-${mood}`} type="button" $active={props.activeMood === mood} onClick={() => props.onSetMood(mood)}>
              {label}
            </MoodChip>
          ))}
        </ChipRow>
        <ComposerFooter>
          <TinyText>
            {props.mediaError || props.selectedMediaName || props.postIntentLabel || props.postIntentTags.map((tag) => `#${tag}`).join(' ') || 'Posts publish to the live community feed.'}
          </TinyText>
          <ChipRow>
            <ActionButton type="button" onClick={props.onAddMediaClick}><ImagePlus size={16} /> Media</ActionButton>
            <ActionButton type="button" onClick={props.onShareProgress}><Share2 size={16} /> Progress</ActionButton>
            <ActionButton type="submit" $primary disabled={!props.canPost || props.isPosting}><Send size={16} /> {props.isPosting ? 'Posting' : 'Post'}</ActionButton>
          </ChipRow>
        </ComposerFooter>
      </ComposerForm>
    </PanelCard>
  );
}

export function CommunityFeedCard({ latestPost, feedLoading, feedError, avatarSrc, displayName }: Pick<ClientDashboardHomeProps,
  'latestPost' | 'feedLoading' | 'feedError' | 'avatarSrc' | 'displayName'>) {
  return (
    <PanelCard>
      <PanelHeader><Kicker><MessageCircle size={13} /> Community feed</Kicker>{feedLoading && <TinyText>Loading</TinyText>}</PanelHeader>
      {latestPost ? (
        <FeedPost>
          <PostHeader><img src={avatarSrc} alt="" /><div><CardTitle>{displayName}</CardTitle><TinyText>{latestPost.timeAgo}</TinyText></div></PostHeader>
          <MutedText>{latestPost.caption || 'Shared a community update.'}</MutedText>
          {latestPost.mediaUrl && (
            <PostMedia>{latestPost.isVideo ? <video src={latestPost.mediaUrl} controls /> : <img src={latestPost.mediaUrl} alt="" />}</PostMedia>
          )}
          <SocialStats><span><Heart size={14} /> {latestPost.likes}</span><span><MessageCircle size={14} /> {latestPost.comments}</span></SocialStats>
        </FeedPost>
      ) : (
        <CardBody><MutedText>{feedError ? 'Community feed is unavailable right now.' : 'No community posts loaded yet.'}</MutedText></CardBody>
      )}
    </PanelCard>
  );
}

export function WeeklyInsightsCard({ insights }: Pick<ClientDashboardHomeProps, 'insights'>) {
  return (
    <PanelCard>
      <PanelHeader><Kicker><BarChart3 size={13} /> Weekly insights</Kicker></PanelHeader>
      <CardBody>
        <InsightGrid>
          {insights.map((insight) => (
            <InsightTile key={insight.label}>
              <TinyText>{insight.label}</TinyText>
              <CardTitle>{insight.value}</CardTitle>
              <MutedText>{insight.status}</MutedText>
              <Sparkline>{insight.points.map((point, index) => <SparkBar key={`${insight.label}-${index}`} $height={point * 7 + 5} />)}</Sparkline>
            </InsightTile>
          ))}
        </InsightGrid>
      </CardBody>
    </PanelCard>
  );
}

export function PerformanceZoneCard({ performanceScore, macroSummary, macroLoading, progressPercent }: Pick<ClientDashboardHomeProps,
  'performanceScore' | 'macroSummary' | 'macroLoading' | 'progressPercent'>) {
  const calories = macroLoading ? 'Loading' : macroSummary ? `${Math.round(macroSummary.totalCalories || 0)} cal` : 'No nutrition log';
  return (
    <PanelCard>
      <PanelHeader><Kicker><ShieldCheck size={13} /> Performance zone</Kicker></PanelHeader>
      <CardBody>
        <CardTitle>{performanceScore === null ? 'Build your score' : `${performanceScore}% ready`}</CardTitle>
        <MutedText>Score combines weekly workout proof, streak momentum, and current level progress.</MutedText>
        <ProgressTrack role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={performanceScore ?? 0}>
          <ProgressFill $pct={performanceScore ?? 0} />
        </ProgressTrack>
        <ListStack>
          <RowItem><Activity size={16} /><span>Momentum</span><TinyText>{progressPercent}%</TinyText></RowItem>
          <RowItem><Apple size={16} /><span>Nutrition</span><TinyText>{calories}</TinyText></RowItem>
        </ListStack>
      </CardBody>
    </PanelCard>
  );
}
