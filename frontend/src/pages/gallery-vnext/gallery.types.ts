/**
 * Gallery vNext — types. Bind-only copies of the shapes the current GalleryPage + the `/api/gallery/*`
 * endpoints already use (verified against GalleryPage.tsx:26-63 + galleryRoutes.mjs). The vNext reuses the
 * SAME contracts; it never invents a shape. `mediumUrl` is already on the model + type — Phase 1 surfaces it
 * from the public photos SELECT so the justified grid + lightbox can use the preview rendition.
 */

export interface GalleryEventSummary {
  id: number;
  name: string;
  slug: string;
  sport: string | null;
  eventDate: string | null;
  location: string | null;
  photoCount: number;
  description: string | null;
  coverPhotoUrl: string | null;
}

export interface GalleryPhoto {
  id: number;
  photoNumber: number;
  displayName: string;
  url: string;
  thumbnailUrl: string | null;
  mediumUrl: string | null;
  width: number | null;
  height: number | null;
  enhancedUrl: string | null;
  enhancementRequestCount: number;
  sourceType?: 'raw' | 'jpeg';
}

export interface EnhancementCredits {
  freeRemaining: number;
  purchasedCredits: number;
  isVip: boolean;
  freeUsedThisEvent: number;
}

export interface PhotoVoteData {
  thumbsUp: number;
  thumbsDown: number;
  userVote: 1 | -1 | null;
}

/** The credit package keys the backend accepts (POST /purchase-credits `{ package }`). Truth-test-locked. */
export type CreditPackage = 'single' | 'bundle5' | 'vip';

/** Gate submit body — POST /events/:slug/access (no Bearer; this call establishes the session). */
export interface GateSubmitInput {
  email: string;
  password: string;
  firstName: string;
  newsletterOptIn: boolean;
  parentalConsent: boolean;
}

/** Default credits before the balance is fetched (mirrors GalleryPage.tsx:1157). */
export const DEFAULT_CREDITS: EnhancementCredits = {
  freeRemaining: 3,
  purchasedCredits: 0,
  isVip: false,
  freeUsedThisEvent: 0,
};

export const totalCredits = (c: EnhancementCredits): number => c.freeRemaining + c.purchasedCredits;
export const hasCredits = (c: EnhancementCredits): boolean => c.isVip || totalCredits(c) > 0;
