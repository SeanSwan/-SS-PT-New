/**
 * Social Media Command Components Index
 * ====================================
 * 
 * Export all social media management components
 */

export { default as SocialMediaCommandCenter } from './SocialMediaCommandCenter';

// Re-export types
export interface SocialMediaPost {
  id: string;
  platform: 'instagram' | 'facebook' | 'twitter' | 'tiktok' | 'youtube';
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
    followerCount: number;
  };
  content: {
    text?: string;
    images: string[];
    videos: string[];
    hashtags: string[];
    mentions: string[];
  };
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
    saves: number;
  };
  moderation: {
    status: 'pending' | 'approved' | 'rejected' | 'flagged';
    flagReasons: string[];
    reviewedBy?: string;
    reviewedAt?: string;
    aiConfidenceScore: number;
    sentimentScore: number;
  };
}

export interface CommunityAnalytics {
  totalPosts: number;
  totalEngagement: number;
  activeUsers: number;
  growthRate: number;
  topHashtags: Array<{ tag: string; count: number; growth: number }>;
  platformDistribution: Array<{ platform: string; percentage: number; posts: number }>;
  sentimentAnalysis: {
    positive: number;
    neutral: number;
    negative: number;
  };
}
