/**
 * frameOrder.js — the frame runs in a DECLARED order, not mount order.
 *
 * Correctness quietly depended on <Player /> being mounted before <Enemies /> ("strike lands only
 * if still in range" compares THIS frame's player position against the tick) — an accident a JSX
 * reorder would break with no failing test (GLM-5.3 hostile review, finding 9). R3F runs useFrame
 * callbacks by ascending priority; NEGATIVE values order callbacks without taking over rendering
 * (any positive priority tells R3F you will render manually — do not "fix" these to 1,2,3).
 *
 * The declared order: the player moves, the world ticks against that position, the camera parks
 * on the result, and the trigger fires from the final camera.
 *
 * Lives in its own module so App (which mounts everything) and the systems (which import the
 * order) never form an import cycle that works by evaluation-order luck.
 */
export const FRAME_ORDER = { player: -4, world: -3, camera: -2, trigger: -1 };
