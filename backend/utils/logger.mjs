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

/**
 * Pattern-based redaction now comes from the shared list in `utils/redactionRules.mjs`.
 *
 * WHY (SWA-71, 2026-07-28): the previous inline list here covered API-key shapes ONLY. Verified by
 * execution, this logger — the one with ~2841 call sites, 12x the reach of `piiSafeLogging` —
 * passed **email, SSN, phone, and database credentials** straight through. The concrete leak:
 * `logger.error(err)` on a Postgres connection failure writes the connection password into the
 * logs, because a credential-URL rule did not exist here.
 *
 * `piiSafeLogging.mjs` had the broader list. Two hand-maintained redaction lists in one backend
 * drifted, and the drift WAS the bug — so both now read from one source. The shared module also
 * documents why order matters (credential URLs before EMAIL) and why a bare 10-digit run is
 * deliberately not treated as a phone number (it would eat migration timestamps and IDs).
 *
 * Env-value redaction below is retained and still runs FIRST — it catches exact secret values
 * from the environment that no shape-based pattern can know about.
 */
import { LOG_REDACTION_RULES, PRIVATE_KEY_RULE, redactLogValue } from './redactionRules.mjs';

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
  // Pattern-based redaction (catches secrets not in our env list — e.g. values pasted into
  // logger.error from third-party libraries — plus PII shapes). Rules are ORDERED: credential
  // URLs are matched before EMAIL, because a connection string contains a `password@hostname`
  // segment that EMAIL would otherwise consume, leaving the scheme and username exposed.
  // PEM blocks span lines, so they run before the per-rule pass.
  out = out.replace(PRIVATE_KEY_RULE, '<REDACTED-PRIVATE_KEY>');
  for (const [kind, pattern] of LOG_REDACTION_RULES) {
    out = out.replace(pattern, `<REDACTED-${kind}>`);
  }
  return out;
}

// Value walking lives in redactionRules.mjs so winston, the PII logger, and the console wrapper
// all traverse identically. A local copy here is how the two loggers drifted into a credential
// leak; a third copy would repeat it.
// Pass logger's OWN redactString so env-VALUE redaction is preserved — the shared default only
// does shape-based patterns.
const redactValue = (v, depth = 0) => redactLogValue(v, depth, redactString);

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
