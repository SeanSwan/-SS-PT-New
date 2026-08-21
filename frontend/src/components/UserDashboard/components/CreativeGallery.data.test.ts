import { describe, expect, it } from 'vitest';
import {
  mapPostsToCreativeMedia,
  validateCreativeMediaFile,
} from './CreativeGallery.data';

describe('validateCreativeMediaFile', () => {
  it('rejects spoofed or extensionless creative media files', () => {
    const spoofed = new File(['media'], 'creative.exe', { type: 'video/mp4' });
    const extensionless = new File(['media'], 'creative', { type: 'image/png' });

    expect(validateCreativeMediaFile(spoofed)).toContain('JPG, PNG, WebP, MP4, WebM, MOV, or M4V');
    expect(validateCreativeMediaFile(extensionless)).toContain('JPG, PNG, WebP, MP4, WebM, MOV, or M4V');
  });
});

describe('mapPostsToCreativeMedia', () => {
  it('filters non-media posts and supplies deterministic fallback ids', () => {
    expect(mapPostsToCreativeMedia([
      { content: 'text only' },
      { content: 'media post', mediaUrl: '/uploads/media.png', likesCount: 7 },
    ])).toEqual([
      {
        id: 'media-0',
        title: 'media post',
        thumbnail: '/uploads/media.png',
        sourceUrl: '/uploads/media.png',
        mediaKind: 'image',
        tags: [],
        duration: '',
        likes: 7,
        createdAt: undefined,
      },
    ]);
  });

  it('normalizes malformed profile media fields before cards render', () => {
    expect(mapPostsToCreativeMedia([
      { id: '', content: '   ', mediaUrl: '/uploads/media.png', likesCount: Number.POSITIVE_INFINITY },
      { id: 'negative-count', content: '  Training drop  ', mediaUrl: '/uploads/media-2.png', likesCount: -4 },
    ])).toEqual([
      {
        id: 'media-0',
        title: 'Media',
        thumbnail: '/uploads/media.png',
        sourceUrl: '/uploads/media.png',
        mediaKind: 'image',
        tags: [],
        duration: '',
        likes: 0,
        createdAt: undefined,
      },
      {
        id: 'negative-count',
        title: 'Training drop',
        thumbnail: '/uploads/media-2.png',
        sourceUrl: '/uploads/media-2.png',
        mediaKind: 'image',
        tags: ['Workout'],
        duration: '',
        likes: 0,
        createdAt: undefined,
      },
    ]);
  });

  it('guards runtime non-string post fields before deriving cards', () => {
    const malformedPosts = [
      {
        id: 42,
        content: { body: 'Training drop' },
        type: { category: 'workout' },
        mediaUrl: '/uploads/media.png',
        createdAt: 12345,
      },
    ] as unknown as Parameters<typeof mapPostsToCreativeMedia>[0];

    expect(() => mapPostsToCreativeMedia(malformedPosts)).not.toThrow();
    expect(mapPostsToCreativeMedia(malformedPosts)).toEqual([
      {
        id: '42',
        title: 'Media',
        thumbnail: '/uploads/media.png',
        sourceUrl: '/uploads/media.png',
        mediaKind: 'image',
        tags: [],
        duration: '',
        likes: 0,
        createdAt: undefined,
      },
    ]);
  });

  it('filters unsafe media URLs before Creative Gallery cards render thumbnails', () => {
    expect(mapPostsToCreativeMedia([
      { id: 'unsafe-js', content: 'bad', mediaUrl: 'javascript:alert(1)', likesCount: 4 },
      { id: 'unsafe-host', content: 'bad host', mediaUrl: 'https://evil.example/media.png', likesCount: 4 },
      { id: 'safe-local', content: 'training clip', mediaUrl: '/uploads/media.png', likesCount: 7 },
    ])).toEqual([
      {
        id: 'safe-local',
        title: 'training clip',
        thumbnail: '/uploads/media.png',
        sourceUrl: '/uploads/media.png',
        mediaKind: 'image',
        tags: ['Workout'],
        duration: '',
        likes: 7,
        createdAt: undefined,
      },
    ]);
  });

  it('derives filter tags from creative captions and hashtags', () => {
    expect(mapPostsToCreativeMedia([
      { id: 'tagged', content: 'Post-lift dance cooldown #Workout #Dance', mediaUrl: '/uploads/media.png' },
    ])).toEqual([
      expect.objectContaining({
        id: 'tagged',
        tags: ['Dance', 'Workout'],
      }),
    ]);
  });

  it('auto-stamps categories from message language and saved post type', () => {
    expect(mapPostsToCreativeMedia([
      { id: 'music', content: 'New beat in the studio for tonight', mediaUrl: '/uploads/music.mp4' },
      { id: 'wellness', content: 'Recovery stretching and hydration check', mediaUrl: '/uploads/wellness.png' },
      { id: 'art-upload', content: 'Shared creative media', type: 'art', mediaUrl: '/uploads/art.png' },
    ])).toEqual([
      expect.objectContaining({ id: 'music', tags: ['Music'] }),
      expect.objectContaining({ id: 'wellness', tags: ['Wellness'] }),
      expect.objectContaining({ id: 'art-upload', tags: ['Art'] }),
    ]);
  });
});