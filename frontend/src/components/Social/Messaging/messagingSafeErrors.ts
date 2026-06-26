export const MESSAGING_ERROR_MESSAGES = {
  conversations: 'Unable to load conversations. Please try again.',
  messages: 'Unable to load messages. Please try again.',
  send: 'Unable to send the message. Please try again.',
  create: 'Unable to start that conversation. Please try again.',
  request: 'Messaging request failed. Please try again.',
  generic: 'Messaging is temporarily unavailable. Please try again.',
} as const;

export type MessagingErrorKind = keyof typeof MESSAGING_ERROR_MESSAGES;
export type MessagingErrorState = {
  message: string;
  type: 'persistent' | 'transient';
  timestamp: number;
};

const SAFE_MESSAGING_ERROR_MESSAGES = new Set<string>(Object.values(MESSAGING_ERROR_MESSAGES));

export function createMessagingErrorState(
  kind: MessagingErrorKind,
  type: MessagingErrorState['type'] = 'transient'
): MessagingErrorState {
  return {
    message: MESSAGING_ERROR_MESSAGES[kind],
    type,
    timestamp: Date.now(),
  };
}

export function getSafeMessagingErrorMessage(error: Pick<MessagingErrorState, 'message'> | null): string {
  if (!error?.message) {
    return MESSAGING_ERROR_MESSAGES.generic;
  }
  return SAFE_MESSAGING_ERROR_MESSAGES.has(error.message)
    ? error.message
    : MESSAGING_ERROR_MESSAGES.generic;
}
