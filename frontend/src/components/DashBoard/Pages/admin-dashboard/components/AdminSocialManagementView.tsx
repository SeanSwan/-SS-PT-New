/**
 * AdminSocialManagementView.tsx
 * =============================
 *
 * Social Media Command Center — Preset F-Alt "Enchanted Apex: Crystalline Swan"
 * Cinematic & Haptic System — Gemini-polished spatial UI spec
 *
 * Palette: Midnight Sapphire #002060, Royal Depth #003080, Ice Wing #60C0F0,
 *          Arctic Cyan #50A0F0, Gilded Fern #C6A84B, Frost White #E0ECF4
 *
 * Features:
 * - Real-time social feed from /api/social/posts/feed
 * - Haptic moderation (approve slides right, reject slides left) via API
 * - Dual-layer glassmorphism with Apple-style inner-lip shadows
 * - Spring-physics Framer Motion on all interactive elements
 * - Rarity-styled moderation badges with glow
 * - Aurora gradient header, gilded borders, ice-wing CTAs
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import {
  MessageSquare,
  Users,
  Heart,
  TrendingUp,
  Eye,
  Flag,
  Shield,
  BarChart3,
  RefreshCw,
  Search,
  MoreHorizontal,
  CheckCircle,
  AlertTriangle,
  Clock,
  Trash2,
  Settings,
  MessageCircle,
  Sparkles,
  Activity,
} from 'lucide-react';
import api from '../../../../../services/api';

// ─── F-Alt Crystalline Token Matrix (Mandatory — no hardcoded colors) ───
const T = {
  // ── Surface & Depths (The Ocean / The Night) ──
  midnightSapphire: '#002060',
  royalDepth:       '#003080',
  swanLavender:     '#4070C0',

  // ── Bioluminescence & Ice (The Glow) ──
  iceWing:          '#60C0F0',
  arcticCyan:       '#50A0F0',

  // ── Luxury & Status (The Contrast) ──
  gildedFern:       '#C6A84B',
  frostWhite:       '#E0ECF4',

  // ── Semantic Haptics ──
  success:          '#22C55E',
  warning:          '#F59E0B',
  danger:           '#EF4444',

  // ── Premium Composite Tokens ──
  glassSurface:     'linear-gradient(135deg, rgba(0, 48, 128, 0.45) 0%, rgba(0, 32, 96, 0.25) 100%)',
  glassBorder:      'rgba(198, 168, 75, 0.25)',
  glassHighlight:   'inset 0 1px 1px rgba(224, 236, 244, 0.15)',
  textMuted:        'rgba(224, 236, 244, 0.65)',
};

// ─── Framer Motion Spring Physics ────────────────────────────────────
const physics = {
  spring: { type: 'spring' as const, stiffness: 400, damping: 25, mass: 0.8 },
  snappy: { type: 'spring' as const, stiffness: 600, damping: 30 },
  glissando: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
};

// ─── Variant Color Helpers (ActionIcon) ──────────────────────────────
const variantColorMap: Record<string, string> = {
  approve: T.success,
  reject:  T.danger,
  flag:    T.warning,
  default: T.iceWing,
};
const getVariantColor = (v?: string) => variantColorMap[v || 'default'] || T.iceWing;

// ─── Keyframes ──────────────────────────────────────────────────────
const auroraShift = keyframes`
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

// ─── Styled Components (Cinematic & Haptic — Crystalline Swan) ──────

const SocialContainer = styled(motion.div)`
  padding: 2rem;
  min-height: 100dvh;
  color: ${T.frostWhite};

  @media (max-width: 768px) { padding: 1rem; }
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }
`;

const SocialHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid ${T.glassBorder};
  flex-wrap: wrap;
  gap: 1rem;
`;

const HeaderTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, ${T.iceWing} 0%, ${T.frostWhite} 40%, ${T.gildedFern} 100%);
  background-size: 200% auto;
  animation: ${auroraShift} 6s ease-in-out infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0;

  .header-icon {
    background: linear-gradient(135deg, ${T.royalDepth}, ${T.iceWing});
    border-radius: 14px;
    padding: 0.75rem;
    box-shadow: 0 8px 24px rgba(96, 192, 240, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-text-fill-color: ${T.frostWhite};
    color: ${T.frostWhite};
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
      case 'danger':  return T.danger;
      default:        return T.glassBorder;
    }
  }};
  background: ${props => {
    switch (props.$variant) {
      case 'primary': return `linear-gradient(135deg, ${T.royalDepth}, ${T.iceWing})`;
      case 'danger':  return T.danger;
      default:        return T.glassSurface;
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
  -webkit-backdrop-filter: blur(12px);
  box-shadow: ${T.glassHighlight};

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 1280px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 640px)  { grid-template-columns: 1fr; }
`;

const MetricCard = styled(motion.div)<{ $accent: string }>`
  background: ${T.glassSurface};
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid ${T.glassBorder};
  box-shadow: ${T.glassHighlight}, 0 12px 40px rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  position: relative;
  padding: 1.5rem;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: ${props => props.$accent};
    box-shadow: 0 2px 12px ${props => props.$accent};
    border-radius: 16px 16px 0 0;
  }

  .metric-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, ${props => props.$accent} 15%, transparent);
    color: ${props => props.$accent};
    border: 1px solid color-mix(in srgb, ${props => props.$accent} 30%, transparent);
  }

  .metric-value {
    font-size: 2rem;
    font-weight: 700;
    color: ${T.frostWhite};
    margin-top: 1rem;
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
  background: ${T.glassSurface};
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid ${T.glassBorder};
  box-shadow: ${T.glassHighlight}, 0 12px 40px rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  overflow: hidden;
`;

const SectionHeader = styled.div`
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(198, 168, 75, 0.12);
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
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: ${T.textMuted};
    }
  }
`;

const SearchInput = styled.input`
  width: 100%;
  background: rgba(0, 32, 96, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 12px;
  color: ${T.frostWhite};
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  font-size: 0.95rem;
  min-height: 44px;
  box-sizing: border-box;
  transition: all 0.3s ease;

  &::placeholder { color: ${T.textMuted}; }
  &:focus {
    outline: none;
    background: rgba(0, 48, 128, 0.7);
    border-color: ${T.iceWing};
    box-shadow: 0 0 0 4px rgba(96, 192, 240, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.2);
  }
`;

const FilterButton = styled(motion.button)<{ $active?: boolean }>`
  padding: 0.6rem 1.25rem;
  min-height: 44px;
  border-radius: 10px;
  font-weight: 500;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  border: 1px solid ${props => props.$active ? T.iceWing : 'rgba(255, 255, 255, 0.05)'};
  background: ${props => props.$active
    ? `linear-gradient(135deg, ${T.royalDepth}, ${T.swanLavender})`
    : 'transparent'};
  color: ${props => props.$active ? T.frostWhite : T.textMuted};
  box-shadow: ${props => props.$active ? '0 4px 12px rgba(96, 192, 240, 0.2)' : 'none'};

  &:hover {
    border-color: ${T.iceWing};
    color: ${T.frostWhite};
  }
`;

const PostCardStyled = styled(motion.div)`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  display: flex;
  gap: 1.25rem;

  &:hover {
    background: linear-gradient(90deg, transparent, rgba(96, 192, 240, 0.05), transparent);
  }
  &:last-child { border-bottom: none; }

  .post-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${T.midnightSapphire}, ${T.iceWing});
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${T.frostWhite};
    font-weight: 600;
    font-size: 0.95rem;
    flex-shrink: 0;
    border: 2px solid ${T.glassBorder};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .post-body { flex: 1; min-width: 0; }

  .post-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
    gap: 0.5rem;
  }

  .user-name { font-weight: 600; color: ${T.frostWhite}; font-size: 0.95rem; }
  .post-time { font-size: 0.75rem; color: ${T.textMuted}; }
  .post-actions { display: flex; gap: 0.4rem; flex-shrink: 0; }

  .post-text {
    color: ${T.textMuted};
    line-height: 1.6;
    margin: 0.75rem 0;
    font-size: 0.95rem;
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
  gap: 0.4rem;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;

  ${props => {
    const map: Record<string, { c: string; bg: string }> = {
      approved: { c: T.success,    bg: 'rgba(34, 197, 94, 0.15)' },
      pending:  { c: T.gildedFern, bg: 'rgba(198, 168, 75, 0.15)' },
      flagged:  { c: T.danger,     bg: 'rgba(239, 68, 68, 0.15)' },
    };
    const style = map[props.$status] || { c: T.iceWing, bg: 'rgba(96, 192, 240, 0.15)' };
    return `
      color: ${style.c};
      background: ${style.bg};
      border: 1px solid color-mix(in srgb, ${style.c} 40%, transparent);
      box-shadow: 0 0 12px color-mix(in srgb, ${style.c} 20%, transparent);
    `;
  }}
`;

const ActionIcon = styled(motion.button)<{ $variant?: 'approve' | 'reject' | 'flag' | 'default' }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, ${props => getVariantColor(props.$variant)} 20%, transparent);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, ${props => getVariantColor(props.$variant)} 10%, transparent);
  color: ${props => getVariantColor(props.$variant)};

  &:hover {
    background: color-mix(in srgb, ${props => getVariantColor(props.$variant)} 20%, transparent);
    box-shadow: 0 0 16px color-mix(in srgb, ${props => getVariantColor(props.$variant)} 40%, transparent);
  }
`;

const ActivityItem = styled.div`
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
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

  .activity-text { font-size: 0.85rem; color: ${T.frostWhite}; margin-bottom: 0.15rem; }
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

const Spinner = styled.div`
  display: inline-block;
  animation: ${spinAnimation} 1s linear infinite;
  line-height: 0;
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
  const [moderatedIds, setModeratedIds] = useState<Map<number, string>>(new Map());
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: number;
    type: string;
    content: string;
    timestamp: Date;
    icon: React.FC<{ size?: number }>;
  }>>([]);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await api.get('/api/social/posts/feed?limit=50&offset=0');
      const data = res.data;
      if (data.success) {
        setPosts(data.posts || []);
        setTotalPosts(data.pagination?.total || data.posts?.length || 0);
        setModeratedIds(new Map());
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

  // Haptic moderation: optimistic removal + directional exit animation
  const handlePostAction = async (postId: number, action: 'approve' | 'reject' | 'flag') => {
    const statusMap: Record<string, string> = { approve: 'approved', reject: 'rejected', flag: 'flagged' };
    // Track action for directional exit (approve = right, reject = left)
    setModeratedIds(prev => new Map(prev).set(postId, action));
    // Fire API in background
    try {
      await api.put(`/api/social/posts/${postId}`, { moderationStatus: statusMap[action] });
    } catch (err) {
      console.error(`Failed to ${action} post ${postId}:`, err);
      // Revert on failure
      setModeratedIds(prev => { const m = new Map(prev); m.delete(postId); return m; });
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

  // Filter posts: exclude moderated ones (they exit with animation)
  const filteredPosts = posts.filter(p => {
    if (moderatedIds.has(p.id)) return false;
    const matchesSearch = !searchTerm ||
      p.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${p.user?.firstName} ${p.user?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.moderationStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = posts.filter(p => p.moderationStatus === 'pending' && !moderatedIds.has(p.id)).length;
  const flaggedCount = posts.filter(p => p.moderationStatus === 'flagged' && !moderatedIds.has(p.id)).length;
  const totalLikes = posts.reduce((sum, p) => sum + (p.likesCount || 0), 0);

  // Metric card config for staggered entrance
  const metrics = [
    { accent: T.iceWing,   icon: MessageSquare, value: totalPosts, label: 'Total Posts', sub: 'Live data', subIcon: TrendingUp },
    { accent: T.success,   icon: Users,         value: new Set(posts.map(p => p.userId)).size, label: 'Active Posters', sub: 'Unique users', subIcon: TrendingUp },
    { accent: T.gildedFern, icon: Heart,        value: totalLikes, label: 'Total Engagement', sub: 'Likes across posts', subIcon: Heart },
    { accent: pendingCount > 0 ? T.warning : T.iceWing, icon: Shield, value: pendingCount, label: 'Pending Moderation', sub: `${flaggedCount} flagged`, subIcon: AlertTriangle },
  ];

  return (
    <SocialContainer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={physics.glissando}
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
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={physics.spring}
          >
            {refreshing
              ? <Spinner><RefreshCw size={15} /></Spinner>
              : <RefreshCw size={15} />
            }
            {refreshing ? 'Refreshing' : 'Refresh'}
          </ActionButton>
          <ActionButton
            $variant="primary"
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={physics.spring}
          >
            <BarChart3 size={15} />
            Export
          </ActionButton>
        </HeaderActions>
      </SocialHeader>

      {/* Metrics — Staggered entrance */}
      <MetricsGrid>
        {metrics.map((m, i) => (
          <MetricCard
            key={m.label}
            $accent={m.accent}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...physics.spring, delay: i * 0.1 }}
            whileHover={{ y: -4, scale: 1.01 }}
          >
            <div className="metric-icon"><m.icon size={20} /></div>
            <div className="metric-value">{m.value}</div>
            <div className="metric-label">{m.label}</div>
            <div className="metric-change"><m.subIcon size={12} /> {m.sub}</div>
          </MetricCard>
        ))}
      </MetricsGrid>

      {/* Content Grid */}
      <ContentGrid>
        {/* Posts Section */}
        <GlassPanel>
          <SectionHeader>
            <h2><MessageSquare size={18} /> Content Management</h2>
            <ActionButton
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={physics.snappy}
            >
              <Settings size={15} /> Bulk Actions
            </ActionButton>
          </SectionHeader>

          <SearchAndFilters>
            <div className="search-wrapper">
              <Search size={15} className="search-icon" />
              <SearchInput
                type="text"
                placeholder="Search posts, users, or content..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            {(['all', 'approved', 'pending', 'flagged'] as const).map(f => (
              <FilterButton
                key={f}
                $active={statusFilter === f}
                onClick={() => setStatusFilter(f)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={physics.snappy}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </FilterButton>
            ))}
          </SearchAndFilters>

          {loading ? (
            <EmptyState>
              <Spinner><RefreshCw size={32} /></Spinner>
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
            <AnimatePresence mode="popLayout">
              {filteredPosts.map(post => (
                <PostCardStyled
                  key={post.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    x: moderatedIds.get(post.id) === 'approve' ? 50 : -50,
                    scale: 0.95,
                  }}
                  transition={physics.spring}
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
                        <ActionIcon
                          $variant="approve"
                          onClick={() => handlePostAction(post.id, 'approve')}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.85 }}
                          transition={physics.snappy}
                          title="Approve"
                        >
                          <CheckCircle size={16} />
                        </ActionIcon>
                        <ActionIcon
                          $variant="flag"
                          onClick={() => handlePostAction(post.id, 'flag')}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.85 }}
                          transition={physics.snappy}
                          title="Flag"
                        >
                          <Flag size={16} />
                        </ActionIcon>
                        <ActionIcon
                          $variant="reject"
                          onClick={() => handlePostAction(post.id, 'reject')}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.85 }}
                          transition={physics.snappy}
                          title="Remove"
                        >
                          <Trash2 size={16} />
                        </ActionIcon>
                        <ActionIcon
                          $variant="default"
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.85 }}
                          transition={physics.snappy}
                          title="Details"
                        >
                          <MoreHorizontal size={16} />
                        </ActionIcon>
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
