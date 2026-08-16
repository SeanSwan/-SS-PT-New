/**
 * verify-video-provider.mjs — "is my GPU box actually wired up?", as one command.
 *
 * THE FIRST THING TO RUN on the render machine, before the agent, before a job, before
 * anything. It answers the only question that matters at that moment — which piece is
 * missing — and names the environment variable that fixes each one.
 *
 * ── WHY THIS IS NOT A FLAG ON render-agent.mjs ──────────────────────────────
 * The agent refuses to start without a credential (exit 2). That is correct for a worker,
 * and exactly wrong for a diagnostic: the operator most likely to need this is the one who
 * has not finished setting up, and making them obtain a token before they can find out
 * whether ComfyUI is even running would gate the diagnosis behind the setup it diagnoses.
 *
 * Needs no token, no server, no GPU, and no `npm install` — it imports only repo files and
 * node builtins, so it runs in a fresh checkout.
 *
 *   node backend/scripts/verify-video-provider.mjs
 */

import { capabilities, listProviders, resolve, readGrants, readEnabled } from '../../shared/providers/video/registry.mjs';
import { verify, PROVIDER_ID } from '../../shared/providers/video/comfyuiLocal.mjs';

const ok = (b) => (b ? 'PASS' : 'FAIL');

const report = await verify(process.env);

console.log('\nSwan video provider check');
console.log('─'.repeat(64));

console.log('\nProviders in the catalogue:');
for (const id of listProviders()) {
  const caps = capabilities(id);
  const enabled = caps.enabled || readEnabled().has(id);
  const cost = caps.costPerRunUsd === 0 ? 'free (local)'
    : caps.costPerRunUsd === null ? 'billed (price unknown)'
      : `$${caps.costPerRunUsd}/run`;
  console.log(`  ${enabled ? 'ENABLED ' : 'disabled'}  ${id}  — ${cost}`);
}

console.log(`\nLocal provider readiness (${PROVIDER_ID}):`);
for (const c of report.checks) {
  console.log(`  ${ok(c.ok)}  ${c.name}`);
  if (!c.ok) console.log(`        → ${c.detail}`);
}

// The licence position, stated separately from readiness, because they fail for entirely
// different reasons and conflating them is how "commercial use is blocked" came to be read
// as "the video you generate is not yours".
console.log('\nLicence position:');
for (const commercial of [false, true]) {
  const label = commercial ? 'commercial output ' : 'non-commercial    ';
  try {
    resolve(PROVIDER_ID, { commercial, grants: readGrants(), enabled: readEnabled(), requireEnabled: false });
    console.log(`  PASS  ${label} — permitted`);
  } catch (err) {
    console.log(`  FAIL  ${label} — ${err.code}`);
    console.log(`        → ${err.message}`);
  }
}

const enabledNow = capabilities(PROVIDER_ID).enabled || readEnabled().has(PROVIDER_ID);
console.log('\n' + '─'.repeat(64));
if (report.ok && enabledNow) {
  console.log('READY. Start the agent:');
  console.log('  node backend/scripts/render-agent.mjs --capabilities ffmpeg,mediasync,generate\n');
} else {
  console.log('NOT READY — fix the FAIL lines above, then re-run this command.');
  if (!enabledNow) {
    console.log(`  Also set: SWAN_VIDEO_PROVIDERS_ENABLED=${PROVIDER_ID}`);
  }
  console.log('');
}

// Exit non-zero when not ready, so this is usable as a gate in a script rather than only
// by eye. Readiness here means "could attempt a render", never "a render will succeed".
process.exit(report.ok && enabledNow ? 0 : 1);
