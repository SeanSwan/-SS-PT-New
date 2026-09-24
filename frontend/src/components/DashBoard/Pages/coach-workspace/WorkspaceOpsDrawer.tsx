/**
 * Blueprint: WorkspaceOpsDrawer
 * Parent: CoachWorkspacePage. "More" opens the SAME operator tools the legacy
 * Command Center had (quick client add, teach mode, queue health, account
 * controls, Plaud/intake hand-offs) as a right sheet at every width, portaled
 * above the dashboard chrome. The workspace owns the sheet (position, scrim,
 * focus); CommandBridgeShell is inside it only so the rail's own class-based
 * styles apply. Escape + restore come from useCoachCommandCenterDrawerEffects;
 * the focus trap and the inert workspace behind the sheet are owned here.
 */
import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { workspaceTokens } from './workspaceTokens';
import { CommandBridgeShell } from '../coach-assistant/CoachCommandCenter.bridgeStyles';
import CoachCommandOpsRail from '../coach-assistant/CoachCommandOpsRail';
import type { CoachWorkspaceModel } from './useCoachWorkspaceModel';

type Props = { model: CoachWorkspaceModel };

const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const Sheet = styled.div`
  ${workspaceTokens}
  position: fixed; inset: 0; z-index: 10050;
  .ws-ops-scrim { position: absolute; inset: 0; border: 0; padding: 0; cursor: pointer; background: color-mix(in srgb, var(--ws-bg) 62%, transparent); }
  .ws-ops-panel {
    position: absolute; top: 0; right: 0; bottom: 0; width: min(440px, 94vw); overflow-y: auto; overscroll-behavior: contain;
    padding: 14px; background: var(--ws-panel); border-left: 1px solid var(--ws-line);
    box-shadow: -24px 0 60px color-mix(in srgb, var(--ws-bg) 70%, transparent);
  }
  /* The legacy rail positions itself as a drawer or an inline column by viewport;
     inside this sheet it is always plain content. */
  .ws-ops-panel .right-rail { position: static; transform: none; width: 100%; height: auto; max-height: none; padding: 0; border-radius: 0; inset: auto; }
  @media (max-width: 640px) { .ws-ops-panel { width: 100vw; border-left: 0; } }
`;

const WorkspaceOpsDrawer: React.FC<Props> = ({ model }) => {
  const { controller } = model;
  const [accountControlsOpen, setAccountControlsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  // NOT controller.rightRailRef: the legacy drawer effect would stamp a second
  // role=dialog/aria-modal onto the rail inside this modal (round-2 review #8).
  const opsRailRef = useRef<HTMLElement>(null);
  const open = !model.isClientMode && controller.drawer === 'right';
  // A real modal (review #7): focus moves in, Tab stays in, and everything behind
  // the sheet — the whole workspace — is inert and hidden from assistive tech.
  // Layout effect: the inert flag must be gone before closeDrawer's deferred
  // focus-restore reaches the (inside-the-workspace) trigger.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const behind = controller.shellRef.current as (HTMLElement & { inert?: boolean }) | null;
    if (behind) { behind.inert = true; behind.setAttribute('aria-hidden', 'true'); }
    const focusables = () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
      .filter((element) => !element.hasAttribute('disabled') && element.getClientRects().length > 0);
    const timer = window.setTimeout(() => focusables()[0]?.focus(), 0);
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      const inside = panelRef.current?.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || !inside)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !inside)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', trap);
      if (behind) { behind.inert = false; behind.removeAttribute('aria-hidden'); }
    };
  }, [controller.shellRef, open]);
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <Sheet role="presentation">
      <button type="button" className="ws-ops-scrim" aria-label="Close coach tools" tabIndex={-1} onClick={() => controller.closeDrawer()} />
      <div className="ws-ops-panel" ref={panelRef} role="dialog" aria-modal="true" aria-label="Coach tools">
      <CommandBridgeShell>
      <CoachCommandOpsRail
        accountControlsOpen={accountControlsOpen}
        clientPickerRoute={model.clientPickerRoute}
        drawer={controller.drawer}
        quickClientBusy={controller.quickClientBusy}
        quickClientError={controller.quickClientError}
        quickClientMessage={controller.quickClientMessage}
        quickClientName={controller.quickClientName}
        quickClientSource={controller.quickClientSource}
        queueHealthRows={controller.queueHealthRows}
        railRef={opsRailRef}
        rightRailItems={controller.rightRailItems}
        selectedClientLabel={model.scopeLabel}
        showAccountControls={model.userRole === 'admin'}
        teachMode={controller.teachMode}
        workoutLoggerRoute={model.workoutLoggerRoute}
        workoutLoggerScopeLabel={model.loggerScopeLabel}
        workoutPlannerRoute={model.workoutPlannerRoute}
        workflowReturnLabel={controller.workflowReturnLabel}
        workflowReturnTo={controller.workflowReturnTo}
        onAccountControlsToggle={() => setAccountControlsOpen((open) => !open)}
        onClose={controller.closeDrawer}
        onOpenIntake={() => { model.openReview('intake'); controller.closeDrawer(false); }}
        onOpenPlaud={() => { model.startPlaudUpload(); controller.closeDrawer(false); }}
        onQuickClientNameChange={controller.setQuickClientName}
        onQuickClientSourceChange={controller.setQuickClientSource}
        onQuickClientSubmit={controller.handleQuickClientSubmit}
        onTeachModeToggle={controller.toggleTeachMode}
      />
      </CommandBridgeShell>
      </div>
    </Sheet>,
    document.body,
  );
};

export default WorkspaceOpsDrawer;
