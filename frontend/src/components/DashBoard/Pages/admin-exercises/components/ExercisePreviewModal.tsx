/**
 * ExercisePreviewModal.tsx
 * ========================
 * 
 * Immersive exercise preview modal with video playback and detailed information
 * Ultra-mobile responsive with professional presentation
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Full-screen exercise preview
 * - Professional video player integration
 * - Real-time NASM compliance display
 * - Mobile-optimized touch interactions
 * - Accessibility-first design (WCAG AA compliant)
 * - Edit and action capabilities
 * - Usage analytics display
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { 
  X, Play, Pause, Volume2, VolumeX, Maximize2, 
  Edit3, Share2, Download, BarChart3, Users, 
  Star, Clock, Eye, ThumbsUp, AlertCircle, 
  CheckCircle, Shield, Target, Award, Info,
  Calendar, TrendingUp, Copy, ExternalLink
} from 'lucide-react';

import { exerciseCommandTheme, mediaQueries } from '../styles/exerciseCommandTheme';
import { 
  motionVariants,
  videoPreviewGlow,
  fadeIn,
  slideUp,
  accessibleAnimation,
  animationPerformance
} from '../styles/gamificationAnimations';

// === STYLED COMPONENTS ===

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(10, 10, 15, 0.95);
  backdrop-filter: blur(10px);
  z-index: ${exerciseCommandTheme.zIndex.modal};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${exerciseCommandTheme.spacing.lg};
  
  ${mediaQueries.mobile} {
    padding: 0;
    align-items: flex-start;
  }
`;

const ModalContainer = styled(motion.div)`
  width: 100%;
  max-width: 1200px;
  max-height: 90vh;
  background: ${exerciseCommandTheme.gradients.exerciseCard};
  backdrop-filter: blur(20px);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: ${exerciseCommandTheme.borderRadius.xl};
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  
  ${mediaQueries.mobile} {
    max-height: 100vh;
    border-radius: 0;
    height: 100vh;
  }
  
  ${animationPerformance}
  ${accessibleAnimation}
`;

const ModalHeader = styled.div`
  background: ${exerciseCommandTheme.gradients.commandCenter};
  color: ${exerciseCommandTheme.colors.deepSpace};
  padding: ${exerciseCommandTheme.spacing.xl};
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.lg};
  }
`;

const HeaderInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ExerciseTitle = styled.h2`
  font-size: ${exerciseCommandTheme.typography.fontSizes.xl};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.bold};
  margin-bottom: ${exerciseCommandTheme.spacing.sm};
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.lg};
  }
`;

const ExerciseCategory = styled.div`
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  opacity: 0.8;
  display: flex;
  align-items: center;
  gap: ${exerciseCommandTheme.spacing.sm};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${exerciseCommandTheme.spacing.sm};
  align-items: center;
  
  ${mediaQueries.mobile} {
    flex-direction: column;
    gap: ${exerciseCommandTheme.spacing.xs};
  }
`;

const HeaderButton = styled(motion.button)`
  width: 40px;
  height: 40px;
  border-radius: ${exerciseCommandTheme.borderRadius.full};
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: ${exerciseCommandTheme.colors.stellarWhite};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all ${exerciseCommandTheme.transitions.base};
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }
  
  ${mediaQueries.mobile} {
    width: 36px;
    height: 36px;
  }
`;

const ModalContent = styled.div`
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: 1fr 400px;
  
  ${mediaQueries.tablet} {
    grid-template-columns: 1fr;
  }
  
  ${mediaQueries.mobile} {
    display: flex;
    flex-direction: column;
  }
  
  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(30, 58, 138, 0.1);
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${exerciseCommandTheme.gradients.commandCenter};
    border-radius: 3px;
  }
`;

const VideoSection = styled.div`
  position: relative;
  background: ${exerciseCommandTheme.colors.deepSpace};
  display: flex;
  flex-direction: column;
`;

const VideoContainer = styled(motion.div)`
  position: relative;
  width: 100%;
  background: ${exerciseCommandTheme.colors.deepSpace};
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  
  ${mediaQueries.mobile} {
    min-height: 250px;
  }
`;

const VideoPlayer = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: ${exerciseCommandTheme.borderRadius.md};
`;

const VideoPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: ${exerciseCommandTheme.colors.secondaryText};
  background: ${exerciseCommandTheme.gradients.uploadZone};
  border-radius: ${exerciseCommandTheme.borderRadius.md};
  margin: ${exerciseCommandTheme.spacing.lg};
  
  .placeholder-icon {
    margin-bottom: ${exerciseCommandTheme.spacing.md};
    opacity: 0.5;
  }
`;

const VideoControls = styled(motion.div)<{ isVisible: boolean }>`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  padding: ${exerciseCommandTheme.spacing.lg};
  display: flex;
  align-items: center;
  gap: ${exerciseCommandTheme.spacing.md};
  opacity: ${props => props.isVisible ? 1 : 0};
  transition: opacity ${exerciseCommandTheme.transitions.base};
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.md};
    gap: ${exerciseCommandTheme.spacing.sm};
  }
`;

const PlayButton = styled(motion.button)`
  width: 48px;
  height: 48px;
  border-radius: ${exerciseCommandTheme.borderRadius.full};
  background: ${exerciseCommandTheme.gradients.buttonPrimary};
  border: none;
  color: ${exerciseCommandTheme.colors.stellarWhite};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all ${exerciseCommandTheme.transitions.base};
  
  &:hover {
    transform: scale(1.1);
    box-shadow: ${exerciseCommandTheme.shadows.commandGlow};
  }
  
  ${mediaQueries.mobile} {
    width: 40px;
    height: 40px;
  }
`;

const VolumeButton = styled(motion.button)`
  width: 40px;
  height: 40px;
  border-radius: ${exerciseCommandTheme.borderRadius.full};
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: ${exerciseCommandTheme.colors.stellarWhite};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all ${exerciseCommandTheme.transitions.base};
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  ${mediaQueries.mobile} {
    width: 36px;
    height: 36px;
  }
`;

const ProgressBar = styled.div`
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  position: relative;
  cursor: pointer;
`;

const ProgressFill = styled.div<{ progress: number }>`
  width: ${props => props.progress}%;
  height: 100%;
  background: ${exerciseCommandTheme.gradients.progressBar};
  border-radius: 2px;
  transition: width ${exerciseCommandTheme.transitions.base};
`;

const TimeDisplay = styled.div`
  color: ${exerciseCommandTheme.colors.stellarWhite};
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.medium};
  min-width: 80px;
  text-align: center;
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.xs};
    min-width: 60px;
  }
`;

const ExerciseInfo = styled.div`
  padding: ${exerciseCommandTheme.spacing.xl};
  background: rgba(30, 58, 138, 0.05);
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.lg};
  }
`;

const InfoSection = styled.div`
  margin-bottom: ${exerciseCommandTheme.spacing['2xl']};
  
  &:last-child {
    margin-bottom: 0;
  }
  
  ${mediaQueries.mobile} {
    margin-bottom: ${exerciseCommandTheme.spacing.xl};
  }
`;

const SectionTitle = styled.h3`
  font-size: ${exerciseCommandTheme.typography.fontSizes.lg};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.semibold};
  color: ${exerciseCommandTheme.colors.primaryText};
  margin-bottom: ${exerciseCommandTheme.spacing.lg};
  display: flex;
  align-items: center;
  gap: ${exerciseCommandTheme.spacing.md};
  
  .section-icon {
    color: ${exerciseCommandTheme.colors.stellarBlue};
  }
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.base};
    gap: ${exerciseCommandTheme.spacing.sm};
  }
`;

const Description = styled.p`
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  line-height: ${exerciseCommandTheme.typography.lineHeights.relaxed};
  color: ${exerciseCommandTheme.colors.secondaryText};
  margin-bottom: ${exerciseCommandTheme.spacing.lg};
`;

const InstructionsList = styled.ol`
  list-style: none;
  counter-reset: step-counter;
  padding: 0;
  margin: 0;
`;

const InstructionItem = styled.li`
  counter-increment: step-counter;
  margin-bottom: ${exerciseCommandTheme.spacing.lg};
  padding-left: ${exerciseCommandTheme.spacing['2xl']};
  position: relative;
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  line-height: ${exerciseCommandTheme.typography.lineHeights.relaxed};
  color: ${exerciseCommandTheme.colors.secondaryText};
  
  &::before {
    content: counter(step-counter);
    position: absolute;
    left: 0;
    top: 0;
    width: 24px;
    height: 24px;
    background: ${exerciseCommandTheme.gradients.buttonPrimary};
    color: ${exerciseCommandTheme.colors.stellarWhite};
    border-radius: ${exerciseCommandTheme.borderRadius.full};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: ${exerciseCommandTheme.typography.fontSizes.xs};
    font-weight: ${exerciseCommandTheme.typography.fontWeights.bold};
  }
  
  ${mediaQueries.mobile} {
    padding-left: ${exerciseCommandTheme.spacing.xl};
    
    &::before {
      width: 20px;
      height: 20px;
    }
  }
`;

const TagGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${exerciseCommandTheme.spacing.sm};
  margin-bottom: ${exerciseCommandTheme.spacing.lg};
`;

const Tag = styled.span<{ variant?: 'primary' | 'success' | 'warning' }>`
  background: ${props => {
    switch (props.variant) {
      case 'success': return exerciseCommandTheme.gradients.buttonSuccess;
      case 'warning': return exerciseCommandTheme.gradients.buttonWarning;
      default: return exerciseCommandTheme.gradients.buttonPrimary;
    }
  }};
  color: ${props => 
    props.variant === 'warning' 
      ? exerciseCommandTheme.colors.deepSpace 
      : exerciseCommandTheme.colors.stellarWhite
  };
  padding: ${exerciseCommandTheme.spacing.xs} ${exerciseCommandTheme.spacing.sm};
  border-radius: ${exerciseCommandTheme.borderRadius.badge};
  font-size: ${exerciseCommandTheme.typography.fontSizes.xs};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.medium};
`;

const ComplianceScore = styled(motion.div)<{ score: number }>`
  background: ${props => {
    if (props.score >= 90) return 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)';
    if (props.score >= 80) return 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(30, 58, 138, 0.05) 100%)';
    if (props.score >= 70) return 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)';
    return 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)';
  }};
  border: 1px solid ${props => {
    if (props.score >= 90) return 'rgba(16, 185, 129, 0.3)';
    if (props.score >= 80) return 'rgba(59, 130, 246, 0.3)';
    if (props.score >= 70) return 'rgba(251, 191, 36, 0.3)';
    return 'rgba(239, 68, 68, 0.3)';
  }};
  border-radius: ${exerciseCommandTheme.borderRadius.lg};
  padding: ${exerciseCommandTheme.spacing.lg};
  margin-bottom: ${exerciseCommandTheme.spacing.lg};
`;

const ScoreValue = styled.div<{ score: number }>`
  font-size: ${exerciseCommandTheme.typography.fontSizes['2xl']};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.bold};
  color: ${props => {
    if (props.score >= 90) return exerciseCommandTheme.colors.exerciseGreen;
    if (props.score >= 80) return exerciseCommandTheme.colors.stellarBlue;
    if (props.score >= 70) return exerciseCommandTheme.colors.warningAmber;
    return exerciseCommandTheme.colors.criticalRed;
  }};
  display: flex;
  align-items: center;
  gap: ${exerciseCommandTheme.spacing.sm};
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.xl};
  }
`;

const ScoreLabel = styled.div`
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  color: ${exerciseCommandTheme.colors.secondaryText};
  margin-top: ${exerciseCommandTheme.spacing.xs};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${exerciseCommandTheme.spacing.lg};
  margin-bottom: ${exerciseCommandTheme.spacing.lg};
  
  ${mediaQueries.mobile} {
    grid-template-columns: 1fr;
    gap: ${exerciseCommandTheme.spacing.md};
  }
`;

const StatItem = styled.div`
  text-align: center;
  padding: ${exerciseCommandTheme.spacing.lg};
  background: rgba(30, 58, 138, 0.05);
  border-radius: ${exerciseCommandTheme.borderRadius.lg};
  border: 1px solid rgba(59, 130, 246, 0.1);
`;

const StatValue = styled.div`
  font-size: ${exerciseCommandTheme.typography.fontSizes.lg};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.bold};
  color: ${exerciseCommandTheme.colors.primaryText};
  margin-bottom: ${exerciseCommandTheme.spacing.xs};
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.base};
  }
`;

const StatLabel = styled.div`
  font-size: ${exerciseCommandTheme.typography.fontSizes.xs};
  color: ${exerciseCommandTheme.colors.secondaryText};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${exerciseCommandTheme.spacing.md};
  margin-top: ${exerciseCommandTheme.spacing.xl};
  
  ${mediaQueries.mobile} {
    flex-direction: column;
    gap: ${exerciseCommandTheme.spacing.sm};
  }
`;

const ActionButton = styled(motion.button)<{ variant?: 'primary' | 'secondary' | 'success' | 'danger' }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${exerciseCommandTheme.spacing.sm};
  padding: ${exerciseCommandTheme.spacing.md} ${exerciseCommandTheme.spacing.lg};
  border: none;
  border-radius: ${exerciseCommandTheme.borderRadius.button};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.semibold};
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  cursor: pointer;
  transition: all ${exerciseCommandTheme.transitions.base};
  
  background: ${props => {
    switch (props.variant) {
      case 'success': return exerciseCommandTheme.gradients.buttonSuccess;
      case 'danger': return exerciseCommandTheme.gradients.buttonDanger;
      case 'secondary': return 'rgba(30, 58, 138, 0.2)';
      default: return exerciseCommandTheme.gradients.buttonPrimary;
    }
  }};
  
  color: ${props => 
    props.variant === 'secondary' 
      ? exerciseCommandTheme.colors.primaryText 
      : exerciseCommandTheme.colors.stellarWhite
  };
  
  &:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: ${exerciseCommandTheme.shadows.buttonElevation};
  }
  
  &:active {
    transform: translateY(0) scale(0.98);
  }
  
  ${animationPerformance}
`;

// === INTERFACES ===

interface Exercise {
  id: string;
  name: string;
  description: string;
  instructions: string[];
  exerciseType: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipmentNeeded: string[];
  difficulty: number;
  contraindicationNotes: string;
  safetyTips: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  nasmScore?: number;
  stats?: {
    views: number;
    completions: number;
    avgRating: number;
    lastUsed: string;
  };
}

interface ExercisePreviewModalProps {
  exercise: Exercise;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (exercise: Exercise) => void;
  onDelete?: (exerciseId: string) => void;
  className?: string;
}

// === UTILITY FUNCTIONS ===

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const getDifficultyLabel = (difficulty: number): { label: string; variant: 'primary' | 'success' | 'warning' } => {
  if (difficulty <= 200) return { label: 'Beginner', variant: 'success' };
  if (difficulty <= 600) return { label: 'Intermediate', variant: 'primary' };
  return { label: 'Advanced', variant: 'warning' };
};

// === MAIN COMPONENT ===

const ExercisePreviewModal: React.FC<ExercisePreviewModalProps> = ({
  exercise,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  className
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Video control handlers
  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);
  
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);
  
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);
  
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);
  
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [duration]);
  
  // Mouse movement handler for controls
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);
  
  // Action handlers
  const handleEdit = useCallback(() => {
    if (onEdit) {
      onEdit(exercise);
    }
  }, [exercise, onEdit]);
  
  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: exercise.name,
        text: exercise.description,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  }, [exercise]);
  
  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
  }, []);
  
  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'm':
        case 'M':
          toggleMute();
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, togglePlayPause, toggleMute]);
  
  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);
  
  // Get difficulty info
  const difficultyInfo = getDifficultyLabel(exercise.difficulty);
  
  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  if (!isOpen) return null;
  
  return (
    <ModalOverlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={className}
    >
      <ModalContainer
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <ModalHeader>
          <HeaderInfo>
            <ExerciseTitle>{exercise.name}</ExerciseTitle>
            <ExerciseCategory>
              <Target size={16} />
              {exercise.exerciseType} • {exercise.primaryMuscles.join(', ')}
            </ExerciseCategory>
          </HeaderInfo>
          
          <HeaderActions>
            {onEdit && (
              <HeaderButton
                onClick={handleEdit}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Edit exercise"
              >
                <Edit3 size={18} />
              </HeaderButton>
            )}
            
            <HeaderButton
              onClick={handleShare}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Share exercise"
            >
              <Share2 size={18} />
            </HeaderButton>
            
            <HeaderButton
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Close modal"
            >
              <X size={18} />
            </HeaderButton>
          </HeaderActions>
        </ModalHeader>
        
        {/* Content */}
        <ModalContent>
          {/* Video Section */}
          <VideoSection>
            <VideoContainer
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setShowControls(true)}
            >
              {exercise.videoUrl ? (
                <>
                  <VideoPlayer
                    ref={videoRef}
                    src={exercise.videoUrl}
                    poster={exercise.thumbnailUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onClick={togglePlayPause}
                  />
                  
                  <VideoControls isVisible={showControls}>
                    <PlayButton
                      onClick={togglePlayPause}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </PlayButton>
                    
                    <VolumeButton
                      onClick={toggleMute}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </VolumeButton>
                    
                    <ProgressBar onClick={handleProgressClick}>
                      <ProgressFill progress={progressPercentage} />
                    </ProgressBar>
                    
                    <TimeDisplay>
                      {formatDuration(currentTime)} / {formatDuration(duration)}
                    </TimeDisplay>
                    
                    <VolumeButton
                      onClick={() => videoRef.current?.requestFullscreen()}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Maximize2 size={18} />
                    </VolumeButton>
                  </VideoControls>
                </>
              ) : (
                <VideoPlaceholder>
                  <Play size={64} className="placeholder-icon" />
                  <div>No video demonstration available</div>
                </VideoPlaceholder>
              )}
            </VideoContainer>
          </VideoSection>
          
          {/* Exercise Information */}
          <ExerciseInfo>
            {/* NASM Compliance Score */}
            {exercise.nasmScore && (
              <InfoSection>
                <ComplianceScore
                  score={exercise.nasmScore}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <ScoreValue score={exercise.nasmScore}>
                    <Award size={24} />
                    {exercise.nasmScore}%
                  </ScoreValue>
                  <ScoreLabel>NASM Compliance Score</ScoreLabel>
                </ComplianceScore>
              </InfoSection>
            )}
            
            {/* Exercise Stats */}
            {exercise.stats && (
              <InfoSection>
                <SectionTitle>
                  <BarChart3 size={18} className="section-icon" />
                  Usage Statistics
                </SectionTitle>
                
                <StatsGrid>
                  <StatItem>
                    <StatValue>{formatNumber(exercise.stats.views)}</StatValue>
                    <StatLabel>Total Views</StatLabel>
                  </StatItem>
                  
                  <StatItem>
                    <StatValue>{formatNumber(exercise.stats.completions)}</StatValue>
                    <StatLabel>Completions</StatLabel>
                  </StatItem>
                  
                  <StatItem>
                    <StatValue>{exercise.stats.avgRating.toFixed(1)}</StatValue>
                    <StatLabel>Average Rating</StatLabel>
                  </StatItem>
                  
                  <StatItem>
                    <StatValue>
                      {exercise.stats.completions > 0 
                        ? Math.round((exercise.stats.completions / exercise.stats.views) * 100)
                        : 0}%
                    </StatValue>
                    <StatLabel>Completion Rate</StatLabel>
                  </StatItem>
                </StatsGrid>
              </InfoSection>
            )}
            
            {/* Description */}
            <InfoSection>
              <SectionTitle>
                <Info size={18} className="section-icon" />
                Description
              </SectionTitle>
              <Description>{exercise.description}</Description>
              
              <TagGrid>
                <Tag variant={difficultyInfo.variant}>{difficultyInfo.label}</Tag>
                {exercise.primaryMuscles.map(muscle => (
                  <Tag key={muscle}>{muscle}</Tag>
                ))}
                {exercise.equipmentNeeded.length > 0 && (
                  <Tag variant="success">Equipment Required</Tag>
                )}
              </TagGrid>
            </InfoSection>
            
            {/* Instructions */}
            <InfoSection>
              <SectionTitle>
                <Target size={18} className="section-icon" />
                Step-by-Step Instructions
              </SectionTitle>
              
              <InstructionsList>
                {exercise.instructions.map((instruction, index) => (
                  <InstructionItem key={index}>
                    {instruction}
                  </InstructionItem>
                ))}
              </InstructionsList>
            </InfoSection>
            
            {/* Safety Information */}
            {(exercise.safetyTips || exercise.contraindicationNotes) && (
              <InfoSection>
                <SectionTitle>
                  <Shield size={18} className="section-icon" />
                  Safety & Guidelines
                </SectionTitle>
                
                {exercise.safetyTips && (
                  <div style={{ marginBottom: exerciseCommandTheme.spacing.lg }}>
                    <h5 style={{ 
                      color: exerciseCommandTheme.colors.primaryText, 
                      marginBottom: exerciseCommandTheme.spacing.sm,
                      fontSize: exerciseCommandTheme.typography.fontSizes.sm,
                      fontWeight: exerciseCommandTheme.typography.fontWeights.semibold
                    }}>
                      Safety Tips:
                    </h5>
                    <Description>{exercise.safetyTips}</Description>
                  </div>
                )}
                
                {exercise.contraindicationNotes && (
                  <div>
                    <h5 style={{ 
                      color: exerciseCommandTheme.colors.criticalRed, 
                      marginBottom: exerciseCommandTheme.spacing.sm,
                      fontSize: exerciseCommandTheme.typography.fontSizes.sm,
                      fontWeight: exerciseCommandTheme.typography.fontWeights.semibold,
                      display: 'flex',
                      alignItems: 'center',
                      gap: exerciseCommandTheme.spacing.xs
                    }}>
                      <AlertCircle size={16} />
                      Contraindications:
                    </h5>
                    <Description>{exercise.contraindicationNotes}</Description>
                  </div>
                )}
              </InfoSection>
            )}
            
            {/* Action Buttons */}
            <ActionButtons>
              <ActionButton
                variant="secondary"
                onClick={handleCopyLink}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Copy size={16} />
                Copy Link
              </ActionButton>
              
              <ActionButton
                variant="primary"
                onClick={() => window.open(`/exercises/${exercise.id}`, '_blank')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ExternalLink size={16} />
                Open Full View
              </ActionButton>
            </ActionButtons>
          </ExerciseInfo>
        </ModalContent>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default ExercisePreviewModal;
