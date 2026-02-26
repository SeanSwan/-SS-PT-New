/**
 * WorkoutCopilotPanel
 * ===================
 * Coach Copilot UI for AI-powered workout generation + approval.
 * State machine: IDLE -> GENERATING -> DRAFT_REVIEW | DEGRADED | ERROR -> APPROVING -> SAVED
 *
 * Architecture: styled-components + lucide-react (zero MUI)
 * Theme: Galaxy-Swan (cosmic dark, cyan accents, glass surfaces)
 * Touch targets: 44px minimum on all interactive elements
 *
 * Phase 5B -- Smart Workout Logger MVP Coach Copilot
 */

import React, { useState, useCallback, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  X, Sparkles, Save, AlertTriangle, ChevronDown, ChevronRight,
  Plus, Trash2, RotateCcw, Shield, Brain, Info, CheckCircle2,
  Loader2, FileWarning, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../hooks/use-toast';
import {
  createAiWorkoutService,
  isDegraded,
  isDraftSuccess,
  type WorkoutPlan,
  type WorkoutDay,
  type Exercise,
  type DraftSuccessResponse,
  type DegradedResponse,
  type Explainability,
  type SafetyConstraints,
  type ExerciseRecommendation,
  type ValidationError,
  type TemplateSuggestion,
} from '../../../../../services/aiWorkoutService';

// ── Theme Tokens ──────────────────────────────────────────────────────────

const SWAN_CYAN = '#00FFFF';
const GALAXY_CORE = '#0a0a1a';

// ── State Machine ─────────────────────────────────────────────────────────

type CopilotState =
  | 'idle'
  | 'generating'
  | 'draft_review'
  | 'degraded'
  | 'error'
  | 'approving'
  | 'saved'
  | 'approve_error';

// ── Animations ────────────────────────────────────────────────────────────

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ── Styled Components ─────────────────────────────────────────────────────

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
`;

const ModalPanel = styled.div`
  background: rgba(29, 31, 43, 0.98);
  border-radius: 12px;
  max-width: 900px;
  width: 95%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 255, 255, 0.2);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #252742;
  border-radius: 12px 12px 0 0;
  flex-shrink: 0;
`;

const ModalTitle = styled.h2`
  color: ${SWAN_CYAN};
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  background: transparent;
  border: none;
  color: #e2e8f0;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.08); }
`;

const ModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 1.5rem;
  min-height: 44px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  border: none;
  background: linear-gradient(135deg, ${SWAN_CYAN}, #00aadd);
  color: ${GALAXY_CORE};
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 18px rgba(0, 255, 255, 0.35);
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(0, 255, 255, 0.5);
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const SecondaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 1.5rem;
  min-height: 44px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.08); }
`;

const Spinner = styled(Loader2)`
  animation: ${spin} 0.6s linear infinite;
`;

const Input = styled.input`
  padding: 10px 14px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  font-size: 0.95rem;
  transition: border-color 0.2s;
  &:focus {
    outline: none;
    border-color: ${SWAN_CYAN};
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.15);
  }
  &::placeholder { color: rgba(255, 255, 255, 0.3); }
`;

const TextArea = styled.textarea`
  padding: 10px 14px;
  min-height: 80px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  font-size: 0.95rem;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;
  &:focus {
    outline: none;
    border-color: ${SWAN_CYAN};
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.15);
  }
  &::placeholder { color: rgba(255, 255, 255, 0.3); }
`;

const FormGroup = styled.div<{ $fullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  ${(props) => props.$fullWidth && 'grid-column: 1 / -1;'}
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`;

const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  color: #94a3b8;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin: 20px 0;
`;

const InfoPanel = styled.div<{ $variant?: 'info' | 'warning' | 'error' | 'success' }>`
  padding: 14px 16px;
  border-radius: 10px;
  margin-bottom: 16px;
  animation: ${fadeIn} 0.3s ease;
  display: flex;
  gap: 12px;
  align-items: flex-start;

  ${(props) => {
    switch (props.$variant) {
      case 'warning': return `background: rgba(255, 170, 0, 0.08); border: 1px solid rgba(255, 170, 0, 0.25); color: #ffaa00;`;
      case 'error': return `background: rgba(255, 50, 50, 0.08); border: 1px solid rgba(255, 50, 50, 0.25); color: #ff6b6b;`;
      case 'success': return `background: rgba(0, 255, 100, 0.08); border: 1px solid rgba(0, 255, 100, 0.25); color: #00ff64;`;
      default: return `background: rgba(0, 255, 255, 0.06); border: 1px solid rgba(0, 255, 255, 0.2); color: #94a3b8;`;
    }
  }}
`;

const InfoContent = styled.div`
  flex: 1;
  font-size: 0.9rem;
  line-height: 1.5;
`;

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
`;

const Badge = styled.span<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  background: ${(p) => p.$color ? `${p.$color}15` : 'rgba(0, 255, 255, 0.1)'};
  color: ${(p) => p.$color || SWAN_CYAN};
  border: 1px solid ${(p) => p.$color ? `${p.$color}40` : 'rgba(0, 255, 255, 0.25)'};
`;

const ExerciseCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
`;

const ExerciseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const DaySection = styled.div`
  margin-bottom: 20px;
`;

const DayHeader = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid rgba(0, 255, 255, 0.15);
  background: rgba(0, 255, 255, 0.04);
  color: #e2e8f0;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  &:hover { background: rgba(0, 255, 255, 0.08); }
`;

const DayContent = styled.div`
  padding: 12px 0 0 16px;
`;

const SmallInput = styled(Input)`
  min-height: 40px;
  padding: 6px 10px;
  font-size: 0.9rem;
`;

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 255, 0.3);
  background: rgba(0, 255, 255, 0.06);
  color: ${SWAN_CYAN};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: rgba(0, 255, 255, 0.12);
    border-color: ${SWAN_CYAN};
  }
`;

const RemoveButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 50, 50, 0.08);
  color: #ff6b6b;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(255, 50, 50, 0.2); }
`;

const CenterContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  gap: 16px;
`;

const TemplateList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 500px;
`;

const TemplateItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: #e2e8f0;
  font-size: 0.9rem;
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ExplainabilityGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`;

const ExplainCard = styled.div`
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
`;

const ExplainLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
`;

const ExplainValue = styled.div`
  font-size: 0.88rem;
  color: #cbd5e1;
  line-height: 1.4;
`;

// ── Props ─────────────────────────────────────────────────────────────────

interface WorkoutCopilotPanelProps {
  open: boolean;
  onClose: () => void;
  clientId: number;
  clientName: string;
  onSuccess?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────

const WorkoutCopilotPanel: React.FC<WorkoutCopilotPanelProps> = ({
  open,
  onClose,
  clientId,
  clientName,
  onSuccess,
}) => {
  const { authAxios } = useAuth();
  const { toast } = useToast();
  const service = createAiWorkoutService(authAxios);

  // ── State Machine ───────────────────────────────────────────
  const [state, setState] = useState<CopilotState>('idle');

  // ── Draft data ──────────────────────────────────────────────
  const [editedPlan, setEditedPlan] = useState<WorkoutPlan | null>(null);
  const [explainability, setExplainability] = useState<Explainability | null>(null);
  const [safetyConstraints, setSafetyConstraints] = useState<SafetyConstraints | null>(null);
  const [exerciseRecs, setExerciseRecs] = useState<ExerciseRecommendation[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [missingInputs, setMissingInputs] = useState<string[]>([]);
  const [generationMode, setGenerationMode] = useState<string>('');
  const [auditLogId, setAuditLogId] = useState<number | null>(null);
  const [trainerNotes, setTrainerNotes] = useState('');

  // ── Degraded data ───────────────────────────────────────────
  const [degradedData, setDegradedData] = useState<DegradedResponse | null>(null);

  // ── Saved data ──────────────────────────────────────────────
  const [savedPlanId, setSavedPlanId] = useState<number | null>(null);
  const [unmatchedExercises, setUnmatchedExercises] = useState<Array<{ dayNumber: number; name: string }>>([]);
  const [validationWarnings, setValidationWarnings] = useState<ValidationError[]>([]);

  // ── Error data ──────────────────────────────────────────────
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [approveErrors, setApproveErrors] = useState<ValidationError[]>([]);

  // ── Expanded days ───────────────────────────────────────────
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  // ── Double-submit guard ─────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setState('idle');
      setEditedPlan(null);
      setExplainability(null);
      setSafetyConstraints(null);
      setExerciseRecs([]);
      setWarnings([]);
      setMissingInputs([]);
      setGenerationMode('');
      setAuditLogId(null);
      setTrainerNotes('');
      setDegradedData(null);
      setSavedPlanId(null);
      setUnmatchedExercises([]);
      setValidationWarnings([]);
      setErrorMessage('');
      setErrorCode('');
      setApproveErrors([]);
      setExpandedDays(new Set());
      setIsSubmitting(false);
    }
  }, [open]);

  // ── Generate draft ──────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setState('generating');
    setErrorMessage('');
    setErrorCode('');

    try {
      const resp = await service.generateDraft(clientId);

      if (isDegraded(resp)) {
        setDegradedData(resp);
        setState('degraded');
      } else if (isDraftSuccess(resp)) {
        setEditedPlan(resp.plan);
        setExplainability(resp.explainability);
        setSafetyConstraints(resp.safetyConstraints);
        setExerciseRecs(resp.exerciseRecommendations);
        setWarnings(resp.warnings);
        setMissingInputs(resp.missingInputs);
        setGenerationMode(resp.generationMode);
        setAuditLogId(resp.auditLogId);
        // Auto-expand first day
        if (resp.plan.days.length > 0) {
          setExpandedDays(new Set([0]));
        }
        setState('draft_review');
      }
    } catch (err: any) {
      const data = err?.response?.data;
      setErrorMessage(data?.message || err.message || 'Failed to generate workout plan');
      setErrorCode(data?.code || '');
      setState('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [clientId, isSubmitting, service]);

  // ── Approve draft ───────────────────────────────────────────

  const handleApprove = useCallback(async () => {
    if (isSubmitting || !editedPlan) return;
    setIsSubmitting(true);
    setState('approving');
    setApproveErrors([]);

    try {
      const resp = await service.approveDraft({
        userId: clientId,
        plan: editedPlan,
        auditLogId,
        trainerNotes: trainerNotes.trim() || undefined,
      });

      setSavedPlanId(resp.planId);
      setUnmatchedExercises(resp.unmatchedExercises);
      setValidationWarnings(resp.validationWarnings);
      setState('saved');

      toast({
        title: 'Workout Plan Approved',
        description: `Plan saved (ID: ${resp.planId}) for ${clientName}`,
        variant: 'default',
      });

      onSuccess?.();
    } catch (err: any) {
      const data = err?.response?.data;
      setErrorMessage(data?.message || 'Failed to approve plan');
      setErrorCode(data?.code || '');
      setApproveErrors(data?.errors || []);
      setState('approve_error');
    } finally {
      setIsSubmitting(false);
    }
  }, [clientId, editedPlan, auditLogId, trainerNotes, isSubmitting, clientName, service, toast, onSuccess]);

  // ── Plan editing helpers ────────────────────────────────────

  const updatePlanField = (field: keyof WorkoutPlan, value: any) => {
    if (!editedPlan) return;
    setEditedPlan({ ...editedPlan, [field]: value });
  };

  const updateDay = (dayIdx: number, field: keyof WorkoutDay, value: any) => {
    if (!editedPlan) return;
    const days = [...editedPlan.days];
    days[dayIdx] = { ...days[dayIdx], [field]: value };
    setEditedPlan({ ...editedPlan, days });
  };

  const updateExercise = (dayIdx: number, exIdx: number, field: keyof Exercise, value: any) => {
    if (!editedPlan) return;
    const days = [...editedPlan.days];
    const exercises = [...days[dayIdx].exercises];
    exercises[exIdx] = { ...exercises[exIdx], [field]: value };
    days[dayIdx] = { ...days[dayIdx], exercises };
    setEditedPlan({ ...editedPlan, days });
  };

  const addExercise = (dayIdx: number) => {
    if (!editedPlan) return;
    const days = [...editedPlan.days];
    const exercises = [...days[dayIdx].exercises, { name: '', setScheme: '', repGoal: '', restPeriod: 60 }];
    days[dayIdx] = { ...days[dayIdx], exercises };
    setEditedPlan({ ...editedPlan, days });
  };

  const removeExercise = (dayIdx: number, exIdx: number) => {
    if (!editedPlan) return;
    const days = [...editedPlan.days];
    const exercises = days[dayIdx].exercises.filter((_, i) => i !== exIdx);
    days[dayIdx] = { ...days[dayIdx], exercises };
    setEditedPlan({ ...editedPlan, days });
  };

  const toggleDay = (dayIdx: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      next.has(dayIdx) ? next.delete(dayIdx) : next.add(dayIdx);
      return next;
    });
  };

  // ── Error classification ────────────────────────────────────

  const isConsentError = errorCode?.startsWith('AI_CONSENT');
  const isRetryable = ['AI_RATE_LIMITED', 'AI_PII_LEAK', 'AI_PARSE_ERROR', 'AI_VALIDATION_ERROR'].includes(errorCode);

  // ── Render ──────────────────────────────────────────────────

  if (!open) return null;

  return (
    <ModalOverlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <ModalPanel onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <Sparkles size={20} />
            AI Workout Copilot - {clientName}
          </ModalTitle>
          <CloseButton onClick={onClose}><X size={20} /></CloseButton>
        </ModalHeader>

        <ModalBody>
          {/* ── IDLE state ──────────────────────────────────── */}
          {state === 'idle' && (
            <CenterContent>
              <Sparkles size={48} color={SWAN_CYAN} />
              <h3 style={{ color: '#e2e8f0', margin: 0 }}>Generate AI Workout Plan</h3>
              <p style={{ color: '#94a3b8', margin: 0, maxWidth: 400 }}>
                The AI will analyze {clientName}'s profile, training history, and NASM assessment
                to generate a personalized workout plan for your review.
              </p>
              <PrimaryButton onClick={handleGenerate} disabled={isSubmitting}>
                <Sparkles size={16} />
                Generate Draft
              </PrimaryButton>
            </CenterContent>
          )}

          {/* ── GENERATING state ────────────────────────────── */}
          {state === 'generating' && (
            <CenterContent>
              <Spinner size={48} color={SWAN_CYAN} />
              <h3 style={{ color: '#e2e8f0', margin: 0 }}>Generating Workout Plan...</h3>
              <p style={{ color: '#94a3b8', margin: 0 }}>
                Analyzing client profile, training history, and NASM constraints.
                This may take 10-30 seconds.
              </p>
            </CenterContent>
          )}

          {/* ── ERROR state ─────────────────────────────────── */}
          {(state === 'error' || state === 'approve_error') && (
            <CenterContent>
              <AlertTriangle size={48} color="#ff6b6b" />
              <h3 style={{ color: '#ff6b6b', margin: 0 }}>
                {state === 'approve_error' ? 'Approval Failed' : 'Generation Failed'}
              </h3>
              <p style={{ color: '#94a3b8', margin: 0, maxWidth: 500 }}>{errorMessage}</p>

              {/* Field-level errors for 422 */}
              {approveErrors.length > 0 && (
                <div style={{ width: '100%', maxWidth: 500 }}>
                  {approveErrors.map((e, i) => (
                    <InfoPanel key={i} $variant="error">
                      <FileWarning size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                      <InfoContent>
                        <strong>{e.field || e.code}:</strong> {e.message}
                      </InfoContent>
                    </InfoPanel>
                  ))}
                </div>
              )}

              {isConsentError && (
                <InfoPanel $variant="warning">
                  <Shield size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <InfoContent>
                    AI consent is required. Please ask the client to enable AI features
                    in their account settings.
                  </InfoContent>
                </InfoPanel>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                {isRetryable && (
                  <PrimaryButton onClick={handleGenerate} disabled={isSubmitting}>
                    <RefreshCw size={16} />
                    Retry
                  </PrimaryButton>
                )}
                {state === 'approve_error' && editedPlan && (
                  <SecondaryButton onClick={() => setState('draft_review')}>
                    Back to Editor
                  </SecondaryButton>
                )}
                <SecondaryButton onClick={onClose}>Close</SecondaryButton>
              </div>
            </CenterContent>
          )}

          {/* ── DEGRADED state ──────────────────────────────── */}
          {state === 'degraded' && degradedData && (
            <CenterContent>
              <AlertTriangle size={48} color="#ffaa00" />
              <h3 style={{ color: '#ffaa00', margin: 0 }}>AI Temporarily Unavailable</h3>
              <p style={{ color: '#94a3b8', margin: 0, maxWidth: 500 }}>
                {degradedData.message}
              </p>

              {degradedData.fallback.reasons.length > 0 && (
                <InfoPanel $variant="warning">
                  <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <InfoContent>
                    {degradedData.fallback.reasons.map((r, i) => (
                      <div key={i}>{r}</div>
                    ))}
                  </InfoContent>
                </InfoPanel>
              )}

              {degradedData.fallback.templateSuggestions.length > 0 && (
                <>
                  <SectionTitle>Available Templates (Manual Mode)</SectionTitle>
                  <TemplateList>
                    {degradedData.fallback.templateSuggestions.map((t) => (
                      <TemplateItem key={t.id}>
                        <Badge $color="#ffaa00">{t.category}</Badge>
                        <span>{t.label}</span>
                      </TemplateItem>
                    ))}
                  </TemplateList>
                </>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <PrimaryButton onClick={handleGenerate} disabled={isSubmitting}>
                  <RefreshCw size={16} />
                  Retry AI Generation
                </PrimaryButton>
                <SecondaryButton onClick={onClose}>Close</SecondaryButton>
              </div>
            </CenterContent>
          )}

          {/* ── DRAFT_REVIEW state ──────────────────────────── */}
          {(state === 'draft_review' || state === 'approving') && editedPlan && (
            <>
              {/* Safety constraints */}
              {safetyConstraints && (
                <BadgeRow>
                  {safetyConstraints.medicalClearanceRequired && (
                    <Badge $color="#ff6b6b">
                      <Shield size={12} /> Medical Clearance Required
                    </Badge>
                  )}
                  <Badge>
                    Max Intensity: {safetyConstraints.maxIntensityPct}%
                  </Badge>
                  {safetyConstraints.movementRestrictions.map((r, i) => (
                    <Badge key={i} $color="#ffaa00">{r}</Badge>
                  ))}
                  <Badge $color="#00ff64">{generationMode.replace(/_/g, ' ')}</Badge>
                </BadgeRow>
              )}

              {/* Warnings */}
              {warnings.length > 0 && (
                <InfoPanel $variant="warning">
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <InfoContent>
                    {warnings.map((w, i) => <div key={i}>{w}</div>)}
                  </InfoContent>
                </InfoPanel>
              )}

              {/* Missing inputs */}
              {missingInputs.length > 0 && (
                <InfoPanel $variant="info">
                  <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <InfoContent>
                    <strong>Missing data:</strong> {missingInputs.join(', ')}
                  </InfoContent>
                </InfoPanel>
              )}

              {/* Plan header (editable) */}
              <FormGrid>
                <FormGroup $fullWidth>
                  <Label>Plan Name</Label>
                  <Input
                    value={editedPlan.planName}
                    onChange={(e) => updatePlanField('planName', e.target.value)}
                    placeholder="Plan name"
                    maxLength={200}
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Duration (weeks)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={52}
                    value={editedPlan.durationWeeks}
                    onChange={(e) => updatePlanField('durationWeeks', parseInt(e.target.value) || 1)}
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Summary</Label>
                  <TextArea
                    value={editedPlan.summary || ''}
                    onChange={(e) => updatePlanField('summary', e.target.value)}
                    placeholder="Plan summary..."
                    maxLength={2000}
                  />
                </FormGroup>
              </FormGrid>

              <Divider />

              {/* Days (collapsible) */}
              <SectionTitle>Training Days ({editedPlan.days.length})</SectionTitle>
              {editedPlan.days.map((day, dayIdx) => (
                <DaySection key={dayIdx}>
                  <DayHeader onClick={() => toggleDay(dayIdx)}>
                    {expandedDays.has(dayIdx) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span>Day {day.dayNumber}: {day.name}</span>
                    <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: '0.85rem' }}>
                      {day.exercises.length} exercises
                    </span>
                  </DayHeader>

                  {expandedDays.has(dayIdx) && (
                    <DayContent>
                      <FormGrid>
                        <FormGroup>
                          <Label>Day Name</Label>
                          <SmallInput
                            value={day.name}
                            onChange={(e) => updateDay(dayIdx, 'name', e.target.value)}
                            maxLength={100}
                          />
                        </FormGroup>
                        <FormGroup>
                          <Label>Focus</Label>
                          <SmallInput
                            value={day.focus || ''}
                            onChange={(e) => updateDay(dayIdx, 'focus', e.target.value)}
                            placeholder="e.g. Chest, Shoulders"
                            maxLength={200}
                          />
                        </FormGroup>
                      </FormGrid>

                      {/* Exercises */}
                      {day.exercises.map((ex, exIdx) => (
                        <ExerciseCard key={exIdx}>
                          <ExerciseHeader>
                            <Label style={{ color: SWAN_CYAN, fontWeight: 700 }}>
                              Exercise {exIdx + 1}
                            </Label>
                            <RemoveButton onClick={() => removeExercise(dayIdx, exIdx)}>
                              <Trash2 size={14} />
                            </RemoveButton>
                          </ExerciseHeader>
                          <FormGrid>
                            <FormGroup>
                              <Label>Name</Label>
                              <SmallInput
                                value={ex.name}
                                onChange={(e) => updateExercise(dayIdx, exIdx, 'name', e.target.value)}
                                placeholder="Exercise name"
                                maxLength={200}
                              />
                            </FormGroup>
                            <FormGroup>
                              <Label>Sets x Reps</Label>
                              <SmallInput
                                value={ex.setScheme || ''}
                                onChange={(e) => updateExercise(dayIdx, exIdx, 'setScheme', e.target.value)}
                                placeholder="e.g. 4x8-10"
                                maxLength={100}
                              />
                            </FormGroup>
                            <FormGroup>
                              <Label>Rest (seconds)</Label>
                              <SmallInput
                                type="number"
                                min={0}
                                max={600}
                                value={ex.restPeriod ?? ''}
                                onChange={(e) => updateExercise(dayIdx, exIdx, 'restPeriod', e.target.value ? parseInt(e.target.value) : null)}
                              />
                            </FormGroup>
                            <FormGroup>
                              <Label>Tempo</Label>
                              <SmallInput
                                value={ex.tempo || ''}
                                onChange={(e) => updateExercise(dayIdx, exIdx, 'tempo', e.target.value)}
                                placeholder="e.g. 3-1-2-0"
                                maxLength={50}
                              />
                            </FormGroup>
                            <FormGroup $fullWidth>
                              <Label>Intensity Guideline</Label>
                              <SmallInput
                                value={ex.intensityGuideline || ''}
                                onChange={(e) => updateExercise(dayIdx, exIdx, 'intensityGuideline', e.target.value)}
                                placeholder="e.g. 75-80% 1RM"
                                maxLength={500}
                              />
                            </FormGroup>
                            <FormGroup $fullWidth>
                              <Label>Notes</Label>
                              <SmallInput
                                value={ex.notes || ''}
                                onChange={(e) => updateExercise(dayIdx, exIdx, 'notes', e.target.value)}
                                placeholder="Coach notes..."
                                maxLength={1000}
                              />
                            </FormGroup>
                          </FormGrid>
                        </ExerciseCard>
                      ))}
                      <AddButton onClick={() => addExercise(dayIdx)}>
                        <Plus size={14} /> Add Exercise
                      </AddButton>
                    </DayContent>
                  )}
                </DaySection>
              ))}

              <Divider />

              {/* Explainability panel (read-only) */}
              {explainability && (
                <>
                  <SectionTitle><Brain size={16} /> AI Explainability</SectionTitle>
                  <ExplainabilityGrid>
                    <ExplainCard>
                      <ExplainLabel>Data Sources</ExplainLabel>
                      <ExplainValue>
                        <BadgeRow>
                          {explainability.dataSources.map((s) => (
                            <Badge key={s}>{s.replace(/_/g, ' ')}</Badge>
                          ))}
                        </BadgeRow>
                      </ExplainValue>
                    </ExplainCard>
                    <ExplainCard>
                      <ExplainLabel>Data Quality</ExplainLabel>
                      <ExplainValue>{explainability.dataQuality}</ExplainValue>
                    </ExplainCard>
                    {explainability.phaseRationale && (
                      <ExplainCard style={{ gridColumn: '1 / -1' }}>
                        <ExplainLabel>Phase Rationale</ExplainLabel>
                        <ExplainValue>{explainability.phaseRationale}</ExplainValue>
                      </ExplainCard>
                    )}
                  </ExplainabilityGrid>
                </>
              )}

              {/* Exercise recommendations (read-only) */}
              {exerciseRecs.length > 0 && (
                <>
                  <Divider />
                  <SectionTitle>1RM Recommendations</SectionTitle>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          {['Exercise', 'Best', 'Est. 1RM', 'Load Range', 'Target'].map((h) => (
                            <th key={h} style={{ padding: '8px 12px', color: '#64748b', fontWeight: 600, textAlign: 'left' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {exerciseRecs.map((rec, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '8px 12px', color: '#e2e8f0' }}>{rec.exerciseName}</td>
                            <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{rec.bestWeight}lb x{rec.bestReps}</td>
                            <td style={{ padding: '8px 12px', color: SWAN_CYAN, fontWeight: 600 }}>{Math.round(rec.estimated1RM)}lb</td>
                            <td style={{ padding: '8px 12px', color: '#94a3b8' }}>
                              {rec.loadRecommendation ? `${Math.round(rec.loadRecommendation.minLoad)}-${Math.round(rec.loadRecommendation.maxLoad)}lb` : '--'}
                            </td>
                            <td style={{ padding: '8px 12px', color: '#94a3b8' }}>
                              {rec.loadRecommendation?.targetReps || '--'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <Divider />

              {/* Trainer notes */}
              <FormGroup $fullWidth>
                <Label>Coach Notes (optional)</Label>
                <TextArea
                  value={trainerNotes}
                  onChange={(e) => setTrainerNotes(e.target.value)}
                  placeholder="Rationale for edits, volume adjustments, etc."
                  rows={3}
                />
              </FormGroup>
            </>
          )}

          {/* ── SAVED state ─────────────────────────────────── */}
          {state === 'saved' && (
            <CenterContent>
              <CheckCircle2 size={48} color="#00ff64" />
              <h3 style={{ color: '#00ff64', margin: 0 }}>Plan Approved and Saved</h3>
              <p style={{ color: '#94a3b8', margin: 0 }}>
                Plan ID: <strong style={{ color: '#e2e8f0' }}>{savedPlanId}</strong> for {clientName}
              </p>

              {unmatchedExercises.length > 0 && (
                <InfoPanel $variant="warning">
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <InfoContent>
                    <strong>Unmatched exercises</strong> (not in library):
                    {unmatchedExercises.map((e, i) => (
                      <div key={i}>Day {e.dayNumber}: {e.name}</div>
                    ))}
                  </InfoContent>
                </InfoPanel>
              )}

              {validationWarnings.length > 0 && (
                <InfoPanel $variant="warning">
                  <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <InfoContent>
                    {validationWarnings.map((w, i) => (
                      <div key={i}>{w.message}</div>
                    ))}
                  </InfoContent>
                </InfoPanel>
              )}

              <SecondaryButton onClick={onClose}>Close</SecondaryButton>
            </CenterContent>
          )}
        </ModalBody>

        {/* Footer: only show approve button during draft review */}
        {(state === 'draft_review' || state === 'approving') && (
          <ModalFooter>
            <SecondaryButton onClick={() => { setState('idle'); setEditedPlan(null); }}>
              <RotateCcw size={16} />
              Regenerate
            </SecondaryButton>
            <PrimaryButton onClick={handleApprove} disabled={isSubmitting || state === 'approving'}>
              {state === 'approving' ? <Spinner size={16} /> : <Save size={16} />}
              {state === 'approving' ? 'Saving...' : 'Approve & Save'}
            </PrimaryButton>
          </ModalFooter>
        )}
      </ModalPanel>
    </ModalOverlay>
  );
};

export default WorkoutCopilotPanel;
