/**
 * ┌─── SUB-COMPONENT: WorkoutLoggerFooter ─────────────────────┐
 * │ PARENT: WorkoutLogger                                       │
 * │ PURPOSE: Action bar with Cancel, Export PDF, Submit, and    │
 * │          optional Generate Summary buttons                  │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────────┐                │
 * │ │ [← Cancel] [📄 PDF] [💬 Summary] [Save] │                │
 * │ └──────────────────────────────────────────┘                │
 * │ Props: {                                                    │
 * │   onCancel, onExportPDF, onSubmit, onGenerateSummary?,      │
 * │   hasExercises, isSubmitting, isGeneratingSummary,           │
 * │   showGenerateSummary                                       │
 * │ }                                                           │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Save, MessageSquare } from 'lucide-react';
import { CS, shimmer, reducedMotionSafe } from './WorkoutLoggerCS';

interface WorkoutLoggerFooterProps {
  onCancel: () => void;
  onExportPDF: () => void;
  onSubmit: () => void;
  onGenerateSummary?: () => void;
  hasExercises: boolean;
  isSubmitting: boolean;
  isGeneratingSummary: boolean;
  showGenerateSummary: boolean;
}

const WorkoutLoggerFooter: React.FC<WorkoutLoggerFooterProps> = React.memo(({
  onCancel,
  onExportPDF,
  onSubmit,
  onGenerateSummary,
  hasExercises,
  isSubmitting,
  isGeneratingSummary,
  showGenerateSummary,
}) => (
  <ActionButtons>
    <Button
      variant="secondary"
      onClick={onCancel}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <ArrowLeft size={18} />
      Cancel
    </Button>
    <Button
      variant="secondary"
      onClick={onExportPDF}
      disabled={!hasExercises}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Download size={18} />
      Export PDF
    </Button>
    <Button
      variant="primary"
      onClick={onSubmit}
      disabled={!hasExercises || isSubmitting}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={isSubmitting ? { pointerEvents: 'none' } : undefined}
    >
      {isSubmitting ? (
        <Spinner />
      ) : (
        <>
          <Save size={18} />
          Complete & Save Workout
        </>
      )}
    </Button>
    {showGenerateSummary && onGenerateSummary && (
      <Button
        variant="secondary"
        onClick={onGenerateSummary}
        disabled={isGeneratingSummary}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isGeneratingSummary ? (
          <Spinner />
        ) : (
          <>
            <MessageSquare size={18} />
            Generate & Send Summary
          </>
        )}
      </Button>
    )}
  </ActionButtons>
));

WorkoutLoggerFooter.displayName = 'WorkoutLoggerFooter';
export default WorkoutLoggerFooter;

// ── Styled Components ──

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  border-top-color: #ffffff;
  animation: ${spin} 0.8s ease-in-out infinite;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Button = styled(motion.button)<{ variant: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.875rem 2rem;
  border-radius: 1rem;
  font-weight: 600;
  font-size: 1rem;
  font-family: 'Sora', sans-serif;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 140px;
  min-height: 48px;
  justify-content: center;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  ${props => props.variant === 'primary' && css`
    background: linear-gradient(135deg, ${CS.glow}, ${CS.gaming});
    color: #ffffff;
    box-shadow: 0 4px 20px rgba(80, 160, 240, 0.3);

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
      background-size: 200% 100%;
      animation: ${shimmer} 3s ease-in-out infinite;
      pointer-events: none;
    }
  `}

  ${props => props.variant === 'secondary' && css`
    background: transparent;
    color: ${CS.text};
    border: 1.5px solid ${CS.glassBorder};
    backdrop-filter: blur(8px);

    &:hover {
      border-color: rgba(96, 192, 240, 0.4);
      background: rgba(96, 192, 240, 0.06);
    }
  `}

  ${props => props.variant === 'danger' && css`
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
  `}

  &:hover { transform: translateY(-2px); }
  &:active { transform: scale(0.97); }

  &:focus-visible {
    outline: 2px solid ${CS.gaming};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  ${reducedMotionSafe}

  @media (max-width: 430px) {
    min-width: unset;
    width: 100%;
    min-height: 48px;
    font-size: 0.9rem;
  }
`;
