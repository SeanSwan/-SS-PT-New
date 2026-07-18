/**
 * crystallizeController — Dashboards v2 (Slice-3). POST /api/achievements/:id/crystallize.
 * Owner-scoped (userId from the session). Confirm-first contract: the client awaits this 200 BEFORE
 * playing the Crystallize animation (no optimistic lie). Idempotent replay → 200 with the same time.
 */
import { crystallizeAchievement } from '../services/crystallizeService.mjs';

export async function postCrystallize(req, res) {
  const userId = req.user?.id;
  const achievementId = req.params?.id;
  const worldKey =
    typeof req.body?.worldKey === 'string' ? req.body.worldKey.slice(0, 64) : 'default';

  if (!userId) return res.status(401).json({ error: 'Not authenticated.' });
  if (!achievementId) return res.status(400).json({ error: 'Missing achievement id.' });

  try {
    const result = await crystallizeAchievement({ userId, achievementId, worldKey });
    return res.json(result); // { crystallizedAt }
  } catch (err) {
    const code = err?.statusCode || 500;
    return res
      .status(code)
      .json({ error: code === 404 ? 'Achievement not found for this user.' : 'Could not crystallize. Try again.' });
  }
}
