/**
 * FILE: InlineMilestoneShare.tsx
 * PURPOSE: Social Coach milestone share from real gamification and chart proof.
 *
 * The panel mounts only after the user opens "Share a milestone". It keeps the
 * existing social contract: read-only draft, explicit confirm, POST to
 * /api/social/posts with type='milestone', no visibility override, and no fake
 * success receipt unless the backend returns a created post id.
 */

import React, { useMemo, useState } from 'react';
import { Check, PartyPopper } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useClientProgressCharts } from '../../../hooks/analytics/useClientProgressCharts';
import { useGamificationData } from '../../../hooks/gamification/useGamificationData';
import { getPersonalLogWorkoutDashboardPath } from '../../UserDashboard/components/swanCoachDashboardRoute';
import {
  buildProgressProofSocialDraft,
  buildProgressProofSummary,
} from '../../DashBoard/progress-proof/progressProofSummary';
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

interface ShareSignal {
  headline: string;
  draft: string;
}

interface InlineMilestoneShareProps {
  /** Collapses the panel ("Not now"). Optional so the panel can stand alone. */
  onDismiss?: () => void;
}

const InlineMilestoneShare: React.FC<InlineMilestoneShareProps> = ({ onDismiss }) => {
  const navigate = useNavigate();
  const { authAxios } = useAuth();
  const { profile } = useGamificationData();
  const {
    isLoading: proofLoading,
    nonEmptyChartCount,
    unavailableChartCount,
  } = useClientProgressCharts();
  const [shareState, setShareState] = useState<ShareState>('idle');

  const proofSummary = useMemo(
    () => buildProgressProofSummary({ nonEmptyChartCount, unavailableChartCount }),
    [nonEmptyChartCount, unavailableChartCount],
  );

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

  const shareSignal = useMemo<ShareSignal | null>(() => {
    if (milestone) {
      return {
        headline: milestone.headline,
        draft: proofSummary.populated > 0
          ? `${milestone.draft}\n\n${buildProgressProofSocialDraft(proofSummary)}`
          : milestone.draft,
      };
    }

    if (proofSummary.populated > 0) {
      return {
        headline: `${proofSummary.proofLevel} progress proof`,
        draft: buildProgressProofSocialDraft(proofSummary),
      };
    }

    return null;
  }, [milestone, proofSummary]);

  const handleShare = async () => {
    if (!shareSignal || shareState === 'sharing') return;
    setShareState('sharing');
    try {
      const formData = new FormData();
      formData.append('content', shareSignal.draft);
      formData.append('type', 'milestone');
      const response = await authAxios.post('/api/social/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (!response.data?.post?.id) {
        throw new Error('create response missing post');
      }
      setShareState('shared');
      window.dispatchEvent(new CustomEvent('swan:social-post-created'));
    } catch {
      setShareState('failed');
    }
  };

  if (profile.isLoading || (proofLoading && !milestone)) {
    return (
      <FinderPanel id="coach-milestone-share" role="region" aria-label="Share a milestone">
        <StatusLine>Checking your training data...</StatusLine>
      </FinderPanel>
    );
  }

  if (!shareSignal) {
    return (
      <FinderPanel id="coach-milestone-share" role="region" aria-label="Share a milestone">
        <StatusLine>
          No fresh milestone yet - your next logged workout gets you closer.
        </StatusLine>
        <JoinButton onClick={() => navigate(getPersonalLogWorkoutDashboardPath())}>
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
          Shared to the feed - {shareSignal.headline} is live.
        </JoinedReceipt>
      ) : (
        <>
          <DraftCard>
            <DraftLabel>Coach drafted from your training data</DraftLabel>
            <DraftText>{shareSignal.draft}</DraftText>
          </DraftCard>
          <ConfirmRow>
            <ShareButton
              onClick={handleShare}
              disabled={shareState === 'sharing'}
              aria-label="Share to feed"
            >
              <PartyPopper size={15} />
              {shareState === 'sharing' ? 'Sharing...' : 'Share to feed'}
            </ShareButton>
            {onDismiss && (
              <CancelButton onClick={onDismiss}>Not now</CancelButton>
            )}
            {shareState === 'failed' && (
              <RetryLine role="status">
                That share didn't go through - give it another tap.
              </RetryLine>
            )}
          </ConfirmRow>
        </>
      )}
    </FinderPanel>
  );
};

export default InlineMilestoneShare;
