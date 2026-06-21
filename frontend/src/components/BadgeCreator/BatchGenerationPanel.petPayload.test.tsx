import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BatchGenerationPanel, { BADGE_BATCH_PET_ERROR } from './BatchGenerationPanel';
import type { ArtStyle } from './StyleBrowser';

const apiMocks = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('../../services/api.service', () => ({
  default: {
    post: apiMocks.post,
  },
}));

const styles: ArtStyle[] = [{
  id: 'crystalline',
  name: 'Crystalline Swan',
  category: 'Signature',
  promptModifier: 'crystalline swan style',
}];

const renderPanel = () => {
  const onCreditsUpdate = vi.fn();
  const onStatusMsg = vi.fn();
  render(
    <BatchGenerationPanel
      styles={styles}
      credits={{ remaining: 10, max: 20 }}
      onCreditsUpdate={onCreditsUpdate}
      onStatusMsg={onStatusMsg}
    />
  );
  return { onCreditsUpdate, onStatusMsg };
};

const selectPetMode = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /^pet avatar$/i }));
  await user.click(screen.getByRole('button', { name: /crystalline swan/i }));
  return user;
};

describe('BatchGenerationPanel pet avatar payload safety', () => {
  beforeEach(() => {
    apiMocks.post.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('uses safe pet failure copy for 2xx provider failures', async () => {
    apiMocks.post.mockResolvedValue({
      data: {
        success: false,
        message: 'Gemini provider key failed for private pet route',
      },
    });
    const { onCreditsUpdate, onStatusMsg } = renderPanel();
    const user = await selectPetMode();

    await user.click(screen.getByRole('button', { name: /generate pet avatar/i }));

    await waitFor(() => expect(onStatusMsg).toHaveBeenCalledWith({
      type: 'error',
      text: BADGE_BATCH_PET_ERROR,
    }));
    expect(onCreditsUpdate).not.toHaveBeenCalled();
    expect(onStatusMsg).not.toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringMatching(/provider key|private pet route/i),
    }));
  });

  it('rejects unsafe pet avatar image URLs before rendering selectable results', async () => {
    apiMocks.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          imageUrl: 'javascript:alert(1)',
          creditsRemaining: 9,
        },
      },
    });
    const { onCreditsUpdate, onStatusMsg } = renderPanel();
    const user = await selectPetMode();

    await user.click(screen.getByRole('button', { name: /generate pet avatar/i }));

    await waitFor(() => expect(onStatusMsg).toHaveBeenCalledWith({
      type: 'error',
      text: BADGE_BATCH_PET_ERROR,
    }));
    expect(onCreditsUpdate).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /select pet avatar variation/i })).not.toBeInTheDocument();
  });
});
