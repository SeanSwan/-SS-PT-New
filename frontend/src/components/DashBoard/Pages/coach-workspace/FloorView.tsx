/**
 * Blueprint: FloorView (Floor mode)
 * Parent: CoachWorkspacePage, when the header view is "Floor" — one click from
 * Chat or Today. A live session for ONE client, built for a phone on a rack:
 * the current exercise huge, weight × reps with 56px steppers, "Save set", and
 * "Session so far" beside it. Sets stay on this device until "End session",
 * which saves once through the Workout Logger's own payload and service.
 *
 * The coach is still here: the SAME composer sits at the bottom (dictation,
 * voice recorder, send — one conversation), and a spoken or typed set such as
 * "145 for 6" offers itself as the next set. Nothing is logged by the model.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Feather, Minus, Plus, Undo2 } from 'lucide-react';
import { FloorRoot } from './CoachWorkspace.floor.styles';
import WorkspaceComposer from './WorkspaceComposer';
import { useFloorSession } from './useFloorSession';
import { parseSetUtterance } from './floorSession';
import { nameClientTokens, useCoachClientNames } from '../coach-assistant/coachClientNames';
import type { CoachWorkspaceModel } from './useCoachWorkspaceModel';

type Props = { model: CoachWorkspaceModel };

const FloorView: React.FC<Props> = ({ model }) => {
  const { controller, isClientMode } = model;
  const names = useCoachClientNames();
  const clientId = isClientMode ? (Number(model.user?.id) || null) : (controller.clientPin.selectedClientId ?? null);
  const who = isClientMode ? 'My session' : model.scopeLabel;
  const actorKey = model.user ? `${model.user.id}:${model.user.role}` : null;
  const floor = useFloorSession(actorKey, clientId);
  const [newName, setNewName] = useState('');
  const heard = parseSetUtterance(controller.commandText);
  const lastCoach = controller.logs.find((entry) => entry.actor === 'coach');
  const confirmEnd = floor.loggedSets > 0 && floor.save.phase !== 'saving';
  const { setDraft } = floor;
  const sink = model.floorSetSink;
  useEffect(() => {
    sink.current = clientId ? setDraft : null;
    return () => { sink.current = null; };
  }, [clientId, setDraft, sink]);

  if (!clientId) {
    return (
      <FloorRoot aria-label="Floor mode">
        <div className="ws-floor-pick">
          <h1>Who are you training?</h1>
          <p>Pick the client with the @ chip, or start their session from Today. Floor mode logs their sets.</p>
          <button type="button" className="ws-floor-btn" onClick={() => model.showView('today')}>Open Today</button>
        </div>
        <WorkspaceComposer model={model} />
      </FloorRoot>
    );
  }

  const current = floor.current;
  const setNumber = (current?.sets.length ?? 0) + 1;

  return (
    <FloorRoot aria-label={`Floor mode — ${who}`}>
      <div className="ws-floor-grid">
        <main className="ws-floor-main">
          <section className="ws-floor-stage" aria-labelledby="ws-floor-ex">
            {current ? (
              <>
                <span className="ws-floor-eyebrow">
                  Exercise {floor.index + 1} of {floor.exercises.length} · Set {setNumber}{current.targetSets ? ` of ${current.targetSets}` : ''}
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
                <h1>{floor.plan.status === 'loading' ? 'Loading today’s plan…' : 'No plan day for today'}</h1>
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
            {heard && current ? (
              <button type="button" className="ws-floor-heard" onClick={() => { floor.setDraft(heard); controller.setCommandText(''); }}>
                Use {heard.weight} × {heard.reps} for set {setNumber}
              </button>
            ) : null}
            {lastCoach ? (
              <p className="ws-floor-said"><Feather size={15} aria-hidden="true" /> {nameClientTokens(lastCoach.body, names).slice(0, 220)}</p>
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
                  : floor.loggedSets ? `${floor.loggedSets} set${floor.loggedSets === 1 ? '' : 's'} on this device. You review once, at the end.`
                    : 'Every set you save lands in the workout log when you end the session.'}
            </p>
            <button type="button" className="ws-floor-save" disabled={!confirmEnd} onClick={() => { void floor.endAndSave(); }}>
              {floor.save.phase === 'saving' ? 'Saving…' : floor.loggedSets ? `End session · save ${floor.loggedSets} set${floor.loggedSets === 1 ? '' : 's'}` : 'End session'}
            </button>
            {floor.save.phase === 'conflict' && model.workoutLoggerRoute ? <Link className="ws-floor-btn" to={model.workoutLoggerRoute}>Open the workout logger</Link> : null}
          </div>
        </aside>
      </div>
    </FloorRoot>
  );
};

export default FloorView;
