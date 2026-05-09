/**
 * Migration: add active point source values and idempotency guard.
 *
 * Purpose:
 * Social feed and goal actions award points through PointTransaction.
 * Production Postgres enum values must include every active source, and
 * repeated social requests need an idempotency key so visible User.points
 * cannot be incremented twice for the same action.
 *
 * Rollback:
 * PostgreSQL cannot safely remove an enum value while rows may reference it,
 * so down is intentionally a no-op.
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_PointTransactions_source') THEN
        ALTER TYPE "enum_PointTransactions_source" ADD VALUE IF NOT EXISTS 'social_engagement';
        ALTER TYPE "enum_PointTransactions_source" ADD VALUE IF NOT EXISTS 'goal_milestone';
        ALTER TYPE "enum_PointTransactions_source" ADD VALUE IF NOT EXISTS 'goal_completed';
      END IF;
    END
    $$;
  `);

  const table = await queryInterface.describeTable('PointTransactions');
  if (!table.idempotencyKey) {
    await queryInterface.addColumn('PointTransactions', 'idempotencyKey', {
      type: Sequelize.STRING(128),
      allowNull: true
    });
  }

  await queryInterface.sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "point_transactions_user_source_idempotency_key"
    ON "PointTransactions" ("userId", "source", "idempotencyKey")
    WHERE "idempotencyKey" IS NOT NULL;
  `);
}

export async function down(queryInterface) {
  await queryInterface.sequelize.query('DROP INDEX IF EXISTS "point_transactions_user_source_idempotency_key";');
  await queryInterface.removeColumn('PointTransactions', 'idempotencyKey');
  // No-op for enum values: removing a PostgreSQL enum value is not safe once production rows exist.
}
