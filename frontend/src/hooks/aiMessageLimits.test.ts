import { describe, expect, it } from 'vitest';

import {
  AI_CHAT_MESSAGE_MAX_CHARS,
  AI_COMMAND_MESSAGE_MAX_CHARS,
  buildAiApiError,
  buildAiSendFailure,
  buildChatMessageTooLongError,
  isChatMessageTooLong,
  isCommandLaneCandidate,
  isNonRetryableAiErrorCode,
} from './aiMessageLimits';

describe('AI message limit policy', () => {
  it('keeps command-lane messages capped at 2000 characters', () => {
    expect(AI_COMMAND_MESSAGE_MAX_CHARS).toBe(2000);
    expect(isCommandLaneCandidate('show available slots tomorrow')).toBe(true);
    expect(isCommandLaneCandidate('x'.repeat(2001))).toBe(false);
  });

  it('keeps narrative onboarding notes out of the command lane even when short', () => {
    const prompt = 'I met with a new client today. He wants to build strength, avoid knee pain, and start with two sessions per week.';

    expect(isCommandLaneCandidate(prompt)).toBe(false);
  });

  it('does not route narrative text to command lane just because it contains a command phrase', () => {
    const prompt = 'Today I met Marcus and he asked me to start onboarding after we finish the knee history and goals.';

    expect(isCommandLaneCandidate(prompt)).toBe(false);
    expect(isCommandLaneCandidate('start onboarding Marcus')).toBe(true);
    expect(isCommandLaneCandidate('please start onboarding Marcus')).toBe(true);
  });

  it('routes explicit PLAUD audio-inspection commands through the command lane', () => {
    expect(isCommandLaneCandidate('inspect pending PLAUD audio pieces')).toBe(true);
    expect(isCommandLaneCandidate('please inspect pending PLAUD audio pieces')).toBe(true);
  });

  it('routes short natural workout dictation through the command lane', () => {
    expect(isCommandLaneCandidate('we did bench press 3 sets of 10 at 135')).toBe(true);
    expect(isCommandLaneCandidate('today we did squats, rows, and planks')).toBe(true);
    expect(isCommandLaneCandidate('we did paperwork before the session')).toBe(false);
  });

  it('allows long onboarding prompts through the chat lane before the chat cap', () => {
    expect(AI_CHAT_MESSAGE_MAX_CHARS).toBeGreaterThan(AI_COMMAND_MESSAGE_MAX_CHARS);
    expect(isChatMessageTooLong('x'.repeat(AI_CHAT_MESSAGE_MAX_CHARS))).toBe(false);
    expect(isChatMessageTooLong('x'.repeat(AI_CHAT_MESSAGE_MAX_CHARS + 1))).toBe(true);
  });

  it('builds a clear recovery message for oversized chat prompts', () => {
    const message = buildChatMessageTooLongError(AI_CHAT_MESSAGE_MAX_CHARS + 25);

    expect(message).toContain('too long');
    expect(message).toContain(`${AI_CHAT_MESSAGE_MAX_CHARS + 25}`);
    expect(message).toContain(`${AI_CHAT_MESSAGE_MAX_CHARS}`);
    expect(message).toContain('attach');
  });

  it('marks validation and rate-limit failures as non-retryable from the banner', () => {
    expect(isNonRetryableAiErrorCode('MESSAGE_TOO_LONG')).toBe(true);
    expect(isNonRetryableAiErrorCode('COMMAND_MESSAGE_TOO_LONG')).toBe(true);
    expect(isNonRetryableAiErrorCode('RATE_LIMITED')).toBe(true);
    expect(isNonRetryableAiErrorCode('SERVER_ERROR')).toBe(false);
  });

  it('normalizes 429 responses into a non-retryable rate-limit failure', () => {
    const err = buildAiApiError(
      { success: false, code: 'AI_USER_RATE_LIMITED', message: 'Slow down' },
      'Failed to send message',
      429,
    );
    const failure = buildAiSendFailure('original prompt', err);

    expect(err.retryable).toBe(false);
    expect(failure).toEqual({
      failed: true,
      originalMessage: 'original prompt',
      errorCode: 'RATE_LIMITED',
      retryable: false,
    });
  });
});
