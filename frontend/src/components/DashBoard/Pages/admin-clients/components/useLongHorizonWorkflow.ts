/**
 * useLongHorizonWorkflow
 *
 * Purpose: Owns long-horizon AI generation, approval, goal hydration, and
 * editor state so LongHorizonContent can stay focused on rendering states.
 */

import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import type { Toast } from '../../../../../hooks/use-toast';
import adminClientService from '../../../../../services/adminClientService';
import {
  createAiWorkoutService,
  isDegraded,
  isLongHorizonDraft,
  type DegradedResponse,
  type LongHorizonMonths,
  type LongHorizonPlan,
  type MesocycleBlock,
  type SwanCoachPlanningFingerprint,
} from '../../../../../services/aiWorkoutService';
import { exportLongHorizonPDF } from '../../../../../services/pdfExportService';
import {
  getLongHorizonApiError,
  getLongHorizonErrorFlags,
  type LongHorizonValidationError as ValidationError,
} from './longHorizonErrors';
import { getClientGoalsFromDetails, type ClientGoals } from './longHorizonGoals';
export type LHState = 'idle' | 'configure_plan' | 'generating' | 'plan_review' | 'degraded' | 'error' | 'approving' | 'saved' | 'approve_error';

interface UseLongHorizonWorkflowParams {
  clientId: number;
  clientName: string;
  authAxios: Parameters<typeof createAiWorkoutService>[0];
  toast: (opts: Omit<Toast, 'id'>) => void;
  onSuccess?: () => void;
}

export const useLongHorizonWorkflow = ({
  clientId,
  clientName,
  authAxios,
  toast,
  onSuccess,
}: UseLongHorizonWorkflowParams) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const service = useMemo(() => createAiWorkoutService(authAxios), [authAxios]);
  const [state, setState] = useState<LHState>('idle');
  const [horizonMonths, setHorizonMonths] = useState<LongHorizonMonths>(6);
  const [equipmentProfileId, setEquipmentProfileId] = useState<number | null>(null);
  const [trainerNotes, setTrainerNotes] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideReasonRequired, setOverrideReasonRequired] = useState(false);
  const [editedPlan, setEditedPlan] = useState<LongHorizonPlan | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [swanCoachPlanning, setSwanCoachPlanning] = useState<SwanCoachPlanningFingerprint | null>(null);
  const [planningReviewAcknowledged, setPlanningReviewAcknowledged] = useState(false);
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
    setSwanCoachPlanning(null);
    setPlanningReviewAcknowledged(false);
    setState('configure_plan');
    void fetchClientGoals();
  }, [fetchClientGoals]);

  const handleRetryWithOverride = useCallback(() => {
    setSwanCoachPlanning(null);
    setPlanningReviewAcknowledged(false);
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
        setSwanCoachPlanning(resp.swanCoachPlanning);
        setPlanningReviewAcknowledged(false);
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
      setErrorMessage('Generation incomplete \u2014 regenerate draft before approval.');
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
        planningReviewAcknowledged,
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
    planningReviewAcknowledged,
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

  return {
    state,
    setState,
    isAdmin,
    horizonMonths,
    setHorizonMonths,
    equipmentProfileId,
    setEquipmentProfileId,
    trainerNotes,
    setTrainerNotes,
    overrideReason,
    setOverrideReason,
    overrideReasonRequired,
    editedPlan,
    swanCoachPlanning,
    planningReviewAcknowledged,
    setPlanningReviewAcknowledged,
    warnings,
    auditLogId,
    degradedData,
    savedPlanId,
    savedBlockCount,
    errorMessage,
    errorFlags,
    approveErrors,
    validationWarnings,
    eligibilityWarnings,
    expandedBlocks,
    isSubmitting,
    clientGoals,
    goalsLoading,
    goalsError,
    handleStartConfigure,
    handleRetryWithOverride,
    handleGenerate,
    handleApprove,
    toggleBlock,
    updatePlanField,
    updateBlock,
    handleExportPlanPdf,
  };
};
