/**
 * ============================================================================
 * FILE: ClientCommunityPage.tsx
 * PURPOSE: Community hub with challenges, social feed, and leaderboard
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Shows active challenges, a social feed preview, quick
 * post creation form, and a leaderboard preview for the client.
 * HOW IT FITS IN THE APP: ClientDashboard → ClientCommunityPage (Community tab)
 * KEY DECISIONS: Quick post form POSTs to social API; challenges/feed use
 * empty states gracefully when no data exists.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: ClientCommunityPage                               ║
 * ║  PURPOSE: Community, challenges, and social feed for clients  ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-24                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ Quick Post: [text input................] [Post]            │
 * ├──────────────────────────┬─────────────────────────────────┤
 * │ Active Challenges        │ Leaderboard (top 5)             │
 * │ [card] [card] [card]     │ 1. Name — 5000 XP              │
 * ├──────────────────────────┴─────────────────────────────────┤
 * │ Social Feed (last 3 posts)                                 │
 * └────────────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  none
 * State:     { challenges, feed, postText, loading, error, posting }
 * API Calls: GET /api/social/challenges, GET /api/social/feed, POST /api/social/posts
 * Children:  none
 */

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { Users, Trophy, MessageSquare, Send, Clock, Swords, Medal } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const PageWrap = styled.div`
  padding: 1.5rem; min-height: 100%; color: var(--text-primary, #E0ECF4);
`;

const PostBox = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  border-radius: 12px; padding: 1rem; margin-bottom: 1.25rem;
  display: flex; gap: 0.75rem; align-items: flex-start;
`;

const PostInput = styled.textarea`
  flex: 1; min-height: 56px; padding: 0.75rem;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px; color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif; font-size: 0.875rem; resize: vertical;
  &:focus { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
  &::placeholder { color: var(--text-muted, #64748b); }
`;

const PostBtn = styled.button`
  min-height: 44px; min-width: 44px; padding: 0.625rem 1rem;
  border-radius: 10px; border: none; cursor: pointer;
  background: var(--accent-primary, #60C0F0); color: var(--bg-base, #030712);
  font-weight: 600; font-size: 0.875rem;
  display: flex; align-items: center; gap: 0.375rem;
  transition: opacity 0.2s;
  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const TwoCol = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const SectionCard = styled.div`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px; padding: 1.25rem;
  h3 { margin: 0 0 0.75rem; font-size: 1rem; font-family: 'Plus Jakarta Sans', sans-serif;
       display: flex; align-items: center; gap: 0.5rem; }
`;

const ChallengeCard = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(139, 92, 246, 0.15));
  border-radius: 10px; padding: 1rem; margin-bottom: 0.75rem;
  &:last-child { margin-bottom: 0; }
`;

const ChallengeTitle = styled.div`
  font-weight: 600; font-size: 0.9375rem; margin-bottom: 0.25rem;
`;

const ChallengeDesc = styled.div`
  font-size: 0.8125rem; color: var(--text-secondary, #94a3b8); margin-bottom: 0.625rem;
`;

const ChallengeFooter = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  font-size: 0.75rem; color: var(--text-muted, #64748b);
`;

const ProgressBarOuter = styled.div`
  flex: 1; max-width: 120px; height: 6px; border-radius: 3px;
  background: var(--bg-surface, #1A1A24); overflow: hidden; margin-right: 0.5rem;
`;

const ProgressBarInner = styled.div<{ $pct: number }>`
  height: 100%; border-radius: 3px; width: ${({ $pct }) => Math.min($pct, 100)}%;
  background: var(--accent-secondary, #8B5CF6); transition: width 0.4s;
`;

const LeaderRow = styled.div`
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  &:last-child { border-bottom: none; }
`;

const Rank = styled.span<{ $rank: number }>`
  width: 28px; height: 28px; border-radius: 50%; font-size: 0.75rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  background: ${({ $rank }) => $rank === 1 ? '#C6A84B22' : $rank === 2 ? '#C0C0C022' : '#CD7F3222'};
  color: ${({ $rank }) => $rank === 1 ? '#C6A84B' : $rank === 2 ? '#C0C0C0' : '#CD7F32'};
`;

const FeedPost = styled.div`
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  &:last-child { border-bottom: none; }
  .post-author { font-weight: 600; font-size: 0.875rem; }
  .post-body { font-size: 0.8125rem; color: var(--text-secondary, #94a3b8); margin-top: 0.25rem; }
  .post-time { font-size: 0.6875rem; color: var(--text-muted, #64748b); margin-top: 0.25rem; }
`;

const EmptyState = styled.p`
  color: var(--text-muted, #64748b); font-size: 0.875rem;
  text-align: center; padding: 1.5rem 0;
`;

const ShimmerBlock = styled.div`
  height: 80px; border-radius: 12px;
  background: linear-gradient(90deg, var(--bg-elevated, #141419) 25%, rgba(96,192,240,0.06) 50%, var(--bg-elevated, #141419) 75%);
  background-size: 200% 100%; animation: ${shimmer} 1.5s infinite;
`;

const ErrorBox = styled.div`
  background: var(--bg-elevated, #141419); border-left: 4px solid #C92A54;
  border-radius: 8px; padding: 1rem; margin-bottom: 1rem;
  color: var(--text-primary, #E0ECF4); font-size: 0.875rem;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const PLACEHOLDER_LEADERS = [
  { name: 'SwanAthlete1', xp: 12400 },
  { name: 'IronPhoenix', xp: 9800 },
  { name: 'CoreCrusher', xp: 7200 },
  { name: 'FlexMaster', xp: 5100 },
  { name: 'StrideKing', xp: 3600 },
];

const ClientCommunityPage: React.FC = () => {
  const { authAxios } = useAuth();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [postText, setPostText] = useState('');
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!authAxios) return;
      try {
        const [cRes, fRes] = await Promise.allSettled([
          authAxios.get('/api/social/challenges'),
          authAxios.get('/api/social/feed', { params: { limit: 3 } })
        ]);
        if (cRes.status === 'fulfilled') setChallenges(cRes.value?.data?.data || cRes.value?.data || []);
        if (fRes.status === 'fulfilled') setFeed(fRes.value?.data?.data || fRes.value?.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load community data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authAxios]);

  const handlePost = async () => {
    if (!postText.trim() || !authAxios) return;
    try {
      setPosting(true);
      await authAxios.post('/api/social/posts', { content: postText.trim(), type: 'text' });
      setPostText('');
      // Refresh feed
      const res = await authAxios.get('/api/social/feed', { params: { limit: 3 } });
      setFeed(res.data?.data || res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return <PageWrap><ShimmerBlock style={{ marginBottom: 12 }} /><ShimmerBlock style={{ height: 200 }} /></PageWrap>;
  }

  return (
    <PageWrap>
      {error && <ErrorBox>{error}</ErrorBox>}

      <PostBox>
        <PostInput value={postText} onChange={e => setPostText(e.target.value)}
          placeholder="Share an update with the community..." maxLength={500} />
        <PostBtn onClick={handlePost} disabled={posting || !postText.trim()}>
          <Send size={16} /> Post
        </PostBtn>
      </PostBox>

      <TwoCol>
        <SectionCard>
          <h3><Swords size={18} /> Active Challenges</h3>
          {challenges.length === 0
            ? <EmptyState>No active challenges right now. Check back soon!</EmptyState>
            : challenges.slice(0, 3).map((c: any, i: number) => (
              <ChallengeCard key={c.id || i}>
                <ChallengeTitle>{c.title || c.name || 'Challenge'}</ChallengeTitle>
                <ChallengeDesc>{c.description || 'Complete this challenge to earn rewards.'}</ChallengeDesc>
                <ChallengeFooter>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <ProgressBarOuter><ProgressBarInner $pct={c.progress || 0} /></ProgressBarOuter>
                    {c.progress || 0}%
                  </div>
                  <span><Clock size={12} style={{ marginRight: 4 }} />{c.daysRemaining || '?'} days left</span>
                </ChallengeFooter>
              </ChallengeCard>
            ))
          }
        </SectionCard>

        <SectionCard>
          <h3><Medal size={18} /> Leaderboard</h3>
          {PLACEHOLDER_LEADERS.map((l, i) => (
            <LeaderRow key={i}>
              <Rank $rank={i + 1}>{i + 1}</Rank>
              <span style={{ flex: 1, fontSize: '0.875rem' }}>{l.name}</span>
              <span style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.75rem', color: 'var(--accent-primary, #60C0F0)' }}>
                {l.xp.toLocaleString()} XP
              </span>
            </LeaderRow>
          ))}
        </SectionCard>
      </TwoCol>

      <SectionCard>
        <h3><MessageSquare size={18} /> Social Feed</h3>
        {feed.length === 0
          ? <EmptyState>No posts yet. Be the first to share something!</EmptyState>
          : feed.slice(0, 3).map((p: any, i: number) => (
            <FeedPost key={p.id || i}>
              <div className="post-author">{p.user?.firstName || p.authorName || 'Community Member'}</div>
              <div className="post-body">{p.content || p.text || ''}</div>
              <div className="post-time">{p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</div>
            </FeedPost>
          ))
        }
      </SectionCard>
    </PageWrap>
  );
};

export default ClientCommunityPage;
