/**
 * Admin Photo Gallery Studio — shared types
 * =========================================
 * Contracts for the admin photoshoot passcode-gallery manager. Field shapes are
 * pinned to the LIVE backend (backend/routes/adminGalleryRoutes.mjs) and the
 * Sequelize models GalleryEvent / GalleryPhoto (Rule 29 schema cross-check).
 *
 * NOTE: `password` is WRITE-ONLY. The backend hashes it to `password_hash` and
 * never echoes plaintext. The UI collects a passcode and sends it as `password`;
 * it must never expect it back.
 */

/** One passcode-protected photoshoot event/gallery. */
export interface GalleryEvent {
  id: number;
  name: string;
  slug: string;
  sport?: string | null;
  eventDate?: string | null; // YYYY-MM-DD (DATEONLY)
  location?: string | null;
  photoCount: number;
  isPublished: boolean;
  description?: string | null;
  coverPhotoId?: number | null;
  createdAt?: string;
  /** Only present on the create response. */
  shareableLink?: string;
}

/** One photo inside an event. Grid tiles use `thumbnailUrl`; lightbox uses `url`. */
export interface GalleryPhoto {
  id: number;
  photoNumber: number;
  displayName: string;
  url: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  enhancedUrl?: string | null;
  enhancementRequestCount?: number;
  createdAt?: string;
}

/** Aggregate stats from GET /api/admin/gallery/stats. */
export interface GalleryStats {
  totalEvents: number;
  totalPhotos: number;
  totalVisitors: number;
  newsletterSubscribers: number;
  totalEnhancements: number;
  pendingEnhancements: number;
  totalDonationAmount: number;
  totalReferrals: number;
  unconvertedReferrals: number;
  storageType: 'cloudflare-r2' | 'base64-fallback' | string;
}

/** Create-event form draft. `password` (passcode) + `name` are required. */
export interface NewEventDraft {
  name: string;
  sport: string;
  eventDate: string;
  location: string;
  password: string;
  description: string;
  isPublished: boolean;
}

export const EMPTY_EVENT_DRAFT: NewEventDraft = {
  name: '',
  sport: '',
  eventDate: '',
  location: '',
  password: '',
  description: '',
  isPublished: true,
};

/** Per-file upload lifecycle status shown in the uploader status list. */
export type UploadStatus = 'pending' | 'uploading' | 'processing' | 'done' | 'error';

export interface UploadFileStatus {
  name: string;
  status: UploadStatus;
  progress: number; // 0-100
  error?: string;
}

/** Result of a single upload-single call (never rejects — batch loop keeps going). */
export interface UploadSingleResult {
  success: boolean;
  photo?: GalleryPhoto;
  error?: string;
}

/** Client-side pre-flight limits (server multer caps a single request at 25 MB). */
export const UPLOAD_LIMITS = {
  maxFiles: 500,
  maxSizeMB: 25,
} as const;
