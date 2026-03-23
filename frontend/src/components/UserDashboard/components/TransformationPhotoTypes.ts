/**
 * ============================================================================
 * FILE: TransformationPhotoTypes.ts
 * PURPOSE: Shared types for the TransformationPhoto component family
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 */

export type PhotoAngle = 'front' | 'side' | 'back' | 'other';
export type PhotoVisibility = 'public' | 'friends' | 'private' | 'hidden';

export interface TransformationPhoto {
  id: number;
  url: string;
  photoType: PhotoAngle;
  takenAt: string;
  visibility: PhotoVisibility;
}

export interface TransformationPhotoSettings {
  showOnProfile: boolean;
  defaultVisibility: PhotoVisibility;
  showOnSocialFeed: boolean;
  allowFriendsToView: boolean;
}

export const DEFAULT_TRANSFORMATION_SETTINGS: TransformationPhotoSettings = {
  showOnProfile: false,
  defaultVisibility: 'private',
  showOnSocialFeed: false,
  allowFriendsToView: false,
};

export const VISIBILITY_LABELS: Record<PhotoVisibility, string> = {
  public: 'Everyone',
  friends: 'Friends Only',
  private: 'Only Me',
  hidden: 'Hidden',
};

export const ANGLE_LABELS: Record<PhotoAngle, string> = {
  front: 'Front',
  side: 'Side',
  back: 'Back',
  other: 'Other',
};
