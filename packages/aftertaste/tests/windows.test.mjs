import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PANELS, TEAR_BEAT, CLIMB_SECONDS, QUEUE_CAP, freshWindow, isContested, canRepair, repair,
  stepWindow, releaseIfClimbing, boardUp, startRound, throughputSeconds,
} from '../src/systems/windows.js';

/** S6b — the bottleneck that turns a horde into a stream. Every edge, because this IS the loop. */

const at = (w, mob, t) => stepWindow(w, mob, t);

test('a window starts whole and uncontested', () => {
  const w = freshWindow('w1');
  assert.equal(w.panels, PANELS);
  assert.equal(isContested(w), false);
  assert.equal(canRepair(w), false, 'nothing to repair on an intact window');
});

test('a mob tears ONE panel per beat — never a wall in a frame', () => {
  let w = freshWindow('w1');
  const r1 = at(w, 'm1', 0); w = r1.window;
  assert.equal(r1.event, 'tear');
  assert.equal(w.panels, PANELS - 1);
  // Inside the same beat: nothing. This is the one-by-one promise at the frame level.
  for (const dt of [0.1, 0.5, TEAR_BEAT - 0.01]) {
    const r = at(w, 'm1', dt);
    assert.equal(r.event, null, `tore again after only ${dt}s`);
    assert.equal(r.window.panels, PANELS - 1);
  }
  const r2 = at(w, 'm1', TEAR_BEAT + 0.001);
  assert.equal(r2.event, 'tear');
  assert.equal(r2.window.panels, PANELS - 2);
});

test('the climb starts only when the LAST panel is gone, and takes real time', () => {
  let w = { ...freshWindow('w1'), panels: 1 };
  w = at(w, 'm1', 10).window;                 // the last panel falls
  assert.equal(w.panels, 0);
  assert.equal(isContested(w), false, 'a torn window is not yet a climbed one');

  w = at(w, 'm1', 11).window;                 // now it enters the opening
  assert.equal(w.climbing, 'm1');
  assert.equal(isContested(w), true);

  assert.equal(at(w, 'm1', 11 + CLIMB_SECONDS - 0.01).event, null, 'still climbing');
  const done = at(w, 'm1', 11 + CLIMB_SECONDS + 0.01);
  assert.equal(done.event, 'enter');
  assert.equal(done.window.climbing, null, 'the slot frees for the next one');
});

test('ONE at a time: a second mob cannot use, or FINISH, an occupied opening', () => {
  let w = { ...freshWindow('w1'), panels: 0 };
  w = at(w, 'm1', 5).window;
  assert.equal(w.climbing, 'm1');

  const early = at(w, 'm2', 5.5);
  assert.equal(early.event, null, 'm2 waits');
  assert.equal(early.window.climbing, 'm1', 'and cannot steal the slot');

  // THE REAL HAZARD, and the reason this assertion exists: past the climb duration, a step taken
  // for a DIFFERENT mob must not complete m1's climb. The first version of this test only checked
  // the early frame and passed with the identity guard deliberately deleted — it was watching the
  // moment where both behaviours look identical.
  const late = at(w, 'm2', 5 + CLIMB_SECONDS + 0.5);
  assert.equal(late.event, null, 'm2 cannot finish a climb that is not its own');
  assert.equal(late.window.climbing, 'm1', 'the slot still belongs to m1');
  // m1 itself still can.
  assert.equal(at(w, 'm1', 5 + CLIMB_SECONDS + 0.5).event, 'enter');
});

test('killing a climber frees the opening — but does NOT rebuild the wall', () => {
  let w = { ...freshWindow('w1'), panels: 0 };
  w = at(w, 'm1', 5).window;
  const freed = releaseIfClimbing(w, 'm1');
  assert.equal(freed.climbing, null);
  assert.equal(freed.panels, 0, 'the panels it tore stay torn');
  assert.deepEqual(releaseIfClimbing(freed, 'm9'), freed, 'killing a bystander changes nothing');
});

test('repair rebuilds one panel, and is BLOCKED while a mob is in the opening', () => {
  let w = { ...freshWindow('w1'), panels: 2 };
  const r = repair(w); w = { ...w, ...r };
  assert.equal(w.panels, 3);
  assert.equal(r.paid, true, 'the first repairs of a round pay');

  const contested = { ...freshWindow('w1'), panels: 0, climbing: 'm1' };
  assert.equal(canRepair(contested), false, 'you cannot board up a window someone is inside');
  assert.deepEqual(repair(contested), {});
});

test('the repair CAP limits what pays, never what is allowed — you can always defend', () => {
  const spent = { ...freshWindow('w1'), panels: 0, repairedThisRound: PANELS };
  const r = repair(spent, PANELS);
  assert.equal(r.panels, 1, 'the panel still goes up');
  assert.equal(r.paid, false, 'it just does not pay any more');
  // A new round restores what pays, and never un-breaks the window for you.
  const next = startRound({ ...spent, panels: 2 });
  assert.equal(next.repairedThisRound, 0);
  assert.equal(next.panels, 2, 'a new round does not repair your wall');
});

test('Board-Up restores an uncontested window and refuses a contested one', () => {
  assert.equal(boardUp({ ...freshWindow('w1'), panels: 1 }).panels, PANELS);
  const busy = { ...freshWindow('w1'), panels: 0, climbing: 'm1' };
  assert.deepEqual(boardUp(busy), busy, 'a mob mid-climb is not ejected by carpentry');
});

test('throughput is a NUMBER a round length can be built from', () => {
  assert.equal(throughputSeconds(), PANELS * TEAR_BEAT + CLIMB_SECONDS);
  assert.ok(throughputSeconds() > 5 && throughputSeconds() < 12,
    `one mob takes ${throughputSeconds()}s to get in — the dial the round pace turns on`);
  assert.ok(QUEUE_CAP >= 1 && QUEUE_CAP <= 5, 'a queue that grows without bound is an array leak');
});

test('a window with nobody at it is perfectly still — no idle state churn', () => {
  const w = { ...freshWindow('w1'), panels: 3 };
  const r = at(w, null, 100);
  assert.equal(r.event, null);
  assert.equal(r.window, w, 'the same object: an untouched window allocates nothing');
});
