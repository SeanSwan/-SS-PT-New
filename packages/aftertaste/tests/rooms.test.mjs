import test from 'node:test';
import assert from 'node:assert/strict';
import { ROOMS, DOORS, PLAYER_RADIUS, inRoom, roomAt, resolveCollision, visibleRooms, startRoom } from '../src/world/rooms.js';

/** S6a — the map became a place with edges. These are the laws that make an edge trustworthy. */

test('the map is a TABLE: every room declares bounds, windows and a name', () => {
  assert.ok(Object.keys(ROOMS).length > 0);
  for (const [id, r] of Object.entries(ROOMS)) {
    assert.ok(r.name, `${id}.name`);
    for (const k of ['minX', 'maxX', 'minZ', 'maxZ']) assert.equal(typeof r.bounds[k], 'number', `${id}.bounds.${k}`);
    assert.ok(r.bounds.maxX > r.bounds.minX && r.bounds.maxZ > r.bounds.minZ, `${id} has real area`);
    assert.ok(Array.isArray(r.windows), `${id}.windows`);
    // A room with no way in is a room the director cannot use.
    if (!r.start) assert.ok(r.windows.length > 0, `${id} needs a way in`);
  }
  assert.ok(startRoom(), 'exactly one room must be the start');
});

test('a wall is a WALL: you cannot walk through it, from any direction', () => {
  const r = ROOMS['dining-hall'];
  for (const [x, z] of [[-999, 0], [999, 0], [0, -999], [0, 999], [-50, -50]]) {
    const out = resolveCollision(x, z, 'dining-hall');
    assert.ok(inRoom(r, out.x, out.z), `pushed to (${out.x}, ${out.z}) which is outside`);
    // And kept off the wall by the body's radius, not flush against it.
    assert.ok(out.x >= r.bounds.minX + PLAYER_RADIUS - 1e-9 && out.x <= r.bounds.maxX - PLAYER_RADIUS + 1e-9);
    assert.ok(out.z >= r.bounds.minZ + PLAYER_RADIUS - 1e-9 && out.z <= r.bounds.maxZ - PLAYER_RADIUS + 1e-9);
  }
});

test('standing in the open is left alone — collision only acts on contact', () => {
  const out = resolveCollision(0, -5, 'dining-hall');
  assert.deepEqual(out, { x: 0, z: -5 });
});

test('an obstacle pushes out the SHORTEST way — you never climb the counter', () => {
  const counter = ROOMS['dining-hall'].obstacles[0];
  // Enter from the front (higher z): the shortest way out is forward, not through the whole box.
  const front = resolveCollision(0, counter.maxZ - 0.1, 'dining-hall');
  assert.ok(front.z >= counter.maxZ + PLAYER_RADIUS - 1e-9, 'pushed out the front face');
  // Enter from the back: pushed back, not teleported across.
  const back = resolveCollision(0, counter.minZ + 0.1, 'dining-hall');
  assert.ok(back.z <= counter.minZ - PLAYER_RADIUS + 1e-9, 'pushed out the back face');
  // From the side, the x-axis is shallower and wins.
  const side = resolveCollision(counter.maxX - 0.05, 1.7, 'dining-hall');
  assert.ok(side.x >= counter.maxX + PLAYER_RADIUS - 1e-9, 'pushed out sideways');
});

test('an obstacle can never push you THROUGH a wall — walls are clamped last', () => {
  // A body squeezed against the west wall by a counter must still end up inside the room.
  const r = ROOMS['dining-hall'];
  for (let z = r.bounds.minZ; z <= r.bounds.maxZ; z += 0.5) {
    for (let x = r.bounds.minX; x <= r.bounds.maxX; x += 0.5) {
      const out = resolveCollision(x, z, 'dining-hall');
      assert.ok(inRoom(r, out.x, out.z), `(${x},${z}) resolved outside the room`);
    }
  }
});

test('roomAt answers where you are, and null where there is no floor', () => {
  assert.equal(roomAt(0, 0), 'dining-hall');
  assert.equal(roomAt(500, 500), null);
});

test('the hitscan broadphase sees your room, and only reaches further through OPEN doors', () => {
  assert.deepEqual([...visibleRooms('dining-hall')], ['dining-hall']);
  // With a door declared but shut, the far room stays invisible; open, it joins.
  const doors = { d1: { rooms: ['dining-hall', 'kitchen'], cost: 1250 } };
  assert.deepEqual([...visibleRooms('dining-hall', new Set(), doors)], ['dining-hall']);
  assert.deepEqual([...visibleRooms('dining-hall', new Set(['d1']), doors)].sort(), ['dining-hall', 'kitchen']);
});

test('an unknown room is a no-op, not a crash — the player never falls out of the world', () => {
  assert.deepEqual(resolveCollision(3, 4, 'nowhere'), { x: 3, z: 4 });
});
