-- Index remediation, generated 2026-08-13T01:01:09.299Z
-- READ FIRST — this file is reviewed and executed BY A HUMAN, off-peak, never by boot:
--   * CONCURRENTLY cannot run inside a transaction: run statements as-is, no BEGIN/COMMIT.
--   * Each statement briefly uses two table scans but takes NO write-blocking lock.
--   * If a build is interrupted it leaves an INVALID index: find with
--       SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
--     then DROP INDEX <name>; and re-run its statement.
--   * IF NOT EXISTS makes re-runs safe.
-- 101 statement(s); 2 declared index(es) skipped as unresolvable (listed at end).

CREATE INDEX CONCURRENTLY IF NOT EXISTS "achievements_category_rarity" ON "Achievements" ("category", "rarity");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "achievements_is_active_is_hidden" ON "Achievements" ("isActive", "isHidden");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "achievements_difficulty" ON "Achievements" ("difficulty");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "achievements_total_unlocked" ON "Achievements" ("totalUnlocked");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "achievements_unlock_rate" ON "Achievements" ("unlockRate");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "achievements_is_premium" ON "Achievements" ("isPremium");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "achievements_available_from_available_until" ON "Achievements" ("availableFrom", "availableUntil");
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "user_achievements_user_id_achievement_id" ON "UserAchievements" ("userId", "achievementId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "user_achievements_user_id_is_completed" ON "UserAchievements" ("userId", "isCompleted");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "user_achievements_earned_at" ON "UserAchievements" ("earnedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "challenges_challenge_type_status" ON "challenges" ("challengeType", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "challenges_category_difficulty" ON "challenges" ("category", "difficulty");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "challenges_start_date_end_date" ON "challenges" ("startDate", "endDate");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "challenges_created_by" ON "challenges" ("createdBy");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "challenges_is_premium_is_featured" ON "challenges" ("isPremium", "isFeatured");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "challenges_completion_rate" ON "challenges" ("completionRate");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "challenges_engagement_score" ON "challenges" ("engagementScore");
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "challenge_participants_user_id_challenge_id" ON "challenge_participants" ("userId", "challengeId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "challenge_participants_challenge_id_status" ON "challenge_participants" ("challengeId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "challenge_participants_user_id_status" ON "challenge_participants" ("userId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "challenge_participants_challenge_id_rank" ON "challenge_participants" ("challengeId", "rank");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "challenge_participants_challenge_id_score" ON "challenge_participants" ("challengeId", "score");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "challenge_participants_challenge_id_progress_percentage" ON "challenge_participants" ("challengeId", "progressPercentage");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "challenge_participants_team_id" ON "challenge_participants" ("teamId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "challenge_participants_last_progress_update" ON "challenge_participants" ("lastProgressUpdate");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "challenge_submissions_status_submitted_at" ON "challenge_submissions" ("status", "submitted_at");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "challenge_submissions_submitted_by_user_id_created_at" ON "challenge_submissions" ("submitted_by_user_id", "created_at");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "challenge_submissions_assigned_trainer_id_status" ON "challenge_submissions" ("assigned_trainer_id", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "challenge_submissions_moderation_status" ON "challenge_submissions" ("moderation_status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "goals_user_id_status" ON "goals" ("userId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "goals_category_priority" ON "goals" ("category", "priority");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "goals_deadline_status" ON "goals" ("deadline", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "goals_user_id_category_status" ON "goals" ("userId", "category", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "goals_progress_percentage" ON "goals" ("progressPercentage");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "goals_is_public_status" ON "goals" ("isPublic", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "goals_last_progress_update" ON "goals" ("lastProgressUpdate");
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "streaks_user_id_streak_type" ON "streaks" ("userId", "streakType");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "streaks_user_id_is_active" ON "streaks" ("userId", "isActive");
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "goal_supporters_goal_id_supporter_id" ON "goal_supporters" ("goalId", "supporterId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "goal_supporters_supporter_id" ON "goal_supporters" ("supporterId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "goal_supporters_goal_id" ON "goal_supporters" ("goalId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "goal_comments_goal_id_created_at" ON "goal_comments" ("goalId", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "goal_comments_user_id" ON "goal_comments" ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "goal_comments_comment_type" ON "goal_comments" ("commentType");
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "goal_likes_goal_id_user_id_reaction_type" ON "goal_likes" ("goalId", "userId", "reactionType");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "goal_likes_goal_id" ON "goal_likes" ("goalId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "goal_likes_user_id" ON "goal_likes" ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "goal_milestones_goal_id_sort_order" ON "goal_milestones" ("goalId", "sortOrder");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "goal_milestones_goal_id_is_achieved" ON "goal_milestones" ("goalId", "isAchieved");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "admin_specials_is_active" ON "admin_specials" ("isActive");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "admin_specials_start_date_end_date" ON "admin_specials" ("startDate", "endDate");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_workout_plans_user_id" ON "workout_plans" ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_workout_plans_trainer_id" ON "workout_plans" ("trainer_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_workout_plans_status" ON "workout_plans" ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_workout_plans_user_status" ON "workout_plans" ("userId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "workout_session_user_idx" ON "workout_sessions" ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "workout_session_date_idx" ON "workout_sessions" ("date");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "workout_session_user_date_idx" ON "workout_sessions" ("userId", "date");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "workout_session_status_idx" ON "workout_sessions" ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "workout_sessions_session_type_idx" ON "workout_sessions" ("sessionType");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "workout_sessions_user_session_type_idx" ON "workout_sessions" ("userId", "sessionType");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "workout_sessions_session_id_idx" ON "workout_sessions" ("sessionId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_trainer_permissions_type" ON "trainer_permissions" ("permissionType");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_trainer_permissions_active" ON "trainer_permissions" ("isActive");
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "idx_unique_active_trainer_permission" ON "trainer_permissions" ("trainerId", "permissionType");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_daily_workout_forms_client_id" ON "daily_workout_forms" ("client_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_daily_workout_forms_trainer_id" ON "daily_workout_forms" ("trainer_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_daily_workout_forms_date" ON "daily_workout_forms" ("date");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_daily_workout_forms_session_id" ON "daily_workout_forms" ("session_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_daily_workout_forms_mcp_processed" ON "daily_workout_forms" ("mcp_processed");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_daily_workout_forms_session_deducted" ON "daily_workout_forms" ("session_deducted");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_daily_workout_forms_client_date" ON "daily_workout_forms" ("client_id", "date");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_daily_workout_forms_trainer_date" ON "daily_workout_forms" ("trainer_id", "date");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_daily_workout_forms_form_data_gin" ON "daily_workout_forms" USING gin ("form_data");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "recovery_completions_user_id_completed_date" ON "recovery_completions" ("userId", "completedDate");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "history_backfill_runs_user_id" ON "history_backfill_runs" ("userId");
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "client_onboarding_coverage_items_client_id_coverage_key" ON "client_onboarding_coverage_items" ("clientId", "coverageKey");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "automation_sequences_trigger_event" ON "automation_sequences" ("triggerEvent");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "automation_sequences_is_active" ON "automation_sequences" ("isActive");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "automation_logs_sequence_id" ON "automation_logs" ("sequenceId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "automation_logs_user_id" ON "automation_logs" ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "automation_logs_lead_id" ON "automation_logs" ("leadId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "automation_logs_status" ON "automation_logs" ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "automation_logs_scheduled_for" ON "automation_logs" ("scheduledFor");
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "ai_privacy_profiles_user_id" ON "ai_privacy_profiles" ("userId");
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "user_watch_history_user_id_video_id" ON "user_watch_history" ("user_id", "video_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "user_watch_history_video_id_completed" ON "user_watch_history" ("video_id", "completed");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "video_outbound_clicks_clicked_at" ON "video_outbound_clicks" ("clicked_at");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "gallery_messages_visitor_id" ON "gallery_messages" ("visitor_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "gallery_messages_event_id" ON "gallery_messages" ("event_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "gallery_messages_email" ON "gallery_messages" ("email");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "gallery_messages_is_read" ON "gallery_messages" ("is_read");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "print_orders_idempotency_key" ON "print_orders" ("idempotency_key");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "content_projects_status" ON "content_projects" ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "content_projects_source_type" ON "content_projects" ("source_type");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "content_projects_publish_due_at" ON "content_projects" ("publish_due_at");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "content_projects_created_by" ON "content_projects" ("created_by");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "daily_macro_logs_source_record_id" ON "daily_macro_logs" ("sourceRecordId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "daily_macro_logs_user_id_review_status_date" ON "daily_macro_logs" ("userId", "reviewStatus", "date");
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "daily_hydrations_user_id_date" ON "daily_hydrations" ("userId", "date");
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "waiver_records_idempotency_key_unique" ON "waiver_records" ("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;

-- SKIPPED (unresolvable against the live schema — fix the model declaration first):
--   user_watch_history :: user_watch_history_user_id_last_watched_at — field "undefined" -> column "?" not in live user_watch_history
--   video_outbound_clicks :: video_outbound_clicks_video_id_click_type_clicked_at — field "undefined" -> column "?" not in live video_outbound_clicks
