/**
 * Client plan adjustment request dispatcher
 * =========================================
 * Converts a confirmed client self-service request into the existing
 * trainer/admin-visible ClientNote queue. The receipt deliberately avoids
 * echoing the client's freeform reason back through the command lane.
 */
import { getAllModels } from '../../../models/index.mjs';

const PLAN_ADJUSTMENT_TAGS = ['client_request', 'plan_adjustment_request', 'swan_coach'];

const toSafeId = (value) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeReason = (value) => String(value || '').trim().slice(0, 500);

export async function dispatchRequestPlanAdjustment(params = {}, ctx = {}) {
  const userId = toSafeId(ctx.user?.id);
  if (!userId || ctx.user?.role !== 'client') {
    throw new Error('Plan adjustment requests must come from an authenticated client.');
  }

  const reason = normalizeReason(params.reason);
  if (!reason) {
    throw new Error('Plan adjustment reason is required.');
  }

  const { ClientNote, ClientTrainerAssignment } = getAllModels();
  if (!ClientNote?.create) {
    throw new Error('Client note queue is not available.');
  }

  const assignment = ClientTrainerAssignment?.findOne
    ? await ClientTrainerAssignment.findOne({
        where: { clientId: userId, status: 'active' },
        order: [['updatedAt', 'DESC']],
      })
    : null;
  const trainerId = toSafeId(assignment?.trainerId);

  const note = await ClientNote.create({
    userId,
    trainerId,
    noteType: 'concern',
    severity: 'medium',
    visibility: 'trainer_only',
    isResolved: false,
    tagsJson: PLAN_ADJUSTMENT_TAGS,
    content: `Client requested a workout plan adjustment. Reason: ${reason}`,
  });

  return {
    requestId: note?.id ?? null,
    userId,
    trainerId,
    routedToTrainer: Boolean(trainerId),
    status: 'open',
    queue: 'client_notes',
  };
}
