/**
 * Behavioral guard for the in-post before/after comparison.
 *
 * WHY: this control shipped with `const [transformationSliderValue] = useState(50)`
 * — a value with no setter — behind a decorative 40px div that had no handler
 * attached. It looked draggable and could never move. No test covered it, so it
 * stayed frozen. These tests assert OPERATION, not source text: they drive the
 * control the way a member or a keyboard user does and read the resulting DOM.
 */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import PostContent from './components/PostContent';
import type { Post } from './types/PostCardTypes';

const transformationPost: Post = {
  id: 'post-transformation',
  content: '12 weeks of consistent work.',
  type: 'transformation',
  createdAt: new Date().toISOString(),
  user: {
    id: 'user-1',
    firstName: 'Sean',
    lastName: 'Swan',
    username: 'seanswan',
  },
  likesCount: 0,
  commentsCount: 0,
  isLiked: false,
  transformationData: {
    beforeImageUrl: 'https://example.test/before.jpg',
    afterImageUrl: 'https://example.test/after.jpg',
  },
};

describe('PostContent transformation comparison', () => {
  it('exposes an operable slider rather than a decorative handle', () => {
    render(<PostContent post={transformationPost} />);

    const slider = screen.getByRole('slider', { name: /before and after/i });

    // Reachable by keyboard at all — the old decorative div was not.
    expect(slider).toHaveAttribute('tabindex', '0');
    expect(slider).toHaveAttribute('aria-valuenow', '50');
    expect(slider).toHaveAttribute('aria-valuemin', '5');
    expect(slider).toHaveAttribute('aria-valuemax', '95');
  });

  it('moves when a keyboard user presses the arrow keys', async () => {
    const user = userEvent.setup();
    render(<PostContent post={transformationPost} />);

    const slider = screen.getByRole('slider', { name: /before and after/i });
    slider.focus();

    await user.keyboard('{ArrowRight}');
    expect(slider).toHaveAttribute('aria-valuenow', '52');

    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(slider).toHaveAttribute('aria-valuenow', '48');
  });

  it('clamps at both ends so neither photo is ever fully hidden', async () => {
    const user = userEvent.setup();
    render(<PostContent post={transformationPost} />);

    const slider = screen.getByRole('slider', { name: /before and after/i });
    slider.focus();

    await user.keyboard('{End}');
    expect(slider).toHaveAttribute('aria-valuenow', '95');
    await user.keyboard('{ArrowRight}');
    expect(slider).toHaveAttribute('aria-valuenow', '95');

    await user.keyboard('{Home}');
    expect(slider).toHaveAttribute('aria-valuenow', '5');
    await user.keyboard('{ArrowLeft}');
    expect(slider).toHaveAttribute('aria-valuenow', '5');
  });

  it('actually moves the reveal position as the user operates it', async () => {
    const user = userEvent.setup();
    render(<PostContent post={transformationPost} />);

    const after = screen.getByAltText('After transformation');
    const slider = screen.getByRole('slider', { name: /before and after/i });

    // Both photos are overlaid and fully opaque — the reveal is a clip driven by
    // the shared --swan-slider-pos variable, not the old permanent 50%
    // cross-fade that washed both of them out side by side.
    expect(after.style.opacity).toBe('');
    expect(slider.style.getPropertyValue('--swan-slider-pos')).toBe('50%');

    slider.focus();
    await user.keyboard('{PageUp}');
    expect(slider.style.getPropertyValue('--swan-slider-pos')).toBe('60%');

    await user.keyboard('{Home}');
    expect(slider.style.getPropertyValue('--swan-slider-pos')).toBe('5%');
  });

  it('does not render a comparison control when only one photo exists', () => {
    render(
      <PostContent
        post={{
          ...transformationPost,
          transformationData: { beforeImageUrl: 'https://example.test/before.jpg' },
        }}
      />
    );

    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.getByAltText('Before transformation')).toBeInTheDocument();
  });
});
