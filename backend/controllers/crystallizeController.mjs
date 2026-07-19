/**
 * crystallizeController — Dashboards v2 (Slice-3). POST /api/achievements/:id/crystallize.
 * Owner-scoped (userId from the session). Confirm-first contract: the client awaits this 200 BEFORE
 * playing the Crystallize animation (no optimistic lie). Idempotent replay → 200 with the same time.
 */
import { crystallizeAchievement } from '../services/crystallizeService.mjs';

// achievementId is a UUID (Achievement.id) — validate the shape so a malformed id is a clean 400,
// not a Postgres "invalid input syntax for type uuid" cast error surfaced as a generic 500.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function postCrystallize(req, res) {
  const userId = req.user?.id;
  const achievementId = req.params?.id;
  const worldKey =
    typeof req.body?.worldKey === 'string' ? req.body.worldKey.slice(0, 64) : 'default';

  if (!userId) return res.status(401).json({ error: 'Not authenticated.' });
  if (!achievementId || !UUID_RE.test(achievementId)) {
    return res.status(400).json({ error: 'Invalid achievement id.' });
  }

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
