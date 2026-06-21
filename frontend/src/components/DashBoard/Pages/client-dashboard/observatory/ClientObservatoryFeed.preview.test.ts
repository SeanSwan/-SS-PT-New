import { describe, expect, it } from 'vitest';
import { normalizeFeedPostPreviews, stablePreviewKey } from './ClientObservatoryFeed.preview';

describe('ClientObservatoryFeed preview normalization', () => {
  it('sanitizes malformed social rows before rendering the overview feed preview', () => {
    const normalized = normalizeFeedPostPreviews([
      {
        content: '  New\u0000 deadlift PR   today  ',
        createdAt: 'not-a-date',
        likes: ['a', 'b'],
        user: {
          firstName: ' Taylor\u0007 ',
          lastName: ' Strong ',
          photo: 'javascript:alert(1)',
        },
      },
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toMatchObject({
      author: 'Taylor Strong',
      avatarUrl: undefined,
      content: 'New deadlift PR today',
      timeAgo: 'Recent',
      likesLabel: '2',
    });
    expect(normalized[0].key).toMatch(/^post-preview-/);
  });

  it('drops blank backend rows and keeps fallback keys deterministic', () => {
    expect(normalizeFeedPostPreviews([{ content: '' }])).toHaveLength(0);

    const post = {
      content: 'Consistent training signal',
      createdAt: '2026-06-20T10:00:00.000Z',
      user: { username: 'athlete' },
    };

    expect(stablePreviewKey(post, 'athlete', 'Consistent training signal')).toBe(
      stablePreviewKey(post, 'athlete', 'Consistent training signal'),
    );
  });

  it('clamps malformed social count metrics before labels render', () => {
    const normalized = normalizeFeedPostPreviews([
      { content: 'Negative likes', likes: -3 },
      { content: 'Non-finite likes', likes: Number.POSITIVE_INFINITY },
      { content: 'NaN likes', likes: Number.NaN },
    ]);

    expect(normalized).toHaveLength(3);
    expect(normalized.map((post) => post.likesLabel)).toEqual(['0', '0', '0']);
  });
});
