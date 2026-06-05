/**
 * ┌─── SUB-COMPONENT: LongHorizonContent ──────────────────────┐
 * │ PARENT: EnhancedAdminClientManagementView                   │
 * │ PURPOSE: Long-horizon monitoring dashboard for client       │
 * │          health metrics, trends, risk alerts, and           │
 * │          predictive analytics over extended timeframes       │
 * │ OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-23        │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────┐                        │
 * │ │ Long Horizon Analysis     [Refresh]│                      │
 * │ │ ┌─ Risk Cards ─────────────────┐ │                        │
 * │ │ │ Churn Risk | Progress Stall  │ │                        │
 * │ │ └─────────────────────────────┘ │                        │
 * │ │ ┌─ Trend Charts ──────────────┐ │                        │
 * │ │ │ Weight | Strength | Volume  │ │                        │
 * │ │ └─────────────────────────────┘ │                        │
 * │ │ ┌─ Recommendations ──────────┐  │                        │
 * │ │ │ AI-generated suggestions   │  │                        │
 * │ │ └────────────────────────────┘  │                        │
 * │ └──────────────────────────────────┘                        │
 * │ Props: { clientId, clientName }                             │
 * │ API: GET /api/admin/clients/:id/long-horizon               │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileWarning,
  Info,
  RefreshCw,
  RotateCcw,
  Save,
  Shield,
  Sparkles,
  Download,
} from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import adminClientService from '../../../../../services/adminClientService';
import {
  createAiWorkoutService,
  isDegraded,
  isLongHorizonDraft,
  type DegradedResponse,
  type LongHorizonPlan,
  type MesocycleBlock,
} from '../../../../../services/aiWorkoutService';
import type { Toast } from '../../../../../hooks/use-toast';
import { exportLongHorizonPDF } from '../../../../../services/pdfExportService';
import { getClientGoalsFromDetails, type ClientGoals } from './longHorizonGoals';
import {
  CenterContent,
  Divider,
  FormGroup,
  FormGrid,
  InfoContent,
  InfoPanel,
  Input,
  Label,
  PrimaryButton,
  SecondaryButton,
  SectionTitle,
  Spinner,
  SWAN_CYAN,
  TextArea,
} from './copilot-shared-styles';
import {
  ActionRow,
  BlockCard,
  BlockContent,
  BlockDurationBar,
  BlockHeader,
  BlockTimeline,
  BlockWeeks,
  ErrorList,
  FlushInfoPanel,
  GoalLoadingRow,
  GoalLoadingSpinner,
  GoalSummaryPanel,
  HorizonRadioButton,
  HorizonRadioGroup,
  IconSlot,
  NasmBadge,
  OverrideSection,
  OverrideTextArea,
  PanelCopy,
  PanelTitle,
  ProfileBadge,
  ReadOnlyField,
  SavedMetaStrong,
  TightActionRow,
} from './LongHorizonContent.styles';
import EquipmentProfilePicker from '../../../../Shared/EquipmentProfilePicker';
import AITerminalPanel from '../../../../Shared/AITerminalPanel';

type LHState =
  | 'idle'
  | 'configure_plan'
  | 'generating'
  | 'plan_review'
  | 'degraded'
  | 'error'
  | 'approving'
  | 'saved'
  | 'approve_error';

interface ValidationError {
  code: string;
  field?: string;
  message: string;
}

interface LongHorizonContentProps {
  clientId: number;
  clientName: string;
  authAxios: Parameters<typeof createAiWorkoutService>[0];
  toast: (opts: Omit<Toast, 'id'>) => void;
  onSuccess?: () => void;
  onClose: () => void;
  renderFooter: (content: React.ReactNode | null) => void;
}

interface ApiErrorPayload {
  code?: string;
  message?: string;
  errors?: ValidationError[];
  warnings?: string[];
}

interface ApiErrorLike {
  message?: string;
  response?: {
    data?: ApiErrorPayload;
  };
}

const getApiError = (err: unknown): { data: ApiErrorPayload; message?: string } => {
  const apiError = err as ApiErrorLike;
  return {
    data: apiError.response?.data || {},
    message: apiError.message,
  };
};

const LongHorizonContent: React.FC<LongHorizonContentProps> = ({
  clientId,
  clientName,
  authAxios,
  toast,
  onSuccess,
  onClose,
  renderFooter,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const service = useMemo(() => createAiWorkoutService(authAxios), [authAxios]);

  const [state, setState] = useState<LHState>('idle');
  const [horizonMonths, setHorizonMonths] = useState<3 | 6 | 12>(6);
  const [equipmentProfileId, setEquipmentProfileId] = useState<number | null>(null);
  const [trainerNotes, setTrainerNotes] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideReasonRequired, setOverrideReasonRequired] = useState(false);
  const [editedPlan, setEditedPlan] = useState<LongHorizonPlan | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [auditLogId, setAuditLogId] = useState<number | null>(null);
  const [degradedData, setDegradedData] = useState<DegradedResponse | null>(null);
  const [savedPlanId, setSavedPlanId] = useState<number | null>(null);
  const [savedBlockCount, setSavedBlockCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [approveErrors, setApproveErrors] = useState<ValidationError[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [eligibilityWarnings, setEligibilityWarnings] = useState<string[]>([]);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientGoals, setClientGoals] = useState<ClientGoals | null>(null);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [goalsError, setGoalsError] = useState('');
  const handleApproveRef = useRef<(() => Promise<void>) | null>(null);

  const fetchClientGoals = useCallback(async () => {
    setGoalsLoading(true);
    setGoalsError('');
    try {
      const resp = await adminClientService.getClientDetails(String(clientId));
      setClientGoals(getClientGoalsFromDetails(resp));
    } catch {
      setClientGoals(null);
      setGoalsError('Goal data unavailable');
    } finally {
      setGoalsLoading(false);
    }
  }, [clientId]);

  const handleStartConfigure = useCallback(() => {
    setState('configure_plan');
    void fetchClientGoals();
  }, [fetchClientGoals]);

  const handleRetryWithOverride = useCallback(() => {
    setOverrideReasonRequired(true);
    setState('configure_plan');
    void fetchClientGoals();
  }, [fetchClientGoals]);

  const handleGenerate = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setState('generating');
    setErrorMessage('');
    setErrorCode('');
    setApproveErrors([]);

    try {
      const resp = await service.generateLongHorizonDraft({
        userId: clientId,
        horizonMonths,
        equipmentProfileId: equipmentProfileId || undefined,
        overrideReason: overrideReason.trim() || undefined,
      });

      if (isDegraded(resp)) {
        setDegradedData(resp);
        setState('degraded');
        return;
      }

      if (isLongHorizonDraft(resp)) {
        setEditedPlan(resp.plan);
        setWarnings(resp.warnings || []);
        setAuditLogId(resp.auditLogId);
        setExpandedBlocks(resp.plan.blocks.length > 0 ? new Set([0]) : new Set());
        setState('plan_review');
        return;
      }

      setState('error');
      setErrorCode('UNKNOWN_RESPONSE');
      setErrorMessage('Unexpected response received from long-horizon generation');
    } catch (err: unknown) {
      const { data, message } = getApiError(err);
      const nextCode = data.code || '';

      if (nextCode === 'MISSING_OVERRIDE_REASON') {
        handleRetryWithOverride();
        return;
      }

      setErrorCode(nextCode);
      setErrorMessage(data.message || message || 'Failed to generate long-horizon draft');
      setState('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    clientId,
    equipmentProfileId,
    handleRetryWithOverride,
    horizonMonths,
    isSubmitting,
    overrideReason,
    service,
  ]);

  const handleApprove = useCallback(async () => {
    if (isSubmitting || !editedPlan) return;

    if (auditLogId == null) {
      setErrorCode('MISSING_AUDIT_LOG_ID');
      setErrorMessage('Generation incomplete — regenerate draft before approval.');
      setState('approve_error');
      return;
    }

    setIsSubmitting(true);
    setState('approving');
    setApproveErrors([]);

    try {
      const resp = await service.approveLongHorizonDraft({
        userId: clientId,
        plan: editedPlan,
        horizonMonths,
        auditLogId,
        overrideReason: overrideReason.trim() || undefined,
        trainerNotes: trainerNotes.trim() || undefined,
      });

      setSavedPlanId(resp.planId);
      setSavedBlockCount(resp.blockCount);
      setValidationWarnings(resp.validationWarnings || []);
      setEligibilityWarnings(resp.eligibilityWarnings || []);
      setState('saved');

      toast({
        title: 'Long-Horizon Plan Saved',
        description: `Plan ${resp.planId} saved for ${clientName}`,
        variant: 'default',
      });
      onSuccess?.();
    } catch (err: unknown) {
      const { data, message } = getApiError(err);
      const nextCode = data.code || '';

      if (nextCode === 'MISSING_OVERRIDE_REASON') {
        handleRetryWithOverride();
        return;
      }

      setErrorCode(nextCode);
      setErrorMessage(data.message || message || 'Failed to approve long-horizon plan');
      setApproveErrors(Array.isArray(data.errors) ? data.errors : []);
      setValidationWarnings(Array.isArray(data.warnings) ? data.warnings : []);
      setState('approve_error');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    auditLogId,
    clientId,
    clientName,
    editedPlan,
    handleRetryWithOverride,
    horizonMonths,
    isSubmitting,
    onSuccess,
    overrideReason,
    service,
    toast,
    trainerNotes,
  ]);

  useEffect(() => {
    handleApproveRef.current = handleApprove;
  }, [handleApprove]);

  const toggleBlock = (blockIdx: number) => {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockIdx)) {
        next.delete(blockIdx);
      } else {
        next.add(blockIdx);
      }
      return next;
    });
  };

  const updatePlanField = <K extends keyof LongHorizonPlan>(field: K, value: LongHorizonPlan[K]) => {
    if (!editedPlan) return;
    setEditedPlan({ ...editedPlan, [field]: value });
  };

  const updateBlock = <K extends keyof MesocycleBlock>(
    blockIdx: number,
    field: K,
    value: MesocycleBlock[K],
  ) => {
    if (!editedPlan) return;
    const blocks = [...editedPlan.blocks];
    blocks[blockIdx] = { ...blocks[blockIdx], [field]: value };
    setEditedPlan({ ...editedPlan, blocks });
  };

  const isConsentError = errorCode?.startsWith('AI_CONSENT') || errorCode?.startsWith('AI_WAIVER');
  const isWaiverError = errorCode?.startsWith('AI_WAIVER');
  const isAssignmentError = errorCode === 'AI_ASSIGNMENT_DENIED';
  const isOverrideReasonError = errorCode === 'MISSING_OVERRIDE_REASON';
  const isRetryable = ['AI_RATE_LIMITED', 'AI_PII_LEAK', 'AI_PARSE_ERROR', 'AI_VALIDATION_ERROR'].includes(errorCode);
  const isApprovedDraftInvalid = errorCode === 'APPROVED_DRAFT_INVALID';

  useEffect(() => {
    if ((state === 'plan_review' || state === 'approving') && editedPlan) {
      renderFooter(
        <>
          <SecondaryButton
            onClick={() => {
              setState('configure_plan');
            }}
            disabled={isSubmitting}
          >
            <RotateCcw size={16} />
            Regenerate
          </SecondaryButton>
          <PrimaryButton
            onClick={() => {
              void handleApproveRef.current?.();
            }}
            disabled={isSubmitting || state === 'approving' || auditLogId == null}
          >
            {state === 'approving' ? <Spinner size={16} /> : <Save size={16} />}
            {state === 'approving' ? 'Saving...' : 'Approve & Save'}
          </PrimaryButton>
        </>,
      );
    } else {
      renderFooter(null);
    }

    return () => {
      renderFooter(null);
    };
  }, [state, isSubmitting, editedPlan, auditLogId, renderFooter]);

  if (state === 'idle') {
    return (
      <CenterContent>
        <Sparkles size={48} color={SWAN_CYAN} />
        <PanelTitle>Long-Horizon Planning</PanelTitle>
        <PanelCopy $maxWidth={520}>
          Generate a 3/6/12-month NASM-aligned mesocycle plan for {clientName}. Review and edit
          before final approval.
        </PanelCopy>
        <PrimaryButton onClick={handleStartConfigure} disabled={isSubmitting}>
          Configure Plan
        </PrimaryButton>
      </CenterContent>
    );
  }

  if (state === 'configure_plan') {
    return (
      <>
        <SectionTitle>Long-Horizon Planning</SectionTitle>
        <FormGrid>
          <FormGroup $fullWidth>
            <Label>Horizon</Label>
            <HorizonRadioGroup>
              {[3, 6, 12].map((option) => (
                <HorizonRadioButton
                  key={option}
                  $active={horizonMonths === option}
                  onClick={() => setHorizonMonths(option as 3 | 6 | 12)}
                >
                  {option} months
                </HorizonRadioButton>
              ))}
            </HorizonRadioGroup>
          </FormGroup>

          <FormGroup $fullWidth>
            <Label>
              Client Goals <ProfileBadge><Info size={12} />From profile</ProfileBadge>
            </Label>
            <GoalSummaryPanel>
              {goalsLoading && (
                <GoalLoadingRow>
                  <GoalLoadingSpinner />
                  <span>Loading goals...</span>
                </GoalLoadingRow>
              )}
              {!goalsLoading && goalsError && (
                <FlushInfoPanel $variant="info">
                  <IconSlot><Info size={16} /></IconSlot>
                  <InfoContent>{goalsError}</InfoContent>
                </FlushInfoPanel>
              )}
              {!goalsLoading && !goalsError && (
                <>
                  <div>
                    <Label>Primary Goal</Label>
                    <ReadOnlyField>{clientGoals?.primaryGoal || 'general_fitness'}</ReadOnlyField>
                  </div>
                  <div>
                    <Label>Secondary Goals</Label>
                    <ReadOnlyField>
                      {clientGoals?.secondaryGoals.length
                        ? clientGoals.secondaryGoals.join(', ')
                        : 'None provided'}
                    </ReadOnlyField>
                  </div>
                  <div>
                    <Label>Constraints</Label>
                    <ReadOnlyField>
                      {clientGoals?.constraints.length
                        ? clientGoals.constraints.join(', ')
                        : 'None provided'}
                    </ReadOnlyField>
                  </div>
                </>
              )}
            </GoalSummaryPanel>
          </FormGroup>

          <FormGroup $fullWidth>
            <EquipmentProfilePicker
              selectedProfileId={equipmentProfileId}
              onSelect={setEquipmentProfileId}
              compact
              label="Equipment Profile"
            />
          </FormGroup>

          <FormGroup $fullWidth>
            <Label>Additional Notes</Label>
            <TextArea
              value={trainerNotes}
              onChange={(e) => setTrainerNotes(e.target.value)}
              placeholder="Optional context for your review process"
              rows={3}
            />
          </FormGroup>

          <FormGroup $fullWidth>
            <AITerminalPanel
              context="workout_generation"
              clientId={clientId}
              equipmentProfileId={equipmentProfileId}
              placeholder="Ask Swan Coach about long-horizon planning..."
              defaultOpen={false}
            />
          </FormGroup>

          {(isAdmin || overrideReasonRequired) && (
            <FormGroup $fullWidth>
              <OverrideSection>
                <Label>Admin Override Reason {overrideReasonRequired ? '(required)' : '(optional)'}</Label>
                <OverrideTextArea
                  $required={overrideReasonRequired}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Provide justification when consent override is required"
                  rows={3}
                />
              </OverrideSection>
            </FormGroup>
          )}
        </FormGrid>

        <Divider />

        <ActionRow $justify="flex-end">
          <SecondaryButton onClick={onClose}>Close</SecondaryButton>
          <PrimaryButton onClick={handleGenerate} disabled={isSubmitting}>
            {isSubmitting ? <Spinner size={16} /> : <Sparkles size={16} />}
            {isSubmitting ? 'Generating...' : 'Generate Draft'}
          </PrimaryButton>
        </ActionRow>
      </>
    );
  }

  if (state === 'generating') {
    return (
      <CenterContent>
        <Spinner size={48} color={SWAN_CYAN} />
        <PanelTitle>Generating Long-Horizon Draft...</PanelTitle>
        <PanelCopy>
          Building a {horizonMonths}-month periodization plan using profile and training context.
        </PanelCopy>
      </CenterContent>
    );
  }

  if (state === 'degraded' && degradedData) {
    return (
      <CenterContent>
        <AlertTriangle size={48} color="#ffaa00" />
        <PanelTitle $tone="warning">Swan Coach Temporarily Unavailable</PanelTitle>
        <PanelCopy $maxWidth={540}>{degradedData.message}</PanelCopy>
        <InfoPanel $variant="warning">
          <IconSlot><Info size={16} /></IconSlot>
          <InfoContent>
            {degradedData.fallback.reasons.map((reason, idx) => (
              <div key={idx}>{reason}</div>
            ))}
          </InfoContent>
        </InfoPanel>
        <ActionRow>
          <PrimaryButton onClick={handleGenerate} disabled={isSubmitting}>
            <RefreshCw size={16} />
            Retry
          </PrimaryButton>
          <SecondaryButton onClick={() => setState('configure_plan')}>Back to Configure</SecondaryButton>
        </ActionRow>
      </CenterContent>
    );
  }

  if ((state === 'error' || state === 'approve_error')) {
    return (
      <CenterContent>
        <AlertTriangle size={48} color="#ff6b6b" />
        <PanelTitle $tone="error">
          {state === 'approve_error' ? 'Approval Failed' : 'Generation Failed'}
        </PanelTitle>
        <PanelCopy $maxWidth={560}>{errorMessage}</PanelCopy>

        {isApprovedDraftInvalid && approveErrors.length > 0 && (
          <ErrorList>
            {approveErrors.map((err, idx) => (
              <InfoPanel key={`${err.code}-${idx}`} $variant="error">
                <IconSlot><FileWarning size={16} /></IconSlot>
                <InfoContent>
                  <strong>{err.field || err.code}:</strong> {err.message}
                </InfoContent>
              </InfoPanel>
            ))}
          </ErrorList>
        )}

        {validationWarnings.length > 0 && (
          <InfoPanel $variant="warning">
            <IconSlot><Info size={16} /></IconSlot>
            <InfoContent>
              {validationWarnings.map((warning, idx) => (
                <div key={`${warning}-${idx}`}>{warning}</div>
              ))}
            </InfoContent>
          </InfoPanel>
        )}

        {isConsentError && (
          <InfoPanel $variant="warning">
            <IconSlot><Shield size={16} /></IconSlot>
            <InfoContent>
              {isWaiverError
                ? 'This client\'s waiver consent is missing or outdated. The client must sign the current waiver, or an admin override reason is required to proceed.'
                : 'Swan Coach consent is not available for this client. Admin override reason is required if you choose to proceed without consent.'}
            </InfoContent>
          </InfoPanel>
        )}

        {isAssignmentError && (
          <InfoPanel $variant="warning">
            <IconSlot><Shield size={16} /></IconSlot>
            <InfoContent>
              You are not currently assigned to this client. Contact an administrator to continue.
            </InfoContent>
          </InfoPanel>
        )}

        <ActionRow>
          {isRetryable && (
            <PrimaryButton onClick={handleGenerate} disabled={isSubmitting}>
              <RefreshCw size={16} />
              Retry
            </PrimaryButton>
          )}
          {isOverrideReasonError && (
            <PrimaryButton onClick={handleRetryWithOverride}>
              Add Override Reason
            </PrimaryButton>
          )}
          <SecondaryButton onClick={() => setState('configure_plan')}>Back to Configure</SecondaryButton>
          <SecondaryButton onClick={onClose}>Close</SecondaryButton>
        </ActionRow>
      </CenterContent>
    );
  }

  if ((state === 'plan_review' || state === 'approving') && editedPlan) {
    return (
      <>
        {warnings.length > 0 && (
          <InfoPanel $variant="warning">
            <IconSlot><AlertTriangle size={16} /></IconSlot>
            <InfoContent>
              {warnings.map((warning, idx) => (
                <div key={`${warning}-${idx}`}>{warning}</div>
              ))}
            </InfoContent>
          </InfoPanel>
        )}

        {auditLogId == null && (
          <InfoPanel $variant="warning">
            <IconSlot><AlertTriangle size={16} /></IconSlot>
            <InfoContent>
              Generation incomplete — regenerate to create a valid audit link before approval.
            </InfoContent>
          </InfoPanel>
        )}

        <FormGrid>
          <FormGroup $fullWidth>
            <Label>Plan Name</Label>
            <Input
              value={editedPlan.planName}
              onChange={(e) => updatePlanField('planName', e.target.value)}
              maxLength={200}
            />
          </FormGroup>
          <FormGroup>
            <Label>Horizon</Label>
            <ReadOnlyField>{editedPlan.horizonMonths} months</ReadOnlyField>
          </FormGroup>
          <FormGroup $fullWidth>
            <Label>Summary</Label>
            <TextArea
              value={editedPlan.summary || ''}
              onChange={(e) => updatePlanField('summary', e.target.value)}
              maxLength={2000}
            />
          </FormGroup>
        </FormGrid>

        <Divider />
        <SectionTitle>Mesocycle Blocks ({editedPlan.blocks.length})</SectionTitle>
        <BlockTimeline>
          {editedPlan.blocks.map((block, idx) => {
            const durationPct = Math.max(10, Math.min(100, (block.durationWeeks / 16) * 100));
            const isExpanded = expandedBlocks.has(idx);
            return (
              <BlockCard key={`${block.sequence}-${idx}`}>
                <BlockHeader onClick={() => toggleBlock(idx)}>
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span>
                    Block {block.sequence}: {block.phaseName}
                  </span>
                  <NasmBadge $color={block.nasmFramework === 'OPT' ? SWAN_CYAN : '#a78bfa'}>
                    {block.nasmFramework}
                    {block.optPhase ? ` P${block.optPhase}` : ''}
                  </NasmBadge>
                  <BlockDurationBar $pct={durationPct} />
                  <BlockWeeks>{block.durationWeeks}w</BlockWeeks>
                </BlockHeader>

                {isExpanded && (
                  <BlockContent>
                    <FormGrid>
                      <FormGroup>
                        <Label>Phase Name</Label>
                        <Input
                          value={block.phaseName}
                          onChange={(e) => updateBlock(idx, 'phaseName', e.target.value)}
                          maxLength={100}
                        />
                      </FormGroup>
                      <FormGroup>
                        <Label>Focus</Label>
                        <Input
                          value={block.focus || ''}
                          onChange={(e) => updateBlock(idx, 'focus', e.target.value)}
                          maxLength={200}
                        />
                      </FormGroup>
                      <FormGroup>
                        <Label>Duration (weeks)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={16}
                          value={block.durationWeeks}
                          onChange={(e) => updateBlock(idx, 'durationWeeks', parseInt(e.target.value, 10) || 1)}
                        />
                      </FormGroup>
                      <FormGroup>
                        <Label>Sessions / week</Label>
                        <Input
                          type="number"
                          min={1}
                          max={7}
                          value={block.sessionsPerWeek ?? ''}
                          onChange={(e) => updateBlock(
                            idx,
                            'sessionsPerWeek',
                            e.target.value ? parseInt(e.target.value, 10) : null,
                          )}
                        />
                      </FormGroup>
                      <FormGroup $fullWidth>
                        <Label>Entry Criteria</Label>
                        <TextArea
                          value={block.entryCriteria || ''}
                          onChange={(e) => updateBlock(idx, 'entryCriteria', e.target.value)}
                          rows={2}
                        />
                      </FormGroup>
                      <FormGroup $fullWidth>
                        <Label>Exit Criteria</Label>
                        <TextArea
                          value={block.exitCriteria || ''}
                          onChange={(e) => updateBlock(idx, 'exitCriteria', e.target.value)}
                          rows={2}
                        />
                      </FormGroup>
                      <FormGroup $fullWidth>
                        <Label>Block Notes</Label>
                        <TextArea
                          value={block.notes || ''}
                          onChange={(e) => updateBlock(idx, 'notes', e.target.value)}
                          rows={2}
                        />
                      </FormGroup>
                    </FormGrid>
                  </BlockContent>
                )}
              </BlockCard>
            );
          })}
        </BlockTimeline>

        <Divider />
        <FormGroup $fullWidth>
          <Label>Trainer Notes (included in approval audit)</Label>
          <TextArea
            value={trainerNotes}
            onChange={(e) => setTrainerNotes(e.target.value)}
            rows={3}
          />
        </FormGroup>

        <TightActionRow $justify="flex-end">
          {editedPlan && (
            <SecondaryButton
              onClick={() => {
                exportLongHorizonPDF(editedPlan, clientName);
                toast({
                  title: 'PDF exported',
                  description: 'Long-horizon plan PDF is ready.',
                  variant: 'success',
                });
              }}
            >
              <Download size={16} /> Export PDF
            </SecondaryButton>
          )}
          {auditLogId == null && (
            <PrimaryButton
              onClick={() => setState('configure_plan')}
              disabled={isSubmitting}
            >
              Regenerate
            </PrimaryButton>
          )}
        </TightActionRow>
      </>
    );
  }

  if (state === 'saved') {
    return (
      <CenterContent>
        <CheckCircle2 size={48} color="#00ff64" />
        <PanelTitle $tone="success">Long-Horizon Plan Saved</PanelTitle>
        <PanelCopy>
          Plan ID: <SavedMetaStrong>{savedPlanId}</SavedMetaStrong> · Blocks:{' '}
          <SavedMetaStrong>{savedBlockCount}</SavedMetaStrong>
        </PanelCopy>
        {validationWarnings.length > 0 && (
          <InfoPanel $variant="warning">
            <IconSlot><Info size={16} /></IconSlot>
            <InfoContent>
              {validationWarnings.map((warning, idx) => (
                <div key={`${warning}-${idx}`}>{warning}</div>
              ))}
            </InfoContent>
          </InfoPanel>
        )}
        {eligibilityWarnings.length > 0 && (
          <InfoPanel $variant="info">
            <IconSlot><Info size={16} /></IconSlot>
            <InfoContent>
              {eligibilityWarnings.map((warning, idx) => (
                <div key={`${warning}-${idx}`}>{warning}</div>
              ))}
            </InfoContent>
          </InfoPanel>
        )}
        <SecondaryButton onClick={onClose}>Close</SecondaryButton>
      </CenterContent>
    );
  }

  return null;
};

export default LongHorizonContent;
