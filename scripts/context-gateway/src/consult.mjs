/**
 * consult.mjs — shared engine for the committed consult-* launcher wrappers (Phase 2 slice 2).
 * =============================================================================================
 * Retires the LOCAL-ONLY consult-fable/kimi/sol.mjs duplication (Phase 0 §1): the wrappers are
 * now thin committed entries over the gateway's provider registry + transport, keeping the same
 * CLI surface (--document --seed --out --remit --effort --max-tokens) and verdict-doc format.
 *
 * Upgrades over the local originals (intentional behavior changes):
 *   - Spend gate: SWAN_CONTEXT_MAX_USD is required (T8, fail-closed) — the originals had no cap.
 *   - Ceiling: the document path is screened as a pseudo-manifest, so a design-ceiling provider
 *     (Kimi) refuses auth/billing/PII-named documents in code, not by comment (T10).
 *   - Shared CRLF-safe env loading and pricing from the committed registry.
 *
 * @module context-gateway/consult
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import { shortPath } from './paths.mjs';
import { getProvider, assertSpend } from './providers.mjs';
import { loadEnv, callProvider } from './transport.mjs';
import { redactSecrets } from './egress.mjs';
import { DENY_PATTERNS } from './safeRead.mjs';
import { recordConsult, sha256 } from './receiptV1.mjs';

const arg = (name, def = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
};

/**
 * Caller-supplied stamp (receiptV1 stays clock-free so it is deterministic under test).
 * Filename-safe UTC: 20260813T170000Z.
 */
const utcStamp = () => new Date().toISOString().replaceAll(/[:-]/g, '').replace(/\.\d{3}/, '');

/**
 * Provider errors carry a code; the missing-key case does not, so it is mapped by message. Anything
 * unrecognized is TRANSPORT — an unexpected throw still gets recorded rather than vanishing.
 */
/**
 * Codes that are operator/config errors rather than a gate firing. Keeping them out of `refused`
 * protects the one signal the flywheel exists to measure: how often the ceiling/spend gates bite.
 *
 * Membership is decided by ONE question: did a gate deliberately stop this, or is something simply
 * unconfigured? NO_KEY (no OPENROUTER_API_KEY), UNKNOWN_PROVIDER (typo'd wrapper / missing
 * providers.mjs entry), and NO_CAP (SWAN_CONTEXT_MAX_USD unset) are all "unconfigured". Only
 * CEILING and SPEND_CAP are gates actually biting.
 *
 * This set was extended three times because the principle kept being applied to the specific code
 * that a reviewer named rather than to every code it covers (Kimi rounds 1, 2, and 4 — NO_KEY, then
 * UNKNOWN_PROVIDER, then NO_CAP). NO_CAP was the costliest: it fires on every run of an uncapped
 * workstation, so the aggregate read "the spend gate is biting constantly" when the truth was "no
 * cap was ever set" — and the E2E test asserted that wrong classification, pinning it in place
 * (Rule 79: a test can encode the bug). If a new error code is added, answer the ONE question above
 * before deciding where it goes.
 */
const NON_GATE = new Set(['TRANSPORT', 'NO_KEY', 'UNKNOWN_PROVIDER', 'NO_CAP']);

/**
 * The ProviderError codes this lane recognizes. ONE list, referenced by both the classifier and the
 * exit branch — they used to be two identical literals, which is precisely the shape paths.mjs's
 * header warns about: two copies of one policy is how the next edit lands in only one of them. A
 * code added to the exit list but not here would record TRANSPORT/`error` on the receipt while
 * exiting as a recognized refusal, silently corrupting the signal NON_GATE protects (round 12, N1).
 * Deliberately local to this module: provider vocabulary, not receipt vocabulary (ERROR_CODES).
 */
const KNOWN_PROVIDER_CODES = ['UNKNOWN_PROVIDER', 'CEILING', 'SPEND_CAP', 'NO_CAP'];

const errorCodeOf = (e) => {
  if (e?.message?.includes('OPENROUTER_API_KEY')) return 'NO_KEY';
  if (e?.code && KNOWN_PROVIDER_CODES.includes(e.code)) return e.code;
  return 'TRANSPORT';
};

/** Run a document consult for one provider. `defaultRemit` and `defaultOut` come from the wrapper. */
export async function runConsult(providerName, defaultRemit, defaultOut) {
  // Progressively populated by runConsultInner so a FAILURE records everything known at the moment
  // it failed. Two defects this fixes: (1) a refusal used to carry no task identity, so the flywheel
  // could not answer "which class of request keeps getting refused"; (2) a throw AFTER a successful
  // paid call (e.g. the --out write failing) recorded costUsd:null, silently losing real spend.
  const ctx = {};
  try {
    return await runConsultInner(providerName, defaultRemit, defaultOut, ctx);
  } catch (e) {
    // S0 flywheel: a REFUSAL is the most decision-relevant event the gateway produces (it is the
    // ceiling/spend gate actually firing), so it is recorded before the process exits. Recording
    // never throws and never changes the exit code — telemetry must not alter control flow.
    const code = errorCodeOf(e);
    recordConsult({
      ...ctx,
      stamp: utcStamp(), root: process.cwd(), providerName,
      // `refused` means a GATE fired (ceiling/spend) — that is the signal the flywheel aggregates to
      // tune ceilings and caps. Operator/config errors are NOT gate pressure and would overstate how
      // often the gates actually bite, so they class as `error` (see NON_GATE).
      // `ctx.result` survives here, so a throw AFTER a paid call still carries its real cost.
      outcome: NON_GATE.has(code) ? 'error' : 'refused',
      errorCode: code,
      originatingModel: process.env.SWAN_ORIGINATING_MODEL ?? null,
    });

    // Refusals (ceiling/spend/unknown-provider) are expected outcomes, not crashes (T8/T10).
    if (e?.message?.includes('OPENROUTER_API_KEY')) { console.error(`[consult-${providerName}] ${e.message}`); process.exit(1); }
    if (e?.code && KNOWN_PROVIDER_CODES.includes(e.code)) {
      // The console must agree with the receipt. NON_GATE codes are recorded as `error`
      // (misconfiguration), not `refused` (a gate biting) — printing REFUSED for all of them made
      // stderr and the audit record tell two different truths about one event, in a file that
      // elsewhere enforces one-word-one-meaning (Kimi round 14, F2).
      const label = NON_GATE.has(e.code) ? 'CONFIG ERROR' : 'REFUSED';
      console.error(`[consult-${providerName}] ${label} ${e.message}`);
      if (Array.isArray(e.detail)) for (const d of e.detail) console.error(`  - ${d}`);
      process.exit(2);
    }
    throw e;
  }
}

async function runConsultInner(providerName, defaultRemit, defaultOut, ctx = {}) {
  const docPath = arg('document');
  if (!docPath) { console.error(`usage: node scripts/consult-${providerName}.mjs --document <path> [--seed <path>] [--out <path>] [--remit "..."] [--effort high] [--max-tokens N]`); process.exit(1); }
  if (!existsSync(docPath)) { console.error(`document not found: .../${basename(docPath)}`); process.exit(1); }

  ctx.docPath = docPath;
  loadEnv(process.cwd());
  const provider = getProvider(providerName);
  ctx.provider = provider;
  const seedPath = arg('seed');
  ctx.seedPath = seedPath;

  // DENY jail (Rule 59 / hostile pass 5, finding 2): the consult lane read arbitrary files — a
  // .env/secrets.*/*.pem passed as --document or --seed would egress with only best-effort shape
  // redaction. Refuse secret-bearing paths outright, like the safeRead lane does.
  for (const pth of [docPath, seedPath].filter(Boolean)) {
    const rel = String(pth).replaceAll('\\', '/');
    if (DENY_PATTERNS.some((re) => re.test(rel))) {
      // Print the basename only: transcripts capture stderr, and the full path carries the OS
      // username the receipt deliberately relativizes away. Enough to identify what was refused.
      console.error(`[consult-${providerName}] REFUSED secret-bearing path: .../${basename(rel)}`);
      // This branch exits DIRECTLY rather than throwing, so it never reaches runConsult's catch.
      // An attempt to egress a .env/*.pem is the most security-relevant event this lane produces —
      // record it here or it is lost entirely. No docSha: the file is deliberately never read.
      recordConsult({
        ...ctx, stamp: utcStamp(), root: process.cwd(), providerName,
        outcome: 'refused', errorCode: 'DENY_PATH',
        originatingModel: process.env.SWAN_ORIGINATING_MODEL ?? null,
      });
      process.exit(2);
    }
  }
  // Ceiling screen BOTH paths — the old pseudoManifest only screened --document, so a design
  // provider (Kimi) would accept a sensitive --seed (hostile pass 5, finding 1: seed bypass).
  const pseudoManifest = { evidence: [docPath, seedPath].filter(Boolean).map((p, i) => ({ id: `E00${i + 1}`, path: String(p).replaceAll('\\', '/') })) };

  // Redact inline secret VALUES + neutralize the ===== fence from BOTH document and seed before
  // egress (T3 + T12 delimiter breakout). Size-cap each read (hostile pass 3, finding 4: an
  // unbounded doc with many un-terminated PEM markers is O(n²) for the PRIVATE_KEY regex).
  const MAX_DOC = 512 * 1024;
  const read1 = (p) => (p && existsSync(p) ? readFileSync(p, 'utf-8').slice(0, MAX_DOC) : '');
  const cleanCount = (s) => redactSecrets(String(s).replaceAll(/={4,}/g, '==='));
  const docC = cleanCount(read1(docPath));
  const seedC = cleanCount(read1(seedPath));
  const doc = docC.text;
  const seed = seedC.text;
  const totalRedactions = docC.redactions + seedC.redactions;
  if (totalRedactions) console.error(`[consult-${providerName}] redacted ${totalRedactions} inline secret(s) before egress`);
  const remit = arg('remit', defaultRemit);
  const maxTokens = Number(arg('max-tokens', process.env[`SWAN_${providerName.toUpperCase()}_MAX_TOKENS`])) || 16000;
  const effort = arg('effort', process.env[`SWAN_${providerName.toUpperCase()}_EFFORT`] || (provider.supportsEffort ? 'high' : null));
  // Task identity + egress facts are known now — record them so a LATER refusal (ceiling/spend,
  // both of which fire below) still says WHICH document class was refused.
  Object.assign(ctx, {
    effort, maxTokens,
    docSha: sha256(doc), docBytes: Buffer.byteLength(doc, 'utf8'),
    redactions: totalRedactions,
    redactionKinds: [...(docC.kinds ?? []), ...(seedC.kinds ?? [])],
  });

  const prompt = `${remit}\n\n=====================  DOCUMENT UNDER REVIEW  =====================\n\n${doc}\n\n=====================  SEED CONTEXT (optional)  =====================\n\n${seed || '(no seed provided)'}\n\n=====================  END CONTEXT — PRODUCE YOUR REVIEW NOW  =====================`;
  const spend = assertSpend(provider, Buffer.byteLength(prompt, 'utf8'), maxTokens);
  ctx.spend = spend;

  console.log(`[consult-${providerName}] model=${provider.model}${effort ? ` effort=${effort}` : ''}`);
  console.log(`[consult-${providerName}] prompt ~${Math.round(prompt.length / 4)} tok — est ~$${spend.estimate.toFixed(4)} (cap $${spend.cap})`);
  const r = await callProvider(provider, prompt, { maxTokens, effort, manifest: pseudoManifest });
  // Money is now spent. Record the result on ctx BEFORE anything else can throw, so a downstream
  // failure cannot erase the fact that this call cost real credits.
  ctx.result = r;
  console.log(`[consult-${providerName}] ${r.inTok} in / ${r.outTok} out — $${r.cost.toFixed(4)} — ${(r.wallMs / 1000).toFixed(1)}s`);

  const outPath = arg('out', defaultOut);
  writeFileSync(outPath, `# ${provider.title}\n\n**Reviewer:** OpenRouter \`${r.model}\`${effort ? ` (effort: ${effort})` : ''}\n**Document:** ${shortPath(docPath)}\n**Seed:** ${seedPath ? shortPath(seedPath) : '(none)'}\n**Tokens:** ${r.inTok} in / ${r.outTok} out · **Cost:** ~$${r.cost.toFixed(4)} · **Wall:** ${(r.wallMs / 1000).toFixed(1)}s\n\n---\n\n${r.text}\n`, 'utf-8');
  // Relative, matching the receipt line: an absolute --out carries the OS username into the
  // transcript. The basename-only principle is the LANE's, not just the DENY branch's (Kimi r3, N2).
  console.log(`[consult-${providerName}] saved -> ${shortPath(outPath)}`);

  // S0 flywheel: record the completed call. `doc` is the POST-redaction text, so the SHA identifies
  // exactly what egressed. Only the hash and byte length are stored — never the content itself.
  const receiptPath = recordConsult({
    ...ctx,
    stamp: utcStamp(), root: process.cwd(), providerName,
    outcome: 'ok', originatingModel: process.env.SWAN_ORIGINATING_MODEL ?? null,
  });
  // Relative, not absolute: writeReceiptV1 returns join(process.cwd(), …), and transcripts capture
  // stdout. Hardening the RECORD against the OS-username leak while spraying the same path to the
  // console would defeat the point (Kimi round 2, F1).
  if (receiptPath) console.log(`[consult-${providerName}] receipt -> ${shortPath(receiptPath)}`);
}
