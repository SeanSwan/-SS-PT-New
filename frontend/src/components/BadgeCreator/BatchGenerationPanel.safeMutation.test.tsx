
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BatchGenerationPanel, {
  BADGE_BATCH_GENERATE_ERROR,
  BADGE_BATCH_NETWORK_ERROR,
  BADGE_BATCH_PET_ERROR,
  BADGE_BATCH_SAVE_ERROR,
} from './BatchGenerationPanel';
import type { ArtStyle } from './StyleBrowser';

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

const styles: ArtStyle[] = [{
  id: 'crystalline',
  name: 'Crystalline Swan',
  category: 'Signature',
  promptModifier: 'crystalline swan style',
}];

const batchSuccess = {
  success: true,
  data: {
    batchGroupId: 'batch-1',
    creditsUsed: 5,
    creditsRemaining: 7,
    styleMixed: false,
    images: [{
      index: 0,
      variation: 'Variation A',
      success: true,
      imageUrl: '/uploads/badge-creator/badge.png',
    }],
  },
};

const renderPanel = () => {
  const onCreditsUpdate = vi.fn();
  const onStatusMsg = vi.fn();
  render(
    <BatchGenerationPanel
      styles={styles}
      credits={{ remaining: 12, max: 20 }}
      onCreditsUpdate={onCreditsUpdate}
      onStatusMsg={onStatusMsg}
    />
  );
  return { onCreditsUpdate, onStatusMsg };
};

const fillBatchInputs = async () => {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText(/golden swan shield/i), 'Crystal finisher badge');
  await user.click(screen.getByRole('button', { name: /crystalline swan/i }));
  return user;
};

const selectPetAvatarMode = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /^pet avatar$/i }));
  await user.click(screen.getByRole('button', { name: /crystalline swan/i }));
  return user;
};

describe('BatchGenerationPanel', () => {
  beforeEach(() => {
    apiMocks.get.mockReset();
    apiMocks.patch.mockReset();
    apiMocks.post.mockReset();
  });

  it('uses safe batch generation failure copy without leaking backend messages', async () => {
    apiMocks.post.mockResolvedValue({
      data: {
        success: false,
        message: 'SequelizeConnectionError: password authentication failed for user "swanadmin"',
      },
    });
    const { onStatusMsg } = renderPanel();
    const user = await fillBatchInputs();

    await user.click(screen.getByRole('button', { name: /generate 5 variations/i }));

    await waitFor(() => expect(onStatusMsg).toHaveBeenCalledWith({
      type: 'error',
      text: BADGE_BATCH_GENERATE_ERROR,
    }));
    expect(onStatusMsg).not.toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringMatching(/SequelizeConnectionError|swanadmin/i),
    }));
  });

  it('blocks concurrent batch generation before React can rerender disabled state', async () => {
    const pendingGenerations: Array<() => void> = [];
    apiMocks.post.mockImplementation(() => new Promise((resolve) => {
      pendingGenerations.push(() => resolve({ data: batchSuccess }));
    }));
    renderPanel();
    await fillBatchInputs();
    const generateButton = screen.getByRole('button', { name: /generate 5 variations/i });

    act(() => {
      fireEvent.click(generateButton);
      fireEvent.click(generateButton);
    });

    expect(apiMocks.post).toHaveBeenCalledTimes(1);
    pendingGenerations.forEach(resolve => resolve());
    await waitFor(() => expect(screen.getByRole('button', { name: /select variation a/i })).toBeInTheDocument());
  });

  it('marks provider-success results skipped when the returned image URL is unsafe', async () => {
    apiMocks.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          ...batchSuccess.data,
          images: [{
            index: 0,
            variation: 'Variation A',
            success: true,
            imageUrl: 'javascript:alert(1)',
          }],
        },
      },
    });
    const { onStatusMsg } = renderPanel();
    const user = await fillBatchInputs();

    await user.click(screen.getByRole('button', { name: /generate 5 variations/i }));

    expect(await screen.findByText(/generation skipped/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select variation a/i })).toBeDisabled();
    await waitFor(() => expect(onStatusMsg).toHaveBeenCalledWith({
      type: 'success',
      text: 'Batch complete: 0/5 variations generated',
    }));
  });

  it('uses generation error copy when provider success has a malformed image collection', async () => {
    apiMocks.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          ...batchSuccess.data,
          images: { message: 'private batch image table leaked' },
        },
      },
    });
    const { onStatusMsg } = renderPanel();
    const user = await fillBatchInputs();

    await user.click(screen.getByRole('button', { name: /generate 5 variations/i }));

    await waitFor(() => expect(onStatusMsg).toHaveBeenCalledWith({
      type: 'error',
      text: BADGE_BATCH_GENERATE_ERROR,
    }));
    expect(onStatusMsg).not.toHaveBeenCalledWith({
      type: 'error',
      text: BADGE_BATCH_NETWORK_ERROR,
    });
  });

  it('drops malformed batch image rows while preserving valid generated images', async () => {
    apiMocks.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          ...batchSuccess.data,
          images: [
            null,
            { message: 'private batch image row leaked' },
            {
              index: 0,
              variation: 'Clean Variation',
              success: true,
              imageUrl: '/uploads/badge-creator/clean.png',
            },
          ],
        },
      },
    });
    const { onStatusMsg } = renderPanel();
    const user = await fillBatchInputs();

    await user.click(screen.getByRole('button', { name: /generate 5 variations/i }));

    expect(await screen.findByRole('button', { name: /select clean variation variation/i })).toBeInTheDocument();
    expect(screen.queryByText(/private batch image row leaked/i)).not.toBeInTheDocument();
    await waitFor(() => expect(onStatusMsg).toHaveBeenCalledWith({
      type: 'success',
      text: 'Batch complete: 1/5 variations generated',
    }));
  });

  it('caps oversized provider batch payloads to the promised five variations', async () => {
    apiMocks.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          ...batchSuccess.data,
          images: Array.from({ length: 7 }, (_, index) => ({
            index,
            variation: `Variation ${index + 1}`,
            success: true,
            imageUrl: `/uploads/badge-creator/badge-${index + 1}.png`,
          })),
        },
      },
    });
    const { onStatusMsg } = renderPanel();
    const user = await fillBatchInputs();

    await user.click(screen.getByRole('button', { name: /generate 5 variations/i }));

    expect(await screen.findByRole('button', { name: /select variation 5 variation/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /select variation/i })).toHaveLength(5);
    expect(screen.queryByRole('button', { name: /select variation 6 variation/i })).not.toBeInTheDocument();
    await waitFor(() => expect(onStatusMsg).toHaveBeenCalledWith({
      type: 'success',
      text: 'Batch complete: 5/5 variations generated',
    }));
  });

  it('rejects malformed pet avatar credit counts before updating credits', async () => {
    apiMocks.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          imageUrl: '/uploads/badge-creator/pet.png',
          creditsRemaining: 'private credit ledger leaked',
        },
      },
    });
    const { onCreditsUpdate, onStatusMsg } = renderPanel();
    const user = await selectPetAvatarMode();

    await user.click(screen.getByRole('button', { name: /generate pet avatar/i }));

    await waitFor(() => expect(onStatusMsg).toHaveBeenCalledWith({
      type: 'error',
      text: BADGE_BATCH_PET_ERROR,
    }));
    expect(onCreditsUpdate).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /select pet avatar variation/i })).not.toBeInTheDocument();
  });

  it('uses safe save failure copy without leaking backend messages', async () => {
    apiMocks.post
      .mockResolvedValueOnce({ data: batchSuccess })
      .mockResolvedValueOnce({
        data: {
          success: false,
          message: 'SequelizeDatabaseError: relation "Badges" does not exist',
        },
      });
    const { onStatusMsg } = renderPanel();
    const user = await fillBatchInputs();
    await user.click(screen.getByRole('button', { name: /generate 5 variations/i }));
    await user.click(await screen.findByRole('button', { name: /select variation a/i }));
    await user.type(screen.getByPlaceholderText(/badge name/i), 'Crystal Finisher');

    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(onStatusMsg).toHaveBeenCalledWith({
      type: 'error',
      text: BADGE_BATCH_SAVE_ERROR,
    }));
    expect(onStatusMsg).not.toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringMatching(/SequelizeDatabaseError|Badges/i),
    }));
  });

  it('blocks concurrent save before React can rerender disabled state', async () => {
    const pendingSaves: Array<() => void> = [];
    apiMocks.post
      .mockResolvedValueOnce({ data: batchSuccess })
      .mockImplementation(() => new Promise((resolve) => {
        pendingSaves.push(() => resolve({ data: { success: true } }));
      }));
    renderPanel();
    const user = await fillBatchInputs();
    await user.click(screen.getByRole('button', { name: /generate 5 variations/i }));
    await user.click(await screen.findByRole('button', { name: /select variation a/i }));
    await user.type(screen.getByPlaceholderText(/badge name/i), 'Crystal Finisher');
    const saveButton = screen.getByRole('button', { name: /^save$/i });

    act(() => {
      fireEvent.click(saveButton);
      fireEvent.click(saveButton);
    });

    const saveCalls = apiMocks.post.mock.calls.filter(([path]) => path === '/api/admin/badge-creator/save');
    expect(saveCalls).toHaveLength(1);
    pendingSaves.forEach(resolve => resolve());
    await waitFor(() => expect(saveButton).not.toBeInTheDocument());
  });

  it('uses safe network copy for transport failures', async () => {
    apiMocks.post.mockRejectedValue(new Error('fetch failed: database host refused connection'));
    const { onStatusMsg } = renderPanel();
    const user = await fillBatchInputs();

    await user.click(screen.getByRole('button', { name: /generate 5 variations/i }));

    await waitFor(() => expect(onStatusMsg).toHaveBeenCalledWith({
      type: 'error',
      text: BADGE_BATCH_NETWORK_ERROR,
    }));
  });
});
