/**
 * roleGates.mjs — role semantics of Express middleware
 * ====================================================
 * Blueprint
 * ---------
 * PURPOSE   Translate a middleware argument as written in a route file into the set
 *           of roles that can actually pass it. Split out of routeTable.mjs to keep
 *           every file under the 300-line cap (CLAUDE.md Rule 4).
 *
 * FAIL-LOUD BY DESIGN
 *           An unrecognised middleware name is reported as `unknown`, never assumed
 *           harmless. Assuming would let a newly-added gate silently widen the
 *           reported access of every route it guards.
 */
import { isInlineHandler } from './sourceScan.mjs';

/**
 * Role semantics of each known gate, read from backend/middleware/authMiddleware.mjs.
 *
 * NOTE the asymmetry, which is real and load-bearing:
 *   - authorize([...])    -> roles UNION {admin}  (admin is a universal override, line 472)
 *   - requireAnyRole(...) -> roles exactly        (NO admin override, line 559)
 */
export const ROLE_GATES = {
  adminOnly: ['admin'],
  admin: ['admin'],
  isAdmin: ['admin'],
  authorizeAdmin: ['admin'],
  trainerOnly: ['trainer'],
  clientOnly: ['client', 'user', 'admin'],
  trainerOrAdminOnly: ['trainer', 'admin'],
  adminOrTrainerOnly: ['trainer', 'admin'],
  // Defined separately in backend/middleware/adminMiddleware.mjs:22-38
  // (`req.user.role === 'admin'` or 403). Same ceiling as adminOnly, different module.
  requireAdmin: ['admin'],
};

/**
 * Middleware that authenticate but impose no role ceiling.
 * `authenticateToken` is a re-export of `protect` (backend/middleware/auth.mjs:173).
 */
export const AUTH_ONLY = new Set([
  'protect',
  'authenticate',
  'authenticateToken',
  'requireAuth',
  'optionalAuth',
  'verifyToken',
]);

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'all'];


/**
 * Interpret one middleware argument into a role constraint.
 * Returns { kind: 'roles', roles } | { kind: 'auth' } | { kind: 'none' } | { kind: 'unknown', name }
 */
export function classifyMiddleware(arg, alias = new Map(), depth = 0) {
  let text = arg.trim();

  // Resolve local aliases (named-import `as`, const alias, recognised local arrow gate).
  // Depth-capped so a cyclic alias cannot spin.
  if (depth < 5) {
    if (text.startsWith('__roles:')) {
      return { kind: 'roles', roles: text.slice(8).split('|').filter(Boolean) };
    }
    if (/^[A-Za-z_$][\w$]*$/.test(text) && alias.has(text) && !ROLE_GATES[text] && !AUTH_ONLY.has(text)) {
      return classifyMiddleware(alias.get(text), alias, depth + 1);
    }
  }

  if (isInlineHandler(text)) return { kind: 'none' };

  const authorizeMatch = text.match(/^authorize\s*\(\s*\[([^\]]*)\]\s*\)$/);
  if (authorizeMatch) {
    const roles = [...authorizeMatch[1].matchAll(/['"]([a-zA-Z_]+)['"]/g)].map((m) => m[1]);
    if (!roles.length) return { kind: 'unknown', name: 'authorize(<dynamic>)' };
    return { kind: 'roles', roles: [...new Set([...roles, 'admin'])] };
  }
  if (/^authorize\s*\(/.test(text)) return { kind: 'unknown', name: 'authorize(<dynamic>)' };

  const anyRoleMatch = text.match(/^requireAnyRole\s*\(([^)]*)\)$/);
  if (anyRoleMatch) {
    const roles = [...anyRoleMatch[1].matchAll(/['"]([a-zA-Z_]+)['"]/g)].map((m) => m[1]);
    return roles.length
      ? { kind: 'roles', roles }
      : { kind: 'unknown', name: 'requireAnyRole(<dynamic>)' };
  }

  const bare = text.match(/^([A-Za-z_$][\w$]*)$/);
  if (bare) {
    const name = bare[1];
    if (ROLE_GATES[name]) return { kind: 'roles', roles: ROLE_GATES[name] };
    if (AUTH_ONLY.has(name)) return { kind: 'auth' };
    return { kind: 'unknown', name };
  }

  const call = text.match(/^([A-Za-z_$][\w$]*)\s*\(/);
  if (call) {
    const name = call[1];
    if (ROLE_GATES[name]) return { kind: 'roles', roles: ROLE_GATES[name] };
    return { kind: 'unknown', name: `${name}(...)` };
  }
  return { kind: 'unknown', name: text.slice(0, 40) };
}


/**
 * Reduce a middleware list to its effective role ceiling.
 * Returns { allowedRoles, authRequired, unknown } where allowedRoles === null means
 * "no role gate found" (any authenticated role, or public if authRequired is false).
 */
export function roleCeiling(middleware, alias = new Map()) {
  const roleSets = [];
  const unknown = [];
  let authed = false;
  for (const raw of middleware) {
    const c = classifyMiddleware(raw, alias);
    if (c.kind === 'roles') roleSets.push(c.roles);
    else if (c.kind === 'auth') authed = true;
    else if (c.kind === 'unknown') unknown.push(c.name);
  }
  let allowed = null;
  for (const rs of roleSets) {
    allowed = allowed === null ? new Set(rs) : new Set([...allowed].filter((r) => rs.includes(r)));
  }
  return {
    allowedRoles: allowed === null ? null : [...allowed].sort(),
    authRequired: authed || roleSets.length > 0,
    unknown,
    // TRUE when at least one middleware could not be classified. Without this an
    // unrecognised gate yields `allowedRoles: null, authRequired: false`, which reads
    // IDENTICALLY to "this route is public" — the most dangerous possible default for
    // a table whose purpose is describing access (Ox Alpha, panel round 2).
    // Any consumer of allowedRoles MUST treat ceilingUnknown as "do not trust this row".
    ceilingUnknown: unknown.length > 0,
  };
}

