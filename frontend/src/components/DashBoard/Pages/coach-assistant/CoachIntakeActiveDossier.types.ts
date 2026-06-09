/**
 * CoachIntakeActiveDossier.types.ts
 * =================================
 * Shared prop contract for active Coach intake dossier renderers.
 */
import React from 'react';
import type { CoachIntakeItem } from '../../../../services/coachIntakeService';

export interface CoachIntakeActiveDossierProps {
  item: CoachIntakeItem;
  statusText: string;
  reviewHref: string;
  focusRef?: React.Ref<HTMLElement>;
  onAskCoach: () => void;
  onInspectAudio: () => void;
  onConfirmAudioOrder: () => void;
  onPrepareDraftReview: () => void;
  onReviewPreparedDraft: () => void;
  confirmAudioOrderStatus?: string | null;
  isConfirmingAudioOrder?: boolean;
}
