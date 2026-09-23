/**
 * Blueprint: InspectorPanel
 * Parent: CoachWorkspacePage. The right-hand context: who this chat is about,
 * today's sessions (Universal Master Schedule), and what is waiting for
 * approval. Everything here is read + navigate; the only "action" buttons open
 * Review or pre-write a question — nothing in the inspector writes data.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Dumbbell, UserRound, X } from 'lucide-react';
import { InspectorCard, InspectorRoot } from './CoachWorkspace.panels.styles';
import TodaySchedulePanel from './TodaySchedulePanel';
import type { CoachWorkspaceModel } from './useCoachWorkspaceModel';

type Props = { model: CoachWorkspaceModel };

const InspectorPanel: React.FC<Props> = ({ model }) => {
  const { controller, isClientMode, panels } = model;
  const pinned = !isClientMode && Boolean(controller.routeClientId);
  const holds = controller.queueHealthRows.filter((row) => row.tone !== 'ready' && Number(row.value) > 0);

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

        <TodaySchedulePanel
          state={model.schedule.state}
          onRetry={() => { void model.schedule.refresh(); }}
          onAsk={model.askAboutSession}
          scheduleRoute={model.scheduleRoute}
          scheduleLabel={model.userRole === 'admin' ? 'Master schedule' : 'Schedule'}
          clientMode={isClientMode}
        />

        {!isClientMode ? (
          <InspectorCard aria-labelledby="ws-approvals-title">
            <div className="ws-card-head">
              <span className="ws-card-title" id="ws-approvals-title"><ClipboardCheck size={15} aria-hidden="true" /> Waiting on you</span>
            </div>
            <div className="ws-stat-row">
              <span className="ws-stat"><b>{model.counts.intake}</b><span>Intake</span></span>
              <span className="ws-stat"><b>{model.counts.audio}</b><span>Audio</span></span>
              <span className="ws-stat"><b>{model.counts.drafts}</b><span>Drafts</span></span>
            </div>
            {holds.length ? (
              <p className="ws-card-note" data-tone="warn">
                {holds.map((row) => `${row.value} ${row.label.toLowerCase()}`).join(' · ')}
              </p>
            ) : null}
            {model.nextActionLabel ? <p className="ws-card-note">Next: {model.nextActionLabel}</p> : null}
            <button type="button" className="ws-primary" onClick={() => model.openReview('intake')}>Open review</button>
          </InspectorCard>
        ) : null}
      </div>
    </InspectorRoot>
  );
};

export default InspectorPanel;
