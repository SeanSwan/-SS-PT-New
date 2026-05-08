/**
 * Safe operator-facing PLAUD error copy.
 *
 * Backend error details may include provider text, debug strings, or artifact
 * metadata. UI banners render only allowlisted codes and deterministic copy.
 */

const SAFE_CODES = new Set([
  'AUDIO_FETCH_FAILED',
  'AUDIO_FETCH_TIMEOUT',
  'AUDIO_TOO_LARGE',
  'AUDIO_URL_ALLOWLIST_UNCONFIGURED',
  'AUDIO_URL_NOT_ALLOWED',
  'AUDIO_URL_REDIRECT_REJECTED',
  'INVALID_CLIP_ID',
  'INVALID_CLIENT_ID',
  'INVALID_DATE_OVERRIDE',
  'INVALID_MERGE_REQUEST_ID',
  'INVALID_SEGMENT_ID',
  'MERGE_NOT_APPROVABLE',
  'MERGE_PROCESSING_STALE',
  'NO_FILES',
  'PLAUD_DISABLED',
  'RATE_LIMITED',
  'TOO_FEW_CLIPS',
  'TOO_MANY_FILES',
  'UNSUPPORTED_MIMETYPE',
  'UPLOAD_TOO_LARGE',
]);

const UPLOAD_MESSAGES: Record<string, string> = {
  NO_FILES: 'Choose at least one audio file before uploading.',
  PLAUD_DISABLED: 'PLAUD intake is disabled right now.',
  RATE_LIMITED: 'Too many upload attempts. Wait briefly and retry.',
  TOO_MANY_FILES: 'At most 5 files can be uploaded at once.',
  UNSUPPORTED_MIMETYPE: 'File type is not supported.',
  UPLOAD_TOO_LARGE: 'File is over the upload size limit.',
};

const MERGE_MESSAGES: Record<string, string> = {
  INVALID_CLIENT_ID: 'Choose a valid client before processing.',
  INVALID_CLIP_ID: 'One selected clip is no longer available. Refresh the queue and retry.',
  INVALID_DATE_OVERRIDE: 'Confirm a valid workout date before approving.',
  PLAUD_DISABLED: 'PLAUD intake is disabled right now.',
  RATE_LIMITED: 'Too many processing attempts. Wait briefly and retry.',
  TOO_FEW_CLIPS: 'Select at least one clip before processing.',
  TOO_MANY_FILES: 'At most 5 clips can be processed at once.',
};

const ACTION_MESSAGES: Record<string, string> = {
  INVALID_CLIENT_ID: 'Choose a valid client before logging.',
  INVALID_DATE_OVERRIDE: 'Confirm a valid workout date before approving.',
  INVALID_MERGE_REQUEST_ID: 'This merge review link is no longer valid. Return to the queue.',
  INVALID_SEGMENT_ID: 'This split workout could not be found. Refresh the review.',
  MERGE_NOT_APPROVABLE: 'This merge is not ready to approve. Refresh the queue and review it again.',
  MERGE_PROCESSING_STALE: 'This merge was interrupted. Re-upload the clips and try again.',
  PLAUD_DISABLED: 'PLAUD intake is disabled right now.',
  RATE_LIMITED: 'Too many PLAUD actions. Wait briefly and retry.',
};

export function safePlaudIssueCode(value: unknown): string {
  if (typeof value !== 'string') return 'PLAUD_ERROR';
  return SAFE_CODES.has(value) ? value : 'PLAUD_ERROR';
}

export function safePlaudUploadErrorMessage(code: unknown): string {
  const safeCode = safePlaudIssueCode(code);
  return UPLOAD_MESSAGES[safeCode] || 'Upload failed. Check the file and try again.';
}

export function safePlaudRejectedFileMessage(code: unknown): string {
  const safeCode = safePlaudIssueCode(code);
  return UPLOAD_MESSAGES[safeCode] || 'File was rejected. Check the file type and size.';
}

export function safePlaudMergeErrorMessage(code: unknown): string {
  const safeCode = safePlaudIssueCode(code);
  return MERGE_MESSAGES[safeCode] || 'Processing failed. Refresh the queue and retry.';
}

function extractPlaudErrorCode(err: unknown): unknown {
  const e = err as {
    code?: unknown;
    response?: {
      data?: {
        errorCode?: unknown;
        error?: { code?: unknown };
      };
    };
  };
  return e?.response?.data?.errorCode || e?.response?.data?.error?.code || e?.code;
}

export function safePlaudActionErrorMessage(err: unknown, fallback: string): string {
  const safeCode = safePlaudIssueCode(extractPlaudErrorCode(err));
  return `${safeCode}: ${ACTION_MESSAGES[safeCode] || fallback}`;
}
