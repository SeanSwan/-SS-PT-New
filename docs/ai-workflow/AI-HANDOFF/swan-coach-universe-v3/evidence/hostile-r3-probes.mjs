/**
 * PURPOSE: Reproduce R3 failure behavior without importing a DB or provider.
 * OWNER: Local hostile reviewer; diagnostic evidence, NOT an acceptance gate.
 * INPUT: Unmodified production source at the review checkout; synthetic actors.
 * METHOD: Execute exact route body / transpiled TS with explicit boundary mocks.
 * OUTPUT: Assertions demonstrate defects; passing means defect reproduced.
 * LIMITS: No HTTP, browser, real DB, deployment or integration claim.
 * RUN: node docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/evidence/hostile-r3-probes.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const read = path => readFileSync(resolve(root, path), 'utf8');
const requireFrontend = createRequire(resolve(root, 'frontend/package.json'));
const ts = requireFrontend('typescript');
function loadTs(path, imports) {
  const module = { exports: {} };
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, {
    module, exports: module.exports, require: name => {
      assert.ok(name in imports, `Unexpected import: ${name}`);
      return imports[name];
    }, window: { setTimeout: () => {} }, navigator: { onLine: true },
  }, { filename: path });
  return module.exports;
}

// R3-1: After a simulated committed effect the response disappears. The real
// hook reports an error, the real action falsely says no change and allows resend.
const writes = [];
const bodies = [];
const hook = loadTs('frontend/src/hooks/useCoachCommand.ts', {
  react: { useState: x => [x, () => {}], useCallback: fn => fn },
  '../services/api.service': { default: { post: async (_url, body) => {
    writes.push({ id: writes.length + 1 }); bodies.push(body);
    throw new Error('synthetic response lost after commit');
  } } },
  '../utils/aiWorkoutEvents': { dispatchAIWorkoutEvent: () => false },
}).useCoachCommand();
const base = 'frontend/src/components/DashBoard/Pages/coach-assistant/';
const actionsModule = loadTs(`${base}CoachCommandCenter.actions.ts`, {
  './CoachCommandCenter.quickClientAction': { createQuickClientSubmitAction: () => () => {} },
  './CoachCommandCenter.commandLane': {
    shouldRouteToCommandLane: () => true, commandLaneErrorBody: r => r.error,
  },
  './CoachCommandCenter.chatResponse': {},
  './CoachCommandCenter.data': { INITIAL_COMMAND_LOGS: [] },
  './CoachCommandCenter.commandTitle': { buildCoachCommandTitle: () => 'Synthetic task' },
  './CoachCommandCenter.logic': {},
});
let logs = [];
const actions = actionsModule.createCoachCommandCenterActions({
  commandText: 'Record this synthetic workout', commandLaneEnabled: true,
  inputMode: 'text', routeClientId: 7, executeCommand: hook.executeCommand,
  setLogs: fn => { logs = fn(logs); }, setCommandText: () => {}, setSelectedStatus: () => {},
});
await actions.handleSubmit({ preventDefault() {} });
assert.equal(writes.length, 1);
assert.ok(logs[0].attachments.includes('No data was changed'));
assert.equal(logs[0].retryMessage, 'Record this synthetic workout');
await actions.handleRetryMessage(logs[0].retryMessage);
assert.equal(writes.length, 2);
assert.equal(bodies[0].requestId, undefined);
assert.equal(bodies[1].requestId, undefined);
console.log('REPRODUCED R3-1: lost response -> false no-change receipt -> two synthetic effects on retry');

// R3-2: Execute the actual list route and actual cursor/access helpers. The
// model yields 100 distinct full pages of revoked receipts followed by EOF.
const routeSource = read('backend/routes/aiCommandRoutes.mjs');
const helpers = routeSource.slice(routeSource.indexOf('const parseIntentLimit'),
  routeSource.indexOf('const toAICommandRouteErrorMetadata'));
const routeStart = routeSource.indexOf("router.get('/intents',");
const routeEnd = routeSource.indexOf('// ── GET /intents/:intentId', routeStart);
assert.ok(routeStart > 0 && routeEnd > routeStart);
let handler;
let queries = 0;
let checks = 0;
const model = { findAll: async () => {
  queries++;
  if (queries > 100) return [];
  return Array.from({ length: 2 }, (_, offset) => ({
    id: `${queries}-${offset}`, actorId: 7, targetClientId: 99,
    createdAt: new Date(Date.UTC(2026, 0, 1) - (queries * 2 + offset) * 1000),
  }));
} };
vm.runInNewContext(helpers + routeSource.slice(routeStart, routeEnd), {
  Buffer, Op: { or: Symbol('or'), lt: Symbol('lt') },
  router: { get: (_path, ...args) => { handler = args.at(-1); } },
  protect() {}, aiCommandRateLimiter() {}, getModel: () => model,
  assertAssignmentOrAdmin: async () => { checks++; return false; },
  toPublicCoachIntent: x => x, logAICommandRouteError: () => {},
});
let response;
await handler({ query: { limit: '1' }, user: { id: 7, role: 'trainer' } }, {
  json: body => { response = body; }, status() { return this; },
});
assert.equal(response.success, true);
assert.equal(response.intents.length, 0);
assert.equal(queries, 101);
assert.equal(checks, 200);
console.log('REPRODUCED R3-2: limit=1 caused 101 list queries + 200 assignment checks, returned 0 rows');

// R3-3: Omitting provenance at the shared hook gains text authority.
await hook.executeCommand('Synthetic omitted-origin request');
assert.equal(bodies.at(-1).routeContext.inputMode, 'text');
const slots = [];
let slotIndex = 0;
let speechSetText;
const dictationModule = loadTs('frontend/src/components/WorkoutLogger/useWorkoutLoggerDictation.ts', {
  react: {
    useState: initial => {
      const i = slotIndex++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useCallback: fn => fn, useEffect: () => {},
  },
  '../../hooks/useCoachCommand': {
    useCoachCommand: () => hook, commandErrorReceiptText: x => x,
  },
  '../DashBoard/Pages/coach-assistant/hooks/useCoachBrowserSpeechInput': {
    useCoachBrowserSpeechInput: opts => {
      speechSetText = opts.setText;
      return { stopListening() {}, listening: false, speechSupported: true };
    },
  },
});
dictationModule.useWorkoutLoggerDictation({ clientId: 7 });
speechSetText('Synthetic dictated command');
slotIndex = 0; // React rerender after the speech final updates the text state.
const dictation = dictationModule.useWorkoutLoggerDictation({ clientId: 7 });
await dictation.send();
assert.equal(bodies.at(-1).message, 'Synthetic dictated command');
assert.equal(bodies.at(-1).routeContext.inputMode, 'text');
const { resolveVoiceConfirmationTier: tier } = await import(
  new URL('../../../../../backend/services/ai/voiceConfirmationTier.mjs', import.meta.url));
const command = { type: 'cancel_session', destructive: true, roleRequired: ['admin', 'trainer'] };
const context = { actorRole: 'trainer', lockedClientId: 7, targetClientId: 8 };
assert.equal(tier(command, {}, { ...context, inputMode: bodies.at(-1).routeContext.inputMode }).physical, false);
assert.equal(tier(command, {}, { ...context, inputMode: 'voice' }).physical, true);
console.log('REPRODUCED R3-3: logger speech final -> text on wire; cross-client tier physical=false vs true for voice');
