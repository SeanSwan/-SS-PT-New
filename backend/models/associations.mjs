/**
 * Model Associations
 * =================
 * This file defines all associations between SEQUELIZE models only.
 * MongoDB models are handled separately and don't need associations here.
 * Updated to include Financial Intelligence models and Content Moderation models.
 */

// Import models using dynamic imports to avoid circular dependencies
const setupAssociations = async () => {
  try {
    console.log('Starting Sequelize model imports...');
    
    // Import ONLY SEQUELIZE MODELS (PostgreSQL)
    const UserModule = await import('./User.mjs');
    const SessionModule = await import('./Session.mjs');
    const SessionTypeModule = await import('./SessionType.mjs');
    const ClientProgressModule = await import('./ClientProgress.mjs');
    const GamificationModule = await import('./Gamification.mjs');
    const AchievementModule = await import('./Achievement.mjs');
    const GamificationSettingsModule = await import('./GamificationSettings.mjs');
    const UserAchievementModule = await import('./UserAchievement.mjs');
    const UserRewardModule = await import('./UserReward.mjs');
    const UserMilestoneModule = await import('./UserMilestone.mjs');
    const RewardModule = await import('./Reward.mjs');
    const MilestoneModule = await import('./Milestone.mjs');
    const PointTransactionModule = await import('./PointTransaction.mjs');

    // Enhanced Gamification Models (Sequelize)
    const ChallengeModule = await import('./Challenge.mjs');
    const ChallengeParticipantModule = await import('./ChallengeParticipant.mjs');
    const ChallengeSubmissionModule = await import('./ChallengeSubmission.mjs');
    const GoalModule = await import('./Goal.mjs');
    const ProgressDataModule = await import('./ProgressData.mjs');
    const UserFollowModule = await import('./UserFollow.mjs');

    // Social Gamification Models
    const StreakModule = await import('./Streak.mjs');
    const GoalSupporterModule = await import('./GoalSupporter.mjs');
    const GoalCommentModule = await import('./GoalComment.mjs');
    const GoalLikeModule = await import('./GoalLike.mjs');
    const GoalMilestoneModule = await import('./GoalMilestone.mjs');

    // E-Commerce Models (Sequelize)
    const StorefrontItemModule = await import('./StorefrontItem.mjs');
    const ProductVariantModule = await import('./ProductVariant.mjs');
    const ShoppingCartModule = await import('./ShoppingCart.mjs');
    const CartItemModule = await import('./CartItem.mjs');
    const OrderModule = await import('./Order.mjs');
    const OrderItemModule = await import('./OrderItem.mjs');
    const SessionPackageModule = await import('./SessionPackage.mjs');
    const PackageModule = await import('./Package.mjs');
    const AdminSpecialModule = await import('./AdminSpecial.mjs');

    // Food Scanner Models (Sequelize)
    const FoodIngredientModule = await import('./FoodIngredient.mjs');
    const FoodProductModule = await import('./FoodProduct.mjs');
    const FoodScanHistoryModule = await import('./FoodScanHistory.mjs');

    // Social Models (Sequelize)
    const SocialModels = await import('./social/index.mjs');
    const { SocialPost, SocialComment, SocialLike, Friendship, Challenge: SocialChallenge, ChallengeParticipant: SocialChallengeParticipant, ChallengeTeam, PostReport, ModerationAction } = SocialModels;

    // Workout Models (Sequelize)
    const WorkoutPlanModule = await import('./WorkoutPlan.mjs');
    const WorkoutPlanDayModule = await import('./WorkoutPlanDay.mjs');
    const WorkoutPlanDayExerciseModule = await import('./WorkoutPlanDayExercise.mjs');
    const WorkoutSessionModule = await import('./WorkoutSession.mjs');
    const WorkoutLogModule = await import('./WorkoutLog.mjs');
    const WorkoutExerciseModule = await import('./WorkoutExercise.mjs');
    const ExerciseModule = await import('./Exercise.mjs');
    const SetModule = await import('./Set.mjs');
    
    // Exercise Reference Models (Sequelize)
    const MuscleGroupModule = await import('./MuscleGroup.mjs');
    const ExerciseMuscleGroupModule = await import('./ExerciseMuscleGroup.mjs');
    const EquipmentModule = await import('./Equipment.mjs');
    const ExerciseEquipmentModule = await import('./ExerciseEquipment.mjs');
    
    // Video Chat Models (Sequelize)
    const VideoSessionModule = await import('./VideoSession.mjs');
    const AvatarHomeModule = await import('./AvatarHome.mjs');
    const OlympicEventModule = await import('./OlympicEvent.mjs');

    // Notification and Admin Models (Sequelize)
    const OrientationModule = await import('./Orientation.mjs');
    const NotificationModule = await import('./Notification.mjs');
    const NotificationSettingsModule = await import('./NotificationSettings.mjs');
    const AdminSettingsModule = await import('./AdminSettings.mjs');
    const ContactModule = await import('./contact.mjs');
    const SupportIssueModule = await import('./SupportIssue.mjs');
    const SupportIssueEventModule = await import('./SupportIssueEvent.mjs');
    
    // Financial Models (Sequelize)
    const FinancialTransactionModule = await import('./financial/FinancialTransaction.mjs');
    const BusinessMetricsModule = await import('./financial/BusinessMetrics.mjs');
    const AdminNotificationModule = await import('./financial/AdminNotification.mjs');
    
    // Trainer Revenue Models (Sequelize)
    const TrainerCommissionModule = await import('./TrainerCommission.mjs');

    // NASM Workout Tracking Models (Sequelize)
    const ClientTrainerAssignmentModule = await import('./ClientTrainerAssignment.mjs');
    const TrainerPermissionsModule = await import('./TrainerPermissions.mjs');
    const TrainerAvailabilityModule = await import('./TrainerAvailability.mjs');
    const DailyWorkoutFormModule = await import('./DailyWorkoutForm.mjs');
    const WorkoutPlanCompletionReceiptModule = await import('./WorkoutPlanCompletionReceipt.mjs');
    // Launch charter 2026-07: PR engine (4a), Recovery Board (4B.3), History Backfill (H)
    const PersonalRecordModule = await import('./PersonalRecord.mjs');
    const RecoveryCompletionModule = await import('./RecoveryCompletion.mjs');
    const HistoryBackfillRunModule = await import('./HistoryBackfillRun.mjs');
    // Phase 3 (PLAUD multi-clip merge ingestion) — Slice 3.1
    const PlaudClipModule = await import('./PlaudClip.mjs');
    const PlaudMergeRequestModule = await import('./PlaudMergeRequest.mjs');
    const PlaudClipMirrorJobModule = await import('./PlaudClipMirrorJob.mjs');
    const PlaudMergeLockModule = await import('./PlaudMergeLock.mjs');
    // Phase 5 (PLAUD Auto-Ingestion via Applaud webhook) — Slice 5.1
    const PlaudWebhookNonceModule = await import('./PlaudWebhookNonce.mjs');
    const ClientBaselineMeasurementsModule = await import('./ClientBaselineMeasurements.mjs');
    const ClientOnboardingQuestionnaireModule = await import('./ClientOnboardingQuestionnaire.mjs');
    const ClientOnboardingCoverageItemModule = await import('./ClientOnboardingCoverageItem.mjs');
    const ClientNutritionPlanModule = await import('./ClientNutritionPlan.mjs');
    const ClientPhotoModule = await import('./ClientPhoto.mjs');
    const ClientNoteModule = await import('./ClientNote.mjs');
    const AutomationSequenceModule = await import('./AutomationSequence.mjs');
    const AutomationLogModule = await import('./AutomationLog.mjs');

    // AI Privacy Models (Phase 1)
    const AiPrivacyProfileModule = await import('./AiPrivacyProfile.mjs');
    const AiInteractionLogModule = await import('./AiInteractionLog.mjs');
    const AdminAccountAuditLogModule = await import('./AdminAccountAuditLog.mjs');
    const AiCommandAuditLogModule = await import('./AiCommandAuditLog.mjs');

    // AI Monitoring Models (Phase 10)
    const AiMetricsBucketModule = await import('./AiMetricsBucket.mjs');
    const AiMonitoringAlertModule = await import('./AiMonitoringAlert.mjs');

    // Long-Horizon Planning Models (Phase 5C)
    const LongTermProgramPlanModule = await import('./LongTermProgramPlan.mjs');
    const ProgramMesocycleBlockModule = await import('./ProgramMesocycleBlock.mjs');

    // Waiver + Consent Models (Phase 5W-B)
    const WaiverVersionModule = await import('./WaiverVersion.mjs');
    const WaiverRecordModule = await import('./WaiverRecord.mjs');
    const WaiverRecordVersionModule = await import('./WaiverRecordVersion.mjs');
    const WaiverConsentFlagsModule = await import('./WaiverConsentFlags.mjs');
    const PendingWaiverMatchModule = await import('./PendingWaiverMatch.mjs');
    const AiConsentLogModule = await import('./AiConsentLog.mjs');
    const TrainerApplicationModule = await import('./TrainerApplication.mjs');

    // Trainer-Economics Models (SWA-62) — append-only pricing audit trail (S1)
    const PriceChangeLogModule = await import('./PriceChangeLog.mjs');

    // Movement Analysis Models (Phase 13)
    const MovementAnalysisModule = await import('./MovementAnalysis.mjs');
    const PendingMovementAnalysisMatchModule = await import('./PendingMovementAnalysisMatch.mjs');

    // Video Catalog Models (Sequelize)
    const VideoCatalogModule = await import('./VideoCatalog.mjs');
    const VideoCollectionModule = await import('./VideoCollection.mjs');
    const VideoCollectionItemModule = await import('./VideoCollectionItem.mjs');
    const UserWatchHistoryModule = await import('./UserWatchHistory.mjs');
    const VideoAccessGrantModule = await import('./VideoAccessGrant.mjs');
    const VideoOutboundClickModule = await import('./VideoOutboundClick.mjs');
    const VideoJobLogModule = await import('./VideoJobLog.mjs');

    // Body Measurement & Milestone Models (Phase 11)
    const BodyMeasurementModule = await import('./BodyMeasurement.mjs');
    const MeasurementMilestoneModule = await import('./MeasurementMilestone.mjs');

    // Wearable Data Integration
    const WearableDataModule = await import('./WearableData.mjs');

    // Pain/Injury Tracking (NASM CES + Squat University)
    const ClientPainEntryModule = await import('./ClientPainEntry.mjs');
    const PainEntryCorrectiveExerciseModule = await import('./PainEntryCorrectiveExercise.mjs');
    const RecoveryActivityLogModule = await import('./RecoveryActivityLog.mjs');

    // Form Analysis Models (Phase 2 - AI Form Analysis)
    const FormAnalysisModule = await import('./FormAnalysis.mjs');
    const MovementProfileModule = await import('./MovementProfile.mjs');

    // Custom Exercise Builder (Phase 6 - Biomechanics Studio)
    const CustomExerciseModule = await import('./CustomExercise.mjs');

    // Equipment Profile Manager (Phase 7)
    const EquipmentProfileModule = await import('./EquipmentProfile.mjs');
    const EquipmentItemModule = await import('./EquipmentItem.mjs');
    const EquipmentExerciseMapModule = await import('./EquipmentExerciseMap.mjs');
    const EquipmentScanSessionModule = await import('./EquipmentScanSession.mjs');
    const EquipmentScanCandidateModule = await import('./EquipmentScanCandidate.mjs');

    // Workout Variation Engine (Phase 8)
    const VariationLogModule = await import('./VariationLog.mjs');

    // Boot Camp Class Builder (Phase 10)
    const BootcampTemplateModule = await import('./BootcampTemplate.mjs');
    const BootcampStationModule = await import('./BootcampStation.mjs');
    const BootcampExerciseModule = await import('./BootcampExercise.mjs');
    const BootcampOverflowPlanModule = await import('./BootcampOverflowPlan.mjs');
    const BootcampClassLogModule = await import('./BootcampClassLog.mjs');
    const BootcampSpaceProfileModule = await import('./BootcampSpaceProfile.mjs');
    const ExerciseTrendModule = await import('./ExerciseTrend.mjs');
    const BootcampStretchModule = await import('./BootcampStretch.mjs');

    // Boot Camp Sprint Planner (Phase 10B)
    const BootcampSprintModule = await import('./BootcampSprint.mjs');
    const SprintWeekModule = await import('./SprintWeek.mjs');
    const SprintClassSlotModule = await import('./SprintClassSlot.mjs');
    const SprintExerciseMemoryModule = await import('./SprintExerciseMemory.mjs');

    // Photo Gallery & Lead Generation Models
    const GalleryEventModule = await import('./GalleryEvent.mjs');
    const GalleryPhotoModule = await import('./GalleryPhoto.mjs');
    const GalleryVisitorModule = await import('./GalleryVisitor.mjs');
    const EnhancementRequestModule = await import('./EnhancementRequest.mjs');
    const GalleryDonationModule = await import('./GalleryDonation.mjs');
    const GalleryReferralModule = await import('./GalleryReferral.mjs');
    const PhotoVoteModule = await import('./PhotoVote.mjs');
    const GalleryMessageModule = await import('./GalleryMessage.mjs');
    const PrintOrderModule = await import('./PrintOrder.mjs');

    // CRM Lead Management Models
    const LeadModule = await import('./Lead.mjs');
    const LeadActivityModule = await import('./LeadActivity.mjs');
    const MarketingCalendarItemModule = await import('./MarketingCalendarItem.mjs');
    const MarketingCampaignModule = await import('./MarketingCampaign.mjs');
    const ContentProjectModule = await import('./ContentProject.mjs');
    const SocialPublishingAccountModule = await import('./SocialPublishingAccount.mjs');
    const SocialPublishingJobModule = await import('./SocialPublishingJob.mjs');
    const SocialPublishingAttemptModule = await import('./SocialPublishingAttempt.mjs');

    // AI Chat & Macro Logging Models
    const AiConversationModule = await import('./AiConversation.mjs');
    const DailyMacroLogModule = await import('./DailyMacroLog.mjs').catch(() => ({ default: null }));
    const DailyHydrationModule = await import('./DailyHydration.mjs').catch(() => ({ default: null }));

    // Subscription Models
    const SubscriptionModule = await import('./Subscription.mjs').catch(() => ({ default: null }));

    console.log('Extracting Sequelize models...');
    
    // Extract default exports for SEQUELIZE models only
    const User = UserModule.default;
    const Session = SessionModule.default;
    const SessionType = SessionTypeModule.default;
    const ClientProgress = ClientProgressModule.default;
    const Gamification = GamificationModule.default;
    const Achievement = AchievementModule.default;
    const GamificationSettings = GamificationSettingsModule.default;
    const UserAchievement = UserAchievementModule.default;
    const UserReward = UserRewardModule.default;
    const UserMilestone = UserMilestoneModule.default;
    const Reward = RewardModule.default;
    const Milestone = MilestoneModule.default;
    const PointTransaction = PointTransactionModule.default;

    // Enhanced Gamification Models
    const Challenge = ChallengeModule.default;
    const ChallengeParticipant = ChallengeParticipantModule.default;
    const ChallengeSubmission = ChallengeSubmissionModule.default;
    const Goal = GoalModule.default;
    const ProgressData = ProgressDataModule.default;
    const UserFollow = UserFollowModule.default;

    // Social Gamification Models
    const Streak = StreakModule.default;
    const GoalSupporter = GoalSupporterModule.default;
    const GoalComment = GoalCommentModule.default;
    const GoalLike = GoalLikeModule.default;
    const GoalMilestone = GoalMilestoneModule.default;

    // E-Commerce Models
    const StorefrontItem = StorefrontItemModule.default;
    const ProductVariant = ProductVariantModule.default;
    const ShoppingCart = ShoppingCartModule.default;
    const CartItem = CartItemModule.default;
    const Order = OrderModule.default;
    const OrderItem = OrderItemModule.default;
    const SessionPackage = SessionPackageModule.default;
    const Package = PackageModule.default;
    const AdminSpecial = AdminSpecialModule.default;

    // Food Scanner Models
    const FoodIngredient = FoodIngredientModule.default;
    const FoodProduct = FoodProductModule.default;
    const FoodScanHistory = FoodScanHistoryModule.default;

    // Workout Models
    const WorkoutPlan = WorkoutPlanModule.default;
    const WorkoutPlanDay = WorkoutPlanDayModule.default;
    const WorkoutPlanDayExercise = WorkoutPlanDayExerciseModule.default;
    const WorkoutSession = WorkoutSessionModule.default;
    const VideoSession = VideoSessionModule.default;
    const AvatarHome = AvatarHomeModule.default;
    const OlympicEvent = OlympicEventModule.default;
    const WorkoutLog = WorkoutLogModule.default;
    const WorkoutExercise = WorkoutExerciseModule.default;
    const Exercise = ExerciseModule.default;
    const Set = SetModule.default;
    
    // Exercise Reference Models
    const MuscleGroup = MuscleGroupModule.default;
    const ExerciseMuscleGroup = ExerciseMuscleGroupModule.default;
    const Equipment = EquipmentModule.default;
    const ExerciseEquipment = ExerciseEquipmentModule.default;
    
    // Notification and Admin Models
    const Orientation = OrientationModule.default;
    const Notification = NotificationModule.default;
    const NotificationSettings = NotificationSettingsModule.default;
    const AdminSettings = AdminSettingsModule.default;
    const Contact = ContactModule.default;
    const SupportIssue = SupportIssueModule.default;
    const SupportIssueEvent = SupportIssueEventModule.default;
    
    // Financial Models
    const FinancialTransaction = FinancialTransactionModule.default;
    const BusinessMetrics = BusinessMetricsModule.default;
    const AdminNotification = AdminNotificationModule.default;
    
    // Trainer Revenue Models
    const TrainerCommission = TrainerCommissionModule.default;

    // NASM Workout Tracking Models
    const ClientTrainerAssignment = ClientTrainerAssignmentModule.default;
    const TrainerPermissions = TrainerPermissionsModule.default;
    const TrainerAvailability = TrainerAvailabilityModule.default;
    const DailyWorkoutForm = DailyWorkoutFormModule.default;
    const WorkoutPlanCompletionReceipt = WorkoutPlanCompletionReceiptModule.default;
    const PersonalRecord = PersonalRecordModule.default;
    const RecoveryCompletion = RecoveryCompletionModule.default;
    const HistoryBackfillRun = HistoryBackfillRunModule.default;
    // Phase 3 PLAUD models (Slice 3.1)
    const PlaudClip = PlaudClipModule.default;
    const PlaudMergeRequest = PlaudMergeRequestModule.default;
    const PlaudClipMirrorJob = PlaudClipMirrorJobModule.default;
    const PlaudMergeLock = PlaudMergeLockModule.default;
    // Phase 5 PLAUD Auto-Ingestion model (Slice 5.1)
    const PlaudWebhookNonce = PlaudWebhookNonceModule.default;
    const ClientBaselineMeasurements = ClientBaselineMeasurementsModule.default;
    const ClientOnboardingQuestionnaire = ClientOnboardingQuestionnaireModule.default;
    const ClientOnboardingCoverageItem = ClientOnboardingCoverageItemModule.default;
    const ClientNutritionPlan = ClientNutritionPlanModule.default;
    const ClientPhoto = ClientPhotoModule.default;
    const ClientNote = ClientNoteModule.default;
    const AutomationSequence = AutomationSequenceModule.default;
    const AutomationLog = AutomationLogModule.default;

    // AI Privacy Models
    const AiPrivacyProfile = AiPrivacyProfileModule.default;
    const AiInteractionLog = AiInteractionLogModule.default;
    const AdminAccountAuditLog = AdminAccountAuditLogModule.default;
    const AiCommandAuditLog = AiCommandAuditLogModule.default;

    // AI Monitoring Models (Phase 10)
    const AiMetricsBucket = AiMetricsBucketModule.default;
    const AiMonitoringAlert = AiMonitoringAlertModule.default;

    // Long-Horizon Planning Models (Phase 5C)
    const LongTermProgramPlan = LongTermProgramPlanModule.default;
    const ProgramMesocycleBlock = ProgramMesocycleBlockModule.default;

    // Waiver + Consent Models (Phase 5W-B)
    const WaiverVersion = WaiverVersionModule.default;
    const WaiverRecord = WaiverRecordModule.default;
    const WaiverRecordVersion = WaiverRecordVersionModule.default;
    const WaiverConsentFlags = WaiverConsentFlagsModule.default;
    const PendingWaiverMatch = PendingWaiverMatchModule.default;
    const AiConsentLog = AiConsentLogModule.default;
    const TrainerApplication = TrainerApplicationModule.default;

    // Trainer-Economics Models (SWA-62)
    const PriceChangeLog = PriceChangeLogModule.default;

    // Movement Analysis Models (Phase 13)
    const MovementAnalysis = MovementAnalysisModule.default;
    const PendingMovementAnalysisMatch = PendingMovementAnalysisMatchModule.default;

    // Video Catalog Models
    const VideoCatalog = VideoCatalogModule.default;
    const VideoCollection = VideoCollectionModule.default;
    const VideoCollectionItem = VideoCollectionItemModule.default;
    const UserWatchHistory = UserWatchHistoryModule.default;
    const VideoAccessGrant = VideoAccessGrantModule.default;
    const VideoOutboundClick = VideoOutboundClickModule.default;
    const VideoJobLog = VideoJobLogModule.default;

    // Body Measurement & Milestone Models (Phase 11)
    const BodyMeasurement = BodyMeasurementModule.default;
    const MeasurementMilestone = MeasurementMilestoneModule.default;

    // Pain/Injury Tracking (NASM CES + Squat University)
    const ClientPainEntry = ClientPainEntryModule.default;
    const PainEntryCorrectiveExercise = PainEntryCorrectiveExerciseModule.default;
    const RecoveryActivityLog = RecoveryActivityLogModule.default;

    // Form Analysis Models (Phase 2 - AI Form Analysis)
    const FormAnalysis = FormAnalysisModule.default;
    const MovementProfile = MovementProfileModule.default;

    // Custom Exercise Builder (Phase 6 - Biomechanics Studio)
    const CustomExercise = CustomExerciseModule.default;

    // Equipment Profile Manager (Phase 7)
    const EquipmentProfile = EquipmentProfileModule.default;
    const EquipmentItem = EquipmentItemModule.default;
    const EquipmentExerciseMap = EquipmentExerciseMapModule.default;
    const EquipmentScanSession = EquipmentScanSessionModule.default;
    const EquipmentScanCandidate = EquipmentScanCandidateModule.default;

    // Workout Variation Engine (Phase 8)
    const VariationLog = VariationLogModule.default;

    // Boot Camp Class Builder (Phase 10)
    const BootcampTemplate = BootcampTemplateModule.default;
    const BootcampStation = BootcampStationModule.default;
    const BootcampExercise = BootcampExerciseModule.default;
    const BootcampOverflowPlan = BootcampOverflowPlanModule.default;
    const BootcampClassLog = BootcampClassLogModule.default;
    const BootcampSpaceProfile = BootcampSpaceProfileModule.default;
    const ExerciseTrend = ExerciseTrendModule.default;
    const BootcampStretch = BootcampStretchModule.default;

    // Boot Camp Sprint Planner (Phase 10B)
    const BootcampSprint = BootcampSprintModule.default;
    const SprintWeek = SprintWeekModule.default;
    const SprintClassSlot = SprintClassSlotModule.default;
    const SprintExerciseMemory = SprintExerciseMemoryModule.default;

    // Photo Gallery & Lead Generation Models
    const GalleryEvent = GalleryEventModule.default;
    const GalleryPhoto = GalleryPhotoModule.default;
    const GalleryVisitor = GalleryVisitorModule.default;
    const EnhancementRequest = EnhancementRequestModule.default;
    const GalleryDonation = GalleryDonationModule.default;
    const GalleryReferral = GalleryReferralModule.default;
    const PhotoVote = PhotoVoteModule.default;
    const GalleryMessage = GalleryMessageModule.default;
    const PrintOrder = PrintOrderModule.default;

    // CRM Lead Management Models
    const Lead = LeadModule.default;
    const LeadActivity = LeadActivityModule.default;
    const MarketingCalendarItem = MarketingCalendarItemModule.default;
    const MarketingCampaign = MarketingCampaignModule.default;
    const ContentProject = ContentProjectModule.default;
    const SocialPublishingAccount = SocialPublishingAccountModule.default;
    const SocialPublishingJob = SocialPublishingJobModule.default;
    const SocialPublishingAttempt = SocialPublishingAttemptModule.default;

    // AI Chat & Macro Logging
    const AiConversation = AiConversationModule.default;
    const DailyMacroLog = DailyMacroLogModule?.default || null;
    const DailyHydration = DailyHydrationModule?.default || null;

    // Subscription
    const Subscription = SubscriptionModule?.default || null;

    console.log('Setting up Sequelize associations only...');
    
    // 🔒 ENHANCED DUPLICATE PREVENTION: Robust checking with specific alias verification
    const hasUserAssociations = User.associations && Object.keys(User.associations).length > 0;
    const hasCartAssociations = CartItem.associations && Object.keys(CartItem.associations).length > 0;
    const hasStorefrontAssociations = StorefrontItem.associations && Object.keys(StorefrontItem.associations).length > 0;
    
    // 🔍 CRITICAL FIX: Check specifically for the problematic 'clientProgress' alias
    const hasClientProgressAlias = !!(User.associations && User.associations.clientProgress);
    
    if (hasUserAssociations || hasCartAssociations || hasStorefrontAssociations || hasClientProgressAlias) {
      console.log('🔒 DUPLICATE PREVENTION: Associations already exist, performing detailed verification...');
      console.log('🔍 User associations found:', hasUserAssociations ? Object.keys(User.associations) : 'none');
      console.log('🔍 ClientProgress alias exists:', hasClientProgressAlias);

      // Critical verification for P0 checkout fix
      const criticalAssociationStatus = {
        userToClientProgress: hasClientProgressAlias,
        userToClientSessions: !!(User.associations && User.associations.clientSessions),
        userToPointTransactions: !!(User.associations && User.associations.pointTransactions),
        pointTransactionToUser: !!(PointTransaction.associations && PointTransaction.associations.user),
        cartToStorefront: !!(CartItem.associations && CartItem.associations.storefrontItem),
        cartToShoppingCart: !!(CartItem.associations && CartItem.associations.cart),
        shoppingCartToItems: !!(ShoppingCart.associations && ShoppingCart.associations.cartItems),
        userToCart: !!(User.associations && User.associations.shoppingCarts)
      };

      console.log('🎯 CRITICAL ASSOCIATIONS STATUS:', criticalAssociationStatus);

      // Verify all critical associations exist
      const allCriticalExist = Object.values(criticalAssociationStatus).every(status => status === true);

      if (allCriticalExist) {
        console.log('✅ DUPLICATE PREVENTION VERIFIED: All critical associations confirmed - safely returning existing models');
      } else {
        console.warn('⚠️ DUPLICATE PREVENTION WARNING: Some critical associations missing — falling through to full setup');
        console.log('Missing associations:', Object.entries(criticalAssociationStatus)
          .filter(([key, value]) => !value)
          .map(([key]) => key));

        // CRITICAL FIX: Do NOT return early when associations are missing.
        // Fall through to the full setup below so missing associations get created.
        // Sequelize safely overwrites duplicate associations, so re-running is safe.
      }

      // Only return early if ALL critical associations are confirmed
      if (!allCriticalExist) {
        console.log('🔧 Falling through to full association setup to repair missing associations...');
      } else {
        return {
        User, Session, SessionType, ClientProgress, Gamification, Achievement, GamificationSettings,
        UserAchievement, UserReward, UserMilestone, Reward, Milestone,
        PointTransaction, StorefrontItem, ProductVariant, ShoppingCart, CartItem, Order,
        OrderItem, SessionPackage, Package, AdminSpecial, FoodIngredient, FoodProduct, FoodScanHistory,
        SocialPost, SocialComment, SocialLike, Friendship, SocialChallenge, SocialChallengeParticipant, ChallengeTeam,
        PostReport, ModerationAction,
        Challenge, ChallengeParticipant, Goal, ProgressData, UserFollow,
        Streak, GoalSupporter, GoalComment, GoalLike, GoalMilestone,
        WorkoutPlan, WorkoutPlanDay, WorkoutPlanDayExercise, WorkoutSession, WorkoutLog, WorkoutExercise, Exercise, Set,
        MuscleGroup, ExerciseMuscleGroup, Equipment, ExerciseEquipment,
        Orientation, Notification, NotificationSettings, AdminSettings, Contact, SupportIssue, SupportIssueEvent,
        FinancialTransaction, BusinessMetrics, AdminNotification, TrainerCommission,
        ClientTrainerAssignment, TrainerPermissions, TrainerAvailability, DailyWorkoutForm, WorkoutPlanCompletionReceipt, ClientOnboardingQuestionnaire,
        PersonalRecord, RecoveryCompletion, HistoryBackfillRun,
        ClientOnboardingCoverageItem, ClientBaselineMeasurements, ClientNutritionPlan, ClientPhoto, ClientNote,
        AutomationSequence, AutomationLog,
        // AI Privacy Models
        AiPrivacyProfile, AiInteractionLog, AiCommandAuditLog, AdminAccountAuditLog,
        // AI Monitoring Models (Phase 10)
        AiMetricsBucket, AiMonitoringAlert,
        // Long-Horizon Planning Models (Phase 5C)
        LongTermProgramPlan, ProgramMesocycleBlock,
        // Waiver + Consent Models (Phase 5W-B)
        WaiverVersion, WaiverRecord, WaiverRecordVersion,
        WaiverConsentFlags, PendingWaiverMatch, AiConsentLog,
        // Trainer Onboarding
        TrainerApplication,
        // Trainer-Economics (SWA-62)
        PriceChangeLog,
        // Video Catalog Models
        VideoCatalog, VideoCollection, VideoCollectionItem,
        UserWatchHistory, VideoAccessGrant, VideoOutboundClick, VideoJobLog,
        // Body Measurement & Milestone Models (Phase 11)
        BodyMeasurement, MeasurementMilestone,
        // Movement Analysis Models (Phase 13)
        MovementAnalysis, PendingMovementAnalysisMatch,
        // Form Analysis Models (Phase 2 - AI Form Analysis)
        FormAnalysis, MovementProfile,
        // Custom Exercise Builder (Phase 6 - Biomechanics Studio)
        CustomExercise,
        // Equipment Profile Manager (Phase 7)
        EquipmentProfile, EquipmentItem, EquipmentExerciseMap, EquipmentScanSession, EquipmentScanCandidate,
        // Workout Variation Engine (Phase 8)
        VariationLog,
        // Boot Camp Class Builder (Phase 10)
        BootcampTemplate, BootcampStation, BootcampExercise,
        BootcampOverflowPlan, BootcampClassLog, BootcampSpaceProfile,
        ExerciseTrend,
        // Boot Camp Sprint Planner (Phase 10B)
        BootcampSprint, SprintWeek, SprintClassSlot, SprintExerciseMemory,
        // Photo Gallery & Lead Generation Models
        GalleryEvent, GalleryPhoto, GalleryVisitor, EnhancementRequest, GalleryDonation, GalleryReferral, GalleryMessage, PrintOrder,
        MarketingCalendarItem, MarketingCampaign, ContentProject, SocialPublishingAccount, SocialPublishingJob, SocialPublishingAttempt,
        // Video Chat + Avatar + Olympics Models
        VideoSession, AvatarHome, OlympicEvent,
        // Phase 3 PLAUD multi-clip merge ingestion (Slice 3.1)
        PlaudClip, PlaudMergeRequest, PlaudClipMirrorJob, PlaudMergeLock,
        // Phase 5 PLAUD Auto-Ingestion via Applaud webhook (Slice 5.1)
        PlaudWebhookNonce,
        // 2026-07-14 drift repair: models below existed only in the FULL
        // return literal; this early-return would have served a cache
        // missing them. Keep BOTH literals in sync when adding models.
        ChallengeSubmission, WearableData, ClientPainEntry, PainEntryCorrectiveExercise, RecoveryActivityLog,
        BootcampStretch, PhotoVote, Lead, LeadActivity, AiConversation,
        ...(DailyMacroLog ? { DailyMacroLog } : {}),
        ...(DailyHydration ? { DailyHydration } : {}),
        ...(Subscription ? { Subscription } : {})
      };
      } // end: if (allCriticalExist) return early
    } // end: if (hasUserAssociations || ...)

    // USER ASSOCIATIONS (only with Sequelize models)
    // ============================================
    User.hasOne(ClientProgress, { foreignKey: 'userId', as: 'clientProgress' });
    User.hasOne(Gamification, { foreignKey: 'userId', as: 'gamification' });

    // User-Subscription (soft reference — Subscription table may not exist yet)
    if (Subscription) {
      User.hasMany(Subscription, { foreignKey: 'userId', as: 'subscriptions', constraints: false });
      Subscription.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });
    }
    
    // USER-SESSION ASSOCIATIONS (CRITICAL FOR SCHEDULE FUNCTIONALITY)
    // ===============================================================
    // User as client in sessions
    User.hasMany(Session, { foreignKey: 'userId', as: 'clientSessions' });
    Session.belongsTo(User, { foreignKey: 'userId', as: 'client' });

    // User as trainer in sessions
    User.hasMany(Session, { foreignKey: 'trainerId', as: 'trainerSessions' });
    Session.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });

    // USER-WORKOUTSESSION ASSOCIATIONS (for admin client workout history)
    // ===================================================================
    User.hasMany(WorkoutSession, { foreignKey: 'userId', as: 'workoutSessions' });
    WorkoutSession.belongsTo(User, { foreignKey: 'userId', as: 'client' });

    // Trainer who led the workout (optional - for trainer-led sessions)
    User.hasMany(WorkoutSession, { foreignKey: 'trainerId', as: 'ledWorkoutSessions' });
    WorkoutSession.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });

    // Avatar Home associations (3D world — unlocks at Level 10)
    User.hasOne(AvatarHome, { foreignKey: 'userId', as: 'avatarHome' });
    AvatarHome.belongsTo(User, { foreignKey: 'userId', as: 'user' });

    // Virtual Olympics associations (Ghost Racing — async competitive events)
    User.hasMany(OlympicEvent, { foreignKey: 'userId', as: 'olympicEvents' });
    OlympicEvent.belongsTo(User, { foreignKey: 'userId', as: 'athlete' });

    // Video Session associations (remote assessments via LiveKit)
    User.hasMany(VideoSession, { foreignKey: 'trainerId', as: 'trainerVideoSessions' });
    VideoSession.belongsTo(User, { foreignKey: 'trainerId', as: 'videoTrainer' });
    User.hasMany(VideoSession, { foreignKey: 'clientId', as: 'clientVideoSessions' });
    VideoSession.belongsTo(User, { foreignKey: 'clientId', as: 'videoClient' });

    // Session type associations (Phase 5 - buffer-aware scheduling)
    Session.belongsTo(SessionType, { foreignKey: 'sessionTypeId', as: 'sessionType' });
    SessionType.hasMany(Session, { foreignKey: 'sessionTypeId', as: 'sessions' });

    // User as reviewer of cancellation decisions (MindBody parity)
    User.hasMany(Session, { foreignKey: 'cancellationReviewedBy', as: 'reviewedCancellations' });
    Session.belongsTo(User, { foreignKey: 'cancellationReviewedBy', as: 'reviewer' });

    // Trainer availability (weekly + overrides)
    User.hasMany(TrainerAvailability, { foreignKey: 'trainerId', as: 'availability' });
    TrainerAvailability.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
    
    // Admin specials (Phase 6)
    User.hasMany(AdminSpecial, { foreignKey: 'createdBy', as: 'adminSpecials' });
    AdminSpecial.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

    // User to achievements (many-to-many through UserAchievements)
    User.belongsToMany(Achievement, {
      through: UserAchievement,
      foreignKey: 'userId',
      otherKey: 'achievementId',
      as: 'achievements'
    });
    
    // CLIENT PROGRESS ASSOCIATIONS
    // ===========================
    ClientProgress.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // GAMIFICATION ASSOCIATIONS
    // ========================
    Gamification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    User.hasMany(PointTransaction, { foreignKey: 'userId', as: 'pointTransactions' });
    PointTransaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    User.hasMany(PointTransaction, { foreignKey: 'awardedBy', as: 'awardedPointTransactions' });
    PointTransaction.belongsTo(User, { foreignKey: 'awardedBy', as: 'awarder' });
    
    // ACHIEVEMENT ASSOCIATIONS
    // =======================
    Achievement.belongsToMany(User, {
      through: UserAchievement,
      foreignKey: 'achievementId',
      otherKey: 'userId',
      as: 'users'
    });
    
    // 🎯 CRITICAL FIX: Direct UserAchievement ↔ Achievement associations
    // These direct associations are required for getUserAchievements to work properly
    UserAchievement.belongsTo(Achievement, {
      foreignKey: 'achievementId',
      as: 'achievement'
    });
    
    Achievement.hasMany(UserAchievement, {
      foreignKey: 'achievementId',
      as: 'userAchievements'
    });
    
    // User ↔ UserAchievement associations
    UserAchievement.belongsTo(User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    User.hasMany(UserAchievement, {
      foreignKey: 'userId',
      as: 'userAchievements'
    });

    // REWARD & MILESTONE ASSOCIATIONS
    // ================================
    UserReward.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    User.hasMany(UserReward, { foreignKey: 'userId', as: 'rewards' });
    UserReward.belongsTo(Reward, { foreignKey: 'rewardId', as: 'reward' });
    Reward.hasMany(UserReward, { foreignKey: 'rewardId', as: 'userRewards' });

    UserMilestone.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    User.hasMany(UserMilestone, { foreignKey: 'userId', as: 'milestones' });
    UserMilestone.belongsTo(Milestone, { foreignKey: 'milestoneId', as: 'milestone' });
    Milestone.hasMany(UserMilestone, { foreignKey: 'milestoneId', as: 'userMilestones' });

    // E-COMMERCE ASSOCIATIONS
    // ======================
    User.hasMany(ShoppingCart, { foreignKey: 'userId', as: 'shoppingCarts' });
    ShoppingCart.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    ShoppingCart.hasMany(CartItem, { foreignKey: 'cartId', as: 'cartItems' });
    CartItem.belongsTo(ShoppingCart, { foreignKey: 'cartId', as: 'cart' });
    CartItem.belongsTo(StorefrontItem, { foreignKey: 'storefrontItemId', as: 'storefrontItem' });
    StorefrontItem.hasMany(CartItem, { foreignKey: 'storefrontItemId', as: 'cartItems' });
    CartItem.belongsTo(ProductVariant, { foreignKey: 'productVariantId', as: 'productVariant' });
    ProductVariant.hasMany(CartItem, { foreignKey: 'productVariantId', as: 'cartItems' });
    // Phase 1 commerce: physical products can have variants (drink sizes, merch size/color)
    StorefrontItem.hasMany(ProductVariant, { foreignKey: 'storefrontItemId', as: 'variants' });
    ProductVariant.belongsTo(StorefrontItem, { foreignKey: 'storefrontItemId', as: 'storefrontItem' });

    // ORDER ASSOCIATIONS
    // ==================
    User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
    Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    Order.belongsTo(ShoppingCart, { foreignKey: 'cartId', as: 'cart' });
    Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'orderItems' });
    OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
    OrderItem.belongsTo(StorefrontItem, { foreignKey: 'storefrontItemId', as: 'storefrontItem' });
    OrderItem.belongsTo(ProductVariant, { foreignKey: 'productVariantId', as: 'productVariant' });
    ProductVariant.hasMany(OrderItem, { foreignKey: 'productVariantId', as: 'orderItems' });

    // PACKAGE ASSOCIATIONS
    // ====================
    User.hasMany(Package, { foreignKey: 'createdBy', as: 'createdPackages' });
    Package.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

    // FOOD SCANNER ASSOCIATIONS
    // =========================
    User.hasMany(FoodScanHistory, { foreignKey: 'userId', as: 'foodScans' });
    User.hasMany(Orientation, { foreignKey: 'userId', as: 'orientations' });
    FoodProduct.hasMany(FoodScanHistory, { foreignKey: 'productId', as: 'scanHistory' });

    if (DailyMacroLog) {
      User.hasMany(DailyMacroLog, { foreignKey: 'userId', as: 'dailyMacroLogs', constraints: false });
      DailyMacroLog.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });
    }
    
    FoodScanHistory.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    FoodScanHistory.belongsTo(FoodProduct, { foreignKey: 'productId', as: 'product' });
    
    // ORIENTATION ASSOCIATIONS
    // =======================
    Orientation.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // Social Model Associations
    // =========================
    // User -> Social Posts
    User.hasMany(SocialPost, { foreignKey: 'userId', as: 'socialPosts' });
    SocialPost.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // Social Posts -> Comments
    SocialPost.hasMany(SocialComment, { foreignKey: 'postId', as: 'comments' });
    SocialComment.belongsTo(SocialPost, { foreignKey: 'postId', as: 'post' });
    
    // User -> Comments
    User.hasMany(SocialComment, { foreignKey: 'userId', as: 'comments' });
    SocialComment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // Social Likes
    User.hasMany(SocialLike, { foreignKey: 'userId', as: 'likes' });
    SocialLike.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // Friendships
    User.hasMany(Friendship, { foreignKey: 'requesterId', as: 'sentFriendRequests' });
    User.hasMany(Friendship, { foreignKey: 'recipientId', as: 'receivedFriendRequests' });
    Friendship.belongsTo(User, { foreignKey: 'requesterId', as: 'requester' });
    Friendship.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });
    
    // ENHANCED GAMIFICATION CHALLENGE SYSTEM ASSOCIATIONS
    // ===================================================
    
    // User -> Challenges (Single definitive association)
    User.hasMany(Challenge, { foreignKey: 'createdBy', as: 'createdChallenges' });
    Challenge.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
    
    // Challenge Participants (Single system)
    User.hasMany(ChallengeParticipant, { foreignKey: 'userId', as: 'challengeParticipations' });
    ChallengeParticipant.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    Challenge.hasMany(ChallengeParticipant, { foreignKey: 'challengeId', as: 'participants' });
    ChallengeParticipant.belongsTo(Challenge, { foreignKey: 'challengeId', as: 'challenge' });

    // Challenge Submissions (entitlement-gated client proposal moderation queue)
    User.hasMany(ChallengeSubmission, { foreignKey: 'submittedByUserId', as: 'challengeSubmissions' });
    ChallengeSubmission.belongsTo(User, { foreignKey: 'submittedByUserId', as: 'submittedBy' });
    User.hasMany(ChallengeSubmission, { foreignKey: 'assignedTrainerId', as: 'assignedChallengeSubmissions' });
    ChallengeSubmission.belongsTo(User, { foreignKey: 'assignedTrainerId', as: 'assignedTrainer' });
    User.hasMany(ChallengeSubmission, { foreignKey: 'reviewedByUserId', as: 'reviewedChallengeSubmissions' });
    ChallengeSubmission.belongsTo(User, { foreignKey: 'reviewedByUserId', as: 'reviewedBy' });
    Challenge.hasMany(ChallengeSubmission, { foreignKey: 'approvedChallengeId', as: 'sourceSubmissions' });
    ChallengeSubmission.belongsTo(Challenge, { foreignKey: 'approvedChallengeId', as: 'approvedChallenge' });
    
    // Challenge -> Participants (Many-to-Many)
    Challenge.belongsToMany(User, {
      through: ChallengeParticipant,
      foreignKey: 'challengeId',
      otherKey: 'userId',
      as: 'participantUsers'
    });
    
    User.belongsToMany(Challenge, {
      through: ChallengeParticipant,
      foreignKey: 'userId', 
      otherKey: 'challengeId',
      as: 'participatingChallenges'
    });
    
    // Direct associations for detailed queries
    Challenge.hasMany(ChallengeParticipant, { foreignKey: 'challengeId', as: 'participantDetails' });
    ChallengeParticipant.belongsTo(Challenge, { foreignKey: 'challengeId', as: 'challengeDetails' });
    
    User.hasMany(ChallengeParticipant, { foreignKey: 'userId', as: 'participationDetails' });
    ChallengeParticipant.belongsTo(User, { foreignKey: 'userId', as: 'userDetails' });
    
    // User -> Goals
    User.hasMany(Goal, { foreignKey: 'userId', as: 'goals' });
    Goal.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // User -> Progress Data
    User.hasMany(ProgressData, { foreignKey: 'userId', as: 'progressData' });
    ProgressData.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // ─── SOCIAL GAMIFICATION ASSOCIATIONS ─────────────────────────────────────

    // User -> Streaks
    User.hasMany(Streak, { foreignKey: 'userId', as: 'streaks' });
    Streak.belongsTo(User, { foreignKey: 'userId', as: 'user' });

    // Goal -> Supporters (many-to-many through GoalSupporter)
    // Use a non-colliding alias because Goal already has a JSONB `supporters` attribute.
    Goal.hasMany(GoalSupporter, { foreignKey: 'goalId', as: 'supporterLinks' });
    GoalSupporter.belongsTo(Goal, { foreignKey: 'goalId', as: 'goal' });
    User.hasMany(GoalSupporter, { foreignKey: 'supporterId', as: 'supportedGoals' });
    GoalSupporter.belongsTo(User, { foreignKey: 'supporterId', as: 'supporter' });

    // Goal -> Comments
    Goal.hasMany(GoalComment, { foreignKey: 'goalId', as: 'comments' });
    GoalComment.belongsTo(Goal, { foreignKey: 'goalId', as: 'goal' });
    User.hasMany(GoalComment, { foreignKey: 'userId', as: 'goalComments' });
    GoalComment.belongsTo(User, { foreignKey: 'userId', as: 'author' });

    // Goal -> Likes
    Goal.hasMany(GoalLike, { foreignKey: 'goalId', as: 'likes' });
    GoalLike.belongsTo(Goal, { foreignKey: 'goalId', as: 'goal' });
    User.hasMany(GoalLike, { foreignKey: 'userId', as: 'goalLikes' });
    GoalLike.belongsTo(User, { foreignKey: 'userId', as: 'liker' });

    // Goal -> Milestones (normalized checkpoints)
    Goal.hasMany(GoalMilestone, { foreignKey: 'goalId', as: 'milestoneCheckpoints' });
    GoalMilestone.belongsTo(Goal, { foreignKey: 'goalId', as: 'goal' });

    // User -> Social Following (Enhanced)
    User.hasMany(UserFollow, { foreignKey: 'followerId', as: 'following' });
    User.hasMany(UserFollow, { foreignKey: 'followingId', as: 'followers' });
    
    UserFollow.belongsTo(User, { foreignKey: 'followerId', as: 'follower' });
    UserFollow.belongsTo(User, { foreignKey: 'followingId', as: 'following' });

    // CONTENT MODERATION ASSOCIATIONS
    // ===============================
    
    // PostReport associations
    User.hasMany(PostReport, { foreignKey: 'reporterId', as: 'reportsMade' });
    User.hasMany(PostReport, { foreignKey: 'contentAuthorId', as: 'reportsReceived' });
    User.hasMany(PostReport, { foreignKey: 'resolvedBy', as: 'reportsResolved' });
    
    PostReport.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });
    PostReport.belongsTo(User, { foreignKey: 'contentAuthorId', as: 'contentAuthor' });
    PostReport.belongsTo(User, { foreignKey: 'resolvedBy', as: 'resolver' });
    
    // ModerationAction associations
    User.hasMany(ModerationAction, { foreignKey: 'moderatorId', as: 'moderationActions' });
    User.hasMany(ModerationAction, { foreignKey: 'contentAuthorId', as: 'moderationActionsReceived' });
    
    ModerationAction.belongsTo(User, { foreignKey: 'moderatorId', as: 'moderator' });
    ModerationAction.belongsTo(User, { foreignKey: 'contentAuthorId', as: 'contentAuthor' });
    ModerationAction.belongsTo(PostReport, { foreignKey: 'relatedReportId', as: 'relatedReport' });
    PostReport.hasMany(ModerationAction, { foreignKey: 'relatedReportId', as: 'actions' });
    
    // Social content moderation associations
    User.hasMany(SocialPost, { foreignKey: 'flaggedBy', as: 'flaggedPosts' });
    User.hasMany(SocialPost, { foreignKey: 'lastModeratedBy', as: 'moderatedPosts' });
    User.hasMany(SocialComment, { foreignKey: 'flaggedBy', as: 'flaggedComments' });
    User.hasMany(SocialComment, { foreignKey: 'lastModeratedBy', as: 'moderatedComments' });
    
    SocialPost.belongsTo(User, { foreignKey: 'flaggedBy', as: 'flaggedByUser' });
    SocialPost.belongsTo(User, { foreignKey: 'lastModeratedBy', as: 'lastModeratedByUser' });
    SocialComment.belongsTo(User, { foreignKey: 'flaggedBy', as: 'flaggedByUser' });
    SocialComment.belongsTo(User, { foreignKey: 'lastModeratedBy', as: 'lastModeratedByUser' });

    // NOTIFICATION ASSOCIATIONS
    // =========================
    User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
    Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    User.hasMany(Notification, { foreignKey: 'senderId', as: 'sentNotifications' });
    Notification.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

    // REPORT ROOM SUPPORT ASSOCIATIONS
    // ================================
    User.hasMany(SupportIssue, { foreignKey: 'reporterUserId', as: 'reportedSupportIssues' });
    SupportIssue.belongsTo(User, { foreignKey: 'reporterUserId', as: 'reporter' });
    User.hasMany(SupportIssue, { foreignKey: 'assignedOwnerUserId', as: 'assignedSupportIssues' });
    SupportIssue.belongsTo(User, { foreignKey: 'assignedOwnerUserId', as: 'assignedOwner' });
    SupportIssue.belongsTo(SupportIssue, { foreignKey: 'duplicateOfIssueId', as: 'duplicateOf' });
    SupportIssue.hasMany(SupportIssue, { foreignKey: 'duplicateOfIssueId', as: 'duplicates' });
    SupportIssue.hasMany(SupportIssueEvent, { foreignKey: 'issueId', as: 'events' });
    SupportIssueEvent.belongsTo(SupportIssue, { foreignKey: 'issueId', as: 'issue' });
    User.hasMany(SupportIssueEvent, { foreignKey: 'actorUserId', as: 'supportIssueEvents' });
    SupportIssueEvent.belongsTo(User, { foreignKey: 'actorUserId', as: 'actor' });

    // AUTOMATION ASSOCIATIONS
    // =======================
    AutomationSequence.hasMany(AutomationLog, { foreignKey: 'sequenceId', as: 'logs' });
    AutomationLog.belongsTo(AutomationSequence, { foreignKey: 'sequenceId', as: 'sequence' });
    User.hasMany(AutomationLog, { foreignKey: 'userId', as: 'automationLogs' });
    AutomationLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    Lead.hasMany(AutomationLog, { foreignKey: 'leadId', as: 'automationLogs', constraints: false });
    AutomationLog.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead', constraints: false });
    
    // CONTACT ASSOCIATIONS
    // ===================
    User.hasMany(Contact, { foreignKey: 'userId', as: 'contacts' });
    Contact.belongsTo(User, { foreignKey: 'userId', as: 'user' });

    // FINANCIAL ASSOCIATIONS
    // ======================
    // User -> Financial Transactions
    User.hasMany(FinancialTransaction, { foreignKey: 'userId', as: 'financialTransactions' });
    FinancialTransaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // Order -> Financial Transactions
    Order.hasMany(FinancialTransaction, { foreignKey: 'orderId', as: 'financialTransactions' });
    FinancialTransaction.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
    
    // ShoppingCart -> Financial Transactions
    ShoppingCart.hasMany(FinancialTransaction, { foreignKey: 'cartId', as: 'financialTransactions' });
    FinancialTransaction.belongsTo(ShoppingCart, { foreignKey: 'cartId', as: 'cart' });
    
    // Business Metrics -> Top Package
    BusinessMetrics.belongsTo(StorefrontItem, { foreignKey: 'topPackageId', as: 'topPackage' });
    
    // Admin Notifications -> User (for user-related notifications)
    AdminNotification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    User.hasMany(AdminNotification, { foreignKey: 'userId', as: 'adminNotifications' });
    
    // Admin Notifications -> Financial Transaction
    AdminNotification.belongsTo(FinancialTransaction, { foreignKey: 'transactionId', as: 'transaction' });
    FinancialTransaction.hasMany(AdminNotification, { foreignKey: 'transactionId', as: 'notifications' });
    
    // Admin Notifications -> Read By (admin user)
    AdminNotification.belongsTo(User, { foreignKey: 'readBy', as: 'readByUser' });

    // ENHANCED EXISTING ASSOCIATIONS
    // ==============================
    // Challenge -> Goals (challenges can have related goals)
    // NOTE: Disabled — challengeId column does not exist in production goals table.
    // Re-enable after challenges feature is deployed with proper migration.
    // Challenge.hasMany(Goal, { foreignKey: 'challengeId', as: 'relatedGoals', constraints: false });
    // Goal.belongsTo(Challenge, { foreignKey: 'challengeId', as: 'relatedChallenge', constraints: false });

    // ProgressData -> Challenges (track challenge progress)
    ProgressData.belongsTo(Challenge, { foreignKey: 'challengeId', as: 'challenge', constraints: false });
    Challenge.hasMany(ProgressData, { foreignKey: 'challengeId', as: 'progressEntries', constraints: false });

    // NASM WORKOUT TRACKING ASSOCIATIONS
    // ==================================
    
    // Client-Trainer Assignment Associations
    User.hasMany(ClientTrainerAssignment, { foreignKey: 'clientId', as: 'clientAssignments' });
    User.hasMany(ClientTrainerAssignment, { foreignKey: 'trainerId', as: 'trainerAssignments' });
    User.hasMany(ClientTrainerAssignment, { foreignKey: 'assignedBy', as: 'assignmentsMade' });
    
    ClientTrainerAssignment.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
    ClientTrainerAssignment.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
    ClientTrainerAssignment.belongsTo(User, { foreignKey: 'assignedBy', as: 'assignedByUser' });
    
    // Trainer Commission Associations
    User.hasMany(TrainerCommission, { foreignKey: 'trainerId', as: 'trainerCommissions', constraints: false });
    User.hasMany(TrainerCommission, { foreignKey: 'clientId', as: 'clientCommissions', constraints: false });
    TrainerCommission.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
    TrainerCommission.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
    Order.hasMany(TrainerCommission, { foreignKey: 'orderId', as: 'commissions', constraints: false });
    TrainerCommission.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

    // Trainer Permission Associations
    User.hasMany(TrainerPermissions, { foreignKey: 'trainerId', as: 'trainerPermissions' });
    TrainerPermissions.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
    TrainerPermissions.belongsTo(User, { foreignKey: 'grantedBy', as: 'grantedByUser' });
    
    // Daily Workout Form Associations
    User.hasMany(DailyWorkoutForm, { foreignKey: 'clientId', as: 'workoutForms' });
    User.hasMany(DailyWorkoutForm, { foreignKey: 'trainerId', as: 'trainedWorkouts' });
    DailyWorkoutForm.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
    DailyWorkoutForm.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
    DailyWorkoutForm.belongsTo(WorkoutSession, { foreignKey: 'sessionId', as: 'session' });
    WorkoutSession.hasMany(DailyWorkoutForm, { foreignKey: 'sessionId', as: 'dailyForms' });

    // Immutable proof that a prescribed plan assignment was completed.
    User.hasMany(WorkoutPlanCompletionReceipt, { foreignKey: 'clientId', as: 'workoutPlanCompletionReceipts' });
    WorkoutPlan.hasMany(WorkoutPlanCompletionReceipt, { foreignKey: 'workoutPlanId', as: 'completionReceipts' });
    WorkoutPlanCompletionReceipt.belongsTo(WorkoutPlan, { foreignKey: 'workoutPlanId', as: 'plan' });
    DailyWorkoutForm.hasOne(WorkoutPlanCompletionReceipt, { foreignKey: 'dailyWorkoutFormId', as: 'planCompletionReceipt' });
    WorkoutPlanCompletionReceipt.belongsTo(DailyWorkoutForm, { foreignKey: 'dailyWorkoutFormId', as: 'dailyWorkoutForm' });
    WorkoutSession.hasMany(WorkoutPlanCompletionReceipt, { foreignKey: 'workoutSessionId', as: 'planCompletionReceipts' });
    WorkoutPlanCompletionReceipt.belongsTo(WorkoutSession, { foreignKey: 'workoutSessionId', as: 'workoutSession' });
    WorkoutPlanCompletionReceipt.belongsTo(User, { foreignKey: 'clientId', as: 'client' });

    // Client Onboarding Questionnaire Associations
    User.hasMany(ClientOnboardingQuestionnaire, { foreignKey: 'userId', as: 'onboardingQuestionnaires' });
    User.hasMany(ClientOnboardingQuestionnaire, { foreignKey: 'createdBy', as: 'createdQuestionnaires' });
    ClientOnboardingQuestionnaire.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    ClientOnboardingQuestionnaire.belongsTo(User, { foreignKey: 'createdBy', as: 'createdByUser' });

    // Client Onboarding Coverage Ledger Associations
    User.hasMany(ClientOnboardingCoverageItem, { foreignKey: 'clientId', as: 'onboardingCoverageItems' });
    User.hasMany(ClientOnboardingCoverageItem, { foreignKey: 'lastMarkedBy', as: 'markedOnboardingCoverageItems' });
    ClientOnboardingCoverageItem.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
    ClientOnboardingCoverageItem.belongsTo(User, { foreignKey: 'lastMarkedBy', as: 'lastMarkedByUser' });

    // Client Baseline Measurements Associations
    User.hasMany(ClientBaselineMeasurements, { foreignKey: 'userId', as: 'baselineMeasurements' });
    User.hasMany(ClientBaselineMeasurements, { foreignKey: 'recordedBy', as: 'baselineMeasurementsRecorded' });
    ClientBaselineMeasurements.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    ClientBaselineMeasurements.belongsTo(User, { foreignKey: 'recordedBy', as: 'recordedByUser' });
    ClientBaselineMeasurements.belongsTo(WorkoutSession, { foreignKey: 'sessionId', as: 'session' });
    WorkoutSession.hasMany(ClientBaselineMeasurements, { foreignKey: 'sessionId', as: 'baselineMeasurements' });

    // Client Nutrition Plan Associations
    User.hasMany(ClientNutritionPlan, { foreignKey: 'userId', as: 'nutritionPlans' });
    User.hasMany(ClientNutritionPlan, { foreignKey: 'createdBy', as: 'nutritionPlansCreated' });
    ClientNutritionPlan.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    ClientNutritionPlan.belongsTo(User, { foreignKey: 'createdBy', as: 'createdByUser' });

    // Client Photo Associations
    User.hasMany(ClientPhoto, { foreignKey: 'userId', as: 'clientPhotos' });
    User.hasMany(ClientPhoto, { foreignKey: 'uploadedBy', as: 'uploadedClientPhotos' });
    ClientPhoto.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    ClientPhoto.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploadedByUser' });

    // Client Note Associations
    User.hasMany(ClientNote, { foreignKey: 'userId', as: 'clientNotes' });
    User.hasMany(ClientNote, { foreignKey: 'trainerId', as: 'trainerNotes' });
    ClientNote.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    ClientNote.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
    ClientNote.belongsTo(Session, { foreignKey: 'relatedSessionId', as: 'session' });
    Session.hasMany(ClientNote, { foreignKey: 'relatedSessionId', as: 'sessionNotes' });
    
    // Workout Exercise Associations
    WorkoutSession.hasMany(WorkoutLog, { foreignKey: 'sessionId', as: 'logs' });
    WorkoutLog.belongsTo(WorkoutSession, { foreignKey: 'sessionId', as: 'session' });

    // Workout Exercise Associations
    WorkoutSession.hasMany(WorkoutExercise, { foreignKey: 'workoutSessionId', as: 'exercises' });
    WorkoutExercise.belongsTo(WorkoutSession, { foreignKey: 'workoutSessionId', as: 'workoutSession' });
    WorkoutExercise.belongsTo(Exercise, { foreignKey: 'exerciseId', as: 'exercise' });
    Exercise.hasMany(WorkoutExercise, { foreignKey: 'exerciseId', as: 'workoutExercises' });

    // Exercise ↔ MuscleGroup & Equipment (many-to-many via join tables)
    // Required by workoutService.getWorkoutSessions() includes
    if (MuscleGroup && ExerciseMuscleGroup) {
      Exercise.belongsToMany(MuscleGroup, { through: ExerciseMuscleGroup, foreignKey: 'exerciseId', otherKey: 'muscleGroupId', as: 'muscleGroups', constraints: false });
      MuscleGroup.belongsToMany(Exercise, { through: ExerciseMuscleGroup, foreignKey: 'muscleGroupId', otherKey: 'exerciseId', as: 'exercises', constraints: false });
    }
    if (Equipment && ExerciseEquipment) {
      Exercise.belongsToMany(Equipment, { through: ExerciseEquipment, foreignKey: 'exerciseId', otherKey: 'equipmentId', as: 'equipment', constraints: false });
      Equipment.belongsToMany(Exercise, { through: ExerciseEquipment, foreignKey: 'equipmentId', otherKey: 'exerciseId', as: 'exercises', constraints: false });
    }

    // Set Associations (for WorkoutExercise performance tracking)
    WorkoutExercise.hasMany(Set, { foreignKey: 'workoutExerciseId', as: 'sets' });
    Set.belongsTo(WorkoutExercise, { foreignKey: 'workoutExerciseId', as: 'workoutExercise' });

    // VIDEO CATALOG ASSOCIATIONS
    // ==========================

    // User -> VideoCatalog (creator)
    User.hasMany(VideoCatalog, { foreignKey: 'creatorId', as: 'createdVideos' });
    VideoCatalog.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });

    // User -> VideoCollection (creator)
    User.hasMany(VideoCollection, { foreignKey: 'creatorId', as: 'createdCollections' });
    VideoCollection.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });

    // VideoCatalog <-> VideoCollection (M:N through VideoCollectionItem)
    VideoCatalog.belongsToMany(VideoCollection, {
      through: VideoCollectionItem,
      foreignKey: 'videoId',
      otherKey: 'collectionId',
      as: 'collections'
    });
    VideoCollection.belongsToMany(VideoCatalog, {
      through: VideoCollectionItem,
      foreignKey: 'collectionId',
      otherKey: 'videoId',
      as: 'videos'
    });

    // Direct join table associations (for ordering queries)
    VideoCollection.hasMany(VideoCollectionItem, { foreignKey: 'collectionId', as: 'collectionItems' });
    VideoCollectionItem.belongsTo(VideoCollection, { foreignKey: 'collectionId', as: 'collection' });
    VideoCatalog.hasMany(VideoCollectionItem, { foreignKey: 'videoId', as: 'collectionMemberships' });
    VideoCollectionItem.belongsTo(VideoCatalog, { foreignKey: 'videoId', as: 'video' });

    // User -> UserWatchHistory (snake_case FKs — matches migration/model column names)
    User.hasMany(UserWatchHistory, { foreignKey: 'user_id', as: 'watchHistory' });
    UserWatchHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
    VideoCatalog.hasMany(UserWatchHistory, { foreignKey: 'video_id', as: 'watchRecords' });
    UserWatchHistory.belongsTo(VideoCatalog, { foreignKey: 'video_id', as: 'video' });

    // User -> VideoAccessGrant (snake_case FKs — matches migration/model column names)
    User.hasMany(VideoAccessGrant, { foreignKey: 'user_id', as: 'videoAccessGrants' });
    VideoAccessGrant.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
    User.hasMany(VideoAccessGrant, { foreignKey: 'granted_by', as: 'grantedVideoAccess' });
    VideoAccessGrant.belongsTo(User, { foreignKey: 'granted_by', as: 'grantor' });
    VideoCatalog.hasMany(VideoAccessGrant, { foreignKey: 'video_id', as: 'accessGrants' });
    VideoAccessGrant.belongsTo(VideoCatalog, { foreignKey: 'video_id', as: 'video' });
    VideoCollection.hasMany(VideoAccessGrant, { foreignKey: 'collection_id', as: 'accessGrants' });
    VideoAccessGrant.belongsTo(VideoCollection, { foreignKey: 'collection_id', as: 'collection' });

    // VideoCatalog -> VideoOutboundClick (snake_case FKs — matches migration/model column names)
    VideoCatalog.hasMany(VideoOutboundClick, { foreignKey: 'video_id', as: 'outboundClicks' });
    VideoOutboundClick.belongsTo(VideoCatalog, { foreignKey: 'video_id', as: 'video' });
    User.hasMany(VideoOutboundClick, { foreignKey: 'user_id', as: 'videoOutboundClicks' });
    VideoOutboundClick.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

    // AI Privacy Associations
    User.hasOne(AiPrivacyProfile, { foreignKey: 'userId', as: 'aiPrivacyProfile' });
    AiPrivacyProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    User.hasMany(AiInteractionLog, { foreignKey: 'userId', as: 'aiInteractionLogs' });
    AiInteractionLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    User.hasMany(AiCommandAuditLog, { foreignKey: 'userId', as: 'aiCommandAuditLogs' });
    AiCommandAuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    User.hasMany(AdminAccountAuditLog, { foreignKey: 'actorUserId', as: 'adminAccountActions' });
    AdminAccountAuditLog.belongsTo(User, { foreignKey: 'actorUserId', as: 'actor' });
    User.hasMany(AdminAccountAuditLog, { foreignKey: 'targetUserId', as: 'adminAccountAuditTargets' });
    AdminAccountAuditLog.belongsTo(User, { foreignKey: 'targetUserId', as: 'target' });

    // Long-Horizon Planning Associations (Phase 5C)
    User.hasMany(LongTermProgramPlan, { foreignKey: 'userId', as: 'programPlans' });
    LongTermProgramPlan.belongsTo(User, { foreignKey: 'userId', as: 'client' });
    LongTermProgramPlan.belongsTo(User, { foreignKey: 'createdByUserId', as: 'creator' });
    LongTermProgramPlan.belongsTo(User, { foreignKey: 'approvedByUserId', as: 'approver' });
    LongTermProgramPlan.belongsTo(AiInteractionLog, { foreignKey: 'aiGenerationRequestId', as: 'generationLog' });
    LongTermProgramPlan.hasMany(ProgramMesocycleBlock, { foreignKey: 'planId', as: 'mesocycleBlocks' });
    ProgramMesocycleBlock.belongsTo(LongTermProgramPlan, { foreignKey: 'planId', as: 'programPlan' });

    // Waiver + Consent Associations (Phase 5W-B)
    User.hasMany(WaiverRecord, { foreignKey: 'userId', as: 'waiverRecords' });
    WaiverRecord.belongsTo(User, { foreignKey: 'userId', as: 'user' });

    User.hasMany(WaiverVersion, { foreignKey: 'createdByUserId', as: 'createdWaiverVersions' });
    WaiverVersion.belongsTo(User, { foreignKey: 'createdByUserId', as: 'creator' });

    WaiverRecord.hasMany(WaiverRecordVersion, { foreignKey: 'waiverRecordId', as: 'versionLinks' });
    WaiverRecordVersion.belongsTo(WaiverRecord, { foreignKey: 'waiverRecordId', as: 'waiverRecord' });
    WaiverVersion.hasMany(WaiverRecordVersion, { foreignKey: 'waiverVersionId', as: 'recordLinks' });
    WaiverRecordVersion.belongsTo(WaiverVersion, { foreignKey: 'waiverVersionId', as: 'waiverVersion' });

    WaiverRecord.hasOne(WaiverConsentFlags, { foreignKey: 'waiverRecordId', as: 'consentFlags' });
    WaiverConsentFlags.belongsTo(WaiverRecord, { foreignKey: 'waiverRecordId', as: 'waiverRecord' });

    WaiverRecord.hasMany(PendingWaiverMatch, { foreignKey: 'waiverRecordId', as: 'pendingMatches' });
    PendingWaiverMatch.belongsTo(WaiverRecord, { foreignKey: 'waiverRecordId', as: 'waiverRecord' });
    PendingWaiverMatch.belongsTo(User, { foreignKey: 'candidateUserId', as: 'candidateUser' });
    PendingWaiverMatch.belongsTo(User, { foreignKey: 'reviewedByUserId', as: 'reviewedByUser' });

    // Trainer Onboarding (self-serve application + contract e-sign)
    User.hasMany(TrainerApplication, { foreignKey: 'userId', as: 'trainerApplications' });
    TrainerApplication.belongsTo(User, { foreignKey: 'userId', as: 'applicant' });
    TrainerApplication.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer' });

    // Trainer-Economics (SWA-62) — append-only pricing audit trail (S1)
    StorefrontItem.hasMany(PriceChangeLog, { foreignKey: 'storeFrontItemId', as: 'priceChangeLogs' });
    PriceChangeLog.belongsTo(StorefrontItem, { foreignKey: 'storeFrontItemId', as: 'storefrontItem' });
    PriceChangeLog.belongsTo(User, { foreignKey: 'changedByUserId', as: 'changedBy' });

    User.hasMany(AiConsentLog, { foreignKey: 'userId', as: 'aiConsentLogs' });
    AiConsentLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    User.hasMany(AiConsentLog, { foreignKey: 'actorUserId', as: 'aiConsentActions' });
    AiConsentLog.belongsTo(User, { foreignKey: 'actorUserId', as: 'actor' });

    console.log('✅ Sequelize model associations established successfully');
    console.log('✅ Financial Intelligence models integrated');
    console.log('✅ NASM Workout Tracking models integrated');
    console.log('✅ Content Moderation models integrated');
    console.log('✅ Video Catalog models integrated');
    console.log('✅ AI Privacy models integrated');
    console.log('✅ Long-Horizon Planning models integrated');
    console.log('✅ Waiver + Consent models integrated');

    // Body Measurement & Milestone Associations (Phase 11)
    User.hasMany(BodyMeasurement, { foreignKey: 'userId', as: 'bodyMeasurements' });
    BodyMeasurement.belongsTo(User, { foreignKey: 'userId', as: 'client' });
    BodyMeasurement.belongsTo(User, { foreignKey: 'recordedBy', as: 'recorder' });
    BodyMeasurement.hasMany(MeasurementMilestone, { foreignKey: 'measurementId', as: 'milestones' });
    MeasurementMilestone.belongsTo(BodyMeasurement, { foreignKey: 'measurementId', as: 'measurement' });
    User.hasMany(MeasurementMilestone, { foreignKey: 'userId', as: 'measurementMilestones' });
    MeasurementMilestone.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    console.log('✅ Body Measurement & Milestone models integrated');

    // Wearable Data Associations
    const WearableData = WearableDataModule.default;
    User.hasMany(WearableData, { foreignKey: 'userId', as: 'wearableData' });
    WearableData.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    console.log('✅ Wearable Data model integrated');

    // Pain/Injury Tracking Associations (NASM CES + Squat University)
    User.hasMany(ClientPainEntry, { foreignKey: 'userId', as: 'painEntries' });
    ClientPainEntry.belongsTo(User, { foreignKey: 'userId', as: 'client' });
    ClientPainEntry.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });
    ClientPainEntry.hasMany(PainEntryCorrectiveExercise, { foreignKey: 'painEntryId', as: 'correctiveExercises' });
    PainEntryCorrectiveExercise.belongsTo(ClientPainEntry, { foreignKey: 'painEntryId', as: 'painEntry' });
    PainEntryCorrectiveExercise.belongsTo(Exercise, { foreignKey: 'exerciseId', as: 'exercise' });

    // Restore (off-day recovery) completion ledger (2026-07-21)
    User.hasMany(RecoveryActivityLog, { foreignKey: 'userId', as: 'recoveryActivities' });
    RecoveryActivityLog.belongsTo(User, { foreignKey: 'userId', as: 'client' });
    RecoveryActivityLog.belongsTo(Exercise, { foreignKey: 'exerciseId', as: 'exercise' });
    Exercise.hasMany(RecoveryActivityLog, { foreignKey: 'exerciseId', as: 'recoveryActivities' });
    Exercise.hasMany(PainEntryCorrectiveExercise, { foreignKey: 'exerciseId', as: 'correctiveUses' });
    console.log('✅ Pain/Injury Tracking models integrated');

    // Movement Analysis Associations (Phase 13)
    User.hasMany(MovementAnalysis, { foreignKey: 'userId', as: 'movementAnalyses' });
    User.hasMany(MovementAnalysis, { foreignKey: 'conductedBy', as: 'conductedAnalyses' });
    MovementAnalysis.belongsTo(User, { foreignKey: 'userId', as: 'client' });
    MovementAnalysis.belongsTo(User, { foreignKey: 'conductedBy', as: 'conductor' });
    MovementAnalysis.hasMany(PendingMovementAnalysisMatch, { foreignKey: 'movementAnalysisId', as: 'pendingMatches' });
    PendingMovementAnalysisMatch.belongsTo(MovementAnalysis, { foreignKey: 'movementAnalysisId', as: 'movementAnalysis' });
    PendingMovementAnalysisMatch.belongsTo(User, { foreignKey: 'candidateUserId', as: 'candidateUser' });
    PendingMovementAnalysisMatch.belongsTo(User, { foreignKey: 'reviewedByUserId', as: 'reviewedByUser' });
    console.log('✅ Movement Analysis models integrated');

    // Form Analysis Associations (Phase 2 - AI Form Analysis)
    User.hasMany(FormAnalysis, { foreignKey: 'userId', as: 'formAnalyses' });
    FormAnalysis.belongsTo(User, { foreignKey: 'userId', as: 'client' });
    FormAnalysis.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
    User.hasOne(MovementProfile, { foreignKey: 'userId', as: 'movementProfile' });
    MovementProfile.belongsTo(User, { foreignKey: 'userId', as: 'client' });
    console.log('✅ Form Analysis models integrated');

    // Custom Exercise Builder Associations (Phase 6 - Biomechanics Studio)
    User.hasMany(CustomExercise, { foreignKey: 'trainerId', as: 'customExercises' });
    CustomExercise.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
    CustomExercise.belongsTo(CustomExercise, { foreignKey: 'parentVersionId', as: 'parentVersion' });
    CustomExercise.hasMany(CustomExercise, { foreignKey: 'parentVersionId', as: 'childVersions' });
    console.log('✅ Custom Exercise Builder models integrated');

    // Equipment Profile Manager Associations (Phase 7)
    User.hasMany(EquipmentProfile, { foreignKey: 'trainerId', as: 'equipmentProfiles' });
    EquipmentProfile.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
    EquipmentProfile.hasMany(EquipmentItem, { foreignKey: 'profileId', as: 'items' });
    EquipmentItem.belongsTo(EquipmentProfile, { foreignKey: 'profileId', as: 'profile' });
    EquipmentItem.hasMany(EquipmentExerciseMap, { foreignKey: 'equipmentItemId', as: 'exerciseMappings' });
    EquipmentExerciseMap.belongsTo(EquipmentItem, { foreignKey: 'equipmentItemId', as: 'equipmentItem' });
    EquipmentExerciseMap.belongsTo(CustomExercise, { foreignKey: 'customExerciseId', as: 'customExercise' });
    User.hasMany(EquipmentScanSession, { foreignKey: 'trainerId', as: 'equipmentScanSessions' });
    EquipmentScanSession.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
    EquipmentProfile.hasMany(EquipmentScanSession, { foreignKey: 'profileId', as: 'scanSessions' });
    EquipmentScanSession.belongsTo(EquipmentProfile, { foreignKey: 'profileId', as: 'profile' });
    EquipmentScanSession.hasMany(EquipmentScanCandidate, { foreignKey: 'sessionId', as: 'candidates' });
    EquipmentScanCandidate.belongsTo(EquipmentScanSession, { foreignKey: 'sessionId', as: 'session' });
    EquipmentScanCandidate.belongsTo(EquipmentProfile, { foreignKey: 'profileId', as: 'profile' });
    EquipmentScanCandidate.belongsTo(EquipmentItem, { foreignKey: 'equipmentItemId', as: 'createdItem', constraints: false });
    EquipmentScanCandidate.belongsTo(EquipmentItem, { foreignKey: 'duplicateOfItemId', as: 'duplicateOfItem', constraints: false });
    EquipmentItem.hasMany(EquipmentScanCandidate, { foreignKey: 'equipmentItemId', as: 'scanCandidates', constraints: false });
    EquipmentScanCandidate.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer', constraints: false });
    User.hasMany(EquipmentScanCandidate, { foreignKey: 'reviewedBy', as: 'reviewedEquipmentScanCandidates', constraints: false });
    console.log('✅ Equipment Profile Manager models integrated');

    // Workout Variation Engine Associations (Phase 8)
    User.hasMany(VariationLog, { foreignKey: 'clientId', as: 'variationLogsAsClient' });
    User.hasMany(VariationLog, { foreignKey: 'trainerId', as: 'variationLogsAsTrainer' });
    VariationLog.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
    VariationLog.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
    VariationLog.belongsTo(EquipmentProfile, { foreignKey: 'equipmentProfileId', as: 'equipmentProfile' });
    console.log('✅ Workout Variation Engine models integrated');

    // Boot Camp Class Builder Associations (Phase 10)
    User.hasMany(BootcampTemplate, { foreignKey: 'trainerId', as: 'bootcampTemplates' });
    BootcampTemplate.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
    BootcampTemplate.belongsTo(EquipmentProfile, { foreignKey: 'equipmentProfileId', as: 'equipmentProfile' });
    BootcampTemplate.belongsTo(BootcampSpaceProfile, { foreignKey: 'spaceProfileId', as: 'spaceProfile' });
    BootcampTemplate.hasMany(BootcampStation, { foreignKey: 'templateId', as: 'stations', onDelete: 'CASCADE' });
    BootcampTemplate.hasMany(BootcampExercise, { foreignKey: 'templateId', as: 'exercises', onDelete: 'CASCADE' });
    BootcampTemplate.hasMany(BootcampOverflowPlan, { foreignKey: 'templateId', as: 'overflowPlans', onDelete: 'CASCADE' });
    BootcampTemplate.hasMany(BootcampClassLog, { foreignKey: 'templateId', as: 'classLogs' });
    BootcampTemplate.hasMany(BootcampStretch, { foreignKey: 'templateId', as: 'stretches', onDelete: 'CASCADE' });

    BootcampStretch.belongsTo(BootcampTemplate, { foreignKey: 'templateId', as: 'template' });

    BootcampStation.belongsTo(BootcampTemplate, { foreignKey: 'templateId', as: 'template' });
    BootcampStation.hasMany(BootcampExercise, { foreignKey: 'stationId', as: 'exercises', onDelete: 'CASCADE' });

    BootcampExercise.belongsTo(BootcampTemplate, { foreignKey: 'templateId', as: 'template' });
    BootcampExercise.belongsTo(BootcampStation, { foreignKey: 'stationId', as: 'station' });

    BootcampOverflowPlan.belongsTo(BootcampTemplate, { foreignKey: 'templateId', as: 'template' });

    User.hasMany(BootcampClassLog, { foreignKey: 'trainerId', as: 'bootcampClassLogs' });
    BootcampClassLog.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
    BootcampClassLog.belongsTo(BootcampTemplate, { foreignKey: 'templateId', as: 'template' });

    User.hasMany(BootcampSpaceProfile, { foreignKey: 'trainerId', as: 'bootcampSpaces' });
    BootcampSpaceProfile.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });

    User.hasMany(ExerciseTrend, { foreignKey: 'approvedBy', as: 'approvedTrends' });
    ExerciseTrend.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
    console.log('✅ Boot Camp Class Builder models integrated');

    // ── Boot Camp Sprint Planner Associations (Phase 10B) ────────────
    User.hasMany(BootcampSprint, { foreignKey: 'trainerId', as: 'bootcampSprints' });
    BootcampSprint.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
    BootcampSprint.belongsTo(BootcampSpaceProfile, { foreignKey: 'spaceProfileId', as: 'spaceProfile', constraints: false });
    BootcampSprint.belongsTo(BootcampSprint, { foreignKey: 'previousSprintId', as: 'previousSprint', constraints: false });

    BootcampSprint.hasMany(SprintWeek, { foreignKey: 'sprintId', as: 'weeks', onDelete: 'CASCADE' });
    SprintWeek.belongsTo(BootcampSprint, { foreignKey: 'sprintId', as: 'sprint' });

    BootcampSprint.hasMany(SprintClassSlot, { foreignKey: 'sprintId', as: 'classSlots', onDelete: 'CASCADE' });
    SprintClassSlot.belongsTo(BootcampSprint, { foreignKey: 'sprintId', as: 'sprint' });

    SprintWeek.hasMany(SprintClassSlot, { foreignKey: 'weekId', as: 'classSlots', onDelete: 'CASCADE' });
    SprintClassSlot.belongsTo(SprintWeek, { foreignKey: 'weekId', as: 'week' });

    SprintClassSlot.belongsTo(BootcampTemplate, { foreignKey: 'templateId', as: 'template', constraints: false });
    SprintClassSlot.belongsTo(BootcampClassLog, { foreignKey: 'classLogId', as: 'classLog', constraints: false });

    BootcampSprint.hasMany(SprintExerciseMemory, { foreignKey: 'sprintId', as: 'exerciseMemory', onDelete: 'CASCADE' });
    SprintExerciseMemory.belongsTo(BootcampSprint, { foreignKey: 'sprintId', as: 'sprint' });
    SprintExerciseMemory.belongsTo(SprintClassSlot, { foreignKey: 'slotId', as: 'classSlot', constraints: false });

    console.log('✅ Boot Camp Sprint Planner models integrated');

    // ── Photo Gallery & Lead Generation Associations ─────────────────
    GalleryEvent.hasMany(GalleryPhoto, { foreignKey: 'eventId', as: 'photos' });
    GalleryEvent.hasMany(GalleryVisitor, { foreignKey: 'eventId', as: 'visitors' });
    GalleryEvent.hasMany(GalleryDonation, { foreignKey: 'eventId', as: 'donations' });
    GalleryEvent.hasMany(GalleryReferral, { foreignKey: 'eventId', as: 'referrals' });
    GalleryEvent.belongsTo(GalleryPhoto, { foreignKey: 'coverPhotoId', as: 'coverPhoto', constraints: false });

    GalleryPhoto.belongsTo(GalleryEvent, { foreignKey: 'eventId', as: 'event' });
    GalleryPhoto.hasMany(EnhancementRequest, { foreignKey: 'photoId', as: 'enhancementRequests' });
    GalleryPhoto.hasMany(PhotoVote, { foreignKey: 'photoId', as: 'votes' });

    GalleryVisitor.belongsTo(GalleryEvent, { foreignKey: 'eventId', as: 'event' });
    GalleryVisitor.hasMany(EnhancementRequest, { foreignKey: 'visitorId', as: 'enhancementRequests' });
    GalleryVisitor.hasMany(GalleryDonation, { foreignKey: 'visitorId', as: 'donations' });
    GalleryVisitor.hasMany(GalleryReferral, { foreignKey: 'visitorId', as: 'referrals' });
    GalleryVisitor.hasMany(PhotoVote, { foreignKey: 'visitorId', as: 'votes' });

    EnhancementRequest.belongsTo(GalleryVisitor, { foreignKey: 'visitorId', as: 'visitor' });
    EnhancementRequest.belongsTo(GalleryPhoto, { foreignKey: 'photoId', as: 'photo' });

    GalleryDonation.belongsTo(GalleryVisitor, { foreignKey: 'visitorId', as: 'visitor' });
    GalleryDonation.belongsTo(GalleryEvent, { foreignKey: 'eventId', as: 'event' });

    // Print orders (Slice 3d — admin fulfillment view eager-loads visitor/photo/event)
    PrintOrder.belongsTo(GalleryVisitor, { foreignKey: 'visitorId', as: 'visitor' });
    PrintOrder.belongsTo(GalleryPhoto, { foreignKey: 'photoId', as: 'photo' });
    PrintOrder.belongsTo(GalleryEvent, { foreignKey: 'eventId', as: 'event' });
    GalleryEvent.hasMany(PrintOrder, { foreignKey: 'eventId', as: 'printOrders' });
    GalleryVisitor.hasMany(PrintOrder, { foreignKey: 'visitorId', as: 'printOrders' });

    GalleryReferral.belongsTo(GalleryVisitor, { foreignKey: 'visitorId', as: 'visitor' });
    GalleryReferral.belongsTo(GalleryEvent, { foreignKey: 'eventId', as: 'event' });

    PhotoVote.belongsTo(GalleryPhoto, { foreignKey: 'photoId', as: 'photo' });
    PhotoVote.belongsTo(GalleryVisitor, { foreignKey: 'visitorId', as: 'visitor' });

    GalleryMessage.belongsTo(GalleryVisitor, { foreignKey: 'visitorId', as: 'visitor' });
    GalleryMessage.belongsTo(GalleryEvent, { foreignKey: 'eventId', as: 'event' });
    GalleryVisitor.hasMany(GalleryMessage, { foreignKey: 'visitorId', as: 'messages' });
    GalleryEvent.hasMany(GalleryMessage, { foreignKey: 'eventId', as: 'messages' });
    console.log('✅ Photo Gallery & Lead Generation models integrated');

    // ── CRM Lead Management Associations ─────────────────
    Lead.hasMany(LeadActivity, { foreignKey: 'leadId', as: 'activities' });
    Lead.belongsTo(User, { foreignKey: 'convertedUserId', as: 'convertedUser', constraints: false });
    Lead.belongsTo(User, { foreignKey: 'assignedTrainerId', as: 'assignedTrainer', constraints: false });
    Lead.belongsTo(User, { foreignKey: 'referredByUserId', as: 'referrer', constraints: false });
    Lead.belongsTo(GalleryVisitor, { foreignKey: 'galleryVisitorId', as: 'galleryVisitor', constraints: false });

    LeadActivity.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });
    LeadActivity.belongsTo(User, { foreignKey: 'performedByUserId', as: 'performedBy', constraints: false });
    console.log('✅ CRM Lead Management models integrated');

    // Marketing Calendar Associations
    User.hasMany(MarketingCalendarItem, { foreignKey: 'createdBy', as: 'createdMarketingCalendarItems', constraints: false });
    User.hasMany(ContentProject, { foreignKey: 'createdBy', as: 'createdContentProjects', constraints: false });
    ContentProject.belongsTo(User, { foreignKey: 'createdBy', as: 'creator', constraints: false });
    User.hasMany(ContentProject, { foreignKey: 'updatedBy', as: 'updatedContentProjects', constraints: false });
    ContentProject.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater', constraints: false });
    MarketingCalendarItem.belongsTo(User, { foreignKey: 'createdBy', as: 'creator', constraints: false });
    User.hasMany(MarketingCalendarItem, { foreignKey: 'updatedBy', as: 'updatedMarketingCalendarItems', constraints: false });
    MarketingCalendarItem.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater', constraints: false });
    // Campaign spine ↔ calendar items (Marketing OS Slice 3b)
    MarketingCampaign.hasMany(MarketingCalendarItem, { foreignKey: 'campaignId', as: 'calendarItems', constraints: false });
    MarketingCalendarItem.belongsTo(MarketingCampaign, { foreignKey: 'campaignId', as: 'campaign', constraints: false });
    MarketingCampaign.belongsTo(User, { foreignKey: 'createdBy', as: 'creator', constraints: false });
    console.log('✅ Marketing Calendar model integrated');

    // Native Social Publishing Associations
    User.hasMany(SocialPublishingAccount, { foreignKey: 'createdBy', as: 'createdSocialPublishingAccounts', constraints: false });
    SocialPublishingAccount.belongsTo(User, { foreignKey: 'createdBy', as: 'creator', constraints: false });
    User.hasMany(SocialPublishingJob, { foreignKey: 'createdBy', as: 'createdSocialPublishingJobs', constraints: false });
    SocialPublishingJob.belongsTo(User, { foreignKey: 'createdBy', as: 'creator', constraints: false });
    SocialPublishingJob.hasMany(SocialPublishingAttempt, { foreignKey: 'jobId', as: 'attempts', constraints: false });
    SocialPublishingAttempt.belongsTo(SocialPublishingJob, { foreignKey: 'jobId', as: 'job', constraints: false });
    SocialPublishingAccount.hasMany(SocialPublishingAttempt, { foreignKey: 'accountId', as: 'attempts', constraints: false });
    SocialPublishingAttempt.belongsTo(SocialPublishingAccount, { foreignKey: 'accountId', as: 'account', constraints: false });
    console.log('✅ Native Social Publishing models integrated');

    // Return ONLY SEQUELIZE models for exporting
    return {
      User,
      Session,
      SessionType,
      ClientProgress,
      Gamification,
      Achievement,
      GamificationSettings,
      UserAchievement,
      UserReward,
      UserMilestone,
      Reward,
      Milestone,
      PointTransaction,
      
      // Enhanced Gamification Models
      Challenge,
      ChallengeParticipant,
      ChallengeSubmission,
      Goal,
      ProgressData,
      UserFollow,

      // Social Gamification Models
      Streak,
      GoalSupporter,
      GoalComment,
      GoalLike,
      GoalMilestone,

      // Social Models
      SocialPost,
      SocialComment,
      SocialLike,
      Friendship,
      SocialChallenge,
      SocialChallengeParticipant,
      ChallengeTeam,
      
      // Content Moderation Models
      PostReport,
      ModerationAction,
      
      // E-Commerce Models
      StorefrontItem,
      ProductVariant,
      ShoppingCart,
      CartItem,
      Order,
      OrderItem,
      SessionPackage,
      Package,
      AdminSpecial,
      
      // Food Scanner Models
      FoodIngredient,
      FoodProduct,
      FoodScanHistory,
      
      // Workout Models
      WorkoutPlan,
      WorkoutPlanDay,
      WorkoutPlanDayExercise,
      WorkoutSession,
      VideoSession,
      AvatarHome,
      OlympicEvent,
      WorkoutLog,
      WorkoutExercise,
      Exercise,
      Set,
      
      // Exercise Reference Models
      MuscleGroup,
      ExerciseMuscleGroup,
      Equipment,
      ExerciseEquipment,
      
      // Notification and Admin Models
      Orientation,
      Notification,
      NotificationSettings,
      AdminSettings,
      Contact,
      SupportIssue,
      SupportIssueEvent,
      
      // Financial Models
      FinancialTransaction,
      BusinessMetrics,
      AdminNotification,
      // Trainer pay ledger — was missing from THIS (full-setup) return while
      // present in the early-return literal above; the omission made
      // getModel('TrainerCommission') throw at runtime, silently disabling
      // BOTH purchase-share commission creation and session-flat accrual.
      TrainerCommission,

      // NASM Workout Tracking Models
      ClientTrainerAssignment,
      TrainerPermissions,
      TrainerAvailability,
      DailyWorkoutForm,
      WorkoutPlanCompletionReceipt,
      // Launch charter 2026-07 (PR engine / Recovery Board / History Backfill)
      PersonalRecord,
      RecoveryCompletion,
      HistoryBackfillRun,
      ClientOnboardingQuestionnaire,
      ClientOnboardingCoverageItem,
      ClientBaselineMeasurements,
      ClientNutritionPlan,
      ClientPhoto,
      ClientNote,
      AutomationSequence,
      AutomationLog,

      // AI Privacy Models
      AiPrivacyProfile,
      AiInteractionLog,
      AiCommandAuditLog,
      AdminAccountAuditLog,

      // AI Monitoring Models (Phase 10)
      AiMetricsBucket,
      AiMonitoringAlert,

      // Long-Horizon Planning Models (Phase 5C)
      LongTermProgramPlan,
      ProgramMesocycleBlock,

      // Waiver + Consent Models (Phase 5W-B)
      WaiverVersion,
      WaiverRecord,
      WaiverRecordVersion,
      WaiverConsentFlags,
      PendingWaiverMatch,
      TrainerApplication,
      // Trainer-Economics (SWA-62)
      PriceChangeLog,
      AiConsentLog,

      // Video Catalog Models
      VideoCatalog,
      VideoCollection,
      VideoCollectionItem,
      UserWatchHistory,
      VideoAccessGrant,
      VideoOutboundClick,
      VideoJobLog,

      // Body Measurement & Milestone Models (Phase 11)
      BodyMeasurement,
      MeasurementMilestone,

      // Wearable Data
      WearableData,

      // Pain/Injury Tracking
      ClientPainEntry,
      PainEntryCorrectiveExercise,

      // Restore (off-day recovery)
      RecoveryActivityLog,

      // Movement Analysis Models (Phase 13)
      MovementAnalysis,
      PendingMovementAnalysisMatch,

      // Form Analysis Models (Phase 2 - AI Form Analysis)
      FormAnalysis,
      MovementProfile,

      // Custom Exercise Builder (Phase 6 - Biomechanics Studio)
      CustomExercise,

      // Equipment Profile Manager (Phase 7)
      EquipmentProfile,
      EquipmentItem,
      EquipmentExerciseMap,
      EquipmentScanSession,
      EquipmentScanCandidate,

      // Workout Variation Engine (Phase 8)
      VariationLog,
      // Boot Camp Class Builder (Phase 10)
      BootcampTemplate, BootcampStation, BootcampExercise,
      BootcampOverflowPlan, BootcampClassLog, BootcampSpaceProfile,
      BootcampStretch, ExerciseTrend,

      // Boot Camp Sprint Planner (Phase 10B)
      BootcampSprint, SprintWeek, SprintClassSlot, SprintExerciseMemory,

      // Photo Gallery & Lead Generation Models
      GalleryEvent, GalleryPhoto, GalleryVisitor, EnhancementRequest, GalleryDonation, GalleryReferral, PhotoVote, GalleryMessage, PrintOrder,

      // CRM Lead Management Models
      Lead, LeadActivity, MarketingCalendarItem, MarketingCampaign, ContentProject, SocialPublishingAccount, SocialPublishingJob, SocialPublishingAttempt,

      // AI Chat & Macro Logging Models
      AiConversation,
      ...(DailyMacroLog ? { DailyMacroLog } : {}),
      ...(DailyHydration ? { DailyHydration } : {}),

      // Subscription Models
      ...(Subscription ? { Subscription } : {}),

      // Phase 3 PLAUD multi-clip merge ingestion (Slice 3.1)
      PlaudClip,
      PlaudMergeRequest,
      PlaudClipMirrorJob,
      PlaudMergeLock,
      // Phase 5 PLAUD Auto-Ingestion via Applaud webhook (Slice 5.1)
      PlaudWebhookNonce,
    };
  } catch (error) {
    console.error('❌ Error setting up Sequelize model associations:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
};

// 🔒 ENHANCED SINGLETON: Prevent multiple association setups
let modelsInstance = null;
let isInitializing = false;

// We'll use dynamic imports to get around the circular dependency issue
const importModelsAndAssociate = async () => {
  try {
    // 🔒 CRITICAL FIX: Prevent concurrent initialization
    if (modelsInstance) {
      console.log('✅ ASSOCIATION SINGLETON: Returning existing models instance');
      return modelsInstance;
    }
    
    if (isInitializing) {
      console.log('⏳ ASSOCIATION SINGLETON: Waiting for initialization to complete...');
      // Wait for initialization to complete by polling
      let attempts = 0;
      while (isInitializing && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (modelsInstance) {
        console.log('✅ ASSOCIATION SINGLETON: Initialization completed, returning models');
        return modelsInstance;
      } else {
        throw new Error('Association initialization timed out');
      }
    }
    
    isInitializing = true;
    console.log('🚀 ASSOCIATION SINGLETON: Starting first-time initialization...');
    
    modelsInstance = await setupAssociations();
    isInitializing = false;
    
    console.log('✅ ASSOCIATION SINGLETON: Initialization completed successfully');
    return modelsInstance;
  } catch (error) {
    isInitializing = false;
    console.error('❌ ASSOCIATION SINGLETON: Failed to import models and set up associations:', error);
    throw error;
  }
};

export default async function getModels() {
  return await importModelsAndAssociate();
}
