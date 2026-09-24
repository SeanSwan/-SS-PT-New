/**
 * operationSigning.mjs — the approval lane's key discipline and HMAC surface
 * ==========================================================================
 * Extracted from destructiveOperations.mjs (2026-09-02, Rule 4 file cap). The
 * WHY of every rule here lives with the code it governs:
 *
 * S1 (blueprint 0.3): OPERATION_SIGNING_KEY is REQUIRED — the old
 * `|| crypto.randomBytes(32)` fallback meant a per-process secret, so every
 * deploy silently voided in-flight approvals and two instances could never
 * verify each other's signatures. Unset/short now refuses at boot
 * (assertOperationSigningKey, called unwrapped from core/startup.mjs) and at
 * first use — a random key is never invented.
 *
 * 0.4a: the HMAC binds `description` and a hash of the affected-records
 * preview — the fields the human APPROVER actually reads — and
 * `pending_confirmed` (non-destructive) operations are signed too; they
 * previously carried no integrity binding at all.
 */
import crypto from 'crypto';

const MIN_KEY_LENGTH = 32;

// ── The signing key: required, never invented ──────────────────────────────
let cachedSecret = null;

function resolveSigningKey() {
  const key = process.env.OPERATION_SIGNING_KEY;
  if (!key || key.length < MIN_KEY_LENGTH) {
    // The remedy is IN the message: this fires in Render logs on a mis-deploy.
    throw new Error(
      'OPERATION_SIGNING_KEY is required and must be at least 32 characters. '
      + 'The destructive-approval lane refuses to run on an invented per-process key '
      + '(a random key silently voids approvals on every deploy and between instances). '
      + 'Set OPERATION_SIGNING_KEY in the environment (Render → Environment) and redeploy.'
    );
  }
  return key;
}

function getOperationSecret() {
  if (cachedSecret === null) cachedSecret = resolveSigningKey();
  return cachedSecret;
}

/**
 * Boot gate (blueprint S1): a deploy without the key must fail AT BOOT — loudly,
 * before the server listens — not at the first destructive mint days later.
 * Called unwrapped from core/startup.mjs; throws with the remedy in the message.
 */
export function assertOperationSigningKey() {
  resolveSigningKey();
}

/** Stable hash of the preview the human reads; signed so tampering with it fails verify. */
function hashAffectedPreview(affectedRecords, affectedCount) {
  return crypto.createHash('sha256')
    .update(JSON.stringify({ affectedRecords, affectedCount }))
    .digest('hex');
}

export function signOperation(op) {
  const payload = JSON.stringify({
    id: op.id,
    type: op.type,
    endpoint: op.endpoint,
    commandType: op.commandType,  // exec-substrate-v9: tampering with commandType fails verification
    params: op.params,
    createdBy: op.createdBy,
    // 0.4a: the fields the approver READS are bound to the signature too.
    description: op.description,
    /**
     * F-03 (GLM 5.3 round 1): the M3 channel split — a voice confirmation may
     * not authorize an identity-crossing act — was decided at mint and then
     * enforced by NOTHING but a comment. It is now stamped on the operation and
     * checked at /confirm, which means it is a security decision travelling in
     * a store an attacker who reached the store could edit. So it is signed.
     * Unset on older operations, where JSON.stringify drops the key and the
     * payload is byte-identical to before — no signature break on in-flight ops.
     */
    requiresPhysicalConfirm: op.requiresPhysicalConfirm,
    clientId: op.clientId,
    /**
     * F2-03 (GLM 5.3-flash round 2): `expiresAt` was in NEITHER payload, and it
     * is checked BEFORE the signature. Every other field on the record is bound,
     * so this was the single value an attacker who reached the store could edit
     * undetected — extending a captured approval past the 120-second window that
     * the design leans on as a control, or shortening it to deny one. A TTL that
     * anyone can rewrite is not a TTL.
     */
    expiresAt: op.expiresAt,
    affectedHash: hashAffectedPreview(op.affectedRecords ?? [], op.affectedCount ?? 0),
    // SCU G02 / AF11: the stored policy projection is a security decision too —
    // tier, blast radius, channel, target, reversibility — so it is signed.
    // Absent on pre-G02 records, where JSON.stringify drops the key and the
    // payload is byte-identical to before: no signature break on in-flight ops.
    projection: op.projection,
  });
  return crypto.createHmac('sha256', getOperationSecret()).update(payload).digest('hex');
}

export function verifySignature(op) {
  const expected = signOperation(op);
  return crypto.timingSafeEqual(Buffer.from(op.signature, 'hex'), Buffer.from(expected, 'hex'));
}

/** Sign a non-destructive pending confirmation (previously unsigned entirely). */
export function signPendingConfirmation(op) {
  const payload = JSON.stringify({
    id: op.id,
    kind: op.kind,
    commandType: op.commandType,
    params: op.params,
    frontendEvent: op.frontendEvent,
    clientId: op.clientId,
    createdBy: op.createdBy,
    description: op.description,
    /** F-03: the M3 verdict is a security decision, so it is signed too. */
    requiresPhysicalConfirm: op.requiresPhysicalConfirm,
    /** F2-03: the validity window is a control; an unsigned one is a suggestion. */
    expiresAt: op.expiresAt,
    // SCU G02 / AF11: the stored policy projection is signed on this lane too;
    // absent on pre-G02 records (byte-identical payload), no in-flight break.
    projection: op.projection,
  });
  return crypto.createHmac('sha256', getOperationSecret()).update(payload).digest('hex');
}

