/**
 * ClientPostsModal.tsx
 * Shows social media posts for a specific client.
 * Fetches from GET /api/social/feed (filtered by userId)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, MessageSquare, Heart, MessageCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import {
  ModalOverlay,
  ModalPanel,
  ModalHeader,
  ModalTitle,
  CloseButton,
  ModalBody,
  CenterContent,
  Spinner,
} from './copilot-shared-styles';

interface Props {
  open: boolean;
  clientId: number;
  clientName: string;
  onClose: () => void;
}

interface PostEntry {
  id: number;
  content: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  mediaUrl?: string;
}

const ClientPostsModal: React.FC<Props> = ({ open, clientId, clientName, onClose }) => {
  const { authAxios } = useAuth();
  const [posts, setPosts] = useState<PostEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await authAxios.get('/api/social/feed', { params: { userId: clientId, limit: 20 } });
      if (resp.data.success || resp.data.posts) {
        const raw = resp.data.posts || resp.data.data?.posts || [];
        setPosts(raw.map((p: any) => ({
          id: p.id,
          content: p.content || '',
          createdAt: p.createdAt || p.created_at || '',
          likesCount: p.likesCount ?? p.likes_count ?? 0,
          commentsCount: p.commentsCount ?? p.comments_count ?? 0,
          mediaUrl: p.mediaUrl || p.media_url || undefined,
        })));
      } else {
        setError(resp.data.message || 'Failed to load posts');
      }
    } catch (err: any) {
      // If the social endpoint doesn't support userId filter, show empty
      if (err.response?.status === 404) {
        setPosts([]);
      } else {
        setError(err.response?.data?.message || 'Failed to load posts');
      }
    } finally {
      setLoading(false);
    }
  }, [authAxios, clientId]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  if (!open) return null;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <ModalOverlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <ModalPanel style={{ maxWidth: 600 }}>
        <ModalHeader>
          <ModalTitle>
            <MessageSquare size={20} />
            Posts — {clientName}
          </ModalTitle>
          <CloseButton onClick={onClose} aria-label="Close">
            <X size={20} />
          </CloseButton>
        </ModalHeader>
        <ModalBody>
          {loading && (
            <CenterContent>
              <Spinner />
              <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>Loading posts...</p>
            </CenterContent>
          )}

          {error && (
            <div style={{
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              color: '#fca5a5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>{error}</span>
              <button
                onClick={fetchData}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(239,68,68,0.4)',
                  color: '#fca5a5',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  minHeight: 36,
                }}
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          {!loading && !error && posts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {posts.map((p) => (
                <div key={p.id} style={{
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                }}>
                  <p style={{ color: '#e2e8f0', fontSize: '0.9375rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                    {p.content || 'Shared media'}
                  </p>
                  {p.mediaUrl && (
                    <div style={{
                      marginBottom: '0.75rem',
                      borderRadius: 8,
                      overflow: 'hidden',
                      maxHeight: 200,
                    }}>
                      <img
                        src={p.mediaUrl}
                        alt="Post media"
                        style={{ width: '100%', objectFit: 'cover' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem' }}>
                        <Heart size={13} /> {p.likesCount}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem' }}>
                        <MessageCircle size={13} /> {p.commentsCount}
                      </span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                      {p.createdAt ? timeAgo(p.createdAt) : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && posts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.5)' }}>
              <MessageSquare size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
              <p>No posts yet</p>
            </div>
          )}
        </ModalBody>
      </ModalPanel>
    </ModalOverlay>
  );
};

export default ClientPostsModal;
