/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: PostCard                                         ║
 * ║  PURPOSE: Orchestrator for a single social feed post card    ║
 * ║  OWNER: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22         ║
 * ║  LAST VALIDATED: 2026-03-22                                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌─────────────────────────────────────────────────────────┐
 * │ [PostMediaDisplay: hero image / video / swan watermark] │
 * ├─────────────────────────────────────────────────────────┤
 * │ [PostHeader: avatar, name, time, type chip, menu]       │
 * ├─────────────────────────────────────────────────────────┤
 * │ [PostContent: text, workout stats, achievement, images] │
 * ├─────────────────────────────────────────────────────────┤
 * │ [PostActions: like, heart, swan, comment, share]        │
 * ├─────────────────────────────────────────────────────────┤
 * │ [PostComments: comment list + input] (toggled)          │
 * └─────────────────────────────────────────────────────────┘
 *
 * MERMAID ARCHITECTURE:
 * graph TD
 *   A[PostCard] --> B[PostMediaDisplay]
 *   A --> C[PostHeader]
 *   A --> D[PostContent]
 *   A --> E[PostActions]
 *   A --> F[PostComments]
 *   A --> G[ReportPostModal]
 *
 * CLICK-OUTCOME FLOWCHART:
 * [Reaction btn] -> handleReaction -> onReact/onRemoveReaction -> XP toast
 * [Comment toggle] -> setShowComments -> reveals PostComments
 * [Share btn] -> setShareDialogOpen -> shows share modal with copy link
 * [Menu: Copy Link] -> copies post URL to clipboard
 * [Menu: Mute User] -> TODO: POST /api/social/mute
 * [Menu: Report Post] -> opens ReportPostModal -> POST /api/social/posts/:id/report
 * [Menu: Delete Post] -> confirm -> DELETE /api/social/posts/:id -> removes from feed
 * [Send comment] -> onComment callback -> POST /api/social/comments
 *
 * DATA FLOW:
 * Props In:  PostCardProps { post, onLike, onReact, onRemoveReaction, onComment, onDelete, onReport }
 * State:     { commentText, showComments, menuOpen, shareDialogOpen, reportModalOpen, toast state }
 * API Calls: None directly (parent Feed handles API calls via callbacks)
 * Events:    onLike, onReact, onRemoveReaction, onComment, onDelete, onReport
 * Children:  PostMediaDisplay, PostHeader, PostContent, PostActions, PostComments, ReportPostModal
 *
 * GAMIFICATION HOOKS:
 * - Reaction click -> triggerFromResult celebration effect at click position
 * - Points earned -> Toast notification with Gilded Fern gradient
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Star, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useCelebrationTriggers } from '../../../hooks/useCelebrationTriggers';
import type { PostCardProps } from './types/PostCardTypes';
import { CATEGORY_GRADIENTS } from './types/PostCardTypes';

// Sub-components
import PostMediaDisplay from './components/PostMediaDisplay';
import PostHeader from './components/PostHeader';
import PostContent from './components/PostContent';
import PostActions from './components/PostActions';
import PostComments from './components/PostComments';
import ReportPostModal from './components/ReportPostModal';

// Styles
import {
  PostCardWrapper,
  StyledDivider,
  Toast,
  ToastCloseBtn,
  Overlay,
  ModalContent,
  ModalTitle,
  ModalBody,
  ModalBodyText,
  ModalInputReadonly,
  ModalActions,
  PlainButton,
  ContainedButton,
} from './styles/PostCardStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: PostCard Orchestrator Component
// PURPOSE: Manages state and composes all sub-components
// ─────────────────────────────────────────────────────────────

const PostCard: React.FC<PostCardProps> = ({ post, onLike, onReact, onRemoveReaction, onComment, onDelete, onReport }) => {
  const { triggerFromResult } = useCelebrationTriggers();
  const { user } = useAuth();

  // UI state
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [transformationSliderValue] = useState(50);

  // Menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // Toast state
  const [showPointNotification, setShowPointNotification] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);

  // Derived values
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  const userReactions = post.userReactions || [];
  const reactionCounts = post.reactionCounts || { thumbs_up: 0, heart: 0, swan: 0 };
  const gradient = CATEGORY_GRADIENTS[post.type] || CATEGORY_GRADIENTS.general;
  const isOwnPost = !!(user?.id && user.id === post.user.id);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Sync toast visibility with notification state
  useEffect(() => {
    if (showPointNotification) {
      setToastVisible(true);
    }
  }, [showPointNotification]);

  // ─── Handlers ─────────────────────────────────────────────

  const handleReaction = async (reactionType: string, event?: React.MouseEvent) => {
    const isActive = userReactions.includes(reactionType);
    let result: any;

    if (isActive && onRemoveReaction) {
      result = await onRemoveReaction(post.id, reactionType);
    } else if (!isActive && onReact) {
      result = await onReact(post.id, reactionType);
    } else {
      result = await (onLike as any)(post.id);
    }

    // Fire celebration effect at click position
    if (result && result.pointsAwarded) {
      triggerFromResult(result, event);
      setPointsEarned(result.pointsAwarded);
      setShowPointNotification(true);
      setToastVisible(true);
      setTimeout(() => {
        setToastVisible(false);
        setTimeout(() => setShowPointNotification(false), 300);
      }, 3000);
    }
  };

  const handleSubmitComment = () => {
    if (commentText.trim()) {
      onComment(post.id, commentText);
      setCommentText('');
    }
  };

  const handleCommentKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShareDialogOpen(false);
    }
  }, []);

  const handleDismissToast = () => {
    setToastVisible(false);
    setTimeout(() => setShowPointNotification(false), 300);
  };

  // ─── Menu action handlers ─────────────────────────────────

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/social/posts/${post.id}`;
    navigator.clipboard.writeText(url).catch(() => {
      // Fallback silent
    });
  }, [post.id]);

  const handleMute = useCallback(() => {
    // TODO: Wire to POST /api/social/mute/:userId when backend supports it
    console.warn('TODO: implement mute user', post.user.id);
  }, [post.user.id]);

  const handleDeletePost = useCallback(async () => {
    if (!onDelete) return;
    const confirmed = window.confirm('Are you sure you want to delete this post? This cannot be undone.');
    if (confirmed) {
      await onDelete(post.id);
    }
  }, [onDelete, post.id]);

  const handleReportSubmit = useCallback(async (reason: string, description?: string) => {
    if (!onReport) return false;
    return onReport(post.id, reason, description);
  }, [onReport, post.id]);

  // ─── Render ───────────────────────────────────────────────

  return (
    <>
      <PostCardWrapper>
        <PostMediaDisplay post={post} gradient={gradient} />

        <PostHeader
          post={post}
          timeAgo={timeAgo}
          onMenuToggle={() => setMenuOpen(prev => !prev)}
          menuOpen={menuOpen}
          menuRef={menuRef as React.RefObject<HTMLDivElement>}
          onMenuClose={() => setMenuOpen(false)}
          onReport={() => setReportModalOpen(true)}
          onDelete={handleDeletePost}
          onCopyLink={handleCopyLink}
          onMute={handleMute}
          isOwnPost={isOwnPost}
        />

        <PostContent
          post={post}
          transformationSliderValue={transformationSliderValue}
        />

        <StyledDivider />

        <PostActions
          post={post}
          userReactions={userReactions}
          reactionCounts={reactionCounts}
          onReaction={handleReaction}
          showComments={showComments}
          onToggleComments={() => setShowComments(!showComments)}
          onShareClick={() => setShareDialogOpen(true)}
        />

        {showComments && (
          <>
            <StyledDivider />
            <PostComments
              comments={post.comments || []}
              currentUser={user ? { photo: user.photo, firstName: user.firstName } : undefined}
              commentText={commentText}
              onCommentTextChange={setCommentText}
              onSubmitComment={handleSubmitComment}
              onCommentKeyPress={handleCommentKeyPress}
            />
          </>
        )}

        {/* Share Dialog */}
        {shareDialogOpen && (
          <Overlay onClick={handleOverlayClick}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalTitle>Share Post</ModalTitle>
              <ModalBody>
                <ModalBodyText>
                  Share this post with friends or on other platforms.
                </ModalBodyText>
                <ModalInputReadonly
                  readOnly
                  value={`https://swanstudios.com/social/posts/${post.id}`}
                  onFocus={(e) => e.target.select()}
                />
              </ModalBody>
              <ModalActions>
                <PlainButton onClick={() => setShareDialogOpen(false)}>
                  Cancel
                </PlainButton>
                <ContainedButton
                  onClick={() => {
                    navigator.clipboard.writeText(`https://swanstudios.com/social/posts/${post.id}`);
                    setShareDialogOpen(false);
                  }}
                >
                  Copy Link
                </ContainedButton>
              </ModalActions>
            </ModalContent>
          </Overlay>
        )}
      </PostCardWrapper>

      {/* Report Post Modal */}
      {reportModalOpen && (
        <ReportPostModal
          onClose={() => setReportModalOpen(false)}
          onSubmit={handleReportSubmit}
        />
      )}

      {/* Point Notification Toast */}
      {showPointNotification && (
        <Toast $visible={toastVisible}>
          <Star size={18} />
          You earned {pointsEarned} points!
          <ToastCloseBtn onClick={handleDismissToast} title="Dismiss">
            <X size={14} />
          </ToastCloseBtn>
        </Toast>
      )}
    </>
  );
};

export default PostCard;
