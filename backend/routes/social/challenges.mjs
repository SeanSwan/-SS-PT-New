import express from 'express';
// SWA-96 merge (2026-08-13, Sean's canon decision): the PascalCase social challenge
// family is RETIRED. /active was repointed to the canonical `challenges` table on
// 2026-08-04 (SWA-115) because it is the only endpoint with live frontend callers
// (useDashboardQueries.useSocialChallenges -> ClientObservatoryHome/ClientCommunityPage).
// The seven remaining endpoints (my-challenges, detail, create, join, leave, progress,
// leaderboard, teams) had ZERO frontend callers and read/wrote the empty PascalCase
// twins ("Challenges"/"ChallengeParticipants"/"ChallengeTeams") -- removed rather than
// repointed: dead surface area on empty tables is risk without value. The canonical
// challenges workspace lives under /api/v1/gamification (22 frontend files).
// Social model files (models/social/Challenge*.mjs) are now import-free pending the
// Rule-34 quarantine pass; the empty PascalCase tables are dropped in the same slice.
import { getChallenge, getChallengeParticipant } from '../../models/index.mjs';
import { mapChallengeToSocialPreview } from './challengePreviewMapper.mjs';
import { isMissingTableError } from '../featureAvailability.mjs';
import { protect } from '../../middleware/authMiddleware.mjs';
import { Op } from 'sequelize';
import logger from '../../utils/logger.mjs';

const parseBoundedInteger = (value, fallback, { min, max }) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const router = express.Router();
router.use(protect);

router.get('/active', async (req, res) => {
  const limit = parseBoundedInteger(req.query.limit, 10, { min: 1, max: 50 });
  const offset = parseBoundedInteger(req.query.offset, 0, { min: 0, max: 10000 });

  try {
    const now = new Date();

    // CANONICAL lane (see import note above): real challenges, public only —
    // this is a community surface; private/draft challenges must not leak here.
    // Window is "not yet ended" rather than "currently running": upcoming public
    // challenges are joinable content the dashboards should surface (live-DB truth
    // 2026-08-04: most historical challenges have ended; hiding upcoming ones would
    // keep the community page empty for no reason).
    const CanonicalChallenge = getChallenge();
    const CanonicalParticipant = getChallengeParticipant();

    const activeWhere = {
      status: 'active',
      isPublic: true,
      endDate: { [Op.gte]: now },
    };

    const [challenges, total] = await Promise.all([
      CanonicalChallenge.findAll({
        where: activeWhere,
        limit,
        offset,
        order: [['startDate', 'DESC'], ['id', 'DESC']], // K7: tiebreaker — offset pages were nondeterministic on tied startDates
      }),
      CanonicalChallenge.count({ where: activeWhere }),
    ]);

    // The requesting user's canonical participation rows for these challenges.
    const challengeIds = challenges.map(c => c.id);
    const participations = challengeIds.length > 0
      ? await CanonicalParticipant.findAll({
          where: { challengeId: { [Op.in]: challengeIds }, userId: req.user.id },
        })
      : [];
    const participationMap = {};
    for (const part of participations) participationMap[part.challengeId] = part.toJSON();

    const formattedChallenges = challenges.map(c =>
      mapChallengeToSocialPreview(c.toJSON(), participationMap[c.id] || null, now),
    );

    return res.status(200).json({
      success: true,
      challenges: formattedChallenges,
      pagination: { limit, offset, total },
    });
  } catch (error) {
    // A genuinely absent relation can degrade in a fresh environment. Missing
    // columns and every other database failure stay visible as real 500s.
    if (isMissingTableError(error)) {
      // K2 (Kimi) vs HY3 timing dispute, resolved as both suggested: the
      // degradation now shields the CANONICAL tables, so silence here would hide
      // exactly what the drift campaign hunts. It stays (load-bearing against the
      // enumeration boot until the tripwire+baseline land) but it SCREAMS:
      // error-level, endpoint-tagged, so a vanished canonical table is telemetry,
      // not an invisibly empty community page.
      logger.error('[drift-telemetry] /api/social/challenges/active degraded to empty: a CANONICAL table is missing', { error: error.message });
      return res.status(200).json({ success: true, challenges: [], pagination: { limit, offset, total: 0 } });
    }
    logger.error('Error fetching active challenges:', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch active challenges'
    });
  }
});

export default router;
