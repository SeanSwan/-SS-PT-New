/**
 * Data helpers for the active UserDashboard V3 creative gallery.
 */

import type { CreativeMediaItem, ProfileMediaPost } from './CreativeGallery.types';

export const CREATIVE_GALLERY_TAGS = ['All', 'Dance', 'Music', 'Workout', 'Motivation', 'Wellness'];

export function mapPostsToCreativeMedia(posts?: ProfileMediaPost[] | null): CreativeMediaItem[] {
  if (!posts || posts.length === 0) return [];

  return posts
    .filter((post) => Boolean(post.mediaUrl))
    .map((post, index) => ({
      id: post.id || `media-${index}`,
      title: post.content?.substring(0, 40) || 'Media',
      thumbnail: post.mediaUrl || '',
      duration: '',
      views: post.likesCount || 0,
      createdAt: post.createdAt,
    }));
}
