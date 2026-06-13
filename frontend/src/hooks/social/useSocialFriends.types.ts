/**
 * Shared social friends hook types.
 *
 * Kept separate from the hook implementation so row components can import
 * stable contracts without pulling hook code into presentation modules.
 */
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

export interface Friend extends FriendUser {
  friendshipId: string;
  createdAt: string;
}

export interface FriendRequest {
  id: string;
  requester: FriendUser;
  createdAt: string;
}

export type FriendRequestAction = 'accept' | 'decline';
