/**
 * auditWriter.mjs — the SINGLE append-only writer for every trainer-economics domain log.
 * ============================================================================
 * Kimi K3 blueprint design principle "Append-only truth": every money-relevant mutation
 * appends to a domain log through THIS writer. Nothing updates history; history accrues.
 * If a builder is about to write a domain-log row anywhere else, the answer is no — route it here.
 *
 * The writer is a thin, defensive wrapper over `Model.create`:
 *   - It ONLY creates. It never exposes update/delete — the audited models also enforce
 *     append-only at their own hook layer (defence in depth: service AND model both refuse).
 *   - It resolves the target model from a small ALLOWLIST by logical table name, so a caller
 *     cannot append into an arbitrary, non-audit table by passing a stray model in.
 *   - It stamps actor provenance (userId + role) onto the row from a single `actor` argument,
 *     so callers can't forget the actor fields or spell them inconsistently.
 *
 * PRIVACY (rule 8): audit rows carry IDs, roles, amounts, and small structured context — never
 * client names or free-text PII. The writer does not sanitize for you; callers must pass
 * de-identified `row`/`context`. (S1's only caller is the shadow price resolver, which passes
 * amounts + IDs + booleans.)
 *
 * S1 (2026-07-23): the only registered audit target is `price_change_logs` (PriceChangeLog).
 * Later slices register their domain logs (CompGrantAudit, AbuseReviewAction, UsageTierAudit, …)
 * by adding one line to AUDIT_TABLES — the append path never changes.
 *
 * @module services/audit/auditWriter
 */
import { getModel } from '../../models/index.mjs';

/**
 * Allowlist of append-only audit tables the writer may target, keyed by a stable logical name.
 * Value = the Sequelize model NAME (resolved lazily via getModel so model init races are avoided).
 * Adding a domain log here is the ONLY way to make it appendable through the writer.
 */
export const AUDIT_TABLES = Object.freeze({
  price_change_log: 'PriceChangeLog',
});

/**
 * Append one row to an audited domain log.
 *
 * @param {object} args
 * @param {string} args.table    Logical table key (must be a key of AUDIT_TABLES).
 * @param {object} args.row      The row fields to persist (de-identified; no PII).
 * @param {object} [args.actor]  { userId, role } — stamped onto the row as changedByUserId/changedByRole
 *                               ONLY when those fields are not already present in `row`. Omit for a
 *                               system-run observation (leaves actor columns null).
 * @param {object} [args.context] Structured decision context merged into row.context (no PII).
 * @returns {Promise<object>} the created Sequelize instance.
 * @throws {Error} if `table` is not an allowlisted audit table, or `row` is missing.
 */
export const append = async ({ table, row, actor, context } = {}) => {
  const modelName = AUDIT_TABLES[table];
  if (!modelName) {
    throw new Error(
      `auditWriter.append: '${table}' is not an allowlisted audit table. ` +
        `Allowed: ${Object.keys(AUDIT_TABLES).join(', ')}.`,
    );
  }
  if (!row || typeof row !== 'object') {
    throw new Error('auditWriter.append: `row` object is required.');
  }

  const Model = getModel(modelName);

  // Stamp actor provenance without clobbering explicit values the caller already set on `row`.
  const persisted = { ...row };
  if (actor && typeof actor === 'object') {
    if (persisted.changedByUserId === undefined && actor.userId !== undefined) {
      persisted.changedByUserId = actor.userId;
    }
    if (persisted.changedByRole === undefined && actor.role !== undefined) {
      persisted.changedByRole = actor.role;
    }
  }
  // Merge structured context (caller `row.context` wins on key conflict — it's the explicit value).
  if (context && typeof context === 'object') {
    persisted.context = { ...context, ...(persisted.context || {}) };
  }

  return Model.create(persisted);
};

/**
 * Explicit poison-pill guards. The writer offers NO update/delete surface — these exist so that
 * if some future caller reaches for `auditWriter.update(...)` it fails loudly with the reason,
 * instead of silently finding no method and being "fixed" by writing a raw model update elsewhere.
 */
export const update = () => {
  throw new Error('auditWriter is append-only: audit rows cannot be updated. Append a new row instead.');
};
export const remove = () => {
  throw new Error('auditWriter is append-only: audit rows cannot be deleted.');
};

export default { append, update, remove, AUDIT_TABLES };
