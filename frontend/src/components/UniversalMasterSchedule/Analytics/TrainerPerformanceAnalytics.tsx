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
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  LinearProgress,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Divider,
  Rating
} from '@mui/material';
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
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 300 }}>
              Trainer Performance Center
            </Typography>
            <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Advanced trainer analytics and optimization
            </Typography>
          </div>
          
          <ControlsSection>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel sx={{ color: 'white' }}>View</InputLabel>
              <Select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as any)}
                sx={{ color: 'white', '& .MuiSvgIcon-root': { color: 'white' } }}
              >
                <MenuItem value="overview">Overview</MenuItem>
                <MenuItem value="detailed">Detailed</MenuItem>
                <MenuItem value="comparison">Comparison</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel sx={{ color: 'white' }}>Sort By</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                sx={{ color: 'white', '& .MuiSvgIcon-root': { color: 'white' } }}
              >
                <MenuItem value="revenue">Revenue</MenuItem>
                <MenuItem value="rating">Rating</MenuItem>
                <MenuItem value="retention">Retention</MenuItem>
                <MenuItem value="efficiency">Efficiency</MenuItem>
              </Select>
            </FormControl>
          </ControlsSection>
        </HeaderSection>

        {/* Trainer Performance Table */}
        <PerformanceTableSection>
          <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
            Trainer Performance Analytics
          </Typography>
          
          <TableContainer component={Paper} sx={{ background: 'rgba(255,255,255,0.05)' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Trainer</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Revenue</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Rating</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Sessions</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trainerMetrics.map((trainer) => (
                  <TableRow key={trainer.id} sx={{ '&:hover': { background: 'rgba(255,255,255,0.03)' } }}>
                    <TableCell>
                      <TrainerCell>
                        <Avatar sx={{ width: 40, height: 40 }}>
                          {trainer.name.split(' ').map(n => n[0]).join('')}
                        </Avatar>
                        <div>
                          <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                            {trainer.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            {trainer.specializations.slice(0, 2).join(', ')}
                          </Typography>
                        </div>
                      </TrainerCell>
                    </TableCell>
                    
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: getPerformanceColor(trainer.totalRevenue, teamAverages.revenue),
                          fontWeight: 600 
                        }}
                      >
                        ${trainer.totalRevenue.toLocaleString()}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Rating value={trainer.averageRating} precision={0.1} readOnly size="small" />
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'white' }}>
                        {trainer.sessionsCompleted}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => onTrainerSelect(trainer.id)}
                        sx={{
                          borderColor: 'rgba(255,255,255,0.3)',
                          color: 'white',
                          '&:hover': {
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)'
                          }
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
