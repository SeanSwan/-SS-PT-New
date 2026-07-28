import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackend = (path) => readFileSync(resolve(__dirname, path), 'utf8');
const readFrontend = (path) => readFileSync(resolve(process.cwd(), '../frontend', path), 'utf8');
const readBackendIfExists = (path) => {
  try {
    return readBackend(path);
  } catch {
    return '';
  }
};

const controllerSource = readBackend('../../controllers/challengeController.mjs');
const challengeSubmissionControllerSource = readBackendIfExists('../../controllers/challengeSubmissionController.mjs');
const challengeEngagementControllerSource = readBackendIfExists('../../controllers/challengeEngagementController.mjs');
const routeSource = readBackend('../../routes/gamificationV1Routes.mjs');
const coreRoutesSource = readBackend('../../core/routes.mjs');
const challengeListSource = readBackend('../../services/gamification/challengeListService.mjs');
const challengeProgressEventSource = readBackend('../../services/gamification/challengeProgressEventService.mjs');
const challengeCompletionRewardSource = readBackend('../../services/gamification/challengeCompletionRewardService.mjs');
const challengeStatusSource = readBackend('../../services/gamification/challengeStatusService.mjs');
const challengeAudienceSource = readBackend('../../services/gamification/challengeAudienceService.mjs');
const challengeSubmissionSource = readBackendIfExists('../../services/gamification/challengeSubmissionService.mjs');
const challengeSubmissionEntitlementSource = readBackendIfExists('../../services/gamification/challengeSubmissionEntitlementService.mjs');
const challengeSubmissionModelSource = readBackendIfExists('../../models/ChallengeSubmission.mjs');
const challengeSubmissionMigrationSource = readBackendIfExists('../../migrations/20260630020000-create-challenge-submissions.cjs');
const challengeModelSource = readBackend('../../models/Challenge.mjs');
const challengeParticipantModelSource = readBackend('../../models/ChallengeParticipant.mjs');
const associationsSource = readBackend('../../models/associations.mjs');

describe('challenge controller security hardening', () => {
  it('locks the active gamification challenge API and frontend consumers', () => {
    const adminGamificationSource = readFrontend(
      'src/components/DashBoard/Pages/admin-clients/components/GamificationOverview.tsx',
    );
    const useChallengesSource = readFrontend('src/hooks/useChallenges.ts');
    const updateChallengeProgressSection = controllerSource.slice(
      controllerSource.indexOf('updateChallengeProgress: async'),
      controllerSource.indexOf('recordWorkoutChallengeProgress: async'),
    );
    const joinChallengeSection = controllerSource.slice(
      controllerSource.indexOf('joinChallenge: async'),
      controllerSource.indexOf('leaveChallenge: async'),
    );
    const leaveChallengeSection = controllerSource.slice(
      controllerSource.indexOf('leaveChallenge: async'),
      controllerSource.indexOf('getUserChallenges: async'),
    );
    expect(coreRoutesSource).toContain("app.use('/api/v1/gamification', gamificationV1Routes)");
    expect(coreRoutesSource).toContain("app.use('/api/gamification', gamificationV1Routes)");
    expect(routeSource).toContain("router.get('/challenges', challengeController.getAllChallenges)");
    expect(routeSource).toContain("router.get('/challenges/manage', authenticate, requireTrainer, challengeController.getManagedChallenges)");
    expect(routeSource.indexOf("router.get('/challenges/manage'")).toBeLessThan(routeSource.indexOf("router.get('/challenges/:id'"));
    expect(routeSource).toContain("router.get('/challenge-templates', authenticate, requireTrainer, challengeController.getChallengeTemplates)");
    expect(routeSource).toContain("import challengeSubmissionController from '../controllers/challengeSubmissionController.mjs';");
    expect(routeSource).toContain("router.get('/challenge-submissions/manage', authenticate, requireTrainer, challengeSubmissionController.getManagedChallengeSubmissions)");
    expect(routeSource).toContain("router.patch('/challenge-submissions/:id/moderation', authenticate, requireTrainer, challengeSubmissionController.moderateManagedChallengeSubmission)");
    expect(routeSource.indexOf("router.patch('/challenge-submissions/:id/moderation'")).toBeLessThan(routeSource.indexOf("router.get('/challenges/:id'"));
    expect(routeSource).toContain("router.post('/users/:userId/challenges/progress-events/workout-completed', authenticate, requireUser, authorizeResourceAccess('userId'), challengeController.recordWorkoutChallengeProgress)");
    expect(routeSource.indexOf("router.post('/users/:userId/challenges/progress-events/workout-completed'")).toBeLessThan(routeSource.indexOf("router.get('/challenges/:id'"));
    expect(routeSource).toContain("router.patch('/challenges/:id/status', authenticate, requireTrainer, challengeController.updateManagedChallengeStatus)");
    expect(routeSource).toContain("router.put('/challenges/:id/audience', authenticate, requireTrainer, challengeController.updateManagedChallengeAudience)");
    expect(routeSource.indexOf("router.post('/challenges'")).toBeLessThan(routeSource.indexOf("router.patch('/challenges/:id/status'"));
    expect(controllerSource).toContain('recordWorkoutChallengeProgress: async (req, res)');
    expect(controllerSource).toContain('applyWorkoutChallengeProgressEvent({');
    expect(controllerSource).toContain('awardWorkoutChallengeCompletionXp');
    expect(challengeCompletionRewardSource).toContain('idempotencyKey: `challenge:${userId}:${challengeId}`');
    expect(challengeCompletionRewardSource).toContain("sourceType: 'workout_completed'");
    expect(challengeProgressEventSource).toContain('sourceType: WORKOUT_EVENT_TYPE');
    expect(challengeProgressEventSource).not.toContain('WorkoutSession.create');
    expect(challengeProgressEventSource).not.toContain('WorkoutLog.create');
    expect(controllerSource).toContain('getChallengeTemplateCatalog');
    expect(controllerSource).toContain('getChallengeTemplates: async (req, res)');
    expect(controllerSource).toContain('getManagedChallenges: async (req, res)');
    expect(controllerSource).toContain('getChallengeList({');
    expect(controllerSource).toContain('publicOnly: true');
    expect(challengeListSource).toContain('PUBLIC_DISCOVERY_STATUSES');
    expect(challengeListSource).toContain("return PUBLIC_DISCOVERY_STATUSES.has(requestedStatus) ? requestedStatus : 'active';");
    expect(challengeListSource).toContain('if (publicOnly) whereClause.isPublic = true;');
    expect(controllerSource).toContain('buildChallengeCreatePayload');
    expect(controllerSource).toContain('ChallengeCreationValidationError');
    expect(controllerSource).toContain('const challengePayload = buildChallengeCreatePayload({');
    expect(controllerSource).toContain('Challenge.create(challengePayload, { transaction })');
    expect(controllerSource).toContain('updateManagedChallengeStatus: async (req, res)');
    expect(controllerSource).toContain('transitionManagedChallengeStatus({');
    expect(controllerSource).toContain('updateManagedChallengeAudience: async (req, res)');
    expect(controllerSource).toContain('replaceManagedChallengeAudience({');
    expect(controllerSource).toContain("where: { status: { [Op.ne]: 'draft' } }");
    expect(controllerSource).toContain("!challenge || challenge.status === 'draft' || challenge.isPublic !== true");
    expect(controllerSource).toMatch(/if \(challenge\.isPublic !== true \|\| challenge\.status === 'draft'\)[\s\S]*?message: 'Challenge not found'/);
    expect(controllerSource.indexOf('const existingParticipation = await ChallengeParticipant.findOne')).toBeLessThan(controllerSource.indexOf("if (challenge.isPublic !== true || challenge.status === 'draft')"));
    expect(joinChallengeSection).toContain("const reactivatingParticipation = existingParticipation?.status === 'quit';");
    expect(joinChallengeSection).toContain('if (existingParticipation && !reactivatingParticipation)');
    expect(joinChallengeSection).toContain('await existingParticipation.update({');
    expect(joinChallengeSection).toContain("status: 'joined'");
    expect(joinChallengeSection.indexOf('const reactivatingParticipation')).toBeLessThan(joinChallengeSection.indexOf('if (existingParticipation && !reactivatingParticipation)'));
    expect(controllerSource.indexOf("if (challenge.isPublic !== true || challenge.status === 'draft')")).toBeLessThan(controllerSource.indexOf("if (challenge.status !== 'active')"));
    expect(controllerSource).toContain('required: true');
    expect(challengeStatusSource).toContain("challenge.status !== 'draft'");
    expect(challengeStatusSource).toContain("visibility = 'public'");
    expect(challengeStatusSource).toContain('normalizePublishVisibility');
    expect(challengeStatusSource).toContain('assertPrivateAudienceReady');
    expect(challengeStatusSource).toContain('ChallengeParticipant.count');
    expect(challengeStatusSource).toContain('Private challenges require at least one saved audience member');
    expect(challengeStatusSource).toContain('transitionManagedChallengeStatus');
    expect(challengeStatusSource).toContain("complete: {");
    expect(challengeStatusSource).toContain("cancel: {");
    expect(challengeStatusSource).toContain("archive: {");
    expect(controllerSource).not.toContain("if (action !== 'publish')");
    expect(challengeStatusSource).toContain("isPublic: publishVisibility === 'public'");
    expect(controllerSource).toContain("const { action = 'publish', visibility = 'public' } = req.body ?? {};");
    expect(controllerSource).toContain('statusMessageForAction(action)');
    expect(controllerSource).toMatch(/viewer: req\.user,\r?\n        action,\r?\n        visibility,\r?\n      \}\);/);
    expect(challengeAudienceSource).toContain("challenge.status !== 'draft'");
    expect(challengeAudienceSource).toContain('ClientTrainerAssignment.count');
    expect(challengeAudienceSource).toContain("status: 'active'");
    expect(challengeAudienceSource).toContain('ChallengeParticipant.destroy');
    expect(challengeAudienceSource).toContain('ChallengeParticipant.bulkCreate');
    expect(challengeAudienceSource).toContain('currentParticipants: audienceIds.length');
    expect(challengeSubmissionControllerSource).toContain('getManagedChallengeSubmissions: async (req, res)');
    expect(challengeSubmissionControllerSource).toContain('getManagedChallengeSubmissionQueue');
    expect(challengeSubmissionControllerSource).toContain('moderateManagedChallengeSubmission: async (req, res)');
    expect(challengeSubmissionControllerSource).toContain('moderateManagedChallengeSubmission({');
    expect(challengeSubmissionControllerSource).toContain('const transaction = await db.transaction()');
    expect(challengeSubmissionControllerSource).toContain('await transaction.commit()');
    expect(challengeSubmissionControllerSource).toContain('await transaction.rollback()');
    expect(challengeSubmissionControllerSource).toContain('error.publicMessage');
    expect(challengeSubmissionControllerSource).toContain('error.statusCode');
    expect(challengeSubmissionControllerSource).not.toContain('error: error.message');
    expect(challengeSubmissionSource).toContain('getChallengeGovernancePolicy');
    expect(challengeSubmissionSource).toContain('submissions: []');
    expect(challengeSubmissionSource).toContain("queueStatus: 'empty_by_policy'");
    expect(routeSource).toContain("router.put('/challenges/:id/progress', authenticate, requireUser, challengeController.updateChallengeProgress)");
    expect(controllerSource).toContain('const parseManualProgressValue = (value) => {');
    expect(controllerSource).toContain("if (typeof value === 'number')");
    expect(controllerSource).toContain("if (typeof value === 'string')");
    expect(controllerSource).toContain('const trimmedValue = value.trim();');
    expect(controllerSource).toContain("if (trimmedValue === '') return null;");
    expect(controllerSource).toContain('return null;');
    expect(updateChallengeProgressSection).toContain('const progressValue = parseManualProgressValue(progress);');
    expect(updateChallengeProgressSection).toContain('if (progressValue === null)');
    expect(updateChallengeProgressSection).toContain("message: 'Progress value must be a non-negative number'");
    expect(updateChallengeProgressSection).toContain('const rawMaxProgress = Number(challenge.maxProgress);');
    expect(updateChallengeProgressSection).toContain('Number.isFinite(rawMaxProgress) && rawMaxProgress > 0 ? rawMaxProgress : 1');
    expect(updateChallengeProgressSection).toContain('progressValue / maxProgress');
    expect(updateChallengeProgressSection).toContain('Math.min(maxProgress, progressValue)');
    expect(controllerSource).toMatch(/if \(challenge\.status === 'draft' \|\| \(challenge\.isPublic !== true && !participation\)\)[\s\S]*?message: 'Challenge not found'/);
    expect(controllerSource.indexOf("if (challenge.status === 'draft' || (challenge.isPublic !== true && !participation))")).toBeLessThan(controllerSource.indexOf('if (!participation)'));
    expect(updateChallengeProgressSection).toMatch(/if \(challenge\.status !== 'active'\)[\s\S]*?message: 'Challenge is not active'/);
    expect(updateChallengeProgressSection).toMatch(/const now = new Date\(\);[\s\S]*?if \(now < challenge\.startDate\)[\s\S]*?message: 'Challenge has not started'/);
    expect(updateChallengeProgressSection).toMatch(/if \(now > challenge\.endDate\)[\s\S]*?message: 'Challenge has ended'/);
    expect(updateChallengeProgressSection.indexOf("if (challenge.status !== 'active')")).toBeLessThan(updateChallengeProgressSection.indexOf('const rawMaxProgress = Number(challenge.maxProgress);'));
    expect(updateChallengeProgressSection.indexOf('if (now > challenge.endDate)')).toBeLessThan(updateChallengeProgressSection.indexOf('const rawMaxProgress = Number(challenge.maxProgress);'));
    expect(routeSource).toContain("router.post('/challenges/:id/join', authenticate, requireUser, challengeController.joinChallenge)");
    expect(joinChallengeSection).toContain('const now = new Date();');
    expect(joinChallengeSection).toMatch(/if \(now < challenge\.startDate\)[\s\S]*?message: 'Challenge has not started'/);
    expect(joinChallengeSection.indexOf('if (now < challenge.startDate)')).toBeLessThan(joinChallengeSection.indexOf('if (now > challenge.endDate)'));
    expect(routeSource).toContain("router.get('/challenges/:id/leaderboard', authenticate, requireUser, challengeController.getChallengeLeaderboard)");
    expect(controllerSource).toMatch(/let leaderboardParticipation = null;[\s\S]*?if \(challenge\.isPublic !== true && challenge\.status !== 'draft'\) \{[\s\S]*?leaderboardParticipation = await ChallengeParticipant\.findOne\([\s\S]*?where: \{ challengeId: id, userId: req\.user\.id \}/);
    expect(controllerSource).toMatch(/if \(challenge\.status === 'draft' \|\| \(challenge\.isPublic !== true && !leaderboardParticipation\)\)[\s\S]*?message: 'Challenge not found'/);
    expect(controllerSource.indexOf('let leaderboardParticipation = null')).toBeLessThan(controllerSource.indexOf('if (!challenge.hasLeaderboard)'));
    expect(controllerSource.indexOf('leaderboardParticipation = await ChallengeParticipant.findOne')).toBeLessThan(controllerSource.indexOf('if (!challenge.hasLeaderboard)'));
    expect(routeSource).toContain("router.delete('/challenges/:id/leave', authenticate, requireUser, challengeController.leaveChallenge)");
    expect(leaveChallengeSection).toMatch(/if \(!challenge \|\| challenge\.status === 'draft'\)[\s\S]*?message: 'Challenge not found'/);
        expect(leaveChallengeSection.indexOf("const challenge = await Challenge.findByPk(id, { transaction });")).toBeLessThan(leaveChallengeSection.indexOf("if (participation.status === 'completed')"));
    expect(leaveChallengeSection).not.toContain('participation.destroy');
    expect(leaveChallengeSection).toContain('const leftAt = new Date();');
    expect(leaveChallengeSection).toContain('await participation.update({');
    expect(leaveChallengeSection).toContain("status: 'quit'");
    expect(leaveChallengeSection).toContain('lastProgressUpdate: leftAt');
    expect(leaveChallengeSection).toContain("if (participation.status === 'quit')");
    expect(leaveChallengeSection).toContain("sourceType: 'challenge_left'");
    expect(leaveChallengeSection).toContain('occurredAt: leftAt.toISOString()');
    expect(leaveChallengeSection.indexOf("if (participation.status === 'completed')")).toBeLessThan(leaveChallengeSection.indexOf('await participation.update({'));
    expect(challengeParticipantModelSource).toContain("DataTypes.ENUM('joined', 'active', 'completed', 'failed', 'quit', 'disqualified')");
    expect(routeSource).toContain("router.get('/users/:userId/challenges', authenticate, authorizeResourceAccess('userId'), challengeController.getUserChallenges)");
    expect(adminGamificationSource).toContain("authAxios.get('/api/v1/gamification/challenges'");
    expect(adminGamificationSource).toContain('`/api/v1/gamification/users/${clientId}/challenges`');
    expect(useChallengesSource).toContain("apiService.get('/api/v1/gamification/challenges'");
  });

  it('exposes a public aggregate challenge view endpoint without viewer identity capture', () => {
    const viewRouteIndex = routeSource.indexOf("router.post('/challenges/:id/view'");
    const detailRouteIndex = routeSource.indexOf("router.get('/challenges/:id'");

    expect(routeSource).toContain("import challengeEngagementController from '../controllers/challengeEngagementController.mjs';");
    expect(routeSource).toContain('const challengeViewLimiter = rateLimit({');
    expect(routeSource).toContain('standardHeaders: true');
    expect(routeSource).toContain('legacyHeaders: false');
    expect(routeSource).toContain("router.post('/challenges/:id/view', challengeViewLimiter, challengeEngagementController.recordChallengeView)");
    expect(viewRouteIndex).toBeGreaterThan(-1);
    expect(detailRouteIndex).toBeGreaterThan(-1);
    expect(viewRouteIndex).toBeLessThan(detailRouteIndex);
    expect(challengeEngagementControllerSource).toContain('recordPublicChallengeViewById({');
    expect(challengeEngagementControllerSource).toContain('Challenge: models?.Challenge');
    expect(challengeEngagementControllerSource).toContain('challengeId: req.params.id');
    expect(challengeEngagementControllerSource).toContain('recorded: result.recorded');
    expect(challengeEngagementControllerSource).toContain('viewCount: result.viewCount');
    expect(challengeEngagementControllerSource).not.toContain('req.user');
    expect(challengeEngagementControllerSource).not.toContain('req.ip');
    expect(challengeEngagementControllerSource).not.toContain('req.headers');
    expect(challengeEngagementControllerSource).not.toContain('error.message');
  });
  it('keeps client challenge submission intake fail-closed behind policy routes', () => {
    const policyRouteIndex = routeSource.indexOf("router.get('/challenge-submissions/policy'");
    const createRouteIndex = routeSource.indexOf("router.post('/challenge-submissions'");
    const moderationRouteIndex = routeSource.indexOf("router.patch('/challenge-submissions/:id/moderation'");
    const challengeDetailRouteIndex = routeSource.indexOf("router.get('/challenges/:id'");

    expect(routeSource).toContain("router.get('/challenge-submissions/policy', authenticate, requireUser, challengeSubmissionController.getClientChallengeSubmissionPolicy)");
    expect(routeSource).toContain("router.post('/challenge-submissions', authenticate, requireUser, challengeSubmissionController.createClientChallengeSubmission)");
    expect(policyRouteIndex).toBeGreaterThan(-1);
    expect(createRouteIndex).toBeGreaterThan(-1);
    expect(moderationRouteIndex).toBeGreaterThan(-1);
    expect(challengeDetailRouteIndex).toBeGreaterThan(-1);
    expect(policyRouteIndex).toBeLessThan(moderationRouteIndex);
    expect(createRouteIndex).toBeLessThan(moderationRouteIndex);
    expect(createRouteIndex).toBeLessThan(challengeDetailRouteIndex);
    expect(challengeSubmissionControllerSource).toContain('getClientChallengeSubmissionPolicy: async (req, res)');
    expect(challengeSubmissionControllerSource).toContain('createClientChallengeSubmission: async (req, res)');
    expect(challengeSubmissionControllerSource).toContain("import UserFeatureFlag from '../models/UserFeatureFlag.mjs';");
    expect(challengeSubmissionControllerSource).toContain('const getChallengeSubmissionModels = () => ({ ...getAllModels(), UserFeatureFlag });');
    expect(challengeSubmissionControllerSource).toContain('getClientChallengeSubmissionPolicy({');
    expect(challengeSubmissionControllerSource).toContain('models: getChallengeSubmissionModels()');
    expect(challengeSubmissionControllerSource).toContain('createClientChallengeSubmission({');
    expect(challengeSubmissionControllerSource).toContain('viewer: req.user');
    expect(challengeSubmissionControllerSource).toContain('const logChallengeSubmissionError = (message, error) => {');
    expect(challengeSubmissionControllerSource).toContain('if (statusCode >= 500)');
    expect(challengeSubmissionControllerSource).toContain('logger.warn(message, meta)');
    expect(challengeSubmissionSource).toContain('getClientChallengeSubmissionPolicy');
    expect(challengeSubmissionSource).toContain('createClientChallengeSubmission');
    expect(challengeSubmissionEntitlementSource).toContain("requiredEntitlement: CLIENT_CHALLENGE_FEATURE_KEY");
    expect(challengeSubmissionEntitlementSource).toContain("clientCreation: canSubmit ? 'entitlement_enabled' : 'disabled_by_default'");
  });
  it('keeps challenge submission approval storage attached to the gamification challenge table', () => {
    expect(challengeModelSource).toContain("tableName: 'challenges'");
    expect(challengeSubmissionModelSource).toContain("tableName: 'challenge_submissions'");
    expect(challengeSubmissionModelSource).toContain("approvedChallengeId: { type: DataTypes.UUID");
    expect(associationsSource).toContain("ChallengeSubmission.belongsTo(Challenge, { foreignKey: 'approvedChallengeId', as: 'approvedChallenge' })");
    expect(challengeSubmissionMigrationSource).toContain("approved_challenge_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'challenges', key: 'id' }");
    expect(challengeSubmissionMigrationSource).not.toContain("references: { model: 'Challenges', key: 'id' }");
  });

  it('records public challenge detail views after visibility is proven', () => {
    const detailSection = controllerSource.slice(
      controllerSource.indexOf('getChallengeById: async'),
      controllerSource.indexOf('createChallenge: async'),
    );
    const notViewableGuardIndex = detailSection.indexOf("if (!challenge || challenge.status === 'draft' || challenge.isPublic !== true)");
    const viewTrackingIndex = detailSection.indexOf('const viewTracking = await recordChallengeView({');
    const responseMapperIndex = detailSection.indexOf('const challengeWithMetrics = {');

    expect(controllerSource).toContain("from '../services/gamification/challengeEngagementService.mjs'");
    expect(notViewableGuardIndex).toBeGreaterThan(-1);
    expect(viewTrackingIndex).toBeGreaterThan(-1);
    expect(responseMapperIndex).toBeGreaterThan(-1);
    expect(notViewableGuardIndex).toBeLessThan(viewTrackingIndex);
    expect(viewTrackingIndex).toBeLessThan(responseMapperIndex);
    expect(detailSection).toContain('Challenge,');
    expect(detailSection).toContain('challenge,');
    expect(detailSection).toContain('viewCount: viewTracking.viewCount,');
    expect(detailSection).not.toContain('req.user');
    expect(detailSection).not.toContain('req.ip');
  });
  it('does not echo raw challenge exception details to API clients', () => {
    expect(controllerSource).toContain("const INTERNAL_ERROR = 'Internal server error';");
    expect(controllerSource).toContain('const sendChallengeError =');
    expect(controllerSource).not.toContain('error: error.message');
  });

  it('does not advertise retired wellness categories in active challenge filters', () => {
    expect(challengeListSource).toContain("categories: ['fitness', 'nutrition', 'social', 'streak', 'dance', 'music', 'art', 'gaming', 'community_meetup']");
    expect(challengeListSource).not.toContain("categories: ['fitness', 'nutrition', 'mindfulness'");
  });

  it('strictly normalizes challenge pagination, leaderboard limits, and difficulty filters', () => {
    expect(challengeListSource).toContain('const normalizedDifficulty = parseOptionalBoundedPositiveInteger(difficulty, 1, 5);');
    expect(challengeListSource).toContain('const normalizedPage = parsePositiveInteger(page, 1);');
    expect(challengeListSource).toContain('const normalizedLimit = parseBoundedPositiveInteger(limit, 20, 100);');
    expect(challengeListSource).toContain('const offset = (normalizedPage - 1) * normalizedLimit;');
    expect(challengeListSource).toContain('whereClause.difficulty = normalizedDifficulty;');
    expect(challengeListSource).toContain("if (viewer?.role === 'trainer') whereClause.createdBy = normalizeViewerId(viewer);");
    expect(challengeListSource).toContain('limit: normalizedLimit');
    expect(challengeListSource).toContain('page: normalizedPage');
    expect(controllerSource).not.toContain('parseInt(');
  });
});






