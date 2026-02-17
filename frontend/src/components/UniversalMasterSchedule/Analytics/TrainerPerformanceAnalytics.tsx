/**
 * Trainer Performance Analytics Center
 * ===================================
 *
 * Deep-dive analytics for trainer performance optimization:
 * - Individual trainer metrics and comparisons
 * - Client retention and satisfaction scores
 * - Revenue generation and efficiency
 * - Social engagement correlation
 * - NASM compliance and certification tracking
 * - Scheduling optimization recommendations
 *
 * Critical for trainer management and business growth.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import {
  TrendingUp,
  TrendingDown,
  Star,
  Users,
  DollarSign,
  Calendar,
  Award,
  Target,
  Activity,
  Clock,
  MessageSquare,
  Heart,
  Zap,
  ArrowUp,
  ArrowDown,
  Medal,
  Trophy,
  BookOpen,
  CheckCircle
} from 'lucide-react';

interface TrainerMetrics {
  id: string;
  name: string;
  avatar?: string;
  email: string;
  specializations: string[];
  certifications: string[];

  // Performance Metrics
  totalRevenue: number;
  revenueGrowth: number;
  sessionsCompleted: number;
  clientRetention: number;
  averageRating: number;
  totalReviews: number;

  // Efficiency Metrics
  utilizationRate: number;
  averageSessionDuration: number;
  noShowRate: number;
  cancellationRate: number;
  rebookingRate: number;

  // Social & Engagement
  socialPosts: number;
  clientEngagement: number;
  challengesCreated: number;
  communityScore: number;

  // NASM Compliance
  assessmentsCompleted: number;
  correctiveExercises: number;
  continuingEducation: number;
  complianceScore: number;

  // Schedule Optimization
  peakHours: string[];
  preferredClients: number;
  workloadScore: number;
  burnoutRisk: 'low' | 'medium' | 'high';
}

interface TrainerPerformanceAnalyticsProps {
  trainers: any[];
  sessions: any[];
  selectedTrainer?: string;
  onTrainerSelect: (trainerId: string) => void;
  dateRange: string;
}

const TrainerPerformanceAnalytics: React.FC<TrainerPerformanceAnalyticsProps> = ({
  trainers,
  sessions,
  selectedTrainer,
  onTrainerSelect,
  dateRange
}) => {
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'comparison'>('overview');
  const [sortBy, setSortBy] = useState<'revenue' | 'rating' | 'retention' | 'efficiency'>('revenue');

  // Generate comprehensive trainer metrics
  const trainerMetrics = useMemo(() => {
    return trainers.map(trainer => {
      // Mock comprehensive data - in real app, this would come from API
      const baseRevenue = 3000 + Math.random() * 4000;
      const efficiency = 0.7 + Math.random() * 0.3;

      return {
        id: trainer.id,
        name: `${trainer.firstName} ${trainer.lastName}`,
        email: trainer.email || `${trainer.firstName.toLowerCase()}@swanstudios.com`,
        avatar: trainer.avatar,
        specializations: ['Strength Training', 'HIIT', 'Mobility'].slice(0, Math.floor(Math.random() * 3) + 1),
        certifications: ['NASM-CPT', 'NASM-CES', 'NASM-PES'].slice(0, Math.floor(Math.random() * 3) + 1),

        // Performance Metrics
        totalRevenue: Math.round(baseRevenue),
        revenueGrowth: Math.round((Math.random() - 0.3) * 30),
        sessionsCompleted: Math.round(baseRevenue / 75), // ~$75 per session
        clientRetention: Math.round(75 + Math.random() * 20),
        averageRating: 4.0 + Math.random() * 1.0,
        totalReviews: Math.round(20 + Math.random() * 80),

        // Efficiency Metrics
        utilizationRate: Math.round(efficiency * 100),
        averageSessionDuration: 55 + Math.random() * 20,
        noShowRate: Math.round(Math.random() * 8),
        cancellationRate: Math.round(Math.random() * 12),
        rebookingRate: Math.round(80 + Math.random() * 15),

        // Social & Engagement
        socialPosts: Math.round(10 + Math.random() * 40),
        clientEngagement: Math.round(60 + Math.random() * 35),
        challengesCreated: Math.round(Math.random() * 8),
        communityScore: Math.round(70 + Math.random() * 25),

        // NASM Compliance
        assessmentsCompleted: Math.round(5 + Math.random() * 15),
        correctiveExercises: Math.round(10 + Math.random() * 30),
        continuingEducation: Math.round(Math.random() * 40),
        complianceScore: Math.round(85 + Math.random() * 15),

        // Schedule Optimization
        peakHours: ['6:00 AM', '12:00 PM', '6:00 PM'].slice(0, Math.floor(Math.random() * 3) + 1),
        preferredClients: Math.round(5 + Math.random() * 15),
        workloadScore: Math.round(efficiency * 100),
        burnoutRisk: efficiency > 0.85 ? 'high' : efficiency > 0.75 ? 'medium' : 'low'
      } as TrainerMetrics;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'revenue': return b.totalRevenue - a.totalRevenue;
        case 'rating': return b.averageRating - a.averageRating;
        case 'retention': return b.clientRetention - a.clientRetention;
        case 'efficiency': return b.utilizationRate - a.utilizationRate;
        default: return 0;
      }
    });
  }, [trainers, sortBy]);

  const selectedTrainerData = useMemo(() => {
    return trainerMetrics.find(t => t.id === selectedTrainer);
  }, [trainerMetrics, selectedTrainer]);

  // Team averages for comparison
  const teamAverages = useMemo(() => {
    const metrics = trainerMetrics;
    return {
      revenue: Math.round(metrics.reduce((sum, t) => sum + t.totalRevenue, 0) / metrics.length),
      rating: metrics.reduce((sum, t) => sum + t.averageRating, 0) / metrics.length,
      retention: Math.round(metrics.reduce((sum, t) => sum + t.clientRetention, 0) / metrics.length),
      utilization: Math.round(metrics.reduce((sum, t) => sum + t.utilizationRate, 0) / metrics.length),
      compliance: Math.round(metrics.reduce((sum, t) => sum + t.complianceScore, 0) / metrics.length)
    };
  }, [trainerMetrics]);

  const getBurnoutColor = (risk: string) => {
    switch (risk) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const getPerformanceColor = (value: number, average: number) => {
    if (value > average * 1.1) return '#22c55e';
    if (value < average * 0.9) return '#ef4444';
    return '#3b82f6';
  };

  const renderStarRating = (rating: number) => {
    const fullStars = Math.floor(rating);
    const fraction = rating - fullStars;
    const stars = [];
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<StarIcon key={i}><Star size={14} fill="#f59e0b" stroke="#f59e0b" /></StarIcon>);
      } else if (i === fullStars && fraction >= 0.5) {
        stars.push(<StarIcon key={i}><Star size={14} fill="#f59e0b" stroke="#f59e0b" style={{ clipPath: 'inset(0 50% 0 0)' }} /></StarIcon>);
      } else {
        stars.push(<StarIcon key={i}><Star size={14} stroke="rgba(255,255,255,0.3)" /></StarIcon>);
      }
    }
    return <StarRatingWrapper>{stars}</StarRatingWrapper>;
  };

  return (
    <AnalyticsContainer>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header Controls */}
        <HeaderSection>
          <div>
            <SectionTitle>
              Trainer Performance Center
            </SectionTitle>
            <SectionSubtitle>
              Advanced trainer analytics and optimization
            </SectionSubtitle>
          </div>

          <ControlsSection>
            <SelectWrapper>
              <SelectLabel>View</SelectLabel>
              <StyledSelect
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as any)}
              >
                <option value="overview">Overview</option>
                <option value="detailed">Detailed</option>
                <option value="comparison">Comparison</option>
              </StyledSelect>
            </SelectWrapper>

            <SelectWrapper>
              <SelectLabel>Sort By</SelectLabel>
              <StyledSelect
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="revenue">Revenue</option>
                <option value="rating">Rating</option>
                <option value="retention">Retention</option>
                <option value="efficiency">Efficiency</option>
              </StyledSelect>
            </SelectWrapper>
          </ControlsSection>
        </HeaderSection>

        {/* Trainer Performance Table */}
        <PerformanceTableSection>
          <TableTitle>
            Trainer Performance Analytics
          </TableTitle>

          <TableWrapper>
            <StyledTable>
              <thead>
                <tr>
                  <StyledTh>Trainer</StyledTh>
                  <StyledTh>Revenue</StyledTh>
                  <StyledTh>Rating</StyledTh>
                  <StyledTh>Sessions</StyledTh>
                  <StyledTh>Actions</StyledTh>
                </tr>
              </thead>
              <tbody>
                {trainerMetrics.map((trainer) => (
                  <StyledTr key={trainer.id}>
                    <StyledTd>
                      <TrainerCell>
                        <AvatarCircle>
                          {trainer.name.split(' ').map(n => n[0]).join('')}
                        </AvatarCircle>
                        <div>
                          <TrainerName>
                            {trainer.name}
                          </TrainerName>
                          <TrainerSpec>
                            {trainer.specializations.slice(0, 2).join(', ')}
                          </TrainerSpec>
                        </div>
                      </TrainerCell>
                    </StyledTd>

                    <StyledTd>
                      <RevenueText style={{ color: getPerformanceColor(trainer.totalRevenue, teamAverages.revenue) }}>
                        ${trainer.totalRevenue.toLocaleString()}
                      </RevenueText>
                    </StyledTd>

                    <StyledTd>
                      {renderStarRating(trainer.averageRating)}
                    </StyledTd>

                    <StyledTd>
                      <CellText>
                        {trainer.sessionsCompleted}
                      </CellText>
                    </StyledTd>

                    <StyledTd>
                      <ViewDetailsButton
                        onClick={() => onTrainerSelect(trainer.id)}
                      >
                        View Details
                      </ViewDetailsButton>
                    </StyledTd>
                  </StyledTr>
                ))}
              </tbody>
            </StyledTable>
          </TableWrapper>
        </PerformanceTableSection>
      </motion.div>
    </AnalyticsContainer>
  );
};

export default TrainerPerformanceAnalytics;

// ==================== STYLED COMPONENTS ====================

const AnalyticsContainer = styled.div`
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

const ControlsSection = styled.div`
  display: flex;
  gap: 1rem;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const PerformanceTableSection = styled.div`
  margin-bottom: 2rem;
`;

const TrainerCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const SectionTitle = styled.h4`
  color: white;
  font-weight: 300;
  font-size: 2.125rem;
  margin: 0;
  line-height: 1.235;
`;

const SectionSubtitle = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  margin: 0.25rem 0 0 0;
  line-height: 1.75;
`;

const SelectWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 120px;
`;

const SelectLabel = styled.label`
  color: white;
  font-size: 0.75rem;
  padding-left: 0.25rem;
`;

const StyledSelect = styled.select`
  min-height: 44px;
  padding: 0.5rem 0.75rem;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 0.875rem;
  cursor: pointer;
  outline: none;
  appearance: auto;

  &:focus {
    border-color: #0ea5e9;
  }

  option {
    background: #0f172a;
    color: #e2e8f0;
  }
`;

const TableTitle = styled.h6`
  color: white;
  font-size: 1.25rem;
  font-weight: 500;
  margin: 0 0 1rem 0;
  line-height: 1.6;
`;

const TableWrapper = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  overflow-x: auto;
  border: 1px solid rgba(14, 165, 233, 0.2);
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const StyledTh = styled.th`
  color: white;
  font-weight: 600;
  text-align: left;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid rgba(14, 165, 233, 0.2);
  font-size: 0.875rem;
`;

const StyledTr = styled.tr`
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`;

const StyledTd = styled.td`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  vertical-align: middle;
`;

const AvatarCircle = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0ea5e9, #7851A9);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  flex-shrink: 0;
`;

const TrainerName = styled.span`
  color: white;
  font-weight: 500;
  font-size: 0.875rem;
  display: block;
`;

const TrainerSpec = styled.span`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.75rem;
  display: block;
`;

const RevenueText = styled.span`
  font-weight: 600;
  font-size: 0.875rem;
`;

const CellText = styled.span`
  color: white;
  font-size: 0.875rem;
`;

const StarRatingWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 1px;
`;

const StarIcon = styled.span`
  display: inline-flex;
  align-items: center;
`;

const ViewDetailsButton = styled.button`
  min-height: 44px;
  padding: 0.375rem 1rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
  }

  &:focus-visible {
    outline: 2px solid #0ea5e9;
    outline-offset: 2px;
  }
`;
