import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildProgressShareCard } from './progressShareCard';
import { shareProgressCardToFeed } from './progressSocialShare';

const buildShareableCard = () => buildProgressShareCard({
  chartTitle: 'Weekly Training Volume',
  csvRows: [{ week: 'W2', volume_lbs: 2400 }],
  pulse: {
    detail: 'Up 100% from the prior point.',
    label: 'Volume Pulse',
    tone: 'rising',
    value: '+100% vs prior',
  },
  rangeLabel: '12 Weeks',
  summary: 'Showing verified training volume.',
});

describe('progressSocialShare', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('posts shareable progress proof cards as social milestone posts', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const post = vi.fn().mockResolvedValue({ data: { post: { id: 'post-1' } } });

    const result = await shareProgressCardToFeed({ post }, buildShareableCard());

    expect(result).toBe(true);
    expect(post).toHaveBeenCalledTimes(1);
    const [url, formData, config] = post.mock.calls[0];
    expect(url).toBe('/api/social/posts');
    expect(formData.get('type')).toBe('milestone');
    expect(formData.get('content')).toContain('Volume Pulse: +100% vs prior');
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'swan:social-post-created',
    }));
  });

  it('does not post empty proof cards', async () => {
    const post = vi.fn();
    const emptyCard = buildProgressShareCard({
      chartTitle: 'Weekly Training Volume',
      csvRows: [],
      rangeLabel: '12 Weeks',
      summary: 'No verified rows.',
    });

    const result = await shareProgressCardToFeed({ post }, emptyCard);

    expect(result).toBe(false);
    expect(post).not.toHaveBeenCalled();
  });
});
