/**
 * ============================================================================
 * FILE: useGroups.ts
 * PURPOSE: Data layer for first-class community groups — discovery, my
 *          groups, create/join/leave, detail, members.
 * HOW IT FITS: Consumed by the Groups tab (GroupsHub/GroupDetail) and the
 *          Home "Your Groups" strip. Feed data comes from useSocialFeed
 *          with { groupId } — this hook handles everything that is not posts.
 * API: /api/social/groups (backend/routes/social/groups.mjs)
 * ============================================================================
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../use-toast';

export interface GroupMembership {
  role: 'owner' | 'moderator' | 'member';
  status: 'active' | 'pending' | 'banned';
}

export interface CommunityGroup {
  id: number;
  name: string;
  description: string | null;
  emoji: string | null;
  photo: string | null;
  category: string;
  privacy: 'public' | 'private';
  ownerId: number;
  conversationId: number | null;
  memberCount: number;
  lastActivityAt: string | null;
  isArchived: boolean;
  createdAt: string;
  myMembership: GroupMembership | null;
  canViewContent?: boolean;
  canPost?: boolean;
  canModerate?: boolean;
}

export interface GroupMemberEntry {
  userId: number;
  role: GroupMembership['role'];
  status: GroupMembership['status'];
  joinedAt: string;
  user: {
    id: number;
    firstName?: string;
    lastName?: string;
    username?: string;
    photo?: string;
    role?: string;
  } | null;
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  emoji?: string;
  category?: string;
  privacy?: 'public' | 'private';
}

export const GROUP_CATEGORIES = [
  'fitness', 'nutrition', 'motivation', 'lifestyle', 'creative', 'sports', 'general',
] as const;

export const useGroups = (mode: 'discover' | 'mine' = 'discover') => {
  const { authAxios, user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (mode === 'mine') params.set('mine', 'true');
      if (search.trim()) params.set('search', search.trim());
      if (category) params.set('category', category);
      const response = await authAxios.get(`/api/social/groups?${params.toString()}`);
      setGroups(response.data.groups || []);
    } catch (err) {
      console.error('Error loading groups:', err);
      setError('Unable to load groups right now.');
    } finally {
      setIsLoading(false);
    }
  }, [authAxios, user, mode, search, category]);

  // Debounce the search-driven refetches so typing doesn't spam the API.
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!user) return undefined;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void fetchGroups(); }, search ? 300 : 0);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, mode, search, category]);

  const createGroup = useCallback(async (input: CreateGroupInput): Promise<CommunityGroup | null> => {
    try {
      const response = await authAxios.post('/api/social/groups', input);
      const group: CommunityGroup = response.data.group;
      setGroups((prev) => [group, ...prev]);
      toast({ title: 'Group created', description: `"${group.name}" is live. Invite your people!` });
      return group;
    } catch (err: any) {
      toast({
        title: 'Could not create group',
        description: err.response?.data?.message || 'Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  }, [authAxios, toast]);

  const joinGroup = useCallback(async (groupId: number): Promise<CommunityGroup | null> => {
    try {
      const response = await authAxios.post(`/api/social/groups/${groupId}/join`);
      const group: CommunityGroup = response.data.group;
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ...group } : g)));
      toast({ title: group.myMembership?.status === 'pending' ? 'Request sent' : 'Joined!', description: response.data.message });
      return group;
    } catch (err: any) {
      toast({
        title: 'Could not join group',
        description: err.response?.data?.message || 'Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  }, [authAxios, toast]);

  const leaveGroup = useCallback(async (groupId: number): Promise<boolean> => {
    try {
      await authAxios.delete(`/api/social/groups/${groupId}/leave`);
      if (mode === 'mine') {
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
      } else {
        setGroups((prev) => prev.map((g) => (
          g.id === groupId
            ? { ...g, myMembership: null, memberCount: Math.max(g.memberCount - 1, 0) }
            : g
        )));
      }
      toast({ title: 'Left group', description: 'You are no longer a member.' });
      return true;
    } catch (err: any) {
      toast({
        title: 'Could not leave group',
        description: err.response?.data?.message || 'Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  }, [authAxios, toast, mode]);

  return {
    groups,
    isLoading,
    error,
    search,
    setSearch,
    category,
    setCategory,
    refresh: fetchGroups,
    createGroup,
    joinGroup,
    leaveGroup,
  };
};

/** Detail + members for one group (the Groups tab detail view). */
export const useGroupDetail = (groupId: number | null) => {
  const { authAxios, user } = useAuth();
  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [members, setMembers] = useState<GroupMemberEntry[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(groupId));
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!user || !groupId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await authAxios.get(`/api/social/groups/${groupId}`);
      const detail: CommunityGroup = response.data.group;
      setGroup(detail);
      if (detail.canViewContent) {
        try {
          const membersRes = await authAxios.get(`/api/social/groups/${groupId}/members`);
          setMembers(membersRes.data.members || []);
        } catch {
          setMembers([]);
        }
      } else {
        setMembers([]);
      }
    } catch (err: any) {
      setError(err.response?.status === 404 ? 'This group no longer exists.' : 'Unable to load this group.');
    } finally {
      setIsLoading(false);
    }
  }, [authAxios, user, groupId]);

  useEffect(() => {
    if (groupId) void fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, groupId]);

  return { group, members, isLoading, error, refresh: fetchDetail };
};

export type GroupsApi = ReturnType<typeof useGroups>;
