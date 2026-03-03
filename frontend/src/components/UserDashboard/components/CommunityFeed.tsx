/**
 * SwanStudios Community Feed Component
 * ===================================
 *
 * Community feed wired to real social API via useSocialFeed hook.
 * Shows real posts from the user's feed with like/comment/share interactions.
 */

import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Share2,
  Star,
  Image as ImageIcon,
  Video,
  Smile,
  Loader2,
  RefreshCw,
  AlertCircle,
  Send,
  X
} from 'lucide-react';
import { useSocialFeed } from '../../../hooks/social/useSocialFeed';
import { useAuth } from '../../../context/AuthContext';

// ─── Styled Components ─────────────────────────────────────────────────────

const FeedContainer = styled(motion.div)`
  background: var(--bg-elevated);
  backdrop-filter: blur(24px);
  border: 1px solid var(--border-soft);
  border-radius: 20px;
  padding: 2rem;
  color: var(--text-primary);
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.15),
    0 8px 16px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 16px;
  }
`;

const FeedHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
`;

const FeedTitle = styled.h2`
  color: var(--text-primary);
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  @media (max-width: 768px) {
    font-size: 1.5rem;
    justify-content: center;
  }
`;

const RefreshButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.3s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary) 20%, transparent);
    border-color: var(--accent-primary);
    color: var(--accent-primary);
  }
`;

const CreatePostSection = styled.div`
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const PostInput = styled.textarea`
  width: 100%;
  min-height: 100px;
  background: var(--bg-base);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  padding: 1rem;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.5;
  resize: vertical;
  transition: all 0.3s ease;

  &::placeholder {
    color: var(--text-muted);
  }

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-primary) 20%, transparent);
  }
`;

const PostActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const PostOptions = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
`;

const PostOptionButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary) 20%, transparent);
    border-color: var(--accent-primary);
    color: var(--accent-primary);
    transform: translateY(-1px);
  }
`;

const PostButton = styled(motion.button)`
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const PostsStream = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const PostCard = styled(motion.div)`
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--accent-primary) 40%, transparent);
  }
`;

const PostHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 1.5rem 0;
`;

const PostAuthorImage = styled.div<{ $image?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ $image, theme }) =>
    $image ? `url(${$image})` : theme.gradients?.primary || 'linear-gradient(135deg, #3B82F6, #8B5CF6)'
  };
  background-size: cover;
  background-position: center;
  border: 2px solid ${({ theme }) => theme.colors?.primary + '40' || 'rgba(59, 130, 246, 0.4)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
`;

const PostAuthorInfo = styled.div`
  flex: 1;
`;

const PostAuthorName = styled.h4`
  color: var(--text-primary);
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
`;

const PostTimestamp = styled.p`
  color: var(--text-muted);
  font-size: 0.9rem;
  margin: 0;
`;

const PostContent = styled.div`
  padding: 1rem 1.5rem;
`;

const PostText = styled.p`
  color: var(--text-primary);
  font-size: 1rem;
  line-height: 1.6;
  margin: 0 0 1rem;
  word-wrap: break-word;
`;

const PostMedia = styled.img`
  width: 100%;
  max-height: 400px;
  object-fit: cover;
  margin-top: 0.5rem;
  border-radius: 8px;
`;

const PostFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem 1.5rem;
  border-top: 1px solid var(--border-soft);
  margin-top: 1rem;
  padding-top: 1rem;
`;

const PostInteractions = styled.div`
  display: flex;
  gap: 1.5rem;
  align-items: center;
`;

const InteractionButton = styled(motion.button)<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: ${({ $active }) =>
    $active ? 'var(--accent-primary)' : 'var(--text-secondary)'
  };
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.3s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
    color: var(--accent-primary);
    transform: scale(1.05);
  }
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
  color: var(--text-muted);
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
  color: var(--text-muted);
  text-align: center;
  line-height: 1.6;
`;

const LoadMoreButton = styled(motion.button)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.3s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary) 15%, transparent);
    border-color: var(--accent-primary);
    color: var(--accent-primary);
  }
`;

const CommentSection = styled(motion.div)`
  padding: 0 1.5rem 1.5rem;
  border-top: 1px solid var(--border-soft);
`;

const CommentInputRow = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.75rem;
`;

const CommentInput = styled.input`
  flex: 1;
  padding: 0.6rem 1rem;
  background: var(--bg-base);
  border: 1px solid var(--border-soft);
  border-radius: 20px;
  color: var(--text-primary);
  font-size: 0.9rem;

  &::placeholder {
    color: var(--text-muted);
  }

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
  }
`;

const CommentSendButton = styled(motion.button)`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent-primary);
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const CommentItem = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
`;

const CommentAuthor = styled.span`
  font-weight: 600;
  color: var(--text-primary);
`;

const FeelingPicker = styled(motion.div)`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.5rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  margin-top: 0.75rem;
`;

const FeelingOption = styled.button`
  padding: 0.4rem 0.6rem;
  background: none;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors?.primary + '20' || 'rgba(59, 130, 246, 0.2)'};
    border-color: ${({ theme }) => theme.colors?.primary || '#3B82F6'};
    transform: scale(1.15);
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const MediaPreview = styled.div`
  position: relative;
  margin-top: 0.75rem;
  border-radius: 8px;
  overflow: hidden;
  max-height: 200px;
`;

const MediaPreviewImage = styled.img`
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  border-radius: 8px;
`;

const MediaRemoveButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    background: rgba(0, 0, 0, 0.9);
  }
`;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(firstName?: string, lastName?: string, username?: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (username) return username.substring(0, 2).toUpperCase();
  return '??';
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ─── Component ──────────────────────────────────────────────────────────────

const FEELINGS = ['😊', '💪', '🔥', '🎯', '🏆', '❤️', '😎', '🙌', '⚡', '🌟'];

const CommunityFeed: React.FC = () => {
  const { user } = useAuth();
  const {
    posts,
    isLoading,
    error,
    hasMore,
    loadMore,
    isLoadingMore,
    refreshPosts,
    createPost,
    isCreatingPost,
    likePost,
    unlikePost,
    addComment,
  } = useSocialFeed();

  const [newPostContent, setNewPostContent] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [showFeelings, setShowFeelings] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [postComments, setPostComments] = useState<Record<string, any[]>>({});

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setMediaPreview(preview);
    }
  };

  const handleRemoveMedia = () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
      setMediaPreview(null);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || isCreatingPost) return;

    await createPost({
      content: newPostContent,
      type: 'general',
      visibility: 'friends',
    });

    setNewPostContent('');
    handleRemoveMedia();
    setShowFeelings(false);
  };

  const handleLikeToggle = async (postId: string, isLiked: boolean) => {
    if (isLiked) {
      await unlikePost(postId);
    } else {
      await likePost(postId);
    }
  };

  const handleToggleComments = (postId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const handleAddComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    try {
      await addComment(postId, content);
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleShare = async (postId: string) => {
    const shareUrl = `${window.location.origin}/social/post/${postId}`;
    const shareData = { title: 'Check out this post on SwanStudios', url: shareUrl };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(shareUrl); } catch { /* fallback */ }
    }
  };

  const handleFeelingSelect = (emoji: string) => {
    setNewPostContent(prev => prev + ' ' + emoji);
    setShowFeelings(false);
  };

  return (
    <FeedContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <FeedHeader>
        <FeedTitle>
          <Star size={24} />
          Community Feed
        </FeedTitle>
        <RefreshButton
          onClick={refreshPosts}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <RefreshCw size={16} />
          Refresh
        </RefreshButton>
      </FeedHeader>

      {/* Create New Post */}
      <CreatePostSection>
        <PostInput
          placeholder="Share your positive energy with the SwanStudios community... ✨"
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
          maxLength={500}
        />
        {/* Media Preview */}
        {mediaPreview && (
          <MediaPreview>
            <MediaPreviewImage src={mediaPreview} alt="Media preview" />
            <MediaRemoveButton onClick={handleRemoveMedia}>
              <X size={14} />
            </MediaRemoveButton>
          </MediaPreview>
        )}

        {/* Feeling Picker */}
        <AnimatePresence>
          {showFeelings && (
            <FeelingPicker
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {FEELINGS.map((emoji) => (
                <FeelingOption key={emoji} onClick={() => handleFeelingSelect(emoji)}>
                  {emoji}
                </FeelingOption>
              ))}
            </FeelingPicker>
          )}
        </AnimatePresence>

        <PostActions>
          <PostOptions>
            <PostOptionButton whileHover={{ scale: 1.05 }} onClick={() => photoInputRef.current?.click()}>
              <ImageIcon size={18} />
              Photo
            </PostOptionButton>
            <PostOptionButton whileHover={{ scale: 1.05 }} onClick={() => videoInputRef.current?.click()}>
              <Video size={18} />
              Video
            </PostOptionButton>
            <PostOptionButton whileHover={{ scale: 1.05 }} onClick={() => setShowFeelings(!showFeelings)}>
              <Smile size={18} />
              Feeling
            </PostOptionButton>
          </PostOptions>
          <PostButton
            onClick={handleCreatePost}
            disabled={!newPostContent.trim() || isCreatingPost}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isCreatingPost ? 'Posting...' : 'Share'}
          </PostButton>
        </PostActions>

        {/* Hidden file inputs */}
        <HiddenInput ref={photoInputRef} type="file" accept="image/*" onChange={handleMediaSelect} />
        <HiddenInput ref={videoInputRef} type="file" accept="video/*" onChange={handleMediaSelect} />
      </CreatePostSection>

      {/* Loading State */}
      {isLoading && (
        <LoadingState>
          <Loader2 size={32} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
          Loading feed...
        </LoadingState>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <EmptyState>
          <AlertCircle size={32} />
          Unable to load feed. Please try refreshing.
        </EmptyState>
      )}

      {/* Empty State */}
      {!isLoading && !error && posts.length === 0 && (
        <EmptyState>
          <Star size={32} />
          No posts yet! Be the first to share something with the community.
        </EmptyState>
      )}

      {/* Posts Stream */}
      {!isLoading && posts.length > 0 && (
        <PostsStream>
          <AnimatePresence>
            {posts.map((post, index) => {
              const authorName = post.user
                ? `${post.user.firstName || ''} ${post.user.lastName || ''}`.trim() || post.user.username
                : 'Unknown';
              const initials = post.user
                ? getInitials(post.user.firstName, post.user.lastName, post.user.username)
                : '??';

              return (
                <PostCard
                  key={post.id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                >
                  <PostHeader>
                    <PostAuthorImage $image={post.user?.photo || undefined}>
                      {!post.user?.photo && initials}
                    </PostAuthorImage>
                    <PostAuthorInfo>
                      <PostAuthorName>{authorName}</PostAuthorName>
                      <PostTimestamp>
                        @{post.user?.username || 'unknown'} &bull; {formatRelativeTime(post.createdAt)}
                      </PostTimestamp>
                    </PostAuthorInfo>
                  </PostHeader>

                  <PostContent>
                    <PostText>{post.content}</PostText>
                    {post.mediaUrl && <PostMedia src={post.mediaUrl} alt="Post media" />}
                  </PostContent>

                  <PostFooter>
                    <PostInteractions>
                      <InteractionButton
                        $active={post.isLiked}
                        onClick={() => handleLikeToggle(post.id, post.isLiked)}
                        whileHover={{ scale: 1.1 }}
                      >
                        <Heart size={18} fill={post.isLiked ? 'currentColor' : 'none'} />
                        {post.likesCount}
                      </InteractionButton>
                      <InteractionButton
                        $active={expandedComments.has(post.id)}
                        onClick={() => handleToggleComments(post.id)}
                        whileHover={{ scale: 1.1 }}
                      >
                        <MessageCircle size={18} />
                        {post.commentsCount}
                      </InteractionButton>
                      <InteractionButton
                        onClick={() => handleShare(post.id)}
                        whileHover={{ scale: 1.1 }}
                      >
                        <Share2 size={18} />
                      </InteractionButton>
                    </PostInteractions>
                  </PostFooter>

                  {/* Comment Section */}
                  <AnimatePresence>
                    {expandedComments.has(post.id) && (
                      <CommentSection
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        {/* Existing comments */}
                        {(postComments[post.id] || []).map((comment: any, ci: number) => (
                          <CommentItem key={ci}>
                            <CommentAuthor>{comment.author || 'User'}:</CommentAuthor>
                            {comment.content}
                          </CommentItem>
                        ))}

                        {/* Comment input */}
                        <CommentInputRow>
                          <CommentInput
                            placeholder="Write a comment..."
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddComment(post.id);
                            }}
                          />
                          <CommentSendButton
                            onClick={() => handleAddComment(post.id)}
                            disabled={!commentInputs[post.id]?.trim()}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Send size={14} />
                          </CommentSendButton>
                        </CommentInputRow>
                      </CommentSection>
                    )}
                  </AnimatePresence>
                </PostCard>
              );
            })}
          </AnimatePresence>

          {/* Load More */}
          {hasMore && (
            <LoadMoreButton
              onClick={loadMore}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoadingMore ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Loading more...
                </>
              ) : (
                'Load more posts'
              )}
            </LoadMoreButton>
          )}
        </PostsStream>
      )}
    </FeedContainer>
  );
};

export default CommunityFeed;
