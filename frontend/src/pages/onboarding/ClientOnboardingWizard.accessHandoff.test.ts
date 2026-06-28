import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, 'ClientOnboardingWizard.tsx'), 'utf8');

describe('ClientOnboardingWizard access handoff', () => {
  it('does not render generated passwords in the onboarding success modal', () => {
    expect(source).not.toContain('submissionResult.tempPassword');
    expect(source).not.toContain('Temporary Password');
    expect(source).toContain('submissionResult.resetEmailSent');
    expect(source).toContain('Secure login link sent.');
  });
});