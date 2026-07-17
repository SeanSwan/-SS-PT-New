/**
 * FILE: CoachCommandCenter.chatResponse.ts
 * PURPOSE: Honest interpretation of the Swan Coach chat-lane response.
 *
 * Spec bind (SWAN-COACH-V1-SPEC.md "V1 Non-Negotiables" #6): no fake
 * "I did it" responses. Every non-reply outcome must say what happened,
 * what blocked it, and what the operator can do next — never a fabricated
 * coach reply. Sprint A checklist §4/§8: failures render a visible state
 * plus a real next step, inside the conversation stream.
 */

import type { CoachActionProposal } from './SwanCoachTypes';

export type CoachChatOutcome =
  | { kind: 'superseded' }
  | {
      kind: 'paywall' | 'failed' | 'empty';
      label: string;
      body: string;
      attachments: string[];
      status: string;
      retryMessage?: string;
    }
  | { kind: 'reply'; body: string; proposals?: CoachActionProposal[] };

const NETWORK_REASON = 'The message could not reach Swan Coach. Check your connection, then retry.';

const FAILURE_REASONS: Record<string, string> = {
  RATE_LIMITED: 'Swan Coach is receiving too many requests right now. Wait a moment before sending again.',
  MESSAGE_TOO_LONG: 'That message is too long for one send. Split it into smaller messages.',
  NETWORK_ERROR: NETWORK_REASON,
  // Axios offline/network failures surface this code when no HTTP status exists.
  ERR_NETWORK: NETWORK_REASON,
};

function failureReason(errorCode: string | null | undefined, offline: boolean): string {
  if (errorCode && FAILURE_REASONS[errorCode]) return FAILURE_REASONS[errorCode];
  // A code-less failure while the browser reports no connectivity IS a
  // network failure — say so instead of a vague generic (W3: offline truth).
  if (offline) return 'You appear to be offline. The message was not sent — reconnect, then retry.';
  return 'Swan Coach could not process this message.';
}

/**
 * Classify whatever the chat lane returned. `sentMessage` is the operator's
 * original text so failed sends can offer a real retry; `offline` is the
 * caller's navigator.onLine truth at interpretation time.
 */
export function interpretCoachChatResponse(response: unknown, sentMessage: string, offline = false): CoachChatOutcome {
  // A newer message aborted this one; the newer request reports its own result.
  if (response === null || response === undefined) return { kind: 'superseded' };

  if (typeof response === 'object' && 'paywallRequired' in (response as Record<string, unknown>)) {
    return {
      kind: 'paywall',
      label: 'upgrade required',
      body: 'Swan Coach did not reply because this chat is outside the current plan. No message was processed. Upgrade the plan, or use the workout logger and review tools directly.',
      attachments: ['no reply generated', 'plan limit'],
      status: 'Swan Coach chat is plan-limited',
    };
  }

  if (typeof response === 'object' && 'failed' in (response as Record<string, unknown>)) {
    const failure = response as { errorCode?: string | null; retryable?: boolean };
    const retryable = failure.retryable !== false;
    return {
      kind: 'failed',
      label: 'message failed',
      body: `${failureReason(failure.errorCode, offline)} Nothing was saved and no reply was generated.`,
      attachments: retryable ? ['no reply generated', 'retry available'] : ['no reply generated'],
      status: 'Swan Coach message failed',
      ...(retryable ? { retryMessage: sentMessage } : {}),
    };
  }

  if (typeof response === 'object' && 'content' in (response as Record<string, unknown>)) {
    const body = String((response as { content: unknown }).content ?? '').trim();
    const metadata = (response as { metadata?: { coachActionProposals?: CoachActionProposal[] } }).metadata;
    const proposals = Array.isArray(metadata?.coachActionProposals) && metadata.coachActionProposals.length
      ? metadata.coachActionProposals
      : undefined;
    if (body) return { kind: 'reply', body, ...(proposals ? { proposals } : {}) };
    // A blank body WITH proposals is still a real, actionable reply — the
    // confirm cards are the content. (Copy stays truthful: cards follow.)
    if (proposals) return { kind: 'reply', body: 'Prepared an action for your review:', proposals };
  }

  // Unknown shape or blank content: never fabricate a coach reply. The user
  // message may already be delivered server-side, so do NOT claim nothing was
  // saved — retrying knowingly asks again.
  return {
    kind: 'empty',
    label: 'no reply received',
    body: 'Swan Coach returned an empty reply. Your message went through, but no answer came back. Retry to ask again, or rephrase it if this keeps happening.',
    attachments: ['no reply generated', 'retry available'],
    status: 'Swan Coach reply was empty',
    retryMessage: sentMessage,
  };
}
