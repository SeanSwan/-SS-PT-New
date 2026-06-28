import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BadgeUploadPanel, { BADGE_UPLOAD_ERROR } from './BadgeUploadPanel';

const apiMocks = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('../../services/api.service', () => ({
  default: {
    post: apiMocks.post,
  },
}));

describe('BadgeUploadPanel', () => {
  beforeEach(() => {
    apiMocks.post.mockReset();
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:badge-preview'),
      revokeObjectURL: vi.fn(),
    });
  });

  it('uploads badge art through the admin badge creator route with assignment metadata', async () => {
    apiMocks.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          name: 'Swan Sapphire Finisher',
          imageUrl: '/uploads/products/badge-admin-upload.png',
        },
      },
    });
    const user = userEvent.setup();
    render(<BadgeUploadPanel />);

    const file = new File(['badge-bytes'], 'sapphire.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText(/badge image/i), file);
    await user.type(screen.getByLabelText(/badge name/i), 'Swan Sapphire Finisher');
    await user.type(screen.getByLabelText(/description/i), 'Uploaded art for the Swan Sapphire milestone.');
    await user.clear(screen.getByLabelText(/xp reward/i));
    await user.type(screen.getByLabelText(/xp reward/i), '125');
    await user.selectOptions(screen.getByLabelText(/connect to/i), 'achievement');
    await user.type(screen.getByLabelText(/assignment target/i), 'max_level');
    await user.click(screen.getByRole('button', { name: /upload badge/i }));

    expect(apiMocks.post).toHaveBeenCalledTimes(1);
    const [path, formData] = apiMocks.post.mock.calls[0];
    expect(path).toBe('/api/admin/badge-creator/upload');
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('name')).toBe('Swan Sapphire Finisher');
    expect(formData.get('description')).toBe('Uploaded art for the Swan Sapphire milestone.');
    expect(formData.get('abilityPoints')).toBe('125');
    expect(formData.get('assignedTo')).toBe('achievement');
    expect(formData.get('assignedTarget')).toBe('max_level');
    expect(formData.get('image')).toBe(file);
    expect(await screen.findByRole('status')).toHaveTextContent('Badge "Swan Sapphire Finisher" uploaded.');
  });

  it('opens the native badge image picker from the keyboard-focused drop zone', async () => {
    const user = userEvent.setup();
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    try {
      render(<BadgeUploadPanel />);
      screen.getByRole('button', { name: /choose badge art file/i }).focus();
      await user.keyboard('{Enter}');
      expect(clickSpy).toHaveBeenCalledTimes(1);
    } finally {
      clickSpy.mockRestore();
    }
  });

  it('uses safe upload failure copy without leaking backend details', async () => {
    apiMocks.post.mockResolvedValue({
      data: {
        success: false,
        message: 'SequelizeConnectionError: password authentication failed for user "swanadmin"',
      },
    });
    const user = userEvent.setup();
    render(<BadgeUploadPanel />);

    await user.upload(screen.getByLabelText(/badge image/i), new File(['badge'], 'badge.png', { type: 'image/png' }));
    await user.type(screen.getByLabelText(/badge name/i), 'Crystal Upload');
    await user.click(screen.getByRole('button', { name: /upload badge/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(BADGE_UPLOAD_ERROR);
    expect(screen.queryByText(/SequelizeConnectionError/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/swanadmin/i)).not.toBeInTheDocument();
  });
});