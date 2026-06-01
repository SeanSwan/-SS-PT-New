/**
 * intentClassifierOnboardingPrompt.test.mjs
 * =========================================
 * Locks Swan Coach onboarding classification examples to the approval contract.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'services/ai/intentClassifier.mjs'), 'utf8');

describe('intent classifier onboarding prompt contract', () => {
  it('asks for clarification when a new-client command is missing required onboarding identity fields', () => {
    expect(source).toContain('If a client creation request is missing firstName, lastName, or clientSource, return clarification_needed');
    expect(source).toContain('Add Jackie Reed from Move Fitness');
    expect(source).not.toContain('Add Jackie from Move Fitness');
  });
});
