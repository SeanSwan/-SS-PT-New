/**
 * HELPERS: Social Publishing Storage Errors
 * =========================================
 * Detects optional native social publishing table drift without exposing raw
 * database errors to worker control flow.
 */

const SOCIAL_PUBLISHING_TABLE_HINTS = [
  'social_publishing_accounts',
  'social_publishing_jobs',
  'social_publishing_attempts',
  'socialpublishingaccount',
  'socialpublishingjob',
  'socialpublishingattempt',
];

export const getStorageErrorCode = err => (
  err?.code || err?.parent?.code || err?.original?.code || null
);

export const isSocialPublishingStorageUnavailableError = (err) => {
  const message = String(
    err?.message || err?.parent?.message || err?.original?.message || '',
  ).toLowerCase();

  if (!message) return false;
  const mentionsSocialPublishing = SOCIAL_PUBLISHING_TABLE_HINTS.some(hint => message.includes(hint));
  return mentionsSocialPublishing && (
    getStorageErrorCode(err) === '42P01' ||
    (message.includes('relation') && message.includes('does not exist')) ||
    (message.includes('table') && message.includes('does not exist'))
  );
};
