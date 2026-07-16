
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CompanionPetPanel from './CompanionPetPanel';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('../../services/api.service', () => ({
  default: {
    get: apiMocks.get,
    post: apiMocks.post,
  },
}));

const mockPetResponse = (overrides = {}) => ({
  data: {
    success: true,
    data: {
      hasPet: true,
      pet: {
        species: 'frost_swan',
        name: 'Fable',
        evolution: { stage: 2, label: 'Juvenile' },
        health: 82,
        happiness: 91,
        mood: { label: 'happy', animation: 'bounce' },
        appearance: {},
        ...overrides,
      },
    },
  },
});

describe('CompanionPetPanel interaction locks', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.post.mockReset();
    apiMocks.get.mockResolvedValue(mockPetResponse());
  });

  it('shows safe companion load outage copy instead of loading forever', async () => {
    apiMocks.get.mockRejectedValueOnce(new Error('private pet host failed'));

    render(<CompanionPetPanel userIdSegment="client-42" onAdoptClick={vi.fn()} />);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Companion data is unavailable. Please try again later.'
    );
    expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/private pet host/i)).not.toBeInTheDocument();
  });

  it('blocks concurrent pet interactions before React can rerender disabled buttons', async () => {
    const pendingPosts: Array<() => void> = [];
    apiMocks.post.mockImplementation(() => new Promise((resolve) => {
      pendingPosts.push(() => resolve({ data: { success: true } }));
    }));

    render(<CompanionPetPanel userIdSegment="client-42" onAdoptClick={vi.fn()} />);
    const petButton = await screen.findByRole('button', { name: /^pet$/i });

    act(() => {
      fireEvent.click(petButton);
      fireEvent.click(petButton);
    });

    expect(apiMocks.post).toHaveBeenCalledTimes(1);
    expect(apiMocks.post).toHaveBeenCalledWith(
      '/api/gamification/users/client-42/pet/interact',
      { interactionType: 'pet' }
    );

    pendingPosts.forEach((resolve) => resolve());
    await waitFor(() => expect(apiMocks.get).toHaveBeenCalledTimes(2));
  });

  it('clamps malformed pet stats instead of rendering impossible percentages', async () => {
    apiMocks.get.mockResolvedValueOnce(mockPetResponse({
      evolution: { stage: 99, label: 'Impossible' },
      health: 140,
      happiness: -10,
    }));

    render(<CompanionPetPanel userIdSegment="client-42" onAdoptClick={vi.fn()} />);

    expect(await screen.findByText('Mythic')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('normalizes malformed pet identity fields before rendering', async () => {
    apiMocks.get.mockResolvedValueOnce(mockPetResponse({
      species: { privateSpecies: 'leaked' },
      name: { privateName: 'leaked' },
      evolution: { stage: 'ancient' },
      mood: { label: { privateMood: 'leaked' } },
      health: 'high',
      happiness: null,
    }));

    render(<CompanionPetPanel userIdSegment="client-42" onAdoptClick={vi.fn()} />);

    expect(await screen.findByText('Unnamed')).toBeInTheDocument();
    expect(screen.getByText('Egg')).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getAllByText('0%')).toHaveLength(2);
    expect(screen.queryByText(/private|leaked|\[object Object\]/i)).not.toBeInTheDocument();
  });
});
