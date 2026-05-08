/**
 * coachCommandFormatters.ts
 * =========================
 * Shared display formatters for Swan Coach command cards.
 */

const SAFE_COMMAND_DISPLAY_KEYS = new Set([
  'actionable',
  'applied',
  'clientId',
  'count',
  'created',
  'failed',
  'id',
  'needsClient',
  'pendingDrafts',
  'readyReview',
  'status',
  'success',
  'total',
  'updated',
  'workoutId',
]);

const UNSAFE_COMMAND_KEY_PATTERN = new RegExp([
  'address',
  'clientname',
  'content',
  'detail',
  'email',
  'filename',
  'fileName',
  'firstname',
  'lastname',
  'message',
  'name',
  'notes?',
  'phone',
  'prompt',
  'raw',
  'secret',
  'sourceFile',
  'text',
  'token',
  'transcript',
  'uploadedFile',
  'url',
].join('|'), 'i');
const SAFE_SHORT_VALUE_PATTERN = /^[a-z0-9_ .:#-]{1,48}$/i;

export function isSafeCommandDisplayKey(key: string): boolean {
  if (!key || UNSAFE_COMMAND_KEY_PATTERN.test(key)) return false;
  if (SAFE_COMMAND_DISPLAY_KEYS.has(key)) return true;
  return /(Count|Id|Total)$/.test(key) || /(_count|_id|_total)$/i.test(key);
}

function safeStringValue(value: string): string {
  const text = value.trim();
  if (!text) return '(empty)';
  if (text.includes('@') || /^https?:\/\//i.test(text) || !SAFE_SHORT_VALUE_PATTERN.test(text)) {
    return 'Value withheld';
  }
  return text;
}

export function renderCommandParamValue(key: string, value: unknown): string {
  if (!isSafeCommandDisplayKey(key)) return 'Value withheld';
  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? '' : 's'}`;
  }
  if (typeof value === 'object' && value !== null) {
    return 'Structured value available';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'Value withheld';
  }
  if (typeof value === 'string') {
    return safeStringValue(value);
  }
  return String(value);
}
