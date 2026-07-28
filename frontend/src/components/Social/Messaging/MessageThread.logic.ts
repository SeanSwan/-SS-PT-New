import type { MessageData, MessageParticipant } from './MessagingTypes';

export function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

export function getInitials(p: MessageParticipant | null): string {
  if (!p) return '?';
  return `${(p.firstName?.[0] || '').toUpperCase()}${(p.lastName?.[0] || '').toUpperCase()}`;
}

export function groupByDate(msgs: MessageData[]): { date: string; messages: MessageData[] }[] {
  const groups: { date: string; messages: MessageData[] }[] = [];
  let currentDate = '';

  for (const msg of msgs) {
    const msgDate = new Date(msg.created_at).toDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groups.push({ date: msg.created_at, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}
export function getMessageDeliveryStatus(msg: MessageData, isMine: boolean): 'Sent' | 'Delivered' | 'Read' | null {
  if (!isMine) return null;
  if (msg.readBy?.length) return 'Read';
  return msg.clientMessageId ? 'Delivered' : 'Sent';
}
