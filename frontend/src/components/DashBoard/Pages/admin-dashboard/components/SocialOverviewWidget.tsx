import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, MessageSquare, RefreshCw, Sparkles, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../context/AuthContext';
import {
  ActionButton,
  AlertText,
  Empty,
  FooterMetaRow,
  HeaderActions,
  HeaderRow,
  MetaRow,
  Metric,
  MetricsGrid,
  PostAuthor,
  PostItem,
  PostList,
  PostText,
  SOCIAL_ICE,
  SocialCommandCard,
  StatusPill,
  Title,
  TopRow,
} from './SocialOverviewWidget.styles';

interface SocialPost {
  id: number | string;
  userId: number | string;
  content: string;
  moderationStatus?: string;
  status?: string;
  likesCount?: number;
  commentsCount?: number;
  createdAt: string;
  userName?: string;
  engagement?: {
    likes?: number;
    comments?: number;
  };
  user?: {
    firstName?: string;
    lastName?: string;
  };
}

const normalizeSocialPost = (post: any): SocialPost => ({
  id: post.id,
  userId: post.userId,
  content: post.content || '',
  moderationStatus: post.moderationStatus || post.status || 'unknown',
  status: post.status,
  likesCount: post.likesCount ?? post.engagement?.likes ?? 0,
  commentsCount: post.commentsCount ?? post.engagement?.comments ?? 0,
  createdAt: post.createdAt || new Date().toISOString(),
  userName: post.userName,
  engagement: post.engagement,
  user: post.user,
});

const statusFor = (post: SocialPost) => (post.moderationStatus || post.status || 'unknown').toLowerCase();

const toName = (post: SocialPost) => {
  const firstName = post.user?.firstName || '';
  const lastName = post.user?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  return post.userName || fullName || `User #${post.userId}`;
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
      const response = await authAxios.get('/api/admin/content/posts', {
        params: { status: 'all', limit: 40, page: 1, sortBy: 'createdAt', sortOrder: 'DESC' },
      });
      const rows = Array.isArray(response.data?.data?.posts) ? response.data.data.posts : [];
      setPosts(rows.map(normalizeSocialPost));
    } catch (err) {
      console.error('Failed to load admin social overview metrics', err);
      setError('Could not load admin social metrics');
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
    <SocialCommandCard>
      <HeaderRow>
        <Title>
          <Sparkles size={16} color={SOCIAL_ICE} />
          Social Intelligence
        </Title>
        <HeaderActions>
          <ActionButton type="button" onClick={fetchPosts} disabled={loading}>
            <RefreshCw size={14} />
            Refresh
          </ActionButton>
          <ActionButton type="button" onClick={() => navigate('/dashboard/admin/content')}>
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

      <FooterMetaRow>
        <span>Last 24h posts: {metrics.last24h}</span>
      </FooterMetaRow>
    </SocialCommandCard>
  );
};

export default SocialOverviewWidget;
