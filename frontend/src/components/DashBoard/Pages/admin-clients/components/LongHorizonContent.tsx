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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  getLongHorizonApiError,
  getLongHorizonErrorFlags,
  type LongHorizonValidationError as ValidationError,
} from './longHorizonErrors';
import { getClientGoalsFromDetails, type ClientGoals } from './longHorizonGoals';
import LongHorizonConfigureForm from './LongHorizonConfigureForm';
import LongHorizonErrorState from './LongHorizonErrorState';
import LongHorizonPlanReviewEditor from './LongHorizonPlanReviewEditor';
import LongHorizonReviewFooter from './LongHorizonReviewFooter';
import {
  LongHorizonDegradedState,
  LongHorizonGeneratingState,
  LongHorizonIdleState,
  LongHorizonSavedState,
} from './LongHorizonStatusScreens';

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

interface LongHorizonContentProps {
  clientId: number;
  clientName: string;
  authAxios: Parameters<typeof createAiWorkoutService>[0];
  toast: (opts: Omit<Toast, 'id'>) => void;
  onSuccess?: () => void;
  onClose: () => void;
  renderFooter: (content: React.ReactNode | null) => void;
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
      const { data, message } = getLongHorizonApiError(err);
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
      const { data, message } = getLongHorizonApiError(err);
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

  const handleExportPlanPdf = useCallback((plan: LongHorizonPlan, exportClientName: string) => {
    exportLongHorizonPDF(plan, exportClientName);
    toast({
      title: 'PDF exported',
      description: 'Long-horizon plan PDF is ready.',
      variant: 'success',
    });
  }, [toast]);

  const errorFlags = useMemo(() => getLongHorizonErrorFlags(errorCode), [errorCode]);

  useEffect(() => {
    if ((state === 'plan_review' || state === 'approving') && editedPlan) {
      renderFooter(
        <LongHorizonReviewFooter
          state={state}
          isSubmitting={isSubmitting}
          auditLogId={auditLogId}
          onRegenerate={() => setState('configure_plan')}
          onApprove={() => {
            void handleApprove();
          }}
        />,
      );
    } else {
      renderFooter(null);
    }

    return () => {
      renderFooter(null);
    };
  }, [state, isSubmitting, editedPlan, auditLogId, handleApprove, renderFooter]);

  if (state === 'idle') {
    return (
      <LongHorizonIdleState
        clientName={clientName}
        isSubmitting={isSubmitting}
        onConfigure={handleStartConfigure}
      />
    );
  }

  if (state === 'configure_plan') {
    return (
      <LongHorizonConfigureForm
        clientId={clientId}
        horizonMonths={horizonMonths}
        setHorizonMonths={setHorizonMonths}
        clientGoals={clientGoals}
        goalsLoading={goalsLoading}
        goalsError={goalsError}
        equipmentProfileId={equipmentProfileId}
        setEquipmentProfileId={setEquipmentProfileId}
        trainerNotes={trainerNotes}
        setTrainerNotes={setTrainerNotes}
        isAdmin={isAdmin}
        overrideReasonRequired={overrideReasonRequired}
        overrideReason={overrideReason}
        setOverrideReason={setOverrideReason}
        isSubmitting={isSubmitting}
        onClose={onClose}
        onGenerate={handleGenerate}
      />
    );
  }

  if (state === 'generating') {
    return <LongHorizonGeneratingState horizonMonths={horizonMonths} />;
  }

  if (state === 'degraded' && degradedData) {
    return (
      <LongHorizonDegradedState
        degradedData={degradedData}
        isSubmitting={isSubmitting}
        onRetry={handleGenerate}
        onBackToConfigure={() => setState('configure_plan')}
      />
    );
  }

  if ((state === 'error' || state === 'approve_error')) {
    return (
      <LongHorizonErrorState
        state={state}
        errorMessage={errorMessage}
        errorFlags={errorFlags}
        approveErrors={approveErrors}
        validationWarnings={validationWarnings}
        isSubmitting={isSubmitting}
        onRetry={handleGenerate}
        onAddOverride={handleRetryWithOverride}
        onBackToConfigure={() => setState('configure_plan')}
        onClose={onClose}
      />
    );
  }

  if ((state === 'plan_review' || state === 'approving') && editedPlan) {
    return (
      <LongHorizonPlanReviewEditor
        clientName={clientName}
        plan={editedPlan}
        warnings={warnings}
        auditLogId={auditLogId}
        trainerNotes={trainerNotes}
        setTrainerNotes={setTrainerNotes}
        expandedBlocks={expandedBlocks}
        onToggleBlock={toggleBlock}
        onUpdatePlanField={updatePlanField}
        onUpdateBlock={updateBlock}
        onExportPdf={handleExportPlanPdf}
        onRegenerate={() => setState('configure_plan')}
        isSubmitting={isSubmitting}
      />
    );
  }

  if (state === 'saved') {
    return (
      <LongHorizonSavedState
        savedPlanId={savedPlanId}
        savedBlockCount={savedBlockCount}
        validationWarnings={validationWarnings}
        eligibilityWarnings={eligibilityWarnings}
        onClose={onClose}
      />
    );
  }

  return null;
};

export default LongHorizonContent;
