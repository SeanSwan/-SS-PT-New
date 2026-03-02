/**
 * AdminSocialManagementView.tsx
 * =============================
 *
 * Social Media Command Center — Preset F-Alt "Enchanted Apex: Crystalline Swan"
 *
 * Palette: Midnight Sapphire #002060, Royal Depth #003080, Ice Wing #60C0F0,
 *          Arctic Cyan #50A0F0, Gilded Fern #C6A84B, Frost White #E0ECF4
 *
 * Features:
 * - Real-time social feed from /api/social/posts/feed
 * - Post moderation (approve / flag / reject) via API
 * - Metric cards with crystalline glass surfaces
 * - Rarity-styled moderation badges
 * - Aurora gradient header, gilded borders, ice-wing CTAs
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import {
  MessageSquare,
  Users,
  Heart,
  Share2,
  TrendingUp,
  Eye,
  Flag,
  Shield,
  BarChart3,
  RefreshCw,
  Search,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  UserCheck,
  Trash2,
  Settings,
  MessageCircle,
  Sparkles,
  Activity,
} from 'lucide-react';
import api from '../../../../../services/api';

// ─── F-Alt Token Constants ──────────────────────────────────────────
const T = {
  midnightSapphire: '#002060',
  royalDepth:       '#003080',
  iceWing:          '#60C0F0',
  arcticCyan:       '#50A0F0',
  gildedFern:       '#C6A84B',
  frostWhite:       '#E0ECF4',
  swanLavender:     '#4070C0',
  // Derived
  glass:       'rgba(0, 32, 96, 0.55)',
  glassBorder: 'rgba(198, 168, 75, 0.2)',
  glassHover:  'rgba(0, 48, 128, 0.7)',
  textPrimary: '#E0ECF4',
  textMuted:   'rgba(224, 236, 244, 0.6)',
  success:     '#22c55e',
  warning:     '#f59e0b',
  danger:      '#ef4444',
};

// ─── Keyframes ──────────────────────────────────────────────────────
const auroraShift = keyframes`
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(96, 192, 240, 0.2); }
  50%      { box-shadow: 0 0 20px rgba(96, 192, 240, 0.4); }
`;

// ─── Styled Components (F-Alt Crystalline Swan) ─────────────────────
const SocialContainer = styled(motion.div)`
  padding: 1.5rem;
  min-height: 100%;

  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }
`;

const SocialHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid ${T.glassBorder};
  flex-wrap: wrap;
  gap: 1rem;
`;

const HeaderTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  background: linear-gradient(135deg, ${T.iceWing} 0%, ${T.frostWhite} 50%, ${T.gildedFern} 100%);
  background-size: 200% 200%;
  animation: ${auroraShift} 6s ease infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;

  .header-icon {
    background: linear-gradient(135deg, ${T.royalDepth}, ${T.iceWing});
    border-radius: 12px;
    padding: 0.6rem;
    color: ${T.frostWhite};
    box-shadow: 0 4px 16px rgba(96, 192, 240, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-text-fill-color: ${T.frostWhite};
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
`;

const ActionButton = styled(motion.button)<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.6rem 1.25rem;
  border-radius: 12px;
  min-height: 44px;
  border: 1px solid ${props => {
    switch (props.$variant) {
      case 'primary': return T.iceWing;
      case 'danger': return T.danger;
      default: return T.glassBorder;
    }
  }};
  background: ${props => {
    switch (props.$variant) {
      case 'primary': return `linear-gradient(135deg, ${T.royalDepth}, ${T.iceWing})`;
      case 'danger': return T.danger;
      default: return T.glass;
    }
  }};
  color: ${T.frostWhite};
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  backdrop-filter: blur(12px);
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(96, 192, 240, 0.25);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (max-width: 1280px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 640px)  { grid-template-columns: 1fr; }
`;

const MetricCard = styled(motion.div)<{ $accent?: string }>`
  background: ${T.glass};
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 1.25rem;
  border: 1px solid ${T.glassBorder};
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.$accent || T.iceWing};
    border-radius: 16px 16px 0 0;
  }

  &:hover {
    border-color: rgba(96, 192, 240, 0.3);
    box-shadow: 0 8px 32px rgba(0, 32, 96, 0.4), 0 0 20px rgba(96, 192, 240, 0.1);
  }

  .metric-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(96, 192, 240, 0.1);
    color: ${props => props.$accent || T.iceWing};
    margin-bottom: 0.75rem;
  }

  .metric-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: ${T.frostWhite};
    margin-bottom: 0.25rem;
  }

  .metric-label {
    color: ${T.textMuted};
    font-size: 0.85rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .metric-change {
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: 500;
    color: ${T.textMuted};
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;

  @media (max-width: 1024px) { grid-template-columns: 1fr; }
`;

const GlassPanel = styled.div`
  background: ${T.glass};
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid ${T.glassBorder};
  overflow: hidden;
`;

const SectionHeader = styled.div`
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(198, 168, 75, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;

  h2, h3 {
    font-size: 1.1rem;
    font-weight: 600;
    color: ${T.frostWhite};
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const SearchAndFilters = styled.div`
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid rgba(198, 168, 75, 0.1);
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;

  .search-wrapper {
    flex: 1;
    min-width: 200px;
    position: relative;

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: ${T.textMuted};
    }
  }

  .search-input {
    width: 100%;
    padding: 0.6rem 1rem 0.6rem 2.5rem;
    border: 1px solid rgba(96, 192, 240, 0.2);
    border-radius: 10px;
    background: rgba(0, 32, 96, 0.4);
    color: ${T.frostWhite};
    font-size: 0.875rem;
    min-height: 44px;
    box-sizing: border-box;

    &::placeholder { color: ${T.textMuted}; }
    &:focus {
      outline: none;
      border-color: ${T.iceWing};
      box-shadow: 0 0 0 3px rgba(96, 192, 240, 0.15);
    }
  }
`;

const FilterButton = styled(motion.button)<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  min-height: 44px;
  border: 1px solid ${props => props.$active ? T.iceWing : 'rgba(96, 192, 240, 0.2)'};
  background: ${props => props.$active ? `linear-gradient(135deg, ${T.royalDepth}, ${T.swanLavender})` : 'transparent'};
  color: ${props => props.$active ? T.frostWhite : T.textMuted};
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    border-color: ${T.iceWing};
    color: ${T.frostWhite};
  }
`;

const PostCardStyled = styled(motion.div)`
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(198, 168, 75, 0.08);
  display: flex;
  gap: 1rem;
  transition: background 0.2s ease;

  &:hover { background: rgba(0, 48, 128, 0.3); }
  &:last-child { border-bottom: none; }

  .post-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${T.royalDepth}, ${T.iceWing});
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${T.frostWhite};
    font-weight: 600;
    font-size: 0.9rem;
    flex-shrink: 0;
    border: 2px solid ${T.glassBorder};
  }

  .post-body { flex: 1; min-width: 0; }

  .post-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
    gap: 0.5rem;
  }

  .user-name { font-weight: 600; color: ${T.frostWhite}; font-size: 0.9rem; }
  .post-time { font-size: 0.75rem; color: ${T.textMuted}; }
  .post-actions { display: flex; gap: 0.35rem; flex-shrink: 0; }

  .post-text {
    color: ${T.textMuted};
    line-height: 1.6;
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
    word-break: break-word;
  }

  .post-metrics {
    display: flex;
    gap: 1.25rem;
    margin-bottom: 0.5rem;

    .metric {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      color: ${T.textMuted};
    }
  }
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.65rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;

  ${props => {
    switch (props.$status) {
      case 'approved': return `background: rgba(34, 197, 94, 0.15); color: ${T.success}; border: 1px solid rgba(34, 197, 94, 0.3);`;
      case 'pending':  return `background: rgba(198, 168, 75, 0.15); color: ${T.gildedFern}; border: 1px solid rgba(198, 168, 75, 0.3);`;
      case 'flagged':  return `background: rgba(239, 68, 68, 0.15); color: ${T.danger}; border: 1px solid rgba(239, 68, 68, 0.3);`;
      default:         return `background: rgba(96, 192, 240, 0.1); color: ${T.iceWing}; border: 1px solid rgba(96, 192, 240, 0.2);`;
    }
  }}
`;

const ActionIcon = styled(motion.button)<{ $variant?: 'approve' | 'reject' | 'flag' | 'edit' }>`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  background: ${props => {
    switch (props.$variant) {
      case 'approve': return `rgba(34, 197, 94, 0.1)`;
      case 'reject':  return `rgba(239, 68, 68, 0.1)`;
      case 'flag':    return `rgba(245, 158, 11, 0.1)`;
      default:        return `rgba(96, 192, 240, 0.1)`;
    }
  }};
  color: ${props => {
    switch (props.$variant) {
      case 'approve': return T.success;
      case 'reject':  return T.danger;
      case 'flag':    return T.warning;
      default:        return T.iceWing;
    }
  }};

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 0 12px ${props => {
      switch (props.$variant) {
        case 'approve': return `rgba(34, 197, 94, 0.3)`;
        case 'reject':  return `rgba(239, 68, 68, 0.3)`;
        case 'flag':    return `rgba(245, 158, 11, 0.3)`;
        default:        return `rgba(96, 192, 240, 0.3)`;
      }
    }};
  }
`;

const ActivityItem = styled.div`
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid rgba(198, 168, 75, 0.08);
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;

  &:last-child { border-bottom: none; }

  .activity-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: rgba(96, 192, 240, 0.1);
    color: ${T.iceWing};
  }

  .activity-text { font-size: 0.85rem; color: ${T.textPrimary}; margin-bottom: 0.15rem; }
  .activity-time { font-size: 0.75rem; color: ${T.textMuted}; }
`;

const EmptyState = styled.div`
  padding: 3rem 1.5rem;
  text-align: center;
  color: ${T.textMuted};

  svg { margin-bottom: 1rem; opacity: 0.4; }
  h3 { color: ${T.frostWhite}; margin: 0 0 0.5rem; font-size: 1.1rem; }
  p { font-size: 0.9rem; margin: 0; }
`;

const LoadingDots = styled.span`
  &::after {
    content: '';
    animation: ${keyframes`0%{content:'.'} 33%{content:'..'} 66%{content:'...'}`} 1s steps(1) infinite;
  }
`;

// ─── Types ──────────────────────────────────────────────────────────
interface SocialPost {
  id: number;
  userId: number;
  content: string;
  type: string;
  visibility: string;
  moderationStatus: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
    photo?: string;
    role: string;
  };
}

// ─── Main Component ─────────────────────────────────────────────────
const AdminSocialManagementView: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'flagged'>('all');
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPosts, setTotalPosts] = useState(0);
  const [recentActivity, setRecentActivity] = useState<Array<{ id: number; type: string; content: string; timestamp: Date; icon: React.FC<{ size?: number }> }>>([]);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await api.get('/api/social/posts/feed?limit=50&offset=0');
      const data = res.data;
      if (data.success) {
        setPosts(data.posts || []);
        setTotalPosts(data.pagination?.total || data.posts?.length || 0);
        // Build recent activity from real posts
        const activities = (data.posts || []).slice(0, 4).map((p: SocialPost, i: number) => ({
          id: i,
          type: p.moderationStatus,
          content: `Post by ${p.user?.firstName || 'User'} ${p.user?.lastName || ''} — ${p.moderationStatus}`,
          timestamp: new Date(p.createdAt),
          icon: p.moderationStatus === 'approved' ? CheckCircle : p.moderationStatus === 'flagged' ? Flag : Clock,
        }));
        setRecentActivity(activities);
      }
    } catch (err) {
      console.error('Failed to fetch social posts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const handlePostAction = async (postId: number, action: 'approve' | 'reject' | 'flag') => {
    const statusMap: Record<string, string> = { approve: 'approved', reject: 'rejected', flag: 'flagged' };
    try {
      await api.put(`/api/social/posts/${postId}`, { moderationStatus: statusMap[action] });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, moderationStatus: statusMap[action] } : p));
    } catch (err) {
      console.error(`Failed to ${action} post ${postId}:`, err);
    }
  };

  const formatTimestamp = (ts: string | Date) => {
    const date = typeof ts === 'string' ? new Date(ts) : ts;
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return date.toLocaleDateString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle size={11} />;
      case 'pending':  return <Clock size={11} />;
      case 'flagged':  return <Flag size={11} />;
      default: return null;
    }
  };

  const getInitials = (post: SocialPost) => {
    if (post.user) return `${post.user.firstName?.[0] || ''}${post.user.lastName?.[0] || ''}`.toUpperCase();
    return '??';
  };

  const filteredPosts = posts.filter(p => {
    const matchesSearch = !searchTerm ||
      p.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${p.user?.firstName} ${p.user?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.moderationStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Compute metrics from real data
  const pendingCount = posts.filter(p => p.moderationStatus === 'pending').length;
  const flaggedCount = posts.filter(p => p.moderationStatus === 'flagged').length;
  const totalLikes = posts.reduce((sum, p) => sum + (p.likesCount || 0), 0);

  return (
    <SocialContainer
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <SocialHeader>
        <HeaderTitle>
          <div className="header-icon">
            <Sparkles size={22} />
          </div>
          Social Command Center
        </HeaderTitle>
        <HeaderActions>
          <ActionButton
            onClick={handleRefresh}
            disabled={refreshing}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing' : 'Refresh'}
          </ActionButton>
          <ActionButton
            $variant="primary"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <BarChart3 size={15} />
            Export
          </ActionButton>
        </HeaderActions>
      </SocialHeader>

      {/* Metrics */}
      <MetricsGrid>
        <MetricCard $accent={T.iceWing} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
          <div className="metric-icon"><MessageSquare size={20} /></div>
          <div className="metric-value">{totalPosts}</div>
          <div className="metric-label">Total Posts</div>
          <div className="metric-change"><TrendingUp size={12} /> Live data</div>
        </MetricCard>

        <MetricCard $accent={T.success} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
          <div className="metric-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: T.success }}><Users size={20} /></div>
          <div className="metric-value">{new Set(posts.map(p => p.userId)).size}</div>
          <div className="metric-label">Active Posters</div>
          <div className="metric-change"><TrendingUp size={12} /> Unique users</div>
        </MetricCard>

        <MetricCard $accent={T.gildedFern} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
          <div className="metric-icon" style={{ background: 'rgba(198, 168, 75, 0.1)', color: T.gildedFern }}><Heart size={20} /></div>
          <div className="metric-value">{totalLikes}</div>
          <div className="metric-label">Total Engagement</div>
          <div className="metric-change"><Heart size={12} /> Likes across posts</div>
        </MetricCard>

        <MetricCard $accent={pendingCount > 0 ? T.warning : T.iceWing} whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
          <div className="metric-icon" style={{ background: pendingCount > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(96, 192, 240, 0.1)', color: pendingCount > 0 ? T.warning : T.iceWing }}><Shield size={20} /></div>
          <div className="metric-value">{pendingCount}</div>
          <div className="metric-label">Pending Moderation</div>
          <div className="metric-change"><AlertTriangle size={12} /> {flaggedCount} flagged</div>
        </MetricCard>
      </MetricsGrid>

      {/* Content Grid */}
      <ContentGrid>
        {/* Posts Section */}
        <GlassPanel>
          <SectionHeader>
            <h2><MessageSquare size={18} /> Content Management</h2>
            <ActionButton whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Settings size={15} /> Bulk Actions
            </ActionButton>
          </SectionHeader>

          <SearchAndFilters>
            <div className="search-wrapper">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                placeholder="Search posts, users, or content..."
                className="search-input"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            {(['all', 'approved', 'pending', 'flagged'] as const).map(f => (
              <FilterButton
                key={f}
                $active={statusFilter === f}
                onClick={() => setStatusFilter(f)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </FilterButton>
            ))}
          </SearchAndFilters>

          {loading ? (
            <EmptyState>
              <RefreshCw size={32} className="animate-spin" />
              <h3>Loading posts<LoadingDots /></h3>
              <p>Fetching from social feed API</p>
            </EmptyState>
          ) : filteredPosts.length === 0 ? (
            <EmptyState>
              <MessageSquare size={40} />
              <h3>No posts found</h3>
              <p>{searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'The social feed is empty — create the first post!'}</p>
            </EmptyState>
          ) : (
            <AnimatePresence>
              {filteredPosts.map(post => (
                <PostCardStyled
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="post-avatar">{getInitials(post)}</div>
                  <div className="post-body">
                    <div className="post-header">
                      <div>
                        <div className="user-name">
                          {post.user ? `${post.user.firstName} ${post.user.lastName}` : `User #${post.userId}`}
                        </div>
                        <div className="post-time">{formatTimestamp(post.createdAt)}</div>
                      </div>
                      <div className="post-actions">
                        <ActionIcon $variant="approve" onClick={() => handlePostAction(post.id, 'approve')} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="Approve"><CheckCircle size={14} /></ActionIcon>
                        <ActionIcon $variant="flag" onClick={() => handlePostAction(post.id, 'flag')} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="Flag"><Flag size={14} /></ActionIcon>
                        <ActionIcon $variant="reject" onClick={() => handlePostAction(post.id, 'reject')} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="Remove"><Trash2 size={14} /></ActionIcon>
                        <ActionIcon $variant="edit" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="Details"><MoreHorizontal size={14} /></ActionIcon>
                      </div>
                    </div>
                    <div className="post-text">{post.content}</div>
                    <div className="post-metrics">
                      <div className="metric"><Heart size={14} /> {post.likesCount}</div>
                      <div className="metric"><MessageCircle size={14} /> {post.commentsCount}</div>
                      <div className="metric"><Eye size={14} /> {post.type}</div>
                    </div>
                    <StatusBadge $status={post.moderationStatus}>
                      {getStatusIcon(post.moderationStatus)}
                      {post.moderationStatus}
                    </StatusBadge>
                  </div>
                </PostCardStyled>
              ))}
            </AnimatePresence>
          )}
        </GlassPanel>

        {/* Activity Sidebar */}
        <GlassPanel style={{ height: 'fit-content' }}>
          <SectionHeader>
            <h3><Activity size={16} /> Recent Activity</h3>
          </SectionHeader>
          {recentActivity.length === 0 ? (
            <EmptyState>
              <Clock size={28} />
              <p>No recent activity</p>
            </EmptyState>
          ) : (
            recentActivity.map(activity => (
              <ActivityItem key={activity.id}>
                <div className="activity-icon"><activity.icon size={14} /></div>
                <div>
                  <div className="activity-text">{activity.content}</div>
                  <div className="activity-time">{formatTimestamp(activity.timestamp)}</div>
                </div>
              </ActivityItem>
            ))
          )}
        </GlassPanel>
      </ContentGrid>
    </SocialContainer>
  );
};

export default AdminSocialManagementView;
