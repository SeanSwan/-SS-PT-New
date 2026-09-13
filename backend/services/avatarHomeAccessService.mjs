export async function requireUnlockedHome(userId, { transaction } = {}) {
  const { default: AvatarHome } = await import('../models/AvatarHome.mjs');
  const query = { where: { userId } };
  if (transaction) {
    query.transaction = transaction;
    query.lock = transaction.LOCK.UPDATE;
  }
  const home = await AvatarHome.findOne(query);
  if (!home) return { home: null, error: 'Avatar home not found', status: 404 };
  if (!home.unlocked) return { home: null, error: 'Reach Level 10 to unlock this feature', status: 403 };
  return { home, error: null, status: 200 };
}
