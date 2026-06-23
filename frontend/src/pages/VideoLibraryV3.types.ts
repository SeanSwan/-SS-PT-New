export interface VideoItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  source: 'upload' | 'youtube';
  contentType: string;
  visibility: string;
  accessTier: string;
  thumbnail: string | null;
  durationSeconds: number;
  viewCount: number;
  likeCount: number;
  tags: string[];
  featured: boolean;
  publishedAt: string;
  youtubeVideoId: string | null;
  locked: boolean;
}

export interface CollectionItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  type: string;
  visibility: string;
  accessTier: string;
  thumbnail: string | null;
  videoCount: number;
  sortOrder: number;
}

export interface VideoPagination {
  page: number;
  totalPages: number;
  total: number;
}

export const CONTENT_TYPES = [
  { value: '', label: 'All' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'behind_scenes', label: 'Behind the Scenes' },
  { value: 'vlog', label: 'Vlog' },
  { value: 'testimonial', label: 'Testimonial' },
  { value: 'course_lesson', label: 'Course Lesson' },
] as const;
