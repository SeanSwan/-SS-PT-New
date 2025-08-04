/**
 * AdminExerciseCommandCenter.tsx
 * ==============================
 * 
 * Revolutionary Gamified Exercise Management Command Center
 * Ultra-mobile responsive with pixel-perfect design system
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Gamified admin experience with achievements and progress tracking
 * - Professional drag-and-drop video upload with real-time processing
 * - NASM compliance validation with visual feedback
 * - Real-time engagement metrics and analytics
 * - Mobile-first responsive design with touch-optimized interactions
 * - Production-safe PostgreSQL integration
 * - Accessibility-first design (WCAG AA compliant)
 * 
 * Master Prompt v45 Alignment:
 * - Revolutionary digital ecosystem with gamified engagement
 * - NASM codex compliance with professional standards
 * - Sensational aesthetics with functional supremacy
 * - Ultra-responsive mobile-first design
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useSpring, useAnimation } from 'framer-motion';
import styled, { ThemeProvider, css } from 'styled-components';
import { 
  Dumbbell, Plus, Upload, Play, Pause, Eye, Edit3, Trash2, 
  Award, Target, TrendingUp, Users, BarChart3, CheckCircle, 
  AlertCircle, Clock, Zap, Star, Crown, Flame, Camera,
  FileVideo, Image, Download, Share2, Copy, Settings, 
  RefreshCw, Search, Filter, Grid, List, MoreVertical,
  ChevronRight, ChevronDown, X, Maximize2, Volume2
} from 'lucide-react';

// Import theme and animations
import { exerciseCommandTheme, mediaQueries } from './styles/exerciseCommandTheme';
import { 
  motionVariants, 
  achievementUnlock, 
  levelUpSequence, 
  streakFlame,
  progressBarFill,
  cardHover,
  uploadPulse,
  validationSuccess,
  confettiParticle,
  accessibleAnimation,
  animationPerformance
} from './styles/gamificationAnimations';

// Import hooks and services
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../hooks/use-toast';
import { useExerciseGamification } from './hooks/useExerciseGamification';
import { useVideoUpload } from './hooks/useVideoUpload';
import { useExerciseStats } from './hooks/useExerciseStats';
import { useNASMValidation } from './hooks/useNASMValidation';

// Import components
import VideoUploadProcessor from './components/VideoUploadProcessor';
import ExerciseCreationWizard from './components/ExerciseCreationWizard';
import ExercisePreviewModal from './components/ExercisePreviewModal';
import ExerciseStatsPanel from './components/ExerciseStatsPanel';
import AdminAchievementCelebration from './components/AdminAchievementCelebration';
import ExerciseLibraryManager from './components/ExerciseLibraryManager';

// === STYLED COMPONENTS ===

const CommandCenterContainer = styled(motion.div)`
  min-height: 100vh;
  padding: ${exerciseCommandTheme.spacing.lg};
  background: ${exerciseCommandTheme.gradients.adminNebula};
  position: relative;
  overflow-x: hidden;
  
  /* Command center particle background */
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(2px 2px at 20px 30px, rgba(59, 130, 246, 0.4), transparent),
      radial-gradient(1px 1px at 40px 70px, rgba(0, 255, 255, 0.3), transparent),
      radial-gradient(1px 1px at 90px 40px, rgba(255, 255, 255, 0.2), transparent),
      radial-gradient(2px 2px at 130px 80px, rgba(59, 130, 246, 0.3), transparent);
    background-size: 100px 80px;
    background-repeat: repeat;
    opacity: 0.3;
    pointer-events: none;
    z-index: 0;
  }
  
  /* Responsive padding */
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.md};
    min-height: calc(100vh - 56px);
  }
  
  ${mediaQueries.tablet} {
    padding: ${exerciseCommandTheme.spacing.xl};
  }
  
  ${animationPerformance}
  ${accessibleAnimation}
`;

const CommandHeader = styled(motion.header)`
  position: relative;
  z-index: 1;
  margin-bottom: ${exerciseCommandTheme.spacing['3xl']};
  
  ${mediaQueries.mobile} {
    margin-bottom: ${exerciseCommandTheme.spacing['2xl']};
  }
`;

const HeaderTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: ${exerciseCommandTheme.spacing.xl};
  margin-bottom: ${exerciseCommandTheme.spacing.xl};
  
  ${mediaQueries.mobile} {
    flex-direction: column;
    gap: ${exerciseCommandTheme.spacing.lg};
    margin-bottom: ${exerciseCommandTheme.spacing.lg};
  }
`;

const TitleSection = styled.div`
  flex: 1;
`;

const CommandTitle = styled(motion.h1)`
  font-size: ${exerciseCommandTheme.typography.fontSizes['4xl']};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.bold};
  background: ${exerciseCommandTheme.gradients.commandCenter};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: ${exerciseCommandTheme.typography.lineHeights.tight};
  margin-bottom: ${exerciseCommandTheme.spacing.md};
  letter-spacing: ${exerciseCommandTheme.typography.letterSpacing.tight};
  
  display: flex;
  align-items: center;
  gap: ${exerciseCommandTheme.spacing.lg};
  
  .title-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: ${exerciseCommandTheme.borderRadius.xl};
    background: ${exerciseCommandTheme.gradients.commandCenter};
    color: ${exerciseCommandTheme.colors.deepSpace};
    animation: ${streakFlame} 3s ease-in-out infinite;
    
    ${mediaQueries.mobile} {
      width: 40px;
      height: 40px;
    }
  }
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes['2xl']};
    gap: ${exerciseCommandTheme.spacing.md};
  }
`;

const CommandSubtitle = styled(motion.p)`
  font-size: ${exerciseCommandTheme.typography.fontSizes.lg};
  color: ${exerciseCommandTheme.colors.secondaryText};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.medium};
  line-height: ${exerciseCommandTheme.typography.lineHeights.relaxed};
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.base};
  }
`;

const AdminStatsSection = styled(motion.div)`
  min-width: 280px;
  
  ${mediaQueries.mobile} {
    width: 100%;
    min-width: unset;
  }
`;

const AdminStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${exerciseCommandTheme.spacing.md};
  
  ${mediaQueries.mobile} {
    grid-template-columns: repeat(2, 1fr);
    gap: ${exerciseCommandTheme.spacing.sm};
  }
  
  ${mediaQueries.tablet} {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatCard = styled(motion.div)<{ variant?: 'primary' | 'success' | 'warning' | 'info' }>`
  background: ${exerciseCommandTheme.gradients.exerciseCard};
  backdrop-filter: blur(10px);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: ${exerciseCommandTheme.borderRadius.lg};
  padding: ${exerciseCommandTheme.spacing.lg};
  text-align: center;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  
  /* Variant-specific styling */
  ${props => props.variant === 'success' && css`
    border-color: rgba(16, 185, 129, 0.3);
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
  `}
  
  ${props => props.variant === 'warning' && css`
    border-color: rgba(251, 191, 36, 0.3);
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
  `}
  
  ${props => props.variant === 'info' && css`
    border-color: rgba(0, 255, 255, 0.3);
    background: linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
  `}
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${exerciseCommandTheme.gradients.commandCenter};
    opacity: 0.6;
  }
  
  &:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: ${exerciseCommandTheme.shadows.exerciseCardHover};
    border-color: rgba(59, 130, 246, 0.4);
    
    &::before {
      opacity: 1;
    }
  }
  
  transition: all ${exerciseCommandTheme.transitions.base};
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.md};
  }
`;

const StatIcon = styled.div<{ variant?: 'primary' | 'success' | 'warning' | 'info' }>`
  width: 40px;
  height: 40px;
  border-radius: ${exerciseCommandTheme.borderRadius.lg};
  background: ${props => {
    switch (props.variant) {
      case 'success': return exerciseCommandTheme.gradients.buttonSuccess;
      case 'warning': return exerciseCommandTheme.gradients.buttonWarning;
      case 'info': return `linear-gradient(135deg, ${exerciseCommandTheme.colors.cyberCyan} 0%, ${exerciseCommandTheme.colors.stellarBlue} 100%)`;
      default: return exerciseCommandTheme.gradients.buttonPrimary;
    }
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto ${exerciseCommandTheme.spacing.sm};
  color: ${exerciseCommandTheme.colors.stellarWhite};
  
  ${mediaQueries.mobile} {
    width: 32px;
    height: 32px;
  }
`;

const StatValue = styled.div`
  font-size: ${exerciseCommandTheme.typography.fontSizes.xl};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.bold};
  color: ${exerciseCommandTheme.colors.primaryText};
  margin-bottom: ${exerciseCommandTheme.spacing.xs};
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.lg};
  }
`;

const StatLabel = styled.div`
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  color: ${exerciseCommandTheme.colors.secondaryText};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.medium};
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.xs};
  }
`;

const AdminLevelSection = styled(motion.div)`
  background: ${exerciseCommandTheme.gradients.exerciseCard};
  backdrop-filter: blur(10px);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: ${exerciseCommandTheme.borderRadius.xl};
  padding: ${exerciseCommandTheme.spacing.xl};
  margin-bottom: ${exerciseCommandTheme.spacing['3xl']};
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${exerciseCommandTheme.gradients.achievementGlow};
    animation: ${progressBarFill} 2s ease-out;
  }
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.lg};
    margin-bottom: ${exerciseCommandTheme.spacing['2xl']};
  }
`;

const LevelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${exerciseCommandTheme.spacing.lg};
  
  ${mediaQueries.mobile} {
    flex-direction: column;
    align-items: flex-start;
    gap: ${exerciseCommandTheme.spacing.md};
  }
`;

const LevelInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${exerciseCommandTheme.spacing.lg};
  
  ${mediaQueries.mobile} {
    gap: ${exerciseCommandTheme.spacing.md};
  }
`;

const LevelBadge = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${exerciseCommandTheme.spacing.sm};
  background: ${exerciseCommandTheme.gradients.commandCenter};
  color: ${exerciseCommandTheme.colors.deepSpace};
  padding: ${exerciseCommandTheme.spacing.sm} ${exerciseCommandTheme.spacing.lg};
  border-radius: ${exerciseCommandTheme.borderRadius.badge};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.bold};
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  animation: ${levelUpSequence} 2s ease-out;
  
  .crown-icon {
    animation: ${streakFlame} 3s ease-in-out infinite;
  }
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.xs} ${exerciseCommandTheme.spacing.md};
  }
`;

const LevelTitle = styled.h2`
  font-size: ${exerciseCommandTheme.typography.fontSizes['2xl']};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.bold};
  color: ${exerciseCommandTheme.colors.primaryText};
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.xl};
  }
`;

const StreakSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${exerciseCommandTheme.spacing.md};
  
  ${mediaQueries.mobile} {
    gap: ${exerciseCommandTheme.spacing.sm};
  }
`;

const StreakBadge = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${exerciseCommandTheme.spacing.xs};
  background: ${exerciseCommandTheme.gradients.buttonWarning};
  color: ${exerciseCommandTheme.colors.deepSpace};
  padding: ${exerciseCommandTheme.spacing.xs} ${exerciseCommandTheme.spacing.md};
  border-radius: ${exerciseCommandTheme.borderRadius.badge};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.bold};
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  
  .flame-icon {
    animation: ${streakFlame} 2s ease-in-out infinite;
  }
`;

const PointsBadge = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${exerciseCommandTheme.spacing.xs};
  background: linear-gradient(135deg, ${exerciseCommandTheme.colors.cyberCyan} 0%, ${exerciseCommandTheme.colors.stellarBlue} 100%);
  color: ${exerciseCommandTheme.colors.deepSpace};
  padding: ${exerciseCommandTheme.spacing.xs} ${exerciseCommandTheme.spacing.md};
  border-radius: ${exerciseCommandTheme.borderRadius.badge};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.bold};
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
`;

const ProgressSection = styled.div`
  margin-top: ${exerciseCommandTheme.spacing.lg};
`;

const ProgressLabel = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: ${exerciseCommandTheme.spacing.sm};
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  color: ${exerciseCommandTheme.colors.secondaryText};
  
  span:last-child {
    color: ${exerciseCommandTheme.colors.primaryText};
    font-weight: ${exerciseCommandTheme.typography.fontWeights.semibold};
  }
`;

const ProgressBar = styled(motion.div)`
  width: 100%;
  height: 8px;
  background: rgba(30, 58, 138, 0.2);
  border-radius: ${exerciseCommandTheme.borderRadius.badge};
  overflow: hidden;
  position: relative;
`;

const ProgressFill = styled(motion.div)<{ progress: number }>`
  height: 100%;
  width: ${props => props.progress}%;
  background: ${exerciseCommandTheme.gradients.progressBar};
  border-radius: ${exerciseCommandTheme.borderRadius.badge};
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg, 
      transparent, 
      rgba(255, 255, 255, 0.4), 
      transparent
    );
    animation: ${progressBarFill} 2s ease-out;
  }
`;

const MainContent = styled(motion.main)`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr;
  gap: ${exerciseCommandTheme.spacing['3xl']};
  
  ${mediaQueries.tablet} {
    grid-template-columns: 2fr 1fr;
    gap: ${exerciseCommandTheme.spacing['2xl']};
  }
  
  ${mediaQueries.desktop} {
    gap: ${exerciseCommandTheme.spacing['3xl']};
  }
  
  ${mediaQueries.mobile} {
    gap: ${exerciseCommandTheme.spacing['2xl']};
  }
`;

const PrimarySection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${exerciseCommandTheme.spacing['2xl']};
  
  ${mediaQueries.mobile} {
    gap: ${exerciseCommandTheme.spacing.xl};
  }
`;

const SecondarySection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${exerciseCommandTheme.spacing.xl};
  
  ${mediaQueries.mobile} {
    gap: ${exerciseCommandTheme.spacing.lg};
  }
`;

const ActionSection = styled(motion.section)`
  background: ${exerciseCommandTheme.gradients.exerciseCard};
  backdrop-filter: blur(10px);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: ${exerciseCommandTheme.borderRadius.xl};
  padding: ${exerciseCommandTheme.spacing['2xl']};
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${exerciseCommandTheme.gradients.commandCenter};
    opacity: 0.8;
  }
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.xl};
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${exerciseCommandTheme.spacing.xl};
  
  ${mediaQueries.mobile} {
    flex-direction: column;
    align-items: flex-start;
    gap: ${exerciseCommandTheme.spacing.md};
    margin-bottom: ${exerciseCommandTheme.spacing.lg};
  }
`;

const SectionTitle = styled.h2`
  font-size: ${exerciseCommandTheme.typography.fontSizes.xl};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.bold};
  color: ${exerciseCommandTheme.colors.primaryText};
  display: flex;
  align-items: center;
  gap: ${exerciseCommandTheme.spacing.md};
  
  .section-icon {
    color: ${exerciseCommandTheme.colors.stellarBlue};
  }
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.lg};
    gap: ${exerciseCommandTheme.spacing.sm};
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${exerciseCommandTheme.spacing.md};
  
  ${mediaQueries.mobile} {
    width: 100%;
    flex-direction: column;
    gap: ${exerciseCommandTheme.spacing.sm};
  }
`;

const CommandButton = styled(motion.button)<{ 
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'secondary';
  size?: 'small' | 'medium' | 'large';
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${exerciseCommandTheme.spacing.sm};
  padding: ${props => {
    switch (props.size) {
      case 'small': return exerciseCommandTheme.spacing.buttonPaddingSmall;
      case 'large': return `${exerciseCommandTheme.spacing.lg} ${exerciseCommandTheme.spacing['2xl']}`;
      default: return exerciseCommandTheme.spacing.buttonPadding;
    }
  }};
  border: none;
  border-radius: ${exerciseCommandTheme.borderRadius.button};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.semibold};
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all ${exerciseCommandTheme.transitions.base};
  
  /* Variant styling */
  background: ${props => {
    switch (props.variant) {
      case 'success': return exerciseCommandTheme.gradients.buttonSuccess;
      case 'warning': return exerciseCommandTheme.gradients.buttonWarning;
      case 'danger': return exerciseCommandTheme.gradients.buttonDanger;
      case 'secondary': return 'rgba(30, 58, 138, 0.2)';
      default: return exerciseCommandTheme.gradients.buttonPrimary;
    }
  }};
  
  color: ${props => {
    switch (props.variant) {
      case 'warning': return exerciseCommandTheme.colors.deepSpace;
      case 'secondary': return exerciseCommandTheme.colors.primaryText;
      default: return exerciseCommandTheme.colors.stellarWhite;
    }
  }};
  
  box-shadow: ${exerciseCommandTheme.shadows.buttonElevation};
  
  &:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: ${exerciseCommandTheme.shadows.buttonElevation}, ${exerciseCommandTheme.shadows.commandGlow};
  }
  
  &:active {
    transform: translateY(0) scale(0.98);
    box-shadow: ${exerciseCommandTheme.shadows.buttonPressed};
  }
  
  &:focus-visible {
    outline: 2px solid ${exerciseCommandTheme.colors.stellarBlue};
    outline-offset: 2px;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  /* Mobile responsiveness */
  ${mediaQueries.mobile} {
    width: 100%;
    font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
    padding: ${exerciseCommandTheme.spacing.md} ${exerciseCommandTheme.spacing.lg};
  }
  
  ${animationPerformance}
  ${accessibleAnimation}
`;

// === INTERFACES ===

interface AdminExerciseStats {
  totalExercises: number;
  videosUploaded: number;
  activeUsers: number;
  avgQualityScore: number;
  adminLevel: number;
  currentXP: number;
  nextLevelXP: number;
  streak: number;
  totalPoints: number;
  achievements: string[];
  recentActivity: any[];
}

interface ExerciseCommandCenterProps {
  className?: string;
}

// === MAIN COMPONENT ===

const AdminExerciseCommandCenter: React.FC<ExerciseCommandCenterProps> = ({ 
  className 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [activeTab, setActiveTab] = useState<'create' | 'library' | 'analytics'>('create');
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [showAchievementCelebration, setShowAchievementCelebration] = useState(false);
  const [newAchievement, setNewAchievement] = useState(null);
  
  // Animation controls
  const headerAnimation = useAnimation();
  const statsAnimation = useAnimation();
  const contentAnimation = useAnimation();
  
  // Custom hooks
  const {
    adminStats,
    achievements,
    unlockAchievement,
    updateProgress,
    isLoading: gamificationLoading
  } = useExerciseGamification();
  
  const {
    stats: exerciseStats,
    recentActivity,
    isLoading: statsLoading,
    refreshStats
  } = useExerciseStats();
  
  const {
    uploadProgress,
    isUploading,
    uploadError,
    uploadVideo,
    cancelUpload
  } = useVideoUpload();
  
  const {
    validationScore,
    validationErrors,
    validateExercise,
    isValidating
  } = useNASMValidation();
  
  // Mock admin stats for demo (replace with real data)
  const mockAdminStats: AdminExerciseStats = useMemo(() => ({
    totalExercises: 247,
    videosUploaded: 189,
    activeUsers: 1247,
    avgQualityScore: 94.5,
    adminLevel: 12,
    currentXP: 8470,
    nextLevelXP: 10000,
    streak: 5,
    totalPoints: 15420,
    achievements: ['Exercise Architect', 'Video Master', 'NASM Guardian', 'Community Builder'],
    recentActivity: []
  }), []);
  
  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    return Math.round((mockAdminStats.currentXP / mockAdminStats.nextLevelXP) * 100);
  }, [mockAdminStats.currentXP, mockAdminStats.nextLevelXP]);
  
  // Handle exercise creation success
  const handleExerciseCreated = useCallback(async (exerciseData: any) => {
    try {
      // Update admin progress
      await updateProgress('exercise_created', { exerciseData });
      
      // Check for new achievements
      const newAchievements = await unlockAchievement('exercise_created');
      if (newAchievements.length > 0) {
        setNewAchievement(newAchievements[0]);
        setShowAchievementCelebration(true);
      }
      
      // Refresh stats
      await refreshStats();
      
      toast({
        title: "Exercise Created Successfully!",
        description: `"${exerciseData.name}" has been added to your exercise library.`,
        variant: "success",
      });
      
      setIsCreationModalOpen(false);
    } catch (error) {
      console.error('Error handling exercise creation:', error);
      toast({
        title: "Error",
        description: "There was an issue creating the exercise. Please try again.",
        variant: "error",
      });
    }
  }, [updateProgress, unlockAchievement, refreshStats, toast]);
  
  // Handle video upload
  const handleVideoUpload = useCallback(async (file: File, exerciseId: string) => {
    try {
      const result = await uploadVideo(file, exerciseId);
      
      if (result.success) {
        // Update admin progress
        await updateProgress('video_uploaded', { exerciseId, videoUrl: result.url });
        
        toast({
          title: "Video Uploaded Successfully!",
          description: "Your exercise demonstration video is now available.",
          variant: "success",
        });
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      toast({
        title: "Upload Failed",
        description: "There was an issue uploading your video. Please try again.",
        variant: "error",
      });
    }
  }, [uploadVideo, updateProgress, toast]);
  
  // Animation sequence on mount
  useEffect(() => {
    const animateEntrance = async () => {
      await headerAnimation.start("visible");
      await statsAnimation.start("visible");
      await contentAnimation.start("visible");
    };
    
    animateEntrance();
  }, [headerAnimation, statsAnimation, contentAnimation]);
  
  // Handle achievement celebration close
  const handleAchievementClose = useCallback(() => {
    setShowAchievementCelebration(false);
    setNewAchievement(null);
  }, []);
  
  return (
    <ThemeProvider theme={exerciseCommandTheme}>
      <CommandCenterContainer
        className={className}
        initial="hidden"
        animate="visible"
        variants={motionVariants.pageEnter}
      >
        {/* Header Section */}
        <CommandHeader
          initial="hidden"
          animate={headerAnimation}
          variants={motionVariants.staggerContainer}
        >
          <HeaderTop>
            <TitleSection>
              <CommandTitle variants={motionVariants.cardEnter}>
                <div className="title-icon">
                  <Dumbbell size={24} />
                </div>
                Exercise Command Center
              </CommandTitle>
              <CommandSubtitle variants={motionVariants.cardEnter}>
                Revolutionary gamified exercise management with professional-grade tools
              </CommandSubtitle>
            </TitleSection>
            
            <AdminStatsSection
              initial="hidden"
              animate={statsAnimation}
              variants={motionVariants.staggerContainer}
            >
              <AdminStatsGrid>
                <StatCard 
                  variants={motionVariants.cardEnter}
                  whileHover="hover"
                  variant="primary"
                >
                  <StatIcon variant="primary">
                    <Dumbbell size={20} />
                  </StatIcon>
                  <StatValue>{mockAdminStats.totalExercises}</StatValue>
                  <StatLabel>Total Exercises</StatLabel>
                </StatCard>
                
                <StatCard 
                  variants={motionVariants.cardEnter}
                  whileHover="hover"
                  variant="success"
                >
                  <StatIcon variant="success">
                    <FileVideo size={20} />
                  </StatIcon>
                  <StatValue>{mockAdminStats.videosUploaded}</StatValue>
                  <StatLabel>Videos Uploaded</StatLabel>
                </StatCard>
                
                <StatCard 
                  variants={motionVariants.cardEnter}
                  whileHover="hover"
                  variant="info"
                >
                  <StatIcon variant="info">
                    <Users size={20} />
                  </StatIcon>
                  <StatValue>{mockAdminStats.activeUsers.toLocaleString()}</StatValue>
                  <StatLabel>Active Users</StatLabel>
                </StatCard>
                
                <StatCard 
                  variants={motionVariants.cardEnter}
                  whileHover="hover"
                  variant="warning"
                >
                  <StatIcon variant="warning">
                    <Award size={20} />
                  </StatIcon>
                  <StatValue>{mockAdminStats.avgQualityScore}%</StatValue>
                  <StatLabel>Quality Score</StatLabel>
                </StatCard>
              </AdminStatsGrid>
            </AdminStatsSection>
          </HeaderTop>
          
          {/* Admin Level & Progress Section */}
          <AdminLevelSection
            initial="hidden"
            animate="visible"
            variants={motionVariants.cardEnter}
          >
            <LevelHeader>
              <LevelInfo>
                <LevelBadge>
                  <Crown size={16} className="crown-icon" />
                  Level {mockAdminStats.adminLevel} Admin
                </LevelBadge>
                <LevelTitle>Exercise Commander</LevelTitle>
              </LevelInfo>
              
              <StreakSection>
                <StreakBadge>
                  <Flame size={14} className="flame-icon" />
                  {mockAdminStats.streak} day streak
                </StreakBadge>
                <PointsBadge>
                  <Star size={14} />
                  {mockAdminStats.totalPoints.toLocaleString()} points
                </PointsBadge>
              </StreakSection>
            </LevelHeader>
            
            <ProgressSection>
              <ProgressLabel>
                <span>Progress to Level {mockAdminStats.adminLevel + 1}</span>
                <span>{mockAdminStats.currentXP.toLocaleString()} / {mockAdminStats.nextLevelXP.toLocaleString()} XP</span>
              </ProgressLabel>
              <ProgressBar>
                <ProgressFill 
                  progress={progressPercentage}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </ProgressBar>
            </ProgressSection>
          </AdminLevelSection>
        </CommandHeader>
        
        {/* Main Content */}
        <MainContent
          initial="hidden"
          animate={contentAnimation}
          variants={motionVariants.staggerContainer}
        >
          <PrimarySection>
            {/* Exercise Creation Section */}
            <ActionSection variants={motionVariants.cardEnter}>
              <SectionHeader>
                <SectionTitle>
                  <Plus size={24} className="section-icon" />
                  Create New Exercise
                </SectionTitle>
                <ActionButtons>
                  <CommandButton
                    variant="primary"
                    size="medium"
                    onClick={() => setIsCreationModalOpen(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus size={18} />
                    Quick Create
                  </CommandButton>
                  <CommandButton
                    variant="secondary"
                    size="medium"
                    onClick={() => setActiveTab('library')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Grid size={18} />
                    View Library
                  </CommandButton>
                </ActionButtons>
              </SectionHeader>
              
              {/* Video Upload Zone */}
              <VideoUploadProcessor
                onUpload={handleVideoUpload}
                uploadProgress={uploadProgress}
                isUploading={isUploading}
                error={uploadError}
                onCancel={cancelUpload}
              />
            </ActionSection>
            
            {/* Exercise Library Management */}
            <ActionSection variants={motionVariants.cardEnter}>
              <SectionHeader>
                <SectionTitle>
                  <Grid size={24} className="section-icon" />
                  Exercise Library
                </SectionTitle>
                <ActionButtons>
                  <CommandButton
                    variant="secondary"
                    size="small"
                    onClick={refreshStats}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <RefreshCw size={16} />
                    Refresh
                  </CommandButton>
                </ActionButtons>
              </SectionHeader>
              
              <ExerciseLibraryManager
                onExerciseSelect={setSelectedExercise}
                onExerciseEdit={(exercise) => {
                  setSelectedExercise(exercise);
                  setIsPreviewModalOpen(true);
                }}
                isLoading={statsLoading}
              />
            </ActionSection>
          </PrimarySection>
          
          {/* Secondary Section - Stats & Analytics */}
          <SecondarySection>
            <ExerciseStatsPanel 
              stats={exerciseStats}
              recentActivity={recentActivity}
              isLoading={statsLoading}
            />
          </SecondarySection>
        </MainContent>
        
        {/* Modals */}
        <AnimatePresence>
          {isCreationModalOpen && (
            <ExerciseCreationWizard
              isOpen={isCreationModalOpen}
              onClose={() => setIsCreationModalOpen(false)}
              onExerciseCreated={handleExerciseCreated}
            />
          )}
          
          {isPreviewModalOpen && selectedExercise && (
            <ExercisePreviewModal
              exercise={selectedExercise}
              isOpen={isPreviewModalOpen}
              onClose={() => {
                setIsPreviewModalOpen(false);
                setSelectedExercise(null);
              }}
            />
          )}
          
          {showAchievementCelebration && newAchievement && (
            <AdminAchievementCelebration
              achievement={newAchievement}
              isVisible={showAchievementCelebration}
              onClose={handleAchievementClose}
            />
          )}
        </AnimatePresence>
      </CommandCenterContainer>
    </ThemeProvider>
  );
};

export default AdminExerciseCommandCenter;
