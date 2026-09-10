import { useEffect, useMemo, useRef, useState } from 'react';
import type { CoachActionProposal } from './SwanCoachTypes';
import {
  answerCoachProposalClarification,
  approveCoachProposal,
  getCoachProposal,
  getCoachWorkoutIntent,
  rejectCoachProposal,
} from '../../../../services/coachProposalService';
import type { CoachAccessHandoff, CoachProposalActionResponse } from '../../../../services/coachProposalService';
import { PlaudApiError } from '../../../../services/plaudClipService';
import { dispatchWorkoutLogged } from '../../../../utils/workoutLoggedEvent';
import {
  buildDetailRows,
  clarificationOptionsFromDetail,
  hasDetailBlockingError,
  safeProposalBlockingErrorMessage,
} from './CoachActionProposalDetailRows';
import {
  classifyWorkoutApprovalError,
  classifyWorkoutApprovalSuccess,
  isCheckableWorkoutOutcome,
  workoutRecordRoute,
  workoutRecordScope,
  type CoachWorkoutOutcome,
  type CoachWorkoutReceipt,
} from './CoachWorkoutResultState';
import {
  accessExpiryLabel,
  accessHandoffLabel,
  accessHandoffMessage,
  approvalResultMessage,
  createdClientHubRoute,
  publishProposalAction,
  publishWorkoutLoggedAfterProposalApproval,
  safeProposalStatus,
  safeProposalTypeLabel,
  safeSummaryCalories,
  safeSummaryClient,
  safeSummaryDate,
  safeSummaryExerciseCount,
  safeSummaryMealCount,
  terminalStatusMessage,
  type CoachActionProposalCardProps,
} from './CoachActionProposalCard.logic';

const WORKOUT_RESULT_UNAVAILABLE_COPY = 'Workout result is currently unavailable. Check your workout history manually.';
const OUTCOMES_HIDING_DETAIL = new Set(['lookup_denied', 'lookup_not_found', 'lookup_unavailable']);
const WORKOUT_RECORD_KINDS = ['daily_workout_form', 'workout_session', 'workout_log'];

const safeProposalActionError = (err: unknown, fallback: string) => (
  err instanceof PlaudApiError ? err.message : fallback
);

const positiveTargetClient = (clientId: string | number | null | undefined): number | null => {
  const value = Number(clientId);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const firstWorkoutRecordId = (receipt: CoachWorkoutReceipt): string | null => {
  for (const kind of WORKOUT_RECORD_KINDS) {
    const ref = receipt.recordRefs.find((record) => record.kind === kind);
    if (ref) return ref.id;
  }
  return receipt.recordRefs[0]?.id ?? null;
};

export interface CoachActionProposalControllerArgs {
  proposal: CoachActionProposal;
  onProposalAction?: CoachActionProposalCardProps['onProposalAction'];
  locationPathname: string | null;
}

export interface CoachActionProposalControllerValue {
  status: CoachActionProposal['status'];
  busy: 'approve' | 'clarification' | 'detail' | 'reject' | null;
  detail: Record<string, unknown> | null;
  generatedProposals: CoachActionProposal[];
  reviewToken: string | null;
  message: string | null;
  error: string | null;
  workoutOutcome: CoachWorkoutOutcome | null;
  checkingResult: boolean;
  createdClientRoute: string | null;
  accessHandoff: CoachAccessHandoff | null;
  clarificationOptions: ReturnType<typeof clarificationOptionsFromDetail>;
  approveLabel: string;
  isClarification: boolean;
  detailRows: ReturnType<typeof buildDetailRows>;
  terminalMessage: string | null;
  visibleStatus: string;
  rows: Array<[string, string | number]>;
  accessLabel: string | null;
  accessExpires: string | null;
  approveDisabled: boolean;
  showReject: boolean;
  showCheckResult: boolean;
  detailHidden: boolean;
  recordRoute: string | null;
  runLoadDetails: () => Promise<void>;
  runApprove: () => Promise<void>;
  runCheckResult: () => Promise<void>;
  runClarificationAnswer: (answer: string) => Promise<void>;
  runReject: () => Promise<void>;
}

export function useCoachActionProposalController({
  proposal,
  onProposalAction,
  locationPathname,
}: CoachActionProposalControllerArgs): CoachActionProposalControllerValue {
  const [status, setStatus] = useState(proposal.status);
  const [busy, setBusy] = useState<'approve' | 'clarification' | 'detail' | 'reject' | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(proposal.detail || null);
  const [generatedProposals, setGeneratedProposals] = useState<CoachActionProposal[]>([]);
  const [reviewToken, setReviewToken] = useState<string | null>(proposal.reviewToken || null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workoutOutcome, setWorkoutOutcome] = useState<CoachWorkoutOutcome | null>(null);
  const [checkingResult, setCheckingResult] = useState(false);
  const [createdClientRoute, setCreatedClientRoute] = useState<string | null>(() => (
    proposal.client ? createdClientHubRoute(proposal.client, locationPathname) : null
  ));
  const [accessHandoff, setAccessHandoff] = useState<CoachAccessHandoff | null>(proposal.accessHandoff ?? null);
  const summary = useMemo(() => proposal.summary || {}, [proposal.summary]);
  const generationRef = useRef(0);
  const approvingRef = useRef(false);
  const checkingRef = useRef(false);

  useEffect(() => {
    generationRef.current += 1;
    return () => { generationRef.current += 1; };
  }, []);

  const isWorkoutLog = proposal.type === 'workout_log';
  const pending = status === 'PENDING';
  const approveLabel = (proposal.type === 'workout_log' || proposal.type === 'nutrition_log')
    ? 'Approve and log'
    : proposal.type === 'split_plan' ? 'Approve split plan' : 'Approve draft';
  const clarificationOptions = useMemo(() => clarificationOptionsFromDetail(detail), [detail]);
  const isClarification = proposal.type === 'clarification';
  const detailHasBlockingError = hasDetailBlockingError(detail);
  const canApprove = pending && !isClarification && !!detail && !!reviewToken && !detailHasBlockingError;
  const detailRows = useMemo(() => buildDetailRows(detail), [detail]);
  const terminalMessage = terminalStatusMessage(status, proposal.type);
  const visibleStatus = workoutOutcome?.kind === 'commit_unknown' ? 'Result unknown' : safeProposalStatus(status);
  const rows = useMemo<[string, string | number][]>(() => {
    const candidates: Array<[string, string | number | null]> = [
      ['Type', safeProposalTypeLabel(proposal.type)],
      ['Client', safeSummaryClient(summary)],
      ['Date', safeSummaryDate(summary.date)],
      ['Exercises', safeSummaryExerciseCount(summary.exerciseCount)],
      ['Meals', safeSummaryMealCount(summary.mealCount)],
      ['Calories', safeSummaryCalories(summary.totalCalories)],
    ];
    return candidates.filter((row): row is [string, string | number] => row[1] != null);
  }, [proposal.type, summary]);
  const accessLabel = accessHandoffLabel(accessHandoff);
  const accessExpires = accessExpiryLabel(accessHandoff?.claimExpiresAt ?? accessHandoff?.resetExpiresAt);
  const outcome = workoutOutcome;
  const outcomeLocksApprove = outcome !== null && outcome.kind !== 'pre_effect_failed';
  const approveDisabled = !!busy || checkingResult || !canApprove || outcomeLocksApprove;
  const showReject = outcome === null || outcome.kind === 'pre_effect_failed';
  const showCheckResult = outcome !== null && isCheckableWorkoutOutcome(outcome);
  const detailHidden = outcome !== null && OUTCOMES_HIDING_DETAIL.has(outcome.kind);
  const recordRoute = outcome?.kind === 'verified'
    ? workoutRecordRoute(outcome.receipt, workoutRecordScope(locationPathname))
    : null;

  const runLoadDetails = async () => {
    const generation = generationRef.current;
    setBusy('detail'); setError(null); setMessage(null);
    try {
      const result = await getCoachProposal(proposal.id);
      if (generationRef.current !== generation) return;
      const loadedDetail = result.proposal?.detail || null;
      const loadedReviewToken = result.proposal?.reviewToken || null;
      setDetail(loadedDetail); setReviewToken(loadedReviewToken);
      if (hasDetailBlockingError(loadedDetail)) setError(safeProposalBlockingErrorMessage(loadedDetail));
      else if (!isClarification && !loadedReviewToken) setError('Review token is missing. Review details again or prepare an updated draft before approval.');
      else setMessage('Draft details loaded for review.');
    } catch (err) {
      if (generationRef.current !== generation) return;
      setError(safeProposalActionError(err, 'Detail load failed'));
    } finally {
      if (generationRef.current === generation) setBusy(null);
    }
  };

  const applyApprovedOutcome = (result: CoachProposalActionResponse) => {
    const targetClient = positiveTargetClient(summary.clientId);
    const classified = classifyWorkoutApprovalSuccess(result, proposal.id, targetClient);
    if (classified?.kind === 'verified') {
      setWorkoutOutcome({ kind: 'verified', receipt: classified.receipt });
      publishWorkoutLoggedAfterProposalApproval(proposal, result);
      setMessage('Saved and checked. The workout result was verified.');
    } else if (classified) {
      setWorkoutOutcome(classified);
      setMessage(classified.kind === 'committed_unverified'
        ? 'Workout saved; checking result. The save committed, but the result is not verified yet.'
        : 'Checking whether the workout was saved. Check the result before taking another action.');
    }
    if (classified === null) setMessage(approvalResultMessage(proposal.type, result));
    return classified;
  };

  const runApprove = async () => {
    if (approvingRef.current) return;
    approvingRef.current = true; setBusy('approve'); setError(null); setMessage(null);
    setWorkoutOutcome(null); setCreatedClientRoute(null); setAccessHandoff(null);
    const generation = generationRef.current;
    try {
      const result = await approveCoachProposal(proposal.id, reviewToken);
      if (generationRef.current !== generation) return;
      const classified = isWorkoutLog && result.intent != null ? applyApprovedOutcome(result) : null;
      if (classified && classified.kind !== 'verified' && classified.kind !== 'committed_unverified') return;
      const nextProposal = result.proposal || { ...proposal, status: result.applied ? 'APPLIED' : 'APPROVED' };
      setStatus(nextProposal.status); publishProposalAction(nextProposal, onProposalAction);
      if (classified) return;
      if (result.client) {
        const nextAccessHandoff = result.accessHandoff || null;
        setCreatedClientRoute(createdClientHubRoute(result.client, locationPathname));
        setAccessHandoff(nextAccessHandoff); setMessage(accessHandoffMessage(nextAccessHandoff));
      } else if (proposal.type === 'client_data_update' && result.partial) setMessage('Some client updates applied; review the remaining errors.');
      else if (proposal.type === 'client_data_update' && result.applied) setMessage('Client updates applied through deterministic approval.');
      else if (proposal.type === 'split_plan') {
        const workoutDraftCount = Number(result.splitPlan?.workoutProposalCount || 0);
        const splitCount = Number(result.splitPlan?.splitCount || 0);
        setGeneratedProposals(Array.isArray(result.splitPlan?.workoutProposals) ? result.splitPlan.workoutProposals : []);
        setMessage(workoutDraftCount > 0
          ? `${workoutDraftCount} workout log draft${workoutDraftCount === 1 ? '' : 's'} prepared for approval.`
          : `${splitCount || 'Split plan'} workout split candidates approved for deterministic workout-card preparation.`);
      } else {
        publishWorkoutLoggedAfterProposalApproval(proposal, result);
        setMessage(approvalResultMessage(proposal.type, result));
      }
    } catch (err) {
      const classified = isWorkoutLog ? classifyWorkoutApprovalError(err, proposal.id) : null;
      if (generationRef.current !== generation) return;
      if (classified) {
        setWorkoutOutcome(classified);
        if (classified.kind === 'pre_effect_failed') setError(classified.message);
        else if (classified.kind === 'result_unavailable') setMessage('Workout saved; result check is currently unavailable.');
        else if (classified.kind === 'commit_unknown') setMessage('Checking whether the workout was saved. Review workout history before approving again.');
        else if (classified.kind === 'lookup_denied') setError('You do not have access to verify this workout result.');
      } else setError(safeProposalActionError(err, 'Approval failed'));
    } finally {
      if (generationRef.current === generation) { approvingRef.current = false; setBusy(null); }
    }
  };

  const runCheckResult = async () => {
    if (checkingRef.current || !outcome) return;
    const checkable = isCheckableWorkoutOutcome(outcome) ? outcome : null;
    if (!checkable) return;
    checkingRef.current = true; setCheckingResult(true);
    const generation = generationRef.current;
    const targetClient = positiveTargetClient(summary.clientId);
    try {
      let intent: unknown = null;
      if (checkable.intentId) {
        const res = await getCoachWorkoutIntent(checkable.intentId); intent = res.intent ?? null;
      } else {
        const res = await getCoachProposal(checkable.proposalId ?? proposal.id);
        intent = (res.proposal as Record<string, unknown> | undefined)?.intent ?? null;
      }
      if (generationRef.current !== generation) return;
      const classified = classifyWorkoutApprovalSuccess({ intent }, proposal.id, targetClient, checkable.intentId);
      if (classified?.kind === 'verified') {
        setWorkoutOutcome({ kind: 'verified', receipt: classified.receipt }); setMessage('Saved and checked. The workout result was verified.');
        setStatus('APPLIED'); publishProposalAction({ ...proposal, status: 'APPLIED' }, onProposalAction);
        dispatchWorkoutLogged({ clientId: classified.receipt.targetUserId, formId: firstWorkoutRecordId(classified.receipt) });
      } else if (classified?.kind === 'commit_unknown') {
        setWorkoutOutcome(classified); setMessage('Checking whether the workout was saved. Check the result before taking another action.');
      } else if (classified?.kind === 'committed_unverified') {
        setWorkoutOutcome(classified); setMessage('Workout saved; checking result. The save committed, but the result is not verified yet.');
      } else {
        setWorkoutOutcome({ kind: 'lookup_unavailable', intentId: checkable.intentId, proposalId: checkable.proposalId ?? proposal.id });
        setMessage(WORKOUT_RESULT_UNAVAILABLE_COPY);
      }
    } catch (err) {
      if (generationRef.current !== generation) return;
      const apiErr = err instanceof PlaudApiError ? err : null;
      const kind = apiErr
        ? (apiErr.status === 403 || apiErr.code === 'CLIENT_ACCESS_DENIED' ? 'lookup_denied' : apiErr.status === 404 || apiErr.code === 'PROPOSAL_NOT_FOUND' ? 'lookup_not_found' : 'lookup_unavailable')
        : 'lookup_unavailable';
      setWorkoutOutcome({ kind, intentId: checkable.intentId, proposalId: checkable.proposalId ?? proposal.id });
      setMessage(WORKOUT_RESULT_UNAVAILABLE_COPY);
    } finally {
      if (generationRef.current === generation) { checkingRef.current = false; setCheckingResult(false); }
    }
  };

  const runClarificationAnswer = async (answer: string) => {
    const generation = generationRef.current; setBusy('clarification'); setError(null);
    try {
      const result = await answerCoachProposalClarification(proposal.id, answer);
      if (generationRef.current !== generation) return;
      const nextProposal = result.proposal || { ...proposal, status: 'APPROVED' as const };
      setStatus(nextProposal.status); publishProposalAction(nextProposal, onProposalAction); setMessage('Clarification answer recorded for deterministic review.');
    } catch (err) {
      if (generationRef.current === generation) setError(safeProposalActionError(err, 'Clarification answer failed'));
    } finally {
      if (generationRef.current === generation) setBusy(null);
    }
  };

  const runReject = async () => {
    const generation = generationRef.current; setBusy('reject'); setError(null);
    try {
      const result = await rejectCoachProposal(proposal.id);
      if (generationRef.current !== generation) return;
      const nextProposal = result.proposal || { ...proposal, status: 'REJECTED' as const };
      setStatus(nextProposal.status); publishProposalAction(nextProposal, onProposalAction); setMessage('Proposal rejected.');
    } catch (err) {
      if (generationRef.current === generation) setError(safeProposalActionError(err, 'Reject failed'));
    } finally {
      if (generationRef.current === generation) setBusy(null);
    }
  };

  return {
    status, busy, detail, generatedProposals, reviewToken, message, error, workoutOutcome, checkingResult,
    createdClientRoute, accessHandoff, clarificationOptions, approveLabel, isClarification, detailRows,
    terminalMessage, visibleStatus, rows, accessLabel, accessExpires, approveDisabled, showReject,
    showCheckResult, detailHidden, recordRoute, runLoadDetails, runApprove, runCheckResult,
    runClarificationAnswer, runReject,
  };
}

