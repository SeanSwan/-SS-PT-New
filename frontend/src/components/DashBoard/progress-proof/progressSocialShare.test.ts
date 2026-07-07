import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildProgressShareCard } from './progressShareCard';
import { buildChartMomentCaption, shareChartMomentToFeed, shareProgressCardToFeed } from './progressSocialShare';

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

describe('chart-moment share (2.5)', () => {
  const pulse = { label: 'Weekly volume', value: '9,100 lbs', detail: 'up from 8,450', tone: 'rising' as const };

  it('builds a truthful caption from title + pulse + facts', () => {
    const caption = buildChartMomentCaption({
      title: 'Weekly Training Volume',
      pulse,
      facts: [{ id: 'f1', label: 'Best week', value: '9,100 lbs' }],
    });
    expect(caption).toContain('Weekly Training Volume');
    expect(caption).toContain('Weekly volume');
    expect(caption).toContain('9,100 lbs');
    expect(caption).toContain('Best week');
  });

  it('returns null when there is no meaningful moment to share', () => {
    expect(buildChartMomentCaption({ title: '', pulse: null, facts: [] })).toBeNull();
    expect(buildChartMomentCaption({ title: 'Chart', pulse: null, facts: [] })).toBeNull();
  });

  it('posts the chart moment as a milestone post and reports honestly', async () => {
    const post = vi.fn().mockResolvedValue({ data: { post: { id: 12 } } });
    const ok = await shareChartMomentToFeed({ post } as never, 'Weekly Training Volume: 9,100 lbs');
    expect(ok).toBe(true);
    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/api/social/posts');
    expect(body.get('type')).toBe('milestone');
    expect(body.get('content')).toBe('Weekly Training Volume: 9,100 lbs');

    const failing = vi.fn().mockResolvedValue({ data: {} });
    expect(await shareChartMomentToFeed({ post: failing } as never, 'x')).toBe(false);
    expect(await shareChartMomentToFeed({ post } as never, '')).toBe(false);
  });
});
