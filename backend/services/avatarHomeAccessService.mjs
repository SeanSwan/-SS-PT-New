export async function requireUnlockedHome(userId) {
  const { default: AvatarHome } = await import('../models/AvatarHome.mjs');
  const home = await AvatarHome.findOne({ where: { userId } });
  if (!home) return { home: null, error: 'Avatar home not found', status: 404 };
  if (!home.unlocked) return { home: null, error: 'Reach Level 10 to unlock this feature', status: 403 };
  return { home, error: null, status: 200 };
}
