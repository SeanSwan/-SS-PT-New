/**
 * zodParamFixture.mjs
 * ===================
 * Synthesize a minimal schema-valid params object for a Zod schema, so a test
 * can drive a pipeline PAST its validation step and exercise a later gate.
 *
 * WHY THIS EXISTS
 * ---------------
 * The command pipeline validates params (step 4) before it checks role (step 5).
 * A below-role test that sends `{}` is therefore rejected by the schema, never by
 * the role gate — the assertion passes while proving nothing about authorization.
 * Measured on 2026-08-26: 67 of 176 below-role pairs stopped at `validate`, so a
 * naive "expect denial" suite would have been 38% vacuous. This helper closes that
 * hole by making the params valid, which forces the pipeline to reach the gate
 * actually under test.
 *
 * HOW IT WORKS
 * ------------
 * Issue-driven repair, not schema introspection: start from `{}`, `safeParse`, and
 * patch each reported issue by its `path`, then re-parse. Repeats until the parse
 * succeeds or the iteration budget runs out. Driving from Zod's own issues means
 * this works for effects/refinements/unions that a shape-walker cannot see.
 *
 * LIMITS (stated, because silence reads as coverage)
 * - A schema whose refinement depends on cross-field business truth may never
 *   converge. `buildValidParams` returns `{ ok: false }` for those; the caller is
 *   expected to pin them rather than silently skip.
 * - Values are shape-valid placeholders, never semantically meaningful. Do not use
 *   this to assert behaviour that depends on the VALUE of a param.
 */

const MAX_REPAIR_ROUNDS = 24;

/**
 * Candidates tried, in order, for a string whose constraint the issue does not
 * describe — a `.regex(...)` reports `invalid_string` without its pattern. Rotating
 * through shapes the registry actually uses (calendar date, wall-clock time, ISO
 * instant, E.164) converges these without hard-coding field names.
 */
const OPAQUE_STRING_CANDIDATES = [
  '2026-01-01',
  '09:00',
  '2026-01-01T00:00:00.000Z',
  '09:00:00',
  '+15555550100',
];

/** Set a value at a Zod issue path, creating intermediate containers. */
function setAtPath(root, path, value) {
  if (!path.length) return value;
  let node = root;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    const nextKey = path[i + 1];
    if (node[key] === undefined || node[key] === null || typeof node[key] !== 'object') {
      node[key] = typeof nextKey === 'number' ? [] : {};
    }
    node = node[key];
  }
  node[path[path.length - 1]] = value;
  return root;
}

function readAtPath(root, path) {
  let node = root;
  for (const key of path) {
    if (node === undefined || node === null || typeof node !== 'object') return undefined;
    node = node[key];
  }
  return node;
}

/** Placeholder value for a Zod `expected` type name. */
function valueForExpected(expected) {
  switch (expected) {
    case 'string': return 'x';
    case 'number': return 1;
    case 'bigint': return BigInt(1);
    case 'boolean': return true;
    case 'date': return new Date('2026-01-01T00:00:00.000Z');
    case 'array': return [];
    case 'object': return {};
    case 'integer': return 1;
    default: return 'x';
  }
}

/** Patch one issue in place. Returns true when a change was made. */
function repairIssue(params, issue, attempts) {
  const path = issue.path || [];
  switch (issue.code) {
    case 'invalid_type':
      setAtPath(params, path, valueForExpected(issue.expected));
      return true;
    case 'invalid_enum_value':
    case 'invalid_literal': {
      const options = issue.options || (issue.expected !== undefined ? [issue.expected] : []);
      if (!options.length) return false;
      setAtPath(params, path, options[0]);
      return true;
    }
    case 'invalid_union':
      // Take the first branch's issues; they describe one workable shape.
      for (const branch of issue.unionErrors || []) {
        for (const inner of branch.issues || []) {
          if (repairIssue(params, inner, attempts)) return true;
        }
      }
      return false;
    case 'too_small': {
      const current = readAtPath(params, path);
      const min = Number(issue.minimum ?? 1);
      if (issue.type === 'string') {
        setAtPath(params, path, 'x'.repeat(Math.max(min, 1)));
        return true;
      }
      if (issue.type === 'number') {
        setAtPath(params, path, issue.inclusive ? min : min + 1);
        return true;
      }
      if (issue.type === 'array') {
        const filled = Array.from({ length: Math.max(min, 1) }, () => ({}));
        setAtPath(params, path, Array.isArray(current) && current.length ? current : filled);
        return true;
      }
      return false;
    }
    case 'too_big': {
      const max = Number(issue.maximum ?? 1);
      if (issue.type === 'string') {
        setAtPath(params, path, 'x'.repeat(Math.max(Math.min(max, 8), 1)));
        return true;
      }
      if (issue.type === 'number') {
        setAtPath(params, path, issue.inclusive ? max : max - 1);
        return true;
      }
      if (issue.type === 'array') {
        setAtPath(params, path, []);
        return true;
      }
      return false;
    }
    case 'invalid_string': {
      const validation = issue.validation;
      if (validation === 'email') { setAtPath(params, path, 'probe@example.test'); return true; }
      if (validation === 'uuid') { setAtPath(params, path, '00000000-0000-4000-8000-000000000000'); return true; }
      if (validation === 'url') { setAtPath(params, path, 'https://example.test'); return true; }
      if (validation === 'datetime') { setAtPath(params, path, '2026-01-01T00:00:00.000Z'); return true; }
      if (validation && typeof validation === 'object' && validation.startsWith) {
        setAtPath(params, path, `${validation.startsWith}x`);
        return true;
      }
      // Constraint not described by the issue (e.g. `.regex(...)`): rotate candidates.
      const key = 'str:' + path.join('.');
      const next = attempts.get(key) ?? 0;
      if (next >= OPAQUE_STRING_CANDIDATES.length) return false;
      attempts.set(key, next + 1);
      setAtPath(params, path, OPAQUE_STRING_CANDIDATES[next]);
      return true;
    }
    case 'unrecognized_keys':
      for (const key of issue.keys || []) delete readAtPath(params, path)?.[key];
      return true;
    default:
      return false;
  }
}

/**
 * Build a minimal params object that satisfies `schema`.
 *
 * @param {import('zod').ZodTypeAny|null|undefined} schema
 * @returns {{ ok: boolean, params: Record<string, unknown>, rounds: number, issues: string[] }}
 *   `ok:false` means the schema did not converge — pin the command, do not skip it.
 */
export function buildValidParams(schema) {
  const params = {};
  const attempts = new Map();
  if (!schema || typeof schema.safeParse !== 'function') {
    return { ok: true, params, rounds: 0, issues: [] };
  }
  for (let round = 0; round < MAX_REPAIR_ROUNDS; round += 1) {
    const result = schema.safeParse(params);
    if (result.success) return { ok: true, params, rounds: round, issues: [] };
    let changed = false;
    for (const issue of result.error.issues) {
      if (repairIssue(params, issue, attempts)) changed = true;
    }
    if (!changed) {
      return {
        ok: false,
        params,
        rounds: round,
        issues: result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.code}`),
      };
    }
  }
  const final = schema.safeParse(params);
  return {
    ok: final.success,
    params,
    rounds: MAX_REPAIR_ROUNDS,
    issues: final.success ? [] : final.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.code}`),
  };
}
