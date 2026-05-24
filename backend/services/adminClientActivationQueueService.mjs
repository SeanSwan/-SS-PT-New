/**
 * adminClientActivationQueueService.mjs
 * =====================================
 * Builds Sean's admin-facing paid-client activation queue from DB truth.
 * The queue reuses the same activation resolver as checkout success so admin
 * and client surfaces do not drift on waiver/onboarding/session state.
 */
import { Op, getShoppingCart, getUser } from '../models/index.mjs';
import { resolvePaidClientActivationStatus } from './paymentActivationStatusService.mjs';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const ACTIVATION_USER_ROLES = ['client', 'user'];

function clampLimit(limit) {
  const parsed = Number(limit);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function toPlainRecord(record) {
  return typeof record?.toJSON === 'function' ? record.toJSON() : record;
}

function summarizeQueue(rows) {
  return rows.reduce((summary, row) => {
    const nextStep = row.activation.nextStep;
    summary.total += 1;
    summary.byNextStep[nextStep] = (summary.byNextStep[nextStep] || 0) + 1;
    if (!row.activation.waiverComplete) summary.needsWaiver += 1;
    if (!row.activation.onboardingComplete) summary.needsOnboarding += 1;
    if (!row.activation.sessionCreditsAllocated) summary.awaitingSessionAllocation += 1;
    if (nextStep === 'schedule_first_session') summary.readyToSchedule += 1;
    return summary;
  }, {
    total: 0,
    needsWaiver: 0,
    needsOnboarding: 0,
    awaitingSessionAllocation: 0,
    readyToSchedule: 0,
    byNextStep: {},
  });
}

export async function listPaidClientActivationQueue({ limit = DEFAULT_LIMIT, nextStep } = {}) {
  const ShoppingCart = getShoppingCart();
  const User = getUser();
  const safeLimit = clampLimit(limit);
  const candidateLimit = Math.min(Math.max(safeLimit * 4, safeLimit), MAX_LIMIT);

  const carts = await ShoppingCart.findAll({
    where: {
      checkoutSessionId: { [Op.ne]: null },
      [Op.or]: [
        { paymentStatus: 'paid' },
        { status: 'completed' },
        { sessionsGranted: true },
      ],
    },
    attributes: [
      'id',
      'userId',
      'status',
      'paymentStatus',
      'sessionsGranted',
      'checkoutSessionId',
      'total',
      'completedAt',
      'updatedAt',
    ],
    order: [['updatedAt', 'DESC']],
    limit: candidateLimit,
  });

  const plainCarts = carts.map(toPlainRecord).filter(Boolean);
  const userIds = [...new Set(plainCarts.map(cart => cart.userId).filter(Boolean))];
  const users = userIds.length > 0
    ? await User.findAll({
      where: { id: { [Op.in]: userIds }, role: { [Op.in]: ACTIVATION_USER_ROLES } },
      attributes: [
        'id',
        'firstName',
        'lastName',
        'email',
        'isActive',
        'availableSessions',
        'createdAt',
      ],
    })
    : [];
  const usersById = new Map(users.map(user => {
    const plain = toPlainRecord(user);
    return [plain.id, plain];
  }));

  const rows = [];
  for (const cart of plainCarts) {
    const user = usersById.get(cart.userId);
    if (!user) continue;

    const status = await resolvePaidClientActivationStatus({
      userId: cart.userId,
      sessionId: cart.checkoutSessionId,
    });

    if (nextStep && status.activation.nextStep !== nextStep) continue;
    if (!nextStep && status.activation.nextStep === 'dashboard') continue;

    rows.push({
      cartId: cart.id,
      sessionId: status.sessionId,
      client: {
        id: user.id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        isActive: user.isActive !== false,
        availableSessions: Number(user.availableSessions || 0),
      },
      cart: status.cart,
      activation: status.activation,
      nextSession: status.nextSession,
      updatedAt: status.cart.updatedAt || status.cart.completedAt || user.createdAt || null,
    });

    if (rows.length >= safeLimit) break;
  }

  return {
    queue: rows,
    summary: summarizeQueue(rows),
  };
}
