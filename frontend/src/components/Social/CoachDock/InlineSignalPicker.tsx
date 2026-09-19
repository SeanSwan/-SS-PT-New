/**
 * ============================================================================
 * FILE: InlineSignalPicker.tsx
 * PURPOSE: Feed-anchored Coach Signal sender for the social dock (S1 of the
 *          Social Feed Upgrade blueprint — MEGA-BLUEPRINT.md §6 S1).
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Trainer/admin-only dock panel that lists ACTIVE
 * clients' recent celebration posts from the real feed and sends a rationed
 * gold "Coach Signal" (max 5 / coach / day, server-enforced) to one. The
 * member sees a gold banner on their post (CoachSignalBanner) plus a bell
 * entry.
 *
 * HOW IT FITS IN THE APP: Lazily mounted by SocialCoachDock only for
 * trainer/admin roles when the chip expands (data fetches fire on demand,
 * never on feed load — same posture as InlineCheerPicker).
 *
 * KEY DECISIONS:
 * - Clients lane: GET /api/assignments/trainer/:id returns the trainer's
 *   assignments (verified response shape: assignments[].client.id). Posts are
 *   pulled from the same feed endpoint the member sees — no new backend read.
 * - The server is the authority: 429 (daily cap), 409 (already signaled),
 *   403 (not their active coach) each render an honest status line.
 * - One shared optional note field — a tap sends; the note (<=120 chars)
 *   travels with that signal only.
 * - Reuses InlineChallengeFinder.styles dock-panel vocabulary (rule 27
 *   companion posture — no new visual class).
 */

import React, { useEffect, useState } from 'react';
import { Check, ChevronRight, ShieldCheck } from 'lucide-react';
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
  SignalNoteField,
  StatusLine,
} from './InlineChallengeFinder.styles';

/**
 * Post types a coach may recognize. MUST be a subset of the real SocialPost.type
 * ENUM — `general, workout, achievement, challenge, milestone, creative, dance,
 * music, singing, art, gaming, comedy` (backend/models/social/SocialPost.mjs:23).
 * The previous list invented `transformation`/`progress` (which do not exist) and
 * omitted `general` (the DEFAULT type of every post), starving the candidate list
 * (hostile review F4.1, 2026-09-18).
 */
const SIGNALABLE_TYPES = new Set([
  'general',
  'workout',
  'achievement',
  'challenge',
  'milestone',
]);

const TYPE_LABELS: Record<string, string> = {
  general: 'shared a post',
  workout: 'logged a workout',
  achievement: 'unlocked an achievement',
  challenge: 'shared a challenge win',
  milestone: 'hit a milestone',
};

interface SignalCandidate {
  postId: string;
  name: string;
  typeLabel: string;
  snippet: string;
}

type SendState = 'idle' | 'sending' | 'sent' | 'failed' | 'capped' | 'forbidden';

// The dock panel is a scan surface, not a feed: cap it so the coach picks a genuine
// standout rather than scrolling. 3 keeps the "signals stay precious" intent while
// giving a coach with many clients a real choice (hostile review F4.4).
const MAX_CANDIDATES = 3;

const InlineSignalPicker: React.FC = () => {
  const navigate = useNavigate();
  const { user, authAxios } = useAuth();
  const [candidates, setCandidates] = useState<SignalCandidate[] | null>(null);
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<ReadonlySet<string>>(new Set());
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(new Set());
  const [blocked, setBlocked] = useState<'capped' | 'forbidden' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [feedRes, clientsRes] = await Promise.allSettled([
        authAxios.get('/api/social/posts/feed', { params: { limit: 20, offset: 0 } }),
        authAxios.get(`/api/assignments/trainer/${user?.id ?? ''}`),
      ]);
      if (cancelled) return;

      const posts: any[] =
        feedRes.status === 'fulfilled' ? feedRes.value.data?.posts || [] : [];
      const assignments: any[] =
        clientsRes.status === 'fulfilled' ? clientsRes.value.data?.assignments || [] : [];
      const clientIds = new Set(
        assignments.map((a) => String(a?.client?.id ?? '')).filter(Boolean),
      );

      const signalable = posts.filter(
        (p) =>
          p?.user &&
          clientIds.has(String(p.user.id)) &&
          SIGNALABLE_TYPES.has(p.type) &&
          !p.coachSignal,
      );
      const picks = signalable.slice(0, MAX_CANDIDATES);

      setCandidates(
        picks.map((p) => ({
          postId: String(p.id),
          name: p.user.firstName || p.user.username || 'Your client',
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

  const handleSignal = async (candidate: SignalCandidate) => {
    if (busyId) return;
    // Never POST NaN: a non-numeric id would serialize to null and come back as a
    // confusing 422. Fail locally and honestly instead.
    const numericPostId = Number.parseInt(candidate.postId, 10);
    if (!Number.isInteger(numericPostId) || numericPostId < 1) {
      setFailedIds((prev) => new Set(prev).add(candidate.postId));
      return;
    }
    setBusyId(candidate.postId);
    try {
      await authAxios.post('/api/social/coach-signals', {
        postId: numericPostId,
        note: note.trim() || undefined,
      });
      setSentIds((prev) => new Set(prev).add(candidate.postId));
      setNote('');
    } catch (error: any) {
      if (error?.response?.status === 429) setBlocked('capped');
      else if (error?.response?.status === 403) setBlocked('forbidden');
      else setFailedIds((prev) => new Set(prev).add(candidate.postId));
    } finally {
      setBusyId(null);
    }
  };

  if (candidates === null) {
    return (
      <FinderPanel id="coach-signal-picker" role="region" aria-label="Send a coach signal">
        <StatusLine>Looking for client wins…</StatusLine>
      </FinderPanel>
    );
  }

  return (
    <FinderPanel id="coach-signal-picker" role="region" aria-label="Send a coach signal">
      {blocked === 'capped' && (
        <RetryLine role="status">Daily signal limit reached (5). Signals stay precious — try again tomorrow.</RetryLine>
      )}
      {blocked === 'forbidden' && (
        <RetryLine role="status">Only the member's active coach can send that signal.</RetryLine>
      )}
      {candidates.length === 0 ? (
        <StatusLine>No un-signaled client wins in your feed right now — they'll appear here after your clients train and share.</StatusLine>
      ) : (
        <>
          <MatchInfo>
            <SignalNoteField
              type="text"
              value={note}
              maxLength={120}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note (e.g. Proud of that PR)"
              aria-label="Optional signal note"
            />
          </MatchInfo>
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
              {sentIds.has(candidate.postId) ? (
                <JoinedReceipt role="status">
                  <Check size={15} />
                  Signaled
                </JoinedReceipt>
              ) : (
                <JoinButton
                  onClick={() => handleSignal(candidate)}
                  disabled={busyId === candidate.postId || blocked === 'capped'}
                  aria-label={`Send a coach signal to ${candidate.name}`}
                >
                  <ShieldCheck size={15} />
                  {busyId === candidate.postId ? 'Sending…' : 'Send Signal'}
                </JoinButton>
              )}
              {failedIds.has(candidate.postId) && !sentIds.has(candidate.postId) && (
                <RetryLine role="status">
                  That signal didn't go through — give it another tap.
                </RetryLine>
              )}
            </MatchRow>
          ))}
        </>
      )}
      <BrowseAllButton onClick={() => navigate('/user-dashboard/activity')}>
        See client activity
        <ChevronRight size={14} />
      </BrowseAllButton>
    </FinderPanel>
  );
};

export default InlineSignalPicker;
