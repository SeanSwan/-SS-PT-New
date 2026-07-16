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
  | { kind: 'reply'; body: string };

const FAILURE_REASONS: Record<string, string> = {
  RATE_LIMITED: 'Swan Coach is receiving too many requests right now. Wait a moment before sending again.',
  MESSAGE_TOO_LONG: 'That message is too long for one send. Split it into smaller messages.',
  NETWORK_ERROR: 'The message could not reach Swan Coach. Check your connection, then retry.',
};

function failureReason(errorCode: string | null | undefined): string {
  if (errorCode && FAILURE_REASONS[errorCode]) return FAILURE_REASONS[errorCode];
  return 'Swan Coach could not process this message.';
}

/**
 * Classify whatever the chat lane returned. `sentMessage` is the operator's
 * original text so failed sends can offer a real retry.
 */
export function interpretCoachChatResponse(response: unknown, sentMessage: string): CoachChatOutcome {
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
      body: `${failureReason(failure.errorCode)} Nothing was saved and no reply was generated.`,
      attachments: retryable ? ['no reply generated', 'retry available'] : ['no reply generated'],
      status: 'Swan Coach message failed',
      ...(retryable ? { retryMessage: sentMessage } : {}),
    };
  }

  if (typeof response === 'object' && 'content' in (response as Record<string, unknown>)) {
    const body = String((response as { content: unknown }).content ?? '').trim();
    if (body) return { kind: 'reply', body };
  }

  // Unknown shape: never fabricate a coach reply.
  return {
    kind: 'empty',
    label: 'no reply received',
    body: 'Swan Coach returned an empty reply. Nothing was saved. Retry the message, or rephrase it if this keeps happening.',
    attachments: ['no reply generated', 'retry available'],
    status: 'Swan Coach reply was empty',
    retryMessage: sentMessage,
  };
}
