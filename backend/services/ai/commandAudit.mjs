/**
 * Command Audit — Append-Only DB Audit Trail Writer
 * ==================================================
 * Persists one AiCommandAuditLog row per Swan Coach command outcome.
 *
 * Privacy posture (locked in the F1 plan, 2026-06-10):
 *   - Raw params NEVER land in the audit table.
 *   - `paramsHash`     = SHA-256 of canonicalized params JSON (forensic matching)
 *   - `paramsRedacted` = params after PHI masking (phiScanner) + long-text
 *                        stripping (transcript-class content stays out)
 *
 * Failure policy: BEST-EFFORT. An audit write failure never blocks or rolls
 * back the user's command — it logs loudly instead. (Plan decision D4;
 * fail-closed auditing for destructive ops is a tracked F2 candidate.)
 *
 * Slice F1 — Command-Lane Security Foundation (2026-06-10)
 */
import crypto from 'crypto';
import logger from '../../utils/logger.mjs';
import { scanForPHI, stripPHI } from './phiScanner.mjs';

const MAX_TEXT_LENGTH = 200;
const MAX_DEPTH = 8;
const MAX_KEYS_PER_OBJECT = 50;

// ── Param redaction ─────────────────────────────────────────────────────────

function redactString(value) {
  if (value.length > MAX_TEXT_LENGTH) {
    return `[REDACTED_LONG_TEXT:${value.length}chars]`;
  }
  const { hasPHI, matches } = scanForPHI(value);
  return hasPHI ? stripPHI(value, matches) : value;
}

/**
 * Deep-redact a params object for safe storage.
 * Strings are PHI-masked; long strings are dropped entirely;
 * depth and key counts are capped against pathological input.
 */
export function redactParams(params, depth = 0) {
  if (params === null || params === undefined) return null;
  if (depth > MAX_DEPTH) return '[REDACTED_MAX_DEPTH]';

  if (typeof params === 'string') return redactString(params);
  if (typeof params === 'number' || typeof params === 'boolean') return params;

  if (Array.isArray(params)) {
    return params.slice(0, MAX_KEYS_PER_OBJECT).map((item) => redactParams(item, depth + 1));
  }

  if (typeof params === 'object') {
    const out = {};
    let count = 0;
    for (const [key, value] of Object.entries(params)) {
      if (count >= MAX_KEYS_PER_OBJECT) {
        out['[REDACTED_OVERFLOW]'] = true;
        break;
      }
      out[key] = redactParams(value, depth + 1);
      count += 1;
    }
    return out;
  }

  return '[REDACTED_UNSUPPORTED_TYPE]';
}

// ── Param hashing ───────────────────────────────────────────────────────────

function canonicalize(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value === undefined ? null : value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(',')}}`;
}

/** SHA-256 hex of canonicalized (key-sorted) params JSON; null when empty. */
export function hashParams(params) {
  if (params === null || params === undefined) return null;
  try {
    return crypto.createHash('sha256').update(canonicalize(params)).digest('hex');
  } catch (err) {
    return null;
  }
}

// ── Audit row writer ────────────────────────────────────────────────────────

/**
 * Persist one audit row. Best-effort: never throws.
 *
 * @param {Object} entry
 * @param {number} entry.userId            REQUIRED — actor user id
 * @param {string} entry.userRole          REQUIRED — actor role
 * @param {string} entry.outcome           REQUIRED — success|failed|denied|not_wired|confirmation_required|cancelled|blocked_killswitch|debate_started
 * @param {string|null}  [entry.commandType]
 * @param {number|null}  [entry.targetClientId]
 * @param {boolean}      [entry.destructive]
 * @param {boolean}      [entry.requiresConfirmation]
 * @param {string}       [entry.confirmationState]   none|pending|confirmed|cancelled
 * @param {string|null}  [entry.operationId]
 * @param {string|null}  [entry.errorCode]
 * @param {Object|null}  [entry.params]              RAW params — hashed + redacted here, never stored raw
 * @param {number|null}  [entry.durationMs]
 * @returns {Promise<boolean>} true when the row was written
 */
export async function recordCommandAudit(entry) {
  try {
    if (!entry || !entry.userId || !entry.userRole || !entry.outcome) {
      logger.warn('[CommandAudit] Skipping audit row — missing required fields', {
        hasUserId: Boolean(entry?.userId),
        hasRole: Boolean(entry?.userRole),
        outcome: entry?.outcome || null,
      });
      return false;
    }

    const { default: AiCommandAuditLog } = await import('../../models/AiCommandAuditLog.mjs');

    await AiCommandAuditLog.create({
      userId: entry.userId,
      userRole: String(entry.userRole).slice(0, 20),
      commandType: entry.commandType ? String(entry.commandType).slice(0, 100) : null,
      targetClientId: entry.targetClientId ?? null,
      destructive: Boolean(entry.destructive),
      requiresConfirmation: Boolean(entry.requiresConfirmation),
      confirmationState: entry.confirmationState || 'none',
      operationId: entry.operationId ? String(entry.operationId).slice(0, 64) : null,
      outcome: String(entry.outcome).slice(0, 30),
      errorCode: entry.errorCode ? String(entry.errorCode).slice(0, 100) : null,
      paramsHash: hashParams(entry.params),
      paramsRedacted: entry.params ? redactParams(entry.params) : null,
      durationMs: Number.isFinite(entry.durationMs) ? entry.durationMs : null,
    });

    return true;
  } catch (err) {
    // Best-effort by design: the user's command must never fail because the
    // audit insert failed. Loud error so ops sees it.
    logger.error('[CommandAudit] AUDIT WRITE FAILED — command was NOT blocked', {
      outcome: entry?.outcome,
      commandType: entry?.commandType,
      userId: entry?.userId,
      error: err?.message,
    });
    return false;
  }
}
