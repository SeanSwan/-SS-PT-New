/**
 * Render agent identity — enrolment, authentication, liveness.
 * ============================================================================
 *
 * WHY THIS EXISTS. The queue, the leasing service, the lease reaper and the presence
 * guard were all built and shipped — and NO agent could authenticate, because no
 * enrolment path existed. `render_agents` was an empty table with no way to add a row.
 * Every job queued forever and presence permanently reported NO_WORKER_ENROLLED. This is
 * the keystone: without it the whole pipeline is machinery with no operator.
 *
 * ── CREDENTIAL HANDLING (the part worth reading twice) ──────────────────────
 * The plaintext token is generated once, returned once, and NEVER persisted. Only its
 * SHA-256 hex lands in `token_hash`. A database dump therefore does not yield a
 * credential that can lease jobs — which matters because a leaked agent token is not a
 * read primitive, it is the ability to claim work, report fake completions, and mint
 * asset keys.
 *
 * SHA-256 rather than bcrypt/argon2 is deliberate and is NOT the usual password
 * tradeoff: this token is 256 bits of `randomBytes`, not a human-chosen secret. There is
 * no dictionary to attack and no rainbow table for a uniformly random 32-byte value, so
 * the slow-KDF property buys nothing — while the fast hash lets us authenticate on every
 * lease poll without a CPU-bound step in the hot path. The security rests entirely on
 * the entropy of the token, which is why it must be generated here and never chosen.
 *
 * Comparison is constant-time. A timing oracle on the hash is a weak attack, but the
 * mitigation is one function call and the alternative is explaining why we skipped it.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';

/** Prefix makes a leaked token greppable in logs and identifiable in a paste. */
const TOKEN_PREFIX = 'swan_agent_';
const TOKEN_BYTES = 32;

export class RenderAgentAuthError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'RenderAgentAuthError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const hashToken = (raw) => createHash('sha256').update(String(raw)).digest('hex');

/**
 * Enrol a worker and return its credential ONCE.
 * @returns {Promise<{agent: object, token: string}>} `token` is unrecoverable after this.
 */
export async function enrolAgent({ id, label, capabilities = [], maxConcurrency = 1, version = null }) {
  const agentId = String(id || '').trim();
  if (!agentId || agentId.length > 60) {
    throw new RenderAgentAuthError(400, 'VALIDATION_ERROR', 'A agent id of 1-60 chars is required.');
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(agentId)) {
    // The id lands in `leased_by` and in log lines; keep it boring.
    throw new RenderAgentAuthError(400, 'VALIDATION_ERROR', 'Agent id may contain only letters, digits, dot, dash, underscore.');
  }
  if (!label || String(label).length > 120) {
    throw new RenderAgentAuthError(400, 'VALIDATION_ERROR', 'A label of 1-120 chars is required.');
  }
  if (!Array.isArray(capabilities) || capabilities.some((c) => typeof c !== 'string')) {
    throw new RenderAgentAuthError(400, 'VALIDATION_ERROR', 'capabilities must be an array of strings.');
  }
  const concurrency = Number(maxConcurrency);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 64) {
    throw new RenderAgentAuthError(400, 'VALIDATION_ERROR', 'maxConcurrency must be an integer 1-64.');
  }

  const token = TOKEN_PREFIX + randomBytes(TOKEN_BYTES).toString('hex');

  // Re-enrolling an existing id ROTATES its token rather than erroring. Recovering a
  // worker whose credential was lost must not require deleting the row that its
  // in-flight leases point at via FK.
  const [row] = await sequelize.query(
    `INSERT INTO render_agents (id, label, token_hash, capabilities, version, max_concurrency, created_at, updated_at)
     VALUES (:id, :label, :hash, CAST(:caps AS jsonb), :version, :concurrency, now(), now())
     ON CONFLICT (id) DO UPDATE SET
       label = EXCLUDED.label,
       token_hash = EXCLUDED.token_hash,
       capabilities = EXCLUDED.capabilities,
       version = EXCLUDED.version,
       max_concurrency = EXCLUDED.max_concurrency,
       revoked_at = NULL,
       updated_at = now()
     RETURNING id, label, capabilities, version, max_concurrency, created_at`,
    {
      replacements: {
        id: agentId,
        label: String(label),
        hash: hashToken(token),
        caps: JSON.stringify(capabilities),
        version: version ? String(version) : null,
        concurrency,
      },
      type: QueryTypes.SELECT,
    },
  );

  return { agent: row, token };
}

/** Revoke without deleting: in-flight leases reference this row by FK. */
export async function revokeAgent(id) {
  const [, meta] = await sequelize.query(
    `UPDATE render_agents SET revoked_at = now(), updated_at = now()
     WHERE id = :id AND revoked_at IS NULL`,
    { replacements: { id: String(id) }, type: QueryTypes.UPDATE },
  );
  return Number(meta ?? 0) > 0;
}

/**
 * Resolve a bearer token to a live agent, and record the check-in.
 *
 * Touching `last_seen_at` HERE rather than in a separate heartbeat call is what makes
 * presence honest: an agent that is polling for work is by definition alive, and an
 * agent that stopped polling stops being counted without needing to announce it.
 */
export async function authenticateAgent(rawToken) {
  const token = typeof rawToken === 'string' ? rawToken.trim() : '';
  if (!token) throw new RenderAgentAuthError(401, 'NO_TOKEN', 'Agent token required.');

  const hash = hashToken(token);
  const rows = await sequelize.query(
    `SELECT id, label, token_hash, capabilities, max_concurrency, revoked_at
     FROM render_agents WHERE token_hash = :hash LIMIT 1`,
    { replacements: { hash }, type: QueryTypes.SELECT },
  );

  const agent = rows?.[0];
  // Constant-time compare even though the lookup was by hash: the row is only trusted
  // once the digest matches byte-for-byte.
  const ok = agent && safeEqualHex(agent.token_hash, hash);
  if (!ok) throw new RenderAgentAuthError(401, 'BAD_TOKEN', 'Unknown agent token.');
  if (agent.revoked_at) throw new RenderAgentAuthError(403, 'AGENT_REVOKED', 'This agent has been revoked.');

  await sequelize.query(
    'UPDATE render_agents SET last_seen_at = now(), updated_at = now() WHERE id = :id',
    { replacements: { id: agent.id }, type: QueryTypes.UPDATE },
  );

  return {
    id: agent.id,
    label: agent.label,
    capabilities: Array.isArray(agent.capabilities) ? agent.capabilities : [],
    maxConcurrency: Number(agent.max_concurrency ?? 1),
  };
}

function safeEqualHex(a, b) {
  const bufA = Buffer.from(String(a ?? ''), 'utf8');
  const bufB = Buffer.from(String(b ?? ''), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export default {
  enrolAgent, revokeAgent, authenticateAgent, hashToken, RenderAgentAuthError, TOKEN_PREFIX,
};
