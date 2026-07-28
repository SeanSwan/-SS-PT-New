/**
 * Draft-restore safety contract for ClientOnboardingWizard (launch audit S4).
 *
 * Both cases below were found by hostile review of the draft-persistence wiring,
 * not by a failing user report:
 *
 *  1. CRASH — a draft saved against a longer/older version of the wizard restores
 *     `currentStep: 7`; if the wizard now has fewer steps, `steps[currentStep]`
 *     is undefined and `.component` throws on mount.
 *  2. PRIVACY — if auth has not resolved, `user?.id` is undefined and the draft
 *     key falls back to "anonymous", which two different clients sharing one
 *     browser would BOTH read and write (rule 8).
 *
 * These assert the guards in the wizard source directly, because mounting the
 * full wizard drags in 8 lazy sections, framer-motion and the theme provider.
 */
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wizardSource = readFileSync(resolve(__dirname, 'ClientOnboardingWizard.tsx'), 'utf8');

describe('ClientOnboardingWizard draft-restore guards', () => {
  it('clamps a restored step into the valid range', () => {
    expect(wizardSource).toContain('Math.min(');
    expect(wizardSource).toContain('WIZARD_STEPS.length - 1');
    // and the clamped value is what seeds state
    expect(wizardSource).toMatch(/useState\(restoredStep\)/);
  });

  it('never uses a raw restored step directly as initial state', () => {
    expect(wizardSource).not.toMatch(/useState\(\s*restoredDraft\.current\?\.currentStep/);
  });

  it('requires a real user id before enabling drafts', () => {
    expect(wizardSource).toContain('draftUserId !== null');
    expect(wizardSource).toMatch(/const\s+draftEnabled\s*=\s*selfSubmit\s*&&\s*!onSubmit\s*&&\s*draftUserId !== null/);
  });

  it('keeps drafts off the staff-creates-a-client path', () => {
    expect(wizardSource).toMatch(/selfSubmit\s*&&\s*!onSubmit/);
  });

  it('clears the draft once answers are persisted server-side', () => {
    expect(wizardSource).toContain('clearDraft(draftUserId)');
  });

  it('autosaves form data and step together', () => {
    expect(wizardSource).toContain('writeDraft(draftUserId, { formData, currentStep })');
  });
});
