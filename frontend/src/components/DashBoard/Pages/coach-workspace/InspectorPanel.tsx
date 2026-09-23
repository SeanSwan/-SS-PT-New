/**
 * Blueprint: InspectorPanel
 * Parent: CoachWorkspacePage. The right-hand context: who this chat is about
 * (and, when pinned, that client at a glance) and today's sessions (Universal
 * Master Schedule). "Waiting on you" lives in the thread rail (unified design),
 * so the inspector does not repeat it. Everything here is read + navigate; the only "action" buttons open
 * Review or pre-write a question — nothing in the inspector writes data.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Dumbbell, UserRound, X } from 'lucide-react';
import { InspectorCard, InspectorRoot } from './CoachWorkspace.panels.styles';
import TodaySchedulePanel from './TodaySchedulePanel';
import ClientGlanceCard from './ClientGlanceCard';
import type { CoachWorkspaceModel } from './useCoachWorkspaceModel';

type Props = { model: CoachWorkspaceModel };

const InspectorPanel: React.FC<Props> = ({ model }) => {
  const { controller, isClientMode, panels } = model;
  const pinned = !isClientMode && Boolean(controller.routeClientId);

  return (
    <InspectorRoot className="ws-inspector" id="ws-inspector" aria-label="Context and schedule">
      <div className="ws-insp-head">
        <span className="ws-insp-title">Context</span>
        <button type="button" className="ws-icon-btn ws-panel-close" aria-label="Close context" onClick={panels.closeSheets}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="ws-insp-scroll">
        <InspectorCard aria-labelledby="ws-scope-title">
          <div className="ws-card-head">
            <span className="ws-card-title" id="ws-scope-title">
              <UserRound size={15} aria-hidden="true" /> {isClientMode ? 'My training' : pinned ? model.scopeLabel : 'No client selected'}
            </span>
          </div>
          <p className="ws-card-note">
            {isClientMode
              ? 'Your coach sees your own logs, plan, and schedule.'
              : pinned
                ? 'This chat, notes, and drafts are scoped to this client.'
                : 'Pick a client with the @ chip in the composer to scope the chat, notes, and drafts.'}
          </p>
          <div className="ws-stat-row">
            {model.workoutLoggerRoute ? (
              <Link className="ws-primary" to={model.workoutLoggerRoute}>
                <Dumbbell size={14} aria-hidden="true" /> {isClientMode ? 'Log today' : 'Logger'}
              </Link>
            ) : null}
            {model.workoutPlannerRoute ? (
              <Link className="ws-primary" to={model.workoutPlannerRoute}>{isClientMode ? 'My workouts' : 'Planner'}</Link>
            ) : null}
          </div>
        </InspectorCard>

        {pinned && controller.clientPin.selectedClientId ? (
          <ClientGlanceCard
            key={controller.clientPin.selectedClientId}
            clientId={controller.clientPin.selectedClientId}
            clientName={model.scopeLabel}
            onFloor={() => model.startFloor(controller.clientPin.selectedClientId)}
            onPdf={() => model.requestPdfFor(controller.clientPin.selectedClientId as number)}
          />
        ) : null}

        <TodaySchedulePanel
          state={model.schedule.state}
          onRetry={() => { void model.schedule.refresh(); }}
          onAsk={model.askAboutSession}
          scheduleRoute={model.scheduleRoute}
          scheduleLabel={model.scheduleRole === 'admin' ? 'Master schedule' : 'Schedule'}
          clientMode={isClientMode}
        />
      </div>
    </InspectorRoot>
  );
};

export default InspectorPanel;
