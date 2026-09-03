/**
 * rooms.js — the map as DATA (Beyond-Zombies S6a).
 *
 * TEACHING NOTE — A ROOM IS A ROW, LIKE EVERYTHING ELSE:
 * The map is not geometry someone modelled; it is a table. Each row carries its bounds, its
 * windows, the doors that reach it and what they cost, and what can be bought on its walls.
 * Adding a second map is adding rows — the same promise the roster and the weapon table make.
 *
 * TEACHING NOTE — WHY AABB AND NOT A PHYSICS ENGINE:
 * Every wall in this map is axis-aligned, so "am I inside" is four comparisons and "push me out"
 * is one clamp. A physics engine would bring a solver, a tick budget, and a whole class of
 * tunnelling bugs to answer a question arithmetic already answers exactly. Rapier was dropped from
 * the MVP for this reason (blueprint C11); this is that decision, cashed.
 *
 * The bounds are the INTERIOR: a player at exactly minX is standing against the wall, not in it.
 * Doorways are gaps punched in a shared wall — a door row names the two rooms it joins and the
 * span along the shared edge that is open once bought.
 */

/** How far the player's body keeps off a wall. Half a shoulder-width; the camera sits inside it. */
export const PLAYER_RADIUS = 0.4;

export const ROOMS = {
  'dining-hall': {
    name: 'The Dining Hall',
    start: true,
    // A wide room: the first fight needs space to learn the guns in.
    bounds: { minX: -12, maxX: 12, minZ: -10, maxZ: 10 },
    // Windows sit ON a wall, facing in. `at` is the centre of the opening.
    windows: [
      { id: 'dh-w1', at: { x: -12, z: -4 }, facing: 'west' },
      { id: 'dh-w2', at: { x: 12, z: 4 }, facing: 'east' },
    ],
    // Cover the player can break line-of-sight behind — an AABB the same collision code handles.
    obstacles: [
      { id: 'dh-counter', minX: -3, maxX: 3, minZ: 1, maxZ: 2.4 },
    ],
    wallBuys: [],
  },
};

/**
 * Doors join two rooms through a gap in the wall they share. Locked until bought; buying is
 * permanent for the run, which is what makes opening one a commitment rather than a toggle.
 */
export const DOORS = {};

export const startRoom = () => Object.entries(ROOMS).find(([, r]) => r.start)?.[0] ?? null;

/** Is this point inside the room's interior (ignoring obstacles)? */
export const inRoom = (room, x, z) =>
  x >= room.bounds.minX && x <= room.bounds.maxX && z >= room.bounds.minZ && z <= room.bounds.maxZ;

/** Which room contains this point — null when the point is in a wall or outside the map. */
export function roomAt(x, z, rooms = ROOMS) {
  for (const [id, room] of Object.entries(rooms)) if (inRoom(room, x, z)) return id;
  return null;
}

/**
 * Push a point out of any solid it is inside, and keep it inside its room's walls.
 *
 * SHORTEST-AXIS RESOLUTION: when you are inside a box, the honest way out is the nearest face.
 * Resolving on the wrong axis is what makes a player "climb" a counter they walked into, and
 * resolving on BOTH axes at once is what makes them stick in corners. One axis, the shallowest
 * penetration, every frame.
 */
export function resolveCollision(x, z, roomId, rooms = ROOMS, radius = PLAYER_RADIUS) {
  const room = rooms[roomId];
  if (!room) return { x, z };
  let px = x; let pz = z;

  // Obstacles first: they sit inside the room, so a push out of one must still be re-clamped
  // by the walls afterwards — a counter against a wall could otherwise push you through it.
  for (const o of room.obstacles ?? []) {
    const insideX = px > o.minX - radius && px < o.maxX + radius;
    const insideZ = pz > o.minZ - radius && pz < o.maxZ + radius;
    if (!insideX || !insideZ) continue;
    const left = px - (o.minX - radius);
    const right = (o.maxX + radius) - px;
    const back = pz - (o.minZ - radius);
    const front = (o.maxZ + radius) - pz;
    const min = Math.min(left, right, back, front);
    if (min === left) px = o.minX - radius;
    else if (min === right) px = o.maxX + radius;
    else if (min === back) pz = o.minZ - radius;
    else pz = o.maxZ + radius;
  }

  // Then the walls. A clamp, not a push: the room is where you are allowed to be.
  px = Math.max(room.bounds.minX + radius, Math.min(room.bounds.maxX - radius, px));
  pz = Math.max(room.bounds.minZ + radius, Math.min(room.bounds.maxZ - radius, pz));
  return { x: px, z: pz };
}

/**
 * The rooms a shot can reach from `roomId` — the hitscan broadphase (blueprint §2.5 / GLM #6).
 * Today one room; when doors exist, an OPEN door adds its far side. A shotgun's eight pellets ride
 * this same list, so the cost of a trigger pull is bounded by the room you are standing in rather
 * than by how many monsters exist in the world.
 */
export function visibleRooms(roomId, openDoors = new Set(), doors = DOORS) {
  const out = new Set([roomId]);
  for (const [id, d] of Object.entries(doors)) {
    if (!openDoors.has(id)) continue;
    if (d.rooms[0] === roomId) out.add(d.rooms[1]);
    if (d.rooms[1] === roomId) out.add(d.rooms[0]);
  }
  return out;
}
