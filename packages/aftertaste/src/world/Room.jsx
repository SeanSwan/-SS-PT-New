/**
 * Room.jsx — the map, drawn from the same rows the collision reads (S6a).
 *
 * ONE SOURCE OF TRUTH FOR A WALL: this component renders `rooms.js`, it does not describe a room
 * of its own. A wall you can see in a place the collision does not know about is the worst bug a
 * level can have — it is invisible in every test and obvious in the first second of play. Drawing
 * from the data makes that class of bug unrepresentable.
 *
 * Walls are boxes rather than planes so they read as architecture from both sides and take the
 * sun's shadow honestly; the interior faces are what the player ever sees.
 */
import { useMemo } from 'react';
import { ROOMS } from './rooms.js';

const WALL_HEIGHT = 3.2;
const WALL_THICKNESS = 0.4;

/** A window is a GAP: the wall segment is drawn in two pieces with an opening between them. */
const WINDOW_WIDTH = 2.2;

function Wall({ x, z, width, depth, height = WALL_HEIGHT }) {
  return (
    <mesh position={[x, height / 2, z]} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      {/* Grimy food-court plaster: dark enough to keep the monsters readable against it, warm
          enough not to read as the void the fog already provides. */}
      <meshStandardMaterial color="#2b2723" roughness={0.95} metalness={0} />
    </mesh>
  );
}

/** One side of the room, split around any windows that sit on it. */
function Side({ axis, fixed, from, to, windows }) {
  const gaps = windows
    .map((w) => (axis === 'x' ? w.at.z : w.at.x))
    .sort((a, b) => a - b);
  const pieces = [];
  let cursor = from;
  for (const centre of gaps) {
    const gapStart = centre - WINDOW_WIDTH / 2;
    if (gapStart > cursor) pieces.push([cursor, gapStart]);
    cursor = centre + WINDOW_WIDTH / 2;
  }
  if (cursor < to) pieces.push([cursor, to]);

  return pieces.map(([a, b], i) => {
    const mid = (a + b) / 2;
    const len = b - a;
    return axis === 'x'
      ? <Wall key={i} x={fixed} z={mid} width={WALL_THICKNESS} depth={len} />
      : <Wall key={i} x={mid} z={fixed} width={len} depth={WALL_THICKNESS} />;
  });
}

export default function Room({ id = 'dining-hall' }) {
  const room = ROOMS[id];
  const sides = useMemo(() => {
    if (!room) return null;
    const { minX, maxX, minZ, maxZ } = room.bounds;
    const on = (facing) => room.windows.filter((w) => w.facing === facing);
    return [
      { key: 'w', axis: 'x', fixed: minX - WALL_THICKNESS / 2, from: minZ, to: maxZ, windows: on('west') },
      { key: 'e', axis: 'x', fixed: maxX + WALL_THICKNESS / 2, from: minZ, to: maxZ, windows: on('east') },
      { key: 'n', axis: 'z', fixed: minZ - WALL_THICKNESS / 2, from: minX, to: maxX, windows: on('north') },
      { key: 's', axis: 'z', fixed: maxZ + WALL_THICKNESS / 2, from: minX, to: maxX, windows: on('south') },
    ];
  }, [room]);
  if (!room) return null;

  return (
    <group name="room">
      {sides.map((s) => <group key={s.key}><Side {...s} /></group>)}

      {/* Cover: the same AABBs resolveCollision() pushes you out of, drawn where they actually are. */}
      {(room.obstacles ?? []).map((o) => (
        <mesh
          key={o.id}
          position={[(o.minX + o.maxX) / 2, 0.55, (o.minZ + o.maxZ) / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[o.maxX - o.minX, 1.1, o.maxZ - o.minZ]} />
          <meshStandardMaterial color="#3a3129" roughness={0.8} />
        </mesh>
      ))}

      {/* A frame around each opening, so a window reads as a way IN rather than a hole in a wall. */}
      {room.windows.map((w) => (
        <mesh key={w.id} position={[w.at.x, 1.6, w.at.z]}>
          <boxGeometry args={[
            w.facing === 'west' || w.facing === 'east' ? 0.5 : WINDOW_WIDTH,
            2.4,
            w.facing === 'west' || w.facing === 'east' ? WINDOW_WIDTH : 0.5,
          ]}
          />
          <meshStandardMaterial color="#60C0F0" emissive="#1c4a66" transparent opacity={0.18} />
        </mesh>
      ))}
    </group>
  );
}
