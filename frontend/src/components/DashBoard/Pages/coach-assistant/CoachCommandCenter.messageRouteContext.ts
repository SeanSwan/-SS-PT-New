/**
 * Message-origin route context helpers for the mounted Coach Command Center.
 * Keeps message handoffs token-only: thread/message ids are allowed, raw text is not.
 */
import type { CoachMessageActionRouteContext } from './CoachCommandCenter.types';

export type MessageRouteContextCopy = { prompt: string | null; status: string | null };

const SAFE_MESSAGE_ID = /^[a-z0-9_-]{1,80}$/i;
const MESSAGE_ACTION_INTENTS = new Set([
  'create_task_from_message',
  'schedule_from_message',
  'log_workout_from_message',
]);

function safePositiveIntegerString(rawValue: string | null | undefined): string | undefined {
  const token = rawValue?.trim();
  if (!token || !/^[1-9]\d*$/.test(token)) return undefined;
  return Number.isSafeInteger(Number(token)) ? token : undefined;
}

function safeMessageToken(rawValue: string | null | undefined): string | undefined {
  const token = rawValue?.trim();
  return token && SAFE_MESSAGE_ID.test(token) ? token : undefined;
}

export function compactMessageActionRouteContext(
  rawContext: Partial<CoachMessageActionRouteContext> | null | undefined,
): CoachMessageActionRouteContext {
  const threadId = safePositiveIntegerString(rawContext?.threadId);
  const sourceMessageId = safeMessageToken(rawContext?.sourceMessageId);
  return {
    ...(threadId ? { threadId } : {}),
    ...(sourceMessageId ? { sourceMessageId } : {}),
  };
}

export function getMessageActionRouteContextFromSearchParams(
  searchParams: URLSearchParams,
): CoachMessageActionRouteContext | null {
  const intent = searchParams.get('intent');
  if (!intent || !MESSAGE_ACTION_INTENTS.has(intent)) return null;
  const context = compactMessageActionRouteContext({
    threadId: searchParams.get('threadId') || undefined,
    sourceMessageId: searchParams.get('sourceMessageId') || undefined,
  });
  return Object.keys(context).length ? context : null;
}

function prompt(parts: string[]): string {
  return parts.join(' ');
}

function messageSummaryRouteContext(): MessageRouteContextCopy {
  return {
    prompt: prompt([
      'Message thread summary.',
      'Use the selected thread route context to summarize the conversation at a high level without requiring private message text in the URL.',
      'Provide a read-only summary, action-risk flags, and the safest next follow-up options.',
      'Keep message sends, task creation, schedule changes, billing actions, and profile writes review-gated; draft suggested replies only after I ask.',
    ]),
    status: 'Message thread summary context loaded',
  };
}

function messageActionRouteContext(copy: string): MessageRouteContextCopy {
  return {
    prompt: prompt([
      `${copy}.`,
      'Use the selected thread route context and selected message reference only; do not require private message text in the URL.',
      'Ask for missing details if needed, prepare a draft only, and keep final writes behind approval.',
    ]),
    status: 'Message action context loaded',
  };
}

export function buildMessageRouteContext(routeIntent: string | null): MessageRouteContextCopy {
  switch (routeIntent) {
    case 'summarize_messages':
      return messageSummaryRouteContext();
    case 'create_task_from_message':
      return messageActionRouteContext('Create a review-gated task draft from the selected message context');
    case 'schedule_from_message':
      return messageActionRouteContext('Prepare a review-gated schedule follow-up from the selected message context');
    case 'log_workout_from_message':
      return messageActionRouteContext('Prepare a review-gated workout log draft from the selected message context');
    default:
      return { prompt: null, status: null };
  }
}