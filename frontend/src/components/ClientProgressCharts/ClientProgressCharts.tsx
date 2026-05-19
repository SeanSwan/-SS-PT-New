/**
 * ClientProgressCharts.tsx
 * ========================
 * 
 * Revolutionary NASM Progress Visualization Dashboard
 * The complete client progress tracking system with advanced analytics
 * Implements the ProgressVisualizer from Blueprint v43.2
 * 
 * CORE FEATURES:
 * ✅ Total Volume Over Time (Line Chart)
 * ✅ 1-Rep Max Projections for key lifts (Bar Chart)  
 * ✅ Form Quality Trend (Line Chart)
 * ✅ NASM Category Focus Radar Chart (30-day analysis)
 * ✅ Real-time data integration with workout logging pipeline
 * ✅ Mobile-responsive design with stellar theme
 * ✅ WCAG AA accessibility compliance
 * ✅ Modular chart sub-components for reusability
 * 
 * DATA PIPELINE:
 * - Fetches from GET /api/workout-forms/client/:clientId/progress
 * - Processes workout form and progress data from backend
 * - Real-time updates via WebSocket integration
 * - Caches data for performance optimization
 * 
 * Part of the SwanStudios Unified Dashboard Enhancement System
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import {
  TrendingUp, BarChart3, Activity, Target, Zap,
  Calendar, Filter, RefreshCw, Eye, EyeOff,
  ChevronLeft, ChevronRight, Settings, Download,
  Dumbbell, Heart, Flame, Radar, Printer, FileDown,
  Gauge, Trophy, BarChart2, Crosshair, Share2
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { captureChartAsImage } from '../../utils/chartCapture';
import ShareChartModal from './ShareChartModal';

// Chart Components (lazy-loaded for bundle optimization per AI Village feedback)
import VolumeOverTimeChart from './charts/VolumeOverTimeChart';
import OneRepMaxChart from './charts/OneRepMaxChart';
import FormQualityChart from './charts/FormQualityChart';
import NASMCategoryRadar from './charts/NASMCategoryRadar';
const BodyCompositionChart = lazy(() => import('./charts/BodyCompositionChart'));
const StrengthProgressionChart = lazy(() => import('./charts/StrengthProgressionChart'));
const ConsistencyHeatmap = lazy(() => import('./charts/ConsistencyHeatmap'));
const MuscleGroupRadar = lazy(() => import('./charts/MuscleGroupRadar'));
// New V5 charts (lazy-loaded)
const TrainingLoadChart = lazy(() => import('./charts/TrainingLoadChart'));
const RPEDistributionChart = lazy(() => import('./charts/RPEDistributionChart'));
const PersonalRecordsChart = lazy(() => import('./charts/PersonalRecordsChart'));
// RestComplianceChart removed from canonical surface — see render-block
// comment for rationale and the ChartVisibility default-false lock.
const ExerciseFrequencyChart = lazy(() => import('./charts/ExerciseFrequencyChart'));
const SessionIntensityChart = lazy(() => import('./charts/SessionIntensityChart'));

// Services and Hooks
import { useAuth } from '../../context/AuthContext';
import productionApiService from '../../services/api.service';

// Types and Interfaces
import {
  WorkoutLogData,
  ChartDataPoint,
  NASMCategory,
  ProgressMetrics,
  ChartTimeRange,
  ChartVisibility,
  BodyCompositionDataPoint,
  StrengthProgressionDataPoint,
  ConsistencyDataPoint,
  MuscleGroupDataPoint,
  TrainingLoadDataPoint,
  RPEDistributionDataPoint,
  PersonalRecordDataPoint,
  RestComplianceDataPoint,
  ExerciseFrequencyDataPoint,
  SessionIntensityDataPoint,
} from './types/ClientProgressTypes';

// ==================== INTERFACES ====================

interface ClientProgressChartsProps {
  userId?: number;
  clientId?: number;
  isTrainerView?: boolean;
  showControls?: boolean;
  defaultTimeRange?: ChartTimeRange;
  className?: string;
}

interface ProgressData {
  workoutLogs: WorkoutLogData[];
  volumeData: ChartDataPoint[];
  oneRepMaxData: any[];
  formQualityData: ChartDataPoint[];
  nasmCategoryData: any[];
  bodyCompositionData: BodyCompositionDataPoint[];
  strengthProgressionData: StrengthProgressionDataPoint[];
  consistencyData: ConsistencyDataPoint[];
  muscleGroupData: MuscleGroupDataPoint[];
  exerciseNames: string[];
  lastUpdated: Date;
  // V5 chart data
  trainingLoadData: TrainingLoadDataPoint[];
  rpeDistributionData: RPEDistributionDataPoint[];
  personalRecordsData: PersonalRecordDataPoint[];
  restComplianceData: RestComplianceDataPoint[];
  exerciseFrequencyData: ExerciseFrequencyDataPoint[];
  sessionIntensityData: SessionIntensityDataPoint[];
}

// ==================== STYLED COMPONENTS ====================

const ProgressContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(
    135deg,
    rgba(0, 32, 96, 0.98) 0%,
    rgba(0, 48, 128, 0.95) 35%,
    rgba(0, 48, 128, 0.1) 70%,
    rgba(96, 192, 240, 0.05) 100%
  );
  padding: 1.5rem;
  gap: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
    gap: 1.5rem;
  }

  @media print {
    background: white;
    padding: 0.5rem;
    gap: 1rem;
    min-height: auto;
  }
`;

const HeaderSection = styled(motion.div)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 2rem;
  background: linear-gradient(
    135deg,
    rgba(0, 32, 96, 0.8) 0%,
    rgba(0, 48, 128, 0.7) 50%,
    rgba(0, 48, 128, 0.6) 100%
  );
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(96, 192, 240, 0.2);
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.3),
    0 10px 10px -5px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
`;

const HeaderTitle = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #60C0F0, #50A0F0, #C6A84B);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const ControlsPanel = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const TimeRangeSelector = styled.select`
  background: linear-gradient(135deg, rgba(0, 48, 128, 0.9), rgba(0, 48, 128, 0.8));
  border: 1px solid rgba(96, 192, 240, 0.3);
  border-radius: 12px;
  color: #E0ECF4;
  padding: 0.75rem 1rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 44px;

  &:hover {
    border-color: rgba(96, 192, 240, 0.5);
    background: linear-gradient(135deg, rgba(0, 48, 128, 0.95), rgba(0, 48, 128, 0.85));
  }

  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: 2px;
  }
`;

const ActionButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  min-height: 44px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(96, 192, 240, 0.7));
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 12px;
  color: white;
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(96, 192, 240, 0.8));
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(139, 92, 246, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: 2px;
  }
`;

const ChartsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const ChartCard = styled(motion.div)`
  background: linear-gradient(
    135deg,
    rgba(0, 32, 96, 0.9) 0%,
    rgba(0, 48, 128, 0.8) 50%,
    rgba(0, 48, 128, 0.7) 100%
  );
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(96, 192, 240, 0.2);
  padding: 2rem;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.3),
    0 10px 10px -5px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  /* 3D perspective tilt effect */
  perspective: 1000px;
  transform-style: preserve-3d;
  transform: perspective(800px) rotateX(2deg);
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              box-shadow 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);

  &:hover {
    transform: perspective(800px) rotateX(0deg) translateY(-4px);
    box-shadow:
      0 30px 40px -10px rgba(0, 0, 0, 0.4),
      0 15px 20px -5px rgba(96, 192, 240, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
  }

  @media print {
    transform: none;
    box-shadow: none;
    border: 1px solid #ccc;
    break-inside: avoid;
    page-break-inside: avoid;
    background: white;
    padding: 1rem;
  }
`;

const PrintToolbar = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;

  @media print { display: none; }
`;

const PrintButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  min-height: 44px;
  background: rgba(96, 192, 240, 0.1);
  border: 1px solid rgba(96, 192, 240, 0.25);
  border-radius: 10px;
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);

  &:hover {
    background: rgba(96, 192, 240, 0.2);
    border-color: rgba(96, 192, 240, 0.4);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }

  @media print { display: none; }
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ChartTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: #E0ECF4;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ChartFallback = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: #b8c9db;
  font-family: 'Sora', sans-serif;
`;

const ShareIconBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 10px;
  color: rgba(224, 236, 244, 0.6);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    background: rgba(139, 92, 246, 0.2);
    border-color: rgba(139, 92, 246, 0.4);
    color: #8B5CF6;
    transform: scale(1.1);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  @media print { display: none; }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1rem;
`;

const LoadingSpinner = styled(motion.div)`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(96, 192, 240, 0.3);
  border-top: 3px solid #60C0F0;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1rem;
  color: #ef4444;
  text-align: center;
`;

// ==================== MAIN COMPONENT ====================

const ClientProgressCharts: React.FC<ClientProgressChartsProps> = ({
  userId,
  clientId,
  isTrainerView = false,
  showControls = true,
  defaultTimeRange = '30d',
  className
}) => {
  const { toast } = useToast();
  // ==================== STATE ====================
  
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<ChartTimeRange>(defaultTimeRange);
  const [chartVisibility, setChartVisibility] = useState<ChartVisibility>({
    volume: true,
    oneRepMax: true,
    formQuality: true,
    nasmCategory: true,
    bodyComposition: true,
    strengthProgression: true,
    consistency: true,
    muscleGroup: true,
    trainingLoad: true,
    rpeDistribution: true,
    personalRecords: true,
    // canonical-surface-audit 2026-04-13 (Phase 3 wireup):
    // Rest Compliance is structurally unmeasurable — ExerciseSet has
    // restTime (goal) but no restTaken (actual). The render block has been
    // removed from the canonical surface and this default is locked false
    // so any accidental restoration stays hidden until the writer schema
    // gains a real actual-rest field. Locked by ClientProgressCharts.test.tsx
    // source-level regression tests.
    restCompliance: false,
    exerciseFrequency: true,
    sessionIntensity: true,
  });
  const [refreshing, setRefreshing] = useState(false);
  // Chart sharing state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareImage, setShareImage] = useState<File | null>(null);
  const [shareTitle, setShareTitle] = useState('');
  const [isCapturing, setIsCapturing] = useState<string | null>(null);

  const { user } = useAuth();
  const targetUserId = userId || clientId || user?.id;

  // ==================== DATA FETCHING ====================
  
  const fetchProgressData = useCallback(async () => {
    if (!targetUserId) {
      setError('No user ID provided for progress tracking');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try progress-detailed first (new endpoint), fall back to legacy
      let response;
      try {
        response = await productionApiService.get(`/api/workout-forms/client/${targetUserId}/progress-detailed`, {
          params: { timeRange }
        });
      } catch {
        // Fall back to legacy endpoint
        response = await productionApiService.get(`/api/workout-forms/client/${targetUserId}/progress`, {
          params: { timeRange }
        });
      }

      if (!response.data || !response.data.progressData) {
        throw new Error('No progress data received from server');
      }

      const pd = response.data.progressData;
      const workoutLogs = pd.workoutHistory || [];

      const processedData: ProgressData = {
        workoutLogs,
        volumeData: processVolumeData(pd.volumeProgression || []),
        oneRepMaxData: pd.oneRepMaxes || processOneRepMaxData(workoutLogs),
        formQualityData: processFormQualityData(pd.formTrends || []),
        nasmCategoryData: processNASMCategoryData(pd.nasmCategories || pd.categories || []),
        bodyCompositionData: pd.bodyComposition || [],
        strengthProgressionData: pd.strengthProgression || [],
        consistencyData: pd.consistencyData || [],
        muscleGroupData: pd.muscleGroupVolume || [],
        exerciseNames: pd.strengthProgression?.[0]
          ? Object.keys(pd.strengthProgression[0].exercises || {})
          : [],
        lastUpdated: new Date(),
        // V5 chart data — processed from raw workout history
        trainingLoadData: processTrainingLoadData(pd.volumeProgression || [], workoutLogs),
        rpeDistributionData: processRPEDistribution(pd.rpeDistribution || workoutLogs),
        personalRecordsData: pd.personalRecords || [],
        restComplianceData: pd.restCompliance || [],
        exerciseFrequencyData: pd.exerciseFrequency || processExerciseFrequency(workoutLogs),
        sessionIntensityData: pd.sessionIntensity || processSessionIntensity(workoutLogs),
      };

      setProgressData(processedData);
      
    } catch (err) {
      console.error('Error fetching progress data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load progress data');
      toast({
        title: 'Error',
        description: 'Failed to load progress data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [targetUserId, timeRange]);

  // ==================== DATA PROCESSING FUNCTIONS ====================
  
  const processVolumeData = (volumeProgression: any[]): ChartDataPoint[] => {
    // FIXED: Process volume progression data from backend
    if (!volumeProgression || volumeProgression.length === 0) return [];
    
    return volumeProgression.map(entry => ({
      date: entry.date,
      value: entry.totalWeight || 0,
      label: `${(entry.totalWeight || 0).toLocaleString()} lbs`,
      totalSets: entry.totalSets,
      avgWeight: entry.totalWeight && entry.totalReps ? entry.totalWeight / entry.totalReps : 0
    }));
  };

  const processOneRepMaxData = (workoutHistory: any[]) => {
    // Process 1RM data from backend (Epley formula applied server-side)
    if (!workoutHistory || workoutHistory.length === 0) return [];

    return workoutHistory.map((entry: any) => ({
      exercise: entry.exercise || entry.exerciseName || 'Unknown',
      max: entry.max || entry.estimated1RM || 0,
      label: `${entry.max || entry.estimated1RM || 0} lbs`,
      improvement: entry.improvement || 0,
      category: entry.category || 'General',
      date: entry.date,
    }));
  };

  const processFormQualityData = (formTrends: any[]): ChartDataPoint[] => {
    // FIXED: Process form quality trends from backend
    if (!formTrends || formTrends.length === 0) return [];
    
    return formTrends.map(trend => ({
      date: trend.date,
      value: trend.averageFormRating || 3,
      label: `${(trend.averageFormRating || 3).toFixed(1)}/5`,
      averageForm: trend.averageFormRating || 3,
      totalSets: trend.exerciseCount * 3, // Estimate
      sessionCount: 1
    }));
  };

  const processNASMCategoryData = (categories: any[]) => {
    // FIXED: Process NASM categories from backend
    if (!categories || categories.length === 0) return [];
    
    const maxLevel = Math.max(...categories.map(cat => cat.level || 0));
    
    return categories.map(category => ({
      category: category.category,
      value: category.level || 0,
      fullMark: maxLevel || 1000,
      percentage: category.percentComplete || 0
    }));
  };

  // ==================== V5 DATA PROCESSING FUNCTIONS ====================

  const processTrainingLoadData = (volumeProgression: any[], workoutHistory: any[]): TrainingLoadDataPoint[] => {
    if (!volumeProgression || volumeProgression.length === 0) return [];
    // Group by week
    const weeks: Record<string, { tonnage: number; sessions: number; intensities: number[] }> = {};
    volumeProgression.forEach(entry => {
      const d = new Date(entry.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().split('T')[0];
      if (!weeks[key]) weeks[key] = { tonnage: 0, sessions: 0, intensities: [] };
      weeks[key].tonnage += (entry.totalWeight || 0);
      weeks[key].sessions += 1;
      if (entry.intensity) weeks[key].intensities.push(entry.intensity);
    });
    return Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => ({
      week: new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      tonnage: Math.round(val.tonnage),
      sessions: val.sessions,
      avgIntensity: val.intensities.length > 0
        ? Math.round(val.intensities.reduce((s, v) => s + v, 0) / val.intensities.length * 10) / 10
        : 5,
    }));
  };

  const processRPEDistribution = (data: any[]): RPEDistributionDataPoint[] => {
    const zones = { 'Easy (1-3)': 0, 'Moderate (4-6)': 0, 'Hard (7-8)': 0, 'Max Effort (9-10)': 0 };
    const colors: Record<string, string> = {
      'Easy (1-3)': '#50A0F0', 'Moderate (4-6)': '#60C0F0',
      'Hard (7-8)': '#8B5CF6', 'Max Effort (9-10)': '#C6A84B',
    };
    if (!data || data.length === 0) return [];
    // If backend provides pre-calculated distribution, use it
    if (data[0]?.zone) return data as RPEDistributionDataPoint[];
    // Otherwise derive from workout history
    data.forEach((entry: any) => {
      const rpe = entry.overallRPE || entry.intensity || 5;
      if (rpe <= 3) zones['Easy (1-3)']++;
      else if (rpe <= 6) zones['Moderate (4-6)']++;
      else if (rpe <= 8) zones['Hard (7-8)']++;
      else zones['Max Effort (9-10)']++;
    });
    const total = Object.values(zones).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(zones).map(([zone, count]) => ({
      zone, count, percentage: (count / total) * 100, color: colors[zone],
    }));
  };

  const processExerciseFrequency = (workoutHistory: any[]): ExerciseFrequencyDataPoint[] => {
    if (!workoutHistory || workoutHistory.length === 0) return [];
    const freq: Record<string, { count: number; lastPerformed: string }> = {};
    workoutHistory.forEach((entry: any) => {
      const name = entry.exerciseName || entry.exercise || 'Unknown';
      if (!freq[name]) freq[name] = { count: 0, lastPerformed: entry.date || '' };
      freq[name].count++;
      if (entry.date && entry.date > freq[name].lastPerformed) freq[name].lastPerformed = entry.date;
    });
    return Object.entries(freq).map(([exercise, val]) => ({
      exercise, count: val.count, lastPerformed: val.lastPerformed,
    }));
  };

  const processSessionIntensity = (workoutHistory: any[]): SessionIntensityDataPoint[] => {
    if (!workoutHistory || workoutHistory.length === 0) return [];
    return workoutHistory.filter((e: any) => e.duration && e.intensity).map((entry: any) => ({
      date: entry.date || entry.completedAt || '',
      duration: entry.duration || 0,
      intensity: entry.intensity || 5,
      totalVolume: entry.totalVolume || 0,
      sessionTitle: entry.title,
    }));
  };

  // ==================== PRINT / DOWNLOAD HANDLERS ====================

  const handlePrintAll = useCallback(() => {
    window.print();
  }, []);

  const handleDownloadPDF = useCallback(() => {
    // Use browser print dialog with PDF option
    window.print();
  }, []);

  const handleShareChart = useCallback(async (element: HTMLElement, title: string) => {
    setIsCapturing(title);
    const image = await captureChartAsImage(element, title);
    setIsCapturing(null);
    if (image) {
      setShareImage(image);
      setShareTitle(title);
      setShareModalOpen(true);
    } else {
      toast({ title: 'Capture failed', description: 'Could not capture chart image.', variant: 'destructive' });
    }
  }, [toast]);

  // ==================== EFFECTS ====================
  
  useEffect(() => {
    fetchProgressData();
  }, [fetchProgressData]);

  // ==================== EVENT HANDLERS ====================
  
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProgressData();
  }, [fetchProgressData]);

  const handleTimeRangeChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeRange(event.target.value as ChartTimeRange);
  }, []);

  const toggleChartVisibility = useCallback((chartType: keyof ChartVisibility) => {
    setChartVisibility(prev => ({
      ...prev,
      [chartType]: !prev[chartType]
    }));
  }, []);

  // ==================== RENDER ====================
  
  if (loading) {
    return (
      <ProgressContainer className={className}>
        <LoadingContainer>
          <LoadingSpinner />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ color: '#b8c9db', fontSize: '1.1rem', fontFamily: "'Sora', sans-serif" }}
          >
            Loading your progress data...
          </motion.p>
        </LoadingContainer>
      </ProgressContainer>
    );
  }

  if (error) {
    return (
      <ProgressContainer className={className}>
        <ErrorContainer>
          <Activity size={48} />
          <h3>Unable to Load Progress Data</h3>
          <p>{error}</p>
          <ActionButton onClick={handleRefresh}>
            <RefreshCw size={16} />
            Try Again
          </ActionButton>
        </ErrorContainer>
      </ProgressContainer>
    );
  }

  if (!progressData) {
    return (
      <ProgressContainer className={className}>
        <ErrorContainer>
          <BarChart3 size={48} />
          <h3>No Progress Data Available</h3>
          <p>Complete some workouts to see your progress charts!</p>
        </ErrorContainer>
      </ProgressContainer>
    );
  }

  return (
    <ProgressContainer
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header Section */}
      <HeaderSection>
        <HeaderTitle>
          <Activity style={{ marginRight: '1rem' }} />
          Progress Analytics
        </HeaderTitle>
        
        {showControls && (
          <ControlsPanel>
            <TimeRangeSelector
              value={timeRange}
              onChange={handleTimeRangeChange}
              aria-label="Select time range for progress data"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 3 Months</option>
              <option value="1y">Last Year</option>
            </TimeRangeSelector>

            <ActionButton
              onClick={handleRefresh}
              disabled={refreshing}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </ActionButton>

            <PrintToolbar>
              <PrintButton onClick={handlePrintAll} aria-label="Print all charts">
                <Printer size={16} />
                Print All
              </PrintButton>
              <PrintButton onClick={handleDownloadPDF} aria-label="Download charts as PDF">
                <FileDown size={16} />
                Save PDF
              </PrintButton>
            </PrintToolbar>
          </ControlsPanel>
        )}
      </HeaderSection>

      {/* Charts Grid */}
      <ChartsGrid>
        {chartVisibility.volume && (
          <ChartCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <ChartHeader>
              <ChartTitle>
                <TrendingUp size={20} />
                Total Volume Over Time
              </ChartTitle>
              <ShareIconBtn data-no-capture onClick={(e) => handleShareChart(e.currentTarget.parentElement!.parentElement as HTMLElement, 'Total Volume Over Time')} disabled={isCapturing === 'Total Volume Over Time'} aria-label="Share chart">
                <Share2 size={16} />
              </ShareIconBtn>
            </ChartHeader>
            <VolumeOverTimeChart data={progressData.volumeData} />
          </ChartCard>
        )}

        {chartVisibility.oneRepMax && (
          <ChartCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <ChartHeader>
              <ChartTitle>
                <BarChart3 size={20} />
                1-Rep Max Projections
              </ChartTitle>
              <ShareIconBtn data-no-capture onClick={(e) => handleShareChart(e.currentTarget.parentElement!.parentElement as HTMLElement, '1-Rep Max Projections')} disabled={isCapturing === '1-Rep Max Projections'} aria-label="Share chart">
                <Share2 size={16} />
              </ShareIconBtn>
            </ChartHeader>
            <OneRepMaxChart data={progressData.oneRepMaxData} />
          </ChartCard>
        )}

        {chartVisibility.formQuality && (
          <ChartCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <ChartHeader>
              <ChartTitle>
                <Target size={20} />
                Form Quality Trend
              </ChartTitle>
              <ShareIconBtn data-no-capture onClick={(e) => handleShareChart(e.currentTarget.parentElement!.parentElement as HTMLElement, 'Form Quality Trend')} disabled={isCapturing === 'Form Quality Trend'} aria-label="Share chart">
                <Share2 size={16} />
              </ShareIconBtn>
            </ChartHeader>
            <FormQualityChart data={progressData.formQualityData as any} />
          </ChartCard>
        )}

        {chartVisibility.nasmCategory && progressData.nasmCategoryData.length > 0 && (
          <ChartCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <ChartHeader>
              <ChartTitle>
                <Zap size={20} />
                NASM Category Focus
              </ChartTitle>
              <ShareIconBtn data-no-capture onClick={(e) => handleShareChart(e.currentTarget.parentElement!.parentElement as HTMLElement, 'NASM Category Focus')} disabled={isCapturing === 'NASM Category Focus'} aria-label="Share chart">
                <Share2 size={16} />
              </ShareIconBtn>
            </ChartHeader>
            <NASMCategoryRadar data={progressData.nasmCategoryData} />
          </ChartCard>
        )}

        {/* New Charts (lazy-loaded) */}
        {chartVisibility.bodyComposition && progressData.bodyCompositionData.length > 0 && (
          <ChartCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <ChartHeader>
              <ChartTitle>
                <Heart size={20} />
                Body Composition
              </ChartTitle>
              <ShareIconBtn data-no-capture onClick={(e) => handleShareChart(e.currentTarget.parentElement!.parentElement as HTMLElement, 'Body Composition')} disabled={isCapturing === 'Body Composition'} aria-label="Share chart"><Share2 size={16} /></ShareIconBtn>
            </ChartHeader>
            <Suspense fallback={<ChartFallback>Loading chart...</ChartFallback>}>
              <BodyCompositionChart data={progressData.bodyCompositionData} />
            </Suspense>
          </ChartCard>
        )}

        {chartVisibility.strengthProgression && progressData.strengthProgressionData.length > 0 && (
          <ChartCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <ChartHeader>
              <ChartTitle>
                <Dumbbell size={20} />
                Strength Progression
              </ChartTitle>
              <ShareIconBtn data-no-capture onClick={(e) => handleShareChart(e.currentTarget.parentElement!.parentElement as HTMLElement, 'Strength Progression')} disabled={isCapturing === 'Strength Progression'} aria-label="Share chart"><Share2 size={16} /></ShareIconBtn>
            </ChartHeader>
            <Suspense fallback={<ChartFallback>Loading chart...</ChartFallback>}>
              <StrengthProgressionChart
                data={progressData.strengthProgressionData}
                exerciseNames={progressData.exerciseNames}
              />
            </Suspense>
          </ChartCard>
        )}

        {chartVisibility.consistency && progressData.consistencyData.length > 0 && (
          <ChartCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <ChartHeader>
              <ChartTitle>
                <Flame size={20} />
                Workout Consistency
              </ChartTitle>
              <ShareIconBtn data-no-capture onClick={(e) => handleShareChart(e.currentTarget.parentElement!.parentElement as HTMLElement, 'Workout Consistency')} disabled={isCapturing === 'Workout Consistency'} aria-label="Share chart"><Share2 size={16} /></ShareIconBtn>
            </ChartHeader>
            <Suspense fallback={<ChartFallback>Loading chart...</ChartFallback>}>
              <ConsistencyHeatmap data={progressData.consistencyData} />
            </Suspense>
          </ChartCard>
        )}

        {chartVisibility.muscleGroup && progressData.muscleGroupData.length > 0 && (
          <ChartCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.7 }}
          >
            <ChartHeader>
              <ChartTitle>
                <Radar size={20} />
                Muscle Group Balance
              </ChartTitle>
              <ShareIconBtn data-no-capture onClick={(e) => handleShareChart(e.currentTarget.parentElement!.parentElement as HTMLElement, 'Muscle Group Balance')} disabled={isCapturing === 'Muscle Group Balance'} aria-label="Share chart"><Share2 size={16} /></ShareIconBtn>
            </ChartHeader>
            <Suspense fallback={<ChartFallback>Loading chart...</ChartFallback>}>
              <MuscleGroupRadar data={progressData.muscleGroupData} />
            </Suspense>
          </ChartCard>
        )}

        {/* ── V5 Charts: Training Intelligence ── */}

        {chartVisibility.trainingLoad && progressData.trainingLoadData.length > 0 && (
          <ChartCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.8 }}
          >
            <ChartHeader>
              <ChartTitle>
                <TrendingUp size={20} />
                Weekly Training Load
              </ChartTitle>
              <ShareIconBtn data-no-capture onClick={(e) => handleShareChart(e.currentTarget.parentElement!.parentElement as HTMLElement, 'Weekly Training Load')} disabled={isCapturing === 'Weekly Training Load'} aria-label="Share chart"><Share2 size={16} /></ShareIconBtn>
            </ChartHeader>
            <Suspense fallback={<ChartFallback>Loading chart...</ChartFallback>}>
              <TrainingLoadChart data={progressData.trainingLoadData} />
            </Suspense>
          </ChartCard>
        )}

        {chartVisibility.rpeDistribution && progressData.rpeDistributionData.length > 0 && (
          <ChartCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.85 }}
          >
            <ChartHeader>
              <ChartTitle>
                <Gauge size={20} />
                Effort Distribution (RPE)
              </ChartTitle>
              <ShareIconBtn data-no-capture onClick={(e) => handleShareChart(e.currentTarget.parentElement!.parentElement as HTMLElement, 'Effort Distribution RPE')} disabled={isCapturing === 'Effort Distribution RPE'} aria-label="Share chart"><Share2 size={16} /></ShareIconBtn>
            </ChartHeader>
            <Suspense fallback={<ChartFallback>Loading chart...</ChartFallback>}>
              <RPEDistributionChart data={progressData.rpeDistributionData} />
            </Suspense>
          </ChartCard>
        )}

        {chartVisibility.personalRecords && progressData.personalRecordsData.length > 0 && (
          <ChartCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.9 }}
          >
            <ChartHeader>
              <ChartTitle>
                <Trophy size={20} />
                Personal Records Timeline
              </ChartTitle>
              <ShareIconBtn data-no-capture onClick={(e) => handleShareChart(e.currentTarget.parentElement!.parentElement as HTMLElement, 'Personal Records Timeline')} disabled={isCapturing === 'Personal Records Timeline'} aria-label="Share chart"><Share2 size={16} /></ShareIconBtn>
            </ChartHeader>
            <Suspense fallback={<ChartFallback>Loading chart...</ChartFallback>}>
              <PersonalRecordsChart data={progressData.personalRecordsData} />
            </Suspense>
          </ChartCard>
        )}

        {/*
          canonical-surface-audit 2026-04-13 (Phase 3 wireup):
          Rest Period Compliance chart REMOVED from the canonical surface.
          ExerciseSet has restTime (goal) but no restTaken (actual), so
          compliance is structurally unmeasurable. Re-introducing this block
          requires a writer-side schema change to ExerciseSet + WorkoutLogger
          + an audit pass. Locked by ClientProgressCharts.test.tsx source
          regression tests.
        */}

        {chartVisibility.exerciseFrequency && progressData.exerciseFrequencyData.length > 0 && (
          <ChartCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.0 }}
          >
            <ChartHeader>
              <ChartTitle>
                <BarChart2 size={20} />
                Exercise Frequency
              </ChartTitle>
              <ShareIconBtn data-no-capture onClick={(e) => handleShareChart(e.currentTarget.parentElement!.parentElement as HTMLElement, 'Exercise Frequency')} disabled={isCapturing === 'Exercise Frequency'} aria-label="Share chart"><Share2 size={16} /></ShareIconBtn>
            </ChartHeader>
            <Suspense fallback={<ChartFallback>Loading chart...</ChartFallback>}>
              <ExerciseFrequencyChart data={progressData.exerciseFrequencyData} />
            </Suspense>
          </ChartCard>
        )}

        {chartVisibility.sessionIntensity && progressData.sessionIntensityData.length > 0 && (
          <ChartCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.05 }}
          >
            <ChartHeader>
              <ChartTitle>
                <Crosshair size={20} />
                Session Duration vs Intensity
              </ChartTitle>
              <ShareIconBtn data-no-capture onClick={(e) => handleShareChart(e.currentTarget.parentElement!.parentElement as HTMLElement, 'Session Intensity')} disabled={isCapturing === 'Session Intensity'} aria-label="Share chart"><Share2 size={16} /></ShareIconBtn>
            </ChartHeader>
            <Suspense fallback={<ChartFallback>Loading chart...</ChartFallback>}>
              <SessionIntensityChart data={progressData.sessionIntensityData} />
            </Suspense>
          </ChartCard>
        )}
      </ChartsGrid>

      {/* Share Chart Modal */}
      <ShareChartModal
        isOpen={shareModalOpen}
        onClose={() => { setShareModalOpen(false); setShareImage(null); }}
        chartImage={shareImage}
        chartTitle={shareTitle}
      />
    </ProgressContainer>
  );
};

export default ClientProgressCharts;
