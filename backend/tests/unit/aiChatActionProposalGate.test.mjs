/**
 * aiChatActionProposalGate.test.mjs
 * =================================
 * Regression guard: Swan Coach AI output may prepare approval proposals, but
 * the chat route must not execute client/workout writes directly from JSON
 * action blocks emitted by a model.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const AI_CHAT_ROUTES_SRC = readFileSync(
  resolve(__dirname, '../../routes/aiChatRoutes.mjs'),
  'utf8',
);

describe('AI chat action proposal gate', () => {
  it('routes model action blocks into the structured proposal service', () => {
    expect(AI_CHAT_ROUTES_SRC).toMatch(/createCoachActionProposalsFromAiResponse/);
    expect(AI_CHAT_ROUTES_SRC).toMatch(/coachActionProposals/);
  });

  it('does not execute legacy client or workout writes inside aiChatRoutes', () => {
    expect(AI_CHAT_ROUTES_SRC).not.toMatch(/processAIDataUpdates/);
    expect(AI_CHAT_ROUTES_SRC).not.toMatch(/User\.create\(/);
    expect(AI_CHAT_ROUTES_SRC).not.toMatch(/WorkoutSession\.create\(/);
    expect(AI_CHAT_ROUTES_SRC).not.toMatch(/WorkoutLog\.bulkCreate\(/);
  });

  it('does not dispatch AI_SUBMIT_WORKOUT as a browser write action', () => {
    expect(AI_CHAT_ROUTES_SRC).not.toMatch(/AI_SUBMIT_WORKOUT/);
  });

  it('does not echo raw proposal persistence errors in chat responses', () => {
    expect(AI_CHAT_ROUTES_SRC).toContain('COACH_ACTION_PROPOSAL_FAILED_MESSAGE');
    expect(AI_CHAT_ROUTES_SRC).not.toMatch(/code:\s*proposalErr\.code/);
    expect(AI_CHAT_ROUTES_SRC).not.toMatch(/message:\s*proposalErr\.message/);
    expect(AI_CHAT_ROUTES_SRC).not.toMatch(/proposalErr\.message\s*\|\|/);
  });
});
