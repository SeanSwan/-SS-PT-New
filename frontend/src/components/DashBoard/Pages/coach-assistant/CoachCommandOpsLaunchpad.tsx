/**
 * SUB-COMPONENT: CoachCommandOpsLaunchpad
 * PARENT: CoachCommandOpsRail
 * PURPOSE: Low-click workout/action launchpad for the Swan Coach Ops drawer.
 *
 * WIREFRAME:
 * [Coach launchpad heading]
 * [Active scope + "Nothing logs until you save in Logger" safety copy]
 * [Primary Log/Pick action]
 * [Builder] [Review intake] [Draft in chat] [PLAUD]
 *
 * DATA FLOW:
 * Props: selectedClientLabel, Logger/Planner routes, and event handlers.
 * State/API: none. This component does not fetch, mutate, or write workouts.
 * Children: route Links and prompt/review buttons.
 *
 * CLICK OUTCOMES:
 * Log/Pick: navigates to Logger or Client Hub.
 * Builder: navigates to Workout Planner.
 * Review intake: switches the parent to the Intake tab.
 * Draft in chat: stages a prompt in the Coach composer.
 * PLAUD: switches to the PLAUD tab and opens the uploader.
 *
 * ARCHITECTURE:
 * CoachCommandOpsRail -> CoachCommandOpsLaunchpad -> Link/button actions
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, ClipboardList, Dumbbell, FileAudio, Inbox, MessageSquareText, UserPlus } from 'lucide-react';

type CoachCommandOpsLaunchpadProps = {
  clientPickerRoute: string;
  selectedClientLabel: string;
  workoutLoggerRoute: string | null;
  workoutLoggerScopeLabel: string | null;
  workoutPlannerRoute: string | null;
  onOpenIntake: () => void;
  onOpenPlaud: () => void;
  onStageWorkoutLog: () => void;
};

type ActionBodyProps = {
  icon: React.ReactNode;
  title: string;
  note: string;
  showArrow?: boolean;
};

type MissionStep = {
  state: string;
  title: string;
  note: string;
  ready: boolean;
};

function ActionBody({ icon, title, note, showArrow = false }: ActionBodyProps) {
  return (
    <>
      <span className="workout-command-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{note}</small>
      </span>
      {showArrow ? <ArrowRight size={17} aria-hidden="true" /> : null}
    </>
  );
}

function primaryActionCopy(scopeLabel: string, hasLoggerRoute: boolean) {
  if (!hasLoggerRoute) {
    return {
      label: 'Pick client first',
      title: 'Pick client',
      note: 'Choose who this workout is for',
    };
  }

  return scopeLabel === 'My workout log'
    ? { label: 'Log my workout now', title: 'Log my workout', note: 'Use your admin self log' }
    : { label: 'Log workout now', title: 'Log workout', note: 'Open selected client Logger' };
}

function buildMissionSteps({
  hasLoggerRoute,
  scopeLabel,
  workoutPlannerRoute,
}: {
  hasLoggerRoute: boolean;
  scopeLabel: string;
  workoutPlannerRoute: string | null;
}): MissionStep[] {
  return [
    {
      state: hasLoggerRoute ? 'Scope locked' : 'Scope missing',
      title: hasLoggerRoute ? scopeLabel : 'Pick client first',
      note: hasLoggerRoute ? 'Coach, Builder, and Logger point here' : 'Choose who this workout is for',
      ready: hasLoggerRoute,
    },
    {
      state: workoutPlannerRoute ? 'Builder ready' : 'Logger ready',
      title: workoutPlannerRoute ? 'Build or log' : 'Log from Coach',
      note: workoutPlannerRoute ? 'Plan and Logger are one tap' : 'Use the direct Logger handoff',
      ready: true,
    },
    {
      state: 'Review gate',
      title: 'No silent writes',
      note: 'Save only in Logger or approval review',
      ready: true,
    },
  ];
}

const CoachCommandOpsLaunchpad: React.FC<CoachCommandOpsLaunchpadProps> = ({
  clientPickerRoute,
  selectedClientLabel,
  workoutLoggerRoute,
  workoutLoggerScopeLabel,
  workoutPlannerRoute,
  onOpenIntake,
  onOpenPlaud,
  onStageWorkoutLog,
}) => {
  const scopeLabel = workoutLoggerRoute ? (workoutLoggerScopeLabel || selectedClientLabel) : 'No client locked';
  const hasLoggerRoute = Boolean(workoutLoggerRoute);
  const primaryCopy = primaryActionCopy(scopeLabel, hasLoggerRoute);
  const missionSteps = buildMissionSteps({ hasLoggerRoute, scopeLabel, workoutPlannerRoute });
  const primaryHref = workoutLoggerRoute || clientPickerRoute;
  const showClientPicker = hasLoggerRoute && scopeLabel === 'My workout log';

  return (
    <section className="panel workout-command-panel">
      <div className="section-title-row">
        <div>
          <h2 className="panel-title">Coach launchpad</h2>
          <p className="panel-subtitle">One tap to log, build, review, or import for the active training scope.</p>
        </div>
        <Dumbbell size={19} aria-hidden="true" />
      </div>

      <div className={`workout-command-next ${hasLoggerRoute ? 'is-ready' : 'needs-target'}`} aria-label="Recommended Coach Ops move">
        <span className="workout-command-next-kicker">Do this next</span>
        <strong>{primaryCopy.title}</strong>
        <small>{hasLoggerRoute ? primaryCopy.note : 'Lock the client first so every action routes correctly.'}</small>
      </div>

      <ol className="workout-command-steps" aria-label="Coach Ops mission checklist">
        {missionSteps.map((step, index) => (
          <li className={`workout-command-step ${step.ready ? 'is-ready' : 'needs-action'}`} key={`${step.state}-${step.title}`}>
            <span className="workout-command-step-index">{index + 1}</span>
            <span>
              <span className="workout-command-step-state">{step.state}</span>
              <strong>{step.title}</strong>
              <small>{step.note}</small>
            </span>
          </li>
        ))}
      </ol>

      <div className={`workout-command-scope ${workoutLoggerRoute ? 'is-ready' : ''}`}>
        <span className="workout-command-scope-kicker">Active scope</span>
        <strong>{scopeLabel}</strong>
        <small>Nothing logs until you save in Logger.</small>
      </div>

      <div className="workout-command-primary-grid" aria-label="Priority coach actions">
        <Link
          className="workout-command-card mission full"
          to={primaryHref}
          aria-label={workoutLoggerRoute ? `${primaryCopy.label} - Open Logger` : primaryCopy.label}
        >
          <ActionBody
            icon={workoutLoggerRoute ? <CalendarCheck size={18} aria-hidden="true" /> : <UserPlus size={18} aria-hidden="true" />}
            title={primaryCopy.title}
            note={primaryCopy.note}
            showArrow
          />
        </Link>

        {workoutPlannerRoute ? (
          <Link className="workout-command-card route" to={workoutPlannerRoute} aria-label="Open workout builder - Open Planner">
            <ActionBody icon={<ClipboardList size={18} aria-hidden="true" />} title="Open builder" note="Create plan" />
          </Link>
        ) : null}

        {showClientPicker ? (
          <Link className="workout-command-card route" to={clientPickerRoute} aria-label="Pick a client for workout logging">
            <ActionBody icon={<UserPlus size={18} aria-hidden="true" />} title="Pick client" note="Log for someone else" />
          </Link>
        ) : null}

        <button type="button" className="workout-command-card" onClick={onOpenIntake} aria-label="Review next intake">
          <ActionBody icon={<Inbox size={18} aria-hidden="true" />} title="Review intake" note="Open queue" />
        </button>

        <button type="button" className="workout-command-card" onClick={onStageWorkoutLog} aria-label="Draft in chat">
          <ActionBody icon={<MessageSquareText size={18} aria-hidden="true" />} title="Draft in chat" note="Stage prompt only" />
        </button>

        <button type="button" className="workout-command-card" onClick={onOpenPlaud} aria-label="Import PLAUD audio">
          <ActionBody icon={<FileAudio size={18} aria-hidden="true" />} title="PLAUD" note="Import audio" />
        </button>
      </div>
    </section>
  );
};

export default CoachCommandOpsLaunchpad;
