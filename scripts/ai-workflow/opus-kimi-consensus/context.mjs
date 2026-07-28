/** Bounded, provenance-stamped, privacy-scrubbed Swan context assembly. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, normalize, relative, sep } from 'node:path';
import { DEFAULT_MAX_CONTEXT_CHARS, SWAN_SOURCES } from './constants.mjs';

const DENY_SEGMENT = /(^|[\\/])(\.env(?:\.|$)|secrets?|exports?|dumps?|backups?|private|credentials?)([\\/]|$)/i;
const DENY_EXT = /\.(csv|sql|sqlite3?|pem|key|p12|pfx)$/i;

export function sanitizeOutboundText(input) {
  return String(input ?? '')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '<REDACTED_EMAIL>')
    .replace(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g, '<REDACTED_PHONE>')
    .replace(/\bsk-or-[A-Za-z0-9_-]{8,}\b/g, '<REDACTED_KEY>')
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, '<REDACTED_KEY>')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '<REDACTED_JWT>')
    .replace(/(authorization\s*:\s*bearer\s+)[A-Za-z0-9._-]+/gi, '$1<REDACTED_TOKEN>')
    .replace(/((?:api[_-]?key|secret|password|token)\s*[=:]\s*)[^\s'"`]+/gi, '$1<REDACTED_VALUE>');
}

export function isAllowedContextPath(relPath) {
  if (!relPath || isAbsolute(relPath)) return false;
  const normalized = normalize(relPath);
  if (normalized === '..' || normalized.startsWith(`..${sep}`)) return false;
  if (DENY_SEGMENT.test(normalized) || DENY_EXT.test(normalized)) return false;
  return true;
}

function hash(text) {
  return createHash('sha256').update(text).digest('hex');
}

function unique(items) {
  return [...new Set(items)];
}

export function buildSwanContext({
  root = process.cwd(), mode = 'auto', files = [], maxChars = DEFAULT_MAX_CONTEXT_CHARS,
} = {}) {
  const wantsDesign = ['auto', 'analyze', 'review', 'design', 'ux', 'ui', 'build'].includes(String(mode).toLowerCase());
  const requested = files.filter(isAllowedContextPath);
  const missingFiles = requested.filter((file) => !existsSync(join(root, file)));
  const candidates = unique([
    ...(wantsDesign ? SWAN_SOURCES.design : []),
    ...SWAN_SOURCES.base,
    ...requested,
  ]);
  const loaded = [];

  for (const rel of candidates) {
    const full = join(root, rel);
    const rooted = relative(root, full);
    if (!isAllowedContextPath(rooted) || !existsSync(full)) continue;
    const raw = readFileSync(full, 'utf8');
    const scrubbed = sanitizeOutboundText(raw);
    loaded.push({ path: rel.replaceAll('\\', '/'), sha256: hash(raw), text: scrubbed });
  }

  const perSourceBudget = Math.max(256, Math.floor(maxChars / Math.max(1, loaded.length)) - 96);
  let text = '';
  let truncated = false;
  for (const source of loaded) {
    const header = `\n\n===== SWAN SOURCE: ${source.path} | SHA256 ${source.sha256} =====\n`;
    const remaining = Math.max(0, maxChars - text.length - header.length);
    if (!remaining) { truncated = true; break; }
    const bodyBudget = Math.min(perSourceBudget, remaining);
    text += header + source.text.slice(0, bodyBudget);
    if (source.text.length > bodyBudget) truncated = true;
  }

  return {
    text: text.slice(0, maxChars),
    sources: loaded.map(({ path, sha256 }) => ({ path, sha256 })),
    rejectedFiles: files.filter((file) => !isAllowedContextPath(file)),
    missingFiles,
    truncated,
  };
}

