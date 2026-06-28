'use strict';

/**
 * Reconcile badge-system user foreign keys with SwanStudios integer Users.id.
 * The old .mjs badge migrations were ignored by sequelize-cli and some manual
 * runners used UUID creator fields, so this active CJS migration creates or
 * repairs only the badge tables needed by automatic badge awards.
 */

const enumSql = (name, values) => `
DO $$ BEGIN
  CREATE TYPE "${name}" AS ENUM (${values.map(v => `'${v}'`).join(', ')});
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;`;

async function tableExists(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    { bind: [tableName] }
  );
  return rows.length > 0;
}

async function columnType(queryInterface, tableName, columnName) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1`,
    { bind: [tableName, columnName] }
  );
  return rows[0]?.data_type || null;
}

async function hasNonIntegerText(queryInterface, tableName, columnName) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT EXISTS (
       SELECT 1 FROM "${tableName}"
       WHERE "${columnName}" IS NOT NULL AND "${columnName}"::text !~ '^\\d+$'
     ) AS bad`
  );
  return rows[0]?.bad === true;
}

async function ensureIntegerUserColumn(queryInterface, tableName, columnName, allowNull = false) {
  if (!(await tableExists(queryInterface, tableName))) return;
  const type = await columnType(queryInterface, tableName, columnName);
  if (!type || type === 'integer') return;
  if (await hasNonIntegerText(queryInterface, tableName, columnName)) {
    console.warn(`[badge-fk] ${tableName}.${columnName} has non-integer values; leaving column unchanged`);
    return;
  }
  await queryInterface.sequelize.query(
    `ALTER TABLE "${tableName}"
       ALTER COLUMN "${columnName}" TYPE INTEGER
       USING NULLIF("${columnName}"::text, '')::integer`
  );
  await queryInterface.sequelize.query(
    `ALTER TABLE "${tableName}" ALTER COLUMN "${columnName}" ${allowNull ? 'DROP' : 'SET'} NOT NULL`
  );
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const integerType = Sequelize.INTEGER;
    void integerType;

    await queryInterface.sequelize.query(enumSql('enum_BadgeCollections_theme', [
      'skill_based', 'challenge_based', 'seasonal', 'achievement_series', 'custom'
    ]));
    await queryInterface.sequelize.query(enumSql('enum_Badges_category', [
      'strength', 'cardio', 'skill', 'flexibility', 'endurance', 'general'
    ]));
    await queryInterface.sequelize.query(enumSql('enum_Badges_difficulty', [
      'beginner', 'intermediate', 'advanced', 'expert'
    ]));
    await queryInterface.sequelize.query(enumSql('enum_Badges_criteriaType', [
      'exercise_completion', 'streak_achievement', 'challenge_completion',
      'social_engagement', 'milestone_reached', 'custom_criteria'
    ]));
    await queryInterface.sequelize.query(enumSql('earning_type_enum', [
      'automatic', 'manual', 'challenge', 'referral', 'purchase'
    ]));

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "BadgeCollections" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        theme "enum_BadgeCollections_theme" NOT NULL DEFAULT 'custom',
        "badgeCount" INTEGER NOT NULL DEFAULT 0,
        metadata JSONB DEFAULT '{}',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdBy" INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "Badges" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT NOT NULL,
        category "enum_Badges_category" NOT NULL DEFAULT 'general',
        difficulty "enum_Badges_difficulty" NOT NULL DEFAULT 'beginner',
        "imageUrl" VARCHAR(255),
        "criteriaType" "enum_Badges_criteriaType" NOT NULL,
        criteria JSONB NOT NULL DEFAULT '{}',
        rewards JSONB NOT NULL DEFAULT '{"points":100}',
        "collectionId" UUID REFERENCES "BadgeCollections"(id) ON DELETE SET NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdBy" INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "UserBadges" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
        "badgeId" UUID NOT NULL REFERENCES "Badges"(id) ON DELETE CASCADE,
        "earnedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "earningType" earning_type_enum NOT NULL DEFAULT 'automatic',
        "earningContext" JSONB DEFAULT '{}',
        "awardedBy" INTEGER REFERENCES "Users"(id) ON DELETE SET NULL,
        "isDisplayed" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT unique_user_badge_ownership UNIQUE ("userId", "badgeId")
      );
    `);

    await ensureIntegerUserColumn(queryInterface, 'BadgeCollections', 'createdBy');
    await ensureIntegerUserColumn(queryInterface, 'Badges', 'createdBy');
    await ensureIntegerUserColumn(queryInterface, 'UserBadges', 'userId');
    await ensureIntegerUserColumn(queryInterface, 'UserBadges', 'awardedBy', true);

    for (const sql of [
      'CREATE INDEX IF NOT EXISTS idx_badges_criteria_type ON "Badges"("criteriaType")',
      'CREATE INDEX IF NOT EXISTS idx_badges_is_active ON "Badges"("isActive")',
      'CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON "UserBadges"("userId")',
      'CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON "UserBadges"("badgeId")',
      'CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON "UserBadges"("earnedAt" DESC)'
    ]) {
      await queryInterface.sequelize.query(sql);
    }
  },

  async down() {
    // Reconciliation migration: intentionally no destructive rollback.
  }
};
