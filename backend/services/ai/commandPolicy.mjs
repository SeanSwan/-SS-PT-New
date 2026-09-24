/**
 * SCU S2 — server-owned command policy normalization.
 *
 * Registry entries predate the Universe V3 policy contract and currently
 * declare only method, client reference, confirmation, and destructive flags.
 * This adapter exposes a conservative, versioned policy without inventing an
 * inverse or claiming entity ownership has been resolved. Write-time owner
 * resolution remains a separate dispatcher gate.
 */

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const resolveScope = (command) => {
  if (command.requiresClientRef) return { scopeKind: 'client', ownerResolverKey: 'client_assignment' };
  const roles = Array.isArray(command.roleRequired) ? command.roleRequired : [];
  if (roles.includes('admin') || roles.includes('trainer')) {
    return { scopeKind: 'global', ownerResolverKey: 'privileged_role' };
  }
  return { scopeKind: 'self', ownerResolverKey: 'actor' };
};

const resolveEffect = (command) => {
  if (command.method === 'FRONTEND_DISPATCH') return 'draft';
  if (command.destructive) return 'destructive';
  if (command.method === 'GET') return 'read';
  if (MUTATING_METHODS.has(command.method)) return 'write';
  return 'read';
};

/**
 * Return the immutable policy fields the server may expose to callers.
 *
 * SCU G02 / T10: `reversibility` and `inverseCommand` now honour the entry's
 * own top-level declarations when it has them (registerCommand stamps
 * 'none' onto every mutating command that declares nothing, so the value is
 * always explicit). The adapter no longer INVENTS the field for everyone —
 * a declared inverse is a declaration, and everything else stays the
 * conservative 'none' until a tested inverse or compensation command exists.
 */
export function resolveCommandPolicy(command) {
  const scope = resolveScope(command);
  const declared = command.reversibility;
  const reversibility = declared === 'inverse' || declared === 'compensation'
    ? declared
    : 'none';
  return {
    policyVersion: 1,
    capabilityVersion: 1,
    scopeKind: scope.scopeKind,
    ownerResolverKey: scope.ownerResolverKey,
    effect: resolveEffect(command),
    reversibility,
    inverseCommand: (command.inverseCommand && typeof command.inverseCommand === 'string')
      ? command.inverseCommand
      : null,
    requiredDomainStates: [],
  };
}

export default { resolveCommandPolicy };
