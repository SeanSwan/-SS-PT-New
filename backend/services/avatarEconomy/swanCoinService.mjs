import AvatarHome from '../../models/AvatarHome.mjs';

const MAX_SWAN_COIN_AWARD = 25;

function normalizePositiveInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).trim();
  if (!/^[1-9]\d*$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function normalizeBalance(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

/**
 * Award SwanCoins, the spendable avatar/home soft currency.
 *
 * Legacy storage note:
 * AvatarHome currently stores spendable currency in `crystalBalance`. Slice 7
 * keeps that DB field for backward compatibility but exposes the product name
 * as SwanCoins so XP can remain permanent progression.
 */
export async function awardSwanCoins({
  userId,
  amount,
  source = 'unity_weaver',
  reason = 'Swan Aura good-energy reward',
} = {}, transaction = null) {
  const numericUserId = normalizePositiveInteger(userId);
  const normalizedAmount = normalizePositiveInteger(amount);

  if (!numericUserId) {
    return { error: { status: 400, message: 'Invalid user ID' } };
  }

  if (!normalizedAmount || normalizedAmount > MAX_SWAN_COIN_AWARD) {
    return { error: { status: 400, message: `SwanCoin amount must be between 1 and ${MAX_SWAN_COIN_AWARD}` } };
  }

  let home = await AvatarHome.findOne({
    where: { userId: numericUserId },
    transaction,
    lock: transaction?.LOCK?.UPDATE,
  });

  if (!home) {
    home = await AvatarHome.create({
      userId: numericUserId,
      unlocked: false,
      unlockedAt: null,
      crystalBalance: 0,
    }, { transaction });
  }

  const currentBalance = normalizeBalance(home.crystalBalance);
  const nextBalance = currentBalance + normalizedAmount;

  await home.update({ crystalBalance: nextBalance }, { transaction });

  return {
    success: true,
    swanCoinsAwarded: normalizedAmount,
    swanCoinBalance: nextBalance,
    currencyName: 'SwanCoins',
    legacyField: 'crystalBalance',
    source,
    reason,
  };
}

export default {
  awardSwanCoins,
};
