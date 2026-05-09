/**
 * Shared types for the active UserDashboard V3 creative gallery.
 */

export interface CreativeMediaItem {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  views: number;
  createdAt?: string;
}

export interface ProfileMediaPost {
  id?: string;
  content?: string;
  mediaUrl?: string;
  likesCount?: number;
  createdAt?: string;
}
