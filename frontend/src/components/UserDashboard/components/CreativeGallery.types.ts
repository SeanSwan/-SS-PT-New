/**
 * Shared types for the active UserDashboard V3 creative gallery.
 */

export type CreativeMediaKind = 'image' | 'video';

export interface CreativeMediaItem {
  id: string;
  title: string;
  thumbnail: string;
  sourceUrl: string;
  mediaKind: CreativeMediaKind;
  tags: string[];
  duration: string;
  views: number;
  createdAt?: string;
}

export interface ProfileMediaPost {
  id?: unknown;
  content?: unknown;
  type?: unknown;
  mediaUrl?: unknown;
  likesCount?: unknown;
  createdAt?: unknown;
}
