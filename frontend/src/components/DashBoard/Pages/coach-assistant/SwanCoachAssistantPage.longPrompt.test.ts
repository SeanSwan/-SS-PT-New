/**
 * Swan Coach long-prompt regression locks
 * ======================================
 * Source-level locks are used here because the live page has a deep provider
 * tree. These tests lock the production bug Sean hit: long onboarding prompts
 * must not hit the command endpoint first, and non-retryable 400/429 states
 * must not render the same retry action that caused the rate-limit spiral.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PAGE_SOURCE = readFileSync(resolve(__dirname, './SwanCoachAssistantPage.tsx'), 'utf8');
const MESSAGES_PANEL_SOURCE = readFileSync(resolve(__dirname, './SwanCoachMessagesPanel.tsx'), 'utf8');
const COACH_HOOK_SOURCE = readFileSync(resolve(__dirname, './hooks/useCoachAssistant.ts'), 'utf8');
const CHAT_HOOK_SOURCE = readFileSync(resolve(__dirname, '../../../../hooks/useAIChat.ts'), 'utf8');
const COMMAND_HOOK_SOURCE = readFileSync(resolve(__dirname, '../../../../hooks/useCoachCommand.ts'), 'utf8');
const LIMIT_SOURCE = readFileSync(resolve(__dirname, '../../../../hooks/aiMessageLimits.ts'), 'utf8');

describe('SwanCoachAssistantPage long-prompt behavior', () => {
  it('routes command-sized messages through the command lane but bypasses it for long prompts', () => {
    expect(COACH_HOOK_SOURCE).toMatch(/isCommandLaneCandidate/);
    expect(COACH_HOOK_SOURCE).toMatch(/if\s*\(\s*isCommandLaneCandidate\(trimmedText\)\s*\)/);
    expect(COACH_HOOK_SOURCE).toMatch(/executeCommand\(trimmedText/);
    expect(COACH_HOOK_SOURCE).toMatch(/chat\.sendMessageWithConversation\(\s*trimmedText/);
  });

  it('keeps the exact command endpoint isolated to useCoachCommand', () => {
    expect(COMMAND_HOOK_SOURCE).toContain('/api/ai-command/execute');
    expect(CHAT_HOOK_SOURCE).toContain('/api/ai-chat/conversations/${convId}/messages');
  });

  it('blocks oversized chat prompts before network submit and preserves the original text', () => {
    expect(CHAT_HOOK_SOURCE).toMatch(/isChatMessageTooLong\(message\)/);
    expect(CHAT_HOOK_SOURCE).toMatch(/errorCode:\s*'MESSAGE_TOO_LONG'/);
    expect(CHAT_HOOK_SOURCE).toMatch(/originalMessage:\s*message/);
  });

  it('surfaces non-retryable error metadata so validation and 429 states do not loop', () => {
    expect(CHAT_HOOK_SOURCE).toMatch(/lastErrorRetryable/);
    expect(CHAT_HOOK_SOURCE).toMatch(/buildAiSendFailure\(message, apiErr\)/);
    expect(LIMIT_SOURCE).toMatch(/status\s*===\s*429/);
    expect(LIMIT_SOURCE).toMatch(/errorCode:\s*'RATE_LIMITED'/);
    expect(PAGE_SOURCE).toMatch(/lastErrorRetryable=\{coach\.lastErrorRetryable\}/);
    expect(MESSAGES_PANEL_SOURCE).toMatch(/lastErrorRetryable\s*&&\s*lastAttempt/);
  });
});
