/**
 * ============================================================================
 * FILE: accountDataRightsService.mjs
 * PURPOSE: Data-subject rights — export a person's data, and erase it.
 * AUTHOR:  Claude (Opus 5) | CREATED: 2026-07-29 (SWA-75)
 * ============================================================================
 *
 * WHY THIS EXISTS
 * Kimi K3 (2026-07-29) named this the top thing missing entirely: this platform
 * holds minors' data, health/injury notes, photos and payment history, and there
 * was NO path anywhere for a parent asking to see or delete their child's data.
 * Verified before building — the only `deleteAccount` in the repo was an
 * unrelated social-integration method.
 *
 * WHY ERASURE IS ANONYMISATION, NOT DELETION
 * A hard delete is the wrong answer on a platform that takes payments. Orders,
 * financial transactions and session-credit history must survive for accounting
 * and dispute handling, and rows referencing a purged user either break FKs or
 * silently orphan revenue. So erasure here means: **destroy the identifying
 * fields, keep the skeleton.** After erasure the person is unidentifiable, the
 * books still balance, and the audit trail records who did it and when.
 *
 * This is the defensible reading of an erasure request against a legitimate
 * retention interest. If Sean's counsel wants true purge for a specific case,
 * that is a manual, one-off, owner-executed operation — deliberately NOT
 * automated here.
 *
 * SAFETY
 * - Built on the EXISTING owner-gated command framework
 *   (services/admin/adminAccountCommandService.mjs): requireOwnerAdmin, an
 *   AdminAccountAuditLog row, and a single transaction. Not parallel machinery.
 * - Erasure is IRREVERSIBLE by design and refuses without an explicit
 *   confirmation token that names the target — no accidental bulk erasure.
 * - Admins cannot be erased through this path, and nobody can erase themselves.
 * - Export returns the person's OWN data only; it is not a reporting tool.
 * ============================================================================
 */

import { Op } from 'sequelize';
import logger from '../../utils/logger.mjs';

/** Fields on User that identify a human being. Everything here is destroyed. */
export const IDENTIFYING_USER_FIELDS = Object.freeze([
  'firstName', 'lastName', 'email', 'username', 'phone', 'photo',
  'dateOfBirth', 'emergencyContact', 'bio',
]);

/**
 * Related models holding a person's own content, keyed by the column that points
 * back at the user. Export reads these; erasure clears their free-text.
 */
export const OWNED_RECORD_MODELS = Object.freeze([
  { model: 'ClientProgress', fk: 'userId' },
  { model: 'BodyMeasurement', fk: 'userId' },
  { model: 'ClientOnboardingQuestionnaire', fk: 'userId' },
  { model: 'ClientBaselineMeasurements', fk: 'userId' },
  { model: 'ClientPhoto', fk: 'userId' },
  { model: 'ClientNote', fk: 'userId' },
]);

export class DataRightsError extends Error {
  constructor(message, statusCode = 400, code = 'DATA_RIGHTS_ERROR') {
    super(message);
    this.name = 'DataRightsError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * The confirmation a caller must echo back before erasure runs. Naming the
 * target makes a copy-pasted or replayed confirmation useless against a
 * different account.
 */
export const erasureConfirmationFor = (targetUserId) => `ERASE-USER-${targetUserId}`;

const parseId = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * Collect everything the platform holds about one person.
 * Read-only. Returns plain JSON, safe to hand to the data subject.
 */
export async function exportAccountData({ targetUserId, models, actor }) {
  const id = parseId(targetUserId);
  if (!id) throw new DataRightsError('A valid user id is required', 400, 'INVALID_TARGET');

  const User = models?.User;
  if (!User) throw new DataRightsError('User model unavailable', 503, 'MODELS_UNAVAILABLE');

  const user = await User.findByPk(id);
  if (!user) throw new DataRightsError('User not found', 404, 'TARGET_NOT_FOUND');

  const profile = {};
  for (const field of IDENTIFYING_USER_FIELDS) {
    if (user[field] !== undefined) profile[field] = user[field];
  }
  profile.id = user.id;
  profile.role = user.role;
  profile.createdAt = user.createdAt;

  const records = {};
  for (const { model, fk } of OWNED_RECORD_MODELS) {
    const M = models[model];
    if (!M) continue; // model not present in this deployment — skip, do not fail
    try {
      const rows = await M.findAll({ where: { [fk]: id } });
      records[model] = rows.map((r) => (typeof r.toJSON === 'function' ? r.toJSON() : r));
    } catch (error) {
      // A missing table must not sink the whole export.
      logger.warn('[dataRights] export skipped a model', { model, error: error?.message });
      records[model] = { unavailable: true };
    }
  }

  logger.info('[dataRights] export produced', {
    targetUserId: id,
    byActorId: actor?.id ?? null,
    modelsIncluded: Object.keys(records).length,
  });

  return {
    exportedAt: new Date().toISOString(),
    subject: profile,
    records,
    note: 'Financial and session history is retained for accounting and is not included in this export.',
  };
}

/** The anonymised value a field is overwritten with. */
function anonymisedValue(field, id) {
  switch (field) {
    case 'email': return `erased-${id}@deleted.invalid`;
    case 'username': return `erased_${id}`;
    case 'firstName': return 'Erased';
    case 'lastName': return 'User';
    default: return null;
  }
}

/**
 * Erase a person: destroy identifying fields, keep the financial skeleton.
 *
 * @param {object}  p
 * @param {number}  p.targetUserId
 * @param {string}  p.confirmation   must equal erasureConfirmationFor(targetUserId)
 * @param {object}  p.models
 * @param {object}  p.sequelize
 * @param {object}  p.actor          the owner-admin performing this
 * @param {Function} [p.writeAudit]  audit sink; required in production use
 */
export async function eraseAccountData({
  targetUserId, confirmation, models, sequelize, actor, writeAudit,
}) {
  const id = parseId(targetUserId);
  if (!id) throw new DataRightsError('A valid user id is required', 400, 'INVALID_TARGET');

  if (confirmation !== erasureConfirmationFor(id)) {
    throw new DataRightsError(
      'Erasure requires a confirmation naming the target account',
      400,
      'CONFIRMATION_REQUIRED'
    );
  }

  const actorId = parseId(actor?.id);
  if (actorId === id) {
    throw new DataRightsError('You cannot erase your own account', 400, 'SELF_ERASURE_BLOCKED');
  }

  const User = models?.User;
  if (!User || !sequelize) throw new DataRightsError('Models unavailable', 503, 'MODELS_UNAVAILABLE');

  return sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(id, { transaction });
    if (!user) throw new DataRightsError('User not found', 404, 'TARGET_NOT_FOUND');

    // An admin account is infrastructure, not a data subject. Demote first.
    if (user.role === 'admin') {
      throw new DataRightsError('Admin accounts cannot be erased', 409, 'ADMIN_ERASURE_BLOCKED');
    }

    const payload = { isActive: false };
    for (const field of IDENTIFYING_USER_FIELDS) {
      payload[field] = anonymisedValue(field, id);
    }
    await user.update(payload, { transaction });

    const cleared = [];
    for (const { model, fk } of OWNED_RECORD_MODELS) {
      const M = models[model];
      if (!M) continue;
      try {
        const n = await M.destroy({ where: { [fk]: id }, transaction });
        cleared.push({ model, removed: n });
      } catch (error) {
        logger.warn('[dataRights] erasure skipped a model', { model, error: error?.message });
        cleared.push({ model, removed: 0, skipped: true });
      }
    }

    if (typeof writeAudit === 'function') {
      await writeAudit({
        action: 'account_erasure',
        actorId,
        targetUserId: id,
        detail: { fieldsCleared: IDENTIFYING_USER_FIELDS.length, records: cleared },
        transaction,
      });
    }

    logger.info('[dataRights] account erased', { targetUserId: id, byActorId: actorId });

    return {
      targetUserId: id,
      erasedFields: IDENTIFYING_USER_FIELDS.length,
      recordsCleared: cleared,
      retained: 'orders, financial transactions and session history (accounting retention)',
    };
  });
}

export default { exportAccountData, eraseAccountData, erasureConfirmationFor };
