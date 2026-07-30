/**
 * ┌─── SUB-COMPONENT: OPTPhaseIndicator ───────────────────────┐
 * │ PARENT: PlanContextSheet (shell zone 1 plan sheet)           │
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

import { useState, useRef, useCallback, memo, useEffect } from 'react';
import { CS } from './WorkoutLoggerCS';
import {
  Modal,
  ModalActions,
  ModalButton,
  ModalTitle,
  ModalWarning,
  Overlay,
  PhaseChip,
  PhaseDetails,
  PhaseDot,
  PhaseName,
  PhaseOption,
} from './OPTPhaseIndicator.styles';

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

const OPT_PHASES: OPTPhaseInfo[] = [
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
    color: CS.error,
    description: 'Explosive movements. Use 30-45% 1RM for speed or 85-100% for heavy power sets.',
  },
];

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
        type="button"
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
                type="button"
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
                type="button"
                ref={cancelButtonRef}
                $variant="cancel"
                onClick={handleCancel}
              >
                Cancel
              </ModalButton>
              <ModalButton
                type="button"
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
