/**
 * applaudV0510WebhookAdapter.mjs
 * ==============================
 * Compatibility adapter for Applaud v0.5.10 webhooks.
 *
 * Applaud v0.5.10 signs the raw JSON body with:
 *   x-applaud-signature: sha256=<hmac hex>
 *
 * Its payload is nested (`event`, `recording`, `http_urls`) while Swan's
 * existing Phase 5 receiver consumes a flat internal shape. This module keeps
 * that translation isolated so the controller can stay source-agnostic.
 */
import crypto from 'node:crypto';

const APPLAUD_SIGNATURE_REGEX = /^sha256=([0-9a-f]{64})$/i;
const MAX_EVENT_ID_LENGTH = 128;
const MAX_RECORDING_ID_LENGTH = 255;
const AUDIO_MIMETYPE_BY_EXT = {
  aac: 'audio/aac',
  flac: 'audio/flac',
  m4a: 'audio/m4a',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  webm: 'audio/webm',
};

export function hasApplaudV0510Signature(req) {
  return typeof req?.headers?.['x-applaud-signature'] === 'string';
}

export function parseApplaudV0510SignatureHeader(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(APPLAUD_SIGNATURE_REGEX);
  return match ? { sig: match[1].toLowerCase() } : null;
}

export function verifyApplaudV0510Hmac(rawBody, sigHex, secret) {
  if (!Buffer.isBuffer(rawBody)) {
    return { ok: false, status: 500, code: 'INTERNAL_ERROR', message: 'rawBody not captured by middleware' };
  }
  if (!/^[0-9a-f]{64}$/i.test(sigHex || '')) {
    return { ok: false, status: 401, code: 'SIGNATURE_MALFORMED' };
  }
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest();
  const provided = Buffer.from(sigHex, 'hex');
  if (provided.length !== expected.length || !crypto.timingSafeEqual(expected, provided)) {
    return { ok: false, status: 401, code: 'SIGNATURE_INVALID' };
  }
  return { ok: true };
}

export function normalizeApplaudV0510Payload(body, { mediaBaseUrl } = {}) {
  if (!body || typeof body !== 'object') {
    return invalidPayload('body must be an object');
  }
  const eventType = body.event;
  if (eventType !== 'audio_ready' && eventType !== 'transcript_ready') {
    return invalidPayload('event missing or unsupported');
  }
  const recording = body.recording;
  if (!recording || typeof recording !== 'object') {
    return invalidPayload('recording missing');
  }
  const recordingId = typeof recording.id === 'string' ? recording.id.trim() : '';
  if (!recordingId || recordingId.length > MAX_RECORDING_ID_LENGTH) {
    return invalidPayload('recording.id missing or too long');
  }

  const normalized = {
    event_id: buildApplaudEventId(eventType, recordingId),
    event_type: eventType,
    recording_id: recordingId,
    device_serial: normalizeOptionalString(recording.serial_number, 255),
    applaud_instance_id: normalizeOptionalString(body.instance_id, 255),
  };

  if (eventType === 'transcript_ready') {
    return { ok: true, parsed: normalized };
  }

  const audioUrl = typeof body.http_urls?.audio === 'string' ? body.http_urls.audio : '';
  const rewrittenUrl = rewriteApplaudAudioUrl(audioUrl, mediaBaseUrl);
  if (!rewrittenUrl.ok) return rewrittenUrl;

  const ext = pickAudioExtension(audioUrl, body.files?.audio, recording.filename);
  if (!ext) {
    return { ok: false, status: 415, code: 'UNSUPPORTED_AUDIO_TYPE', message: 'audio extension unsupported' };
  }
  const sizeBytes = Number(recording.filesize_bytes);
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return invalidPayload('recording.filesize_bytes missing or invalid');
  }

  return {
    ok: true,
    parsed: {
      ...normalized,
      audio_url: rewrittenUrl.url,
      audio_size_bytes: sizeBytes,
      audio_mimetype: AUDIO_MIMETYPE_BY_EXT[ext],
      audio_filename: normalizeAudioFilename(recording.filename, recordingId, ext),
    },
  };
}

export async function verifyApplaudV0510WebhookRequest(req, {
  keyIdEnv,
  mediaBaseUrl,
  secretResolver,
} = {}) {
  const parts = parseApplaudV0510SignatureHeader(req?.headers?.['x-applaud-signature']);
  if (!parts) {
    return { ok: false, status: 401, code: 'SIGNATURE_MALFORMED' };
  }
  let secret;
  try {
    secret = secretResolver(keyIdEnv);
  } catch {
    return { ok: false, status: 401, code: 'SIGNATURE_INVALID' };
  }
  const sig = verifyApplaudV0510Hmac(req.rawBody, parts.sig, secret);
  if (!sig.ok) return sig;

  const normalized = normalizeApplaudV0510Payload(req.body, { mediaBaseUrl });
  if (!normalized.ok) return normalized;

  return { ok: true, replayed: false, parsed: normalized.parsed };
}

function rewriteApplaudAudioUrl(rawAudioUrl, mediaBaseUrl) {
  const base = parseMediaBaseUrl(mediaBaseUrl);
  if (!base.ok) return base;
  let incoming;
  try {
    incoming = new URL(rawAudioUrl);
  } catch {
    return invalidPayload('http_urls.audio malformed');
  }
  if (incoming.username || incoming.password || !incoming.pathname.startsWith('/media/')) {
    return invalidPayload('http_urls.audio must be an Applaud media URL');
  }
  const basePath = base.url.pathname === '/' ? '' : base.url.pathname.replace(/\/+$/, '');
  const rewritten = new URL(base.url.origin);
  rewritten.pathname = `${basePath}${incoming.pathname}`;
  rewritten.search = incoming.search;
  return { ok: true, url: rewritten.toString() };
}

function parseMediaBaseUrl(mediaBaseUrl) {
  if (typeof mediaBaseUrl !== 'string' || mediaBaseUrl.trim() === '') {
    return { ok: false, status: 500, code: 'AUDIO_URL_ALLOWLIST_UNCONFIGURED' };
  }
  try {
    const url = new URL(mediaBaseUrl.trim());
    if (url.protocol !== 'https:' || url.username || url.password) {
      return { ok: false, status: 500, code: 'AUDIO_URL_ALLOWLIST_UNCONFIGURED' };
    }
    return { ok: true, url };
  } catch {
    return { ok: false, status: 500, code: 'AUDIO_URL_ALLOWLIST_UNCONFIGURED' };
  }
}

function pickAudioExtension(...candidates) {
  for (const value of candidates) {
    const ext = extensionFromValue(value);
    if (ext && AUDIO_MIMETYPE_BY_EXT[ext]) return ext;
  }
  return null;
}

function extensionFromValue(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  let clean = value.trim();
  try {
    clean = new URL(clean).pathname;
  } catch {
    // Non-URL values are expected for files.audio and recording.filename.
  }
  const last = clean.split(/[\\/]/).pop() || '';
  const dot = last.lastIndexOf('.');
  if (dot < 0 || dot === last.length - 1) return null;
  return last.slice(dot + 1).toLowerCase();
}

function normalizeAudioFilename(filename, recordingId, ext) {
  const raw = typeof filename === 'string' && filename.trim()
    ? filename.trim()
    : `applaud_${recordingId}`;
  const safe = raw.replace(/\0/g, '').replace(/\\/g, '/').split('/').pop() || `applaud_${recordingId}`;
  return extensionFromValue(safe) ? safe : `${safe}.${ext}`;
}

function normalizeOptionalString(value, maxLength) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length <= maxLength ? trimmed : trimmed.slice(0, maxLength);
}

function buildApplaudEventId(eventType, recordingId) {
  const raw = `applaud:${eventType}:${recordingId}`;
  if (raw.length <= MAX_EVENT_ID_LENGTH) return raw;
  const digest = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
  return `applaud:${eventType}:${digest}`;
}

function invalidPayload(message) {
  return { ok: false, status: 400, code: 'INVALID_PAYLOAD', message };
}
