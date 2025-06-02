/**
 * ENHANCED SOCIAL MODELS - ASSOCIATIONS & INDEX
 * ==============================================
 * Complete associations setup for the 7-star social media system.
 * This file establishes all relationships between enhanced social models.
 */

// Import all enhanced social models
import EnhancedSocialPost from './EnhancedSocialPost.mjs';
import SocialConnection from './SocialConnection.mjs';
import Community from './Community.mjs';
import CommunityMembership from './CommunityMembership.mjs';
import { Conversation, Message, ConversationParticipant } from './Messaging.mjs';
import { EnhancedNotification, NotificationPreference } from './EnhancedNotification.mjs';
import { LiveStream, LiveStreamViewer, LiveStreamChat, LiveStreamPoll, LiveStreamPollVote } from './LiveStreaming.mjs';
import { CreatorProfile, BrandPartnership, CreatorSubscription, CreatorAnalytics } from './CreatorEconomy.mjs';
import { SocialProduct, ProductReview, SocialShoppingCart, SocialCartItem, ProductWishlist } from './SocialCommerce.mjs';
import { SocialEvent, EventAttendance, EventDiscussion, EventPhoto } from './EventManagement.mjs';
import { UserPreferences, UserInteraction, Recommendation, ContentSimilarity, UserSimilarity } from './AIRecommendations.mjs';
import { SocialAnalytics, AnalyticsDashboard, Insight, PerformanceBenchmark } from './SocialAnalytics.mjs';

// Import database connection
import db from '../../../database.mjs';

/**
 * Setup Enhanced Social Model Associations
 * This function establishes all relationships between the enhanced social models
 */
const setupEnhancedSocialAssociations = () => {
  console.log('🔗 Setting up Enhanced Social Model Associations...');
  
  try {
    // ===============================
    // ENHANCED SOCIAL POST ASSOCIATIONS
    // ===============================
    
    // User associations (assuming User model exists)
    if (db.models.User) {
      // User -> Enhanced Social Posts
      db.models.User.hasMany(EnhancedSocialPost, { foreignKey: 'userId', as: 'enhancedSocialPosts' });
      EnhancedSocialPost.belongsTo(db.models.User, { foreignKey: 'userId', as: 'author' });
      
      // User -> Moderated Posts
      db.models.User.hasMany(EnhancedSocialPost, { foreignKey: 'moderatedBy', as: 'moderatedPosts' });
      EnhancedSocialPost.belongsTo(db.models.User, { foreignKey: 'moderatedBy', as: 'moderator' });
    }
    
    // Community associations
    Community.hasMany(EnhancedSocialPost, { foreignKey: 'communityId', as: 'posts' });
    EnhancedSocialPost.belongsTo(Community, { foreignKey: 'communityId', as: 'community' });
    
    // Self-referential for shared posts
    EnhancedSocialPost.hasMany(EnhancedSocialPost, { foreignKey: 'originalPostId', as: 'sharedPosts' });
    EnhancedSocialPost.belongsTo(EnhancedSocialPost, { foreignKey: 'originalPostId', as: 'originalPost' });
    
    // ===============================
    // SOCIAL CONNECTION ASSOCIATIONS
    // ===============================
    
    if (db.models.User) {
      // Follower relationships
      db.models.User.hasMany(SocialConnection, { foreignKey: 'followerId', as: 'following' });
      db.models.User.hasMany(SocialConnection, { foreignKey: 'followingId', as: 'followers' });
      
      SocialConnection.belongsTo(db.models.User, { foreignKey: 'followerId', as: 'follower' });
      SocialConnection.belongsTo(db.models.User, { foreignKey: 'followingId', as: 'following' });
    }
    
    // ===============================
    // COMMUNITY ASSOCIATIONS
    // ===============================
    
    if (db.models.User) {
      // Community creator
      db.models.User.hasMany(Community, { foreignKey: 'createdBy', as: 'createdCommunities' });
      Community.belongsTo(db.models.User, { foreignKey: 'createdBy', as: 'creator' });
      
      // Community memberships
      db.models.User.hasMany(CommunityMembership, { foreignKey: 'userId', as: 'communityMemberships' });
      CommunityMembership.belongsTo(db.models.User, { foreignKey: 'userId', as: 'user' });
      
      // Invited by relationships
      db.models.User.hasMany(CommunityMembership, { foreignKey: 'invitedBy', as: 'communityInvitations' });
      CommunityMembership.belongsTo(db.models.User, { foreignKey: 'invitedBy', as: 'inviter' });
    }
    
    Community.hasMany(CommunityMembership, { foreignKey: 'communityId', as: 'memberships' });
    CommunityMembership.belongsTo(Community, { foreignKey: 'communityId', as: 'community' });
    
    // ===============================
    // MESSAGING ASSOCIATIONS
    // ===============================
    
    if (db.models.User) {
      // Conversation participants
      db.models.User.hasMany(Conversation, { foreignKey: 'createdBy', as: 'createdConversations' });
      Conversation.belongsTo(db.models.User, { foreignKey: 'createdBy', as: 'creator' });
      
      // Messages
      db.models.User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
      Message.belongsTo(db.models.User, { foreignKey: 'senderId', as: 'sender' });
      
      // Conversation participants
      db.models.User.hasMany(ConversationParticipant, { foreignKey: 'userId', as: 'conversationParticipations' });
      ConversationParticipant.belongsTo(db.models.User, { foreignKey: 'userId', as: 'user' });
      
      db.models.User.hasMany(ConversationParticipant, { foreignKey: 'invitedBy', as: 'conversationInvitations' });
      ConversationParticipant.belongsTo(db.models.User, { foreignKey: 'invitedBy', as: 'inviter' });
    }
    
    // Conversation -> Messages
    Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages' });
    Message.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });
    
    // Conversation -> Participants
    Conversation.hasMany(ConversationParticipant, { foreignKey: 'conversationId', as: 'participants' });
    ConversationParticipant.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });
    
    // Message replies
    Message.hasMany(Message, { foreignKey: 'replyToId', as: 'replies' });
    Message.belongsTo(Message, { foreignKey: 'replyToId', as: 'replyTo' });
    
    // ===============================
    // NOTIFICATION ASSOCIATIONS
    // ===============================
    
    if (db.models.User) {
      // User enhanced notifications (unique alias to avoid conflict with base Notification model)
      db.models.User.hasMany(EnhancedNotification, { foreignKey: 'userId', as: 'enhancedNotifications' });
      EnhancedNotification.belongsTo(db.models.User, { foreignKey: 'userId', as: 'recipient' });
      
      // Enhanced notification senders
      db.models.User.hasMany(EnhancedNotification, { foreignKey: 'senderId', as: 'sentEnhancedNotifications' });
      EnhancedNotification.belongsTo(db.models.User, { foreignKey: 'senderId', as: 'sender' });
      
      // Notification preferences
      db.models.User.hasOne(NotificationPreference, { foreignKey: 'userId', as: 'notificationPreferences' });
      NotificationPreference.belongsTo(db.models.User, { foreignKey: 'userId', as: 'user' });
    }
    
    // ===============================
    // LIVE STREAMING ASSOCIATIONS
    // ===============================
    
    if (db.models.User) {
      // Live streams
      db.models.User.hasMany(LiveStream, { foreignKey: 'streamerId', as: 'liveStreams' });
      LiveStream.belongsTo(db.models.User, { foreignKey: 'streamerId', as: 'streamer' });
      
      // Stream viewers
      db.models.User.hasMany(LiveStreamViewer, { foreignKey: 'userId', as: 'streamViews' });
      LiveStreamViewer.belongsTo(db.models.User, { foreignKey: 'userId', as: 'user' });
      
      // Stream chat
      db.models.User.hasMany(LiveStreamChat, { foreignKey: 'userId', as: 'streamMessages' });
      LiveStreamChat.belongsTo(db.models.User, { foreignKey: 'userId', as: 'user' });
      
      // Poll creation
      db.models.User.hasMany(LiveStreamPoll, { foreignKey: 'createdBy', as: 'createdPolls' });
      LiveStreamPoll.belongsTo(db.models.User, { foreignKey: 'createdBy', as: 'creator' });
      
      // Poll votes
      db.models.User.hasMany(LiveStreamPollVote, { foreignKey: 'userId', as: 'pollVotes' });
      LiveStreamPollVote.belongsTo(db.models.User, { foreignKey: 'userId', as: 'user' });
    }
    
    // Stream -> Viewers
    LiveStream.hasMany(LiveStreamViewer, { foreignKey: 'streamId', as: 'viewers' });
    LiveStreamViewer.belongsTo(LiveStream, { foreignKey: 'streamId', as: 'stream' });
    
    // Stream -> Chat
    LiveStream.hasMany(LiveStreamChat, { foreignKey: 'streamId', as: 'chatMessages' });
    LiveStreamChat.belongsTo(LiveStream, { foreignKey: 'streamId', as: 'stream' });
    
    // Stream -> Polls
    LiveStream.hasMany(LiveStreamPoll, { foreignKey: 'streamId', as: 'polls' });
    LiveStreamPoll.belongsTo(LiveStream, { foreignKey: 'streamId', as: 'stream' });
    
    // Poll -> Votes
    LiveStreamPoll.hasMany(LiveStreamPollVote, { foreignKey: 'pollId', as: 'votes' });
    LiveStreamPollVote.belongsTo(LiveStreamPoll, { foreignKey: 'pollId', as: 'poll' });
    
    // ===============================
    // CREATOR ECONOMY ASSOCIATIONS
    // ===============================
    
    if (db.models.User) {
      // Creator profiles
      db.models.User.hasOne(CreatorProfile, { foreignKey: 'userId', as: 'creatorProfile' });
      CreatorProfile.belongsTo(db.models.User, { foreignKey: 'userId', as: 'user' });
      
      // Brand partnerships
      db.models.User.hasMany(BrandPartnership, { foreignKey: 'creatorId', as: 'creatorPartnerships' });
      db.models.User.hasMany(BrandPartnership, { foreignKey: 'brandId', as: 'brandPartnerships' });
      BrandPartnership.belongsTo(db.models.User, { foreignKey: 'creatorId', as: 'creator' });
      BrandPartnership.belongsTo(db.models.User, { foreignKey: 'brandId', as: 'brand' });
      
      // Creator subscriptions
      db.models.User.hasMany(CreatorSubscription, { foreignKey: 'creatorId', as: 'subscriptions' });
      db.models.User.hasMany(CreatorSubscription, { foreignKey: 'subscriberId', as: 'subscribedTo' });
      CreatorSubscription.belongsTo(db.models.User, { foreignKey: 'creatorId', as: 'creator' });
      CreatorSubscription.belongsTo(db.models.User, { foreignKey: 'subscriberId', as: 'subscriber' });
      
      // Creator analytics
      db.models.User.hasMany(CreatorAnalytics, { foreignKey: 'creatorId', as: 'creatorAnalytics' });
      CreatorAnalytics.belongsTo(db.models.User, { foreignKey: 'creatorId', as: 'creator' });
    }
    
    // ===============================
    // SOCIAL COMMERCE ASSOCIATIONS
    // ===============================
    
    if (db.models.User) {
      // Products
      db.models.User.hasMany(SocialProduct, { foreignKey: 'sellerId', as: 'products' });
      SocialProduct.belongsTo(db.models.User, { foreignKey: 'sellerId', as: 'seller' });
      
      // Product reviews
      db.models.User.hasMany(ProductReview, { foreignKey: 'userId', as: 'productReviews' });
      ProductReview.belongsTo(db.models.User, { foreignKey: 'userId', as: 'reviewer' });
      
      // Shopping carts
      db.models.User.hasMany(SocialShoppingCart, { foreignKey: 'userId', as: 'socialShoppingCarts' });
      SocialShoppingCart.belongsTo(db.models.User, { foreignKey: 'userId', as: 'user' });
      
      // Wishlist
      db.models.User.hasMany(ProductWishlist, { foreignKey: 'userId', as: 'wishlists' });
      ProductWishlist.belongsTo(db.models.User, { foreignKey: 'userId', as: 'user' });
    }
    
    // Product -> Reviews
    SocialProduct.hasMany(ProductReview, { foreignKey: 'productId', as: 'reviews' });
    ProductReview.belongsTo(SocialProduct, { foreignKey: 'productId', as: 'product' });
    
    // Cart -> Cart Items
    SocialShoppingCart.hasMany(SocialCartItem, { foreignKey: 'cartId', as: 'items' });
    SocialCartItem.belongsTo(SocialShoppingCart, { foreignKey: 'cartId', as: 'cart' });
    
    // Product -> Cart Items
    SocialProduct.hasMany(SocialCartItem, { foreignKey: 'productId', as: 'cartItems' });
    SocialCartItem.belongsTo(SocialProduct, { foreignKey: 'productId', as: 'product' });
    
    // Product -> Wishlist
    SocialProduct.hasMany(ProductWishlist, { foreignKey: 'productId', as: 'wishlistItems' });
    ProductWishlist.belongsTo(SocialProduct, { foreignKey: 'productId', as: 'product' });
    
    // ===============================
    // EVENT MANAGEMENT ASSOCIATIONS
    // ===============================
    
    if (db.models.User) {
      // Event organizers
      db.models.User.hasMany(SocialEvent, { foreignKey: 'organizerId', as: 'organizedEvents' });
      SocialEvent.belongsTo(db.models.User, { foreignKey: 'organizerId', as: 'organizer' });
      
      // Event attendance
      db.models.User.hasMany(EventAttendance, { foreignKey: 'userId', as: 'eventAttendances' });
      EventAttendance.belongsTo(db.models.User, { foreignKey: 'userId', as: 'user' });
      
      // Event discussions
      db.models.User.hasMany(EventDiscussion, { foreignKey: 'userId', as: 'eventComments' });
      EventDiscussion.belongsTo(db.models.User, { foreignKey: 'userId', as: 'user' });
      
      // Event photos
      db.models.User.hasMany(EventPhoto, { foreignKey: 'userId', as: 'eventPhotos' });
      EventPhoto.belongsTo(db.models.User, { foreignKey: 'userId', as: 'photographer' });
    }
    
    // Event -> Attendance
    SocialEvent.hasMany(EventAttendance, { foreignKey: 'eventId', as: 'attendances' });
    EventAttendance.belongsTo(SocialEvent, { foreignKey: 'eventId', as: 'event' });
    
    // Event -> Discussions
    SocialEvent.hasMany(EventDiscussion, { foreignKey: 'eventId', as: 'discussions' });
    EventDiscussion.belongsTo(SocialEvent, { foreignKey: 'eventId', as: 'event' });
    
    // Event -> Photos
    SocialEvent.hasMany(EventPhoto, { foreignKey: 'eventId', as: 'photos' });
    EventPhoto.belongsTo(SocialEvent, { foreignKey: 'eventId', as: 'event' });
    
    // Community -> Events
    Community.hasMany(SocialEvent, { foreignKey: 'communityId', as: 'events' });
    SocialEvent.belongsTo(Community, { foreignKey: 'communityId', as: 'community' });
    
    // ===============================
    // AI RECOMMENDATIONS ASSOCIATIONS
    // ===============================
    
    if (db.models.User) {
      // User preferences
      db.models.User.hasOne(UserPreferences, { foreignKey: 'userId', as: 'preferences' });
      UserPreferences.belongsTo(db.models.User, { foreignKey: 'userId', as: 'user' });
      
      // User interactions
      db.models.User.hasMany(UserInteraction, { foreignKey: 'userId', as: 'interactions' });
      UserInteraction.belongsTo(db.models.User, { foreignKey: 'userId', as: 'user' });
      
      // Recommendations
      db.models.User.hasMany(Recommendation, { foreignKey: 'userId', as: 'recommendations' });
      Recommendation.belongsTo(db.models.User, { foreignKey: 'userId', as: 'user' });
      
      // User similarities
      db.models.User.hasMany(UserSimilarity, { foreignKey: 'user1Id', as: 'similarities1' });
      db.models.User.hasMany(UserSimilarity, { foreignKey: 'user2Id', as: 'similarities2' });
      UserSimilarity.belongsTo(db.models.User, { foreignKey: 'user1Id', as: 'user1' });
      UserSimilarity.belongsTo(db.models.User, { foreignKey: 'user2Id', as: 'user2' });
    }
    
    // ===============================
    // ANALYTICS ASSOCIATIONS
    // ===============================
    
    if (db.models.User) {
      // Analytics ownership
      db.models.User.hasMany(SocialAnalytics, { foreignKey: 'ownerId', as: 'analytics' });
      SocialAnalytics.belongsTo(db.models.User, { foreignKey: 'ownerId', as: 'owner' });
      
      // Analytics dashboards
      db.models.User.hasMany(AnalyticsDashboard, { foreignKey: 'userId', as: 'dashboards' });
      AnalyticsDashboard.belongsTo(db.models.User, { foreignKey: 'userId', as: 'user' });
      
      // Insights
      db.models.User.hasMany(Insight, { foreignKey: 'userId', as: 'insights' });
      Insight.belongsTo(db.models.User, { foreignKey: 'userId', as: 'user' });
    }
    
    console.log('✅ Enhanced Social Model Associations setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up Enhanced Social Model Associations:', error);
    throw error;
  }
};

// Export all enhanced models and the setup function
export {
  // Core social models
  EnhancedSocialPost,
  SocialConnection,
  Community,
  CommunityMembership,
  
  // Messaging models
  Conversation,
  Message,
  ConversationParticipant,
  
  // Notification models
  EnhancedNotification,
  NotificationPreference,
  
  // Live streaming models
  LiveStream,
  LiveStreamViewer,
  LiveStreamChat,
  LiveStreamPoll,
  LiveStreamPollVote,
  
  // Creator economy models
  CreatorProfile,
  BrandPartnership,
  CreatorSubscription,
  CreatorAnalytics,
  
  // Social commerce models
  SocialProduct,
  ProductReview,
  SocialShoppingCart,
  SocialCartItem,
  ProductWishlist,
  
  // Event management models
  SocialEvent,
  EventAttendance,
  EventDiscussion,
  EventPhoto,
  
  // AI recommendation models
  UserPreferences,
  UserInteraction,
  Recommendation,
  ContentSimilarity,
  UserSimilarity,
  
  // Analytics models
  SocialAnalytics,
  AnalyticsDashboard,
  Insight,
  PerformanceBenchmark,
  
  // Setup function
  setupEnhancedSocialAssociations
};

export default setupEnhancedSocialAssociations;
