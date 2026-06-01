/**
 * Social moderation command dispatcher contracts
 * ==============================================
 * Ensures Swan Coach moderation commands execute route-backed model operations
 * while returning compact receipts that do not leak post body text or user PII.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadDispatcher() {
  vi.resetModules();

  const pendingPost = {
    id: 42,
    content: 'Private post body should never echo',
    moderationStatus: 'pending',
    reportsCount: 3,
    mediaUrl: '/api/serve-photo/social/post-media-key.jpg',
    user: { email: 'private@example.com', firstName: 'Private' },
    createdAt: new Date('2026-05-31T12:00:00.000Z'),
    approveContent: vi.fn(async function approveContent() {
      this.moderationStatus = 'approved';
      return this;
    }),
    rejectContent: vi.fn(async function rejectContent() {
      this.moderationStatus = 'rejected';
      return this;
    }),
    destroy: vi.fn(async () => undefined),
  };
  const pendingComment = {
    id: 7,
    content: 'Private comment body should never echo',
    moderationStatus: 'flagged',
    reportsCount: 2,
    user: { email: 'commenter@example.com' },
    createdAt: new Date('2026-05-30T12:00:00.000Z'),
  };

  const countByStatus = {
    pending: 2,
    flagged: 1,
    approved: 9,
    rejected: 3,
    hidden: 1,
  };
  const countPosts = vi.fn(async (options = {}) => countByStatus[options.where?.moderationStatus] ?? 0);
  const countComments = vi.fn(async (options = {}) => countByStatus[options.where?.moderationStatus] ?? 0);
  const countReports = vi.fn(async () => 4);
  const findAllPosts = vi.fn(async () => [pendingPost]);
  const findAllComments = vi.fn(async () => [pendingComment]);
  const findPostByPk = vi.fn(async (id) => (Number(id) === 42 ? pendingPost : null));
  const findAllPostHashtags = vi.fn(async () => [{ hashtagId: 9 }, { hashtagId: 11 }]);
  const decrementHashtags = vi.fn(async () => undefined);
  const deletePhoto = vi.fn(async () => undefined);

  const SocialPost = { count: countPosts, findAll: findAllPosts, findByPk: findPostByPk };
  const SocialComment = { count: countComments, findAll: findAllComments };
  const PostReport = { count: countReports };
  const PostHashtag = { findAll: findAllPostHashtags };
  const Hashtag = { decrement: decrementHashtags };

  vi.doMock('../../models/social/index.mjs', () => ({
    SocialPost,
    SocialComment,
    PostReport,
    PostHashtag,
    Hashtag,
  }));
  vi.doMock('../../services/photoStorageService.mjs', () => ({
    deletePhoto,
  }));
  vi.doMock('../../models/index.mjs', () => ({
    getAllModels: () => ({}),
  }));
  vi.doMock('../../services/workoutService.mjs', () => ({
    default: { getExerciseRecommendations: vi.fn(async () => []) },
  }));

  const dispatcher = await import('../../services/ai/commandDispatcher.mjs');
  return {
    ...dispatcher,
    pendingPost,
    findAllPosts,
    findAllComments,
    findPostByPk,
    countPosts,
    countComments,
    countReports,
    findAllPostHashtags,
    decrementHashtags,
    deletePhoto,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('social moderation command dispatchers', () => {
  it('wires route-backed moderation commands and leaves block-user posting unwired', async () => {
    const { hasDispatcher } = await loadDispatcher();

    expect(hasDispatcher('view_moderation_queue')).toBe(true);
    expect(hasDispatcher('view_moderation_stats')).toBe(true);
    expect(hasDispatcher('approve_post')).toBe(true);
    expect(hasDispatcher('reject_post')).toBe(true);
    expect(hasDispatcher('delete_post')).toBe(true);
    expect(hasDispatcher('block_user_posting')).toBe(false);
  });

  it('summarizes the moderation queue without echoing content or user PII', async () => {
    const { dispatch, findAllPosts, findAllComments } = await loadDispatcher();

    const result = await dispatch('view_moderation_queue', { status: 'pending', limit: 5 }, {
      user: { id: 1, role: 'admin' },
    });

    expect(findAllPosts).toHaveBeenCalledWith(expect.objectContaining({
      attributes: ['id', 'moderationStatus', 'reportsCount', 'createdAt'],
      limit: 5,
    }));
    expect(findAllComments).toHaveBeenCalledWith(expect.objectContaining({
      attributes: ['id', 'moderationStatus', 'reportsCount', 'createdAt'],
      limit: 5,
    }));
    expect(result).toEqual({
      status: 'pending',
      limit: 5,
      pendingPostCount: 1,
      pendingCommentCount: 1,
      queueCount: 2,
      firstContentType: 'post',
      firstContentId: 42,
      firstStatus: 'pending',
      firstReportsCount: 3,
    });
    expect(JSON.stringify(result)).not.toContain('Private post body');
    expect(JSON.stringify(result)).not.toContain('private@example.com');
  });

  it('summarizes moderation stats from social model counts', async () => {
    const { dispatch, countPosts, countComments, countReports } = await loadDispatcher();

    const result = await dispatch('view_moderation_stats', {}, {
      user: { id: 1, role: 'admin' },
    });

    expect(countPosts).toHaveBeenCalled();
    expect(countComments).toHaveBeenCalled();
    expect(countReports).toHaveBeenCalled();
    expect(result).toEqual({
      pendingPosts: 2,
      flaggedPosts: 1,
      rejectedPosts: 3,
      hiddenPosts: 1,
      pendingComments: 2,
      flaggedComments: 1,
      rejectedComments: 3,
      hiddenComments: 1,
      openReports: 4,
      queueTotal: 6,
    });
  });

  it('approves, rejects, and deletes posts without echoing private moderation text', async () => {
    const { dispatch, pendingPost, findPostByPk } = await loadDispatcher();
    const ctx = { user: { id: 1, role: 'admin' } };

    const approved = await dispatch('approve_post', { postId: 42 }, ctx);
    const rejected = await dispatch('reject_post', {
      postId: 42,
      reason: 'Private policy explanation',
    }, ctx);
    const deleted = await dispatch('delete_post', {
      postId: 42,
      reason: 'Private deletion explanation',
    }, ctx);

    expect(findPostByPk).toHaveBeenCalledWith(42);
    expect(pendingPost.approveContent).toHaveBeenCalledWith(1, 'Approved via Swan Coach command center');
    expect(pendingPost.rejectContent).toHaveBeenCalledWith(
      'Private policy explanation',
      1,
      'Rejected via Swan Coach command center'
    );
    expect(pendingPost.destroy).toHaveBeenCalled();
    expect(approved).toEqual({ postId: 42, found: true, approved: true, status: 'approved' });
    expect(rejected).toEqual({ postId: 42, found: true, rejected: true, status: 'rejected' });
    expect(deleted).toEqual({ postId: 42, found: true, deleted: true });
    expect(JSON.stringify({ approved, rejected, deleted })).not.toContain('Private policy explanation');
    expect(JSON.stringify({ approved, rejected, deleted })).not.toContain('Private deletion explanation');
  });

  it('deletes social post media and decrements hashtag counters before destroying a post', async () => {
    const {
      dispatch,
      pendingPost,
      findAllPostHashtags,
      decrementHashtags,
      deletePhoto,
    } = await loadDispatcher();

    const result = await dispatch('delete_post', {
      postId: 42,
      reason: 'Private deletion explanation',
    }, {
      user: { id: 1, role: 'admin' },
    });

    expect(deletePhoto).toHaveBeenCalledWith('social/post-media-key.jpg');
    expect(findAllPostHashtags).toHaveBeenCalledWith({
      where: { postId: 42 },
      attributes: ['hashtagId'],
    });
    expect(decrementHashtags).toHaveBeenCalledWith(['usageCount', 'weeklyCount'], {
      where: { id: expect.any(Object) },
    });
    expect(pendingPost.destroy).toHaveBeenCalled();
    expect(result).toEqual({ postId: 42, found: true, deleted: true });
  });
});
