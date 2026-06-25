import { sanitizeImageUrl } from '../../../utils/imageUrl';
import type { PhotoCategory, PhotoGalleryPost, PhotoItem } from './PhotoGallery.types';

const VIDEO_EXTENSION_PATTERN = /\.(mp4|webm|mov|m4v)(\?.*)?$/i;
const TITLE_LIMIT = 30;
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

export const PHOTO_GALLERY_CATEGORIES: PhotoCategory[] = [
  'All',
  'Fitness',
  'Nutrition',
  'Dance',
  'Progress',
  'Community',
];

function normalizePhotoText(value: unknown): string {
  if (typeof value === 'string') return value.trim().replace(/\s+/g, ' ');
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function normalizePhotoCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

export function validatePhotoFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Select an image file to add to your gallery.';
  }

  if (file.size > MAX_PHOTO_SIZE) {
    return 'Photo must be under 10MB.';
  }

  return null;
}

export function mapPostsToPhotoItems(posts: PhotoGalleryPost[] | null | undefined): PhotoItem[] {
  if (!posts?.length) return [];

  return posts.reduce<PhotoItem[]>((items, post) => {
    const safeUrl = sanitizeImageUrl(typeof post.mediaUrl === 'string' ? post.mediaUrl : null);
    if (!safeUrl || VIDEO_EXTENSION_PATTERN.test(safeUrl)) return items;

    const title = formatPhotoTitle(post.content);
    const id = normalizePhotoText(post.id);
    const createdAt = typeof post.createdAt === 'string' ? normalizePhotoText(post.createdAt) : undefined;

    items.push({
      id: id || `photo-${items.length}`,
      url: safeUrl,
      title,
      likes: normalizePhotoCount(post.likesCount),
      comments: normalizePhotoCount(post.commentsCount),
      createdAt,
      category: inferPhotoCategory(title),
    });

    return items;
  }, []);
}

export function filterPhotoItems(
  photos: PhotoItem[],
  searchTerm: string,
  activeCategory: string,
): PhotoItem[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return photos.filter((photo) => {
    const matchesSearch = !normalizedSearch || photo.title.toLowerCase().includes(normalizedSearch);
    const matchesCategory = activeCategory === 'All' || photo.category === activeCategory;
    return matchesSearch && matchesCategory;
  });
}

function formatPhotoTitle(content?: unknown): string {
  const title = normalizePhotoText(content);
  if (!title) return 'Photo';
  return title.length > TITLE_LIMIT ? title.substring(0, TITLE_LIMIT) : title;
}

function inferPhotoCategory(title: string): PhotoCategory {
  const text = title.toLowerCase();

  if (/\b(meal|macro|nutrition|protein|calorie|food)\b/.test(text)) return 'Nutrition';
  if (/\b(dance|routine|choreo)\b/.test(text)) return 'Dance';
  if (/\b(progress|before|after|milestone|transformation)\b/.test(text)) return 'Progress';
  if (/\b(group|community|team|challenge|friends)\b/.test(text)) return 'Community';
  if (/\b(fitness|workout|training|lift|cardio|strength)\b/.test(text)) return 'Fitness';

  return 'Fitness';
}
