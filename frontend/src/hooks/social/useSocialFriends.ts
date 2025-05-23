import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../use-toast';

// Friend types
interface FriendUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
  role: string;
  points?: number;
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
        description: err.response?.data?.message || 'Unable to send friend request. Please try again later.',
        variant: 'destructive'
      });
      
      return false;
    }
  }, [authAxios, user, toast]);
  
  // Accept a friend request
  const acceptFriendRequest = useCallback(async (requestId: string) => {
    if (!user) return false;
    
    try {
      const response = await authAxios.post(`/api/social/friendships/accept/${requestId}`);
      
      // Update requests list
      setFriendRequests(prev => prev.filter(request => request.id !== requestId));
      
      // Update friends list
      await fetchFriends();
      
      toast({
        title: 'Friend request accepted',
        description: 'You are now friends with this user.',
        variant: 'default'
      });
      
      return true;
    } catch (err) {
      console.error('Error accepting friend request:', err);
      toast({
        title: 'Error',
        description: 'Unable to accept friend request. Please try again later.',
        variant: 'destructive'
      });
      
      return false;
    }
  }, [authAxios, user, toast, fetchFriends]);
  
  // Decline a friend request
  const declineFriendRequest = useCallback(async (requestId: string) => {
    if (!user) return false;
    
    try {
      const response = await authAxios.post(`/api/social/friendships/decline/${requestId}`);
      
      // Update requests list
      setFriendRequests(prev => prev.filter(request => request.id !== requestId));
      
      toast({
        title: 'Friend request declined',
        description: 'The friend request has been declined.',
        variant: 'default'
      });
      
      return true;
    } catch (err) {
      console.error('Error declining friend request:', err);
      toast({
        title: 'Error',
        description: 'Unable to decline friend request. Please try again later.',
        variant: 'destructive'
      });
      
      return false;
    }
  }, [authAxios, user, toast]);
  
  // Remove a friend
  const removeFriend = useCallback(async (friendshipId: string) => {
    if (!user) return false;
    
    try {
      const response = await authAxios.delete(`/api/social/friendships/${friendshipId}`);
      
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
  
  // Search for users
  const searchUsers = useCallback(async (query: string) => {
    if (!user || !query.trim()) return [];
    
    try {
      // For now, just return friend suggestions as search results
      // In a real implementation, this would make an API call to search for users
      return friendSuggestions.filter(user => {
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        const username = user.username.toLowerCase();
        const searchQuery = query.toLowerCase();
        
        return fullName.includes(searchQuery) || username.includes(searchQuery);
      });
    } catch (err) {
      console.error('Error searching users:', err);
      toast({
        title: 'Error',
        description: 'Unable to search for users. Please try again later.',
        variant: 'destructive'
      });
      
      return [];
    }
  }, [authAxios, user, toast, friendSuggestions]);
  
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
