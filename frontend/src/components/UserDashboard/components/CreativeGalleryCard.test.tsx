import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CreativeGalleryCard from './CreativeGalleryCard';

describe('CreativeGalleryCard', () => {
  it('normalizes malformed title, duration, view props, and fallback category before rendering', () => {
    const onPlay = vi.fn();
    const { container } = render(
      <CreativeGalleryCard
        item={{
          id: 'media-1',
          title: '   ',
          thumbnail: '/uploads/media.jpg',
          sourceUrl: '/uploads/media.jpg',
          mediaKind: 'image',
          tags: [],
          duration: '   ',
          likes: Number.POSITIVE_INFINITY,
        }}
        index={0}
        onPlay={onPlay}
      />,
    );

    const playButton = screen.getByRole('button', { name: 'Play media: Media' });
    expect(screen.getByText('Media')).toBeInTheDocument();
    expect(screen.getByText('Creative')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/nan|infinity|undefined/i);

    fireEvent.click(playButton);
    expect(onPlay).toHaveBeenCalledWith('media-1');
  });

  it('renders up to three auto-stamped categories without turning them into buttons', () => {
    const onPlay = vi.fn();
    render(
      <CreativeGalleryCard
        item={{
          id: 'media-2',
          title: 'Dance finisher',
          thumbnail: '/uploads/media.jpg',
          sourceUrl: '/uploads/media.jpg',
          mediaKind: 'video',
          tags: ['Dance', 'Workout', 'Motivation', 'Wellness'],
          duration: '0:38',
          likes: 14,
        }}
        index={0}
        onPlay={onPlay}
      />,
    );

    expect(screen.getByText('Dance')).toBeInTheDocument();
    expect(screen.getByText('Workout')).toBeInTheDocument();
    expect(screen.getByText('Motivation')).toBeInTheDocument();
    expect(screen.queryByText('Wellness')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dance' })).not.toBeInTheDocument();
  });
});