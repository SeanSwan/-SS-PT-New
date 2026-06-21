const FILE_ID_REGEX = /^[A-Za-z0-9._:-]{1,255}$/;
const RESERVED_FILE_ID_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const JWT_LIKE_REGEX = /\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const SECRET_KEYWORDS = 'token|access_token|accessToken|refresh_token|refreshToken|secret|password';
const SECRET_ASSIGNMENT_REGEX = new RegExp(`\\b(${SECRET_KEYWORDS})=([^\\s&]+)`, 'gi');
const SECRET_FIELD_REGEX = new RegExp(`("?\\b(?:${SECRET_KEYWORDS})\\b"?\\s*[:=]\\s*"?)[^",\\s}]+`, 'gi');
const TEXT_ID_LINE_REGEX = /^\s*(?:id|file[_ ]?id|recording[_ ]?id)\s*[:=]\s*([A-Za-z0-9._:-]{1,255})\s*$/i;
const DEFAULT_MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const ALLOWED_API_HOSTS = new Set(['sswanstudios.com']);
const BACKEND_UPLOAD_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mp4',
  'audio/aac',
  'audio/flac',
  'audio/ogg',
  'audio/webm',
  'application/octet-stream',
]);

function isBlockedIpv4Host(host) {
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const octets = ipv4.slice(1).map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) return true;
  const [a, b] = octets;
  if (a === 0 || a === 10 || a === 127 || a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function mappedIpv4FromIpv6(host) {
  const dotted = host.match(/(?:::|:)ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i) || host.match(/::(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (dotted) return dotted[1];
  const hex = host.match(/(?:::|:)ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (!hex) return null;
  const high = Number.parseInt(hex[1], 16);
  const low = Number.parseInt(hex[2], 16);
  if (!Number.isFinite(high) || !Number.isFinite(low)) return null;
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

function ipv6Group(host, index) {
  const group = String(host || '').split(':')[index] || '0';
  const parsed = Number.parseInt(group, 16);
  return Number.isFinite(parsed) ? parsed : null;
}

function isIpv6SpecialHost(host) {
  const firstGroup = ipv6Group(host, 0);
  const secondGroup = ipv6Group(host, 1);
  if (firstGroup === null) return false;
  if (firstGroup === 0x0064 && secondGroup === 0xff9b) return true;
  if (firstGroup === 0x0100 && secondGroup === 0x0000) return true;
  if (firstGroup >= 0xfe80 && firstGroup <= 0xfeff) return true;
  if (firstGroup >= 0xff00 && firstGroup <= 0xffff) return true;
  if (firstGroup === 0x2002 || firstGroup === 0x3ffe) return true;
  return firstGroup === 0x2001 && (
    secondGroup === 0x0000
    || secondGroup === 0x0002
    || secondGroup === 0x0010
    || secondGroup === 0x0db8
    || secondGroup >= 0x0020 && secondGroup <= 0x002f
  );
}

function isBlockedDownloadHost(hostname) {
  const host = String(hostname || '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (isBlockedIpv4Host(host)) return true;

  const isIpv6Literal = host.includes(':');
  if (isIpv6Literal) {
    const mappedIpv4 = mappedIpv4FromIpv6(host);
    if (mappedIpv4 && isBlockedIpv4Host(mappedIpv4)) return true;
    if (host === '::' || host === '::1' || host.startsWith('fc') || host.startsWith('fd') || isIpv6SpecialHost(host)) return true;
  }
  return false;
}

function normalizeTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function normalizeFileId(value) {
  const id = String(value || '').trim();
  if (!FILE_ID_REGEX.test(id)) return null;
  return RESERVED_FILE_ID_KEYS.has(id.toLowerCase()) ? null : id;
}

export function normalizeApiBaseUrl(value) {
  const raw = String(value || '').trim() || 'https://sswanstudios.com';
  const url = new URL(raw);
  const host = url.hostname.toLowerCase();
  const isLocalhostHost = host === 'localhost';
  const isLocalhostHttp = url.protocol === 'http:' && isLocalhostHost;
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('apiBaseUrl must be an origin URL');
  }
  if (url.protocol !== 'https:' && !isLocalhostHttp) {
    throw new Error('apiBaseUrl must be HTTPS, except localhost development');
  }
  if (!isLocalhostHost && !ALLOWED_API_HOSTS.has(host)) {
    throw new Error('apiBaseUrl host must be sswanstudios.com or localhost');
  }
  if (ALLOWED_API_HOSTS.has(host) && url.port) {
    throw new Error('apiBaseUrl production origin must use the default HTTPS port');
  }
  return url.origin;
}

function normalizeFileRecord(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = normalizeFileId(raw.id || raw.file_id || raw.fileId || raw.recording_id || raw.recordingId);
  if (!id) return null;
  return {
    id,
    name: String(raw.name || raw.filename || raw.title || `${id}.m4a`).slice(0, 255),
    recordedAt: normalizeTimestamp(raw.created_at || raw.createdAt || raw.recorded_at || raw.recordedAt || raw.time),
  };
}

function recordsFromJsonOutput(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return [];

  for (let i = 0; i < trimmed.length; i += 1) {
    if (trimmed[i] !== '[' && trimmed[i] !== '{') continue;
    const candidate = sliceBalancedJsonCandidate(trimmed, i);
    if (!candidate) continue;
    try {
      const records = recordsFromJson(JSON.parse(candidate));
      if (records.length) return records;
    } catch {
      // CLI status lines can contain bracketed text before the real JSON.
    }
  }
  return [];
}

function sliceBalancedJsonCandidate(text, startIndex) {
  const stack = [];
  let inString = false;
  let escaping = false;

  for (let i = startIndex; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaping) escaping = false;
      else if (char === '\\') escaping = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '[' || char === '{') {
      stack.push(char);
      continue;
    }
    if (char !== ']' && char !== '}') continue;
    const open = stack.pop();
    const expected = open === '[' ? ']' : '}';
    if (char !== expected) return null;
    if (stack.length === 0) return text.slice(startIndex, i + 1);
  }
  return null;
}

function recordsFromJson(parsed) {
  if (Array.isArray(parsed)) return parsed.map(normalizeFileRecord).filter(Boolean);
  const candidates = parsed?.files || parsed?.data || parsed?.items || parsed?.records || parsed?.results;
  if (Array.isArray(candidates)) return candidates.map(normalizeFileRecord).filter(Boolean);
  const hasRecordingMetadata = Boolean(parsed?.name || parsed?.filename || parsed?.title
    || parsed?.created_at || parsed?.createdAt || parsed?.recorded_at || parsed?.recordedAt || parsed?.time);
  const single = hasRecordingMetadata ? normalizeFileRecord(parsed) : null;
  return single ? [single] : [];
}

function parseTextOutput(text) {
  const lines = String(text || '').split(/\r?\n/);
  const records = [];
  for (let i = 0; i < lines.length; i += 1) {
    const idMatch = lines[i].match(TEXT_ID_LINE_REGEX);
    if (!idMatch) continue;
    const id = normalizeFileId(idMatch[1]);
    if (!id) continue;
    let end = i + 1;
    while (end < lines.length && end < i + 5 && !TEXT_ID_LINE_REGEX.test(lines[end])) end += 1;
    const window = lines.slice(i, end).join('\n');
    const nameMatch = window.match(/\b(?:name|title|filename)\b\s*[:=]\s*(.+)/i);
    const dateMatch = window.match(/\b(?:created|created_at|recorded|recorded_at|time)\b\s*[:=]\s*([0-9T:.\-+Z ]+)/i);
    records.push({
      id,
      name: String(nameMatch?.[1] || `${id}.m4a`).trim().slice(0, 255),
      recordedAt: normalizeTimestamp(dateMatch?.[1]),
    });
  }
  return records;
}

export function parsePlaudFilesOutput(text) {
  const records = recordsFromJsonOutput(text);
  return records.length ? records : parseTextOutput(text);
}

export function parsePlaudAudioUrl(text) {
  const matches = String(text || '').matchAll(/https:\/\/[^\s"')>]+/gi);
  for (const match of matches) {
    const candidate = match[0].replace(/[.,;]+$/, '');
    try {
      const url = new URL(candidate);
      if (!url.username && !url.password && !isBlockedDownloadHost(url.hostname)) return url.toString();
    } catch {
      // Continue scanning for another URL in mixed CLI output.
    }
  }
  return null;
}

export function normalizePlaudAudioContentType(value) {
  const contentType = String(value || '').split(';')[0].trim().toLowerCase();
  if (!contentType) return 'audio/m4a';
  if (BACKEND_UPLOAD_AUDIO_TYPES.has(contentType)) return contentType;
  throw new Error('PLAUD_AUDIO_UNSUPPORTED_TYPE');
}

export function normalizeMaxAudioBytes(value, fallback = DEFAULT_MAX_AUDIO_BYTES) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : fallback;
}

export function isPlaudAuthFailure(result) {
  const text = `${result?.stdout || ''}\n${result?.stderr || ''}`.toLowerCase();
  return /auth_failed|token invalid|token expired|run plaud login|unauthorized|not authenticated/.test(text);
}

export function redactForLog(value) {
  return String(value || '')
    .replace(/(https?:\/\/[^\s?"']+)\?[^\s"']+/gi, '$1?[redacted]')
    .replace(/(https?:\/\/)[^/\s?#"']+@/gi, '$1[redacted]@')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(SECRET_ASSIGNMENT_REGEX, '$1=[redacted]')
    .replace(SECRET_FIELD_REGEX, '$1[redacted]')
    .replace(JWT_LIKE_REGEX, '[redacted-token]');
}
