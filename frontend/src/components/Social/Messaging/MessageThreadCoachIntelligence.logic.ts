/**
 * FILE: MessageThreadCoachIntelligence.logic.ts
 * PURPOSE: Pure read-only thread brief helpers for Swan Coach messaging intelligence.
 */
import type { MessageData } from './MessagingTypes';

export interface ThreadCoachBrief {
  summary: string;
  taskSeed: string;
  suggestedReply: string;
  flagLabels: string[];
  messageCount: number;
  sourceMessageId: string | null;
}

export type MessageCoachActionIntent = 'create_task_from_message' | 'schedule_from_message' | 'log_workout_from_message';

export interface MessageCoachActionHandoff {
  intent: MessageCoachActionIntent;
  label: string;
  ariaLabel: string;
  href: string;
}

const MESSAGE_COACH_ACTIONS: Array<Omit<MessageCoachActionHandoff, 'href'>> = [
  { intent: 'create_task_from_message', label: 'Create task', ariaLabel: 'Create task from message' },
  { intent: 'schedule_from_message', label: 'Schedule', ariaLabel: 'Schedule from message' },
  { intent: 'log_workout_from_message', label: 'Log workout', ariaLabel: 'Log workout from message' },
];

const MAX_SNIPPET_LENGTH = 140;
const SAFE_SOURCE_MESSAGE_ID = /^[a-z0-9_-]{1,80}$/i;

const FLAG_RULES = [
  {
    label: 'injury risk',
    pattern: /\b(pain|injur\w*|hurt|ache|sore|flare\w*|numb|dizzy|sharp)\b/i,
    suggestedReply: 'I saw the concern. Please pause that movement for now, and I will review the safest next step before the next session.',
  },
  {
    label: 'session change',
    pattern: /\b(cancel\w*|reschedul\w*|miss\w*|late|session|appointment|book\w*)\b/i,
    suggestedReply: 'I saw the schedule note. I will check the session details and follow up with the next available option.',
  },
  {
    label: 'billing',
    pattern: /\b(payment|billing|invoice|charge|card|refund|subscription)\b/i,
    suggestedReply: 'I saw the account note. I will check the billing details before giving you the next step.',
  },
  {
    label: 'training',
    pattern: /\b(workout|exercise|sets?|reps?|squats?|deadlift|program|plan)\b/i,
    suggestedReply: 'I saw the training note. I will review the plan and send the clean next adjustment.',
  },
  {
    label: 'nutrition',
    pattern: /\b(nutrition|meal|protein|calories|macro|hydration|food)\b/i,
    suggestedReply: 'I saw the nutrition note. I will review it against the current plan and send the next guidance.',
  },
  {
    label: 'waiver',
    pattern: /\b(waiver|intake|consent|form)\b/i,
    suggestedReply: 'I saw the paperwork note. I will check the required item and send the next step.',
  },
] as const;

export function clipThreadText(value: string, limit = MAX_SNIPPET_LENGTH): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 3).trim()}...`;
}

function visibleMessages(messages: MessageData[]): MessageData[] {
  return messages.filter(message => !message.deleted_at && message.content.trim());
}

function normalizeRole(currentUserRole: string | null | undefined): string | null {
  const role = String(currentUserRole || '').toLowerCase();
  return ['admin', 'trainer', 'client'].includes(role) ? role : null;
}

function normalizeThreadId(threadId: string | number | null): string | null {
  const normalizedThreadId = String(threadId || '').trim();
  return /^[1-9]\d*$/.test(normalizedThreadId) ? normalizedThreadId : null;
}

function normalizeSourceMessageId(messageId: unknown): string | null {
  const token = String(messageId ?? '').trim();
  return token && SAFE_SOURCE_MESSAGE_ID.test(token) ? token : null;
}

export function buildCoachThreadBrief(
  messages: MessageData[],
  currentUserId: string | number,
  participantLabel = 'participant',
): ThreadCoachBrief {
  const visible = visibleMessages(messages);
  const latest = visible[visible.length - 1] || null;
  const latestIncoming = [...visible].reverse().find(message => String(message.sender_id) !== String(currentUserId)) || null;
  const joinedContent = visible.map(message => message.content).join(' ');
  const flagLabels = FLAG_RULES
    .filter(rule => rule.pattern.test(joinedContent))
    .map(rule => rule.label);
  const firstFlag = FLAG_RULES.find(rule => flagLabels.includes(rule.label));

  if (!latest) {
    return {
      summary: 'No messages in this thread yet.',
      taskSeed: `Open a clean follow-up with ${participantLabel}.`,
      suggestedReply: 'I am ready when you are. Send over the context and I will help with the next step.',
      flagLabels,
      messageCount: 0,
      sourceMessageId: null,
    };
  }

  const sourceMessage = latestIncoming || latest;
  const latestDirection = String(latest.sender_id) === String(currentUserId) ? 'outbound' : 'inbound';
  const latestSnippet = clipThreadText(latest.content);
  const incomingSnippet = latestIncoming ? clipThreadText(latestIncoming.content) : latestSnippet;

  return {
    summary: `${visible.length} messages. Latest ${latestDirection}: ${latestSnippet}`,
    taskSeed: `Follow up with ${participantLabel}: ${incomingSnippet}`,
    suggestedReply: firstFlag?.suggestedReply || 'I saw this. I will review it and follow up with the next clear step.',
    flagLabels,
    messageCount: visible.length,
    sourceMessageId: normalizeSourceMessageId(sourceMessage.id),
  };
}

export function buildCoachThreadHref(currentUserRole: string | null | undefined, threadId: string | number | null): string | null {
  const role = normalizeRole(currentUserRole);
  const normalizedThreadId = normalizeThreadId(threadId);
  if (!role || !normalizedThreadId) return null;
  const params = new URLSearchParams({
    source: 'messages',
    intent: 'summarize_messages',
    threadId: normalizedThreadId,
    sourcePath: `/dashboard/${role}/messages`,
  });
  return `/dashboard/${role}/coach-assistant?${params.toString()}`;
}

export function buildCoachMessageActionHrefs(
  currentUserRole: string | null | undefined,
  threadId: string | number | null,
  sourceMessageId: string | number | null,
): MessageCoachActionHandoff[] {
  const role = normalizeRole(currentUserRole);
  const normalizedThreadId = normalizeThreadId(threadId);
  const normalizedSourceMessageId = normalizeSourceMessageId(sourceMessageId);
  if (!role || !normalizedThreadId || !normalizedSourceMessageId) return [];

  return MESSAGE_COACH_ACTIONS.map(action => {
    const params = new URLSearchParams({
      source: 'messages',
      intent: action.intent,
      threadId: normalizedThreadId,
      sourceMessageId: normalizedSourceMessageId,
      sourcePath: `/dashboard/${role}/messages`,
    });
    return { ...action, href: `/dashboard/${role}/coach-assistant?${params.toString()}` };
  });
}