import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
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
} from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import adminClientService from '../../../../../services/adminClientService';
import {
  createAiWorkoutService,
  isDegraded,
  isLongHorizonDraft,
  type DegradedResponse,
  type LongHorizonPlan,
} from '../../../../../services/aiWorkoutService';
import {
  Badge,
  BadgeRow,
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

interface ClientGoals {
  primaryGoal: string;
  secondaryGoals: string[];
  constraints: string[];
}

interface LongHorizonContentProps {
  clientId: number;
  clientName: string;
  authAxios: any;
  toast: (opts: any) => void;
  onSuccess?: () => void;
  onClose: () => void;
  renderFooter: (content: React.ReactNode | null) => void;
}

const HorizonRadioGroup = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const HorizonRadioButton = styled.button<{ $active?: boolean }>`
  min-height: 40px;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => ($active ? SWAN_CYAN : 'rgba(255,255,255,0.15)')};
  color: ${({ $active }) => ($active ? SWAN_CYAN : '#cbd5e1')};
  background: ${({ $active }) => ($active ? 'rgba(0,255,255,0.1)' : 'rgba(255,255,255,0.03)')};
  padding: 8px 14px;
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  cursor: pointer;
`;

const ProfileBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.72rem;
  font-weight: 700;
  color: ${SWAN_CYAN};
`;

const GoalSummaryPanel = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const GoalLoadingSpinner = styled(Spinner)`
  width: 20px;
  height: 20px;
`;

const ReadOnlyField = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  min-height: 44px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  color: #dbeafe;
  display: flex;
  align-items: center;
  font-size: 0.9rem;
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

const BlockTimeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const BlockCard = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
`;

const BlockHeader = styled.button`
  width: 100%;
  border: none;
  background: rgba(255, 255, 255, 0.03);
  color: #e2e8f0;
  min-height: 50px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  text-align: left;
`;

const BlockDurationBar = styled.div<{ $pct: number }>`
  margin-left: auto;
  min-width: 90px;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
  &::after {
    content: '';
    display: block;
    width: ${({ $pct }) => `${$pct}%`};
    height: 100%;
    background: linear-gradient(90deg, #00aadd, ${SWAN_CYAN});
  }
`;

const BlockContent = styled.div`
  padding: 12px;
`;

const NasmBadge = styled(Badge)`
  font-size: 0.68rem;
`;

function parseMasterPromptJson(raw: unknown): any {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') return raw;
  return null;
}

function normalizeGoals(rawGoals: any): ClientGoals {
  const primaryGoal = String(rawGoals?.primary || rawGoals?.primaryGoal || 'general_fitness');
  const secondaryGoalsRaw = rawGoals?.secondary || rawGoals?.secondaryGoals;
  const constraintsRaw = rawGoals?.constraints;

  return {
    primaryGoal,
    secondaryGoals: Array.isArray(secondaryGoalsRaw)
      ? secondaryGoalsRaw.filter((v) => typeof v === 'string')
      : [],
    constraints: Array.isArray(constraintsRaw)
      ? constraintsRaw.filter((v) => typeof v === 'string')
      : [],
  };
}

function getClientGoalsFromDetails(detailsResp: any): ClientGoals | null {
  const client = detailsResp?.data?.client || detailsResp?.client || null;
  const masterPrompt = parseMasterPromptJson(client?.masterPromptJson);
  const goals = masterPrompt?.client?.goals || masterPrompt?.goals;
  if (!goals) return null;
  return normalizeGoals(goals);
}

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
    } catch (err: any) {
      const data = err?.response?.data || {};
      const nextCode = data?.code || '';

      if (nextCode === 'MISSING_OVERRIDE_REASON') {
        handleRetryWithOverride();
        return;
      }

      setErrorCode(nextCode);
      setErrorMessage(data?.message || err?.message || 'Failed to generate long-horizon draft');
      setState('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    clientId,
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
    } catch (err: any) {
      const data = err?.response?.data || {};
      const nextCode = data?.code || '';

      if (nextCode === 'MISSING_OVERRIDE_REASON') {
        handleRetryWithOverride();
        return;
      }

      setErrorCode(nextCode);
      setErrorMessage(data?.message || err?.message || 'Failed to approve long-horizon plan');
      setApproveErrors(Array.isArray(data?.errors) ? data.errors : []);
      setValidationWarnings(Array.isArray(data?.warnings) ? data.warnings : []);
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

  const updatePlanField = (field: keyof LongHorizonPlan, value: any) => {
    if (!editedPlan) return;
    setEditedPlan({ ...editedPlan, [field]: value });
  };

  const updateBlock = (blockIdx: number, field: string, value: any) => {
    if (!editedPlan) return;
    const blocks = [...editedPlan.blocks];
    blocks[blockIdx] = { ...blocks[blockIdx], [field]: value };
    setEditedPlan({ ...editedPlan, blocks });
  };

  const isConsentError = errorCode?.startsWith('AI_CONSENT');
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
        <h3 style={{ color: '#e2e8f0', margin: 0 }}>Long-Horizon Planning</h3>
        <p style={{ color: '#94a3b8', margin: 0, maxWidth: 520 }}>
          Generate a 3/6/12-month NASM-aligned mesocycle plan for {clientName}. Review and edit
          before final approval.
        </p>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8' }}>
                  <GoalLoadingSpinner />
                  <span>Loading goals...</span>
                </div>
              )}
              {!goalsLoading && goalsError && (
                <InfoPanel $variant="info" style={{ margin: 0 }}>
                  <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <InfoContent>{goalsError}</InfoContent>
                </InfoPanel>
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
            <Label>Additional Notes</Label>
            <TextArea
              value={trainerNotes}
              onChange={(e) => setTrainerNotes(e.target.value)}
              placeholder="Optional context for your review process"
              rows={3}
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <SecondaryButton onClick={onClose}>Close</SecondaryButton>
          <PrimaryButton onClick={handleGenerate} disabled={isSubmitting}>
            {isSubmitting ? <Spinner size={16} /> : <Sparkles size={16} />}
            {isSubmitting ? 'Generating...' : 'Generate Draft'}
          </PrimaryButton>
        </div>
      </>
    );
  }

  if (state === 'generating') {
    return (
      <CenterContent>
        <Spinner size={48} color={SWAN_CYAN} />
        <h3 style={{ color: '#e2e8f0', margin: 0 }}>Generating Long-Horizon Draft...</h3>
        <p style={{ color: '#94a3b8', margin: 0 }}>
          Building a {horizonMonths}-month periodization plan using profile and training context.
        </p>
      </CenterContent>
    );
  }

  if (state === 'degraded' && degradedData) {
    return (
      <CenterContent>
        <AlertTriangle size={48} color="#ffaa00" />
        <h3 style={{ color: '#ffaa00', margin: 0 }}>AI Temporarily Unavailable</h3>
        <p style={{ color: '#94a3b8', margin: 0, maxWidth: 540 }}>{degradedData.message}</p>
        <InfoPanel $variant="warning">
          <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <InfoContent>
            {degradedData.fallback.reasons.map((reason, idx) => (
              <div key={idx}>{reason}</div>
            ))}
          </InfoContent>
        </InfoPanel>
        <div style={{ display: 'flex', gap: 12 }}>
          <PrimaryButton onClick={handleGenerate} disabled={isSubmitting}>
            <RefreshCw size={16} />
            Retry
          </PrimaryButton>
          <SecondaryButton onClick={() => setState('configure_plan')}>Back to Configure</SecondaryButton>
        </div>
      </CenterContent>
    );
  }

  if ((state === 'error' || state === 'approve_error')) {
    return (
      <CenterContent>
        <AlertTriangle size={48} color="#ff6b6b" />
        <h3 style={{ color: '#ff6b6b', margin: 0 }}>
          {state === 'approve_error' ? 'Approval Failed' : 'Generation Failed'}
        </h3>
        <p style={{ color: '#94a3b8', margin: 0, maxWidth: 560 }}>{errorMessage}</p>

        {isApprovedDraftInvalid && approveErrors.length > 0 && (
          <div style={{ width: '100%', maxWidth: 560 }}>
            {approveErrors.map((err, idx) => (
              <InfoPanel key={`${err.code}-${idx}`} $variant="error">
                <FileWarning size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <InfoContent>
                  <strong>{err.field || err.code}:</strong> {err.message}
                </InfoContent>
              </InfoPanel>
            ))}
          </div>
        )}

        {validationWarnings.length > 0 && (
          <InfoPanel $variant="warning">
            <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <InfoContent>
              {validationWarnings.map((warning, idx) => (
                <div key={`${warning}-${idx}`}>{warning}</div>
              ))}
            </InfoContent>
          </InfoPanel>
        )}

        {isConsentError && (
          <InfoPanel $variant="warning">
            <Shield size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <InfoContent>
              AI consent is not available for this client. Admin override reason is required if
              you choose to proceed without consent.
            </InfoContent>
          </InfoPanel>
        )}

        {isAssignmentError && (
          <InfoPanel $variant="warning">
            <Shield size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <InfoContent>
              You are not currently assigned to this client. Contact an administrator to continue.
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
          {isOverrideReasonError && (
            <PrimaryButton onClick={handleRetryWithOverride}>
              Add Override Reason
            </PrimaryButton>
          )}
          <SecondaryButton onClick={() => setState('configure_plan')}>Back to Configure</SecondaryButton>
          <SecondaryButton onClick={onClose}>Close</SecondaryButton>
        </div>
      </CenterContent>
    );
  }

  if ((state === 'plan_review' || state === 'approving') && editedPlan) {
    return (
      <>
        {warnings.length > 0 && (
          <InfoPanel $variant="warning">
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <InfoContent>
              {warnings.map((warning, idx) => (
                <div key={`${warning}-${idx}`}>{warning}</div>
              ))}
            </InfoContent>
          </InfoPanel>
        )}

        {auditLogId == null && (
          <InfoPanel $variant="warning">
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
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
                  <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>{block.durationWeeks}w</span>
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

        {auditLogId == null && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <PrimaryButton
              onClick={() => setState('configure_plan')}
              disabled={isSubmitting}
            >
              Regenerate
            </PrimaryButton>
          </div>
        )}
      </>
    );
  }

  if (state === 'saved') {
    return (
      <CenterContent>
        <CheckCircle2 size={48} color="#00ff64" />
        <h3 style={{ color: '#00ff64', margin: 0 }}>Long-Horizon Plan Saved</h3>
        <p style={{ color: '#94a3b8', margin: 0 }}>
          Plan ID: <strong style={{ color: '#e2e8f0' }}>{savedPlanId}</strong> · Blocks:{' '}
          <strong style={{ color: '#e2e8f0' }}>{savedBlockCount}</strong>
        </p>
        {validationWarnings.length > 0 && (
          <InfoPanel $variant="warning">
            <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <InfoContent>
              {validationWarnings.map((warning, idx) => (
                <div key={`${warning}-${idx}`}>{warning}</div>
              ))}
            </InfoContent>
          </InfoPanel>
        )}
        {eligibilityWarnings.length > 0 && (
          <InfoPanel $variant="info">
            <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
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
