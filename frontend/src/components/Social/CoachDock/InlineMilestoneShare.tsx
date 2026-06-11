/**
 * ============================================================================
 * FILE: InlineMilestoneShare.tsx
 * PURPOSE: D2c inline milestone share — Coach drafts a post from real
 *          training data; explicit confirm posts it to the live feed.
 * AUTHOR: Claude Fable 5 | CREATED: 2026-06-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: When the dock's "Share a milestone" chip expands,
 * this panel resolves the user's freshest shareable milestone from the REAL
 * gamification profile (streak > level > points, via milestoneResolver),
 * previews the Coach-drafted post read-only, and publishes it on explicit
 * confirm through the canonical feed lane (POST /api/social/posts,
 * type='milestone' — [VERIFIED] in the production enum 2026-06-11).
 *
 * HOW IT FITS IN THE APP: Lazily mounted by SocialCoachDock only when the
 * chip is expanded. After a confirmed post it dispatches
 * 'swan:social-post-created' so every useSocialFeed consumer refreshes and
 * the post appears in the feed immediately. The full composer
 * (CreatePostCard) keeps editing ownership — the dock never grows a text
 * input (rule 27 companion posture).
 *
 * KEY DECISIONS (grill-me doc 2026-06-11):
 * - No visibility field is sent: the backend applies its role-aware default
 *   (friends for members, public for staff) — routes/social/posts.mjs:682.
 * - Receipt renders only after a confirmed 2xx; failure shows an honest
 *   retry line, never a fake success.
 * - Nothing shareable → honest empty state + deep-link to the workout
 *   logger. Mock milestones are forbidden (data-truth rule).
 */

import React, { useMemo, useState } from 'react';
import { Check, PartyPopper } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useGamificationData } from '../../../hooks/gamification/useGamificationData';
import { getLogWorkoutDashboardPath } from '../../UserDashboard/components/swanCoachDashboardRoute';
import { resolveShareableMilestone } from './milestoneResolver';
import {
  FinderPanel,
  JoinButton,
  JoinedReceipt,
  RetryLine,
  StatusLine,
} from './InlineChallengeFinder.styles';
import {
  CancelButton,
  ConfirmRow,
  DraftCard,
  DraftLabel,
  DraftText,
  ShareButton,
} from './InlineMilestoneShare.styles';

type ShareState = 'idle' | 'sharing' | 'shared' | 'failed';

interface InlineMilestoneShareProps {
  /** Collapses the panel ("Not now"). Optional so the panel can stand alone. */
  onDismiss?: () => void;
}

const InlineMilestoneShare: React.FC<InlineMilestoneShareProps> = ({ onDismiss }) => {
  const navigate = useNavigate();
  const { user, authAxios } = useAuth();
  const { profile } = useGamificationData();
  const [shareState, setShareState] = useState<ShareState>('idle');

  const milestone = useMemo(
    () =>
      profile.data
        ? resolveShareableMilestone({
            streakDays: profile.data.streakDays,
            level: profile.data.level,
            points: profile.data.points,
          })
        : null,
    [profile.data],
  );

  const handleShare = async () => {
    if (!milestone || shareState === 'sharing') return;
    setShareState('sharing');
    try {
      const formData = new FormData();
      formData.append('content', milestone.draft);
      formData.append('type', 'milestone');
      const response = await authAxios.post('/api/social/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Honest receipt: a 2xx without the created post is NOT success.
      // (2026-06-11 silent-rollback incident shipped 201 + post:null.)
      if (!response.data?.post?.id) {
        throw new Error('create response missing post');
      }
      setShareState('shared');
      window.dispatchEvent(new CustomEvent('swan:social-post-created'));
    } catch {
      setShareState('failed');
    }
  };

  if (profile.isLoading) {
    return (
      <FinderPanel id="coach-milestone-share" role="region" aria-label="Share a milestone">
        <StatusLine>Checking your training data…</StatusLine>
      </FinderPanel>
    );
  }

  if (!milestone) {
    return (
      <FinderPanel id="coach-milestone-share" role="region" aria-label="Share a milestone">
        <StatusLine>
          No fresh milestone yet — your next logged workout gets you closer.
        </StatusLine>
        <JoinButton onClick={() => navigate(getLogWorkoutDashboardPath(user?.role))}>
          Log a workout
        </JoinButton>
      </FinderPanel>
    );
  }

  return (
    <FinderPanel id="coach-milestone-share" role="region" aria-label="Share a milestone">
      {shareState === 'shared' ? (
        <JoinedReceipt role="status">
          <Check size={15} />
          Shared to the feed — {milestone.headline} is live.
        </JoinedReceipt>
      ) : (
        <>
          <DraftCard>
            <DraftLabel>Coach drafted from your training data</DraftLabel>
            <DraftText>{milestone.draft}</DraftText>
          </DraftCard>
          <ConfirmRow>
            <ShareButton
              onClick={handleShare}
              disabled={shareState === 'sharing'}
              aria-label="Share to feed"
            >
              <PartyPopper size={15} />
              {shareState === 'sharing' ? 'Sharing…' : 'Share to feed'}
            </ShareButton>
            {onDismiss && (
              <CancelButton onClick={onDismiss}>Not now</CancelButton>
            )}
            {shareState === 'failed' && (
              <RetryLine role="status">
                That share didn't go through — give it another tap.
              </RetryLine>
            )}
          </ConfirmRow>
        </>
      )}
    </FinderPanel>
  );
};

export default InlineMilestoneShare;
