/**
 * helpers.js — shared browser-test plumbing.
 *
 * WHY `admitted` EXISTS (S6b): a round no longer BEGINS with a flock. The director owes bodies and
 * the windows admit them one at a time, so `__swanEnemyPos.length > 0` — the old boot condition —
 * is now satisfied by a mob still queued OUTSIDE the barricade, which cannot be shot, cannot reach
 * you, and is not what any of these tests mean by "an enemy". Waiting for an admitted, living
 * monster is the honest boot condition for anything that fights one.
 */
export const admitted = (page, timeout = 40_000) => page.waitForFunction(
  () => (window.__swanEnemyPos ?? []).some((e) => !e.outside && e.state === 'alive'),
  null,
  { timeout },
);

/** The same, but for a specific face: wave composition is a cycle, so the fryling takes its turn. */
export const admittedType = (page, type, timeout = 60_000) => page.waitForFunction(
  (t) => (window.__swanEnemyPos ?? []).some((e) => !e.outside && e.state === 'alive' && e.type === t),
  type,
  { timeout },
);

/** Survive the wait: a stationary tester in a room gets killed, and `over` freezes the tick. */
export const immortal = (page) => page.evaluate(() => window.__swanGameStore.setState({ hp: 99999 }));

/**
 * Put a specific creature in the room, right now, and stop the intake.
 *
 * WHY INJECT RATHER THAN WAIT: a metered window admits roughly one monster every seven seconds and
 * wave composition is a cycle, so "wait until a fryling walks in" is a slow, load-dependent wait
 * that fails a few percent of the time on a busy machine — and a passing game then reads as a
 * broken one. The claims these tests make (a headshot severs; wave 2 contains the roach) are about
 * the CREATURE, not about the way in; the way in is proven on its own in windows.spec.js.
 */
export const place = (page, types) => page.evaluate(async (wanted) => {
  const { ROSTER } = await import('/src/enemies/roster.js');
  const { PARTS } = await import('/src/enemies/partsData.js');
  const store = window.__swanGameStore;
  const p = window.__swanPlayerPos;
  const enemies = wanted.map((type, i) => {
    const spec = ROSTER[type];
    return {
      id: `placed-${type}-${i}`,
      type,
      x: p.x + 3 + i * 2.2,
      z: p.z - 4,
      hp: spec.hp,
      aimRadius: spec.aimRadius * (spec.renderHeight ?? 1),
      renderScale: spec.renderHeight ?? 1,
      ...(PARTS[type] ? { parts: PARTS[type] } : {}),
      state: 'alive',
      stateSince: 0,
    };
  });
  // Budget spent = the director stops sending more, so the board stays exactly as posed.
  store.setState({ enemies, hp: 99999, director: { ...store.getState().director, budgetLeft: 0 } });
  return enemies.map((e) => e.id);
}, types);
