/**
 * Data helpers for the active UserDashboard V3 creative gallery.
 */

import type { PostType } from '../../Social/Feed/types/CreatePostTypes';
import { inferSmartPostIntent } from '../../Social/Feed/utils/postIntentInference';
import type { CreativeMediaItem, ProfileMediaPost } from './CreativeGallery.types';
import { sanitizeImageUrl } from '../../../utils/imageUrl';

export const CREATIVE_GALLERY_TAGS = ['All', 'Dance', 'Music', 'Workout', 'Motivation', 'Wellness', 'Art'] as const;
export const CREATIVE_GALLERY_MAX_UPLOAD_MB = 100;
export const CREATIVE_GALLERY_MAX_UPLOAD_BYTES = CREATIVE_GALLERY_MAX_UPLOAD_MB * 1024 * 1024;
export const CREATIVE_GALLERY_ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,video/x-m4v';
export const CREATIVE_GALLERY_FALLBACK_TITLE = 'Media';
const CREATIVE_GALLERY_TYPE_ERROR = 'Upload a JPG, PNG, WebP, MP4, WebM, MOV, or M4V file.';

type CreativeGalleryTag = typeof CREATIVE_GALLERY_TAGS[number];
type CreativeGalleryCategory = Exclude<CreativeGalleryTag, 'All'>;

const CREATIVE_GALLERY_ALLOWED_TYPES = new Set(CREATIVE_GALLERY_ACCEPT.split(','));
const CREATIVE_GALLERY_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm', 'mov', 'm4v'];
const CREATIVE_GALLERY_VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v']);
const CREATIVE_POST_TYPES = new Set<PostType>([
  'general',
  'workout',
  'transformation',
  'achievement',
  'challenge',
  'dance',
  'music',
  'singing',
  'art',
  'gaming',
  'comedy',
]);

const CREATIVE_CATEGORY_RULES: Array<{ tag: CreativeGalleryCategory; patterns: RegExp[] }> = [
  {
    tag: 'Dance',
    patterns: [/\b(dance|choreo|choreography|freestyle|shuffle)\b/i, /#dance\b/i],
  },
  {
    tag: 'Music',
    patterns: [
      /\b(music|beat|producer|production|mix|track|instrumental|songwriting|singing|vocal|vocals|harmony)\b/i,
      /\bmusic production\b/i,
      /#(musicproduction|vocals)\b/i,
    ],
  },
  {
    tag: 'Workout',
    patterns: [
      /\b(workout|training|lift|lifting|sets?|reps?|squat|deadlift|bench|cardio|run|finisher|gym|conditioning)\b/i,
      /#(workout|workoutdiary)\b/i,
    ],
  },
  {
    tag: 'Motivation',
    patterns: [
      /\b(motivation|motivational|inspire|discipline|mindset|accountability|streak|challenge|milestone|achievement|earned|unlocked|pr|personal record|transformation)\b/i,
      /#(milestone|challengeaccepted|transformation)\b/i,
    ],
  },
  {
    tag: 'Wellness',
    patterns: [/\b(wellness|recovery|stretching|flexibility|hydration|nutrition|meal|sleep|mobility|breathwork)\b/i, /#wellness\b/i],
  },
  {
    tag: 'Art',
    patterns: [/\b(art|painting|drawing|sketch|illustration|photography)\b/i, /#art\b/i],
  },
];

function normalizeCreativeText(value: unknown): string {
  if (typeof value === 'string') return value.trim().replace(/\s+/g, ' ');
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function getCreativeMediaExtension(filename: string): string {
  const cleanName = filename.split(/[?#]/, 1)[0];
  const dotIndex = cleanName.lastIndexOf('.');
  return dotIndex > -1 ? cleanName.slice(dotIndex + 1).toLowerCase() : '';
}

function getCreativeMediaKind(url: string): CreativeMediaItem['mediaKind'] {
  return CREATIVE_GALLERY_VIDEO_EXTENSIONS.has(getCreativeMediaExtension(url)) ? 'video' : 'image';
}

function normalizeCreativePostType(value: unknown): PostType | null {
  const normalized = normalizeCreativeText(value).toLowerCase();
  return CREATIVE_POST_TYPES.has(normalized as PostType) ? normalized as PostType : null;
}

function getCreativeCategoryHaystack(caption: string, postType?: unknown): string {
  const selectedType = normalizeCreativePostType(postType) ?? 'general';
  const smartIntent = inferSmartPostIntent(caption, selectedType);

  return [
    caption,
    selectedType,
    smartIntent.submissionType,
    smartIntent.displayLabel ?? '',
    ...smartIntent.hashtags,
  ].join(' ');
}

export function normalizeCreativeMediaTitle(value?: unknown): string {
  const normalized = normalizeCreativeText(value);
  return normalized || CREATIVE_GALLERY_FALLBACK_TITLE;
}

export function normalizeCreativeMetricCount(value?: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

export function getCreativeMediaTags(value?: unknown, postType?: unknown): string[] {
  const caption = normalizeCreativeText(value);
  if (!caption && !normalizeCreativePostType(postType)) return [];

  const haystack = getCreativeCategoryHaystack(caption, postType);

  return CREATIVE_CATEGORY_RULES.filter((rule) => (
    rule.patterns.some((pattern) => pattern.test(haystack))
  )).map((rule) => rule.tag);
}

export function validateCreativeMediaFile(file: File): string | null {
  const extension = getCreativeMediaExtension(file.name);

  if (
    !CREATIVE_GALLERY_ALLOWED_TYPES.has(file.type.toLowerCase())
    || !CREATIVE_GALLERY_ALLOWED_EXTENSIONS.includes(extension)
  ) {
    return CREATIVE_GALLERY_TYPE_ERROR;
  }

  if (file.size > CREATIVE_GALLERY_MAX_UPLOAD_BYTES) {
    return `Creative media must be ${CREATIVE_GALLERY_MAX_UPLOAD_MB}MB or smaller.`;
  }

  return null;
}

export function mapPostsToCreativeMedia(posts?: ProfileMediaPost[] | null): CreativeMediaItem[] {
  if (!posts || posts.length === 0) return [];

  return posts.reduce<CreativeMediaItem[]>((items, post) => {
    const safeUrl = sanitizeImageUrl(typeof post.mediaUrl === 'string' ? post.mediaUrl : null);
    if (!safeUrl) return items;

    const content = normalizeCreativeText(post.content);
    const id = normalizeCreativeText(post.id);
    const createdAt = typeof post.createdAt === 'string' ? normalizeCreativeText(post.createdAt) : '';

    items.push({
      id: id || `media-${items.length}`,
      title: normalizeCreativeMediaTitle(content.slice(0, 40)),
      thumbnail: safeUrl,
      sourceUrl: safeUrl,
      mediaKind: getCreativeMediaKind(safeUrl),
      tags: getCreativeMediaTags(content, post.type),
      duration: '',
      likes: normalizeCreativeMetricCount(post.likesCount),
      createdAt: createdAt || undefined,
    });

    return items;
  }, []);
}
