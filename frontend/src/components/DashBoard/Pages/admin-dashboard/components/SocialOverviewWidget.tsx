import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, MessageSquare, RefreshCw, Sparkles, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../context/AuthContext';
import { CommandCard } from '../admin-dashboard-view';

interface SocialPost {
  id: number;
  userId: number;
  content: string;
  moderationStatus?: string;
  likesCount?: number;
  commentsCount?: number;
  createdAt: string;
  user?: {
    firstName?: string;
    lastName?: string;
  };
}

const T = {
  royalDepth: '#003080',
  iceWing: '#60C0F0',
  gildedFern: '#C6A84B',
  frostWhite: '#E0ECF4',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  glassSurface: 'linear-gradient(135deg, rgba(0, 48, 128, 0.45) 0%, rgba(0, 32, 96, 0.25) 100%)',
  glassBorder: 'rgba(198, 168, 75, 0.25)',
  textMuted: 'rgba(224, 236, 244, 0.65)',
};

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const Title = styled.h3`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${T.frostWhite};
  font-size: 1.05rem;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  min-height: 36px;
  padding: 0.4rem 0.8rem;
  border-radius: 10px;
  border: 1px solid ${T.glassBorder};
  background: ${T.glassSurface};
  color: ${T.frostWhite};
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  font-size: 0.8rem;

  &:hover {
    border-color: ${T.iceWing};
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(130px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }
`;

const Metric = styled.div`
  border: 1px solid ${T.glassBorder};
  background: ${T.glassSurface};
  border-radius: 12px;
  padding: 0.65rem 0.75rem;

  .label {
    color: ${T.textMuted};
    font-size: 0.73rem;
    margin-bottom: 0.25rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .value {
    color: ${T.frostWhite};
    font-size: 1.1rem;
    font-weight: 700;
  }
`;

const PostList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
`;

const PostItem = styled(motion.div)`
  border: 1px solid rgba(96, 192, 240, 0.2);
  background: rgba(0, 32, 96, 0.35);
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
`;

const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
`;

const PostAuthor = styled.div`
  color: ${T.frostWhite};
  font-size: 0.82rem;
  font-weight: 600;
`;

const MetaRow = styled.div`
  color: ${T.textMuted};
  font-size: 0.74rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
`;

const StatusPill = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border: 1px solid;

  ${({ $status }) => {
    if ($status === 'approved') {
      return `color:${T.success};background:rgba(34,197,94,0.12);border-color:rgba(34,197,94,0.4);`;
    }
    if ($status === 'flagged' || $status === 'pending') {
      return `color:${T.warning};background:rgba(245,158,11,0.12);border-color:rgba(245,158,11,0.4);`;
    }
    return `color:${T.danger};background:rgba(239,68,68,0.12);border-color:rgba(239,68,68,0.4);`;
  }}
`;

const PostText = styled.p`
  margin: 0;
  color: ${T.textMuted};
  font-size: 0.78rem;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const Empty = styled.div`
  text-align: center;
  color: ${T.textMuted};
  padding: 0.75rem 0;
  font-size: 0.85rem;
`;

const AlertText = styled.div`
  color: ${T.warning};
  font-size: 0.78rem;
  margin-bottom: 0.65rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const statusFor = (post: SocialPost) => (post.moderationStatus || 'unknown').toLowerCase();

const toName = (post: SocialPost) => {
  const firstName = post.user?.firstName || '';
  const lastName = post.user?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || `User #${post.userId}`;
};

const relativeTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(mins, 0)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const SocialOverviewWidget: React.FC = () => {
  const navigate = useNavigate();
  const { authAxios } = useAuth();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authAxios.get('/api/social/posts/feed?limit=40&offset=0');
      const rows = Array.isArray(response.data?.posts) ? response.data.posts : [];
      setPosts(rows);
    } catch (err) {
      console.error('Failed to load social overview feed', err);
      setError('Could not load social feed metrics');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const metrics = useMemo(() => {
    const activeCreators = new Set(posts.map((post) => post.userId)).size;
    const totalEngagement = posts.reduce(
      (sum, post) => sum + Number(post.likesCount || 0) + Number(post.commentsCount || 0),
      0
    );
    const pendingModeration = posts.filter((post) => {
      const status = statusFor(post);
      return status === 'pending' || status === 'flagged' || status === 'rejected' || status === 'hidden';
    }).length;
    const last24h = posts.filter((post) => {
      const time = new Date(post.createdAt).getTime();
      return Number.isFinite(time) && Date.now() - time <= 24 * 60 * 60 * 1000;
    }).length;

    return {
      totalPosts: posts.length,
      activeCreators,
      totalEngagement,
      pendingModeration,
      last24h,
    };
  }, [posts]);

  const recent = useMemo(() => posts.slice(0, 5), [posts]);

  return (
    <CommandCard style={{ padding: '1.15rem', marginBottom: '1.5rem', borderColor: T.glassBorder, background: T.glassSurface }}>
      <HeaderRow>
        <Title>
          <Sparkles size={16} color={T.iceWing} />
          Social Intelligence
        </Title>
        <HeaderActions>
          <ActionButton onClick={fetchPosts} disabled={loading}>
            <RefreshCw size={14} />
            Refresh
          </ActionButton>
          <ActionButton onClick={() => navigate('/dashboard/people/social')}>
            <MessageSquare size={14} />
            Open Command
          </ActionButton>
        </HeaderActions>
      </HeaderRow>

      <MetricsGrid>
        <Metric>
          <div className="label"><MessageSquare size={12} /> Posts</div>
          <div className="value">{metrics.totalPosts}</div>
        </Metric>
        <Metric>
          <div className="label"><Users size={12} /> Active Posters</div>
          <div className="value">{metrics.activeCreators}</div>
        </Metric>
        <Metric>
          <div className="label"><Activity size={12} /> Engagement</div>
          <div className="value">{metrics.totalEngagement}</div>
        </Metric>
        <Metric>
          <div className="label"><AlertTriangle size={12} /> Needs Review</div>
          <div className="value">{metrics.pendingModeration}</div>
        </Metric>
      </MetricsGrid>

      {metrics.pendingModeration > 0 && (
        <AlertText>
          <AlertTriangle size={14} />
          {metrics.pendingModeration} social posts need moderation attention.
        </AlertText>
      )}

      {loading ? (
        <Empty>Loading social snapshot...</Empty>
      ) : error ? (
        <Empty>{error}</Empty>
      ) : recent.length === 0 ? (
        <Empty>No social posts found.</Empty>
      ) : (
        <PostList>
          {recent.map((post, index) => (
            <PostItem
              key={post.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <TopRow>
                <PostAuthor>{toName(post)}</PostAuthor>
                <StatusPill $status={statusFor(post)}>{statusFor(post)}</StatusPill>
              </TopRow>
              <MetaRow>
                <span>{relativeTime(post.createdAt)}</span>
                <span>{post.likesCount || 0} likes</span>
                <span>{post.commentsCount || 0} comments</span>
              </MetaRow>
              <PostText>{post.content}</PostText>
            </PostItem>
          ))}
        </PostList>
      )}

      <MetaRow style={{ marginTop: '0.7rem' }}>
        <span>Last 24h posts: {metrics.last24h}</span>
      </MetaRow>
    </CommandCard>
  );
};

export default SocialOverviewWidget;
