import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NewConversationModal from './NewConversationModal';
import type { SearchUserResult } from './MessagingTypes';

vi.mock('../../../hooks/social/useSocialFriends', () => ({
  useSocialFriends: () => ({ friends: [], isLoading: false }),
}));

const miraCoach: SearchUserResult = {
  id: 204,
  firstName: 'Mira',
  lastName: 'Coach',
  username: 'mira',
  photo: null,
  role: 'trainer',
  displayName: 'Mira Coach',
  lastActive: null,
};

describe('NewConversationModal search privacy', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('does not enumerate users on open or for one-character searches', async () => {
    const searchUsers = vi.fn(async () => [miraCoach]);

    render(
      <NewConversationModal
        isOpen
        onClose={vi.fn()}
        onStartConversation={vi.fn()}
        searchUsers={searchUsers}
      />
    );

    expect(searchUsers).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Search users'), { target: { value: 'M' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    expect(searchUsers).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Search users'), { target: { value: 'Mi' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    expect(searchUsers).toHaveBeenCalledTimes(1);
    expect(searchUsers).toHaveBeenCalledWith('Mi');
    expect(screen.getByText('Mira Coach')).toBeInTheDocument();
  });
});
