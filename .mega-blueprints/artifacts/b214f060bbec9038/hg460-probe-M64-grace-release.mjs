import { orderPoolWithBrain } from 'file:///C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/rolodex-luna-01a098de-20260913/backend/services/bootcamp/bootcampBrain.mjs';
const pool = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const base = { pool, dayTypeId: 'lower_body' };
const never = () => new Promise(() => {});
const reply = '{"orderedKeys":["ex_0","ex_1","ex_2"]}';

// A: never settles. Times out at the 1000ms clamp, grace armed for +1500ms.
const a = await orderPoolWithBrain({ ...base, env: { SWAN_BOOTCAMP_BRAIN: 'llm', SWAN_BOOTCAMP_BRAIN_TIMEOUT_MS: '50' }, completionFn: never });
console.log('A result:', a.fallbackReason);

// Wait past A's deadline + grace (1000 + 1500 = 2500ms).
await sleep(2600);

// B: a healthy provider. If the grace release worked, B is ADMITTED and served by the LLM.
let bCalls = 0;
const b = await orderPoolWithBrain({ ...base, env: { SWAN_BOOTCAMP_BRAIN: 'llm' }, completionFn: async () => { bCalls += 1; return reply; } });
console.log('B adapter calls:', bCalls, '| B used:', b.brainUsed, '| B reason:', b.fallbackReason);

// C: B completed, so the slot must be free again.
let cCalls = 0;
const c = await orderPoolWithBrain({ ...base, env: { SWAN_BOOTCAMP_BRAIN: 'llm' }, completionFn: async () => { cCalls += 1; return reply; } });
console.log('C adapter calls:', cCalls, '| C used:', c.brainUsed);