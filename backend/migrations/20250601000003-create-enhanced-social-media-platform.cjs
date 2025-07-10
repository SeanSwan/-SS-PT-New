/**
 * ENHANCED SOCIAL MEDIA PLATFORM MIGRATION
 * =========================================
 * This migration creates all the enhanced social media tables for the 7-star
 * social media experience including advanced features like AI recommendations,
 * live streaming, creator economy, social commerce, and comprehensive analytics.
 * 
 * Run this migration to upgrade your existing SwanStudios platform to support
 * the full enhanced social media feature set.
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🚀 Creating Enhanced Social Media Tables...');
      
      // ===============================
      // 1. ENHANCED SOCIAL POSTS TABLE
      // ===============================
      await queryInterface.createTable('EnhancedSocialPosts', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        content: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        contentType: {
          type: Sequelize.ENUM(
            'text', 'rich_text', 'markdown', 'workout_summary',
            'achievement_showcase', 'transformation_story', 'recipe_share',
            'challenge_update', 'live_stream', 'poll', 'question', 'tip'
          ),
          defaultValue: 'text',
          allowNull: false
        },
        aiGeneratedTags: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        aiContentScore: {
          type: Sequelize.DECIMAL(3, 2),
          defaultValue: 0.0
        },
        aiModerationFlags: {
          type: Sequelize.JSON,
          defaultValue: {}
        },
        aiPersonalizationData: {
          type: Sequelize.JSON,
          defaultValue: {}
        },
        mediaItems: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        mediaProcessingStatus: {
          type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed'),
          defaultValue: 'completed'
        },
        category: {
          type: Sequelize.ENUM(
            'fitness', 'nutrition', 'mental_health', 'transformation',
            'motivation', 'education', 'community', 'challenge',
            'achievement', 'lifestyle', 'product_review', 'tips'
          ),
          defaultValue: 'fitness'
        },
        subcategory: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        tags: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        visibility: {
          type: Sequelize.ENUM('public', 'friends', 'followers', 'private', 'subscribers_only'),
          defaultValue: 'friends',
          allowNull: false
        },
        allowComments: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        allowSharing: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        allowAIAnalysis: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        likesCount: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        commentsCount: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        sharesCount: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        viewsCount: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        saveCount: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        engagementScore: {
          type: Sequelize.DECIMAL(10, 6),
          defaultValue: 0.0
        },
        isPoll: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        pollData: {
          type: Sequelize.JSON,
          defaultValue: null
        },
        isLiveStream: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        liveStreamData: {
          type: Sequelize.JSON,
          defaultValue: null
        },
        communityId: {
          type: Sequelize.UUID,
          allowNull: true
          // TODO: Add foreign key constraint after Communities table is created
          // references: {
          //   model: 'Communities',
          //   key: 'id'
          // }
        },
        isPromoted: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        isPinned: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        isSponsored: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        sponsorData: {
          type: Sequelize.JSON,
          defaultValue: null
        },
        monetizationEnabled: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        workoutSessionId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        challengeId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        achievementId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        originalPostId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'EnhancedSocialPosts',
            key: 'id'
          }
        },
        moderationStatus: {
          type: Sequelize.ENUM('pending', 'approved', 'flagged', 'removed', 'appealed'),
          defaultValue: 'approved'
        },
        moderationFlags: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        moderatedBy: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          }
        },
        moderatedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        location: {
          type: Sequelize.JSON,
          defaultValue: null
        },
        contextData: {
          type: Sequelize.JSON,
          defaultValue: {}
        },
        altText: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        audioDescription: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        captionsAvailable: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        analyticsData: {
          type: Sequelize.JSON,
          defaultValue: {}
        },
        reachMetrics: {
          type: Sequelize.JSON,
          defaultValue: {}
        },
        isScheduled: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        scheduledFor: {
          type: Sequelize.DATE,
          allowNull: true
        },
        autoDeleteAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM('draft', 'published', 'archived', 'deleted'),
          defaultValue: 'published'
        },
        publishedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        },
        lastEditedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction });
      
      // ===============================
      // 2. SOCIAL CONNECTIONS TABLE
      // ===============================
      await queryInterface.createTable('SocialConnections', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        followerId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        followingId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        connectionType: {
          type: Sequelize.ENUM('follow', 'friend_request', 'friendship', 'family', 'trainer_client', 'business'),
          defaultValue: 'follow',
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('pending', 'accepted', 'declined', 'blocked', 'muted', 'unfollowed'),
          defaultValue: 'pending',
          allowNull: false
        },
        isMutual: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        mutualSince: {
          type: Sequelize.DATE,
          allowNull: true
        },
        privacyLevel: {
          type: Sequelize.ENUM('public', 'friends', 'close_friends', 'family', 'private'),
          defaultValue: 'friends'
        },
        canSeeProfile: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        canSeePosts: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        canSeeWorkouts: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        canSeeProgress: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        canMessage: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        canTag: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        canInvite: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        notifyOnPost: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        notifyOnAchievement: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        notifyOnWorkout: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        notifyOnLive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        socialCircles: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        connectionSource: {
          type: Sequelize.ENUM(
            'manual', 'contacts', 'recommendations', 'mutual_friends',
            'location', 'gym', 'challenge', 'trainer_referral', 'ai_suggested'
          ),
          defaultValue: 'manual'
        },
        interactionScore: {
          type: Sequelize.DECIMAL(10, 6),
          defaultValue: 0.0
        },
        lastInteraction: {
          type: Sequelize.DATE,
          allowNull: true
        },
        totalInteractions: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        mutualConnectionsCount: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        likesGiven: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        likesReceived: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        commentsExchanged: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        messagesExchanged: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        workoutsShared: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        challengesCompleted: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        aiCompatibilityScore: {
          type: Sequelize.DECIMAL(5, 3),
          defaultValue: 0.0
        },
        aiRecommendationStrength: {
          type: Sequelize.DECIMAL(5, 3),
          defaultValue: 0.0
        },
        sharedInterests: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        connectionLocation: {
          type: Sequelize.JSON,
          defaultValue: null
        },
        connectionContext: {
          type: Sequelize.JSON,
          defaultValue: null
        },
        isInfluencer: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        isVerified: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        isProfessional: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        professionalRole: {
          type: Sequelize.ENUM('trainer', 'nutritionist', 'coach', 'therapist', 'other'),
          allowNull: true
        },
        sharedChallenges: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        sharedWorkoutPlans: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        collaborationHistory: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        reportCount: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        moderationFlags: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        restrictionLevel: {
          type: Sequelize.ENUM('none', 'limited', 'restricted', 'blocked'),
          defaultValue: 'none'
        },
        connectedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        },
        lastUpdated: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        },
        disconnectedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        }
      }, { transaction });
      
      // ===============================
      // 3. COMMUNITIES TABLE
      // ===============================
      await queryInterface.createTable('Communities', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        name: {
          type: Sequelize.STRING(200),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        shortDescription: {
          type: Sequelize.STRING(300),
          allowNull: true
        },
        photo: {
          type: Sequelize.STRING,
          allowNull: true
        },
        bannerImage: {
          type: Sequelize.STRING,
          allowNull: true
        },
        theme: {
          type: Sequelize.JSON,
          defaultValue: {}
        },
        category: {
          type: Sequelize.ENUM(
            'fitness', 'nutrition', 'weight_loss', 'muscle_building', 'cardio',
            'yoga', 'crossfit', 'running', 'cycling', 'swimming', 'dancing',
            'mental_health', 'motivation', 'challenges', 'competitions',
            'professionals', 'beginners', 'advanced', 'local', 'virtual'
          ),
          allowNull: false
        },
        subcategory: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        tags: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        createdBy: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          }
        },
        moderators: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        admins: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        membershipType: {
          type: Sequelize.ENUM('open', 'approval_required', 'invite_only', 'premium'),
          defaultValue: 'open'
        },
        maxMembers: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        currentMembers: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        isVerified: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        isPremium: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        activityLevel: {
          type: Sequelize.ENUM('very_low', 'low', 'moderate', 'high', 'very_high'),
          defaultValue: 'moderate'
        },
        totalPosts: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        totalComments: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        engagementScore: {
          type: Sequelize.DECIMAL(10, 6),
          defaultValue: 0.0
        },
        lastActivity: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        },
        features: {
          type: Sequelize.JSON,
          defaultValue: {
            posts: true,
            challenges: true,
            events: true,
            polls: true,
            media_sharing: true,
            live_streams: true,
            leaderboards: true,
            achievements: true,
            mentorship: false,
            marketplace: false
          }
        },
        rules: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        welcomeMessage: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        guidelines: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        isLocationBased: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        location: {
          type: Sequelize.JSON,
          defaultValue: null
        },
        meetingInfo: {
          type: Sequelize.JSON,
          defaultValue: null
        },
        timezone: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        activeChallenges: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        challengeHistory: {
          type: Sequelize.JSON,
          defaultValue: []
        },
        leaderboard: {
          type: Sequelize.JSON,
          defaultValue: {}
        },
        aiRecommendationScore: {
          type: Sequelize.DECIMAL(5, 3),
          defaultValue: 0.0
        },
        targetAudience: {
          type: Sequelize.JSON,
          defaultValue: {}
        },
        contentPreferences: {
          type: Sequelize.JSON,
          defaultValue: {}
        },
        isCommercial: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        subscriptionRequired: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        subscriptionPrice: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        },
        sponsorInfo: {
          type: Sequelize.JSON,
          defaultValue: null
        },
        privacyLevel: {
          type: Sequelize.ENUM('public', 'private', 'hidden'),
          defaultValue: 'public'
        },
        contentModeration: {
          type: Sequelize.ENUM('none', 'basic', 'strict', 'custom'),
          defaultValue: 'basic'
        },
        moderationSettings: {
          type: Sequelize.JSON,
          defaultValue: {}
        },
        reportCount: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        analyticsData: {
          type: Sequelize.JSON,
          defaultValue: {}
        },
        growthMetrics: {
          type: Sequelize.JSON,
          defaultValue: {}
        },
        engagementMetrics: {
          type: Sequelize.JSON,
          defaultValue: {}
        },
        status: {
          type: Sequelize.ENUM('active', 'inactive', 'archived', 'suspended', 'deleted'),
          defaultValue: 'active'
        },
        featured: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        trending: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW
        },
        archivedAt: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction });
      
      // Continue with creating more tables...
      console.log('✅ Enhanced Social Posts, Connections, and Communities tables created');
      
      await transaction.commit();
      console.log('🎉 Enhanced Social Media Platform migration completed successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🗑️ Dropping Enhanced Social Media Tables...');
      
      // Drop tables in reverse order to handle foreign key dependencies
      const tablesToDrop = [
        'EnhancedSocialPosts',
        'SocialConnections', 
        'Communities'
        // Add more tables here as they are created
      ];
      
      for (const table of tablesToDrop) {
        await queryInterface.dropTable(table, { transaction });
        console.log(`✅ Dropped table: ${table}`);
      }
      
      await transaction.commit();
      console.log('🎉 Enhanced Social Media Platform rollback completed successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
