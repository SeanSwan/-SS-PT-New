import { orderPoolWithBrain } from 'file:///C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-luna-01a098de-20260913/backend/services/bootcamp/bootcampBrain.mjs';
const pool = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const base = { pool, dayTypeId: 'lower_body' };
const llm = { SWAN_BOOTCAMP_BRAIN: 'llm' };
const reply = '{"orderedKeys":["ex_0","ex_1","ex_2"]}';
const t0 = Date.now();
const at = () => `${Date.now() - t0}ms`;

// A: settles LATE (3000ms) against a 1000ms deadline. Times out at 1000ms, grace releases at 2500ms,
// then A settles at 3000ms - AFTER its own grace, which is the stale-timer case.
const a = await orderPoolWithBrain({ ...base, env: { ...llm, SWAN_BOOTCAMP_BRAIN_TIMEOUT_MS: '50' },
  completionFn: () => new Promise((r) => setTimeout(() => r(reply), 3000)) });
console.log(`${at()} A: ${a.fallbackReason} (expect timeout: the late success must be discarded)`);

await sleep(1600);                       // t ~= 2600ms: past A's grace (2500), before A settles (3000)
console.log(`${at()} claiming slot with B (never settles)`);
const bPromise = orderPoolWithBrain({ ...base, env: llm, completionFn: () => new Promise(() => {}) });
await sleep(400);                        // t ~= 3000ms: A settles HERE, while B holds the slot

let cCalls = 0;
const c = await orderPoolWithBrain({ ...base, env: llm,
  completionFn: async () => { cCalls += 1; return reply; } });
console.log(`${at()} C while B holds: reason=${c.fallbackReason} adapterCalls=${cCalls}`);
console.log(c.fallbackReason === 'brain_busy' && cCalls === 0
  ? 'PASS: stale release from A did NOT free B\'s slot'
  : 'FAIL: B\'s slot was freed while B was still unsettled');
const b = await bPromise;
console.log(`${at()} B: ${b.fallbackReason}`);