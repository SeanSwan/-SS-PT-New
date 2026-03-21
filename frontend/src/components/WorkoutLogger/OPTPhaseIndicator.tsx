/**
 * ┌─── SUB-COMPONENT: OPTPhaseIndicator ───────────────────────┐
 * │ PARENT: WorkoutLoggerHeader                                  │
 * │ PURPOSE: Shows current NASM OPT phase with change modal     │
 * │ WIREFRAME:                                                   │
 * │ ┌─────────────────────────────────────────┐                  │
 * │ │ OPT Phase: [■ Phase 2: Str. Endurance ▼]│                  │
 * │ │              ↑ colored chip, click opens  │                  │
 * │ │              change modal with Cancel     │                  │
 * │ │              focused by default           │                  │
 * │ └─────────────────────────────────────────┘                  │
 * │ Props: { currentPhase, onPhaseChange, clientName? }          │
 * └──────────────────────────────────────────────────────────────┘
 *
 * CEO Ruling V2.0 Design Directive #1:
 * initialFocus={cancelButtonRef} to prevent accidental phase changes.
 *
 * NASM OPT Model Phases:
 *   1 - Stabilization Endurance (12-20 reps, 50-70% 1RM, 4/2/1 tempo)
 *   2 - Strength Endurance (8-12 reps, 70-80% 1RM)
 *   3 - Hypertrophy (6-12 reps, 75-85% 1RM)
 *   4 - Maximal Strength (1-5 reps, 85-100% 1RM)
 *   5 - Power (1-5 reps, 30-45%/85-100% 1RM, explosive)
 */

import React, { useState, useRef, useCallback, memo, useEffect } from 'react';
import styled from 'styled-components';
import { CS, withAlpha } from './WorkoutLoggerCS';

// ─── OPT Phase Data ─────────────────────────────────────────

export interface OPTPhaseInfo {
  phase: number;
  name: string;
  shortName: string;
  reps: string;
  intensity: string;
  tempo: string;
  restSeconds: string;
  color: string;
  description: string;
}

export const OPT_PHASES: OPTPhaseInfo[] = [
  {
    phase: 1,
    name: 'Stabilization Endurance',
    shortName: 'Stab. End.',
    reps: '12-20',
    intensity: '50-70%',
    tempo: '4/2/1',
    restSeconds: '0-90',
    color: CS.glow,
    description: 'Light-to-moderate load with high reps. Builds muscular endurance and joint stability.',
  },
  {
    phase: 2,
    name: 'Strength Endurance',
    shortName: 'Str. End.',
    reps: '8-12',
    intensity: '70-80%',
    tempo: '2/0/2',
    restSeconds: '0-60',
    color: CS.gaming,
    description: 'Moderate load with moderate reps. Bridges endurance and strength adaptations.',
  },
  {
    phase: 3,
    name: 'Hypertrophy',
    shortName: 'Hypertrophy',
    reps: '6-12',
    intensity: '75-85%',
    tempo: '2/0/2',
    restSeconds: '0-60',
    color: CS.secondary,
    description: 'Moderate-to-heavy load focused on maximal muscle growth.',
  },
  {
    phase: 4,
    name: 'Maximal Strength',
    shortName: 'Max Str.',
    reps: '1-5',
    intensity: '85-100%',
    tempo: '2/0/1',
    restSeconds: '120-300',
    color: CS.accent,
    description: 'Heavy load with low reps to build peak strength.',
  },
  {
    phase: 5,
    name: 'Power',
    shortName: 'Power',
    reps: '1-5',
    intensity: '30-45% / 85-100%',
    tempo: 'X/0/X',
    restSeconds: '120-300',
    color: '#E05050',
    description: 'Explosive movements. Use 30-45% 1RM for speed or 85-100% for heavy power sets.',
  },
];

// ─── Styled Components ──────────────────────────────────────

const PhaseChip = styled.button<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 16px;
  background: ${({ $color }) => withAlpha($color, 0.15)};
  border: 1px solid ${({ $color }) => withAlpha($color, 0.4)};
  border-radius: 8px;
  color: ${CS.text};
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;

  &:hover {
    background: ${({ $color }) => withAlpha($color, 0.25)};
    border-color: ${({ $color }) => $color};
  }

  &:focus-visible {
    outline: 2px solid ${CS.glow};
    outline-offset: 2px;
  }
`;

const PhaseDot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 6px ${({ $color }) => withAlpha($color, 0.5)};
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: ${CS.bg};
  border: 1px solid ${CS.border};
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
`;

const ModalTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.1rem;
  color: ${CS.text};
  margin: 0 0 8px;
`;

const ModalWarning = styled.p`
  color: ${CS.warningText};
  font-size: 0.8rem;
  margin: 0 0 16px;
  padding: 8px 12px;
  background: ${CS.warningBg};
  border: 1px solid ${CS.warningBorder};
  border-radius: 6px;
`;

const PhaseOption = styled.button<{ $color: string; $isActive: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  min-height: 44px;
  padding: 12px 16px;
  margin-bottom: 8px;
  background: ${({ $isActive, $color }) =>
    $isActive ? withAlpha($color, 0.2) : CS.inputBg};
  border: 2px solid ${({ $isActive, $color }) =>
    $isActive ? $color : 'transparent'};
  border-radius: 8px;
  color: ${CS.text};
  text-align: left;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;

  &:hover {
    background: ${({ $color }) => withAlpha($color, 0.15)};
  }

  &:focus-visible {
    outline: 2px solid ${CS.glow};
    outline-offset: 2px;
  }
`;

const PhaseName = styled.span`
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 0.9rem;
`;

const PhaseDetails = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: ${CS.textSecondary};
  font-variant-numeric: tabular-nums;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
`;

const ModalButton = styled.button<{ $variant: 'cancel' | 'confirm' }>`
  min-height: 44px;
  padding: 10px 24px;
  border-radius: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  background: ${({ $variant }) =>
    $variant === 'confirm' ? CS.secondary : 'transparent'};
  color: ${({ $variant }) =>
    $variant === 'confirm' ? CS.text : CS.textSecondary};
  border: 1px solid ${({ $variant }) =>
    $variant === 'confirm' ? CS.secondary : CS.border};

  &:hover {
    background: ${({ $variant }) =>
      $variant === 'confirm'
        ? CS.secondaryLight
        : 'rgba(80, 160, 240, 0.1)'};
  }

  &:focus-visible {
    outline: 2px solid ${CS.glow};
    outline-offset: 2px;
  }
`;

// ─── Component ──────────────────────────────────────────────

interface OPTPhaseIndicatorProps {
  /** Current OPT phase (1-5) */
  currentPhase: number;
  /** Called when trainer confirms a phase change */
  onPhaseChange: (newPhase: number) => void;
  /** Client name for confirmation message */
  clientName?: string;
}

const OPTPhaseIndicator = memo(function OPTPhaseIndicator({
  currentPhase,
  onPhaseChange,
  clientName,
}: OPTPhaseIndicatorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState(currentPhase);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const currentInfo = OPT_PHASES[currentPhase - 1] || OPT_PHASES[0];

  // CEO Ruling: focus on Cancel button when modal opens
  useEffect(() => {
    if (isModalOpen) {
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        cancelButtonRef.current?.focus();
      });
    }
  }, [isModalOpen]);

  // Escape to close
  useEffect(() => {
    if (!isModalOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isModalOpen]);

  const handleConfirm = useCallback(() => {
    if (selectedPhase !== currentPhase) {
      onPhaseChange(selectedPhase);
    }
    setIsModalOpen(false);
  }, [selectedPhase, currentPhase, onPhaseChange]);

  const handleCancel = useCallback(() => {
    setSelectedPhase(currentPhase);
    setIsModalOpen(false);
  }, [currentPhase]);

  return (
    <>
      <PhaseChip
        $color={currentInfo.color}
        onClick={() => {
          setSelectedPhase(currentPhase);
          setIsModalOpen(true);
        }}
        aria-label={`Current OPT Phase: ${currentInfo.phase} - ${currentInfo.name}. Click to change.`}
      >
        <PhaseDot $color={currentInfo.color} />
        Phase {currentInfo.phase}: {currentInfo.shortName}
      </PhaseChip>

      {isModalOpen && (
        <Overlay
          onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
          role="dialog"
          aria-modal="true"
          aria-label="Change NASM OPT Phase"
        >
          <Modal>
            <ModalTitle>Change OPT Phase{clientName ? ` for ${clientName}` : ''}</ModalTitle>
            <ModalWarning>
              Changing the OPT phase affects recommended reps, intensity, and tempo for all future workouts.
              This should only be done during a scheduled reassessment.
            </ModalWarning>

            {OPT_PHASES.map((phase) => (
              <PhaseOption
                key={phase.phase}
                $color={phase.color}
                $isActive={selectedPhase === phase.phase}
                onClick={() => setSelectedPhase(phase.phase)}
                aria-pressed={selectedPhase === phase.phase}
              >
                <PhaseName>
                  Phase {phase.phase}: {phase.name}
                </PhaseName>
                <PhaseDetails>
                  {phase.reps} reps | {phase.intensity} 1RM | Tempo: {phase.tempo} | Rest: {phase.restSeconds}s
                </PhaseDetails>
              </PhaseOption>
            ))}

            <ModalActions>
              <ModalButton
                ref={cancelButtonRef}
                $variant="cancel"
                onClick={handleCancel}
              >
                Cancel
              </ModalButton>
              <ModalButton
                $variant="confirm"
                onClick={handleConfirm}
                disabled={selectedPhase === currentPhase}
              >
                Change to Phase {selectedPhase}
              </ModalButton>
            </ModalActions>
          </Modal>
        </Overlay>
      )}
    </>
  );
});

export default OPTPhaseIndicator;
