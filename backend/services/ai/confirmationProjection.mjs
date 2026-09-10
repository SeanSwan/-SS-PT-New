/**
 * confirmationProjection.mjs — the policy the SERVER minted, in ONE shape.
 * ========================================================================
 * SCU G02 / S2 (AF11): both mints stamp a normalized, HMAC-bound projection so
 * the confirmation sheet renders ONE stored policy — tier, destructive, blast
 * radius, physical channel, target, entity snapshot, reversibility — instead
 * of re-deriving each of those from the request-time envelope the caller
 * happened to pass.
 *
 * The projection is part of the signature (see operationSigning.mjs): a
 * projection an attacker could edit without the key is not a policy. Display
 * fields live inside it so the render digest and the signature cover the same
 * facts the operator reads.
 *
 * HONEST SCOPE: `entityRevision` is a stable identity (commandType + target),
 * not a database row revision — there is no revision column on the target
 * entities today. It is the slot a real row-version re-check will fill in a
 * later card; it must never be described as a DB revision number.
 */

/** Resolve the registry-owned reversibility for a command type. The top-level
 *  declaration (stamped per-command as of G02 T10) outranks the policy
 *  adapter, whose `policy.reversibility` is still the conservative version-1
 *  blanket. Fail-open to 'none' (no undo story — the conservative badge). */
async function resolveReversibility(commandType) {
  try {
    const { initializeRegistry, getCommand } = await import('./commandRegistry/index.mjs');
    initializeRegistry();
    const command = commandType ? getCommand(commandType) : undefined;
    const declared = command?.reversibility ?? command?.policy?.reversibility;
    if (declared === 'inverse' || declared === 'compensation') return declared;
    return 'none';
  } catch {
    return 'none';
  }
}

/**
 * Build the policyVersion-2 projection both mints sign into the record.
 *
 * @param {Object} spec
 * @param {string} spec.id operation id
 * @param {string} spec.expiresAt ISO expiry (the signed TTL)
 * @param {string} [spec.commandType] registry type (may be null on legacy mints)
 * @param {boolean} spec.isDestructive the lane's own flag, not a heuristic
 * @param {boolean} spec.requiresPhysicalConfirm the signed M3 verdict
 * @param {number} spec.affectedCount blast radius as minted
 * @param {number|null} spec.targetUserId the client this act targets
 * @param {number} spec.createdBy the minting user
 * @param {string} spec.description the signed human-readable line
 * @param {string} [spec.tier] the tier verdict in hand at mint; 'read_back'
 *   is the conservative default for callers that resolve no tier
 */
export async function buildConfirmationProjection({
  id, expiresAt, commandType = null, isDestructive, requiresPhysicalConfirm,
  affectedCount, targetUserId, createdBy, description, tier = 'read_back',
}) {
  const reversibility = await resolveReversibility(commandType);
  const count = Number.isFinite(affectedCount) && affectedCount >= 0 ? Math.floor(affectedCount) : 0;
  const target = Number.isFinite(targetUserId) && targetUserId > 0 ? targetUserId : null;
  return {
    policyVersion: 2,
    tier: String(tier || 'read_back'),
    isDestructive: Boolean(isDestructive),
    requiresPhysicalConfirm: Boolean(requiresPhysicalConfirm),
    affectedCount: count,
    targetUserId: target,
    /** Stable identity snapshot at mint; a row revision lands when the target
     *  entities carry one (see header). */
    entityRevision: `${commandType ?? 'command'}:${target ?? 'any'}`,
    reversibility,
    expiresAt,
    createdBy,
    displayFields: {
      description: description ?? null,
      commandType: commandType ?? null,
      affectedCount: count,
      targetUser: target,
    },
  };
}

export default { buildConfirmationProjection };
