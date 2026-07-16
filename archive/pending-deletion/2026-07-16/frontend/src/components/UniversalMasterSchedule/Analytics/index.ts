/**
 * Analytics Module Index
 * ======================
 *
 * Central export point for all Universal Master Schedule analytics components.
 * Provides comprehensive business intelligence capabilities for personal training business.
 */

export { default as AdvancedAnalyticsDashboard } from './AdvancedAnalyticsDashboard';
export { default as TrainerPerformanceAnalytics } from './TrainerPerformanceAnalytics';
export { default as SocialIntegrationAnalytics } from './SocialIntegrationAnalytics';

// Analytics Types
export interface AnalyticsProps {
  sessions: any[];
  clients: any[];
  trainers: any[];
  dateRange: string;
  onDateRangeChange?: (range: string) => void;
}

export interface BusinessMetrics {
  totalRevenue: number;
  utilizationRate: number;
  clientRetention: number;
  completionRate: number;
  socialEngagement: number;
  trainerPerformance: number;
}

export interface SocialMetrics {
  organicReach: number;
  engagementRate: number;
  viralCoefficient: number;
  hashtagPerformance: Record<string, number>;
  influencerMetrics: any[];
}

export interface TrainerMetrics {
  revenue: number;
  clientSatisfaction: number;
  utilizationRate: number;
  socialImpact: number;
  nasmCompliance: number;
  burnoutRisk: 'low' | 'medium' | 'high';
}
