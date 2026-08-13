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

/** Present but not a string — a value we must refuse rather than quietly discard. */
const isUnusableName = (value) =>
  value !== undefined && value !== null && typeof value !== 'string';

/** Collapse internal whitespace runs so the derived display name is clean. */
const collapseSpaces = (value) => value.replace(/\s+/g, ' ');

/**
 * Resolve the canonical name for an onboarding payload.
 *
 * @param {Record<string, unknown>} formData
 * @returns {{ ok: true, firstName: string, lastName: string, fullName: string }
 *          | { ok: false, field: 'name', reason: string }}
 */
export const resolveOnboardingName = (formData = {}) => {
  // Refuse a present-but-non-string name part rather than coercing or dropping it.
  // Found by probing the fix itself: {firstName:'Ava', lastName: 12345} used to
  // create a client with NO surname and NO error — silent data loss, and
  // inconsistent with rejecting a non-string firstName.
  if (isUnusableName(formData.firstName) || isUnusableName(formData.lastName)) {
    return { ok: false, field: 'name', reason: 'Name fields must be text' };
  }

  const firstName = collapseSpaces(asTrimmedString(formData.firstName));
  const lastName = collapseSpaces(asTrimmedString(formData.lastName));

  if (firstName || lastName) {
    // The split the client collected wins. Never reconstruct what was given.
    return {
      ok: true,
      firstName: firstName || lastName,
      lastName: firstName ? lastName : '',
      fullName: [firstName, lastName].filter(Boolean).join(' '),
    };
  }

  if (isUnusableName(formData.fullName)) {
    return { ok: false, field: 'name', reason: 'Name fields must be text' };
  }

  const fullName = collapseSpaces(asTrimmedString(formData.fullName));
  if (fullName) {
    const parts = fullName.split(' ');
    return {
      ok: true,
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
      // Normalized, not the raw input: 'Ava   Marie   Stone' was being split
      // correctly but STORED with its whitespace runs intact, so the display
      // name and the split disagreed about the same person.
      fullName,
    };
  }

  return { ok: false, field: 'name', reason: 'A first name (or full name) is required' };
};

export default resolveOnboardingName;
