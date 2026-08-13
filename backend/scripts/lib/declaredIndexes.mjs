/**
 * MODULE: declaredIndexes.mjs — ONE definition of "what indexes does this model declare".
 * CONSUMERS: audit-schema-drift.mjs (reports) and generate-index-remediation.mjs (fixes).
 *
 * WHY (Kimi 2026-08-13, Upgrade 1): the auditor judged indexes missing BY NAME
 * with no resolution attempt while the generator resolved attribute→column —
 * two tools, two definitions of truth. Reports and remediation must derive from
 * the same intermediate representation or every delta between them becomes an
 * investigation. This module is that representation.
 *
 * Resolution rules (all fail-closed per index — a wrong guess here becomes a
 * broken statement against production):
 * - fields may be strings, { name, order, collate, length } objects, or
 *   fn()/literal expressions. Expressions, collate and length are SKIPPED with
 *   a reason: Postgres length-prefixing is a MySQLism and a declared collate
 *   deserves eyes, not a guess.
 * - attribute names map to columns via rawAttributes[..].field; already-column
 *   names pass through. Every resolved column must exist in the live table.
 * - `using` is allowlisted (btree|hash|gin|gist|brin|spgist) because it lands
 *   verbatim in SQL.
 */

const USING_ALLOWED = new Set(['btree', 'hash', 'gin', 'gist', 'brin', 'spgist']);

/**
 * @param {object} model        Sequelize model (rawAttributes + options.indexes)
 * @param {Set<string>} liveColumns  column names present in the LIVE table
 * @returns {{ resolvable: Array<{name, unique, using, columns: string[], columnsSql: string}>,
 *             skipped:    Array<{name, reason}> }}
 */
export function resolveDeclaredIndexes(model, liveColumns) {
  const resolvable = [];
  const skipped = [];
  if (!model?.rawAttributes || !Array.isArray(model.options?.indexes)) {
    return { resolvable, skipped };
  }

  const toColumn = new Map();
  for (const [attr, def] of Object.entries(model.rawAttributes)) {
    const column = def.field || attr;
    toColumn.set(attr, column);
    toColumn.set(column, column);
  }

  for (const idx of model.options.indexes) {
    if (!idx?.name || !Array.isArray(idx.fields) || idx.fields.length === 0) continue;

    if (idx.using && !USING_ALLOWED.has(String(idx.using).toLowerCase())) {
      skipped.push({ name: idx.name, reason: `unknown USING method "${idx.using}"` });
      continue;
    }

    const columns = [];
    const columnsSqlParts = [];
    let reason = null;
    for (const field of idx.fields) {
      if (typeof field !== 'string' && (typeof field !== 'object' || field === null || typeof field.name !== 'string')) {
        reason = 'non-column field (fn/literal expression) — hand-write this index';
        break;
      }
      const fieldName = typeof field === 'string' ? field : field.name;
      if (typeof field === 'object' && (field.collate || field.length)) {
        reason = `field "${fieldName}" declares collate/length — review by hand`;
        break;
      }
      const column = toColumn.get(fieldName);
      if (!column || !liveColumns.has(column)) {
        reason = `field "${fieldName}" -> column "${column ?? '?'}" not in live table`;
        break;
      }
      const order = typeof field === 'object' && /^(ASC|DESC)$/i.test(field.order || '')
        ? ` ${field.order.toUpperCase()}` : '';
      columns.push(column);
      columnsSqlParts.push(`"${column}"${order}`);
    }

    if (reason) skipped.push({ name: idx.name, reason });
    else {
      resolvable.push({
        name: idx.name,
        unique: !!idx.unique,
        using: idx.using ? String(idx.using).toLowerCase() : null,
        columns,
        columnsSql: columnsSqlParts.join(', '),
      });
    }
  }

  return { resolvable, skipped };
}

/**
 * Parse the column list out of a pg_indexes.indexdef string.
 * Returns null (comparison impossible) for expression indexes — a nested paren
 * means we would be guessing, and a guess that "matches" is worse than an
 * honest abstention.
 */
export function columnsFromIndexDef(indexdef) {
  const open = indexdef.indexOf('(');
  const close = indexdef.lastIndexOf(')');
  if (open === -1 || close <= open) return null;
  const inner = indexdef.slice(open + 1, close);
  if (inner.includes('(')) return null; // expression index — do not guess
  return inner.split(',').map((part) => part
    .trim()
    .replace(/\s+(ASC|DESC)$/i, '')
    .replace(/\s+NULLS\s+(FIRST|LAST)$/i, '')
    .replace(/^"|"$/g, ''));
}
