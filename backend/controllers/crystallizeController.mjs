/**
 * crystallizeController — Dashboards v2 (Slice-3). POST /api/achievements/:id/crystallize.
 * Owner-scoped (userId from the session). Confirm-first contract: the client awaits this 200 BEFORE
 * playing the Crystallize animation (no optimistic lie). Idempotent replay → 200 with the same time.
 */
import { crystallizeAchievement } from '../services/crystallizeService.mjs';

// achievementId is an INTEGER (live "Achievements".id is integer serial — verified against the
// production DB 2026-08-03; the earlier UUID assumption rejected every real id with a 400).
// Validate shape AND int4 range so a malformed/overflow id is a clean 400, not a Postgres
// cast error surfaced as a generic 500.
const INT_ID_RE = /^[1-9][0-9]{0,9}$/;
const INT4_MAX = 2147483647;
const isValidAchievementId = (raw) =>
  INT_ID_RE.test(String(raw)) && Number(raw) <= INT4_MAX;

export async function postCrystallize(req, res) {
  const userId = req.user?.id;
  const achievementId = req.params?.id;
  const worldKey =
    typeof req.body?.worldKey === 'string' ? req.body.worldKey.slice(0, 64) : 'default';

  if (!userId) return res.status(401).json({ error: 'Not authenticated.' });
  if (!achievementId || !isValidAchievementId(achievementId)) {
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
