/**
 * FILE: MessageThread.attachments.ts
 * PURPOSE: Attachment draft configuration for the mounted message thread composer.
 */
import type { MessageAttachmentDraft } from './MessagingTypes';

export type AttachmentKindConfig = {
  label: string;
  entityType: string | null;
  entityIdLabel: string | null;
  buttonLabel: string;
};

export const ATTACHMENT_KIND_CONFIG: Record<MessageAttachmentDraft['kind'], AttachmentKindConfig> = {
  link: { label: 'Link', entityType: null, entityIdLabel: null, buttonLabel: 'Attach internal link' },
  workout_card: { label: 'Workout', entityType: 'workout', entityIdLabel: 'Workout reference ID', buttonLabel: 'Attach workout card' },
  session_card: { label: 'Session', entityType: 'session', entityIdLabel: 'Session reference ID', buttonLabel: 'Attach session card' },
  nutrition_card: { label: 'Nutrition', entityType: 'nutrition', entityIdLabel: 'Nutrition reference ID', buttonLabel: 'Attach nutrition card' },
};

export const isCardAttachmentKind = (kind: MessageAttachmentDraft['kind']) => kind !== 'link';

export const attachmentDraftLabel = (attachment: MessageAttachmentDraft) =>
  `${ATTACHMENT_KIND_CONFIG[attachment.kind].label}: ${attachment.title}`;