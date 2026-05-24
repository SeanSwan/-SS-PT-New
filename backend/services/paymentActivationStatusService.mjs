/**
 * paymentActivationStatusService.mjs
 * ==================================
 * Builds the backend-owned post-purchase activation contract for a paid client.
 * This keeps checkout success pages, admin intake, and future Swan Coach flows
 * pointed at one database-backed truth source instead of duplicating status
 * logic in React.
 */
import {
  Op,
  getModel,
  getOrder,
  getSession,
  getShoppingCart,
  getUser,
  getWaiverRecord,
} from '../models/index.mjs';
import logger from '../utils/logger.mjs';

const LINKED_WAIVER_STATUSES = ['linked'];
const COMPLETE_ONBOARDING_STATUSES = ['submitted', 'completed'];
const UPCOMING_SESSION_STATUSES = ['assigned', 'requested', 'scheduled', 'confirmed'];

export class PaymentActivationStatusError extends Error {
  constructor(message, { statusCode = 500, code = 'ACTIVATION_STATUS_FAILED' } = {}) {
    super(message);
    this.name = 'PaymentActivationStatusError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function toPositiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new PaymentActivationStatusError(`Invalid ${label}`, {
      statusCode: 400,
      code: 'INVALID_ACTIVATION_STATUS_REQUEST',
    });
  }
  return parsed;
}

function normalizeSessionId(sessionId) {
  const normalized = typeof sessionId === 'string' ? sessionId.trim() : '';
  if (!normalized) {
    throw new PaymentActivationStatusError('sessionId is required', {
      statusCode: 400,
      code: 'SESSION_ID_REQUIRED',
    });
  }
  return normalized;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isPaidCart(cart, order) {
  return (
    cart?.sessionsGranted === true ||
    cart?.paymentStatus === 'paid' ||
    cart?.status === 'completed' ||
    order?.status === 'completed'
  );
}

function isOnboardingComplete(user, questionnaire) {
  return Boolean(
    user?.isOnboardingComplete === true ||
    user?.masterPromptJson ||
    COMPLETE_ONBOARDING_STATUSES.includes(questionnaire?.status)
  );
}

function serializeSession(session) {
  if (!session) return null;
  const sessionDate = session.sessionDate instanceof Date
    ? session.sessionDate.toISOString()
    : session.sessionDate || null;

  return {
    id: session.id,
    sessionDate,
    status: session.status || null,
    trainerId: session.trainerId ?? null,
  };
}

async function optionalActivationLookup(label, lookup) {
  try {
    return {
      value: await lookup(),
      error: null,
    };
  } catch (error) {
    logger.warn(`[PaymentActivationStatus] Optional ${label} lookup failed`, {
      label,
      error: error.message,
    });
    return {
      value: null,
      error: { label },
    };
  }
}

function resolveNextStep({
  paid,
  accountLinked,
  waiverComplete,
  onboardingComplete,
  sessionCreditsAllocated,
  sessionsAvailable,
  scheduledSessionCount,
  nextSession,
}) {
  if (!paid) {
    return {
      nextStep: 'await_payment',
      nextRoute: '/checkout',
      nextAction: 'Finish checkout before activation can continue.',
    };
  }

  if (!accountLinked) {
    return {
      nextStep: 'claim_account',
      nextRoute: '/claim',
      nextAction: 'Claim or create the client account for this purchase.',
    };
  }

  if (!waiverComplete) {
    return {
      nextStep: 'complete_waiver',
      nextRoute: '/waiver?source=in_app',
      nextAction: 'Complete the required SwanStudios waiver.',
    };
  }

  if (!onboardingComplete) {
    return {
      nextStep: 'complete_onboarding',
      nextRoute: '/dashboard/client/onboarding',
      nextAction: 'Complete onboarding so Swan Coach can personalize the plan.',
    };
  }

  if (!sessionCreditsAllocated) {
    return {
      nextStep: 'await_session_allocation',
      nextRoute: '/dashboard/client/overview',
      nextAction: 'Your payment is confirmed; session credits are being applied.',
    };
  }

  if (sessionsAvailable > 0 && !nextSession) {
    return {
      nextStep: 'schedule_first_session',
      nextRoute: '/dashboard/client/schedule',
      nextAction: 'Schedule the first session.',
    };
  }

  return {
    nextStep: 'dashboard',
    nextRoute: '/dashboard/client/overview',
    nextAction: 'Review your dashboard and next session.',
  };
}

export async function resolvePaidClientActivationStatus({ userId, sessionId }) {
  const scopedUserId = toPositiveInteger(userId, 'userId');
  const scopedSessionId = normalizeSessionId(sessionId);

  const ShoppingCart = getShoppingCart();
  const User = getUser();
  const WaiverRecord = getWaiverRecord();
  const Order = getOrder();
  const Session = getSession();
  const ClientOnboardingQuestionnaire = getModel('ClientOnboardingQuestionnaire');

  const cart = await ShoppingCart.findOne({
    where: {
      checkoutSessionId: scopedSessionId,
      userId: scopedUserId,
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
  });

  if (!cart) {
    throw new PaymentActivationStatusError('No activation status found for this checkout session', {
      statusCode: 404,
      code: 'ACTIVATION_STATUS_NOT_FOUND',
    });
  }

  const user = await User.findByPk(scopedUserId, {
    attributes: [
      'id',
      'role',
      'availableSessions',
      'isOnboardingComplete',
      'masterPromptJson',
      'forcePasswordChange',
    ],
  });

  if (!user) {
    throw new PaymentActivationStatusError('User not found for checkout activation', {
      statusCode: 404,
      code: 'ACTIVATION_USER_NOT_FOUND',
    });
  }

  const [
    orderResult,
    waiverRecordResult,
    questionnaireResult,
    nextSessionResult,
    scheduledSessionCountResult,
  ] = await Promise.all([
    optionalActivationLookup('order', () => Order.findOne({
      where: {
        [Op.or]: [
          { cartId: cart.id },
          { paymentReference: scopedSessionId },
          { idempotencyKey: `stripe-webhook-cart:${cart.id}` },
        ],
      },
      attributes: ['id', 'status', 'paymentAppliedAt', 'paymentReference', 'idempotencyKey'],
      order: [['createdAt', 'DESC']],
    })),
    optionalActivationLookup('waiver', () => WaiverRecord.findOne({
      where: {
        userId: scopedUserId,
        status: { [Op.in]: LINKED_WAIVER_STATUSES },
      },
      attributes: ['id', 'status', 'signedAt', 'updatedAt'],
      order: [['signedAt', 'DESC']],
    })),
    optionalActivationLookup('onboarding', () => ClientOnboardingQuestionnaire.findOne({
      where: {
        userId: scopedUserId,
        status: { [Op.in]: COMPLETE_ONBOARDING_STATUSES },
      },
      attributes: ['id', 'status', 'completedAt', 'updatedAt'],
      order: [['updatedAt', 'DESC']],
    })),
    optionalActivationLookup('nextSession', () => Session.findOne({
      where: {
        userId: scopedUserId,
        status: { [Op.in]: UPCOMING_SESSION_STATUSES },
        sessionDate: { [Op.gte]: new Date() },
      },
      attributes: ['id', 'sessionDate', 'status', 'trainerId'],
      order: [['sessionDate', 'ASC']],
    })),
    optionalActivationLookup('scheduledSessionCount', () => Session.count({
      where: {
        userId: scopedUserId,
        status: { [Op.in]: UPCOMING_SESSION_STATUSES },
        sessionDate: { [Op.gte]: new Date() },
      },
    })),
  ]);

  const order = orderResult.value;
  const waiverRecord = waiverRecordResult.value;
  const questionnaire = questionnaireResult.value;
  const nextSession = nextSessionResult.value;
  const scheduledSessionCount = scheduledSessionCountResult.value || 0;
  const diagnostics = [
    orderResult.error,
    waiverRecordResult.error,
    questionnaireResult.error,
    nextSessionResult.error,
    scheduledSessionCountResult.error,
  ].filter(Boolean);

  const sessionsAvailable = toNumber(user.availableSessions);
  const paid = isPaidCart(cart, order);
  const accountLinked = Boolean(user?.id);
  const waiverComplete = Boolean(waiverRecord);
  const onboardingComplete = isOnboardingComplete(user, questionnaire);
  const sessionCreditsAllocated = cart.sessionsGranted === true;
  const next = resolveNextStep({
    paid,
    accountLinked,
    waiverComplete,
    onboardingComplete,
    sessionCreditsAllocated,
    sessionsAvailable,
    scheduledSessionCount,
    nextSession,
  });

  return {
    sessionId: scopedSessionId,
    userId: scopedUserId,
    cart: {
      id: cart.id,
      status: cart.status,
      paymentStatus: cart.paymentStatus || null,
      sessionsGranted: cart.sessionsGranted === true,
      total: toNumber(cart.total),
      completedAt: cart.completedAt || null,
      updatedAt: cart.updatedAt || null,
    },
    order: order ? {
      id: order.id,
      status: order.status,
      paymentAppliedAt: order.paymentAppliedAt || null,
    } : null,
    activation: {
      paid,
      accountLinked,
      waiverComplete,
      onboardingComplete,
      sessionCreditsAllocated,
      orderRecorded: Boolean(order),
      sessionsAvailable,
      scheduledSessionCount: toNumber(scheduledSessionCount),
      forcePasswordChange: user.forcePasswordChange === true,
      ...next,
    },
    waiver: waiverRecord ? {
      id: waiverRecord.id,
      status: waiverRecord.status,
      signedAt: waiverRecord.signedAt || null,
    } : null,
    onboarding: {
      userFlagComplete: user.isOnboardingComplete === true,
      hasMasterPrompt: Boolean(user.masterPromptJson),
      questionnaire: questionnaire ? {
        id: questionnaire.id,
        status: questionnaire.status,
        completedAt: questionnaire.completedAt || null,
      } : null,
    },
    nextSession: serializeSession(nextSession),
    diagnostics: diagnostics.length > 0 ? {
      partial: true,
      unavailable: diagnostics.map((diagnostic) => diagnostic.label),
    } : undefined,
  };
}
