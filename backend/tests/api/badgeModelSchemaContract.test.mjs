import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('badge model and creator route schema contract', () => {
  it('maps the Badge model to the migrated production badge table', () => {
    const modelSource = readFileSync(resolve(__dirname, '../../models/Badge.mjs'), 'utf8');

    expect(modelSource).toMatch(/tableName:\s*'Badges'/);
    expect(modelSource).toContain("import sequelize from '../database.mjs'");
    for (const column of ['difficulty', 'criteriaType', 'criteria', 'rewards', 'collectionId', 'isActive', 'createdBy']) {
      expect(modelSource).toContain(`${column}:`);
    }

    for (const unsupportedColumn of ['xpReward:', 'rarity:', 'assignedTo:', 'assignedTarget:', 'prompt:', 'style:', 'isAnimated:', 'isShared:', 'sharedBy:', 'batchGroupId:', 'secondaryStyle:']) {
      expect(modelSource).not.toContain(unsupportedColumn);
    }

    expect(modelSource).toContain('createdBy: {');
    expect(modelSource).toContain('type: DataTypes.INTEGER');
  });

  it('ships a production CJS migration that reconciles badge user references to integer User ids', () => {
    const migrationSource = readFileSync(
      resolve(__dirname, '../../migrations/20260628090000-reconcile-badge-system-user-fks.cjs'),
      'utf8'
    );

    expect(migrationSource).toContain('UserBadges');
    expect(migrationSource).toContain('BadgeCollections');
    expect(migrationSource).toContain('Badges');
    expect(migrationSource).toContain('Sequelize.INTEGER');
    expect(migrationSource).toContain('createdBy');
    expect(migrationSource).toContain('awardedBy');
  });

  it('persists badge creator metadata through canonical JSON fields instead of non-existent columns', () => {
    const routeSource = readFileSync(resolve(__dirname, '../../routes/badgeCreatorRoutes.mjs'), 'utf8');

    expect(routeSource).toContain("criteriaType: 'custom_criteria'");
    expect(routeSource).toContain('createdBy: req.user.id');
    expect(routeSource).toContain('rewards: {');
    expect(routeSource).toContain('metadata: {');
    expect(routeSource).not.toContain('where: { isShared: true }');
    expect(routeSource).not.toContain('badge.update({ isShared: true');
    expect(routeSource).not.toContain('badge.update({ isShared: false');
  });

  it('loads tab icon overrides from badge criteria metadata instead of removed assignment columns', () => {
    const coreRouteSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

    expect(coreRouteSource).not.toContain("where: { assignedTo: 'tab' }");
    expect(coreRouteSource).not.toContain("attributes: ['assignedTarget', 'imageUrl', 'name']");
    expect(coreRouteSource).toContain("criteriaType: 'custom_criteria'");
    expect(coreRouteSource).toContain("assignment.assignedTo === 'tab'");
  });
});
