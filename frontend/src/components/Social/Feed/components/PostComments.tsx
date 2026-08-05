/**
 * ┌─── SUB-COMPONENT: PostComments ────────────────────────────┐
 * │ PARENT: PostCard                                            │
 * │ PURPOSE: Renders threaded comment list (1-level deep) and   │
 * │          the new-comment input bar with reply support.       │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────────────────────┐  │
 * │ │ [Avatar] Author Name                                   │  │
 * │ │          Comment text here...                          │  │
 * │ │          2 hours ago  · Reply                          │  │
 * │ │          ┌──────────────────────────────────┐          │  │
 * │ │          │ [Av] Reply Author                 │          │  │
 * │ │          │      Reply text...                │          │  │
 * │ │          └──────────────────────────────────┘          │  │
 * │ │ ─────────────────────────────────────────              │  │
 * │ │ [Avatar] [Write a comment...       ] [Send]            │  │
 * │ └────────────────────────────────────────────────────────┘  │
 * │ Props: PostCommentsProps                                    │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Send] -> onSubmitComment -> POST /api/social/comments      │
 * │ [Reply] -> focuses input with @mention + parentCommentId    │
 * │ GAMIFICATION: Comment submission awards 15 pts (via parent) │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Send, CornerDownRight, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { PostCommentsProps, Comment } from '../types/PostCardTypes';
import { isCoachRole } from '../types/PostCardTypes';
import { AvatarEl } from './PostHeader';
import {
  CoachChip,
  CommentsSection,
  CommentsList,
  CommentItem,
  CommentBubble,
  CommentAuthor,
  CommentBody,
  CommentTime,
  CommentInput,
  CommentTextarea,
  NoCommentsText,
  IconBtn,
} from '../styles/PostCardStyles';
import styled from 'styled-components';
import { StyledBox } from '@/components/ui/StyledBox';

// ─────────────────────────────────────────────────────────────
// SECTION: Thread Helpers
// PURPOSE: Group comments into parent + replies (1-level deep)
// ─────────────────────────────────────────────────────────────

function buildThreads(comments: Comment[]): Comment[] {
  const parentMap = new Map<string, Comment[]>();
  const roots: Comment[] = [];

  for (const c of comments) {
    if (c.parentCommentId) {
      const existing = parentMap.get(c.parentCommentId) || [];
      existing.push(c);
      parentMap.set(c.parentCommentId, existing);
    } else {
      roots.push({ ...c, replies: [] });
    }
  }

  for (const root of roots) {
    root.replies = parentMap.get(root.id) || [];
  }

  return roots;
}

// ─────────────────────────────────────────────────────────────
// SECTION: PostComments Component
// ─────────────────────────────────────────────────────────────

const PostComments: React.FC<PostCommentsProps> = React.memo(({
  comments,
  currentUser,
  commentText,
  onCommentTextChange,
  onSubmitComment,
  onCommentKeyPress,
}) => {
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const threads = useMemo(() => buildThreads(comments || []), [comments]);

  const handleReply = useCallback((commentId: string, firstName: string) => {
    setReplyingTo({ id: commentId, name: firstName });
    onCommentTextChange(`@${firstName} `);
  }, [onCommentTextChange]);

  const handleSubmit = useCallback(() => {
    onSubmitComment();
    setReplyingTo(null);
  }, [onSubmitComment]);

  const renderComment = (comment: Comment, isReply = false) => (
    <StyledBox as={CommentItem} key={comment.id} $style={isReply ? { paddingLeft: 24 } : undefined}>
      <AvatarEl
        src={comment.user.photo || undefined}
        alt={[comment.user.firstName, comment.user.lastName].filter(Boolean).join(' ')}
        fallback={`${comment.user.firstName?.[0] ?? ''}${comment.user.lastName?.[0] ?? ''}` || '?'}
        size={isReply ? 26 : 32}
        coach={isCoachRole(comment.user.role)}
      />
      <StyledBox as="div" $style={{ flex: 1 }}>
        <CommentBubble>
          <CommentAuthor>
            {isReply && <StyledBox as={CornerDownRight} size={12} $style={{ marginRight: 4, opacity: 0.4 }} />}
            {[comment.user.firstName, comment.user.lastName].filter(Boolean).join(' ')}
            {/* A coach answered — the gold mark makes the reply load-bearing. */}
            {isCoachRole(comment.user.role) && (
              <CoachChip title="SwanStudios Coach">
                <ShieldCheck size={10} aria-hidden="true" />
                Coach
              </CoachChip>
            )}
          </CommentAuthor>
          <CommentBody>{comment.content}</CommentBody>
        </CommentBubble>
        <CommentMeta>
          <CommentTime>
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </CommentTime>
          {!isReply && (
            <ReplyBtn onClick={() => handleReply(comment.id, comment.user.firstName)}>
              Reply
            </ReplyBtn>
          )}
        </CommentMeta>
      </StyledBox>
    </StyledBox>
  );

  return (
    <CommentsSection>
      {threads.length > 0 ? (
        <CommentsList>
          {threads.map(comment => (
            <React.Fragment key={comment.id}>
              {renderComment(comment)}
              {comment.replies?.map(reply => renderComment(reply, true))}
            </React.Fragment>
          ))}
        </CommentsList>
      ) : (
        <NoCommentsText>
          No comments yet. Be the first to comment!
        </NoCommentsText>
      )}

      {/* Reply indicator */}
      {replyingTo && (
        <ReplyIndicator>
          Replying to {replyingTo.name}
          <CancelReply onClick={() => { setReplyingTo(null); onCommentTextChange(''); }}>
            ✕
          </CancelReply>
        </ReplyIndicator>
      )}

      {/* Comment Input */}
      <CommentInput>
        <AvatarEl
          src={currentUser?.photo || undefined}
          alt={currentUser?.firstName || 'User'}
          fallback={currentUser?.firstName?.[0] || 'U'}
          size={32}
        />
        <CommentTextarea
          placeholder={replyingTo ? `Reply to ${replyingTo.name}...` : 'Write a comment...'}
          value={commentText}
          onChange={(e) => onCommentTextChange(e.target.value)}
          onKeyDown={onCommentKeyPress}
          rows={1}
        />
        <IconBtn
          $color="#60C0F0"
          $disabled={!commentText.trim()}
          onClick={handleSubmit}
          title="Send comment"
        >
          <Send size={20} />
        </IconBtn>
      </CommentInput>
    </CommentsSection>
  );
});

PostComments.displayName = 'PostComments';
export default PostComments;

// ─────────────────────────────────────────────────────────────
// SECTION: Additional Styled Components
// ─────────────────────────────────────────────────────────────

const CommentMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
`;

const ReplyBtn = styled.button`
  border: none;
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;

  &:hover { text-decoration: underline; }
`;

const ReplyIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  margin: 4px 0;
  border-radius: 6px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--accent-primary, #60C0F0);
`;

const CancelReply = styled.button`
  border: none;
  background: transparent;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  font-size: 14px;
  cursor: pointer;
  margin-left: auto;
  padding: 0 4px;

  &:hover { color: var(--text-primary, #E0ECF4); }
`;
