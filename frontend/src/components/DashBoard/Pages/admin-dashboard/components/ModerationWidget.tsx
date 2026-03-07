import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, CheckCircle, XCircle, AlertTriangle, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../context/AuthContext';

const ModerationWidget: React.FC = () => {
  const { authAxios } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, flagged: 0, rejected: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchModeration = useCallback(async () => {
    try {
      const [postsRes, statsRes] = await Promise.all([
        authAxios.get('/api/admin/content/posts', { params: { status: 'pending', limit: 5 } }).catch(() => ({ data: { posts: [] } })),
        authAxios.get('/api/admin/content/stats').catch(() => ({ data: { stats: { pending: 0, approved: 0, flagged: 0, rejected: 0 } } }))
      ]);
      setPosts(postsRes.data?.posts || postsRes.data?.data?.posts || []);
      const s = statsRes.data?.stats || statsRes.data?.data || {};
      setStats({ pending: s.pending || 0, approved: s.approved || 0, flagged: s.flagged || 0, rejected: s.rejected || 0 });
    } catch { /* silently fail */ } finally { setIsLoading(false); }
  }, [authAxios]);

  useEffect(() => {
    let isMounted = true;
    fetchModeration();
    return () => { isMounted = false; };
  }, [fetchModeration]);

  const handleAction = useCallback(async (postId: string, action: 'approve' | 'reject' | 'delete') => {
    try {
      if (action === 'delete') {
        await authAxios.delete(`/api/admin/content/posts/${postId}`);
      } else {
        await authAxios.post('/api/admin/content/moderate', { contentId: postId, contentType: 'post', action });
      }
      setPosts(prev => prev.filter(p => (p.id || p._id) !== postId));
      setStats(prev => {
        const base = { ...prev, pending: Math.max(0, prev.pending - 1) };
        if (action === 'approve') return { ...base, approved: base.approved + 1 };
        if (action === 'reject') return { ...base, rejected: base.rejected + 1 };
        return base;
      });
    } catch (err) { console.error('Moderation action failed:', err); }
  }, [authAxios]);

  return (
    <ModPanel>
      <ModHeader>
        <ModHeaderLeft>
          <MessageSquare size={20} color="#00ffff" />
          <ModTitle>Content Moderation</ModTitle>
          {stats.pending > 0 && <ModBadge>{stats.pending}</ModBadge>}
        </ModHeaderLeft>
        <ModViewAll onClick={() => navigate('/dashboard/content/moderation')} aria-label="View all moderation items">
          View All <ExternalLink size={14} />
        </ModViewAll>
      </ModHeader>

      <ModStats>
        <ModStat><ModStatIcon $color="#f59e0b"><AlertTriangle size={14} /></ModStatIcon> {stats.pending} Pending</ModStat>
        <ModStat><ModStatIcon $color="#10b981"><CheckCircle size={14} /></ModStatIcon> {stats.approved} Approved</ModStat>
        <ModStat><ModStatIcon $color="#ef4444"><XCircle size={14} /></ModStatIcon> {stats.flagged + stats.rejected} Flagged</ModStat>
      </ModStats>

      {isLoading ? (
        <ModEmpty>Loading moderation queue...</ModEmpty>
      ) : posts.length === 0 ? (
        <ModEmpty>No content pending review</ModEmpty>
      ) : (
        <ModQueue>
          <AnimatePresence mode="popLayout">
            {posts.slice(0, 5).map((post: any) => {
              const id = post.id || post._id;
              const author = post.user || post.author || {};
              const name = `${author.firstName || 'Unknown'} ${author.lastName || ''}`.trim();
              return (
                <ModItem
                  key={id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <ModItemContent>
                    <ModItemAuthor>{name}</ModItemAuthor>
                    <ModItemText>{(post.content || '').slice(0, 80)}{(post.content || '').length > 80 ? '...' : ''}</ModItemText>
                  </ModItemContent>
                  <ModActions>
                    <ModActionBtn $color="#10b981" onClick={() => handleAction(id, 'approve')} title="Approve" aria-label="Approve post"><CheckCircle size={16} /></ModActionBtn>
                    <ModActionBtn $color="#ef4444" onClick={() => handleAction(id, 'reject')} title="Reject" aria-label="Reject post"><XCircle size={16} /></ModActionBtn>
                    <ModActionBtn $color="#94a3b8" onClick={() => handleAction(id, 'delete')} title="Delete" aria-label="Delete post"><Trash2 size={16} /></ModActionBtn>
                  </ModActions>
                </ModItem>
              );
            })}
          </AnimatePresence>
        </ModQueue>
      )}
    </ModPanel>
  );
};

// === Styled Components ===

const ModPanel = styled.div`
  background: rgba(10, 10, 26, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 1.5rem;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.3), transparent);
  }
`;

const ModHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const ModHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ModTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  margin: 0;
`;

const ModBadge = styled.span`
  background: #ef4444;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
  min-width: 20px;
  text-align: center;
`;

const ModViewAll = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: #00ffff;
  font-size: 0.8125rem;
  cursor: pointer;
  padding: 10px 14px;
  min-height: 44px;
  border-radius: 8px;
  transition: background 0.2s;
  &:hover { background: rgba(0, 255, 255, 0.1); }
  &:focus-visible { outline: 2px solid #00FFFF; outline-offset: 2px; }
`;

const ModStats = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const ModStat = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: rgba(255,255,255,0.7);
`;

const ModStatIcon = styled.span<{ $color: string }>`
  display: flex;
  color: ${p => p.$color};
`;

const ModEmpty = styled.div`
  text-align: center;
  padding: 24px;
  color: rgba(255,255,255,0.4);
  font-size: 0.875rem;
`;

const ModQueue = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ModItem = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(0, 255, 255, 0.15);
  }
`;

const ModItemContent = styled.div`
  flex: 1;
  min-width: 0;
  margin-right: 12px;
`;

const ModItemAuthor = styled.div`
  font-size: 0.8125rem;
  font-weight: 500;
  color: #e2e8f0;
`;

const ModItemText = styled.div`
  font-size: 0.8125rem;
  color: rgba(255,255,255,0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ModActions = styled.div`
  display: flex;
  gap: 4px;
  flex-shrink: 0;
`;

const ModActionBtn = styled.button<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: ${p => p.$color};
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: ${p => `${p.$color}15`};
    border-color: ${p => `${p.$color}30`};
    box-shadow: 0 0 12px ${p => `${p.$color}20`};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: 2px solid #00FFFF;
    outline-offset: 2px;
  }
`;

export default ModerationWidget;
