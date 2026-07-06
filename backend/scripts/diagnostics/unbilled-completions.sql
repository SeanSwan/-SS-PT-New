-- unbilled-completions.sql (Slice 0.1 reconciliation DIAGNOSTIC — READ-ONLY)
-- ==========================================================================
-- Quantifies historically completed sessions for billable clients that were
-- never deducted AND were not billed through the workout-log lane.
-- No waive-reason predicate exists because no waive artifact existed before
-- Slice 0.1 — every row returned is an unexplained non-billed completion.
--
-- RUN: Render shell (psql $DATABASE_URL), read-only. Do NOT wrap in any
-- UPDATE/backfill. Retroactive deduction requires Sean's written approval
-- of the quantified list (handoff v2 §4.5).
SELECT COUNT(*)                       AS completed_unbilled_no_waive,
       MIN(s."sessionDate")           AS earliest,
       MAX(s."sessionDate")           AS latest
FROM sessions s
JOIN "Users" u ON u.id = s."userId"
WHERE s.status = 'completed'
  AND s."sessionDeducted" = false
  AND s."deletedAt" IS NULL
  AND s."userId" IS NOT NULL
  AND LOWER(REGEXP_REPLACE(COALESCE(u."clientSource", 'swanstudios'), '[\s-]+', '_', 'g'))
      NOT IN ('move_fitness', 'movefitness', 'external')
  AND LOWER(REGEXP_REPLACE(COALESCE(u."sessionBillingMode", 'paid_sessions'), '[\s-]+', '_', 'g'))
      NOT IN ('no_session_required', 'no_pay', 'nopay', 'no_session', 'no_sessions', 'free_session', 'free_sessions', 'free_training')
  AND NOT EXISTS (
    SELECT 1
    FROM daily_workout_forms f
    WHERE f."clientId" = s."userId"
      AND f."sessionDeducted" = true
      AND f.date = (s."sessionDate")::date
  );

-- Per-client breakdown (same filters), most affected first:
-- SELECT s."userId", COUNT(*) AS unbilled, MIN(s."sessionDate") AS earliest, MAX(s."sessionDate") AS latest
-- FROM sessions s JOIN "Users" u ON u.id = s."userId"
-- WHERE <same predicates as above>
-- GROUP BY s."userId" ORDER BY unbilled DESC;
