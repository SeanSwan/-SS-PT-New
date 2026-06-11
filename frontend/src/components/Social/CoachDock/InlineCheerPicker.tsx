/**
 * ============================================================================
 * FILE: InlineCheerPicker.tsx
 * PURPOSE: Feed-anchored cheer for the social Coach dock — cheer a friend's
 *          real win in 2 taps (D2 fast-follow, Sean-ratified 2026-06-11).
 * AUTHOR: Claude Fable 5 | CREATED: 2026-06-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: When the dock's "Cheer a friend" chip expands, this
 * panel pulls the user's REAL feed and friendships lanes and surfaces up to
 * two unreacted celebration posts (milestone / achievement / workout /
 * transformation / challenge) by other members — friends' wins preferred,
 * community wins as an honestly-labeled fallback. One tap sends the
 * signature 'swan' reaction through the production like endpoint.
 *
 * HOW IT FITS IN THE APP: Lazily mounted by SocialCoachDock only when the
 * chip is expanded (both fetches fire on demand, never on feed load).
 * Reuses InlineChallengeFinder.styles wholesale — same dock-panel
 * vocabulary, no new visual class, no inputs (rule 27 companion posture).
 *
 * KEY DECISIONS (signal audit 2026-06-11):
 * - The friends REST lane exposes no activity signals and the socket stream
 *   is ephemeral, so the durable, already-consented signal is friends'
 *   celebration POSTS — cheering one IS the nudge. True slipping-friend
 *   detection needs new backend surface + a privacy call; deliberately out.
 * - Selection locked at first load so a just-cheered row stays visible as a
 *   receipt; receipts render only on a confirmed 2xx (honest-receipt rule).
 * - Either lane failing degrades honestly: no friendships → community wins;
 *   no feed → empty state + deep-link to /social/friends (D2a behavior).
 */

import React, { useEffect, useState } from 'react';
import { Check, ChevronRight, ThumbsUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  BrowseAllButton,
  FinderPanel,
  JoinButton,
  JoinedReceipt,
  MatchInfo,
  MatchMeta,
  MatchRow,
  MatchTitle,
  RetryLine,
  StatusLine,
} from './InlineChallengeFinder.styles';

const CHEERABLE_TYPES = new Set([
  'milestone',
  'achievement',
  'workout',
  'transformation',
  'challenge',
]);

const TYPE_LABELS: Record<string, string> = {
  milestone: 'hit a milestone',
  achievement: 'unlocked an achievement',
  workout: 'logged a workout',
  transformation: 'shared a transformation',
  challenge: 'shared a challenge win',
};

interface CheerCandidate {
  postId: string;
  name: string;
  typeLabel: string;
  snippet: string;
}

const MAX_CANDIDATES = 2;

const InlineCheerPicker: React.FC = () => {
  const navigate = useNavigate();
  const { user, authAxios } = useAuth();
  const [candidates, setCandidates] = useState<CheerCandidate[] | null>(null);
  const [communityFallback, setCommunityFallback] = useState(false);
  const [cheeringId, setCheeringId] = useState<string | null>(null);
  const [cheeredIds, setCheeredIds] = useState<ReadonlySet<string>>(new Set());
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [feedRes, friendsRes] = await Promise.allSettled([
        authAxios.get('/api/social/posts/feed', { params: { limit: 20, offset: 0 } }),
        authAxios.get('/api/social/friendships'),
      ]);
      if (cancelled) return;

      const posts: any[] =
        feedRes.status === 'fulfilled' ? feedRes.value.data?.posts || [] : [];
      const friends: any[] =
        friendsRes.status === 'fulfilled' ? friendsRes.value.data?.friends || [] : [];

      const myId = String(user?.id ?? '');
      const cheerable = posts.filter(
        (p) =>
          p?.user &&
          String(p.user.id) !== myId &&
          CHEERABLE_TYPES.has(p.type) &&
          !p.isLiked,
      );
      const friendIds = new Set(friends.map((f) => String(f.id)));
      const friendWins = cheerable.filter((p) => friendIds.has(String(p.user.id)));
      const picks = (friendWins.length > 0 ? friendWins : cheerable).slice(0, MAX_CANDIDATES);

      setCommunityFallback(friendWins.length === 0 && picks.length > 0);
      setCandidates(
        picks.map((p) => ({
          postId: String(p.id),
          name: p.user.firstName || p.user.username || 'A member',
          typeLabel: TYPE_LABELS[p.type] || 'shared a win',
          snippet: p.content || '',
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheer = async (postId: string) => {
    if (cheeringId) return;
    setCheeringId(postId);
    try {
      await authAxios.post(`/api/social/posts/${postId}/like`, { reactionType: 'swan' });
      setCheeredIds((prev) => new Set(prev).add(postId));
    } catch {
      setFailedIds((prev) => new Set(prev).add(postId));
    } finally {
      setCheeringId(null);
    }
  };

  if (candidates === null) {
    return (
      <FinderPanel id="coach-cheer-picker" role="region" aria-label="Cheer a friend">
        <StatusLine>Finding wins to cheer…</StatusLine>
      </FinderPanel>
    );
  }

  return (
    <FinderPanel id="coach-cheer-picker" role="region" aria-label="Cheer a friend">
      {candidates.length === 0 ? (
        <StatusLine>No fresh wins to cheer right now — check back after your crew trains.</StatusLine>
      ) : (
        <>
          {communityFallback && (
            <StatusLine>No friend wins right now — recent community wins:</StatusLine>
          )}
          {candidates.map((candidate) => (
            <MatchRow key={candidate.postId}>
              <MatchInfo>
                <MatchTitle>
                  {candidate.name} {candidate.typeLabel}
                </MatchTitle>
                <MatchMeta
                  style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {candidate.snippet}
                </MatchMeta>
              </MatchInfo>
              {cheeredIds.has(candidate.postId) ? (
                <JoinedReceipt role="status">
                  <Check size={15} />
                  Cheered 🦢
                </JoinedReceipt>
              ) : (
                <JoinButton
                  onClick={() => handleCheer(candidate.postId)}
                  disabled={cheeringId === candidate.postId}
                  aria-label={`Cheer ${candidate.name}`}
                >
                  <ThumbsUp size={15} />
                  {cheeringId === candidate.postId ? 'Cheering…' : 'Cheer'}
                </JoinButton>
              )}
              {failedIds.has(candidate.postId) && !cheeredIds.has(candidate.postId) && (
                <RetryLine role="status">
                  That cheer didn't go through — give it another tap.
                </RetryLine>
              )}
            </MatchRow>
          ))}
        </>
      )}
      <BrowseAllButton onClick={() => navigate('/social/friends')}>
        See your friends
        <ChevronRight size={14} />
      </BrowseAllButton>
    </FinderPanel>
  );
};

export default InlineCheerPicker;
