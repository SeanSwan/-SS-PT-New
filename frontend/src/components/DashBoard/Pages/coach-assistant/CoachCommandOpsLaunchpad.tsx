/**
 * SUB-COMPONENT: CoachCommandOpsLaunchpad
 * PARENT: CoachCommandOpsRail
 * PURPOSE: Low-click workout/action launchpad for the Swan Coach Ops drawer.
 *
 * WIREFRAME:
 * [Workout command center heading]
 * [Active scope + "Nothing logs until you save in Logger" safety copy]
 * [Primary Log/Pick action]
 * [Builder] [Review intake] [Audio]
 *
 * DATA FLOW:
 * Props: selectedClientLabel, Logger/Planner routes, and event handlers.
 * State/API: none. This component does not fetch, mutate, or write workouts.
 * Children: route Links and review buttons.
 *
 * CLICK OUTCOMES:
 * Log/Pick: navigates to Logger or Client Hub.
 * Builder: navigates to Workout Planner.
 * Review intake: switches the parent to the Intake tab.
 * Audio: switches to the audio review lane and opens the uploader.
 *
 * ARCHITECTURE:
 * CoachCommandOpsRail -> CoachCommandOpsLaunchpad -> Link/button actions
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarCheck, ClipboardList, Dumbbell, FileAudio, Inbox, UserPlus } from 'lucide-react';

type CoachCommandOpsLaunchpadProps = {
  clientPickerRoute: string;
  selectedClientLabel: string;
  workoutLoggerRoute: string | null;
  workoutLoggerScopeLabel: string | null;
  workoutPlannerRoute: string | null;
  workflowReturnLabel: string | null;
  workflowReturnTo: string | null;
  onOpenIntake: () => void;
  onOpenPlaud: () => void;
};

type ActionBodyProps = {
  icon: React.ReactNode;
  title: string;
  note: string;
  showArrow?: boolean;
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

const CoachCommandOpsLaunchpad: React.FC<CoachCommandOpsLaunchpadProps> = ({
  clientPickerRoute,
  selectedClientLabel,
  workoutLoggerRoute,
  workoutLoggerScopeLabel,
  workoutPlannerRoute,
  workflowReturnLabel,
  workflowReturnTo,
  onOpenIntake,
  onOpenPlaud,
}) => {
  const scopeLabel = workoutLoggerRoute ? (workoutLoggerScopeLabel || selectedClientLabel) : 'No client locked';
  const hasLoggerRoute = Boolean(workoutLoggerRoute);
  const primaryCopy = primaryActionCopy(scopeLabel, hasLoggerRoute);
  const primaryHref = workoutLoggerRoute || clientPickerRoute;
  const showClientPicker = hasLoggerRoute && scopeLabel === 'My workout log';
  const targetNote = hasLoggerRoute
    ? workoutPlannerRoute
      ? 'Coach, Builder, and Logger point here.'
      : 'Coach and Logger point here.'
    : 'Pick a client so workout actions route correctly.';
  const safetyNote = hasLoggerRoute ? 'Save happens in Logger.' : 'No workout writes until a target is chosen.';

  return (
    <section className="panel workout-command-panel">
      <div className="section-title-row">
        <div>
          <h2 className="panel-title">Workout command center</h2>
          <p className="panel-subtitle">Pick one move: log, build, review intake, or import audio. Logger is the only save point.</p>
        </div>
        <Dumbbell size={19} aria-hidden="true" />
      </div>

      <div className={`workout-command-next ${hasLoggerRoute ? 'is-ready' : 'needs-target'}`} aria-label="Recommended Coach Actions move">
        <span className="workout-command-next-kicker">Do this next</span>
        <strong>{primaryCopy.title}</strong>
        <small>{hasLoggerRoute ? primaryCopy.note : 'Lock the client first so every action routes correctly.'}</small>
      </div>

      <div className={`workout-command-brief ${hasLoggerRoute ? 'is-ready' : 'needs-target'}`} aria-label="Coach Actions target and safety">
        <span className="workout-command-brief-item">
          <small>Target</small>
          <strong>{scopeLabel}</strong>
          <span>{targetNote}</span>
        </span>
        <span className="workout-command-brief-divider" aria-hidden="true" />
        <span className="workout-command-brief-item safety">
          <small>Safety</small>
          <strong>{hasLoggerRoute ? 'Review-gated' : 'Choose first'}</strong>
          <span>{safetyNote}</span>
        </span>
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

        {workflowReturnTo && workflowReturnLabel ? (
          <Link className="workout-command-card route" to={workflowReturnTo} aria-label="Resume workflow">
            <ActionBody icon={<ArrowLeft size={18} aria-hidden="true" />} title="Resume workflow" note={workflowReturnLabel} />
          </Link>
        ) : null}

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

        <button type="button" className="workout-command-card" onClick={onOpenPlaud} aria-label="Import audio">
          <ActionBody icon={<FileAudio size={18} aria-hidden="true" />} title="Audio" note="Import" />
        </button>
      </div>
    </section>
  );
};

export default CoachCommandOpsLaunchpad;
