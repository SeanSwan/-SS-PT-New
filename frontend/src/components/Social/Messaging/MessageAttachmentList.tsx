/**
 * FILE: MessageAttachmentList.tsx
 * PURPOSE: Render governed message attachments without enabling raw binary uploads.
 */
import React from 'react';
import { Apple, CalendarCheck, Dumbbell, Link as LinkIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MessageAttachment } from './MessagingTypes';
import { AttachmentCard, AttachmentLink, AttachmentList } from './MessageThread.styles';

interface MessageAttachmentListProps {
  attachments?: MessageAttachment[];
}

type DisplayAttachmentKind = 'link' | 'workout_card' | 'session_card' | 'nutrition_card';

const DISPLAY_ATTACHMENT_META: Record<DisplayAttachmentKind, { label: string; Icon: LucideIcon }> = {
  link: { label: 'Link', Icon: LinkIcon },
  workout_card: { label: 'Workout', Icon: Dumbbell },
  session_card: { label: 'Session', Icon: CalendarCheck },
  nutrition_card: { label: 'Nutrition', Icon: Apple },
};

const safeInternalHref = (value?: string | null): string | null => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  return value;
};

const isCardKind = (kind: string): kind is Exclude<DisplayAttachmentKind, 'link'> => (
  kind === 'workout_card' || kind === 'session_card' || kind === 'nutrition_card'
);

const getDisplayAttachment = (attachment: MessageAttachment) => {
  const meta = DISPLAY_ATTACHMENT_META[attachment.kind as DisplayAttachmentKind];
  if (!attachment.title || !meta) return null;
  const href = safeInternalHref(attachment.url);
  if (attachment.kind === 'link' && !href) return null;
  if (!href && !isCardKind(attachment.kind)) return null;
  return { attachment, href, meta };
};

type VisibleAttachment = NonNullable<ReturnType<typeof getDisplayAttachment>>;

const isVisibleAttachment = (item: ReturnType<typeof getDisplayAttachment>): item is VisibleAttachment => Boolean(item);

const MessageAttachmentList: React.FC<MessageAttachmentListProps> = ({ attachments = [] }) => {
  const visibleAttachments = attachments.map(getDisplayAttachment).filter(isVisibleAttachment);
  if (!visibleAttachments.length) return null;

  return (
    <AttachmentList aria-label="Message attachments">
      {visibleAttachments.map(({ attachment, href, meta }) => {
        const Icon = meta.Icon;
        if (!href) {
          return (
            <AttachmentCard key={String(attachment.id)} aria-label={`${meta.label} attachment ${attachment.title}`}>
              <Icon size={14} aria-hidden="true" />
              <span>{meta.label}</span>
              <span>{attachment.title}</span>
            </AttachmentCard>
          );
        }
        return (
          <AttachmentLink key={String(attachment.id)} href={href} aria-label={`Open ${meta.label.toLowerCase()} attachment ${attachment.title}`}>
            <Icon size={14} aria-hidden="true" />
            <span>{meta.label}</span>
            <span>{attachment.title}</span>
          </AttachmentLink>
        );
      })}
    </AttachmentList>
  );
};

export default React.memo(MessageAttachmentList);