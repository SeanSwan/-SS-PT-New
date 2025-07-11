import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../use-toast';
import { useGamificationData } from '../gamification/useGamificationData';

// Types
interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
  role?: string;
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
  type: 'general' | 'workout' | 'achievement' | 'challenge' | 'transformation';
  visibility: 'public' | 'friends' | 'private';
  createdAt: string;
  user: User;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  mediaUrl?: string;
  comments?: Comment[];
  workoutSessionId?: string;
  achievementId?: string;
  challengeId?: string;
  workoutData?: {
    duration?: string;
    exerciseCount?: string;
    totalWeight?: string;
    caloriesBurned?: string;
  };
  transformationData?: {
    hasBeforeImage?: boolean;
    hasAfterImage?: boolean;
    beforeImageUrl?: string;
    afterImageUrl?: string;
  };
  achievementData?: {
    title?: string;
    description?: string;
    points?: number;
  };
  challengeData?: {
    title?: string;
    difficulty?: string;
    duration?: string;
  };
}

interface CreatePostParams {
  content: string;
  type?: 'general' | 'workout' | 'achievement' | 'challenge' | 'transformation';
  visibility?: 'public' | 'friends' | 'private';
  media?: File | null;
  workoutSessionId?: string;
  achievementId?: string;
  challengeId?: string;
  workoutData?: {
    duration?: string;
    exerciseCount?: string;
    totalWeight?: string;
    caloriesBurned?: string;
  };
  transformationData?: {
    hasBeforeImage?: boolean;
    hasAfterImage?: boolean;
  };
  achievementData?: {
    title?: string;
    description?: string;
    points?: number;
  };
  challengeData?: {
    title?: string;
    difficulty?: string;
    duration?: string;
  };
}

interface PointResult {
  pointsAwarded: number;
  newBalance: number;
  success: boolean;
  pointMessage?: string;
}

/**
 * Hook for managing social feed functionality
 */
export const useSocialFeed = () => {
  const { authAxios, user } = useAuth();
  const { toast } = useToast();
  const { profile, invalidateProfile } = useGamificationData();
  
  // State for posts data
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Pagination state
  const [offset, setOffset] = useState(0);
  const [limit] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Create post state
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  
  // Fetch feed posts
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
      
      // Update pagination info
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
  
  // Load more posts
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    fetchPosts(false);
  }, [fetchPosts, isLoadingMore, hasMore]);
  
  // Create a new post
  const createPost = useCallback(async (postData: CreatePostParams) => {
    if (!user) return null;
    
    setIsCreatingPost(true);
    
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('content', postData.content);
      formData.append('type', postData.type || 'general');
      formData.append('visibility', postData.visibility || 'friends');
      
      if (postData.media) {
        formData.append('media', postData.media);
      }
      
      // Add optional fields if provided
      if (postData.workoutSessionId) {
        formData.append('workoutSessionId', postData.workoutSessionId);
      }
      
      if (postData.achievementId) {
        formData.append('achievementId', postData.achievementId);
      }
      
      if (postData.challengeId) {
        formData.append('challengeId', postData.challengeId);
      }
      
      // Add type-specific data
      if (postData.workoutData) {
        formData.append('workoutData', JSON.stringify(postData.workoutData));
      }
      
      if (postData.transformationData) {
        formData.append('transformationData', JSON.stringify(postData.transformationData));
      }
      
      if (postData.achievementData) {
        formData.append('achievementData', JSON.stringify(postData.achievementData));
      }
      
      if (postData.challengeData) {
        formData.append('challengeData', JSON.stringify(postData.challengeData));
      }
      
      const response = await authAxios.post('/api/social/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Add new post to the top of the feed
      const newPost = response.data.post;
      setPosts(prevPosts => [newPost, ...prevPosts]);
      
      // Handle point notifications
      if (response.data.pointsAwarded) {
        toast({
          title: 'Post created & Points earned! 🎉',
          description: response.data.pointMessage || `You earned ${response.data.pointsAwarded} points!`,
          variant: 'default'
        });
        
        // Invalidate gamification profile to update point balance
        invalidateProfile();
      } else {
        toast({
          title: 'Post created',
          description: 'Your post has been published successfully.',
          variant: 'default'
        });
      }
      
      // Return enhanced result with point information
      return {
        ...newPost,
        pointsAwarded: response.data.pointsAwarded || 0,
        newBalance: response.data.newBalance,
        pointMessage: response.data.pointMessage
      };
    } catch (err: any) {
      console.error('Error creating post:', err);
      toast({
        title: 'Error creating post',
        description: err.response?.data?.message || 'Unable to create post. Please try again later.',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsCreatingPost(false);
    }
  }, [authAxios, user, toast]);
  
  // Like a post
  const likePost = useCallback(async (postId: string): Promise<PointResult | boolean> => {
    if (!user) return false;
    
    try {
      const response = await authAxios.post(`/api/social/posts/${postId}/like`);
      
      // Update the post in the list
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                isLiked: true, 
                likesCount: post.likesCount + 1 
              } 
            : post
        )
      );
      
      // Handle point notifications
      if (response.data.pointsAwarded) {
        // Invalidate gamification profile to update point balance
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
      console.error('Error liking post:', err);
      return false;
    }
  }, [authAxios, user, invalidateProfile]);
  
  // Unlike a post
  const unlikePost = useCallback(async (postId: string) => {
    if (!user) return false;
    
    try {
      await authAxios.delete(`/api/social/posts/${postId}/like`);
      
      // Update the post in the list
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                isLiked: false, 
                likesCount: Math.max(0, post.likesCount - 1) 
              } 
            : post
        )
      );
      
      return true;
    } catch (err) {
      console.error('Error unliking post:', err);
      return false;
    }
  }, [authAxios, user]);
  
  // Add a comment to a post
  const addComment = useCallback(async (postId: string, content: string) => {
    if (!user || !content.trim()) return null;
    
    try {
      const response = await authAxios.post(`/api/social/posts/${postId}/comments`, {
        content
      });
      
      const newComment = response.data.comment;
      
      // Update the post in the list
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            // Add the new comment to the post's comments array
            const updatedComments = post.comments ? [...post.comments, newComment] : [newComment];
            
            return {
              ...post,
              comments: updatedComments,
              commentsCount: post.commentsCount + 1
            };
          }
          return post;
        })
      );
      
      // Handle point notifications for commenting
      if (response.data.pointsAwarded) {
        toast({
          title: 'Comment added & Points earned! 🎉',
          description: response.data.pointMessage || `You earned ${response.data.pointsAwarded} points!`,
          variant: 'default'
        });
        
        // Invalidate gamification profile to update point balance
        invalidateProfile();
      }
      
      return newComment;
    } catch (err) {
      console.error('Error adding comment:', err);
      toast({
        title: 'Error',
        description: 'Unable to add comment. Please try again later.',
        variant: 'destructive'
      });
      return null;
    }
  }, [authAxios, user, toast, invalidateProfile]);
  
  // Get a single post with full details
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
  
  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchPosts(true);
    }
  }, [user, fetchPosts]);
  
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
    addComment,
    getPostDetails
  };
};
