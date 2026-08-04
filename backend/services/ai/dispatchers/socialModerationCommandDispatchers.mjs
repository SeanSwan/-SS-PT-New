/**
 * Social moderation command dispatchers
 * =====================================
 * Compact Swan Coach handlers for admin social moderation. Receipts avoid
 * echoing post/comment bodies, user names, emails, or private moderation text.
 */
import { Op } from 'sequelize';

import {
  PostReport,
  SocialComment,
  SocialPost,
} from '../../../models/social/index.mjs';
import { cleanupSocialPostDeletionSideEffects } from '../../social/socialPostDeletionCleanupService.mjs';

const QUEUE_STATUSES = Object.freeze(['pending', 'flagged']);
const STATS_STATUSES = Object.freeze(['pending', 'flagged', 'rejected', 'hidden']);
const SAFE_ATTRIBUTES = Object.freeze(['id', 'moderationStatus', 'reportsCount', 'createdAt']);

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeRow = (row) => (typeof row?.toJSON === 'function' ? row.toJSON() : row);

const normalizeStatus = (status) => (
  ['pending', 'flagged', 'all'].includes(status) ? status : 'pending'
);

const queueWhere = (status) => ({
  moderationStatus: status === 'all' ? { [Op.in]: QUEUE_STATUSES } : status,
});

const summarizeItem = (type, row) => {
  const data = normalizeRow(row) || {};
  return {
    type,
    id: data.id ?? null,
    status: data.moderationStatus ?? null,
    reportsCount: toNumber(data.reportsCount),
  };
};

const countByStatus = async (model, status) => (
  toNumber(await model.count({ where: { moderationStatus: status } }))
);

const findPost = async (postId) => (
  SocialPost.findByPk(toNumber(postId))
);

export const dispatchViewModerationQueue = async (params = {}) => {
  const status = normalizeStatus(params.status);
  const limit = Math.min(25, Math.max(1, Number.parseInt(params.limit, 10) || 10));
  const query = {
    where: queueWhere(status),
    attributes: [...SAFE_ATTRIBUTES],
    order: [['reportsCount', 'DESC'], ['createdAt', 'ASC']],
    limit,
  };
  const [posts, comments] = await Promise.all([
    SocialPost.findAll(query),
    SocialComment.findAll(query),
  ]);
  const queue = [
    ...posts.map((row) => summarizeItem('post', row)),
    ...comments.map((row) => summarizeItem('comment', row)),
  ].sort((a, b) => b.reportsCount - a.reportsCount);
  const first = queue[0] || null;

  return {
    status,
    limit,
    pendingPostCount: posts.length,
    pendingCommentCount: comments.length,
    queueCount: queue.length,
    firstContentType: first?.type ?? null,
    firstContentId: first?.id ?? null,
    firstStatus: first?.status ?? null,
    firstReportsCount: first?.reportsCount ?? 0,
  };
};

export const dispatchViewModerationStats = async () => {
  const postCounts = await Promise.all(
    STATS_STATUSES.map((status) => countByStatus(SocialPost, status))
  );
  const commentCounts = await Promise.all(
    STATS_STATUSES.map((status) => countByStatus(SocialComment, status))
  );
  const openReports = toNumber(await PostReport.count({
    // live enum label is hyphenated 'under-review' (drift sweep 2026-08-04; the model's
    // own helper at PostReport.mjs uses the hyphen — this dispatcher was the drifted copy)
    where: { status: { [Op.in]: ['pending', 'under-review'] } },
  }));

  return {
    pendingPosts: postCounts[0],
    flaggedPosts: postCounts[1],
    rejectedPosts: postCounts[2],
    hiddenPosts: postCounts[3],
    pendingComments: commentCounts[0],
    flaggedComments: commentCounts[1],
    rejectedComments: commentCounts[2],
    hiddenComments: commentCounts[3],
    openReports,
    queueTotal: postCounts[0] + postCounts[1] + commentCounts[0] + commentCounts[1],
  };
};

export const dispatchApprovePost = async (params = {}, ctx = {}) => {
  const postId = toNumber(params.postId);
  const post = await findPost(postId);
  if (!post) return { postId, found: false, approved: false, status: null };

  if (typeof post.approveContent === 'function') {
    await post.approveContent(ctx.user?.id ?? null, 'Approved via Swan Coach command center');
  } else {
    await post.update?.({ moderationStatus: 'approved', flaggedReason: null });
  }

  return {
    postId,
    found: true,
    approved: true,
    status: post.moderationStatus ?? 'approved',
  };
};

export const dispatchRejectPost = async (params = {}, ctx = {}) => {
  const postId = toNumber(params.postId);
  const post = await findPost(postId);
  if (!post) return { postId, found: false, rejected: false, status: null };

  const reason = String(params.reason || 'Content policy violation').trim()
    || 'Content policy violation';
  if (typeof post.rejectContent === 'function') {
    await post.rejectContent(reason, ctx.user?.id ?? null, 'Rejected via Swan Coach command center');
  } else {
    await post.update?.({ moderationStatus: 'rejected', flaggedReason: reason });
  }

  return {
    postId,
    found: true,
    rejected: true,
    status: post.moderationStatus ?? 'rejected',
  };
};

export const dispatchDeletePost = async (params = {}) => {
  const postId = toNumber(params.postId);
  const post = await findPost(postId);
  if (!post) return { postId, found: false, deleted: false };

  await cleanupSocialPostDeletionSideEffects(post);
  await post.destroy();

  return {
    postId,
    found: true,
    deleted: true,
  };
};
