/**
 * Blueprint: FloorLive — the live session for ONE client (Floor mode)
 * Parent: FloorView, which keys this component by client id, so switching the
 * @ client remounts it with that client's own stored sets and plan.
 * The current exercise huge, weight × reps with 56px steppers, "Save set", and
 * "Session so far" beside it. Sets stay on this device until "End session",
 * which saves once through the Workout Logger's own payload and service.
 *
 * The coach is still here: the SAME composer at the bottom (one conversation).
 * A set typed or dictated on its own ("145 for 6") fills the dials; anything
 * longer is an ordinary message. The latest coach turn shows here in full — an
 * approval card keeps its Approve / Cancel buttons, so Floor never hides one.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Feather, Minus, Plus, Undo2 } from 'lucide-react';
import WorkspaceComposer from './WorkspaceComposer';
import TurnEntry, { turnKind } from './TurnEntry';
import { useFloorSession } from './useFloorSession';
import { parseSetUtterance } from './floorSession';
import { nameClientTokens, useCoachClientNames } from '../coach-assistant/coachClientNames';
import type { CoachWorkspaceModel } from './useCoachWorkspaceModel';

type Props = { model: CoachWorkspaceModel; clientId: number; who: string };

const plural = (count: number) => `${count} set${count === 1 ? '' : 's'}`;

const FloorLive: React.FC<Props> = ({ model, clientId, who }) => {
  const { controller } = model;
  const names = useCoachClientNames();
  const floor = useFloorSession(model.user ? `${model.user.id}:${model.user.role}` : null, clientId);
  const [newName, setNewName] = useState('');
  const current = floor.current;
  const setNumber = (current?.sets.length ?? 0) + 1;
  const heard = current ? parseSetUtterance(controller.commandText) : null;
  const latest = controller.logs.find((entry) => entry.actor !== 'operator');
  const latestKind = latest ? turnKind(latest) : null;

  // The composer hands a bare set to the dials only while there is an exercise to log it to.
  const { setDraft } = floor;
  const sink = model.floorSetSink;
  useEffect(() => {
    sink.current = current ? setDraft : null;
    return () => { sink.current = null; };
  }, [current, setDraft, sink]);

  const live = useRef(controller);
  live.current = controller;
  const handlers = useMemo(() => ({
    onCancelCommand: (...args: Parameters<typeof controller.handleCancelCommand>) => live.current.handleCancelCommand(...args),
    onConfirmCommand: (...args: Parameters<typeof controller.handleConfirmCommand>) => live.current.handleConfirmCommand(...args),
    onRetryMessage: (message: string) => { void live.current.handleRetryMessage(message); },
    onSpeak: (text: string) => live.current.speakText(text),
  }), []);

  return (
    <div className="ws-floor-grid">
      <main className="ws-floor-main">
        <section className="ws-floor-stage" aria-labelledby="ws-floor-ex">
          {current ? (
            <>
              <span className="ws-floor-eyebrow">
                {who} · Exercise {floor.index + 1} of {floor.exercises.length} · Set {setNumber}{current.targetSets ? ` of ${current.targetSets}` : ''}
              </span>
              <div className="ws-floor-title">
                <button type="button" className="ws-floor-nav" aria-label="Previous exercise" disabled={floor.index === 0} onClick={() => floor.goTo(floor.index - 1)}><ChevronLeft size={22} aria-hidden="true" /></button>
                <h1 id="ws-floor-ex">{current.name}</h1>
                <button type="button" className="ws-floor-nav" aria-label="Next exercise" disabled={floor.index >= floor.exercises.length - 1} onClick={() => floor.goTo(floor.index + 1)}><ChevronRight size={22} aria-hidden="true" /></button>
              </div>
              <div className="ws-floor-dials">
                <div className="ws-dial">
                  <button type="button" aria-label="Lower weight by 5 pounds" onClick={() => floor.adjust('weight', -5)}><Minus size={24} aria-hidden="true" /></button>
                  <output aria-label="Weight in pounds">{floor.draft.weight}</output>
                  <button type="button" aria-label="Raise weight by 5 pounds" onClick={() => floor.adjust('weight', 5)}><Plus size={24} aria-hidden="true" /></button>
                  <span>pounds</span>
                </div>
                <span className="ws-dial-x" aria-hidden="true">×</span>
                <div className="ws-dial">
                  <button type="button" aria-label="One fewer rep" onClick={() => floor.adjust('reps', -1)}><Minus size={24} aria-hidden="true" /></button>
                  <output aria-label="Reps">{floor.draft.reps}</output>
                  <button type="button" aria-label="One more rep" onClick={() => floor.adjust('reps', 1)}><Plus size={24} aria-hidden="true" /></button>
                  <span>reps{current.targetReps ? ` · target ${current.targetReps}` : ''}</span>
                </div>
              </div>
              <div className="ws-floor-row">
                <button type="button" className="ws-floor-btn" disabled={!current.sets.length} onClick={floor.undoLastSet}><Undo2 size={16} aria-hidden="true" /> Undo last set</button>
                <button type="button" className="ws-floor-save" disabled={floor.draft.reps < 1} onClick={floor.saveSet}>Save set {setNumber}</button>
              </div>
            </>
          ) : (
            <div className="ws-floor-pick">
              <span className="ws-floor-eyebrow">{who}</span>
              <h1>{floor.plan.status === 'loading' ? 'Loading the plan…' : 'No plan day for this session'}</h1>
              {floor.plan.status !== 'loading' ? <p>Add the first exercise and start logging.</p> : null}
            </div>
          )}
          <form className="ws-floor-add" onSubmit={(event) => { event.preventDefault(); floor.addExercise(newName); setNewName(''); }}>
            <label className="ws-sr" htmlFor="ws-floor-new">Add an exercise</label>
            <input id="ws-floor-new" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Add an exercise…" />
            <button type="submit" className="ws-floor-btn" disabled={!newName.trim()}>Add</button>
          </form>
        </section>

        <section className="ws-floor-coach" aria-label="Swan Coach">
          {heard ? (
            <button type="button" className="ws-floor-heard" onClick={() => { floor.setDraft(heard); controller.setCommandText(''); }}>
              Use {heard.weight} × {heard.reps} for set {setNumber}
            </button>
          ) : null}
          {latest && latestKind === 'coach' ? (
            <p className="ws-floor-said"><Feather size={15} aria-hidden="true" /> {nameClientTokens(latest.body, names).slice(0, 220)}</p>
          ) : null}
          {latest && latestKind !== 'coach' ? (
            <div className="ws-floor-turn"><TurnEntry entry={latest} {...handlers} workoutLoggerRoute={model.workoutLoggerRoute} workoutLoggerScopeLabel={model.loggerScopeLabel} /></div>
          ) : null}
          <WorkspaceComposer model={model} />
        </section>
      </main>

      <aside className="ws-floor-side" aria-labelledby="ws-sofar">
        <h2 id="ws-sofar">Session so far</h2>
        <ol>
          {floor.exercises.map((exercise, index) => (
            <li key={`${exercise.name}-${index}`}>
              <button type="button" aria-current={index === floor.index ? 'step' : undefined} onClick={() => floor.goTo(index)}>
                <b>{exercise.name}</b>
                <span>
                  {exercise.sets.length
                    ? exercise.sets.map((set) => `${set.weight} × ${set.reps}`).join(' · ')
                    : exercise.targetSets || exercise.targetReps ? `Planned ${exercise.targetSets ?? '?'} × ${exercise.targetReps ?? '?'}` : 'Not started'}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className="ws-floor-end" data-phase={floor.save.phase}>
          <span className="ws-floor-eyebrow">Saves when you end</span>
          <p role="status" aria-live="polite">
            {floor.save.phase === 'saved' ? `Saved to ${who}’s workout log and progress charts.`
              : floor.save.phase === 'conflict' || floor.save.phase === 'failed' ? floor.save.message
                : floor.loggedSets ? `${plural(floor.loggedSets)} on this device. Nothing is saved until you end the session.`
                  : 'Sets you save stay on this device, then land in the workout log when you end the session.'}
          </p>
          <button type="button" className="ws-floor-save" disabled={!floor.loggedSets || floor.save.phase === 'saving'} onClick={() => { void floor.endAndSave(); }}>
            {floor.save.phase === 'saving' ? 'Saving…' : floor.loggedSets ? `End session · save ${plural(floor.loggedSets)}` : 'End session'}
          </button>
          {floor.save.phase === 'conflict' && model.workoutLoggerRoute ? <Link className="ws-floor-btn" to={model.workoutLoggerRoute}>Open the workout logger</Link> : null}
        </div>
      </aside>
    </div>
  );
};

export default FloorLive;
