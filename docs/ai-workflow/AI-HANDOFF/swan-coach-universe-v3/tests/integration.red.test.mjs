/** SCU isolated source-integration sentinels.
 * Intentionally outside ordinary backend/frontend test discovery.
 * These expose the connective tissue required by S1/S3; green means the
 * source boundary exists, not that the full component/database matrix passed.
 * Replace these with T01/T04/T13 component and real-DB tests as those slices land.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const read = (p) => readFileSync(path.join(root, p), 'utf8');
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? files(p) : [p];
  });
}
test('S1 R02 CoachIntentBar has a production JSX consumer', () => {
  const consumers = files(path.join(root, 'frontend/src'))
    .filter((p) => p.endsWith('.tsx') && !p.includes('.test.') && !p.includes('.spec.'))
    .filter((p) => /<CoachIntentBar\b/.test(code(readFileSync(p, 'utf8'))));
  assert.ok(consumers.length > 0, 'Dormant component: add real mount and T04 behavior test');
});
test('S1 R02 Command Center mounts the shared confirmation sheet', () => {
  const entry = code(read('frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandLogEntry.tsx'));
  assert.match(entry, /<ConfirmationSheet\b/, 'Current log entry renders older ConfirmationCard');
});
test('S1 R01 Command Center explicitly passes origin to execute', () => {
  const actions = code(read('frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenter.actions.ts'));
  const call = actions.match(/props\.executeCommand\(trimmed,\s*\{([\s\S]*?)\}\)/)?.[1] ?? '';
  assert.match(call, /inputMode\s*:|inputOrigin\s*:/, 'Voice origin omitted at this caller');
});
test('S1 R01 surface dock explicitly passes origin to execute', () => {
  const dock = code(read('frontend/src/components/CoachDock/useSurfaceCoachDock.ts'));
  const call = dock.match(/executeCommand\(trimmed,\s*\{([\s\S]*?)\}\)/)?.[1] ?? '';
  assert.match(call, /inputMode\s*:|inputOrigin\s*:/, 'Recorder/speech drafts currently submit without origin');
});
test('S3 R04 durable result service exists for lost-response recovery', () => {
  assert.ok(existsSync(path.join(root, 'backend/services/ai/coachIntentService.mjs')),
    'Planned service absent; existence is prerequisite only, T11-T16 prove behavior');
});
test('S3 R04 mounted command route exposes bounded intent receipt reads', () => {
  const routes = code(read('backend/routes/aiCommandRoutes.mjs'));
  assert.match(routes, /router\.get\('\/intents'/, 'Intent list route is not mounted');
  assert.match(routes, /router\.get\('\/intents\/\:intentId'/, 'Intent detail route is not mounted');
  assert.match(routes, /toPublicCoachIntent/, 'Intent route does not use the redacted receipt projection');
});
