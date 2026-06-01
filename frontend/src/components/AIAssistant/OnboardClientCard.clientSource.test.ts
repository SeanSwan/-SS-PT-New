import { describe, expect, it } from 'vitest';
import { getOnboardClientSourceMeta } from './OnboardClientCard';

describe('OnboardClientCard client source display', () => {
  it('labels external onboarding drafts as free tracking instead of paid SwanStudios', () => {
    expect(getOnboardClientSourceMeta('external')).toEqual({
      source: 'external',
      label: 'External (Free Tracking)',
    });
  });

  it('defaults unknown or missing sources to SwanStudios paid', () => {
    expect(getOnboardClientSourceMeta(undefined)).toEqual({
      source: 'swanstudios',
      label: 'SwanStudios (Paid)',
    });
  });
});
