/**
 * Database Table Creation Order Manager
 * ====================================
 * Ensures tables are created in proper dependency order to prevent foreign key errors
 * 
 * CRITICAL FIX: Resolves table creation failures due to missing parent tables
 */

import logger from './logger.mjs';

/**
 * Define table creation order based on dependencies
 * Parent tables must be created before child tables that reference them
 * CRITICAL FIX: Using actual table names from models to prevent foreign key errors
 */
const TABLE_CREATION_ORDER = [
  // PHASE 1: Core base tables (no dependencies)
  'Users',  // User model uses "Users" (quoted)
  'AdminSettings',
  'NotificationSettings', 
  'GamificationSettings',
  
  // PHASE 2: Core reference tables 
  'MuscleGroups',  // FIXED: MuscleGroup model uses 'MuscleGroups' 
  'Equipment', 
  'Exercises',  // Exercise model uses "Exercises" (quoted)
  'Achievements',
  'Rewards',
  'Milestones',
  
  // PHASE 3: User-dependent tables
  'Sessions',
  'client_progress',  // FIXED: ClientProgress uses 'client_progress'
  'Gamifications',   // FIXED: Gamification uses 'Gamifications'
  'avatar_homes',    // AvatarHome uses 'avatar_homes'
  'Orientations',
  'Notifications',
  'Contacts',
  'shopping_carts',  // FIXED: ShoppingCart uses 'shopping_carts'
  'UserAchievements',   // UserAchievement's real table is PascalCase (live-DB verified 2026-08-04)
  'user_rewards',       // FIXED: UserReward uses 'user_rewards'
  'user_milestones',    // FIXED: UserMilestone uses 'user_milestones'
  'point_transactions', // FIXED: PointTransaction uses 'point_transactions'
  
  // PHASE 4: Product and storefront tables
  'storefront_items',   // FIXED: StorefrontItem uses 'storefront_items'
  'food_ingredients',   // FIXED: FoodIngredient uses 'food_ingredients'
  'food_products',      // FIXED: FoodProduct uses 'food_products'
  
  // PHASE 5: Cart and order tables (depend on storefront)
  'cart_items',  // FIXED: CartItem uses 'cart_items'
  'Orders',
  'order_items', // FIXED: OrderItem uses 'order_items'
  
  // PHASE 6: Workout structure tables (depend on exercises/users)
  'workout_plans',      // FIXED: WorkoutPlan uses 'workout_plans'
  'workout_plan_days',  // WorkoutPlanDay's real table is snake_case (the PascalCase name never existed)
  'workout_sessions',   // FIXED: WorkoutSession uses 'workout_sessions'
  'workout_exercises',  // FIXED: WorkoutExercise uses 'workout_exercises'
  'workout_plan_day_exercises', // FIXED: WorkoutPlanDayExercise uses 'workout_plan_day_exercises'
  
  // PHASE 7: Exercise junction tables (depend on exercises and muscle groups)
  'exercise_muscle_groups',  // FIXED: ExerciseMuscleGroup uses 'exercise_muscle_groups'
  'exercise_equipment',      // FIXED: ExerciseEquipment uses 'exercise_equipment'
  'Sets',
  
  // PHASE 8: Food tracking (depends on users and products)
  'food_scan_history',  // FIXED: FoodScanHistory uses 'food_scan_history'
  
  // PHASE 9: Social features (depend on users)
  'social_posts',        // FIXED: SocialPost uses 'social_posts'
  'social_comments',     // FIXED: SocialComment uses 'social_comments'
  'social_likes',        // FIXED: SocialLike uses 'social_likes'
  'Friendships',
  'Challenges',
  'challenge_participants', // FIXED: ChallengeParticipant uses 'challenge_participants'
  'ChallengeTeams',         // ChallengeTeam's real table is PascalCase (live-DB verified 2026-08-04)
  
  // PHASE 10: Financial tracking (depends on orders and users)
  'financial_transactions', // FIXED: FinancialTransaction uses 'financial_transactions'
  'business_metrics',       // FIXED: BusinessMetrics uses 'business_metrics'
  'admin_notifications',    // FIXED: AdminNotification uses 'admin_notifications'

  // PHASE 11: Photo Gallery & Lead Generation (gallery_events first, then dependents)
  'gallery_events',              // GalleryEvent — base table
  'gallery_photos',              // GalleryPhoto — depends on gallery_events
  'gallery_visitors',            // GalleryVisitor — depends on gallery_events, Users
  'gallery_enhancement_requests', // EnhancementRequest — depends on gallery_visitors, gallery_photos
  'gallery_donations',           // GalleryDonation — depends on gallery_visitors, gallery_events
  'gallery_referrals',           // GalleryReferral — depends on gallery_visitors, gallery_events
  'gallery_photo_votes',         // PhotoVote — depends on gallery_photos, gallery_visitors

  // PHASE 12: CRM Lead Management (leads first, then activities)
  'leads',                       // Lead — depends on Users, gallery_visitors
  'lead_activities',             // LeadActivity — depends on leads, Users
  'page_views',                  // PageView — standalone, anonymous page view persistence

  // PHASE 13: Drift-audit backfill (2026-08-03) — live-wired models whose tables
  // were never created in production because they were absent from this list AND
  // had no .cjs migration visible to safe-migrate.mjs (which cannot load .mjs files).
  // Every entry below was verified missing against the live DB via
  // scripts/audit-schema-drift.mjs before being added. Depends only on Users,
  // which is created in PHASE 1.
  'progress_data',               // ProgressData — /api/gamification progress endpoints
  'user_follows',                // UserFollow — social follow/leaderboard/feed endpoints
  'session_packages',            // SessionPackage — gallery VIP Stripe fulfillment
  // 2026-08-12 drift audit (SWA-157): `packages` was registered in getModels() but absent from
  // this list, and createTablesInOrder iterates ONLY this list — so the table was never created
  // in production and four admin routes (finance/revenue/charge-card/package) query a table that
  // does not exist. Second instance of the same failure shape as MISSING_COLUMNS: a "self-healing"
  // boot that heals only what someone remembered to enumerate. FK verified: createdBy INTEGER ->
  // quoted "Users"(id); DDL proven by the QA-container rebuild creating this table cleanly.
  // NOTE: PainEntryCorrectiveExercises (the other missing table) is deliberately NOT added — its
  // FK-type defect (exerciseId vs Exercises.id UUID) would error on every boot until fixed.
  'packages',                    // Package — admin finance/revenue/charge-card/package routes
  'video_sessions',              // VideoSession — /api/video-sessions (VideoChat/ROM)
  'olympic_events',              // OlympicEvent — /api/olympics (Virtual Olympics)
  'marketing_calendar_items',    // MarketingCalendarItem — admin marketing calendar
  'social_publishing_accounts',  // SocialPublishingAccount
  'social_publishing_jobs',      // SocialPublishingJob — publish queue
  'social_publishing_attempts'   // SocialPublishingAttempt — per-attempt audit trail
  // DDL dry-run 2026-08-03: none of the three social_publishing tables declare hard FK
  // constraints to each other (cross-refs are plain integer columns); the only REFERENCES
  // targets across all nine PHASE 13 tables are "Users". Order above is logical, not load-bearing.
];

/**
 * Create tables in proper dependency order
 */
export const createTablesInOrder = async (models) => {
  logger.info('🔧 Creating tables in dependency order...');
  
  const results = {
    created: [],
    skipped: [],
    errors: [],
    totalTables: TABLE_CREATION_ORDER.length
  };
  
  for (const tableName of TABLE_CREATION_ORDER) {
    try {
      // ENHANCED: Find model by table name with robust matching
      const model = Object.values(models).find(m => {
        if (!m || !m.getTableName) return false;
        const modelTableName = m.getTableName();
        
        // Remove quotes from table names for comparison
        const cleanModelTableName = modelTableName.replace(/["']/g, '');
        const cleanTableName = tableName.replace(/["']/g, '');
        
        // Multiple matching strategies
        return (
          // Exact match
          modelTableName === tableName ||
          cleanModelTableName === cleanTableName ||
          // Case-insensitive match
          cleanModelTableName.toLowerCase() === cleanTableName.toLowerCase() ||
          // Model name match
          m.name === tableName ||
          m.name === cleanTableName ||
          // Snake_case to PascalCase conversion match
          cleanModelTableName === tableName.replace(/_([a-z])/g, (g) => g[1].toUpperCase()) ||
          // PascalCase to snake_case conversion match
          cleanModelTableName === tableName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
        );
      });
      
      if (!model) {
        logger.warn(`⚠️  Model not found for table: ${tableName}`);
        logger.warn(`Available models: ${Object.values(models).filter(m => m && m.getTableName).map(m => m.getTableName()).join(', ')}`);
        results.skipped.push(tableName);
        continue;
      }
      
      // Check if table already exists
      const actualTableName = model.getTableName();
      const cleanActualTableName = actualTableName.replace(/["']/g, '');
      const tableExists = await checkTableExists(cleanActualTableName);
      
      if (tableExists) {
        logger.debug(`✅ Table already exists: ${cleanActualTableName}`);
        results.skipped.push(cleanActualTableName);
        continue;
      }
      
      // Create the table
      logger.info(`🔨 Creating table: ${cleanActualTableName} (model: ${model.name})`);
      await model.sync({ force: false }); // Only create if doesn't exist
      
      logger.info(`✅ Created table: ${cleanActualTableName}`);
      results.created.push(cleanActualTableName);
      
    } catch (error) {
      logger.error(`❌ Failed to create table ${tableName}: ${error.message}`);
      
      // Enhanced error categorization
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        logger.warn(`🔄 Foreign key error - parent table missing: ${error.message}`);
        results.errors.push({ table: tableName, error: error.message, type: 'missing_parent_table' });
      } else if (error.message.includes('already exists')) {
        logger.info(`ℹ️  Table already exists: ${tableName}`);
        results.skipped.push(tableName);
      } else {
        results.errors.push({ table: tableName, error: error.message, type: 'creation_error' });
      }
      
      // Continue with other tables even if one fails
      continue;
    }
  }
  
  logger.info(`🎉 Table creation completed: ${results.created.length} created, ${results.skipped.length} skipped, ${results.errors.length} errors`);
  
  return results;
};

/**
 * Check if a table exists in the database
 */
const checkTableExists = async (tableName) => {
  try {
    const sequelize = (await import('../database.mjs')).default;
    
    // Try PostgreSQL first
    try {
      const [results] = await sequelize.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ?`,
        { replacements: [tableName] }
      );
      return results.length > 0;
    } catch (pgError) {
      // Fallback to SQLite
      try {
        const [results] = await sequelize.query(
          `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`,
          { replacements: [tableName] }
        );
        return results.length > 0;
      } catch (sqliteError) {
        logger.warn(`Could not check table existence for ${tableName}: ${pgError.message}`);
        return false;
      }
    }
  } catch (error) {
    logger.warn(`Error checking table existence for ${tableName}: ${error.message}`);
    return false;
  }
};

/**
 * Validate table creation order
 */
export const validateTableOrder = (models) => {
  logger.info('🔍 Validating table creation order...');
  
  const modelNames = Object.keys(models);
  const tableNames = Object.values(models)
    .filter(m => m && m.getTableName)
    .map(m => m.getTableName());
  
  const missingFromOrder = tableNames.filter(tableName => 
    !TABLE_CREATION_ORDER.some(orderName => 
      orderName.toLowerCase() === tableName.toLowerCase()
    )
  );
  
  if (missingFromOrder.length > 0) {
    logger.warn(`⚠️  Tables not in creation order: ${missingFromOrder.join(', ')}`);
    logger.warn('These tables may be created in random order and could fail');
  }
  
  const extraInOrder = TABLE_CREATION_ORDER.filter(orderName =>
    !tableNames.some(tableName => 
      tableName.toLowerCase() === orderName.toLowerCase()
    )
  );
  
  if (extraInOrder.length > 0) {
    logger.info(`ℹ️  Tables in order but not found in models: ${extraInOrder.join(', ')}`);
  }
  
  logger.info(`✅ Table order validation completed: ${tableNames.length} tables, ${missingFromOrder.length} missing from order`);
  
  return {
    modelCount: modelNames.length,
    tableCount: tableNames.length,
    missingFromOrder,
    extraInOrder
  };
};

export default createTablesInOrder;
