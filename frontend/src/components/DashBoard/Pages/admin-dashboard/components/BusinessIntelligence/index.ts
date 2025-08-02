/**
 * Business Intelligence Components Index
 * =====================================
 * 
 * Export all business intelligence and analytics components
 */

export { default as EnterpriseBusinessIntelligenceSuite } from './EnterpriseBusinessIntelligenceSuite';

// Re-export types
export interface ExecutiveKPIs {
  monthlyRecurringRevenue: number;
  customerLifetimeValue: number;
  customerAcquisitionCost: number;
  churnRate: number;
  netPromoterScore: number;
  monthlyActiveUsers: number;
  revenueGrowthRate: number;
  profitMargin: number;
  sessionUtilizationRate: number;
  trainerProductivityScore: number;
}

export interface PredictiveInsights {
  revenueProjection: {
    nextMonth: number;
    nextQuarter: number;
    nextYear: number;
    confidence: number;
  };
  churnRisk: {
    highRiskClients: number;
    mediumRiskClients: number;
    lowRiskClients: number;
    preventionOpportunity: number;
  };
  growthOpportunities: Array<{
    area: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
    description: string;
    estimatedRevenue: number;
  }>;
}
