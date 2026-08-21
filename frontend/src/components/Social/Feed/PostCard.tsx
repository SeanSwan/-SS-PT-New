/**
 * COMPONENT: PostCard
 * PURPOSE: Canonical SwanStudios social feed card orchestrator.
 * FLOW: SocialPage.V3 -> SocialFeed -> PostCard -> callbacks in useSocialFeed.
 * API: parent callback deletes via DELETE /api/social/posts/:postId.
 * CHILDREN: media, header/menu, content, actions, comments, share/report/delete dialogs.
 * UX: destructive actions use in-app confirmations, not browser dialogs.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Star, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useCelebrationTriggers } from '../../../hooks/useCelebrationTriggers';
import { usePostCardModeration } from './hooks/usePostCardModeration';
import type { PostCardProps } from './types/PostCardTypes';
import { CATEGORY_GRADIENTS } from './types/PostCardTypes';

import PostMediaDisplay from './components/PostMediaDisplay';
import PostHeader from './components/PostHeader';
import PostContent from './components/PostContent';
import PostActions from './components/PostActions';
import PostComments from './components/PostComments';
import ReportPostModal from './components/ReportPostModal';
import DeletePostConfirmDialog from './components/DeletePostConfirmDialog';
import PostEditComposer from './components/PostEditComposer';
import PostShareDialog from './components/PostShareDialog';

import {
  PostCardWrapper,
  StyledDivider,
  Toast,
  ToastCloseBtn,
} from './styles/PostCardStyles';

const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onReact,
  onRemoveReaction,
  onComment,
  onDelete,
  onEdit,
  onReport,
  onRepost,
  onLoadComments,
  readOnly = false,
  contextSlot,
}) => {
  const { triggerFromResult } = useCelebrationTriggers();
  const { user } = useAuth();

  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [commentsRequested, setCommentsRequested] = useState(false);
  const [transformationSliderValue] = useState(50);

  const {
    menuOpen, setMenuOpen, menuRef,
    editMode, setEditMode, editContent, setEditContent, isSavingEdit,
    reportModalOpen, setReportModalOpen,
    shareDialogOpen, setShareDialogOpen,
    deleteConfirmOpen, setDeleteConfirmOpen, isDeletingPost,
    handleCopyLink, handleEditPost, handleSaveEdit,
    handleDeletePost, handleConfirmDeletePost, handleReportSubmit, handleRepost,
  } = usePostCardModeration({ post, onEdit, onDelete, onReport, onRepost });

  const [showPointNotification, setShowPointNotification] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  const userReactions = post.userReactions || [];
  const reactionCounts = post.reactionCounts || { thumbs_up: 0, heart: 0, swan: 0 };
  const gradient = CATEGORY_GRADIENTS[post.type] || CATEGORY_GRADIENTS.general;
  const isOwnPost = !!(user?.id && user.id === post.user.id);

  useEffect(() => {
    if (showPointNotification) {
      setToastVisible(true);
    }
  }, [showPointNotification]);

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

  const handleDismissToast = () => {
    setToastVisible(false);
    setTimeout(() => setShowPointNotification(false), 300);
  };

  /* Comment threads load on first open: feed payloads carry counts only, so
     existing comments (including coach answers) must be fetched here. */
  const handleToggleComments = useCallback(() => {
    setShowComments(prev => {
      const needsThread = !prev && !commentsRequested && !!onLoadComments
        && post.commentsCount > 0 && (post.comments?.length ?? 0) === 0;
      if (needsThread) {
        setCommentsRequested(true);
        void onLoadComments!(post.id);
      }
      return !prev;
    });
  }, [commentsRequested, onLoadComments, post.comments?.length, post.commentsCount, post.id]);

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
          onEdit={handleEditPost}
          onCopyLink={handleCopyLink}
          isOwnPost={isOwnPost}
          readOnly={readOnly}
        />

        {editMode ? (
          <PostEditComposer
            content={editContent}
            disabled={isSavingEdit}
            canSave={!!editContent.trim()}
            onChange={setEditContent}
            onCancel={() => setEditMode(false)}
            onSave={handleSaveEdit}
          />
        ) : (
          <PostContent
            post={post}
            transformationSliderValue={transformationSliderValue}
          />
        )}

        {contextSlot}

        {!readOnly && (
          <>
            <StyledDivider />

            <PostActions
              post={post}
              userReactions={userReactions}
              reactionCounts={reactionCounts}
              onReaction={handleReaction}
              showComments={showComments}
              onToggleComments={handleToggleComments}
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

            {shareDialogOpen && (
              <PostShareDialog
                postId={post.id}
                canRepost={!!onRepost && !isOwnPost}
                onClose={() => setShareDialogOpen(false)}
                onRepost={handleRepost}
              />
            )}
          </>
        )}
      </PostCardWrapper>

      {/* Report Post Modal */}
      {reportModalOpen && (
        <ReportPostModal
          onClose={() => setReportModalOpen(false)}
          onSubmit={handleReportSubmit}
        />
      )}

      {deleteConfirmOpen && (
        <DeletePostConfirmDialog
          busy={isDeletingPost}
          onCancel={() => setDeleteConfirmOpen(false)}
          onConfirm={handleConfirmDeletePost}
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

export default React.memo(PostCard);
