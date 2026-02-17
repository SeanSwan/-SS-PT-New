/**
 * Bulk Actions Confirmation Dialog Component
 * =========================================
 * Advanced bulk operations dialog with previews, undo functionality, and progress tracking
 *
 * Features:
 * - Action preview with affected sessions
 * - Progress indicators during execution
 * - Undo functionality for reversible actions
 * - Detailed success/failure reporting
 * - Batch processing with error handling
 *
 * Architecture: styled-components + lucide-react (Galaxy-Swan theme, no MUI)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { keyframes, css } from 'styled-components';

// Icons (lucide-react)
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  RotateCcw,
  Play,
  Pause,
  Square,
  ChevronDown,
  ChevronUp,
  Info,
  Warning,
  Zap,
  Target,
  Users,
  Trash2,
  Edit,
  Copy,
  Move,
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  X
} from 'lucide-react';

// Custom Components
import GlowButton from '../../ui/buttons/GlowButton';
import { useToast } from '../../../hooks/use-toast';

// Services
import sessionService from '../../../services/sessionService';

// Types
import type { SessionEvent, BulkActionType } from '../types';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BulkActionResult {
  sessionId: string;
  success: boolean;
  error?: string;
  originalData?: any;
}

interface BulkActionsConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  action: BulkActionType;
  selectedSessions: SessionEvent[];
  onActionComplete: (results: BulkActionResult[]) => void;
  onUndo?: (sessionId: string) => void;
}

interface ActionConfig {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  confirmationText: string;
  warningLevel: 'low' | 'medium' | 'high';
  reversible: boolean;
  requiresInput: boolean;
  inputFields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'select' | 'date' | 'number';
    options?: Array<{ value: string; label: string }>;
    required: boolean;
  }>;
}

// ─── Animations ────────────────────────────────────────────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const progressStripe = keyframes`
  0%   { background-position: 0 0; }
  100% { background-position: 40px 0; }
`;

// ─── Styled Components ─────────────────────────────────────────────────────────

/* ---------- Modal shell ---------- */

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  animation: ${fadeIn} 0.2s ease-out;
`;

const ModalPanel = styled.div`
  position: relative;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #0a0a0f, #1e1e3f);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  color: #e2e8f0;
  overflow: hidden;
  animation: ${slideUp} 0.3s ease-out;
  margin: 16px;
`;

const ModalHeader = styled.div<{ $accentColor: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px 24px;
  background: linear-gradient(135deg, ${p => p.$accentColor}20, ${p => p.$accentColor}40);
  font-size: 1.25rem;
  font-weight: 600;
  color: #e2e8f0;
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(14,165,233,0.3); border-radius: 3px; }
`;

const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 20px 24px;
  border-top: 1px solid rgba(14,165,233,0.15);
`;

/* ---------- Chip ---------- */

const StyledChip = styled.span<{ $outlined?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 999px;
  background: ${p => p.$outlined ? 'transparent' : 'rgba(14,165,233,0.15)'};
  border: 1px solid ${p => p.$outlined ? 'rgba(14,165,233,0.4)' : 'rgba(14,165,233,0.2)'};
  color: #0ea5e9;
  white-space: nowrap;
`;

/* ---------- Typography helpers ---------- */

const SectionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 12px 0;
`;

const SubTitle = styled.h4`
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(226,232,240,0.85);
  margin: 0 0 8px 0;
`;

const BodyText = styled.span<{ $capitalize?: boolean; $muted?: boolean }>`
  font-size: 0.875rem;
  color: ${p => p.$muted ? 'rgba(226,232,240,0.6)' : '#e2e8f0'};
  text-transform: ${p => p.$capitalize ? 'capitalize' : 'none'};
`;

const BigNumber = styled.div<{ $color: string }>`
  font-size: 2rem;
  font-weight: 700;
  color: ${p => p.$color};
  text-align: center;
`;

/* ---------- Grid ---------- */

const GridRow = styled.div<{ $cols?: number; $gap?: number }>`
  display: grid;
  grid-template-columns: repeat(${p => p.$cols || 2}, 1fr);
  gap: ${p => p.$gap || 16}px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

/* ---------- Card / Paper ---------- */

const CardSurface = styled.div<{ $bg?: string }>`
  padding: 16px;
  border-radius: 12px;
  background: ${p => p.$bg || 'rgba(255,255,255,0.05)'};
  border: 1px solid rgba(14,165,233,0.12);
`;

/* ---------- Flex row ---------- */

const FlexRow = styled.div<{ $justify?: string; $gap?: number; $mb?: number }>`
  display: flex;
  align-items: center;
  justify-content: ${p => p.$justify || 'flex-start'};
  gap: ${p => p.$gap || 8}px;
  margin-bottom: ${p => p.$mb || 0}px;
`;

/* ---------- Buttons ---------- */

const GhostButton = styled.button<{ $disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255,255,255,0.7);
  background: transparent;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${p => p.$disabled ? 0.45 : 1};
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(255,255,255,0.06);
    color: #e2e8f0;
  }
`;

const SmallButton = styled.button<{ $disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  padding: 6px 12px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #e2e8f0;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(14,165,233,0.2);
  border-radius: 6px;
  cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${p => p.$disabled ? 0.45 : 1};
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: rgba(14,165,233,0.15);
  }
`;

const UndoButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 6px;
  background: transparent;
  border: 1px solid rgba(14,165,233,0.2);
  border-radius: 8px;
  color: rgba(226,232,240,0.7);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(14,165,233,0.12);
    color: #0ea5e9;
  }
`;

/* ---------- Toggle switch ---------- */

const ToggleWrapper = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  cursor: pointer;
  user-select: none;
  font-size: 0.875rem;
  color: #e2e8f0;
`;

const ToggleTrack = styled.span<{ $checked: boolean }>`
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: ${p => p.$checked ? '#0ea5e9' : 'rgba(255,255,255,0.15)'};
  transition: background 0.25s;
`;

const ToggleKnob = styled.span<{ $checked: boolean }>`
  position: absolute;
  top: 2px;
  left: ${p => p.$checked ? '22px' : '2px'};
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: left 0.25s;
`;

const HiddenCheckbox = styled.input`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

/* ---------- Collapsible ---------- */

const CollapsibleContent = styled.div<{ $open: boolean }>`
  max-height: ${p => p.$open ? '9999px' : '0'};
  opacity: ${p => p.$open ? 1 : 0};
  overflow: hidden;
  transition: max-height 0.35s ease, opacity 0.25s ease;
`;

/* ---------- Table ---------- */

const TableWrapper = styled.div`
  margin-top: 12px;
  max-height: 300px;
  overflow: auto;
  border-radius: 10px;
  border: 1px solid rgba(14,165,233,0.15);

  &::-webkit-scrollbar { width: 6px; height: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(14,165,233,0.3); border-radius: 3px; }
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
`;

const THead = styled.thead`
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgba(15,23,42,0.95);
`;

const Th = styled.th`
  text-align: left;
  padding: 10px 14px;
  color: rgba(226,232,240,0.7);
  font-weight: 600;
  border-bottom: 1px solid rgba(14,165,233,0.2);
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 8px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  color: #e2e8f0;
`;

/* ---------- Form controls ---------- */

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FormLabel = styled.label`
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgba(226,232,240,0.7);
`;

const StyledSelect = styled.select`
  min-height: 44px;
  padding: 8px 12px;
  font-size: 0.875rem;
  color: #e2e8f0;
  background: rgba(15,23,42,0.8);
  border: 1px solid rgba(14,165,233,0.25);
  border-radius: 8px;
  outline: none;
  cursor: pointer;

  option {
    background: #0f172a;
    color: #e2e8f0;
  }

  &:focus {
    border-color: #0ea5e9;
    box-shadow: 0 0 0 2px rgba(14,165,233,0.15);
  }
`;

const StyledInput = styled.input`
  min-height: 44px;
  padding: 8px 12px;
  font-size: 0.875rem;
  color: #e2e8f0;
  background: rgba(15,23,42,0.8);
  border: 1px solid rgba(14,165,233,0.25);
  border-radius: 8px;
  outline: none;

  &::placeholder { color: rgba(226,232,240,0.35); }

  &:focus {
    border-color: #0ea5e9;
    box-shadow: 0 0 0 2px rgba(14,165,233,0.15);
  }
`;

/* ---------- Alert ---------- */

const alertColorMap = {
  error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  icon: '#ef4444' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: '#f59e0b' },
  info:    { bg: 'rgba(14,165,233,0.12)',  border: 'rgba(14,165,233,0.3)', icon: '#0ea5e9' },
};

const AlertBox = styled.div<{ $severity: 'error' | 'warning' | 'info' }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 10px;
  font-size: 0.875rem;
  color: #e2e8f0;
  background: ${p => alertColorMap[p.$severity].bg};
  border: 1px solid ${p => alertColorMap[p.$severity].border};
  margin-bottom: 16px;
`;

/* ---------- Progress bar ---------- */

const ProgressBarOuter = styled.div`
  height: 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.1);
  overflow: hidden;
`;

const ProgressBarInner = styled.div<{ $value: number; $color: string }>`
  width: ${p => p.$value}%;
  height: 100%;
  border-radius: 4px;
  background: ${p => p.$color};
  background-image: linear-gradient(
    45deg,
    rgba(255,255,255,0.15) 25%, transparent 25%,
    transparent 50%, rgba(255,255,255,0.15) 50%,
    rgba(255,255,255,0.15) 75%, transparent 75%
  );
  background-size: 40px 40px;
  animation: ${progressStripe} 1s linear infinite;
  transition: width 0.3s ease;
`;

/* ---------- Stepper ---------- */

const StepperContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const StepRow = styled.div`
  display: flex;
  gap: 16px;
`;

const StepIndicatorColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 32px;
`;

const StepCircle = styled.div<{ $state: 'active' | 'completed' | 'pending' }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;

  ${p => p.$state === 'completed' && css`
    background: #22c55e;
    color: #fff;
  `}
  ${p => p.$state === 'active' && css`
    background: #0ea5e9;
    color: #fff;
  `}
  ${p => p.$state === 'pending' && css`
    background: rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.5);
  `}
`;

const StepLine = styled.div<{ $completed: boolean }>`
  width: 2px;
  flex: 1;
  min-height: 16px;
  background: ${p => p.$completed ? '#22c55e' : 'rgba(255,255,255,0.12)'};
`;

const StepLabelText = styled.span<{ $state: 'active' | 'completed' | 'pending' }>`
  font-size: 0.875rem;
  font-weight: 500;
  padding-top: 5px;
  color: ${p => p.$state === 'active' ? '#fff'
    : p.$state === 'completed' ? '#22c55e'
    : 'rgba(255,255,255,0.5)'};
`;

const StepContentArea = styled.div`
  padding: 12px 0 24px;
  flex: 1;
`;

/* ---------- List ---------- */

const StyledList = styled.ul<{ $maxHeight?: number }>`
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: ${p => p.$maxHeight ? `${p.$maxHeight}px` : 'auto'};
  overflow-y: auto;

  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb { background: rgba(14,165,233,0.3); border-radius: 3px; }
`;

const StyledListItem = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.05);

  &:last-child { border-bottom: none; }
`;

const ListItemBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const ListItemPrimary = styled.div`
  font-size: 0.875rem;
  color: #e2e8f0;
`;

const ListItemSecondary = styled.div`
  font-size: 0.75rem;
  color: rgba(226,232,240,0.55);
  margin-top: 2px;
`;

/* ---------- Tooltip (simple title-based, no MUI Tooltip) ---------- */
// We use the native `title` attribute for tooltips in the migration.

// ─── Component ─────────────────────────────────────────────────────────────────

const BulkActionsConfirmationDialog: React.FC<BulkActionsConfirmationDialogProps> = ({
  open,
  onClose,
  action,
  selectedSessions,
  onActionComplete,
  onUndo
}) => {
  const { toast } = useToast();

  // Component state
  const [activeStep, setActiveStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [results, setResults] = useState<BulkActionResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [actionInputs, setActionInputs] = useState<Record<string, any>>({});
  const [previewExpanded, setPreviewExpanded] = useState(true);

  // Action configurations
  const actionConfigs: Record<BulkActionType, ActionConfig> = {
    confirm: {
      title: 'Confirm Sessions',
      description: 'Mark selected sessions as confirmed',
      icon: <CheckCircle />,
      color: '#22c55e',
      confirmationText: 'Confirm all selected sessions?',
      warningLevel: 'low',
      reversible: true,
      requiresInput: false
    },
    cancel: {
      title: 'Cancel Sessions',
      description: 'Cancel selected sessions and notify clients',
      icon: <XCircle />,
      color: '#ef4444',
      confirmationText: 'Cancel all selected sessions? This action will notify clients.',
      warningLevel: 'high',
      reversible: true,
      requiresInput: true,
      inputFields: [
        {
          key: 'reason',
          label: 'Cancellation Reason',
          type: 'select',
          options: [
            { value: 'trainer_illness', label: 'Trainer Illness' },
            { value: 'facility_closure', label: 'Facility Closure' },
            { value: 'equipment_malfunction', label: 'Equipment Issue' },
            { value: 'schedule_conflict', label: 'Schedule Conflict' },
            { value: 'other', label: 'Other' }
          ],
          required: true
        },
        {
          key: 'notifyClients',
          label: 'Send Notification to Clients',
          type: 'select',
          options: [
            { value: 'email', label: 'Email Only' },
            { value: 'sms', label: 'SMS Only' },
            { value: 'both', label: 'Email & SMS' },
            { value: 'none', label: 'No Notification' }
          ],
          required: true
        }
      ]
    },
    delete: {
      title: 'Delete Sessions',
      description: 'Permanently delete selected sessions',
      icon: <Trash2 />,
      color: '#dc2626',
      confirmationText: 'Permanently delete all selected sessions? This action cannot be undone.',
      warningLevel: 'high',
      reversible: false,
      requiresInput: true,
      inputFields: [
        {
          key: 'confirmation',
          label: 'Type "DELETE" to confirm',
          type: 'text',
          required: true
        }
      ]
    },
    reassign: {
      title: 'Reassign Trainer',
      description: 'Assign selected sessions to a different trainer',
      icon: <Move />,
      color: '#3b82f6',
      confirmationText: 'Reassign all selected sessions to the chosen trainer?',
      warningLevel: 'medium',
      reversible: true,
      requiresInput: true,
      inputFields: [
        {
          key: 'newTrainerId',
          label: 'New Trainer',
          type: 'select',
          options: [], // Will be populated with trainers
          required: true
        },
        {
          key: 'notifyClients',
          label: 'Notify Clients of Change',
          type: 'select',
          options: [
            { value: 'yes', label: 'Yes, notify clients' },
            { value: 'no', label: 'No notification' }
          ],
          required: true
        }
      ]
    },
    reschedule: {
      title: 'Reschedule Sessions',
      description: 'Move selected sessions to different times',
      icon: <Calendar />,
      color: '#f59e0b',
      confirmationText: 'Reschedule all selected sessions?',
      warningLevel: 'medium',
      reversible: true,
      requiresInput: true,
      inputFields: [
        {
          key: 'timeOffset',
          label: 'Time Adjustment',
          type: 'select',
          options: [
            { value: '60', label: '+1 hour' },
            { value: '120', label: '+2 hours' },
            { value: '-60', label: '-1 hour' },
            { value: '-120', label: '-2 hours' },
            { value: '1440', label: '+1 day' },
            { value: '-1440', label: '-1 day' }
          ],
          required: true
        }
      ]
    },
    duplicate: {
      title: 'Duplicate Sessions',
      description: 'Create copies of selected sessions',
      icon: <Copy />,
      color: '#8b5cf6',
      confirmationText: 'Create duplicates of all selected sessions?',
      warningLevel: 'low',
      reversible: true,
      requiresInput: true,
      inputFields: [
        {
          key: 'dateOffset',
          label: 'Schedule duplicates for',
          type: 'select',
          options: [
            { value: '7', label: 'Next week (same times)' },
            { value: '14', label: 'Two weeks later' },
            { value: '30', label: 'Next month' },
            { value: 'custom', label: 'Custom date' }
          ],
          required: true
        }
      ]
    },
    export: {
      title: 'Export Sessions',
      description: 'Export selected sessions to file',
      icon: <Download />,
      color: '#06b6d4',
      confirmationText: 'Export all selected sessions?',
      warningLevel: 'low',
      reversible: false,
      requiresInput: true,
      inputFields: [
        {
          key: 'format',
          label: 'Export Format',
          type: 'select',
          options: [
            { value: 'csv', label: 'CSV (Excel Compatible)' },
            { value: 'pdf', label: 'PDF Report' },
            { value: 'json', label: 'JSON Data' }
          ],
          required: true
        },
        {
          key: 'includeDetails',
          label: 'Include Client Details',
          type: 'select',
          options: [
            { value: 'yes', label: 'Yes, include client info' },
            { value: 'no', label: 'Sessions only' }
          ],
          required: true
        }
      ]
    }
  };

  const currentConfig = actionConfigs[action];

  // Steps for the multi-step process
  const steps = [
    'Review Selection',
    ...(currentConfig.requiresInput ? ['Configure Action'] : []),
    'Confirm & Execute',
    'Results'
  ];

  // Calculate session statistics
  const sessionStats = useMemo(() => {
    const byStatus = selectedSessions.reduce((acc, session) => {
      acc[session.status] = (acc[session.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byTrainer = selectedSessions.reduce((acc, session) => {
      const trainerName = session.trainer ?
        `${session.trainer.firstName} ${session.trainer.lastName}` :
        'Unassigned';
      acc[trainerName] = (acc[trainerName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { byStatus, byTrainer };
  }, [selectedSessions]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setProcessing(false);
      setPaused(false);
      setResults([]);
      setProgress(0);
      setActionInputs({});
      setShowDetails(false);
      setPreviewExpanded(true);
    }
  }, [open, action]);

  // Validate inputs
  const inputsValid = useMemo(() => {
    if (!currentConfig.requiresInput) return true;

    return currentConfig.inputFields?.every(field => {
      if (!field.required) return true;
      const value = actionInputs[field.key];
      if (field.key === 'confirmation' && field.label.includes('DELETE')) {
        return value === 'DELETE';
      }
      return value && value.trim() !== '';
    }) || false;
  }, [currentConfig, actionInputs]);

  // Execute bulk action
  const executeBulkAction = async () => {
    setProcessing(true);
    setActiveStep(2);
    const newResults: BulkActionResult[] = [];

    try {
      for (let i = 0; i < selectedSessions.length; i++) {
        if (paused) {
          await new Promise(resolve => {
            const checkPause = () => {
              if (!paused) resolve(undefined);
              else setTimeout(checkPause, 100);
            };
            checkPause();
          });
        }

        const session = selectedSessions[i];

        try {
          let result: any;

          switch (action) {
            case 'confirm':
              result = await sessionService.updateSession(session.id, { status: 'confirmed' });
              break;
            case 'cancel':
              result = await sessionService.cancelSession(session.id, {
                reason: actionInputs.reason,
                notifyClient: actionInputs.notifyClients !== 'none'
              });
              break;
            case 'delete':
              result = await sessionService.deleteSession(session.id);
              break;
            case 'reassign':
              result = await sessionService.reassignSession(session.id, {
                newTrainerId: actionInputs.newTrainerId,
                notifyClient: actionInputs.notifyClients === 'yes'
              });
              break;
            case 'reschedule':
              const offsetMinutes = parseInt(actionInputs.timeOffset);
              const newDate = new Date(session.start.getTime() + offsetMinutes * 60000);
              result = await sessionService.updateSession(session.id, {
                sessionDate: newDate.toISOString()
              });
              break;
            case 'duplicate':
              const dayOffset = parseInt(actionInputs.dateOffset);
              const duplicateDate = new Date(session.start.getTime() + dayOffset * 24 * 60 * 60 * 1000);
              result = await sessionService.createSession({
                sessionDate: duplicateDate.toISOString(),
                duration: session.duration,
                userId: session.userId,
                trainerId: session.trainerId,
                location: session.location,
                notes: session.notes,
                status: 'available'
              });
              break;
            case 'export':
              // Export would be handled differently, creating a file
              result = { exported: true };
              break;
            default:
              throw new Error(`Unknown action: ${action}`);
          }

          newResults.push({
            sessionId: session.id,
            success: true,
            originalData: session
          });

        } catch (error: any) {
          newResults.push({
            sessionId: session.id,
            success: false,
            error: error.message || 'Unknown error',
            originalData: session
          });
        }

        setProgress(((i + 1) / selectedSessions.length) * 100);
        setResults([...newResults]);

        // Small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setActiveStep(3);
      onActionComplete(newResults);

      const successCount = newResults.filter(r => r.success).length;
      const failureCount = newResults.length - successCount;

      if (failureCount === 0) {
        toast({
          title: 'Bulk Action Completed',
          description: `Successfully ${action}ed ${successCount} sessions`,
          variant: 'default'
        });
      } else {
        toast({
          title: 'Bulk Action Completed with Errors',
          description: `${successCount} succeeded, ${failureCount} failed`,
          variant: 'destructive'
        });
      }

    } catch (error: any) {
      console.error('Bulk action failed:', error);
      toast({
        title: 'Bulk Action Failed',
        description: error.message || 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  // Handle input changes
  const handleInputChange = (key: string, value: any) => {
    setActionInputs(prev => ({ ...prev, [key]: value }));
  };

  // Alert severity helper
  const getAlertSeverity = (level: 'low' | 'medium' | 'high'): 'error' | 'warning' | 'info' => {
    if (level === 'high') return 'error';
    if (level === 'medium') return 'warning';
    return 'info';
  };

  const getAlertIcon = (severity: 'error' | 'warning' | 'info') => {
    if (severity === 'error') return <AlertCircle size={18} color={alertColorMap.error.icon} />;
    if (severity === 'warning') return <AlertTriangle size={18} color={alertColorMap.warning.icon} />;
    return <Info size={18} color={alertColorMap.info.icon} />;
  };

  // Render step content
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Review Selection
        return (
          <div>
            <SectionTitle>
              Selected Sessions ({selectedSessions.length})
            </SectionTitle>

            <GridRow $cols={2} $gap={16} style={{ marginBottom: 16 }}>
              <CardSurface>
                <SubTitle>By Status</SubTitle>
                {Object.entries(sessionStats.byStatus).map(([status, count]) => (
                  <FlexRow key={status} $justify="space-between" $mb={6}>
                    <BodyText $capitalize>{status}</BodyText>
                    <StyledChip>{count}</StyledChip>
                  </FlexRow>
                ))}
              </CardSurface>

              <CardSurface>
                <SubTitle>By Trainer</SubTitle>
                {Object.entries(sessionStats.byTrainer).map(([trainer, count]) => (
                  <FlexRow key={trainer} $justify="space-between" $mb={6}>
                    <BodyText>{trainer}</BodyText>
                    <StyledChip>{count}</StyledChip>
                  </FlexRow>
                ))}
              </CardSurface>
            </GridRow>

            <ToggleWrapper>
              <HiddenCheckbox
                type="checkbox"
                checked={previewExpanded}
                onChange={(e) => setPreviewExpanded(e.target.checked)}
              />
              <ToggleTrack $checked={previewExpanded}>
                <ToggleKnob $checked={previewExpanded} />
              </ToggleTrack>
              Show session details
            </ToggleWrapper>

            <CollapsibleContent $open={previewExpanded}>
              <TableWrapper>
                <StyledTable>
                  <THead>
                    <tr>
                      <Th>Date &amp; Time</Th>
                      <Th>Client</Th>
                      <Th>Trainer</Th>
                      <Th>Status</Th>
                      <Th>Location</Th>
                    </tr>
                  </THead>
                  <tbody>
                    {selectedSessions.map((session) => (
                      <tr key={session.id}>
                        <Td>
                          {session.start.toLocaleDateString()} {session.start.toLocaleTimeString()}
                        </Td>
                        <Td>
                          {session.client ?
                            `${session.client.firstName} ${session.client.lastName}` :
                            'Available'
                          }
                        </Td>
                        <Td>
                          {session.trainer ?
                            `${session.trainer.firstName} ${session.trainer.lastName}` :
                            'Unassigned'
                          }
                        </Td>
                        <Td>
                          <StyledChip $outlined>
                            {session.status}
                          </StyledChip>
                        </Td>
                        <Td>{session.location}</Td>
                      </tr>
                    ))}
                  </tbody>
                </StyledTable>
              </TableWrapper>
            </CollapsibleContent>
          </div>
        );

      case 1: // Configure Action (if needed)
        if (!currentConfig.requiresInput) return null;

        return (
          <div>
            <SectionTitle>
              Configure {currentConfig.title}
            </SectionTitle>

            <GridRow $cols={2} $gap={20}>
              {currentConfig.inputFields?.map((field) => (
                <FormGroup key={field.key}>
                  <FormLabel>{field.label}</FormLabel>
                  {field.type === 'select' ? (
                    <StyledSelect
                      value={actionInputs[field.key] || ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                    >
                      <option value="" disabled>Select...</option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </StyledSelect>
                  ) : (
                    <StyledInput
                      type={field.type}
                      placeholder={field.label}
                      value={actionInputs[field.key] || ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      required={field.required}
                    />
                  )}
                </FormGroup>
              ))}
            </GridRow>
          </div>
        );

      case 2: // Confirm & Execute
        const severity = getAlertSeverity(currentConfig.warningLevel);

        return (
          <div>
            <SectionTitle>
              {processing ? 'Processing...' : 'Ready to Execute'}
            </SectionTitle>

            <AlertBox $severity={severity}>
              {getAlertIcon(severity)}
              <span>{currentConfig.confirmationText}</span>
            </AlertBox>

            {processing && (
              <div style={{ marginBottom: 20 }}>
                <FlexRow $justify="space-between" $mb={8}>
                  <BodyText>
                    Progress: {Math.round(progress)}%
                  </BodyText>
                  <BodyText>
                    {results.filter(r => r.success).length} / {selectedSessions.length} completed
                  </BodyText>
                </FlexRow>
                <ProgressBarOuter>
                  <ProgressBarInner $value={progress} $color={currentConfig.color} />
                </ProgressBarOuter>

                <FlexRow $gap={8} style={{ marginTop: 12 }}>
                  <SmallButton onClick={() => setPaused(!paused)}>
                    {paused ? <Play size={16} /> : <Pause size={16} />}
                    {paused ? 'Resume' : 'Pause'}
                  </SmallButton>

                  <SmallButton onClick={() => setProcessing(false)}>
                    <Square size={16} />
                    Stop
                  </SmallButton>
                </FlexRow>
              </div>
            )}

            {results.length > 0 && (
              <ToggleWrapper>
                <HiddenCheckbox
                  type="checkbox"
                  checked={showDetails}
                  onChange={(e) => setShowDetails(e.target.checked)}
                />
                <ToggleTrack $checked={showDetails}>
                  <ToggleKnob $checked={showDetails} />
                </ToggleTrack>
                Show detailed results
              </ToggleWrapper>
            )}

            <CollapsibleContent $open={showDetails}>
              <StyledList $maxHeight={200}>
                {results.map((result, index) => {
                  const session = selectedSessions.find(s => s.id === result.sessionId);
                  return (
                    <StyledListItem key={result.sessionId}>
                      {result.success ?
                        <CheckCircle size={20} color="#22c55e" /> :
                        <XCircle size={20} color="#ef4444" />
                      }
                      <ListItemBody>
                        <ListItemPrimary>{session?.title || `Session ${index + 1}`}</ListItemPrimary>
                        <ListItemSecondary>{result.success ? 'Completed' : result.error}</ListItemSecondary>
                      </ListItemBody>
                    </StyledListItem>
                  );
                })}
              </StyledList>
            </CollapsibleContent>
          </div>
        );

      case 3: // Results
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;

        return (
          <div>
            <SectionTitle>
              Action Results
            </SectionTitle>

            <GridRow $cols={2} $gap={16} style={{ marginBottom: 20 }}>
              <CardSurface $bg="rgba(34,197,94,0.1)">
                <BigNumber $color="#22c55e">{successCount}</BigNumber>
                <BodyText style={{ display: 'block', textAlign: 'center' }}>Successful</BodyText>
              </CardSurface>

              <CardSurface $bg="rgba(239,68,68,0.1)">
                <BigNumber $color="#ef4444">{failureCount}</BigNumber>
                <BodyText style={{ display: 'block', textAlign: 'center' }}>Failed</BodyText>
              </CardSurface>
            </GridRow>

            {failureCount > 0 && (
              <AlertBox $severity="warning">
                <AlertTriangle size={18} color={alertColorMap.warning.icon} />
                <span>Some sessions could not be processed. Review the details below.</span>
              </AlertBox>
            )}

            <StyledList $maxHeight={300}>
              {results.map((result, index) => {
                const session = selectedSessions.find(s => s.id === result.sessionId);
                return (
                  <StyledListItem key={result.sessionId}>
                    {result.success ?
                      <CheckCircle size={20} color="#22c55e" /> :
                      <XCircle size={20} color="#ef4444" />
                    }
                    <ListItemBody>
                      <ListItemPrimary>{session?.title || `Session ${index + 1}`}</ListItemPrimary>
                      <ListItemSecondary>
                        {result.success ?
                          `Successfully ${action}ed` :
                          `Failed: ${result.error}`
                        }
                      </ListItemSecondary>
                    </ListItemBody>
                    {result.success && currentConfig.reversible && onUndo && (
                      <UndoButton
                        title="Undo this action"
                        onClick={() => onUndo(result.sessionId)}
                      >
                        <RotateCcw size={16} />
                      </UndoButton>
                    )}
                  </StyledListItem>
                );
              })}
            </StyledList>
          </div>
        );

      default:
        return null;
    }
  };

  // Helper: resolve step state for stepper
  const getStepState = (index: number): 'active' | 'completed' | 'pending' => {
    if (index < activeStep) return 'completed';
    if (index === activeStep) return 'active';
    return 'pending';
  };

  if (!open) return null;

  return (
    <ModalOverlay onClick={(e) => { if (e.target === e.currentTarget && !processing) onClose(); }}>
      <ModalPanel>
        <ModalHeader $accentColor={currentConfig.color}>
          {currentConfig.icon}
          {currentConfig.title}
          <StyledChip style={{ marginLeft: 'auto' }}>
            {selectedSessions.length} sessions
          </StyledChip>
        </ModalHeader>

        <ModalBody>
          <StepperContainer>
            {steps.map((label, index) => {
              const state = getStepState(index);
              return (
                <React.Fragment key={label}>
                  <StepRow>
                    <StepIndicatorColumn>
                      <StepCircle $state={state}>
                        {state === 'completed' ? <CheckCircle size={16} /> : index + 1}
                      </StepCircle>
                      {index < steps.length - 1 && (
                        <StepLine $completed={index < activeStep} />
                      )}
                    </StepIndicatorColumn>
                    <div style={{ flex: 1 }}>
                      <StepLabelText $state={state}>{label}</StepLabelText>
                      {index === activeStep && (
                        <StepContentArea>
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.3 }}
                            >
                              {renderStepContent(index)}
                            </motion.div>
                          </AnimatePresence>
                        </StepContentArea>
                      )}
                    </div>
                  </StepRow>
                </React.Fragment>
              );
            })}
          </StepperContainer>
        </ModalBody>

        <ModalFooter>
          <GhostButton
            onClick={onClose}
            $disabled={processing}
            disabled={processing}
          >
            {activeStep === steps.length - 1 ? 'Close' : 'Cancel'}
          </GhostButton>

          {activeStep > 0 && activeStep < steps.length - 1 && (
            <GhostButton
              onClick={() => setActiveStep(prev => prev - 1)}
              $disabled={processing}
              disabled={processing}
            >
              Back
            </GhostButton>
          )}

          {activeStep < steps.length - 2 && (
            <GlowButton
              text="Next"
              variant="primary"
              onClick={() => setActiveStep(prev => prev + 1)}
              disabled={processing || (activeStep === 1 && !inputsValid)}
            />
          )}

          {activeStep === steps.length - 2 && !processing && (
            <GlowButton
              text={`${currentConfig.title} (${selectedSessions.length})`}
              variant={currentConfig.warningLevel === 'high' ? 'ruby' :
                       currentConfig.warningLevel === 'medium' ? 'cosmic' : 'emerald'}
              leftIcon={currentConfig.icon}
              onClick={executeBulkAction}
              disabled={currentConfig.requiresInput && !inputsValid}
            />
          )}
        </ModalFooter>
      </ModalPanel>
    </ModalOverlay>
  );
};

export default BulkActionsConfirmationDialog;
