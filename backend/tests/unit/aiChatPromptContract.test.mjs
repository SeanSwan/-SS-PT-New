/**
 * aiChatPromptContract.test.mjs
 * ==============================
 * Locks Swan Coach onto the structured proposal contract. The model prepares
 * drafts; deterministic backend services own approval and final writes.
 */
import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '../../services/aiChatService.mjs';

describe('Swan Coach prompt contract', () => {
  it('teaches admin Coach to emit structured approval proposals', () => {
    const prompt = getSystemPrompt('admin', 'coach_assistant', 'concise');

    expect(prompt).toContain('coach_action_proposal');
    expect(prompt).toContain('schema_version');
    expect(prompt).toContain('proposal_type');
    expect(prompt).toContain('evidence_refs');
    expect(prompt).toContain('safety_flags');
    expect(prompt).toContain('deterministic approval');
    expect(prompt).toContain('Do not emit legacy create_client');
  });

  it('teaches trainer Coach the same structured proposal contract', () => {
    const prompt = getSystemPrompt('trainer', 'coach_assistant', 'concise');

    expect(prompt).toContain('coach_action_proposal');
    expect(prompt).toContain('trainer approval required');
    expect(prompt).toContain('Final writes belong to deterministic backend services');
  });

  it('does not inject proposal instructions into normal client chat', () => {
    const prompt = getSystemPrompt('client', 'general', 'concise');

    expect(prompt).not.toContain('coach_action_proposal');
    expect(prompt).not.toContain('Do not emit legacy create_client');
  });
});
