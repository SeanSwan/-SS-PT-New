export const AI_COMMAND_MESSAGE_MAX_CHARS = 2000;
export const AI_CHAT_MESSAGE_MAX_CHARS = 12000;
const AI_COMMAND_HEURISTIC_MAX_CHARS = 600;

const NON_RETRYABLE_AI_ERROR_CODES = new Set([
  'MESSAGE_REQUIRED',
  'MESSAGE_TOO_LONG',
  'COMMAND_MESSAGE_REQUIRED',
  'COMMAND_MESSAGE_TOO_LONG',
  'RATE_LIMITED',
  'AI_USER_RATE_LIMITED',
  'AI_GLOBAL_RATE_LIMITED',
]);

const WORKOUT_DICTATION_START = /^(we did|we completed|we finished|today we did|today we completed|client did|he did|she did|they did)\b/;
const WORKOUT_DICTATION_SIGNAL = /\b(workout|exercise|set|sets|rep|reps|rpe|weight|tempo|warmup|cooldown|bench|squat|squats|deadlift|row|rows|push|pull|curl|press|lunge|plank|burpee|cardio|treadmill|bike|elliptical)\b/;

export function isNaturalWorkoutDictationCandidate(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return WORKOUT_DICTATION_START.test(normalized) && WORKOUT_DICTATION_SIGNAL.test(normalized);
}

export function isCommandLaneCandidate(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed || trimmed.length > AI_COMMAND_MESSAGE_MAX_CHARS) return false;
  if (trimmed.length > AI_COMMAND_HEURISTIC_MAX_CHARS) return false;
  if ((trimmed.match(/\n/g) || []).length > 1) return false;

  const normalized = trimmed.toLowerCase();
  const commandStart = /^(add|approve|assign|book|cancel|create|delete|discard|find|generate|hold|inspect|list|log|mark|open|record|remove|reschedule|retry|run|scan|schedule|search|send|set|show|start|update|view)\b/;
  const politeCommandStart = /^(can you|could you|please|swan coach,?)\s+(add|approve|assign|book|cancel|create|delete|discard|find|generate|hold|inspect|list|log|mark|open|record|remove|reschedule|retry|run|scan|schedule|search|send|set|show|start|update|view)\b/;
  const knownCommandPhrase = /^(view available slots|show available slots|review next|open plaud|show plaud|inspect pending plaud audio pieces|scan command center|start onboarding|create client|add a new client|log workout)\b/;

  return commandStart.test(normalized)
    || politeCommandStart.test(normalized)
    || knownCommandPhrase.test(normalized)
    || isNaturalWorkoutDictationCandidate(normalized);
}

export function isChatMessageTooLong(message: string): boolean {
  return message.length > AI_CHAT_MESSAGE_MAX_CHARS;
}

export function buildChatMessageTooLongError(
  length: number,
  maxChars = AI_CHAT_MESSAGE_MAX_CHARS,
): string {
  return `Your message is too long (${length}/${maxChars} characters). Shorten it, attach it as a transcript/audio file, or use the PLAUD/voice upload lane for long intake.`;
}

export function isNonRetryableAiErrorCode(code?: string | null): boolean {
  return !!code && NON_RETRYABLE_AI_ERROR_CODES.has(code);
}

export type AiApiError = Error & {
  code?: string;
  retryable?: boolean;
  status?: number;
};

function apiErrorMessage(data: Record<string, unknown>, fallback: string): string {
  return String(data.error || data.message || fallback);
}

export function buildAiApiError(
  data: Record<string, unknown>,
  fallback: string,
  status: number,
): AiApiError {
  const code = typeof data.code === 'string'
    ? data.code
    : status === 429
      ? 'RATE_LIMITED'
      : undefined;
  const message = status === 429
    ? apiErrorMessage(data, 'Too many AI requests right now. Wait a minute before trying again.')
    : apiErrorMessage(data, fallback);
  const err = new Error(message) as AiApiError;
  err.code = code;
  err.status = status;
  err.retryable = status >= 500 && !isNonRetryableAiErrorCode(code);
  return err;
}

export function buildAiSendFailure(message: string, err: AiApiError) {
  if (err.status === 429) {
    return { failed: true, originalMessage: message, errorCode: 'RATE_LIMITED', retryable: false } as const;
  }

  return {
    failed: true,
    originalMessage: message,
    errorCode: err.code || null,
    retryable: err.retryable !== false,
  } as const;
}
