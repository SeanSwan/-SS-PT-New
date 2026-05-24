#!/usr/bin/env node
/**
 * Stripe test-mode webhook replay for SwanStudios.
 *
 * This script is intentionally gated because it sends webhook events to the
 * configured backend and can fulfill a test purchase in the target database.
 */

import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const backendRequire = createRequire(path.join(repoRoot, 'backend', 'package.json'));
const Stripe = backendRequire('stripe');

function parseArgs() {
  const parsed = {};
  for (const arg of process.argv.slice(2)) {
    if (!arg.startsWith('--')) continue;
    const [key, value = 'true'] = arg.slice(2).split('=');
    parsed[key] = value;
  }
  return parsed;
}

function parseEnvFile(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  if (!existsSync(filePath)) return {};
  const env = {};
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

function mergedEnv() {
  return {
    ...parseEnvFile('.env'),
    ...parseEnvFile('backend/.env'),
    ...process.env,
  };
}

function requireGate(condition, message) {
  if (!condition) {
    process.stderr.write(`BLOCKED: ${message}\n`);
    process.exit(1);
  }
}

async function postWebhook(url, payload, signature) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': signature,
    },
    body: payload,
  });

  const body = await response.text().catch(() => '');
  return { status: response.status, ok: response.ok, body };
}

async function main() {
  const cli = parseArgs();
  const env = mergedEnv();
  const sessionId = cli['session-id'];
  const baseUrl = (cli['base-url'] || 'http://localhost:10000').replace(/\/+$/, '');
  const webhookPath = cli.path || '/api/webhook/stripe';

  process.stdout.write('SwanStudios Stripe test-mode webhook replay\n');
  process.stdout.write(`Target: ${baseUrl}${webhookPath}\n`);
  process.stdout.write('Secrets are required from env files/process env and are never printed.\n\n');

  requireGate(
    env.SWAN_RELEASE_ALLOW_TEST_WRITES === 'true',
    'set SWAN_RELEASE_ALLOW_TEST_WRITES=true because this sends fulfillment webhooks'
  );
  requireGate(sessionId && sessionId.startsWith('cs_test_'), 'provide --session-id=cs_test_...');
  requireGate(env.STRIPE_SECRET_KEY?.startsWith('sk_test_') || env.STRIPE_SECRET_KEY?.startsWith('rk_test_'), 'STRIPE_SECRET_KEY must be test-mode');
  requireGate(env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'), 'STRIPE_WEBHOOK_SECRET must be set');

  const isProdTarget = /sswanstudios\.com|onrender\.com/i.test(baseUrl);
  requireGate(
    !isProdTarget || env.SWAN_RELEASE_ALLOW_PROD_TEST_WRITE === 'true',
    'production/Render target requires SWAN_RELEASE_ALLOW_PROD_TEST_WRITE=true'
  );

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  requireGate(session.payment_status === 'paid', `checkout session payment_status is ${session.payment_status}; complete test Checkout first`);
  requireGate(
    session.metadata?.cartId || session.metadata?.type === 'gallery_credits',
    'checkout session metadata must include cartId or gallery_credits type'
  );

  const event = {
    id: `evt_swan_release_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: 'checkout.session.completed',
    data: { object: session },
  };

  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: env.STRIPE_WEBHOOK_SECRET,
  });

  const url = `${baseUrl}${webhookPath}`;
  const first = await postWebhook(url, payload, signature);
  process.stdout.write(`First replay status: ${first.status}\n`);
  requireGate(first.ok, `first webhook replay failed: ${first.body.slice(0, 160)}`);

  const second = await postWebhook(url, payload, signature);
  process.stdout.write(`Second replay status: ${second.status}\n`);
  requireGate(second.ok, `second webhook replay failed: ${second.body.slice(0, 160)}`);

  process.stdout.write('PASS webhook endpoint accepted duplicate test-mode replay without charging again\n');
}

main().catch((error) => {
  process.stderr.write(`FAIL stripe replay crashed - ${error.message}\n`);
  process.exit(1);
});
