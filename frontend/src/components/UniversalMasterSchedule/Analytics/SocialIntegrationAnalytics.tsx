/**
 * Social Media Integration Analytics
 * =================================
 *
 * Advanced analytics for social media and community engagement:
 * - Workout completion to social post correlation
 * - Gamification engagement metrics
 * - Community challenge performance
 * - Client acquisition through social channels
 * - Viral coefficient and organic growth tracking
 * - Influencer trainer identification
 *
 * Critical for measuring the social media impact on business growth.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import {
  TrendingUp,
  Heart,
  MessageSquare,
  Share2,
  Award,
  Target,
  Users,
  Zap,
  Camera,
  Video,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Star,
  Flame,
  Trophy,
  Crown,
  ThumbsUp,
  Eye,
  Play,
  ArrowUp,
  TrendingDown,
  Calendar,
  Clock,
  MapPin,
  Tag
} from 'lucide-react';

interface SocialMetrics {
  totalPosts: number;
  totalLikes: number;
  totalShares: number;
  totalComments: number;
  engagementRate: number;
  viralCoefficient: number;
  organicReach: number;
  hashtagPerformance: Record<string, number>;
  bestPostingTimes: string[];
  topInfluencers: Array<{
    id: string;
    name: string;
    avatar?: string;
    followers: number;
    engagement: number;
    posts: number;
  }>;
}

interface GamificationMetrics {
  totalPoints: number;
  challengesCompleted: number;
  badgesEarned: number;
  leaderboardRank: number;
  streakDays: number;
  communityEngagement: number;
  referrals: number;
  socialShares: number;
}

interface SocialIntegrationAnalyticsProps {
  sessions: any[];
  clients: any[];
  trainers: any[];
  dateRange: string;
}

const SocialIntegrationAnalytics: React.FC<SocialIntegrationAnalyticsProps> = ({
  sessions,
  clients,
  trainers,
  dateRange
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'challenges' | 'influencers' | 'content'>('overview');

  // Mock comprehensive social data
  const socialMetrics = useMemo<SocialMetrics>(() => ({
    totalPosts: 1247,
    totalLikes: 18500,
    totalShares: 3200,
    totalComments: 5600,
    engagementRate: 8.5,
    viralCoefficient: 1.4,
    organicReach: 85000,
    hashtagPerformance: {
      '#SwanStudiosStrong': 1250,
      '#FitnessJourney': 890,
      '#TransformationTuesday': 750,
      '#WorkoutWednesday': 650,
      '#MotivationMonday': 580,
      '#FitnessMotivation': 520,
      '#SwanStudiosFamily': 480,
      '#HealthyLifestyle': 420
    },
    bestPostingTimes: ['6:00 AM', '12:00 PM', '6:00 PM', '8:00 PM'],
    topInfluencers: [
      {
        id: '1',
        name: 'Sarah Johnson',
        followers: 15000,
        engagement: 12.5,
        posts: 45
      },
      {
        id: '2',
        name: 'Mike Chen',
        followers: 8500,
        engagement: 9.8,
        posts: 38
      },
      {
        id: '3',
        name: 'Emma Rodriguez',
        followers: 6200,
        engagement: 15.2,
        posts: 29
      }
    ]
  }), []);

  const gamificationMetrics = useMemo<GamificationMetrics>(() => ({
    totalPoints: 156780,
    challengesCompleted: 89,
    badgesEarned: 234,
    leaderboardRank: 1,
    streakDays: 45,
    communityEngagement: 92,
    referrals: 28,
    socialShares: 156
  }), []);

  // Calculate social conversion metrics
  const conversionMetrics = useMemo(() => {
    const socialTrafficConversion = 15.8; // % of social traffic that converts
    const organicGrowthRate = 12.5; // Monthly organic growth %
    const influencerROI = 340; // % ROI from influencer partnerships
    const communityRetention = 89; // % retention for community-engaged users

    return {
      socialTrafficConversion,
      organicGrowthRate,
      influencerROI,
      communityRetention,
      estimatedRevenue: Math.round(socialMetrics.organicReach * 0.02 * 150) // Rough calculation
    };
  }, [socialMetrics]);

  const getEngagementColor = (rate: number) => {
    if (rate >= 15) return '#22c55e';
    if (rate >= 10) return '#3b82f6';
    if (rate >= 5) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <SocialAnalyticsContainer>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header with Tab Navigation */}
        <HeaderSection>
          <div>
            <PageTitle>
              Social Media & Community Analytics
            </PageTitle>
            <PageSubtitle>
              Track social engagement impact on business growth
            </PageSubtitle>
          </div>

          <TabNavigation>
            {['overview', 'challenges', 'influencers', 'content'].map((tab) => (
              <TabButton
                key={tab}
                $active={activeTab === tab}
                onClick={() => setActiveTab(tab as any)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </TabButton>
            ))}
          </TabNavigation>
        </HeaderSection>

        {/* Key Social Metrics */}
        {activeTab === 'overview' && (
          <MetricsOverview>
            <MetricsGrid>
              <SocialMetricCard>
                <SocialIcon>
                  <Eye size={24} />
                </SocialIcon>
                <MetricContent>
                  <MetricValue>{socialMetrics.organicReach.toLocaleString()}</MetricValue>
                  <MetricLabel>Organic Reach</MetricLabel>
                  <MetricTrend>
                    <ArrowUp size={14} color="#22c55e" />
                    +{conversionMetrics.organicGrowthRate}% this month
                  </MetricTrend>
                </MetricContent>
              </SocialMetricCard>

              <SocialMetricCard>
                <SocialIcon>
                  <Heart size={24} />
                </SocialIcon>
                <MetricContent>
                  <MetricValue>{socialMetrics.engagementRate}%</MetricValue>
                  <MetricLabel>Engagement Rate</MetricLabel>
                  <MetricTrend>
                    <ArrowUp size={14} color="#22c55e" />
                    Industry leading
                  </MetricTrend>
                </MetricContent>
              </SocialMetricCard>

              <SocialMetricCard>
                <SocialIcon>
                  <Users size={24} />
                </SocialIcon>
                <MetricContent>
                  <MetricValue>${conversionMetrics.estimatedRevenue.toLocaleString()}</MetricValue>
                  <MetricLabel>Social Revenue</MetricLabel>
                  <MetricTrend>
                    <ArrowUp size={14} color="#22c55e" />
                    {conversionMetrics.socialTrafficConversion}% conversion
                  </MetricTrend>
                </MetricContent>
              </SocialMetricCard>

              <SocialMetricCard>
                <SocialIcon>
                  <Zap size={24} />
                </SocialIcon>
                <MetricContent>
                  <MetricValue>{socialMetrics.viralCoefficient}</MetricValue>
                  <MetricLabel>Viral Coefficient</MetricLabel>
                  <MetricTrend>
                    <ArrowUp size={14} color="#22c55e" />
                    Excellent virality
                  </MetricTrend>
                </MetricContent>
              </SocialMetricCard>
            </MetricsGrid>
          </MetricsOverview>
        )}
      </motion.div>
    </SocialAnalyticsContainer>
  );
};

export default SocialIntegrationAnalytics;

// ==================== STYLED COMPONENTS ====================

const SocialAnalyticsContainer = styled.div`
  padding: 2rem;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
`;

const PageTitle = styled.h4`
  color: white;
  font-weight: 300;
  font-size: 1.75rem;
  margin: 0;
`;

const PageSubtitle = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  margin: 0.25rem 0 0 0;
`;

const TabNavigation = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const TabButton = styled.button<{ $active: boolean }>`
  background: ${props => props.$active ? 'rgba(14, 165, 233, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.$active ? 'rgba(14, 165, 233, 0.5)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 8px;
  color: ${props => props.$active ? '#0ea5e9' : 'rgba(255, 255, 255, 0.7)'};
  padding: 0.625rem 1rem;
  min-height: 44px;
  min-width: 44px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: ${props => props.$active ? 600 : 400};
  font-size: 0.875rem;

  &:hover {
    background: rgba(14, 165, 233, 0.1);
    border-color: rgba(14, 165, 233, 0.3);
  }
`;

const MetricsOverview = styled.div`
  margin-bottom: 2rem;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SocialMetricCard = styled.div`
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(15, 23, 42, 0.85);
    border-color: rgba(14, 165, 233, 0.4);
  }
`;

const SocialIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0ea5e9, #0369a1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
`;

const MetricContent = styled.div`
  flex: 1;
`;

const MetricValue = styled.div`
  font-size: 1.75rem;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 0.25rem;
`;

const MetricLabel = styled.div`
  font-size: 0.875rem;
  color: rgba(226, 232, 240, 0.7);
  margin-bottom: 0.5rem;
`;

const MetricTrend = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #22c55e;
`;
