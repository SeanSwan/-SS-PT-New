/**
 * FILE: useCoachWorkspaceModel.ts
 * PURPOSE: Everything the v4 Coach Workspace page needs, in one hook, built on
 * the SAME controller the legacy Command Center uses (one brain, one send path,
 * one selection/admission binding — plan 55).
 *
 * Carried over from CoachCommandCenterPage (behaviour, not layout): the
 * raw-vs-presentation role split, pending-food handoff, keyboard inset, ops
 * drawer focus effects, logger/planner routes, route-forced Review/History,
 * and the Plaud upload request → Review › Audio. New here: the lens → layout
 * resolution, the panel model, the "/" menu actions, and today's schedule.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../../hooks/useAuth';
import { useCoachCommandCatalog } from '../../../../hooks/useCoachCommandCatalog';
import { useOptionalStyleLensAppearance } from '../../../../core/style-lens-os/StyleLensProvider';
import { useCoachCommandCenterController } from '../coach-assistant/CoachCommandCenter.controller';
import { useCoachCommandCenterDrawerEffects } from '../coach-assistant/useCoachCommandCenterDrawerEffects';
import { useCoachKeyboardInset } from '../coach-assistant/hooks/useCoachKeyboardInset';
import { useAskAboutSession } from './useAskAboutSession';
import { useSwanCoachPendingFoodQuery } from '../coach-assistant/hooks/useSwanCoachPendingFoodQuery';
import { buildSwanCoachWorkoutLoggerRoute } from '../coach-assistant/SwanCoachWorkoutLoggerRoute';
import { buildSwanCoachWorkoutPlannerRoute } from '../coach-assistant/SwanCoachWorkoutPlannerRoute';
import {
  CLIENT_NEXT_ACTION_LABEL, CLIENT_WORKOUTS_ROUTE, type CoachReviewSection,
  isClientCoachRole, normalizeCoachCommandRole, resolveCoachCommandDashboardRole,
  reviewSectionFromRoute, routeForcedTabForRole,
} from '../coach-assistant/CoachCommandCenter.roleConfig';
import { resolveCoachWorkspaceLayout } from './coachWorkspaceLayout';
import { useWorkspacePanels } from './useWorkspacePanels';
import { scheduleRoleForUser, useTodaySchedule } from './useTodaySchedule';
import type { WorkspaceActionId } from './slashCommands';
import type { CoachPdfRequest } from './CoachProgressPdf';
import { pdfTarget } from './coachPdfRequest';

export type WorkspaceView = 'chat' | 'review';

const SCHEDULE_ROUTE: Record<'admin' | 'trainer' | 'client', string> = {
  admin: '/dashboard/admin/master-schedule',
  trainer: '/dashboard/trainer/schedule',
  client: '/dashboard/client/schedule',
};

export function useCoachWorkspaceModel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const authenticatedRole = normalizeCoachCommandRole(user?.role);
  const userRole = resolveCoachCommandDashboardRole(useLocation().pathname, authenticatedRole);
  const isClientMode = isClientCoachRole(userRole);
  // Plan 55 §3 C3 — raw role travels separately from the presentation role.
  const controller = useCoachCommandCenterController({ actorId: user?.id, userRole, rawRole: user?.role });
  const catalog = useCoachCommandCatalog(true);
  useSwanCoachPendingFoodQuery(controller.sendMessageWithFood, { binding: controller.publicationBinding });
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Lens → layout, panels ────────────────────────────────────────────
  const appearance = useOptionalStyleLensAppearance();
  const styleLensId = appearance?.state.committed.styleLensId ?? null;
  const layout = useMemo(() => resolveCoachWorkspaceLayout(styleLensId), [styleLensId]);
  const panels = useWorkspacePanels(layout, controller.shellRef);
  useCoachKeyboardInset(controller.shellRef);
  useCoachCommandCenterDrawerEffects({
    commandFormRef: controller.commandFormRef,
    commandText: controller.commandText,
    drawer: controller.drawer,
    leftRailRef: controller.leftRailRef,
    onCloseDrawer: controller.closeDrawer,
    rightRailRef: controller.rightRailRef,
    shellRef: controller.shellRef,
  });

  // ── View: chat or review (deep links keep working) ───────────────────
  const routeForcedTab = routeForcedTabForRole(searchParams, userRole);
  const routeReviewSection = reviewSectionFromRoute(searchParams);
  const [view, setView] = useState<WorkspaceView>(() => (!isClientMode && routeForcedTab === 'review' ? 'review' : 'chat'));
  const [reviewSection, setReviewSection] = useState<CoachReviewSection | null>(routeReviewSection);
  const [plaudUploadRequest, setPlaudUploadRequest] = useState(0);
  const handledPlaudRef = useRef(0);
  const { toggleSidebar, docking } = panels;
  useEffect(() => {
    if (routeForcedTab === 'review' && !isClientMode) { setView('review'); setReviewSection(routeReviewSection); }
    if (routeForcedTab === 'history' && !docking.sidebarDocked) toggleSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a route change is the trigger, not panel state
  }, [routeForcedTab, routeReviewSection, isClientMode]);
  useEffect(() => {
    if (view !== 'review' || reviewSection !== 'audio' || plaudUploadRequest === 0 || handledPlaudRef.current === plaudUploadRequest) return;
    handledPlaudRef.current = plaudUploadRequest;
    controller.handleStartPlaudUpload();
  }, [controller, plaudUploadRequest, reviewSection, view]);
  const openReview = useCallback((section: CoachReviewSection = 'intake') => {
    if (isClientMode) return;
    setView('review'); setReviewSection(section); panels.closeSheets();
  }, [isClientMode, panels]);
  const startPlaudUpload = useCallback(() => {
    openReview('audio'); setPlaudUploadRequest((count) => count + 1);
  }, [openReview]);
  const backToChat = useCallback(() => {
    setView('chat');
    window.setTimeout(() => controller.commandTextRef.current?.focus({ preventScroll: true }), 0);
  }, [controller.commandTextRef]);

  // ── Routes and labels ────────────────────────────────────────────────
  const routeClientId = controller.routeClientId;
  const workoutLoggerRoute = useMemo(
    () => buildSwanCoachWorkoutLoggerRoute({ userRole, selectedClientId: routeClientId, searchParams }),
    [routeClientId, searchParams, userRole],
  );
  const workoutPlannerRoute = useMemo(
    () => (isClientMode ? CLIENT_WORKOUTS_ROUTE : buildSwanCoachWorkoutPlannerRoute({
      userRole, selectedClientId: routeClientId, workflowReturnTo: controller.workflowReturnTo, searchParams,
    })),
    [controller.workflowReturnTo, isClientMode, routeClientId, searchParams, userRole],
  );
  const scopeLabel = isClientMode ? 'My training' : controller.selectedClientLabel;
  const loggerScopeLabel = routeClientId ? scopeLabel : 'My workout log';
  const nextActionLabel = isClientMode
    ? CLIENT_NEXT_ACTION_LABEL
    : controller.coachQueue.health?.nextOperatorAction?.label || null;
  const counts = {
    intake: isClientMode ? 0 : controller.summary.actionable,
    audio: isClientMode ? 0 : controller.summary.readyReview,
    drafts: isClientMode ? 0 : controller.summary.pendingDrafts,
  };
  const reviewTotal = counts.intake + counts.audio + counts.drafts;
  const scheduleRole = scheduleRoleForUser(user?.role);
  const scheduleRoute = SCHEDULE_ROUTE[scheduleRole === 'user' || !scheduleRole ? 'client' : scheduleRole];
  const clientPickerRoute = userRole === 'trainer' ? '/dashboard/trainer/clients?intent=log_workout' : '/dashboard/admin/client-management?intent=log_workout';

  // ── Today's schedule (Universal Master Schedule source) ──────────────
  const actorNumber = Number.isFinite(Number(user?.id)) ? Number(user?.id) : null;
  const schedule = useTodaySchedule(scheduleRole ?? 'client', actorNumber, Boolean(user && scheduleRole));

  // ── Composer helpers ─────────────────────────────────────────────────
  const [catalogOpen, setCatalogOpen] = useState(false);
  const prefill = useCallback((text: string) => {
    controller.setCommandText(text);
    if (view !== 'chat') setView('chat');
    window.setTimeout(() => {
      const el = controller.commandTextRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      el.setSelectionRange(el.value.length, el.value.length);
    }, 0);
  }, [controller, view]);
  /** One-tap send of an exact registry command (read-only Quick aliases, starters). */
  const sendCommand = useCallback((text: string, commandType: string) => {
    if (view !== 'chat') setView('chat');
    // No clear here: the send clears only what it sent, so a starter keeps a draft.
    void controller.handleIntentSubmit(text, commandType);
  }, [controller, view]);
  /** Adds to a draft instead of replacing it (schedule Ask, the command catalog). */
  const writeUnderDraft = useCallback((text: string) => {
    controller.setCommandText((current: string) => (current.trim() ? `${current.trimEnd()}\n${text}` : text));
    if (view !== 'chat') setView('chat');
    window.setTimeout(() => controller.commandTextRef.current?.focus({ preventScroll: true }), 0);
  }, [controller, view]);
  const [scheduleAskStatus, setScheduleAskStatus] = useState<string | null>(null);
  useEffect(() => {
    if (controller.commandBusy || controller.notebook?.saving) setScheduleAskStatus(null);
  }, [controller.commandBusy, controller.notebook?.saving]);
  const askAboutSession = useAskAboutSession({
    actorKey: user ? `${user.id}:${user.role}` : null,
    threadKey: searchParams.get('threadId') ?? '',
    noteMode: Boolean(controller.notebook?.active),
    admission: {
      phase: controller.selectionPhase,
      targetUserId: controller.selection.accepted?.targetUserId ?? null,
      requestGeneration: controller.selection.requestGeneration,
      returning: controller.selection.instructions?.kind === 'return',
    },
    clientPin: controller.clientPin, isClientMode, write: writeUnderDraft,
    closeSheets: panels.closeSheets, notify: setScheduleAskStatus,
  });

  // ── "Make me a PDF": built on this device, never sent to Swan Coach ───
  const [pdfRequest, setPdfRequest] = useState<CoachPdfRequest | null>(null);
  const pdfNonce = useRef(0);
  const closePdf = useCallback(() => setPdfRequest(null), []);
  const requestPdf = useCallback((text = ''): boolean => {
    pdfNonce.current += 1;
    if (isClientMode) {
      const self = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'My progress';
      setPdfRequest({ nonce: pdfNonce.current, kind: 'self', clientName: self, clientSource: user?.clientSource ?? null });
      return true;
    }
    const pin = controller.clientPin;
    const target = pdfTarget(text, pin.clients, pin.selectedClientId);
    if (!target) {
      setScheduleAskStatus('Pick the client with @ (or name them) — the PDF is built from their records on this device.');
      return false;
    }
    setPdfRequest({ nonce: pdfNonce.current, kind: 'client', clientId: target.id, clientName: target.label });
    return true;
  }, [controller.clientPin, isClientMode, user]);

  const runAction = useCallback((id: WorkspaceActionId) => {
    controller.setCommandText('');
    switch (id) {
      case 'new-chat': controller.handleNewThread(); setView('chat'); break;
      case 'review': openReview('intake'); break;
      case 'schedule': case 'context': panels.revealInspector(); break;
      case 'logger': if (workoutLoggerRoute) navigate(workoutLoggerRoute); break;
      case 'planner': if (workoutPlannerRoute) navigate(workoutPlannerRoute); break;
      case 'note': controller.notebook?.onToggle(); break;
      case 'draft-from-notes': controller.notebook?.onDraftWorkouts(); break;
      case 'catalog': setCatalogOpen(true); break;
      case 'pdf': requestPdf(); break;
      default: break;
    }
  }, [controller, navigate, openReview, panels, requestPdf, workoutLoggerRoute, workoutPlannerRoute]);

  return {
    user, userRole, scheduleRole, isClientMode, controller, catalog, layout, panels,
    view, setView, backToChat, reviewSection, setReviewSection, openReview, startPlaudUpload,
    searchParams, setSearchParams,
    workoutLoggerRoute, workoutPlannerRoute, scopeLabel, loggerScopeLabel, nextActionLabel,
    counts, reviewTotal, scheduleRoute, clientPickerRoute,
    schedule, prefill, writeUnderDraft, sendCommand, askAboutSession, scheduleAskStatus,
    runAction, catalogOpen, setCatalogOpen,
    pdfRequest, requestPdf, closePdf, notify: setScheduleAskStatus,
  };
}

export type CoachWorkspaceModel = ReturnType<typeof useCoachWorkspaceModel>;
