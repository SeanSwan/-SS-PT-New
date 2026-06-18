import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BootcampDemoVideoModal from './BootcampDemoVideoModal';

describe('BootcampDemoVideoModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <BootcampDemoVideoModal open={false} title="Squat" videoUrl="https://r2/x.mp4" onClose={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('plays a direct file in a <video> element', () => {
    const { container } = render(
      <BootcampDemoVideoModal open title="Goblet Squat" videoUrl="https://r2.example.com/squat.mp4" onClose={vi.fn()} />,
    );
    expect(screen.getByRole('dialog', { name: /goblet squat demo video/i })).toBeTruthy();
    const video = container.querySelector('video');
    expect(video?.getAttribute('src')).toBe('https://r2.example.com/squat.mp4');
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('embeds a YouTube URL in a privacy-friendly iframe', () => {
    const { container } = render(
      <BootcampDemoVideoModal open title="Burpee" videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ" onClose={vi.fn()} />,
    );
    const iframe = container.querySelector('iframe');
    expect(iframe?.getAttribute('src')).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(container.querySelector('video')).toBeNull();
  });

  it('closes on the close button, backdrop click, and Escape', () => {
    const onClose = vi.fn();
    render(<BootcampDemoVideoModal open title="X" videoUrl="https://r2/x.mp4" onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /close video/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
