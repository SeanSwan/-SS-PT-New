/**
 * ExerciseCreationWizard.tsx
 * ===========================
 * 
 * Guided exercise creation wizard with NASM compliance validation
 * Ultra-mobile responsive with pixel-perfect design
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Step-by-step guided creation process
 * - Real-time NASM validation feedback
 * - Mobile-optimized touch interactions
 * - Accessibility-first design (WCAG AA compliant)
 * - Auto-save and recovery
 * - Professional form validation
 * - Video upload integration
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { 
  ChevronLeft, ChevronRight, Check, X, AlertCircle, 
  Info, Award, Target, Dumbbell, FileVideo, Save, 
  RefreshCw, Eye, Settings, Plus, Minus, Upload,
  CheckCircle, Users, Shield, Zap
} from 'lucide-react';

import { exerciseCommandTheme, mediaQueries } from '../styles/exerciseCommandTheme';
import { 
  motionVariants,
  validationSuccess,
  validationError,
  slideUp,
  fadeIn,
  accessibleAnimation,
  animationPerformance
} from '../styles/gamificationAnimations';

import { useNASMValidation } from '../hooks/useNASMValidation';
import VideoUploadProcessor from './VideoUploadProcessor';
import { useVideoUpload } from '../hooks/useVideoUpload';

// === STYLED COMPONENTS ===

const WizardOverlay = styled(motion.div)`
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
    padding: ${exerciseCommandTheme.spacing.md};
    align-items: flex-start;
    overflow-y: auto;
  }
`;

const WizardContainer = styled(motion.div)`
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  background: ${exerciseCommandTheme.gradients.exerciseCard};
  backdrop-filter: blur(20px);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: ${exerciseCommandTheme.borderRadius.xl};
  overflow: hidden;
  position: relative;
  
  ${mediaQueries.mobile} {
    max-height: none;
    min-height: 100vh;
    border-radius: 0;
    margin-top: 0;
  }
  
  ${animationPerformance}
  ${accessibleAnimation}
`;

const WizardHeader = styled.div`
  background: ${exerciseCommandTheme.gradients.commandCenter};
  color: ${exerciseCommandTheme.colors.deepSpace};
  padding: ${exerciseCommandTheme.spacing.xl};
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.lg};
    flex-direction: column;
    gap: ${exerciseCommandTheme.spacing.md};
    align-items: flex-start;
  }
`;

const WizardTitle = styled.h2`
  font-size: ${exerciseCommandTheme.typography.fontSizes.xl};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.bold};
  display: flex;
  align-items: center;
  gap: ${exerciseCommandTheme.spacing.md};
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.lg};
    gap: ${exerciseCommandTheme.spacing.sm};
  }
`;

const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: ${exerciseCommandTheme.spacing.sm};
  
  ${mediaQueries.mobile} {
    width: 100%;
    justify-content: space-between;
  }
`;

const StepDot = styled(motion.div)<{ isActive: boolean; isCompleted: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: ${exerciseCommandTheme.borderRadius.full};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.bold};
  border: 2px solid;
  
  background: ${props => {
    if (props.isCompleted) return exerciseCommandTheme.colors.exerciseGreen;
    if (props.isActive) return exerciseCommandTheme.colors.stellarWhite;
    return 'transparent';
  }};
  
  color: ${props => {
    if (props.isCompleted) return exerciseCommandTheme.colors.stellarWhite;
    if (props.isActive) return exerciseCommandTheme.colors.deepSpace;
    return exerciseCommandTheme.colors.stellarWhite;
  }};
  
  border-color: ${props => {
    if (props.isCompleted) return exerciseCommandTheme.colors.exerciseGreen;
    if (props.isActive) return exerciseCommandTheme.colors.stellarWhite;
    return 'rgba(255, 255, 255, 0.3)';
  }};
  
  ${mediaQueries.mobile} {
    width: 28px;
    height: 28px;
    font-size: ${exerciseCommandTheme.typography.fontSizes.xs};
  }
`;

const StepConnector = styled.div<{ isCompleted: boolean }>`
  width: 40px;
  height: 2px;
  background: ${props => 
    props.isCompleted 
      ? exerciseCommandTheme.colors.exerciseGreen 
      : 'rgba(255, 255, 255, 0.3)'
  };
  transition: all ${exerciseCommandTheme.transitions.base};
  
  ${mediaQueries.mobile} {
    width: 20px;
  }
`;

const CloseButton = styled(motion.button)`
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
`;

const WizardContent = styled.div`
  padding: ${exerciseCommandTheme.spacing['2xl']};
  max-height: 60vh;
  overflow-y: auto;
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.lg};
    max-height: none;
  }
  
  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(30, 58, 138, 0.1);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${exerciseCommandTheme.gradients.commandCenter};
    border-radius: 3px;
  }
`;

const StepContent = styled(motion.div)`
  min-height: 400px;
  
  ${mediaQueries.mobile} {
    min-height: 300px;
  }
`;

const FormSection = styled.div`
  margin-bottom: ${exerciseCommandTheme.spacing['2xl']};
  
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

const FormField = styled.div`
  margin-bottom: ${exerciseCommandTheme.spacing.xl};
  
  ${mediaQueries.mobile} {
    margin-bottom: ${exerciseCommandTheme.spacing.lg};
  }
`;

const FieldLabel = styled.label`
  display: block;
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.semibold};
  color: ${exerciseCommandTheme.colors.primaryText};
  margin-bottom: ${exerciseCommandTheme.spacing.sm};
  
  .required {
    color: ${exerciseCommandTheme.colors.criticalRed};
    margin-left: ${exerciseCommandTheme.spacing.xs};
  }
`;

const FieldInput = styled(motion.input)<{ hasError?: boolean; hasSuccess?: boolean }>`
  width: 100%;
  padding: ${exerciseCommandTheme.spacing.inputPadding};
  border: 2px solid ${props => {
    if (props.hasError) return exerciseCommandTheme.colors.criticalRed;
    if (props.hasSuccess) return exerciseCommandTheme.colors.exerciseGreen;
    return 'rgba(59, 130, 246, 0.3)';
  }};
  border-radius: ${exerciseCommandTheme.borderRadius.input};
  background: ${exerciseCommandTheme.colors.inputBackground};
  color: ${exerciseCommandTheme.colors.primaryText};
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  transition: all ${exerciseCommandTheme.transitions.base};
  
  &:focus {
    outline: none;
    border-color: ${exerciseCommandTheme.colors.stellarBlue};
    box-shadow: ${exerciseCommandTheme.shadows.inputFocus};
  }
  
  &::placeholder {
    color: ${exerciseCommandTheme.colors.placeholderText};
  }
  
  ${props => props.hasSuccess && `
    animation: ${validationSuccess} 0.5s ease-out;
  `}
  
  ${props => props.hasError && `
    animation: ${validationError} 0.5s ease-out;
  `}
`;

const FieldTextarea = styled(motion.textarea)<{ hasError?: boolean; hasSuccess?: boolean }>`
  width: 100%;
  min-height: 120px;
  padding: ${exerciseCommandTheme.spacing.inputPadding};
  border: 2px solid ${props => {
    if (props.hasError) return exerciseCommandTheme.colors.criticalRed;
    if (props.hasSuccess) return exerciseCommandTheme.colors.exerciseGreen;
    return 'rgba(59, 130, 246, 0.3)';
  }};
  border-radius: ${exerciseCommandTheme.borderRadius.input};
  background: ${exerciseCommandTheme.colors.inputBackground};
  color: ${exerciseCommandTheme.colors.primaryText};
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  font-family: ${exerciseCommandTheme.typography.fontFamily.primary};
  resize: vertical;
  transition: all ${exerciseCommandTheme.transitions.base};
  
  &:focus {
    outline: none;
    border-color: ${exerciseCommandTheme.colors.stellarBlue};
    box-shadow: ${exerciseCommandTheme.shadows.inputFocus};
  }
  
  &::placeholder {
    color: ${exerciseCommandTheme.colors.placeholderText};
  }
`;

const FieldSelect = styled(motion.select)<{ hasError?: boolean; hasSuccess?: boolean }>`
  width: 100%;
  padding: ${exerciseCommandTheme.spacing.inputPadding};
  border: 2px solid ${props => {
    if (props.hasError) return exerciseCommandTheme.colors.criticalRed;
    if (props.hasSuccess) return exerciseCommandTheme.colors.exerciseGreen;
    return 'rgba(59, 130, 246, 0.3)';
  }};
  border-radius: ${exerciseCommandTheme.borderRadius.input};
  background: ${exerciseCommandTheme.colors.inputBackground};
  color: ${exerciseCommandTheme.colors.primaryText};
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  cursor: pointer;
  transition: all ${exerciseCommandTheme.transitions.base};
  
  &:focus {
    outline: none;
    border-color: ${exerciseCommandTheme.colors.stellarBlue};
    box-shadow: ${exerciseCommandTheme.shadows.inputFocus};
  }
`;

const TagInput = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${exerciseCommandTheme.spacing.sm};
  margin-bottom: ${exerciseCommandTheme.spacing.md};
`;

const Tag = styled(motion.span)`
  background: ${exerciseCommandTheme.gradients.buttonPrimary};
  color: ${exerciseCommandTheme.colors.stellarWhite};
  padding: ${exerciseCommandTheme.spacing.xs} ${exerciseCommandTheme.spacing.sm};
  border-radius: ${exerciseCommandTheme.borderRadius.badge};
  font-size: ${exerciseCommandTheme.typography.fontSizes.xs};
  display: flex;
  align-items: center;
  gap: ${exerciseCommandTheme.spacing.xs};
  
  button {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    
    &:hover {
      opacity: 0.8;
    }
  }
`;

const ValidationFeedback = styled(motion.div)<{ type: 'error' | 'warning' | 'success' }>`
  display: flex;
  align-items: center;
  gap: ${exerciseCommandTheme.spacing.sm};
  margin-top: ${exerciseCommandTheme.spacing.sm};
  padding: ${exerciseCommandTheme.spacing.sm} ${exerciseCommandTheme.spacing.md};
  border-radius: ${exerciseCommandTheme.borderRadius.md};
  font-size: ${exerciseCommandTheme.typography.fontSizes.xs};
  
  background: ${props => {
    switch (props.type) {
      case 'error': return 'rgba(239, 68, 68, 0.1)';
      case 'warning': return 'rgba(251, 191, 36, 0.1)';
      case 'success': return 'rgba(16, 185, 129, 0.1)';
    }
  }};
  
  border: 1px solid ${props => {
    switch (props.type) {
      case 'error': return 'rgba(239, 68, 68, 0.3)';
      case 'warning': return 'rgba(251, 191, 36, 0.3)';
      case 'success': return 'rgba(16, 185, 129, 0.3)';
    }
  }};
  
  color: ${props => {
    switch (props.type) {
      case 'error': return exerciseCommandTheme.colors.criticalRed;
      case 'warning': return exerciseCommandTheme.colors.warningAmber;
      case 'success': return exerciseCommandTheme.colors.exerciseGreen;
    }
  }};
  
  .feedback-icon {
    flex-shrink: 0;
  }
`;

const ComplianceScore = styled(motion.div)`
  background: ${exerciseCommandTheme.gradients.exerciseCard};
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: ${exerciseCommandTheme.borderRadius.lg};
  padding: ${exerciseCommandTheme.spacing.lg};
  margin-bottom: ${exerciseCommandTheme.spacing.xl};
`;

const ScoreHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: between;
  margin-bottom: ${exerciseCommandTheme.spacing.md};
  
  ${mediaQueries.mobile} {
    flex-direction: column;
    gap: ${exerciseCommandTheme.spacing.sm};
    align-items: flex-start;
  }
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
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.xl};
  }
`;

const WizardFooter = styled.div`
  background: rgba(30, 58, 138, 0.1);
  padding: ${exerciseCommandTheme.spacing.xl};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${exerciseCommandTheme.spacing.lg};
  border-top: 1px solid rgba(59, 130, 246, 0.2);
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.lg};
    flex-direction: column;
    gap: ${exerciseCommandTheme.spacing.md};
  }
`;

const FooterButtons = styled.div`
  display: flex;
  gap: ${exerciseCommandTheme.spacing.md};
  
  ${mediaQueries.mobile} {
    width: 100%;
    flex-direction: column;
    gap: ${exerciseCommandTheme.spacing.sm};
  }
`;

const WizardButton = styled(motion.button)<{ 
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
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
  
  &:hover:not(:disabled) {
    transform: translateY(-2px) scale(1.02);
    box-shadow: ${exerciseCommandTheme.shadows.buttonElevation};
  }
  
  &:active {
    transform: translateY(0) scale(0.98);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  ${mediaQueries.mobile} {
    width: 100%;
    justify-content: center;
  }
  
  ${animationPerformance}
`;

// === INTERFACES ===

interface ExerciseFormData {
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
  recommendedSets?: number;
  recommendedReps?: number;
  recommendedDuration?: number;
  prerequisites: string[];
  progressionPath: string[];
  videoFile?: File;
}

interface ExerciseCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onExerciseCreated: (exerciseData: ExerciseFormData) => void;
  initialData?: Partial<ExerciseFormData>;
}

// === CONSTANTS ===

const WIZARD_STEPS = [
  { id: 'basic', title: 'Basic Information', icon: Info },
  { id: 'details', title: 'Exercise Details', icon: Target },
  { id: 'safety', title: 'Safety & Guidelines', icon: Shield },
  { id: 'video', title: 'Video Upload', icon: FileVideo },
  { id: 'review', title: 'Review & Submit', icon: CheckCircle }
];

const EXERCISE_TYPES = [
  'Strength Training', 'Cardio', 'Flexibility', 'Balance', 'Core',
  'Calisthenics', 'Olympic Lifting', 'Powerlifting', 'Functional',
  'Rehabilitation', 'Mobility', 'Stability', 'Plyometric'
];

const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Arms', 'Biceps', 'Triceps',
  'Core', 'Abs', 'Obliques', 'Legs', 'Quadriceps', 'Hamstrings',
  'Glutes', 'Calves', 'Forearms', 'Neck', 'Full Body'
];

const EQUIPMENT_OPTIONS = [
  'None/Bodyweight', 'Dumbbells', 'Barbell', 'Kettlebell', 'Resistance Bands',
  'TRX/Suspension Trainer', 'Pull-up Bar', 'Bench', 'Medicine Ball',
  'Stability Ball', 'Foam Roller', 'Cable Machine', 'Smith Machine'
];

// === MAIN COMPONENT ===

const ExerciseCreationWizard: React.FC<ExerciseCreationWizardProps> = ({
  isOpen,
  onClose,
  onExerciseCreated,
  initialData
}) => {
  // Hooks
  const { validateExercise, validateField, complianceReport, isValidating } = useNASMValidation();
  const { uploadVideo, isUploading, uploadProgress } = useVideoUpload();
  
  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ExerciseFormData>({
    name: '',
    description: '',
    instructions: [''],
    exerciseType: '',
    primaryMuscles: [],
    secondaryMuscles: [],
    equipmentNeeded: [],
    difficulty: 100,
    contraindicationNotes: '',
    safetyTips: '',
    recommendedSets: 3,
    recommendedReps: 10,
    prerequisites: [],
    progressionPath: [],
    ...initialData
  });
  const [fieldValidation, setFieldValidation] = useState<Record<string, any>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges && Object.keys(formData).some(key => formData[key as keyof ExerciseFormData])) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        localStorage.setItem('exercise-draft', JSON.stringify(formData));
        setHasUnsavedChanges(false);
      }, 2000); // Auto-save after 2 seconds of inactivity
    }
  }, [formData, hasUnsavedChanges]);
  
  // Load draft on mount
  useEffect(() => {
    if (isOpen && !initialData) {
      const draft = localStorage.getItem('exercise-draft');
      if (draft) {
        try {
          const draftData = JSON.parse(draft);
          setFormData(prev => ({ ...prev, ...draftData }));
        } catch (error) {
          console.error('Failed to load draft:', error);
        }
      }
    }
  }, [isOpen, initialData]);
  
  // Update form data
  const updateFormData = useCallback((field: keyof ExerciseFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    
    // Validate field in real-time
    const validation = validateField(field, value);
    setFieldValidation(prev => ({ ...prev, [field]: validation }));
  }, [validateField]);
  
  // Add instruction
  const addInstruction = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      instructions: [...prev.instructions, '']
    }));
  }, []);
  
  // Remove instruction
  const removeInstruction = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
    }));
  }, []);
  
  // Update instruction
  const updateInstruction = useCallback((index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.map((inst, i) => i === index ? value : inst)
    }));
    setHasUnsavedChanges(true);
  }, []);
  
  // Add/remove tags
  const addTag = useCallback((field: keyof ExerciseFormData, value: string) => {
    const currentArray = formData[field] as string[];
    if (!currentArray.includes(value)) {
      updateFormData(field, [...currentArray, value]);
    }
  }, [formData, updateFormData]);
  
  const removeTag = useCallback((field: keyof ExerciseFormData, value: string) => {
    const currentArray = formData[field] as string[];
    updateFormData(field, currentArray.filter(item => item !== value));
  }, [formData, updateFormData]);
  
  // Navigation
  const nextStep = useCallback(() => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep]);
  
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);
  
  // Handle video upload
  const handleVideoUpload = useCallback(async (file: File) => {
    setFormData(prev => ({ ...prev, videoFile: file }));
  }, []);
  
  // Submit exercise
  const handleSubmit = useCallback(async () => {
    try {
      // Validate the complete exercise
      const report = await validateExercise(formData);
      
      if (report.passesCompliance) {
        // Upload video if provided
        if (formData.videoFile) {
          await uploadVideo(formData.videoFile);
        }
        
        // Submit exercise
        onExerciseCreated(formData);
        
        // Clear draft
        localStorage.removeItem('exercise-draft');
        
        // Close wizard
        onClose();
      } else {
        // Show validation errors
        console.error('Exercise does not meet NASM compliance standards');
      }
    } catch (error) {
      console.error('Failed to submit exercise:', error);
    }
  }, [formData, validateExercise, uploadVideo, onExerciseCreated, onClose]);
  
  // Get field validation feedback
  const getFieldFeedback = useCallback((field: keyof ExerciseFormData) => {
    const validation = fieldValidation[field];
    if (!validation || validation.length === 0) return null;
    
    const hasError = validation.some((v: any) => v.severity === 'error');
    const hasWarning = validation.some((v: any) => v.severity === 'warning');
    const hasSuccess = validation.some((v: any) => v.severity === 'info' && v.isValid);
    
    if (hasError) {
      const errorMessage = validation.find((v: any) => v.severity === 'error')?.message;
      return { type: 'error' as const, message: errorMessage };
    }
    
    if (hasWarning) {
      const warningMessage = validation.find((v: any) => v.severity === 'warning')?.message;
      return { type: 'warning' as const, message: warningMessage };
    }
    
    if (hasSuccess) {
      const successMessage = validation.find((v: any) => v.severity === 'info' && v.isValid)?.message;
      return { type: 'success' as const, message: successMessage };
    }
    
    return null;
  }, [fieldValidation]);
  
  // Render step content
  const renderStepContent = useCallback(() => {
    const step = WIZARD_STEPS[currentStep];
    
    switch (step.id) {
      case 'basic':
        return (
          <StepContent
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <FormSection>
              <SectionTitle>
                <Info size={20} className="section-icon" />
                Basic Exercise Information
              </SectionTitle>
              
              <FormField>
                <FieldLabel>
                  Exercise Name <span className="required">*</span>
                </FieldLabel>
                <FieldInput
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder="e.g., Push-up - Beginner Variation"
                  hasError={getFieldFeedback('name')?.type === 'error'}
                  hasSuccess={getFieldFeedback('name')?.type === 'success'}
                />
                {getFieldFeedback('name') && (
                  <ValidationFeedback type={getFieldFeedback('name')!.type}>
                    <AlertCircle size={16} className="feedback-icon" />
                    {getFieldFeedback('name')!.message}
                  </ValidationFeedback>
                )}
              </FormField>
              
              <FormField>
                <FieldLabel>
                  Exercise Type <span className="required">*</span>
                </FieldLabel>
                <FieldSelect
                  value={formData.exerciseType}
                  onChange={(e) => updateFormData('exerciseType', e.target.value)}
                >
                  <option value="">Select exercise type</option>
                  {EXERCISE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </FieldSelect>
              </FormField>
              
              <FormField>
                <FieldLabel>
                  Description <span className="required">*</span>
                </FieldLabel>
                <FieldTextarea
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Describe the exercise, its benefits, and what makes it unique..."
                  hasError={getFieldFeedback('description')?.type === 'error'}
                  hasSuccess={getFieldFeedback('description')?.type === 'success'}
                />
                {getFieldFeedback('description') && (
                  <ValidationFeedback type={getFieldFeedback('description')!.type}>
                    <AlertCircle size={16} className="feedback-icon" />
                    {getFieldFeedback('description')!.message}
                  </ValidationFeedback>
                )}
              </FormField>
            </FormSection>
          </StepContent>
        );
        
      case 'details':
        return (
          <StepContent
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <FormSection>
              <SectionTitle>
                <Target size={20} className="section-icon" />
                Exercise Details & Targeting
              </SectionTitle>
              
              {/* Primary Muscles */}
              <FormField>
                <FieldLabel>
                  Primary Muscle Groups <span className="required">*</span>
                </FieldLabel>
                <TagInput>
                  {formData.primaryMuscles.map(muscle => (
                    <Tag key={muscle}>
                      {muscle}
                      <button onClick={() => removeTag('primaryMuscles', muscle)}>
                        <X size={12} />
                      </button>
                    </Tag>
                  ))}
                </TagInput>
                <FieldSelect
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      addTag('primaryMuscles', e.target.value);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">Add primary muscle group</option>
                  {MUSCLE_GROUPS.filter(muscle => !formData.primaryMuscles.includes(muscle)).map(muscle => (
                    <option key={muscle} value={muscle}>{muscle}</option>
                  ))}
                </FieldSelect>
                {getFieldFeedback('primaryMuscles') && (
                  <ValidationFeedback type={getFieldFeedback('primaryMuscles')!.type}>
                    <AlertCircle size={16} className="feedback-icon" />
                    {getFieldFeedback('primaryMuscles')!.message}
                  </ValidationFeedback>
                )}
              </FormField>
              
              {/* Instructions */}
              <FormField>
                <FieldLabel>
                  Step-by-Step Instructions <span className="required">*</span>
                </FieldLabel>
                {formData.instructions.map((instruction, index) => (
                  <div key={index} style={{ display: 'flex', gap: exerciseCommandTheme.spacing.sm, marginBottom: exerciseCommandTheme.spacing.md }}>
                    <FieldInput
                      type="text"
                      value={instruction}
                      onChange={(e) => updateInstruction(index, e.target.value)}
                      placeholder={`Step ${index + 1}: Describe the movement...`}
                      style={{ flex: 1 }}
                    />
                    {formData.instructions.length > 1 && (
                      <WizardButton
                        variant="danger"
                        size="small"
                        onClick={() => removeInstruction(index)}
                        type="button"
                      >
                        <Minus size={16} />
                      </WizardButton>
                    )}
                  </div>
                ))}
                <WizardButton
                  variant="secondary"
                  size="small"
                  onClick={addInstruction}
                  type="button"
                >
                  <Plus size={16} />
                  Add Step
                </WizardButton>
                {getFieldFeedback('instructions') && (
                  <ValidationFeedback type={getFieldFeedback('instructions')!.type}>
                    <AlertCircle size={16} className="feedback-icon" />
                    {getFieldFeedback('instructions')!.message}
                  </ValidationFeedback>
                )}
              </FormField>
              
              {/* Difficulty & Equipment */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: exerciseCommandTheme.spacing.lg }}>
                <FormField>
                  <FieldLabel>
                    Difficulty Level <span className="required">*</span>
                  </FieldLabel>
                  <FieldInput
                    type="range"
                    min="1"
                    max="1000"
                    value={formData.difficulty}
                    onChange={(e) => updateFormData('difficulty', parseInt(e.target.value))}
                  />
                  <div style={{ textAlign: 'center', marginTop: exerciseCommandTheme.spacing.sm }}>
                    {formData.difficulty}/1000
                    {formData.difficulty <= 200 && ' (Beginner)'}
                    {formData.difficulty > 200 && formData.difficulty <= 600 && ' (Intermediate)'}
                    {formData.difficulty > 600 && ' (Advanced)'}
                  </div>
                </FormField>
              </div>
            </FormSection>
          </StepContent>
        );
        
      case 'safety':
        return (
          <StepContent
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <FormSection>
              <SectionTitle>
                <Shield size={20} className="section-icon" />
                Safety Guidelines & Considerations
              </SectionTitle>
              
              <FormField>
                <FieldLabel>
                  Safety Tips <span className="required">*</span>
                </FieldLabel>
                <FieldTextarea
                  value={formData.safetyTips}
                  onChange={(e) => updateFormData('safetyTips', e.target.value)}
                  placeholder="Provide detailed safety tips including proper form cues, common mistakes to avoid, and injury prevention guidelines..."
                  hasError={getFieldFeedback('safetyTips')?.type === 'error'}
                  hasSuccess={getFieldFeedback('safetyTips')?.type === 'success'}
                />
                {getFieldFeedback('safetyTips') && (
                  <ValidationFeedback type={getFieldFeedback('safetyTips')!.type}>
                    <AlertCircle size={16} className="feedback-icon" />
                    {getFieldFeedback('safetyTips')!.message}
                  </ValidationFeedback>
                )}
              </FormField>
              
              <FormField>
                <FieldLabel>
                  Contraindications <span className="required">*</span>
                </FieldLabel>
                <FieldTextarea
                  value={formData.contraindicationNotes}
                  onChange={(e) => updateFormData('contraindicationNotes', e.target.value)}
                  placeholder="List populations or conditions where this exercise should be avoided or modified..."
                  hasError={getFieldFeedback('contraindicationNotes')?.type === 'error'}
                  hasSuccess={getFieldFeedback('contraindicationNotes')?.type === 'success'}
                />
                {getFieldFeedback('contraindicationNotes') && (
                  <ValidationFeedback type={getFieldFeedback('contraindicationNotes')!.type}>
                    <AlertCircle size={16} className="feedback-icon" />
                    {getFieldFeedback('contraindicationNotes')!.message}
                  </ValidationFeedback>
                )}
              </FormField>
            </FormSection>
          </StepContent>
        );
        
      case 'video':
        return (
          <StepContent
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <FormSection>
              <SectionTitle>
                <FileVideo size={20} className="section-icon" />
                Exercise Demonstration Video
              </SectionTitle>
              
              <VideoUploadProcessor
                onUpload={handleVideoUpload}
                uploadProgress={uploadProgress}
                isUploading={isUploading}
                onCancel={() => {}}
              />
            </FormSection>
          </StepContent>
        );
        
      case 'review':
        return (
          <StepContent
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <FormSection>
              <SectionTitle>
                <CheckCircle size={20} className="section-icon" />
                Review & NASM Compliance
              </SectionTitle>
              
              {complianceReport && (
                <ComplianceScore>
                  <ScoreHeader>
                    <div>
                      <h4>NASM Compliance Score</h4>
                      <ScoreValue score={complianceReport.percentage}>
                        {complianceReport.percentage}% ({complianceReport.grade})
                      </ScoreValue>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div>Status: {complianceReport.passesCompliance ? '✅ PASSES' : '❌ NEEDS WORK'}</div>
                    </div>
                  </ScoreHeader>
                  
                  {complianceReport.recommendations.length > 0 && (
                    <div>
                      <h5>Recommendations:</h5>
                      <ul>
                        {complianceReport.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </ComplianceScore>
              )}
              
              {/* Exercise Summary */}
              <div style={{ background: exerciseCommandTheme.colors.inputBackground, padding: exerciseCommandTheme.spacing.lg, borderRadius: exerciseCommandTheme.borderRadius.lg }}>
                <h4>{formData.name}</h4>
                <p>{formData.description}</p>
                <p><strong>Type:</strong> {formData.exerciseType}</p>
                <p><strong>Difficulty:</strong> {formData.difficulty}/1000</p>
                <p><strong>Primary Muscles:</strong> {formData.primaryMuscles.join(', ')}</p>
                {formData.videoFile && <p><strong>Video:</strong> ✅ Uploaded</p>}
              </div>
            </FormSection>
          </StepContent>
        );
        
      default:
        return null;
    }
  }, [currentStep, formData, getFieldFeedback, updateFormData, addTag, removeTag, addInstruction, removeInstruction, updateInstruction, handleVideoUpload, uploadProgress, isUploading, complianceReport]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);
  
  if (!isOpen) return null;
  
  return (
    <WizardOverlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <WizardContainer
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <WizardHeader>
          <div>
            <WizardTitle>
              <Dumbbell size={24} />
              Create New Exercise
            </WizardTitle>
            <p style={{ opacity: 0.8, marginTop: exerciseCommandTheme.spacing.xs }}>
              Follow NASM standards for professional exercise creation
            </p>
          </div>
          
          <StepIndicator>
            {WIZARD_STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <StepDot
                  isActive={index === currentStep}
                  isCompleted={index < currentStep}
                  whileHover={{ scale: 1.1 }}
                >
                  {index < currentStep ? <Check size={16} /> : index + 1}
                </StepDot>
                {index < WIZARD_STEPS.length - 1 && (
                  <StepConnector isCompleted={index < currentStep} />
                )}
              </React.Fragment>
            ))}
          </StepIndicator>
          
          <CloseButton
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X size={20} />
          </CloseButton>
        </WizardHeader>
        
        {/* Content */}
        <WizardContent>
          <AnimatePresence mode="wait">
            {renderStepContent()}
          </AnimatePresence>
        </WizardContent>
        
        {/* Footer */}
        <WizardFooter>
          <div>
            Step {currentStep + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[currentStep].title}
            {hasUnsavedChanges && (
              <div style={{ fontSize: exerciseCommandTheme.typography.fontSizes.xs, opacity: 0.7, marginTop: exerciseCommandTheme.spacing.xs }}>
                Auto-saving changes...
              </div>
            )}
          </div>
          
          <FooterButtons>
            <WizardButton
              variant="secondary"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ChevronLeft size={16} />
              Previous
            </WizardButton>
            
            {currentStep < WIZARD_STEPS.length - 1 ? (
              <WizardButton
                variant="primary"
                onClick={nextStep}
              >
                Next
                <ChevronRight size={16} />
              </WizardButton>
            ) : (
              <WizardButton
                variant="success"
                onClick={handleSubmit}
                disabled={isValidating || !complianceReport?.passesCompliance}
              >
                {isValidating ? (
                  <>
                    <RefreshCw size={16} />
                    Validating...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Create Exercise
                  </>
                )}
              </WizardButton>
            )}
          </FooterButtons>
        </WizardFooter>
      </WizardContainer>
    </WizardOverlay>
  );
};

export default ExerciseCreationWizard;
