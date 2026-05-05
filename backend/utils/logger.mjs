// backend/utils/logger.mjs
import winston from 'winston';

/**
 * Secret redaction format (Phase 5 Slice 5.5+ + Rule 59).
 *
 * Winston format that walks the log entry's message + metadata and replaces
 * any occurrence of known-sensitive env-var values with `<REDACTED>`. Runs
 * for every log call, so accidental `logger.info(process.env)` or
 * `logger.error(err)` where err contains a stack with secret values gets
 * scrubbed before reaching transports.
 *
 * Env values are snapshotted at module load. If env is rotated at runtime
 * via `process.env.X = ...`, the redaction list reloads on next log call
 * (see `getLiveSecretValues`).
 *
 * Pattern-based redaction (not env-based):
 *   - JWT shape: `eyJ...` (3 base64url segments separated by dots)
 *   - Generic API keys: `sk-...`, `sk_live_...`, `sk_test_...`, `whsec_...`,
 *     `rk_live_...`, `xoxb-...`, `AIza...`
 *
 * Performance: per-log walk + string replace. Negligible at our log volume.
 */

const SECRET_ENV_VARS = [
  'PLAUD_APPLAUD_WEBHOOK_SECRET_V1',
  'PLAUD_APPLAUD_WEBHOOK_SECRET_V2',
  'PLAUD_TRANSCRIPT_ENCRYPTION_KEY_V1',
  'PLAUD_TRANSCRIPT_ENCRYPTION_KEY_V2',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'SESSION_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SENDGRID_API_KEY',
  'TWILIO_AUTH_TOKEN',
  'GEMINI_API_KEY',
  'OPENROUTER_API_KEY',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
];

const KEY_SHAPE_PATTERNS = [
  /\bsk_live_[A-Za-z0-9]{16,}/g,
  /\bsk_test_[A-Za-z0-9]{16,}/g,
  /\bsk-[A-Za-z0-9_-]{20,}/g,
  /\brk_live_[A-Za-z0-9]{16,}/g,
  /\bwhsec_[A-Za-z0-9]{16,}/g,
  /\bxoxb-[A-Za-z0-9-]{20,}/g,
  /\bAIza[A-Za-z0-9_-]{20,}/g,
  /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, // JWT
];

function getLiveSecretValues() {
  const values = [];
  for (const key of SECRET_ENV_VARS) {
    const v = process.env[key];
    if (v && typeof v === 'string' && v.length >= 16) {
      values.push(v);
    }
  }
  return values;
}

function redactString(s) {
  if (typeof s !== 'string' || !s) return s;
  let out = s;
  // Env-value redaction (exact match)
  const secrets = getLiveSecretValues();
  for (const v of secrets) {
    if (out.includes(v)) {
      // Use indexOf+slice rather than regex to defend against ReDoS from
      // hostile secret values. Replace ALL occurrences.
      let idx = out.indexOf(v);
      while (idx !== -1) {
        out = out.slice(0, idx) + '<REDACTED>' + out.slice(idx + v.length);
        idx = out.indexOf(v, idx + 10);
      }
    }
  }
  // Pattern-based redaction (catches secrets not in our env list — e.g.
  // values pasted into logger.error from third-party libraries)
  for (const pat of KEY_SHAPE_PATTERNS) {
    out = out.replace(pat, '<REDACTED-KEY>');
  }
  return out;
}

function redactValue(v, depth = 0) {
  if (depth > 4) return v; // recursion cap
  if (typeof v === 'string') return redactString(v);
  if (Array.isArray(v)) return v.map((x) => redactValue(x, depth + 1));
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v)) {
      out[k] = redactValue(v[k], depth + 1);
    }
    return out;
  }
  return v;
}

const redactionFormat = winston.format((info) => {
  // Walk every value in the log info object. message + meta + level all pass through.
  for (const k of Object.keys(info)) {
    info[k] = redactValue(info[k]);
  }
  return info;
})();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    redactionFormat,                 // run redaction FIRST so all subsequent transforms see redacted values
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        redactionFormat,             // also for the colorized console transport
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Exported for tests + ad-hoc redaction in non-logger code paths.
export { redactString, redactValue };

export default logger;
