import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MessageSquare, CheckCircle, XCircle, AlertTriangle, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../context/AuthContext';
import ModerationConfirmDialog from './ModerationConfirmDialog';
import {
  MODERATION_COLORS,
  ModActionBtn,
  ModActions,
  ModBadge,
  ModEmpty,
  ModError,
  ModHeader,
  ModHeaderLeft,
  ModItem,
  ModItemAuthor,
  ModItemContent,
  ModItemText,
  ModPanel,
  ModQueue,
  ModStat,
  ModStatIcon,
  ModStats,
  ModTitle,
  ModViewAll,
} from './ModerationWidget.styles';
import type { ModerationAction, ModerationPost, ModerationStats } from './ModerationWidget.types';

const EMPTY_MODERATION_STATS: ModerationStats = { pending: 0, approved: 0, flagged: 0, rejected: 0 };

const moderationAuthorName = (post: ModerationPost) => {
  const author = post.user || post.author || {};
  return `${author.firstName || 'Unknown'} ${author.lastName || ''}`.trim();
};

const moderationPostId = (post: ModerationPost) => String(post.id || post._id || '');

const ModerationWidget: React.FC = () => {
  const { authAxios } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<ModerationPost[]>([]);
  const [stats, setStats] = useState<ModerationStats>(EMPTY_MODERATION_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingDeletePost, setPendingDeletePost] = useState<ModerationPost | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const fetchModeration = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const [postsRes, statsRes] = await Promise.all([
        authAxios.get('/api/admin/content/posts', { params: { status: 'pending', limit: 5 } }),
        authAxios.get('/api/admin/content/stats')
      ]);
      setPosts(postsRes.data?.posts || postsRes.data?.data?.posts || []);
      const s = statsRes.data?.stats || statsRes.data?.data || {};
      setStats({ pending: s.pending || 0, approved: s.approved || 0, flagged: s.flagged || 0, rejected: s.rejected || 0 });
    } catch (err) {
      console.error('Moderation data fetch failed:', err);
      setPosts([]);
      setStats(EMPTY_MODERATION_STATS);
      setLoadError('Moderation data unavailable');
    } finally {
      setIsLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchModeration();
  }, [fetchModeration]);

  const handleAction = useCallback(async (postId: string, action: ModerationAction) => {
    try {
      if (action === 'delete') {
        await authAxios.delete(`/api/admin/content/posts/${postId}`);
      } else {
        await authAxios.post('/api/admin/content/moderate', { contentId: postId, contentType: 'post', action });
      }
      setPosts((prev) => prev.filter((post) => moderationPostId(post) !== postId));
      setStats((prev) => {
        const base = { ...prev, pending: Math.max(0, prev.pending - 1) };
        if (action === 'approve') return { ...base, approved: base.approved + 1 };
        if (action === 'reject') return { ...base, rejected: base.rejected + 1 };
        return base;
      });
      return true;
    } catch (err) {
      console.error('Moderation action failed:', err);
      return false;
    }
  }, [authAxios]);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDeletePost) return;

    const postId = moderationPostId(pendingDeletePost);
    if (!postId) return;

    setDeleteBusy(true);
    const deleted = await handleAction(postId, 'delete');
    setDeleteBusy(false);
    if (deleted) {
      setPendingDeletePost(null);
    }
  }, [handleAction, pendingDeletePost]);

  const pendingDeletePreview = pendingDeletePost?.content?.slice(0, 120) || '';

  return (
    <ModPanel>
      <ModHeader>
        <ModHeaderLeft>
          <MessageSquare size={20} color={MODERATION_COLORS.primary} />
          <ModTitle>Content Moderation</ModTitle>
          {stats.pending > 0 && <ModBadge>{stats.pending}</ModBadge>}
        </ModHeaderLeft>
        <ModViewAll onClick={() => navigate('/dashboard/admin/content')} aria-label="View all moderation items">
          View All <ExternalLink size={14} />
        </ModViewAll>
      </ModHeader>

      {loadError ? (
        <ModError role="alert">
          Moderation data unavailable. Open Content to review manually.
        </ModError>
      ) : (
        <ModStats>
          <ModStat><ModStatIcon $color={MODERATION_COLORS.warning}><AlertTriangle size={14} /></ModStatIcon> {stats.pending} Pending</ModStat>
          <ModStat><ModStatIcon $color={MODERATION_COLORS.success}><CheckCircle size={14} /></ModStatIcon> {stats.approved} Approved</ModStat>
          <ModStat><ModStatIcon $color={MODERATION_COLORS.error}><XCircle size={14} /></ModStatIcon> {stats.flagged + stats.rejected} Flagged</ModStat>
        </ModStats>
      )}

      {isLoading ? (
        <ModEmpty>Loading moderation queue...</ModEmpty>
      ) : loadError ? null : posts.length === 0 ? (
        <ModEmpty>No content pending review</ModEmpty>
      ) : (
        <ModQueue>
          <AnimatePresence mode="popLayout">
            {posts.slice(0, 5).map((post) => {
              const id = moderationPostId(post);
              const content = post.content || '';
              return (
                <ModItem key={id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50, scale: 0.95 }} transition={{ duration: 0.2 }}>
                  <ModItemContent>
                    <ModItemAuthor>{moderationAuthorName(post)}</ModItemAuthor>
                    <ModItemText>{content.slice(0, 80)}{content.length > 80 ? '...' : ''}</ModItemText>
                  </ModItemContent>
                  <ModActions>
                    <ModActionBtn $color={MODERATION_COLORS.success} onClick={() => handleAction(id, 'approve')} title="Approve" aria-label="Approve post"><CheckCircle size={16} /></ModActionBtn>
                    <ModActionBtn $color={MODERATION_COLORS.error} onClick={() => handleAction(id, 'reject')} title="Reject" aria-label="Reject post"><XCircle size={16} /></ModActionBtn>
                    <ModActionBtn $color={MODERATION_COLORS.muted} onClick={() => setPendingDeletePost(post)} title="Delete" aria-label="Delete post"><Trash2 size={16} /></ModActionBtn>
                  </ModActions>
                </ModItem>
              );
            })}
          </AnimatePresence>
        </ModQueue>
      )}
      {pendingDeletePost && (
        <ModerationConfirmDialog
          busy={deleteBusy}
          postPreview={pendingDeletePreview}
          onCancel={() => {
            if (!deleteBusy) setPendingDeletePost(null);
          }}
          onConfirm={handleConfirmDelete}
        />
      )}
    </ModPanel>
  );
};

export default ModerationWidget;
