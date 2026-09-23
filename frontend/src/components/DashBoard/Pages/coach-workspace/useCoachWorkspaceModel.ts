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
import { useTodaySchedule } from './useTodaySchedule';
import type { WorkspaceActionId } from './slashCommands';

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
  const scheduleRoute = SCHEDULE_ROUTE[userRole];
  const clientPickerRoute = userRole === 'trainer' ? '/dashboard/trainer/clients?intent=log_workout' : '/dashboard/admin/client-management?intent=log_workout';

  // ── Today's schedule (Universal Master Schedule source) ──────────────
  const actorNumber = Number.isFinite(Number(user?.id)) ? Number(user?.id) : null;
  const rawRole = user?.role === 'user' ? 'user' : userRole;
  const schedule = useTodaySchedule(rawRole, actorNumber, Boolean(user));

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
    controller.setCommandText('');
    void controller.handleIntentSubmit(text, commandType);
  }, [controller, view]);
  /** "Ask coach" from a schedule row: scope by client ID, prompt by time — never by name (rule 8). */
  /** Adds to a draft instead of replacing it (schedule Ask). */
  const writeUnderDraft = useCallback((text: string) => {
    controller.setCommandText((current: string) => (current.trim() ? `${current.trimEnd()}\n${text}` : text));
    if (view !== 'chat') setView('chat');
    window.setTimeout(() => controller.commandTextRef.current?.focus({ preventScroll: true }), 0);
  }, [controller, view]);
  const askAboutSession = useAskAboutSession({ clientPin: controller.clientPin, isClientMode, write: writeUnderDraft, closeSheets: panels.closeSheets });

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
      default: break;
    }
  }, [controller, navigate, openReview, panels, workoutLoggerRoute, workoutPlannerRoute]);

  return {
    user, userRole, isClientMode, controller, catalog, layout, panels,
    view, setView, backToChat, reviewSection, setReviewSection, openReview, startPlaudUpload,
    searchParams, setSearchParams,
    workoutLoggerRoute, workoutPlannerRoute, scopeLabel, loggerScopeLabel, nextActionLabel,
    counts, reviewTotal, scheduleRoute, clientPickerRoute,
    schedule, prefill, sendCommand, askAboutSession, runAction, catalogOpen, setCatalogOpen,
  };
}

export type CoachWorkspaceModel = ReturnType<typeof useCoachWorkspaceModel>;
