# Final hostile review — the schema-truth campaign, closed state

**Reviewers:** Kimi K3 (correctness/logic) and Tencent HY3 (architecture/what-next), independently.
**Author:** Fable 5 session. **Date:** 2026-08-13.

## 0. Remits

**Kimi:** attack the MERGE SLICE below for correctness — the trimmed route, the registry
removals, the model fix, the test re-anchor. Then: across the whole end-state summary, where is
confidence still unearned? VERDICT per file + ranked findings.

**HY3:** attack the ARCHITECTURE of the end state — the instruments (auditor/generator/QA
container/backup), the residual risks (85 orphan tables, 34 dormant models, enumeration-driven
boot), and rank WHAT TO BUILD NEXT from: baseline migration (plan exists: D→A′), boot drift
tripwire, creation-order convergence sweep, orphan/dormant disposition, cross-role QA journeys.
Say plainly what we are still blind to.

Do not hedge to consensus. You are reviewing INDEPENDENTLY.

## 1. End-state summary (all live-verified)

- Waiver outage: fixed (5 additive columns), endpoint 200, column-missing 0 database-wide.
- Indexes: 108 created in prod (101 batch + 7 post-squatter-drop), 9.9s, zero failures/INVALID.
  daily_workout_forms 1→10. Waiver idempotency partial unique now enforces the model's promise.
- Split families: Achievements resolved (empty lowercase twin dropped, real table fully
  indexed); challenges family RETIRED (Sean's canon call — evidence: root lane 18 rows + cron +
  22 frontend files vs social lane ONE live GET already repointed 2026-08-04, 7 endpoints with
  ZERO callers on 0-row tables). Three empty PascalCase tables dropped after in-session 0-row +
  0-external-FK re-verification. SWA-159 closed: root participant.teamId dangling FK reference
  removed — model now exactly matches prod (plain uuid, no FK).
- QA container: model-derived schema fully green, 198 tables, zero import-graph failures;
  sentinel positive-identity guard; manifest JSON emitted.
- Drift auditor: 5 classes incl. index-column-mismatch via shared resolver module; rehearsable
  against QA (PG_HOST) — previously only aimable at production.
- Remaining drift: table-missing 1 (deliberate), index-missing 9 (unregistered families),
  unresolvable 7 (hand-write sidecar), mismatch 0, orphan tables 85 (newly measurable).
- Boot remains enumeration-driven (hardcoded MISSING_COLUMNS + TABLE_CREATION_ORDER; 107
  registered models unlisted) — systemic fix deliberately gated.

## 2. The merge slice (full source of every changed file)

### FILE: backend/routes/social/challenges.mjs
```js
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
        order: [['startDate', 'DESC']],
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
```

### FILE: backend/tests/api/socialChallengeRetirementContract.test.mjs
```js
/**
 * socialChallengeRetirementContract — the SWA-96 merge, pinned (2026-08-13)
 * =========================================================================
 * Sean's canon decision: the PascalCase social challenge family is RETIRED.
 * The canonical family is the root one (`challenges` table, /api/v1/gamification
 * lane, 22 frontend files). This contract is a tripwire against resurrection:
 * the legacy endpoints read/wrote EMPTY twin tables, so anyone re-adding one is
 * re-introducing dead surface area — likely by copy-paste from git history.
 *
 * Replaces (test-delta, class RE-ANCHOR — subjects removed by owner decision,
 * not silenced): socialChallengeCreatePolicy.test.mjs (3 tests),
 * socialChallengeProgressLedger.test.mjs (3), and the social half of
 * challengeEvidenceGateContract.test.mjs (2). The anti-self-report gate those
 * tests defended is now vacuously stronger here: the manual-progress endpoint
 * does not exist at all. The V1 lane's gate keeps its own live assertions.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const routeSrc = readFileSync(path.resolve(here, '../../routes/social/challenges.mjs'), 'utf8');
const socialIndexSrc = readFileSync(path.resolve(here, '../../models/social/index.mjs'), 'utf8');
const associationsSrc = readFileSync(path.resolve(here, '../../models/associations.mjs'), 'utf8');

describe('social challenge retirement (SWA-96)', () => {
  it('keeps ONLY the canonical /active endpoint', () => {
    const routes = routeSrc.match(/router\.(get|post|put|delete)\(/g) || [];
    expect(routes).toHaveLength(1);
    expect(routeSrc).toContain("router.get('/active'");
  });

  it('serves /active from the canonical registry models, never the social twins', () => {
    expect(routeSrc).toContain("getChallenge, getChallengeParticipant");
    expect(routeSrc).not.toContain("from '../../models/social/index.mjs'");
  });

  it('legacy endpoints stay dead: join/leave/progress/teams/create/leaderboard', () => {
    for (const legacy of ['/join', '/leave', '/progress', '/teams', '/leaderboard', "post('/'"]) {
      expect(routeSrc).not.toContain(legacy);
    }
  });

  it('the social model registry no longer exports the retired trio', () => {
    // Word-boundary shapes so the retirement COMMENTS naming them do not match.
    expect(socialIndexSrc).not.toMatch(/import Challenge from/);
    expect(socialIndexSrc).not.toMatch(/^\s+ChallengeTeam,\s*$/m);
    expect(associationsSrc).not.toContain('SocialChallenge');
  });
});
```

### DIFF: models (social/index.mjs, associations.mjs, ChallengeParticipant.mjs)
```diff
commit 8726fdcbdd3d9525a255b5cff0953466733c48c4
Author: SeanSwan <25750267+SeanSwan@users.noreply.github.com>
Date:   Thu Aug 13 07:33:29 2026 -0700

    feat(challenges): retire the PascalCase social challenge family — SWA-96 merge, SWA-159 resolution
    
    Sean's canon decision executed. Evidence (all live-verified): root `challenges` has
    18 rows, the weeklyChallengeCron writer, FKs from challenge_participants and
    challenge_submissions, and 22 frontend files on the /api/v1/gamification lane.
    The PascalCase social twins ("Challenges"/"ChallengeParticipants"/"ChallengeTeams")
    have 0 rows each, forever.
    
    - routes/social/challenges.mjs: 796 -> 94 lines. /active stays (repointed to the
      canonical table on 2026-08-04, SWA-115 — the only endpoint with frontend
      callers: useSocialChallenges -> client dashboards). The seven other endpoints
      had ZERO callers and read/wrote the empty twins — removed rather than
      repointed: dead surface area on empty tables is risk without value.
    - models/social/index.mjs + associations.mjs: the trio unregistered. Registry
      161 models (was 164); zero association wiring existed for them (verified);
      no getModel() consumer anywhere (verified).
    - models/ChallengeParticipant.mjs (SWA-159 CLOSED BY THIS): teamId's
      `references: ChallengeTeams` was a dangling pointer at a retired social table
      whose id was int4 — the uuid FK was never creatable anywhere, which was the
      original QA fresh-build failure AND the prod inconsistency. Production truth
      is a plain uuid column with no FK; the model now matches exactly. The FK
      returns when a root-family teams feature actually ships.
    
    Proof: QA rebuild exit 0, 198 tables (challenge_participants creates for the
    first time), zero import-graph failures; registry initializes at 161 with root
    Challenge intact; trimmed route module loads with exactly 1 route.
    
    Remaining in this slice, Sean-gated: DROP the three empty PascalCase tables in
    production. Follow-up (Rule 34 quarantine pass): the three now-orphaned social
    model files, which the QA glob correctly reports in the dormant tier.
    
    Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>

diff --git a/backend/models/ChallengeParticipant.mjs b/backend/models/ChallengeParticipant.mjs
index 229662f44..3c1c061d9 100644
--- a/backend/models/ChallengeParticipant.mjs
+++ b/backend/models/ChallengeParticipant.mjs
@@ -127,14 +127,16 @@ const ChallengeParticipant = db.define('ChallengeParticipant', {
     allowNull: true
   },
   
-  // Team Participation (if challenge allows teams)
+  // Team Participation (if challenge allows teams).
+  // SWA-159 (2026-08-13): the `references` block was a dangling pointer. It named
+  // 'ChallengeTeams' — a table owned by the now-retired SOCIAL family whose id was
+  // int4, so this uuid FK was never creatable anywhere (prod verified: no FK
+  // exists, column is plain uuid). The root family has no teams model yet. A
+  // plain uuid column matches production exactly = zero drift; the FK returns
+  // when a root-family teams feature actually ships.
   teamId: {
     type: DataTypes.UUID,
     allowNull: true,
-    references: {
-      model: 'ChallengeTeams',
-      key: 'id'
-    }
   },
   
   isTeamLeader: {
diff --git a/backend/models/associations.mjs b/backend/models/associations.mjs
index d9eb44cc9..d2921b2a7 100644
--- a/backend/models/associations.mjs
+++ b/backend/models/associations.mjs
@@ -59,7 +59,8 @@ const setupAssociations = async () => {
 
     // Social Models (Sequelize)
     const SocialModels = await import('./social/index.mjs');
-    const { SocialPost, SocialComment, SocialLike, Friendship, Challenge: SocialChallenge, ChallengeParticipant: SocialChallengeParticipant, ChallengeTeam, PostReport, ModerationAction } = SocialModels;
+    // SWA-96 merge: social challenge trio retired from the registry (empty-table twins).
+    const { SocialPost, SocialComment, SocialLike, Friendship, PostReport, ModerationAction } = SocialModels;
 
     // Workout Models (Sequelize)
     const WorkoutPlanModule = await import('./WorkoutPlan.mjs');
@@ -505,7 +506,7 @@ const setupAssociations = async () => {
         UserAchievement, UserReward, UserMilestone, Reward, Milestone,
         PointTransaction, StorefrontItem, ProductVariant, ShoppingCart, CartItem, Order,
         OrderItem, SessionPackage, Package, AdminSpecial, FoodIngredient, FoodProduct, FoodScanHistory,
-        SocialPost, SocialComment, SocialLike, Friendship, SocialChallenge, SocialChallengeParticipant, ChallengeTeam,
+        SocialPost, SocialComment, SocialLike, Friendship,
         PostReport, ModerationAction,
         Challenge, ChallengeParticipant, Goal, ProgressData, UserFollow,
         Streak, GoalSupporter, GoalComment, GoalLike, GoalMilestone,
@@ -1437,9 +1438,6 @@ const setupAssociations = async () => {
       SocialComment,
       SocialLike,
       Friendship,
-      SocialChallenge,
-      SocialChallengeParticipant,
-      ChallengeTeam,
       
       // Content Moderation Models
       PostReport,
diff --git a/backend/models/social/index.mjs b/backend/models/social/index.mjs
index 97f135b35..8ceb65a74 100644
--- a/backend/models/social/index.mjs
+++ b/backend/models/social/index.mjs
@@ -2,9 +2,10 @@ import Friendship from './Friendship.mjs';
 import SocialPost from './SocialPost.mjs';
 import SocialComment from './SocialComment.mjs';
 import SocialLike from './SocialLike.mjs';
-import Challenge from './Challenge.mjs';
-import ChallengeParticipant from './ChallengeParticipant.mjs';
-import ChallengeTeam from './ChallengeTeam.mjs';
+// SWA-96 merge (2026-08-13): Challenge/ChallengeParticipant/ChallengeTeam retired.
+// The canonical challenge family lives in the root models (`challenges` table, 18 live
+// rows, /api/v1/gamification lane). These PascalCase twins mapped to empty tables and
+// their only route consumer (routes/social/challenges.mjs legacy endpoints) is removed.
 import PostReport from './PostReport.mjs';
 import ModerationAction from './ModerationAction.mjs';
 import Hashtag from './Hashtag.mjs';
@@ -65,9 +66,6 @@ export {
   SocialPost,
   SocialComment,
   SocialLike,
-  Challenge,
-  ChallengeParticipant,
```

### DIFF: test re-anchor
```diff
commit 2d764ba3d35ca2d0194f52dc0aba7c039fcfec62
Author: SeanSwan <25750267+SeanSwan@users.noreply.github.com>
Date:   Thu Aug 13 07:35:27 2026 -0700

    test(challenges): re-anchor the suite to the retirement — pushed code before running these, fixing forward
    
    PROCESS FAULT, stated plainly: the merge commit was pushed before running the four
    test files grep had ALREADY surfaced as touching this surface. Seven of twelve
    failed exactly as the retirement predicts. Same wrote-it-never-ran-it class as
    the linear-cli comment command. The failures were retirement-legitimate, but that
    was luck's cousin: verified after shipping instead of before.
    
```
