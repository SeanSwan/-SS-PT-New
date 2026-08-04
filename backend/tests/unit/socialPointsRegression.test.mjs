import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');

const readBackendFile = (relativePath) =>
  fs.readFileSync(path.join(backendRoot, relativePath), 'utf8');

describe('social point award regression', () => {
  it('keeps social engagement as a valid point transaction source', () => {
    const modelSource = readBackendFile('models/PointTransaction.mjs');
    const serviceSource = readBackendFile('services/gamification/GamificationPointsService.mjs');
    const createMigration = readBackendFile('migrations/retired-mjs-20260804/20250505001600-create-point-transactions.mjs');
    const bootstrapMigration = readBackendFile('migrations/20260302050000-gamification-bootstrap.cjs');
    const deployMigration = readBackendFile('migrations/retired-mjs-20260804/20260509000001-add-social-engagement-point-source.mjs');

    expect(modelSource).toContain("'social_engagement'");
    expect(modelSource).toContain("'goal_milestone'");
    expect(modelSource).toContain("'goal_completed'");
    expect(modelSource).toMatch(/idempotencyKey:\s*\{/);
    expect(serviceSource).toContain('withIdempotencyMetadata(metadata, normalizedKey)');
    expect(serviceSource).toMatch(/idempotencyKey:\s*normalizedKey/);
    expect(createMigration).toContain("'social_engagement'");
    expect(createMigration).toContain("'goal_milestone'");
    expect(createMigration).toContain("'goal_completed'");
    expect(createMigration).toContain('idempotencyKey');
    expect(bootstrapMigration).toContain("'social_engagement'");
    expect(bootstrapMigration).toContain("'goal_milestone'");
    expect(bootstrapMigration).toContain("'goal_completed'");
    expect(deployMigration).toMatch(/ADD VALUE IF NOT EXISTS 'social_engagement'/);
    expect(deployMigration).toMatch(/ADD VALUE IF NOT EXISTS 'goal_milestone'/);
    expect(deployMigration).toMatch(/ADD VALUE IF NOT EXISTS 'goal_completed'/);
    expect(deployMigration).toMatch(/addColumn\('PointTransactions', 'idempotencyKey'/);
    expect(deployMigration).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS "point_transactions_user_source_idempotency_key"/);
  });

  it('routes social actions through the central point ledger with duplicate protection', () => {
    const routeSource = readBackendFile('routes/social/posts.mjs');

    expect(routeSource).toContain('GamificationPointsService');
    expect(routeSource).toMatch(/recordLedgerEntry\(\{[\s\S]*source:\s*'social_engagement'[\s\S]*idempotencyKey:/);
    expect(routeSource).not.toMatch(/PointTransaction\.create\(\{[\s\S]*source:\s*'social_engagement'/);
  });

  it('routes the trainer/admin award-points endpoint through the central ledger', () => {
    const controllerSource = readBackendFile('controllers/gamificationController.mjs');

    expect(controllerSource).toContain('GamificationPointsService');
    expect(controllerSource).toMatch(/GamificationPointsService\.recordLedgerEntry/);
    expect(controllerSource).not.toMatch(/const\s+pointTransaction\s*=\s*await\s+PointTransaction\.create\(\{[\s\S]*source,/);
  });
});
