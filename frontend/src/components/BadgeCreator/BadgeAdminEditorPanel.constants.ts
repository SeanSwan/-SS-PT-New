import type { GalleryBadgeRow } from './BadgeCreatorPayloadSafety';

export const TAB_TARGETS = [
  'workout', 'nutrition', 'schedule', 'social', 'bootcamp',
  'analytics', 'profile', 'rewards', 'body-map', 'sprint-planner',
  'video-call', 'my-home', 'virtual-olympics', 'badge-creator',
];

export const ACCEPTED_BADGE_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export const BADGE_GALLERY_ASSIGN_ERROR =
  'Unable to assign badge. Check the target and try again.';
export const BADGE_GALLERY_SHARE_ERROR =
  'Unable to update marketplace sharing. Refresh the gallery and try again.';
export const BADGE_GALLERY_EDIT_ERROR =
  'Unable to save badge edits. Check the badge details and try again.';

export const buildBadgePath = (badgeId: string) =>
  `/api/admin/badge-creator/${encodeURIComponent(badgeId)}`;

export const buildBadgeActionPath = (badgeId: string, action: 'assign' | 'unassign') =>
  `${buildBadgePath(badgeId)}/${action}`;

export const titleCaseTab = (tab: string) =>
  tab.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export type AssignmentType = 'achievement' | 'tab' | 'milestone';
export type BadgeAdminEditorPanelProps = {
  badge: GalleryBadgeRow;
  onChanged: () => Promise<void>;
  onClose: () => void;
  onStatus: (status: { type: 'success' | 'error'; text: string }) => void;
};

export const normalizeAssignmentType = (value: GalleryBadgeRow['assignedTo']): AssignmentType => (
  value === 'tab' || value === 'milestone' || value === 'achievement'
    ? value
    : 'achievement'
);
