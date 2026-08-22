/**
 * ============================================================================
 * FILE: aiConsentCopy.ts
 * PURPOSE: Single source of truth for Swan Coach privacy & consent copy
 * CREATED: 2026-08-22 · Wave 1 Slice 3 (client-dashboard remediation)
 * ============================================================================
 *
 * WHY THIS FILE EXISTS
 * The consent language lived inline in four components and drifted from what
 * the backend actually does. Three surfaces told users their "identity is
 * hidden" and that they "stay anonymous" while `deIdentificationService`
 * assigns a STABLE `Client #<id>` pseudonym and forwards injury, pain,
 * measurement and goal data unchanged. That is pseudonymized processing, not
 * anonymity — and it was being claimed at the moment consent is legally
 * captured (the onboarding wizard), not just on a settings screen.
 *
 * Consent copy is a compliance surface. It lives in one module so it cannot
 * drift per-component again, and so a future change is a single diff to review.
 *
 * ── ACCURACY CONTRACT ──────────────────────────────────────────────────────
 * Every claim below was verified against
 * `backend/services/deIdentificationService.mjs` (DIRECT_IDENTIFIER_PATHS +
 * scanAndRedactPII). Do NOT edit this copy without re-reading that file.
 *
 * That service is a DENYLIST: it removes the paths below and regex-redacts
 * email/phone patterns anywhere in the payload. Everything else the caller
 * includes is forwarded.
 *
 * CONSEQUENCE, and why the copy below is worded carefully: a denylist cannot
 * promise "training-relevant data only". An unrecognised field, or a name typed
 * into a free-text note, is forwarded. The copy therefore describes what IS
 * sent and warns about notes, rather than claiming a guarantee the architecture
 * does not provide. Replacing this with an outbound ALLOWLIST DTO is the real
 * fix and is tracked separately -- until then, do not restore "only" wording.
 *
 * REMOVED before anything leaves the server:
 *   supplements, sleep, stress  (GATED_HEALTH_PATHS, owner decision Q2 —
 *     restored only when COACH_HEALTH_FIELDS_ENABLED is set, which requires a
 *     consent-version bump because it changes what users were told)
 *   name / preferredName / firstName / lastName / fullName
 *   contact block — email, phone, address, city, state, zip, emergency contact
 *   dateOfBirth / dob, bloodType, ssn, insuranceId, insuranceProvider
 *   occupation, employer, workplace, stressSources
 *   medications, surgeries, doctorName / physician
 *   plus any email- or phone-shaped string found anywhere in the payload
 *
 * FORWARDED (this is the honest part the old copy omitted):
 *   a stable `Client #<id>` label, goals, fitness level, measurements,
 *   training history, exercise preferences, injury / pain history, and
 *   exercise-relevant medical conditions
 *
 * The stability of the pseudonym is the material fact: sessions link to one
 * another, so this is de-identification, not anonymization.
 */

/** Bumped whenever the substance of the disclosure changes. See CONSENT_VERSION_NOTES. */
export const AI_CONSENT_VERSION = '2.0';

export const CONSENT_VERSION_NOTES =
  'v2.0 (2026-08-22) — corrected anonymity language to pseudonymization; ' +
  'enumerated forwarded fields. v1.0 consents were captured under a ' +
  'description that overstated anonymity and require re-consent.';

/** One-line summary used as a section subtitle. */
export const AI_CONSENT_SUBTITLE =
  'SwanStudios uses Swan Coach to create personalized workout plans. Your data is ' +
  'pseudonymized — Swan Coach sees a stable client ID instead of your name or ' +
  'contact details. Review exactly what is and is not shared below.';

/** Ordered privacy bullets. `tone` lets each surface pick its own icon/color. */
export const AI_CONSENT_PROTECTIONS: ReadonlyArray<{
  key: string;
  title: string;
  body: string;
  tone: 'protect' | 'disclose';
}> = [
  {
    key: 'pseudonymized',
    title: 'Pseudonymized, not anonymous.',
    body:
      'Swan Coach sees a stable client ID rather than your name. Because the ID stays ' +
      'the same across sessions, this is de-identification — not full anonymity.',
    tone: 'disclose',
  },
  {
    key: 'removed',
    title: 'Removed before sending.',
    body:
      'Your name, email, phone, address, date of birth, blood type, insurance details, ' +
      'occupation and employer, medications, surgeries, and any doctor names are ' +
      'stripped before anything reaches the Swan Coach provider. Supplements, sleep ' +
      'and stress data are also withheld.',
    tone: 'protect',
  },
  {
    key: 'shared',
    title: 'What is shared.',
    body:
      'Your goals, fitness level, measurements, training history, exercise ' +
      'preferences, injury and pain history, and any medical conditions you have ' +
      'recorded — the last two so Swan Coach can avoid programming that could ' +
      'hurt you. Anything else you enter in a free-text note travels with it, so ' +
      'avoid putting names, addresses or ID numbers in notes.',
    tone: 'disclose',
  },
  {
    key: 'audit',
    title: 'Full audit trail.',
    body:
      'Every Swan Coach interaction is logged with a cryptographic hash, never your ' +
      'raw data.',
    tone: 'protect',
  },
  {
    key: 'withdraw',
    title: 'Withdraw anytime.',
    body:
      'You can turn Swan Coach off from your dashboard at any time. Withdrawal stops ' +
      'all future processing; plans already generated remain in your account.',
    tone: 'protect',
  },
];

/** Long-form legal disclosure. Rendered verbatim. */
export const AI_CONSENT_DISCLOSURE =
  'By granting consent, you agree that SwanStudios may process your pseudonymized ' +
  'fitness profile through a Swan Coach provider to generate personalized workout ' +
  'plans. Direct identifiers — your name, contact details, date of birth, insurance ' +
  'information, medications, surgeries, and physician names — are removed before ' +
  'transmission. Training-relevant data, including your goals, measurements, ' +
  'injury and pain history, and medical conditions that affect exercise, is sent ' +
  'alongside a stable client ID. Because that ' +
  'identifier is stable, this is de-identified processing rather than anonymous ' +
  'processing. You may withdraw consent at any time from the Swan Coach Privacy & ' +
  'Consent page in your dashboard; withdrawal stops future processing but does not ' +
  'delete plans already generated.';

/** Shown where the client ID is first revealed (onboarding success). */
export const AI_CONSENT_CLIENT_ID_NOTE =
  'Your client ID has been assigned. Swan Coach identifies you by this ID instead of ' +
  'your name:';

/** Re-consent prompt for users who granted under v1.0 (owner decision Q5). */
export const AI_CONSENT_RECONSENT_PROMPT =
  'We have corrected our description of how Swan Coach uses your data. The previous ' +
  'wording said your identity was hidden; in fact Swan Coach receives a stable client ' +
  'ID along with your training and injury history. Nothing about the data itself has ' +
  'changed. Please review the updated disclosure and confirm to keep using Swan Coach.';
