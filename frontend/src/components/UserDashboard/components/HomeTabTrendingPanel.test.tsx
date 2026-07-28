import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HomeTabTrendingPanel from './HomeTabTrendingPanel';

const tags = [
  { name: 'StrengthSurge', count: 24 },
  { name: 'level-up', count: 3 },
  { name: 'new-season', count: 0 },
];

afterEach(() => cleanup());

describe('HomeTabTrendingPanel', () => {
  it('renders ranked real-data trend rows as clickable feed filters', () => {
    const onSelectTag = vi.fn();
    const { container } = render(
      <HomeTabTrendingPanel
        trendingTags={tags}
        trendingLoading={false}
        onSelectTag={onSelectTag}
      />
    );

    expect(screen.getByText('3 signals')).toBeTruthy();
    const list = screen.getByRole('list', { name: 'Trending community topics' });
    const rows = within(list).getAllByRole('listitem');
    const buttons = within(list).getAllByRole('button');

    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain('01');
    expect(rows[0].textContent).toContain('#StrengthSurge');
    expect(rows[0].textContent).toContain('24');
    expect(buttons[0]).toHaveAttribute('aria-label', 'Open #StrengthSurge posts, 24 posts');
    expect(rows[2].textContent).toContain('New');
    expect(buttons[2]).toHaveAttribute('aria-label', 'Open #new-season posts, New signal');

    fireEvent.click(buttons[0]);

    expect(onSelectTag).toHaveBeenCalledWith(tags[0]);
    expect(container.querySelector('polyline')).toBeNull();
  });

  it('keeps loading and empty states honest', () => {
    render(<HomeTabTrendingPanel trendingTags={[]} trendingLoading onSelectTag={vi.fn()} />);

    expect(screen.getByText('Syncing')).toBeTruthy();
    expect(screen.getByText('Loading trend signals.')).toBeTruthy();
  });
});
