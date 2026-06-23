import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import HomeTabTrendingPanel from './HomeTabTrendingPanel';

const tags = [
  { name: 'StrengthSurge', count: 24 },
  { name: 'level-up', count: 3 },
  { name: 'new-season', count: 0 },
];

afterEach(() => cleanup());

describe('HomeTabTrendingPanel', () => {
  it('renders ranked real-data trend rows without decorative sparkline polylines', () => {
    const { container } = render(<HomeTabTrendingPanel trendingTags={tags} trendingLoading={false} />);

    expect(screen.getByText('3 signals')).toBeTruthy();
    const list = screen.getByRole('list', { name: 'Trending community topics' });
    const rows = within(list).getAllByRole('listitem');

    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain('01');
    expect(rows[0].textContent).toContain('#StrengthSurge');
    expect(rows[0].textContent).toContain('24');
    expect(rows[0].getAttribute('aria-label')).toBe('#StrengthSurge, 24 posts');
    expect(rows[2].textContent).toContain('New');
    expect(rows[2].getAttribute('aria-label')).toBe('#new-season, New signal');
    expect(container.querySelector('polyline')).toBeNull();
  });

  it('keeps loading and empty states honest', () => {
    render(<HomeTabTrendingPanel trendingTags={[]} trendingLoading />);

    expect(screen.getByText('Syncing')).toBeTruthy();
    expect(screen.getByText('Loading trend signals.')).toBeTruthy();
  });
});