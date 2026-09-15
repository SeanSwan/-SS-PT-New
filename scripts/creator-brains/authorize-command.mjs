#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/authorize-command.mjs
 * PURPOSE: `authorize` — the ONE interactive command in this engine.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR10)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHY THIS IS ITS OWN MODULE: it is the only command that blocks on a human, and
 * mixing a five-minute interactive wait into the batch command surface is how a
 * scheduled run ends up hanging on a browser prompt. It is split out for the
 * Rule 4 cap as well, but the separation is real.
 *
 * WHAT IT DOES, AND WHAT IT DOES NOT:
 *   It runs the consent flow, stores the resulting token OUTSIDE the repo, and
 *   reports what happened. It does NOT fetch the catalog — that is `sync`, run
 *   afterwards, so authorization and data movement stay separable and a failed
 *   sync cannot leave the owner unsure whether consent succeeded.
 *
 * @module creator-brains/authorize-command
 */

import { runConsentFlow, openInBrowser } from './lib/consent.mjs';
import {
  readClient, saveTokens, defaultCredentialPath, defaultTokenPath, redactOAuth,
} from './lib/oauth.mjs';
import { OAUTH_STEPS } from './lib/subs.mjs';
import { EXIT } from './commands.mjs';

const out = (s) => process.stdout.write(`${s}\n`);

export async function authorizeCommand({
  credentialPath = null, tokenStorePath = null, timeoutMs = 5 * 60_000, deps = {},
} = {}) {
  const credPath = credentialPath || defaultCredentialPath();
  const tokPath = tokenStorePath || defaultTokenPath();

  let client;
  try {
    client = deps.client || readClient(credPath);
  } catch (e) {
    out(`BLOCKED: ${(e.detail && e.detail.kind) || 'oauth_credentials_unreadable'}`);
    out(redactOAuth(e.message));
    out('');
    for (const s of OAUTH_STEPS) out(`  ${s}`);
    return EXIT.REFUSED;
  }

  out('Opening your browser to authorize read-only access to your YouTube subscriptions.');
  out('Nothing is written to the repo; the token goes to %LOCALAPPDATA%\\SwanGuard\\.');
  out('');
  out('If the browser does not open, paste this URL:');
  out('');

  const result = await runConsentFlow({
    clientId: client.clientId,
    clientSecret: client.clientSecret,
    fetchImpl: deps.fetchImpl || fetch,
    openUrl: deps.openUrl || ((url) => openInBrowser(url).then(() => {})),
    timeoutMs,
    createServer: deps.createServer,
    onWaiting: ({ url }) => out(url),
  });

  out('');
  if (result.ok) {
    saveTokens(result.tokens, tokPath);
    out('AUTHORIZED. A refresh token is stored outside the repo.');
    out(`  token: ${tokPath}`);
    out('');
    out('Next:  node scripts/creator-brains/cli.mjs sync');
    return EXIT.OK;
  }
  if (result.cancelled) {
    out('CANCELLED — consent was denied or the flow was interrupted. Nothing was stored.');
    return EXIT.REFUSED;
  }
  if (result.timedOut) {
    out(`TIMED OUT — ${result.reason}. Nothing was stored.`);
    return EXIT.REFUSED;
  }
  out(`FAILED — ${redactOAuth(result.reason)}`);
  return EXIT.FAILED;
}
