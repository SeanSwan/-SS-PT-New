import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../use-toast';

// Friend types
export interface FriendUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
  role: string;
  points?: number;
  friendshipStatus?: 'pending' | 'accepted' | 'declined' | 'blocked' | null;
  friendshipId?: string | null;
  isRequester?: boolean;
}

interface Friend extends FriendUser {
  friendshipId: string;
  createdAt: string;
}

interface FriendRequest {
  id: string;
  requester: FriendUser;
  createdAt: string;
}

type FriendRequestAction = 'accept' | 'decline';

const FRIEND_REQUEST_ACTION_COPY: Record<FriendRequestAction, {
  successTitle: string;
  successDescription: string;
  errorLog: string;
  errorDescription: string;
}> = {
  accept: {
    successTitle: 'Friend request accepted',
    successDescription: 'You are now friends with this user.',
    errorLog: 'Error accepting friend request:',
    errorDescription: 'Unable to accept friend request. Please try again later.',
  },
  decline: {
    successTitle: 'Friend request declined',
    successDescription: 'The friend request has been declined.',
    errorLog: 'Error declining friend request:',
    errorDescription: 'Unable to decline friend request. Please try again later.',
  },
};

type FriendRequestResponse = {
  data?: {
    friendship?: {
      id?: string | number | null;
    };
  };
};

const FRIEND_REQUEST_SEND_FALLBACK = 'Unable to send friend request. Please try again later.';

function responseFriendshipId(response: FriendRequestResponse) {
  const friendshipId = response.data?.friendship?.id;
  return friendshipId == null ? null : String(friendshipId);
}

function pendingSuggestion(candidate: FriendUser, recipientId: string, friendshipId: string | null) {
  if (candidate.id !== recipientId) return candidate;
  return {
    ...candidate,
    friendshipStatus: 'pending' as const,
    friendshipId: friendshipId || candidate.friendshipId || null,
    isRequester: true,
  };
}

function friendRequestSendErrorDescription(err: unknown) {
  return (err as { response?: { data?: { message?: string } } }).response?.data?.message || FRIEND_REQUEST_SEND_FALLBACK;
}

function socialSearchQuery(canSearch: boolean, query: string) {
  const trimmedQuery = query.trim();
  if (!canSearch) return null;
  if (!trimmedQuery) return null;
  return trimmedQuery;
}

/**
 * Hook for managing social friends functionality
 */
export const useSocialFriends = () => {
  const { authAxios, user } = useAuth();
  const { toast } = useToast();
  
  // State for friends data
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // State for friend requests
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  
  // State for friend suggestions
  const [friendSuggestions, setFriendSuggestions] = useState<FriendUser[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  
  // Fetch friends list
  const fetchFriends = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await authAxios.get('/api/social/friendships');
      setFriends(response.data.friends || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching friends:', err);
      toast({
        title: 'Error fetching friends',
        description: 'Unable to load your friends list. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [authAxios, user, toast]);
  
  // Fetch friend requests
  const fetchFriendRequests = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingRequests(true);
    
    try {
      const response = await authAxios.get('/api/social/friendships/requests');
      setFriendRequests(response.data.requests || []);
    } catch (err) {
      console.error('Error fetching friend requests:', err);
      toast({
        title: 'Error',
        description: 'Unable to load friend requests. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingRequests(false);
    }
  }, [authAxios, user, toast]);
  
  // Fetch friend suggestions
  const fetchFriendSuggestions = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingSuggestions(true);
    
    try {
      const response = await authAxios.get('/api/social/friendships/suggestions');
      setFriendSuggestions(response.data.suggestions || []);
    } catch (err) {
      console.error('Error fetching friend suggestions:', err);
      // No toast for suggestions as it's less critical
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [authAxios, user]);
  
  // Send a friend request
  const sendFriendRequest = useCallback(async (recipientId: string) => {
    if (!user) return false;
    
    try {
      const response = await authAxios.post(`/api/social/friendships/request/${recipientId}`);
      const friendshipId = responseFriendshipId(response);
      setFriendSuggestions(prev => prev.map((candidate) => pendingSuggestion(candidate, recipientId, friendshipId)));
      
      toast({
        title: 'Friend request sent',
        description: 'Your friend request has been sent successfully.',
        variant: 'default'
      });
      
      return true;
    } catch (err: any) {
      console.error('Error sending friend request:', err);
      toast({
        title: 'Error',
        description: friendRequestSendErrorDescription(err),
        variant: 'destructive'
      });
      
      return false;
    }
  }, [authAxios, user, toast]);
  
  const resolveFriendRequest = useCallback(async (requestId: string, action: FriendRequestAction) => {
    if (!user) return false;
    const copy = FRIEND_REQUEST_ACTION_COPY[action];
    
    try {
      await authAxios.post(`/api/social/friendships/${action}/${requestId}`);
      
      // Update requests list
      setFriendRequests(prev => prev.filter(request => request.id !== requestId));
      
      if (action === 'accept') {
        // Update friends list
        await fetchFriends();
      }
      
      toast({
        title: copy.successTitle,
        description: copy.successDescription,
        variant: 'default'
      });
      
      return true;
    } catch (err) {
      console.error(copy.errorLog, err);
      toast({
        title: 'Error',
        description: copy.errorDescription,
        variant: 'destructive'
      });
      
      return false;
    }
  }, [authAxios, user, toast, fetchFriends]);

  // Accept a friend request
  const acceptFriendRequest = useCallback(
    (requestId: string) => resolveFriendRequest(requestId, 'accept'),
    [resolveFriendRequest]
  );
  
  // Decline a friend request
  const declineFriendRequest = useCallback(
    (requestId: string) => resolveFriendRequest(requestId, 'decline'),
    [resolveFriendRequest]
  );
  
  // Remove a friend
  const removeFriend = useCallback(async (friendshipId: string) => {
    if (!user) return false;
    
    try {
      await authAxios.delete(`/api/social/friendships/${friendshipId}`);
      
      // Update friends list
      setFriends(prev => prev.filter(friend => friend.friendshipId !== friendshipId));
      
      toast({
        title: 'Friend removed',
        description: 'The friend has been removed from your friends list.',
        variant: 'default'
      });
      
      return true;
    } catch (err) {
      console.error('Error removing friend:', err);
      toast({
        title: 'Error',
        description: 'Unable to remove friend. Please try again later.',
        variant: 'destructive'
      });
      
      return false;
    }
  }, [authAxios, user, toast]);
  
  // Search for users via backend API
  const searchUsers = useCallback(async (query: string) => {
    const trimmedQuery = socialSearchQuery(Boolean(user), query);
    if (!trimmedQuery) return [];

    try {
      const response = await authAxios.get('/api/social/friendships/search', {
        params: { q: trimmedQuery }
      });
      return response.data.results || [];
    } catch (err) {
      console.error('Error searching users:', err);
      toast({
        title: 'Error',
        description: 'Unable to search for users. Please try again later.',
        variant: 'destructive'
      });

      return [];
    }
  }, [authAxios, user, toast]);
  
  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchFriendRequests();
      fetchFriendSuggestions();
    }
  }, [user, fetchFriends, fetchFriendRequests, fetchFriendSuggestions]);
  
  return {
    // Friends
    friends,
    isLoading,
    error,
    fetchFriends,
    removeFriend,
    
    // Friend requests
    friendRequests,
    isLoadingRequests,
    fetchFriendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    
    // Friend suggestions
    friendSuggestions,
    isLoadingSuggestions,
    fetchFriendSuggestions,
    searchUsers
  };
};

export type SocialFriendsApi = ReturnType<typeof useSocialFriends>;
