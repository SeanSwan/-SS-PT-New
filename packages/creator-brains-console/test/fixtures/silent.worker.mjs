/**
 * ============================================================================
 * FILE: packages/creator-brains-console/test/fixtures/silent.worker.mjs
 * PURPOSE: A worker that answers NOTHING and does not exit, so a create can be
 *          driven through its DEADLINE branch deterministically (F04).
 * PART OF: Creator Brains Console (the S1-H12 add path)
 * ============================================================================
 *
 * WHY IT MUST NOT EXIT. `creator-add.mjs` has three separate ways for a worker to
 * fail to produce an answer — 'error', 'exit' and the deadline — and they reject
 * with different sentences. A fixture that simply returns would exit, hit the
 * 'exit' handler, and leave the deadline branch UNEXERCISED while the test still
 * passed. Holding a ref'd interval keeps the thread alive so the timer is what
 * ends it, which is the branch F04 is about.
 */
import { workerData } from 'node:worker_threads';

const port = workerData.port;

// Deliberately never answers, not even to acknowledge the request.
port.on('message', () => { /* silence is the point */ });

// Ref'd on purpose: an unreferenced worker would let Node exit, which would read
// as an exit failure rather than the timeout this fixture exists to produce.
setInterval(() => {}, 1000);
