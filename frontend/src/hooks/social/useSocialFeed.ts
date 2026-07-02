import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../use-toast';
import { useGamificationData } from '../gamification/useGamificationData';
import type {
  AchievementPostData,
  ChallengePostData,
  TransformationPostData,
  WorkoutPostData,
} from '../../components/Social/Feed/types/PostCardTypes';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
  role?: string;
  clientSource?: 'swanstudios' | 'move_fitness' | 'external';
  level?: number;
  tier?: string;
  points?: number;
  jobClass?: string | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: User;
  likesCount: number;
}

interface Post {
  id: string;
  content: string;
  type: 'general' | 'workout' | 'achievement' | 'challenge' | 'transformation' | 'creative' | 'dance' | 'music' | 'singing' | 'art' | 'gaming' | 'comedy' | 'milestone';
  visibility: 'public' | 'friends' | 'private';
  createdAt: string;
  user: User;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  reactionCounts?: { thumbs_up: number; heart: number; swan: number };
  userReactions?: string[];
  mediaUrl?: string;
  comments?: Comment[];
  workoutSessionId?: string;
  achievementId?: string;
  challengeId?: string;
  workoutData?: WorkoutPostData;
  transformationData?: TransformationPostData;
  achievementData?: AchievementPostData;
  challengeData?: ChallengePostData;
}

interface CreatePostParams {
  content: string;
  type?: 'general' | 'workout' | 'achievement' | 'challenge' | 'transformation' | 'creative' | 'dance' | 'music' | 'singing' | 'art' | 'gaming' | 'comedy';
  visibility?: 'public' | 'friends' | 'private';
  media?: File | null;
  workoutSessionId?: string;
  achievementId?: string;
  challengeId?: string;
  workoutData?: WorkoutPostData;
  transformationData?: TransformationPostData;
  achievementData?: AchievementPostData;
  challengeData?: ChallengePostData;
}

interface PointResult {
  pointsAwarded: number;
  newBalance: number;
  success: boolean;
  pointMessage?: string;
}

interface UnityWeaverXPResult {
  awarded?: boolean;
  pointsAwarded?: number;
  swanCoinsAwarded?: number;
}

function buildUnityWeaverBonusDescription(unityWeaverXP: UnityWeaverXPResult): string {
  const points = unityWeaverXP.pointsAwarded || 0;
  const coins = unityWeaverXP.swanCoinsAwarded || 0;
  const rewards = [
    points > 0 ? `+${points} XP` : null,
    coins > 0 ? `+${coins} SwanCoins` : null,
  ].filter(Boolean).join(' and ');
  return `${rewards || 'Good-energy credit'} for positive community energy.`;
}

/**
 * Hook for managing social feed functionality.
 *
 * Unity Weaver / Swan Aura XP is intentionally backend-owned. This hook only
 * consumes the optional `unityWeaverXP` response appended after a real social
 * action succeeds, then refreshes visible gamification state.
 */
export const useSocialFeed = () => {
  const { authAxios, user } = useAuth();
  const { toast } = useToast();
  const { invalidateProfile } = useGamificationData();

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);

  const notifyUnityWeaverXP = useCallback((unityWeaverXP?: UnityWeaverXPResult | null) => {
    if (!unityWeaverXP?.awarded) return;
    invalidateProfile();
    toast({
      title: 'Swan Aura bonus ✨',
      description: buildUnityWeaverBonusDescription(unityWeaverXP),
      variant: 'default',
    });
  }, [invalidateProfile, toast]);

  const fetchPosts = useCallback(async (resetPagination = false) => {
    if (!user) return;

    if (resetPagination) {
      setOffset(0);
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    setError(null);

    try {
      const currentOffset = resetPagination ? 0 : offset;
      const response = await authAxios.get(`/api/social/posts/feed?limit=${limit}&offset=${currentOffset}`);
      const newPosts = response.data.posts || [];

      if (resetPagination) {
        setPosts(newPosts);
      } else {
        setPosts(prevPosts => [...prevPosts, ...newPosts]);
      }

      setHasMore(newPosts.length === limit);
      setOffset(currentOffset + newPosts.length);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching social feed:', err);
      toast({
        title: 'Error fetching feed',
        description: 'Unable to load social feed. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      if (resetPagination) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  }, [authAxios, user, toast, offset, limit]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    fetchPosts(false);
  }, [fetchPosts, isLoadingMore, hasMore]);

  const createPost = useCallback(async (postData: CreatePostParams) => {
    if (!user) return null;

    setIsCreatingPost(true);

    try {
      const formData = new FormData();
      formData.append('content', postData.content);
      formData.append('type', postData.type || 'general');
      formData.append('visibility', postData.visibility || 'friends');

      if (postData.media) formData.append('media', postData.media);
      if (postData.workoutSessionId) formData.append('workoutSessionId', postData.workoutSessionId);
      if (postData.achievementId) formData.append('achievementId', postData.achievementId);
      if (postData.challengeId) formData.append('challengeId', postData.challengeId);
      if (postData.workoutData) formData.append('workoutData', JSON.stringify(postData.workoutData));
      if (postData.transformationData) formData.append('transformationData', JSON.stringify(postData.transformationData));
      if (postData.achievementData) formData.append('achievementData', JSON.stringify(postData.achievementData));
      if (postData.challengeData) formData.append('challengeData', JSON.stringify(postData.challengeData));

      const response = await authAxios.post('/api/social/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const newPost = response.data.post;
      if (!newPost) {
        throw new Error('Post creation succeeded but returned no post payload.');
      }

      setPosts(prevPosts => [newPost, ...prevPosts]);
      notifyUnityWeaverXP(response.data.unityWeaverXP);

      if (response.data.pointsAwarded) {
        toast({
          title: 'Post created & Points earned! 🎉',
          description: response.data.pointMessage || `You earned ${response.data.pointsAwarded} points!`,
          variant: 'default'
        });
        invalidateProfile();
      } else {
        toast({
          title: 'Post created',
          description: 'Your post has been published successfully.',
          variant: 'default'
        });
      }

      return {
        ...newPost,
        pointsAwarded: response.data.pointsAwarded || 0,
        newBalance: response.data.newBalance,
        pointMessage: response.data.pointMessage,
        unityWeaverXP: response.data.unityWeaverXP
      };
    } catch (err: any) {
      console.error('Error creating post:', err);
      toast({
        title: 'Error creating post',
        description: err.response?.data?.message || err.message || 'Unable to create post. Please try again later.',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsCreatingPost(false);
    }
  }, [authAxios, user, toast, invalidateProfile, notifyUnityWeaverXP]);

  const reactToPost = useCallback(async (postId: string, reactionType: string = 'swan'): Promise<PointResult | boolean> => {
    if (!user) return false;

    try {
      const response = await authAxios.post(`/api/social/posts/${postId}/like`, { reactionType });

      setPosts(prevPosts =>
        prevPosts.map(post => {
          if (post.id !== postId) return post;
          const newReactions = [...(post.userReactions || [])];
          if (!newReactions.includes(reactionType)) newReactions.push(reactionType);
          const newCounts = { ...(post.reactionCounts || { thumbs_up: 0, heart: 0, swan: 0 }) };
          newCounts[reactionType as keyof typeof newCounts] = (newCounts[reactionType as keyof typeof newCounts] || 0) + 1;
          return {
            ...post,
            isLiked: true,
            likesCount: post.likesCount + 1,
            reactionCounts: newCounts,
            userReactions: newReactions,
          };
        })
      );

      notifyUnityWeaverXP(response.data.unityWeaverXP);

      if (response.data.pointsAwarded) {
        invalidateProfile();
        return {
          pointsAwarded: response.data.pointsAwarded,
          newBalance: response.data.newBalance || 0,
          success: true,
          pointMessage: response.data.pointMessage
        };
      }

      return true;
    } catch (err) {
      console.error('Error reacting to post:', err);
      return false;
    }
  }, [authAxios, user, invalidateProfile, notifyUnityWeaverXP]);

  const removeReaction = useCallback(async (postId: string, reactionType: string = 'swan') => {
    if (!user) return false;

    try {
      await authAxios.delete(`/api/social/posts/${postId}/like?reactionType=${reactionType}`);
      setPosts(prevPosts =>
        prevPosts.map(post => {
          if (post.id !== postId) return post;
          const newReactions = (post.userReactions || []).filter(r => r !== reactionType);
          const newCounts = { ...(post.reactionCounts || { thumbs_up: 0, heart: 0, swan: 0 }) };
          newCounts[reactionType as keyof typeof newCounts] = Math.max(0, (newCounts[reactionType as keyof typeof newCounts] || 0) - 1);
          return {
            ...post,
            isLiked: newReactions.length > 0,
            likesCount: Math.max(0, post.likesCount - 1),
            reactionCounts: newCounts,
            userReactions: newReactions,
          };
        })
      );

      return true;
    } catch (err) {
      console.error('Error removing reaction:', err);
      return false;
    }
  }, [authAxios, user]);

  const likePost = useCallback(async (postId: string) => reactToPost(postId, 'swan'), [reactToPost]);
  const unlikePost = useCallback(async (postId: string) => removeReaction(postId, 'swan'), [removeReaction]);

  const addComment = useCallback(async (postId: string, content: string) => {
    if (!user || !content.trim()) return null;

    try {
      const response = await authAxios.post(`/api/social/posts/${postId}/comments`, { content });
      const newComment = response.data.comment;
      if (!newComment) {
        throw new Error('Comment creation succeeded but returned no comment payload.');
      }

      setPosts(prevPosts =>
        prevPosts.map(post => {
          if (post.id !== postId) return post;
          const updatedComments = post.comments ? [...post.comments, newComment] : [newComment];
          return {
            ...post,
            comments: updatedComments,
            commentsCount: post.commentsCount + 1
          };
        })
      );

      notifyUnityWeaverXP(response.data.unityWeaverXP);

      if (response.data.pointsAwarded) {
        toast({
          title: 'Comment added & Points earned! 🎉',
          description: response.data.pointMessage || `You earned ${response.data.pointsAwarded} points!`,
          variant: 'default'
        });
        invalidateProfile();
      }

      return newComment;
    } catch (err: any) {
      console.error('Error adding comment:', err);
      toast({
        title: 'Error',
        description: err.response?.data?.message || err.message || 'Unable to add comment. Please try again later.',
        variant: 'destructive'
      });
      return null;
    }
  }, [authAxios, user, toast, invalidateProfile, notifyUnityWeaverXP]);

  const updatePost = useCallback(async (postId: string, content: string): Promise<boolean> => {
    if (!user || !content.trim()) return false;
    try {
      const response = await authAxios.put(`/api/social/posts/${postId}`, { content });
      const updated = response.data.post;
      setPosts(prevPosts => prevPosts.map(p => p.id === postId ? { ...p, content: updated.content, isEdited: true } : p));
      toast({ title: 'Post updated', description: 'Your changes have been saved.', variant: 'default' });
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Unable to update post.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      return false;
    }
  }, [authAxios, user, toast]);

  const deletePost = useCallback(async (postId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      await authAxios.delete(`/api/social/posts/${postId}`);
      setPosts(prevPosts => prevPosts.filter(p => p.id !== postId));
      toast({ title: 'Post deleted', description: 'The post has been removed.', variant: 'default' });
      return true;
    } catch (err: any) {
      console.error('Error deleting post:', err);
      toast({ title: 'Error', description: err.response?.data?.message || 'Unable to delete post.', variant: 'destructive' });
      return false;
    }
  }, [authAxios, user, toast]);

  const reportPost = useCallback(async (postId: string, reason: string, description?: string): Promise<boolean> => {
    if (!user) return false;

    try {
      await authAxios.post(`/api/social/posts/${postId}/report`, { reason, description });
      toast({ title: 'Report submitted', description: 'Thank you. Our team will review this post.', variant: 'default' });
      return true;
    } catch (err: any) {
      console.error('Error reporting post:', err);
      const msg = err.response?.data?.message || 'Unable to submit report.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      return false;
    }
  }, [authAxios, user, toast]);

  const repostPost = useCallback(async (postId: string, content?: string) => {
    if (!user || !authAxios) return false;
    try {
      await authAxios.post(`/api/social/posts/${postId}/repost`, { content });
      toast({ title: 'Shared!', description: 'Post shared to your feed.', variant: 'default' });
      fetchPosts(true);
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Unable to share post.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      return false;
    }
  }, [authAxios, user, toast, fetchPosts]);

  const getPostDetails = useCallback(async (postId: string) => {
    if (!user) return null;

    try {
      const response = await authAxios.get(`/api/social/posts/${postId}`);
      return response.data.post;
    } catch (err) {
      console.error('Error fetching post details:', err);
      return null;
    }
  }, [authAxios, user]);

  const loadComments = useCallback(async (postId: string) => {
    const details = await getPostDetails(postId);
    if (!details) return;

    setPosts(prevPosts =>
      prevPosts.map(post => (post.id === postId
        ? { ...post, comments: details.comments || [], commentsCount: (details.comments || []).length }
        : post))
    );
  }, [getPostDetails]);

  useEffect(() => {
    if (user) fetchPosts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchPostsRef = useRef(fetchPosts);
  fetchPostsRef.current = fetchPosts;
  useEffect(() => {
    const onExternalPostCreated = () => fetchPostsRef.current(true);
    window.addEventListener('swan:social-post-created', onExternalPostCreated);
    return () => window.removeEventListener('swan:social-post-created', onExternalPostCreated);
  }, []);

  return {
    posts,
    isLoading,
    error,
    hasMore,
    loadMore,
    isLoadingMore,
    refreshPosts: () => fetchPosts(true),
    createPost,
    isCreatingPost,
    likePost,
    unlikePost,
    reactToPost,
    removeReaction,
    addComment,
    updatePost,
    deletePost,
    reportPost,
    repostPost,
    getPostDetails,
    loadComments
  };
};

/** Workstream O3: the full stateful feed API — HomeTab owns the single mount
    and prop-drills it to the presentational community feed. */
export type SocialFeedApi = ReturnType<typeof useSocialFeed>;
