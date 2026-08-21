import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CreativeGalleryModal from './CreativeGalleryModal';
import type { CreativeMediaItem } from './CreativeGallery.types';

const buildMediaItem = (overrides: Partial<CreativeMediaItem>): CreativeMediaItem => ({
  id: 'media-1',
  title: 'Training clip',
  thumbnail: '/uploads/media.mp4',
  sourceUrl: '/uploads/media.mp4',
  mediaKind: 'video',
  tags: [],
  duration: '',
  likes: 0,
  ...overrides,
});

describe('CreativeGalleryModal', () => {
  it('normalizes direct item props before rendering dialog labels and media sources', () => {
    render(
      <CreativeGalleryModal
        item={buildMediaItem({
          id: ' clip id <1> ',
          title: '   ',
          sourceUrl: '/uploads/safe-preview.mp4',
        })}
        onClose={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Media' });
    expect(dialog.getAttribute('aria-labelledby')).toBe('creative-gallery-preview-clip-id-1');
    expect(within(dialog).getByLabelText('Media')).toHaveAttribute('src', '/uploads/safe-preview.mp4');
  });

  it('does not render a preview dialog for unsafe direct media URLs', () => {
    render(
      <CreativeGalleryModal
        item={buildMediaItem({
          sourceUrl: 'javascript:alert(1)',
        })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
