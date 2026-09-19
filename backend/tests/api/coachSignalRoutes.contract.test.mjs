import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/social/coachSignalRoutes.mjs'), 'utf8');
const mountSource = readFileSync(resolve(__dirname, '../../routes/social/index.mjs'), 'utf8');
const modelSource = readFileSync(resolve(__dirname, '../../models/social/CoachSignal.mjs'), 'utf8');
const migrationSource = readFileSync(resolve(__dirname, '../../migrations/20260916-create-coach-signals.cjs'), 'utf8');
const socialLikeSource = readFileSync(resolve(__dirname, '../../models/social/SocialLike.mjs'), 'utf8');

describe('coach signal route security contract', () => {
  it('keeps every coach signal endpoint behind authentication', () => {
    expect(routeSource).toContain("router.post('/', protect");
    expect(routeSource).toContain("router.get('/received', protect");
    expect(mountSource).toContain("router.use('/coach-signals', coachSignalRoutes)");
  });

  it('enforces coach role, active assignment, daily cap, and duplicate guard', () => {
    expect(routeSource).toContain("COACH_ROLES.has(req.user?.role)");
    expect(routeSource).toContain('DAILY_SIGNAL_CAP = 5');
    expect(routeSource).toContain('429');
    expect(routeSource).toContain('409');
  });

  it('queries the real assignment columns (status, never isActive) per rule 58', () => {
    expect(routeSource).toContain('trainerId: req.user.id');
    expect(routeSource).toContain('clientId: post.userId');
    expect(routeSource).not.toContain('isActive');
  });

  // Hostile review F2.3 (2026-09-18): status is STRING allowNull:true default 'active',
  // so a legacy NULL-status row must still count as an active assignment. SQL NULL never
  // matches `IN (...)`, so NULL must be expressed with Op.is, not an array entry.
  it('treats a NULL assignment status as active instead of denying a legitimate coach', () => {
    expect(routeSource).toContain("[{ status: 'active' }, { status: { [Op.is]: null } }]");
    expect(routeSource).not.toContain("status: { [Op.or]: ['active', null] }");
  });

  // Hostile review F2.1 (2026-09-18, CRITICAL): req.user.id is a STRING
  // (authMiddleware.mjs:357 toStringId) while post.userId is an INTEGER -> JS number.
  // A raw `===` is always false, so the self-signal guard never fired. Every id
  // comparison in the route must normalize both sides.
  it('compares ids by normalized value, never raw strict equality', () => {
    expect(routeSource).toContain('const sameId = (a, b) =>');
    expect(routeSource).toContain('sameId(post.userId, req.user.id)');
    expect(routeSource).not.toMatch(/post\.userId === req\.user\.id/);
  });

  // Hostile review F2.4 (2026-09-18): silent truncation of user input is worse than 422.
  it('rejects an over-length note with 422 instead of silently truncating it', () => {
    expect(routeSource).not.toMatch(/note\.trim\(\)\.slice\(/);
    expect(routeSource).toContain('candidate.length > NOTE_MAX_LENGTH');
    expect(routeSource).toContain('characters or fewer');
  });

  it('creates the bell entry through the canonical notification service', () => {
    expect(routeSource).toContain("from '../../controllers/notificationController.mjs'");
    expect(routeSource).toContain("type: 'coach_signal'");
  });

  it('keeps the dedicated model — SocialLike reactionType ENUM is untouched', () => {
    expect(modelSource).toContain("tableName: 'CoachSignals'");
    expect(modelSource).toContain("model: 'Users'");
    expect(socialLikeSource).toContain("['thumbs_up', 'heart', 'swan']");
    expect(socialLikeSource).not.toContain('coach_signal');
  });

  it('never echoes raw database errors to the client', () => {
    expect(routeSource).not.toContain('error: error.message');
    expect(routeSource).not.toContain('error.message }');
  });
});

describe('coach signal schema contract', () => {
  // Hostile review F3.1 (2026-09-18): the migration creates updatedAt as NOT NULL, so a
  // model that disables it is the model-vs-DB drift class rule 58 exists to catch.
  it('keeps the model in step with the migration on timestamps', () => {
    expect(migrationSource).toContain('updatedAt');
    expect(modelSource).not.toContain('updatedAt: false');
    expect(modelSource).toContain('timestamps: true');
  });

  // Hostile review F3.4 (2026-09-18): a coach's recognition is the member's record and
  // must survive deletion of the post it was attached to.
  it('preserves signal history when a post is deleted (SET NULL, not CASCADE)', () => {
    expect(migrationSource).toContain("onDelete: 'SET NULL'");
    expect(migrationSource).not.toMatch(/postId:[\s\S]*?onDelete: 'CASCADE'/);
  });

  // Rule 58 / hostile review F1.2: migrations in a subdirectory never run on deploy
  // (backend/scripts/safe-migrate.mjs:146 is a non-recursive readdirSync).
  it('lives in the top-level migrations directory so it actually runs on deploy', () => {
    expect(migrationSource).toContain("createTable('CoachSignals'");
    expect(migrationSource).toContain("references: { model: 'Users', key: 'id' }");
    expect(migrationSource).toContain("references: { model: 'SocialPosts', key: 'id' }");
  });
});
