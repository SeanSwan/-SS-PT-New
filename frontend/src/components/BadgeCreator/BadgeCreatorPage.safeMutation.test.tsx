
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BadgeCreatorPage, {
  BADGE_CREATOR_GENERATE_ERROR,
  BADGE_CREATOR_NETWORK_ERROR,
  BADGE_CREATOR_SAVE_ERROR,
} from './BadgeCreatorPage';

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock('../../services/api.service', () => ({
  default: {
    get: apiMocks.get,
    patch: apiMocks.patch,
    post: apiMocks.post,
  },
}));

const styles = [{
  id: 'crystalline',
  name: 'Crystalline Swan',
  category: 'Signature',
  promptModifier: 'crystalline swan style',
}];

const generatedBadge = {
  success: true,
  data: {
    imageUrl: '/uploads/badge-creator/generated-badge.png',
    creditsRemaining: 6,
  },
};

const mockPageData = () => {
  apiMocks.get.mockImplementation((path: string) => {
    if (path.includes('/styles')) {
      return Promise.resolve({ data: { success: true, data: styles } });
    }
    if (path.includes('/credits')) {
      return Promise.resolve({ data: { success: true, data: { remaining: 10, max: 20 } } });
    }
    return Promise.resolve({ data: { success: false } });
  });
};

const prepareGenerate = async () => {
  const user = userEvent.setup();
  render(<BadgeCreatorPage />);
  await user.type(screen.getByLabelText(/describe your badge/i), 'Crystal finisher badge');
  await user.click(await screen.findByRole('button', { name: /crystalline swan/i }));
  return user;
};

describe('BadgeCreatorPage default generation', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.patch.mockReset();
    apiMocks.post.mockReset();
    mockPageData();
  });

  it('shows safe generation failure copy without leaking backend messages', async () => {
    apiMocks.post.mockResolvedValue({
      data: {
        success: false,
        message: 'SequelizeConnectionError: password authentication failed for user "swanadmin"',
      },
    });
    const user = await prepareGenerate();

    await user.click(screen.getByRole('button', { name: /^generate badge$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(BADGE_CREATOR_GENERATE_ERROR);
    expect(screen.queryByText(/SequelizeConnectionError/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/swanadmin/i)).not.toBeInTheDocument();
  });

  it('drops malformed style and credit read payloads before the shell renders them', async () => {
    apiMocks.get.mockImplementation((path: string) => {
      if (path.includes('/styles')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              message: 'SequelizeConnectionError: private style catalog failed',
              rows: [styles[0]],
            },
          },
        });
      }
      if (path.includes('/credits')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              remaining: '10',
              max: undefined,
            },
          },
        });
      }
      return Promise.resolve({ data: { success: false } });
    });

    render(<BadgeCreatorPage />);

    await waitFor(() => expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument());
    expect(screen.queryByText(/SequelizeConnectionError/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/private style catalog/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/undefined\/undefined generations left/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^generate badge$/i })).toBeDisabled();
  });

  it('keeps valid style rows from mixed style payloads and drops malformed rows', async () => {
    apiMocks.get.mockImplementation((path: string) => {
      if (path.includes('/styles')) {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              null,
              { id: '', name: 'Bad Style', category: 'Broken', promptModifier: 'bad' },
              styles[0],
            ],
          },
        });
      }
      if (path.includes('/credits')) {
        return Promise.resolve({ data: { success: true, data: { remaining: 10, max: 20 } } });
      }
      return Promise.resolve({ data: { success: false } });
    });

    render(<BadgeCreatorPage />);

    expect(await screen.findByRole('button', { name: /crystalline swan/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /bad style/i })).not.toBeInTheDocument();
    expect(screen.getByText(/10\/20 generations left/i)).toBeInTheDocument();
  });

  it('blocks concurrent generation before React can rerender disabled state', async () => {
    const pendingGenerations: Array<() => void> = [];
    apiMocks.post.mockImplementation(() => new Promise((resolve) => {
      pendingGenerations.push(() => resolve({ data: generatedBadge }));
    }));
    await prepareGenerate();
    const generateButton = screen.getByRole('button', { name: /^generate badge$/i });

    act(() => {
      fireEvent.click(generateButton);
      fireEvent.click(generateButton);
    });

    expect(apiMocks.post).toHaveBeenCalledTimes(1);
    pendingGenerations.forEach(resolve => resolve());
    await waitFor(() => expect(screen.getByAltText(/generated badge/i)).toBeInTheDocument());
  });

  it('rejects unsafe successful generation image URLs before preview or save', async () => {
    apiMocks.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          imageUrl: 'javascript:alert(1)',
          creditsRemaining: 6,
        },
      },
    });
    const user = await prepareGenerate();

    await user.click(screen.getByRole('button', { name: /^generate badge$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(BADGE_CREATOR_GENERATE_ERROR);
    expect(screen.queryByAltText(/generated badge/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^save badge$/i })).not.toBeInTheDocument();
  });

  it('rejects successful generation payloads with malformed credit counts', async () => {
    apiMocks.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          imageUrl: generatedBadge.data.imageUrl,
          creditsRemaining: 'six',
        },
      },
    });
    const user = await prepareGenerate();

    await user.click(screen.getByRole('button', { name: /^generate badge$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(BADGE_CREATOR_GENERATE_ERROR);
    expect(screen.queryByAltText(/generated badge/i)).not.toBeInTheDocument();
    expect(screen.getByText(/10\/20 generations left/i)).toBeInTheDocument();
  });

  it('keeps regenerate gated when the first generation exhausts credits', async () => {
    apiMocks.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          ...generatedBadge.data,
          creditsRemaining: 0,
        },
      },
    });
    const user = await prepareGenerate();

    await user.click(screen.getByRole('button', { name: /^generate badge$/i }));
    await screen.findByAltText(/generated badge/i);

    const regenerateButton = screen.getByRole('button', { name: /regenerate/i });
    expect(regenerateButton).toBeDisabled();

    await user.click(regenerateButton);
    const generateCalls = apiMocks.post.mock.calls.filter(([path]) => path === '/api/admin/badge-creator/generate');
    expect(generateCalls).toHaveLength(1);
  });

  it('opens the direct upload workflow from the Upload tab', async () => {
    const user = userEvent.setup();
    render(<BadgeCreatorPage />);
    await screen.findByText(/10\/20 generations left/i);
    const uploadTab = screen.getByRole('button', { name: /^upload$/i });

    expect(uploadTab).not.toBeDisabled();
    await user.click(uploadTab);

    expect(screen.getByRole('heading', { name: /upload badge art/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/badge image/i)).toBeInTheDocument();
  });

  it('shows safe save failure copy without leaking backend messages', async () => {
    apiMocks.post
      .mockResolvedValueOnce({ data: generatedBadge })
      .mockResolvedValueOnce({
        data: {
          success: false,
          message: 'SequelizeDatabaseError: relation "Badges" does not exist',
        },
      });
    const user = await prepareGenerate();
    await user.click(screen.getByRole('button', { name: /^generate badge$/i }));
    await screen.findByAltText(/generated badge/i);
    await user.type(screen.getByLabelText(/badge name/i), 'Crystal Finisher');

    await user.click(screen.getByRole('button', { name: /^save badge$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(BADGE_CREATOR_SAVE_ERROR);
    expect(screen.queryByText(/SequelizeDatabaseError/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Badges/i)).not.toBeInTheDocument();
  });

  it('blocks concurrent save before React can rerender disabled state', async () => {
    const pendingSaves: Array<() => void> = [];
    apiMocks.post
      .mockResolvedValueOnce({ data: generatedBadge })
      .mockImplementation(() => new Promise((resolve) => {
        pendingSaves.push(() => resolve({ data: { success: true } }));
      }));
    const user = await prepareGenerate();
    await user.click(screen.getByRole('button', { name: /^generate badge$/i }));
    await screen.findByAltText(/generated badge/i);
    await user.type(screen.getByLabelText(/badge name/i), 'Crystal Finisher');
    const saveButton = screen.getByRole('button', { name: /^save badge$/i });

    act(() => {
      fireEvent.click(saveButton);
      fireEvent.click(saveButton);
    });

    const saveCalls = apiMocks.post.mock.calls.filter(([path]) => path === '/api/admin/badge-creator/save');
    expect(saveCalls).toHaveLength(1);
    await act(async () => {
      pendingSaves.forEach(resolve => resolve());
    });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Badge "Crystal Finisher" saved.'));
  });

  it('shows safe network copy for transport failures', async () => {
    apiMocks.post.mockRejectedValue(new Error('fetch failed: database host refused connection'));
    const user = await prepareGenerate();

    await user.click(screen.getByRole('button', { name: /^generate badge$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(BADGE_CREATOR_NETWORK_ERROR);
  });

});
