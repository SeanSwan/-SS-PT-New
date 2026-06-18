import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('SocialLike reaction type schema repair', () => {
  it('adds a deploy-safe repair migration for SocialLikes.reactionType drift', () => {
    const migrationPath = resolve(
      __dirname,
      '../../migrations/20260618000002-repair-social-likes-reaction-type.cjs',
    );
    expect(existsSync(migrationPath)).toBe(true);

    const migration = readFileSync(migrationPath, 'utf8').replace(/\r\n/g, '\n');
    expect(migration).toContain("const TABLE_NAME = 'SocialLikes'");
    expect(migration).toContain("const REACTION_COLUMN = 'reactionType'");
    expect(migration).toContain("table_name = '${TABLE_NAME}'");
    expect(migration).toContain("columns[REACTION_COLUMN]");
    expect(migration).toContain("defaultValue: 'swan'");
    expect(migration).toContain('allowNull: false');
    expect(migration).toMatch(/UPDATE "\$\{TABLE_NAME\}"\s+SET "\$\{REACTION_COLUMN\}" = 'swan'/);
    expect(migration).toContain("const UNIQUE_LIKE_INDEX = 'unique_like'");
    expect(migration).toContain("const UNIQUE_REACTION_INDEX = 'unique_reaction'");
    expect(migration).toContain('await queryInterface.removeIndex(TABLE_NAME, UNIQUE_LIKE_INDEX)');
    expect(migration).toContain("fields: ['userId', 'targetType', 'targetId', REACTION_COLUMN]");
    expect(migration).toContain('await queryInterface.addIndex(TABLE_NAME');
  });
});
