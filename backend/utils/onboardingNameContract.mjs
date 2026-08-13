/**
 * ============================================================================
 * FILE: onboardingNameContract.mjs
 * PURPOSE: One place that decides what a client's name IS, across every
 *          onboarding entry point.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-13 (Swan Coach V3 · S2 · F1)
 * ============================================================================
 *
 * WHY THIS EXISTS
 * The mounted staff wizard collects `firstName` and `lastName`
 * (frontend/src/pages/onboarding/components/BasicInfoSection.tsx:46,54) and
 * POSTs its raw form state. The controller required `fullName`, which the
 * frontend onboarding flow never produces — so every staff onboarding returned
 * 400. Two ends of one seam disagreed about the shape of a name.
 *
 * WHY NOT JUST JOIN THE PARTS
 * The controller split `fullName` back apart for User.create. Join-then-split is
 * lossy the moment a name has more than two words:
 *
 *     {firstName: 'Mary Jane', lastName: 'Van Der Berg'}
 *       → 'Mary Jane Van Der Berg'
 *       → {firstName: 'Mary', lastName: 'Jane Van Der Berg'}
 *
 * So the split the wizard already collected is PRESERVED, and `fullName` is
 * derived from it for the downstream uses that want a display string. The
 * legacy fullName-only shape is still accepted and split as before, so existing
 * integrations keep working.
 *
 * A surname is not required: mononyms are real names, and rejecting them is a
 * data-quality opinion this system has no business enforcing on a person.
 */

const asTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * Resolve the canonical name for an onboarding payload.
 *
 * @param {Record<string, unknown>} formData
 * @returns {{ ok: true, firstName: string, lastName: string, fullName: string }
 *          | { ok: false, field: 'name', reason: string }}
 */
export const resolveOnboardingName = (formData = {}) => {
  const firstName = asTrimmedString(formData.firstName);
  const lastName = asTrimmedString(formData.lastName);

  if (firstName || lastName) {
    // The split the client collected wins. Never reconstruct what was given.
    return {
      ok: true,
      firstName: firstName || lastName,
      lastName: firstName ? lastName : '',
      fullName: [firstName, lastName].filter(Boolean).join(' '),
    };
  }

  const fullName = asTrimmedString(formData.fullName);
  if (fullName) {
    const parts = fullName.split(/\s+/);
    return {
      ok: true,
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
      fullName,
    };
  }

  return { ok: false, field: 'name', reason: 'A first name (or full name) is required' };
};

export default resolveOnboardingName;
