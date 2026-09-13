/**
 * FILE: ClientDashboardHome.feedSections.tsx
 * PURPOSE: Feed, composer, workout, and insight sections for client Home.
 */
import React from 'react';
import PostMediaLightbox from '../../Social/Feed/components/PostMediaLightbox';
import { sanitizeImageUrl } from '../../../utils/imageUrl';
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
  X,
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
  MediaPreviewCopy,
  MediaPreviewFrame,
  MediaPreviewShell,
  MoodChip,
  PostHeader,
  PostMedia,
  PostMediaButton,
  SocialStats,
  SparkBar,
  Sparkline,
} from './ClientDashboardHome.feedStyles';
import type { ClientDashboardHomeProps } from './ClientDashboardHome.types';

const moodOptions = [
  ['community', 'Auto tag'],
  ['workout', 'Training'],
  ['transformation', 'Progress photo'],
  ['achievement', 'Win'],
  ['challenge', 'Challenge'],
] as const;

export function TrainingFocusCard({ featureImageSrc, trainingProof, assignment, onNavigate }: Pick<ClientDashboardHomeProps,
  'featureImageSrc' | 'trainingProof' | 'assignment' | 'onNavigate'>) {
  const title = trainingProof.lastSession?.title || assignment.title || 'Training guidance';
  const summary = trainingProof.lastSession
    ? `Completed ${trainingProof.lastSession.when}. ${trainingProof.shareLine || ''}`.trim()
    : assignment.meta;
  return (
    <PanelCard>
      <PostMedia aria-hidden="true"><img src={featureImageSrc} alt="" /></PostMedia>
      <CardBody>
        <Kicker><Dumbbell size={13} /> Training record</Kicker>
        <CardTitle>{title}</CardTitle>
        <MutedText>{summary || 'Open the plan when you are ready to train.'}</MutedText>
        <SocialStats><span>{trainingProof.lastSession ? 'Completed workout' : 'Plan guidance'}</span><span>{trainingProof.thisWeekCount} this week</span></SocialStats>
        <ChipRow>
          <ActionButton type="button" $primary onClick={() => onNavigate(assignment.actionPath)}>{assignment.actionLabel}</ActionButton>
          <ActionButton type="button" onClick={() => onNavigate('/dashboard/client/workouts')}>Details</ActionButton>
        </ChipRow>
      </CardBody>
    </PanelCard>
  );
}

export function QuickPostCard(props: Pick<ClientDashboardHomeProps,
  'postText' | 'activeMood' | 'selectedMediaName' | 'selectedMediaPreviewUrl' | 'selectedMediaType' |
  'mediaError' | 'proofAttached' | 'postIntentLabel' | 'postIntentTags' | 'canPost' | 'isPosting' |
  'onSetMood' | 'onAddMediaClick' | 'onClearMedia' | 'onPostTextChange' | 'onSubmitPost' | 'onShareProgress'>) {
  const selectedMediaIsVideo = !!props.selectedMediaType?.startsWith('video/');

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
        {props.selectedMediaPreviewUrl && (
          <MediaPreviewShell>
            <MediaPreviewFrame>
              {selectedMediaIsVideo ? (
                <video src={props.selectedMediaPreviewUrl} controls muted playsInline preload="metadata" aria-label="Selected media preview" />
              ) : (
                <img src={props.selectedMediaPreviewUrl} alt="Selected media preview" />
              )}
            </MediaPreviewFrame>
            <MediaPreviewCopy>
              <TinyText>Selected media preview</TinyText>
              <strong>{props.selectedMediaName || 'Media ready'}</strong>
            </MediaPreviewCopy>
            <ActionButton type="button" onClick={props.onClearMedia} aria-label="Remove selected media">
              <X size={16} /> Remove media
            </ActionButton>
          </MediaPreviewShell>
        )}
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
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const safeMediaUrl = latestPost?.mediaUrl ? sanitizeImageUrl(latestPost.mediaUrl) : null;
  const imageAlt = `Latest post image: ${latestPost?.caption || 'Community post'}`;

  return (
    <PanelCard aria-label="Community feed preview">
      <PanelHeader><Kicker><MessageCircle size={13} /> Community feed</Kicker>{feedLoading && <TinyText>Loading</TinyText>}</PanelHeader>
      {latestPost ? (
        <FeedPost>
          <PostHeader><img src={avatarSrc} alt="" /><div><CardTitle>{displayName}</CardTitle><TinyText>{latestPost.timeAgo}</TinyText></div></PostHeader>
          <MutedText>{latestPost.caption || 'Shared a community update.'}</MutedText>
          {safeMediaUrl && latestPost.isVideo && (
            <PostMedia><video src={safeMediaUrl} controls muted playsInline preload="metadata" /></PostMedia>
          )}
          {safeMediaUrl && !latestPost.isVideo && (
            <>
              <PostMediaButton type="button" aria-label="View latest post image" onClick={() => setLightboxOpen(true)}>
                <img src={safeMediaUrl} alt={imageAlt} loading="lazy" />
              </PostMediaButton>
              <PostMediaLightbox src={safeMediaUrl} alt={imageAlt} open={lightboxOpen} onClose={() => setLightboxOpen(false)} />
            </>
          )}
          <SocialStats><span><Heart size={14} /> {latestPost.likes}</span><span><MessageCircle size={14} /> {latestPost.comments}</span></SocialStats>
        </FeedPost>
      ) : (
        <CardBody><MutedText>{feedError ? 'Community feed is unavailable right now.' : 'No community posts loaded yet.'}</MutedText></CardBody>
      )}
    </PanelCard>
  );
}

export function WeeklyInsightsCard({ insights, historyStatus, hasHistory, onRetryHistory, onLogWorkout }: Pick<ClientDashboardHomeProps,
  'insights' | 'historyStatus' | 'onRetryHistory' | 'onLogWorkout'> & { hasHistory?: boolean }) {
  if (historyStatus === 'loading') {
    return (
      <PanelCard>
        <PanelHeader><Kicker><BarChart3 size={13} /> Weekly insights</Kicker></PanelHeader>
        <CardBody><MutedText>Loading workout history...</MutedText></CardBody>
      </PanelCard>
    );
  }

  if (historyStatus === 'error') {
    return (
      <PanelCard>
        <PanelHeader><Kicker><BarChart3 size={13} /> Weekly insights</Kicker></PanelHeader>
        <CardBody>
          <MutedText>Workout history is unavailable right now.</MutedText>
          {onRetryHistory && <ActionButton type="button" onClick={onRetryHistory}>Retry history</ActionButton>}
        </CardBody>
      </PanelCard>
    );
  }

  if (historyStatus === 'ready' && hasHistory === false) {
    return (
      <PanelCard>
        <PanelHeader><Kicker><BarChart3 size={13} /> Weekly insights</Kicker></PanelHeader>
        <CardBody>
          <CardTitle>Your first logged workout starts your progress story.</CardTitle>
          <MutedText>Log your first workout to see weekly totals and consistency trends.</MutedText>
          {onLogWorkout && <ActionButton type="button" $primary onClick={onLogWorkout}>Log Workout</ActionButton>}
        </CardBody>
      </PanelCard>
    );
  }

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
        <CardTitle>{performanceScore === null ? 'Build your momentum' : `${performanceScore}% momentum`}</CardTitle>
        <MutedText>Momentum combines weekly workout proof, streak momentum, and current level progress.</MutedText>
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
