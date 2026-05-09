import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TrendingHashtags from './TrendingHashtags';
import api from '../../../services/api';

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('TrendingHashtags', () => {
  it('reads the canonical backend data wrapper', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          { id: 10, name: 'strength', weeklyCount: 4, category: 'fitness' },
        ],
      },
    });

    render(<TrendingHashtags showEmptyState />);

    expect(await screen.findByText('strength')).toBeInTheDocument();
    expect(screen.getByText('4 posts')).toBeInTheDocument();
  });

  it('shows the default welcome trend instead of an empty dashboard rail', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: [] } });

    render(<TrendingHashtags showEmptyState />);

    await waitFor(() => {
      expect(screen.getByText('welcome')).toBeInTheDocument();
    });
    expect(screen.getByText('Admin welcome')).toBeInTheDocument();
  });
});
