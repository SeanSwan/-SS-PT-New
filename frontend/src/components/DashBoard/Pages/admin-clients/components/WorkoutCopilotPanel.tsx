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
 *
 * TODO (follow-up): Extract styled components, editor, and explainability
 * into sub-modules to reduce monolith size (~1150 lines).
 */

import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import {
  X, Sparkles, Save, AlertTriangle, ChevronDown, ChevronRight,
  Plus, Trash2, RotateCcw, Shield, Brain, Info, CheckCircle2,
  FileWarning, RefreshCw,
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
  type TemplateEntry,
} from '../../../../../services/aiWorkoutService';
import LongHorizonContent from './LongHorizonContent';
import {
  SWAN_CYAN,
  ModalOverlay,
  ModalPanel,
  ModalHeader,
  ModalTitle,
  CloseButton,
  ModalBody,
  ModalFooter,
  PrimaryButton,
  SecondaryButton,
  AddButton,
  RemoveButton,
  Input,
  TextArea,
  SmallInput,
  FormGroup,
  FormGrid,
  Label,
  InfoPanel,
  InfoContent,
  Badge,
  BadgeRow,
  Divider,
  SectionTitle,
  CenterContent,
  Spinner,
  DaySection,
  DayHeader,
  DayContent,
  ExerciseCard,
  ExerciseHeader,
  TemplateList,
  TemplateItem,
  ExplainabilityGrid,
  ExplainCard,
  ExplainLabel,
  ExplainValue,
} from './copilot-shared-styles';

type CopilotState =
  | 'idle'
  | 'generating'
  | 'draft_review'
  | 'degraded'
  | 'error'
  | 'approving'
  | 'saved'
  | 'approve_error';

const TabBar = styled.div`
  display: flex;
  gap: 8px;
  padding: 10px 24px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const TabButton = styled.button<{ $active?: boolean }>`
  min-height: 40px;
  border: 1px solid ${({ $active }) => ($active ? SWAN_CYAN : 'rgba(255,255,255,0.15)')};
  border-bottom: none;
  border-radius: 10px 10px 0 0;
  padding: 8px 14px;
  color: ${({ $active }) => ($active ? SWAN_CYAN : '#cbd5e1')};
  background: ${({ $active }) => ($active ? 'rgba(0,255,255,0.08)' : 'rgba(255,255,255,0.02)')};
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
`;

const OverrideSection = styled.div`
  border: 1px solid rgba(251, 191, 36, 0.4);
  border-radius: 10px;
  padding: 12px;
  background: rgba(120, 53, 15, 0.18);
`;

const OverrideTextArea = styled(TextArea)<{ $required?: boolean }>`
  border-color: ${({ $required }) => ($required ? 'rgba(251, 191, 36, 0.7)' : 'rgba(255,255,255,0.15)')};
  box-shadow: ${({ $required }) => ($required ? '0 0 0 2px rgba(251,191,36,0.22)' : 'none')};
`;

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
  const { authAxios, user } = useAuth();
  const isAdmin = user?.role === 'admin';
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
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideReasonRequired, setOverrideReasonRequired] = useState(false);

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

  // ── Template catalog ──────────────────────────────────────────
  const [templates, setTemplates] = useState<TemplateEntry[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // ── Double-submit guard ─────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'long-horizon'>('single');
  const [lhFooterContent, setLhFooterContent] = useState<React.ReactNode | null>(null);

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
      setOverrideReason('');
      setOverrideReasonRequired(false);
      setDegradedData(null);
      setSavedPlanId(null);
      setUnmatchedExercises([]);
      setValidationWarnings([]);
      setErrorMessage('');
      setErrorCode('');
      setApproveErrors([]);
      setExpandedDays(new Set());
      setIsSubmitting(false);
      setActiveTab('single');
      setLhFooterContent(null);
      setTemplates([]);
      setTemplatesLoading(true);
      service.listTemplates()
        .then((resp) => { if (resp.success) setTemplates(resp.templates); })
        .catch(() => { /* silent -- templates are informational for coach awareness */ })
        .finally(() => setTemplatesLoading(false));
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
      const resp = await service.generateDraft(clientId, overrideReason.trim() || undefined);

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
      if (data?.code === 'MISSING_OVERRIDE_REASON') {
        if (overrideReasonRequired) {
          setErrorMessage(data?.message || 'Admin override requires a reason');
          setErrorCode(data?.code || '');
          setState('error');
          return;
        }
        setOverrideReasonRequired(true);
        setState('idle');
        return;
      }
      setErrorMessage(data?.message || err.message || 'Failed to generate workout plan');
      setErrorCode(data?.code || '');
      setState('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [clientId, isSubmitting, overrideReason, overrideReasonRequired, service]);

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
        overrideReason: overrideReason.trim() || undefined,
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
      if (data?.code === 'MISSING_OVERRIDE_REASON') {
        if (overrideReasonRequired) {
          setErrorMessage(data?.message || 'Admin override requires a reason');
          setErrorCode(data?.code || '');
          setState('approve_error');
          return;
        }
        setOverrideReasonRequired(true);
        setState('idle');
        return;
      }
      setErrorMessage(data?.message || 'Failed to approve plan');
      setErrorCode(data?.code || '');
      setApproveErrors(data?.errors || []);
      setState('approve_error');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    clientId,
    editedPlan,
    auditLogId,
    overrideReason,
    overrideReasonRequired,
    trainerNotes,
    isSubmitting,
    clientName,
    service,
    toast,
    onSuccess,
  ]);

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

  const isConsentError = errorCode?.startsWith('AI_CONSENT') || errorCode?.startsWith('AI_WAIVER');
  const isWaiverError = errorCode?.startsWith('AI_WAIVER');
  const isAssignmentError = errorCode === 'AI_ASSIGNMENT_DENIED';
  const isOverrideError = errorCode === 'MISSING_OVERRIDE_REASON';
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

        <TabBar>
          <TabButton
            type="button"
            $active={activeTab === 'single'}
            onClick={() => {
              setActiveTab('single');
              setLhFooterContent(null);
            }}
          >
            Single Workout
          </TabButton>
          <TabButton
            type="button"
            $active={activeTab === 'long-horizon'}
            onClick={() => setActiveTab('long-horizon')}
          >
            Long-Horizon
          </TabButton>
        </TabBar>

        <ModalBody>
          {activeTab === 'single' && (
            <>
          {/* ── IDLE state ──────────────────────────────────── */}
          {state === 'idle' && (
            <CenterContent>
              <Sparkles size={48} color={SWAN_CYAN} />
              <h3 style={{ color: '#e2e8f0', margin: 0 }}>Generate AI Workout Plan</h3>
              <p style={{ color: '#94a3b8', margin: 0, maxWidth: 400 }}>
                The AI will analyze {clientName}'s profile, training history, and NASM assessment
                to generate a personalized workout plan for your review.
              </p>

              {(isAdmin || overrideReasonRequired) && (
                <OverrideSection style={{ width: '100%', maxWidth: 500 }}>
                  <Label>Admin Override Reason {overrideReasonRequired ? '(required)' : '(optional)'}</Label>
                  <OverrideTextArea
                    $required={overrideReasonRequired}
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Provide justification when consent override is required"
                    rows={3}
                  />
                </OverrideSection>
              )}

              <PrimaryButton onClick={handleGenerate} disabled={isSubmitting}>
                <Sparkles size={16} />
                Generate Draft
              </PrimaryButton>

              {/* Template catalog (informational -- backend auto-selects from NASM constraints) */}
              {templatesLoading && (
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Loading templates...</p>
              )}
              {!templatesLoading && templates.length > 0 && (
                <>
                  <SectionTitle style={{ marginTop: 16 }}>
                    <Info size={16} /> Available NASM Templates
                  </SectionTitle>
                  <TemplateList>
                    {templates.map((t) => (
                      <TemplateItem key={t.id}>
                        <Badge>{t.nasmFramework}</Badge>
                        <span>{t.label}</span>
                        {t.tags.length > 0 && (
                          <span style={{ color: '#64748b', fontSize: '0.78rem', marginLeft: 'auto' }}>
                            {t.tags.join(', ')}
                          </span>
                        )}
                      </TemplateItem>
                    ))}
                  </TemplateList>
                  <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 8, maxWidth: 500 }}>
                    The AI automatically selects the best template based on {clientName}'s
                    NASM assessment and training goals.
                  </p>
                </>
              )}
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
                    {isWaiverError
                      ? 'This client\'s waiver consent is missing or outdated. The client must sign the current waiver before AI features can be used.'
                      : 'This client has not granted AI consent. The client must enable AI features from their own account settings before AI workout generation can be used.'}
                  </InfoContent>
                </InfoPanel>
              )}

              {isAssignmentError && (
                <InfoPanel $variant="warning">
                  <Shield size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <InfoContent>
                    You are not currently assigned to this client. Please contact an
                    administrator to update your client assignments.
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
                {isOverrideError && (
                  <PrimaryButton onClick={() => { setOverrideReasonRequired(true); setState('idle'); }}>
                    Provide Override Reason
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
            </>
          )}

          {activeTab === 'long-horizon' && (
            <LongHorizonContent
              clientId={clientId}
              clientName={clientName}
              authAxios={authAxios}
              toast={toast}
              onSuccess={onSuccess}
              onClose={onClose}
              renderFooter={setLhFooterContent}
            />
          )}
        </ModalBody>

        {/* Footer: only show approve button during draft review */}
        {activeTab === 'single' && (state === 'draft_review' || state === 'approving') && (
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

        {activeTab === 'long-horizon' && lhFooterContent && (
          <ModalFooter>{lhFooterContent}</ModalFooter>
        )}
      </ModalPanel>
    </ModalOverlay>
  );
};

export default WorkoutCopilotPanel;
