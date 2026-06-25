import GalleryVisitor from '../models/GalleryVisitor.mjs';
import User from '../models/User.mjs';
import SessionPackage from '../models/SessionPackage.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import { isNonDeductingClient } from './sessionBillingPolicy.mjs';

const VIP_PACKAGE_NAME = 'VIP Gallery Package - PT Session + Complimentary Orientation';

const toPositiveInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export async function fulfillGalleryVipSession({
  sessionId,
  visitorId,
  userId,
  eventId,
  amount = 175,
}) {
  const numericVisitorId = toPositiveInteger(visitorId);
  const numericUserId = toPositiveInteger(userId);
  const numericEventId = toPositiveInteger(eventId);

  if (!sessionId || !numericVisitorId || !numericUserId || !numericEventId) {
    throw new Error('VIP fulfillment requires sessionId, visitorId, userId, and eventId');
  }

  const result = await sequelize.transaction(async (transaction) => {
    const visitor = await GalleryVisitor.findByPk(numericVisitorId, { transaction });
    if (!visitor) {
      throw new Error(`Gallery visitor ${numericVisitorId} not found`);
    }

    const user = await User.findByPk(numericUserId, { transaction });
    if (!user) {
      throw new Error(`User ${numericUserId} not found`);
    }

    const [processed] = await sequelize.query(
      `INSERT INTO processed_stripe_sessions ("sessionId", "userId", tier, amount)
       VALUES (:sessionId, :userId, 'gallery-vip', :amount)
       ON CONFLICT ("sessionId") DO NOTHING
       RETURNING id`,
      {
        replacements: { sessionId, userId: numericUserId, amount },
        transaction,
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (!processed) {
      return {
        success: true,
        isVip: true,
        alreadyProcessed: true,
        sessionCreditGranted: false,
      };
    }

    const alreadyVipForUser = visitor.isVip && Number(visitor.userId) === numericUserId;
    await visitor.update(
      { isVip: true, userId: numericUserId },
      { transaction }
    );

    if (!alreadyVipForUser) {
      await user.increment('availableSessions', { by: 1, transaction });
    }

    const userVipUpdate = {
      ...(!alreadyVipForUser && isNonDeductingClient(user)
        ? { clientSource: 'swanstudios', sessionBillingMode: 'paid_sessions' }
        : {}),
      ...(user.role === 'user'
        ? { role: 'client', updatedAt: new Date() }
        : {}),
    };

    if (Object.keys(userVipUpdate).length > 0) {
      await user.update(userVipUpdate, { transaction });
    }

    return {
      success: true,
      isVip: true,
      alreadyProcessed: false,
      sessionCreditGranted: !alreadyVipForUser,
    };
  });

  try {
    await SessionPackage.findOrCreate({
      where: { name: VIP_PACKAGE_NAME },
      defaults: {
        name: VIP_PACKAGE_NAME,
        description: '1 PT Training Session credit + 1 Complimentary NASM Orientation (free, 0 credits). After orientation: 1 session remaining for PT.',
        sessionCount: 1,
        price: 175.00,
        duration: 60,
        packageType: 'individual',
        isActive: true,
      },
    });
  } catch (pkgErr) {
    logger.warn(`[Gallery VIP] Could not ensure SessionPackage record: ${pkgErr.message}`);
  }

  logger.info(`[Gallery VIP] Fulfilled Stripe session ${sessionId} for visitor ${numericVisitorId}, user ${numericUserId}`);
  return result;
}
