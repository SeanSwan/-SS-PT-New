/**
 * Read-only probe: legacy normalized sets store vs canonical workout_logs.
 * Prints structural facts only — row counts, per-client legacy footprint, and
 * legacy sets with no canonical counterpart on (session, normalized exercise
 * name, setNumber). Run once at the Workout-OS C5 deploy to confirm the
 * repo-documented "0 rows in prod" finding still holds; if it does, the
 * legacy tables are retire-candidates for a later Sean-approved cleanup.
 * Usage: node backend/scripts/inspect-workout-set-store-drift.mjs
 * (reads DATABASE_URL from env/.env — never writes)
 */
import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  const counts = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM workout_exercises) AS legacy_exercises,
      (SELECT COUNT(*) FROM sets)              AS legacy_sets,
      (SELECT COUNT(*) FROM workout_logs)      AS canonical_logs
  `);
  console.log('[row counts]', counts.rows[0]);

  const perClient = await client.query(`
    SELECT ws."userId", COUNT(DISTINCT we.id) AS legacy_exercises, COUNT(s.id) AS legacy_sets
    FROM workout_exercises we
    JOIN workout_sessions ws ON ws.id = we."workoutSessionId"
    LEFT JOIN sets s ON s."workoutExerciseId" = we.id
    GROUP BY ws."userId"
    ORDER BY legacy_sets DESC
    LIMIT 20
  `);
  console.log('[legacy footprint per client — top 20]', perClient.rows.length ? perClient.rows : 'NONE');

  // Legacy working sets with no canonical row at the same
  // (session, normalized name, setNumber) — the drift that would need rescue.
  const orphans = await client.query(`
    SELECT COUNT(*) AS legacy_sets_without_canonical
    FROM sets s
    JOIN workout_exercises we ON we.id = s."workoutExerciseId"
    JOIN "Exercises" e ON e.id = we."exerciseId"
    WHERE s."setType" = 'working'
      AND NOT EXISTS (
        SELECT 1 FROM workout_logs wl
        WHERE wl."sessionId" = we."workoutSessionId"
          AND LOWER(TRIM(wl."exerciseName")) = LOWER(TRIM(e.name))
          AND wl."setNumber" = s."setNumber"
      )
  `);
  console.log('[reconciliation]', orphans.rows[0]);
} finally {
  await client.end();
}
