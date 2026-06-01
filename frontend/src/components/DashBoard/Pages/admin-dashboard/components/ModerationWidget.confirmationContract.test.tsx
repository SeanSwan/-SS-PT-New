import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ModerationWidget from './ModerationWidget';

const mockAuthAxios = {
  delete: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
};

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/ModerationWidget.tsx'),
  'utf8',
);
const dialogSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/ModerationConfirmDialog.tsx'),
  'utf8',
);

describe('ModerationWidget destructive action confirmation', () => {
  beforeEach(() => {
    mockAuthAxios.delete.mockReset();
    mockAuthAxios.get.mockReset();
    mockAuthAxios.post.mockReset();
    mockAuthAxios.get.mockImplementation((url: string) => {
      if (url === '/api/admin/content/posts') {
        return Promise.resolve({
          data: {
            posts: [
              {
                id: 'post-1',
                content: 'Needs review before removal',
                user: { firstName: 'Admin', lastName: 'Fixture' },
              },
            ],
          },
        });
      }

      return Promise.resolve({
        data: {
          stats: { pending: 1, approved: 0, flagged: 0, rejected: 0 },
        },
      });
    });
    mockAuthAxios.delete.mockResolvedValue({ data: { success: true } });
  });

  it('opens an in-app confirmation before deleting a moderation post', async () => {
    render(
      <MemoryRouter>
        <ModerationWidget />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Needs review before removal')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /delete post/i }));

    expect(mockAuthAxios.delete).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: /delete moderation post/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /keep post/i }));
    expect(screen.queryByRole('dialog', { name: /delete moderation post/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /delete post/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm delete moderation post/i }));

    await waitFor(() => {
      expect(mockAuthAxios.delete).toHaveBeenCalledWith('/api/admin/content/posts/post-1');
    });
  });

  it('keeps destructive moderation actions inside SwanStudios UI confirmation', () => {
    expect(source).not.toContain('window.confirm');
    expect(source).toContain("from './ModerationConfirmDialog'");
    expect(source).toContain('<ModerationConfirmDialog');
    expect(dialogSource).toContain('role="dialog"');
    expect(dialogSource).toContain('aria-modal="true"');
    expect(dialogSource).toContain('min-height: 44px');
    expect(dialogSource).toContain('min-width: 44px');
    expect(dialogSource).toContain('var(--accent-primary, #60C0F0)');
    expect(dialogSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
