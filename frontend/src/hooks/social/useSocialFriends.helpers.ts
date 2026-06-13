/**
 * Pure helpers for useSocialFriends.
 *
 * These helpers keep API response shaping and copy tables out of the hook body
 * so the hook stays focused on state and side effects.
 */
import type { FriendRequestAction, FriendUser } from './useSocialFriends.types';

export const FRIEND_REQUEST_ACTION_COPY: Record<FriendRequestAction, {
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

export function responseFriendshipId(response: FriendRequestResponse) {
  const friendshipId = response.data?.friendship?.id;
  return friendshipId == null ? null : String(friendshipId);
}

export function pendingSuggestion(candidate: FriendUser, recipientId: string, friendshipId: string | null) {
  if (candidate.id !== recipientId) return candidate;
  return {
    ...candidate,
    friendshipStatus: 'pending' as const,
    friendshipId: friendshipId || candidate.friendshipId || null,
    isRequester: true,
  };
}

export function friendRequestSendErrorDescription(err: unknown) {
  return (err as { response?: { data?: { message?: string } } }).response?.data?.message || FRIEND_REQUEST_SEND_FALLBACK;
}

export function socialSearchQuery(canSearch: boolean, query: string) {
  const trimmedQuery = query.trim();
  if (!canSearch) return null;
  if (!trimmedQuery) return null;
  return trimmedQuery;
}
