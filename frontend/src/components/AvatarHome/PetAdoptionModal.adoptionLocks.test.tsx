import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PetAdoptionModal from './PetAdoptionModal';

const apiMocks = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('../../services/api.service', () => ({
  default: {
    post: apiMocks.post,
  },
}));

describe('PetAdoptionModal adoption lock', () => {
  beforeEach(() => {
    apiMocks.post.mockReset();
  });

  it('blocks concurrent adoption before React can rerender disabled state', async () => {
    const pendingPosts: Array<() => void> = [];
    apiMocks.post.mockImplementation(() => new Promise((resolve) => {
      pendingPosts.push(() => resolve({ data: { success: true } }));
    }));
    const onAdopted = vi.fn();
    const onClose = vi.fn();

    render(
      <PetAdoptionModal
        userIdSegment="client-42"
        onAdopted={onAdopted}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /crystal dragon/i }));
    fireEvent.change(screen.getByLabelText(/pet name/i), { target: { value: 'Frost' } });
    const adoptButton = screen.getByRole('button', { name: /^adopt$/i });

    act(() => {
      fireEvent.click(adoptButton);
      fireEvent.click(adoptButton);
    });

    expect(apiMocks.post).toHaveBeenCalledTimes(1);
    expect(adoptButton).toHaveAttribute('aria-busy', 'true');
    pendingPosts.forEach((resolve) => resolve());
    await waitFor(() => expect(onAdopted).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows safe failure copy without closing the modal or leaking backend details', async () => {
    apiMocks.post.mockResolvedValue({
      data: {
        success: false,
        message: 'SequelizeConnectionError: password authentication failed for user "swanadmin"',
      },
    });
    const onAdopted = vi.fn();
    const onClose = vi.fn();

    render(
      <PetAdoptionModal
        userIdSegment="client-42"
        onAdopted={onAdopted}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /crystal dragon/i }));
    fireEvent.change(screen.getByLabelText(/pet name/i), { target: { value: 'Frost' } });
    fireEvent.click(screen.getByRole('button', { name: /^adopt$/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Unable to adopt companion. Please try again.'
    );
    expect(screen.queryByText(/SequelizeConnectionError/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/swanadmin/i)).not.toBeInTheDocument();
    expect(onAdopted).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
