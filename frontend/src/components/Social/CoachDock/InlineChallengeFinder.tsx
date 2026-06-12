/**
 * ============================================================================
 * FILE: InlineChallengeFinder.tsx
 * PURPOSE: D2b inline challenge finder for the social Coach dock — 1-2 real
 *          matches with one-tap join, without leaving the feed.
 * AUTHOR: Claude Fable 5 | CREATED: 2026-06-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: When the dock's "Find a challenge" chip expands, this
 * panel fetches the REAL challenges lane (useChallenges — the same hook and
 * endpoints ChallengesView exercises in production) and surfaces up to two
 * active, not-yet-joined challenges ranked by participants. Join is one tap;
 * the receipt only renders after the hook's refetch confirms joined=true.
 *
 * HOW IT FITS IN THE APP: Lazily mounted by SocialCoachDock ONLY when the
 * chip is expanded, so the feed never pays the challenges fetch unless the
 * user asks for it. ChallengesView keeps full browse/filter/leave ownership —
 * this is a companion rail, not a competing challenges surface (rule 27).
 *
 * KEY DECISIONS (grill-me doc 2026-06-11, Q4 hybrid depth):
 * - Match selection is LOCKED at first load (matchIds state) so a just-joined
 *   challenge stays visible as a receipt instead of being filtered away by
 *   the post-join refetch.
 * - useChallenges.joinChallenge swallows errors (resolves either way), so
 *   success is verified from the refetched joined flag — never assumed. A
 *   join that didn't stick renders an honest retry line, not a fake receipt.
 * - Empty list / API-down → empty state with a Browse-all deep-link to
 *   /social/challenges (graceful fallback to the D2a deep-link behavior).
 * - Ranking is participants-desc (social proof). Level-matched rival pairing
 *   is a vision-backlog item, deliberately not faked here.
 */

import React, { useEffect, useState } from 'react';
import { Check, ChevronRight, Clock, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChallenges, type Challenge } from '../../../hooks/useChallenges';
import { CATEGORY_COLORS } from '../Challenges/ChallengesView';
import {
  BrowseAllButton,
  CategoryDot,
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

const MAX_MATCHES = 2;

const InlineChallengeFinder: React.FC = () => {
  const navigate = useNavigate();
  const { challenges, loading, joinChallenge } = useChallenges();
  const [matchIds, setMatchIds] = useState<string[] | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [attemptedIds, setAttemptedIds] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (!loading && matchIds === null) {
      setMatchIds(
        challenges
          .filter((c) => c.status === 'active' && !c.joined)
          .sort((a, b) => b.participants - a.participants)
          .slice(0, MAX_MATCHES)
          .map((c) => c.id),
      );
    }
  }, [loading, challenges, matchIds]);

  const matches = (matchIds ?? [])
    .map((id) => challenges.find((c) => c.id === id))
    .filter((c): c is Challenge => Boolean(c));

  const handleJoin = async (id: string) => {
    setJoiningId(id);
    await joinChallenge(id);
    setJoiningId(null);
    setAttemptedIds((prev) => new Set(prev).add(id));
  };

  if (loading || matchIds === null) {
    return (
      <FinderPanel id="coach-challenge-finder" role="region" aria-label="Challenge matches">
        <StatusLine>Finding challenges for you…</StatusLine>
      </FinderPanel>
    );
  }

  return (
    <FinderPanel id="coach-challenge-finder" role="region" aria-label="Challenge matches">
      {matches.length === 0 ? (
        <StatusLine>
          No open challenges right now — new ones are added regularly.
        </StatusLine>
      ) : (
        matches.map((match) => {
          const failed = attemptedIds.has(match.id) && !match.joined;
          return (
            <MatchRow key={match.id}>
              <CategoryDot $color={CATEGORY_COLORS[match.category]} aria-hidden="true" />
              <MatchInfo>
                <MatchTitle>{match.title}</MatchTitle>
                <MatchMeta>
                  <Users size={11} style={{ verticalAlign: '-1px' }} /> {match.participants} in
                  {match.daysLeft != null && (
                    <>
                      {' · '}
                      <Clock size={11} style={{ verticalAlign: '-1px' }} /> {match.daysLeft}d left
                    </>
                  )}
                </MatchMeta>
              </MatchInfo>
              {match.joined ? (
                <JoinedReceipt role="status">
                  <Check size={15} />
                  You're in
                </JoinedReceipt>
              ) : (
                <JoinButton
                  onClick={() => handleJoin(match.id)}
                  disabled={joiningId === match.id}
                  aria-label={`Join ${match.title}`}
                >
                  {joiningId === match.id ? 'Joining…' : 'Join'}
                </JoinButton>
              )}
              {failed && (
                <RetryLine role="status">
                  That join didn't go through — give it another tap.
                </RetryLine>
              )}
            </MatchRow>
          );
        })
      )}
      <BrowseAllButton onClick={() => navigate('/user-dashboard/challenges')}>
        Browse all challenges
        <ChevronRight size={14} />
      </BrowseAllButton>
    </FinderPanel>
  );
};

export default InlineChallengeFinder;
