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
import { getProvider, assertSpend } from './providers.mjs';
import { loadEnv, callProvider } from './transport.mjs';

const arg = (name, def = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
};

/** Run a document consult for one provider. `defaultRemit` and `defaultOut` come from the wrapper. */
export async function runConsult(providerName, defaultRemit, defaultOut) {
  try {
    return await runConsultInner(providerName, defaultRemit, defaultOut);
  } catch (e) {
    // Refusals (ceiling/spend/unknown-provider) are expected outcomes, not crashes (T8/T10).
    if (e?.message?.includes('OPENROUTER_API_KEY')) { console.error(`[consult-${providerName}] ${e.message}`); process.exit(1); }
    if (e?.code && ['UNKNOWN_PROVIDER', 'CEILING', 'SPEND_CAP', 'NO_CAP'].includes(e.code)) {
      console.error(`[consult-${providerName}] REFUSED ${e.message}`);
      if (Array.isArray(e.detail)) for (const d of e.detail) console.error(`  - ${d}`);
      process.exit(2);
    }
    throw e;
  }
}

async function runConsultInner(providerName, defaultRemit, defaultOut) {
  const docPath = arg('document');
  if (!docPath) { console.error(`usage: node scripts/consult-${providerName}.mjs --document <path> [--seed <path>] [--out <path>] [--remit "..."] [--effort high] [--max-tokens N]`); process.exit(1); }
  if (!existsSync(docPath)) { console.error(`document not found: ${docPath}`); process.exit(1); }

  loadEnv(process.cwd());
  const provider = getProvider(providerName);
  const doc = readFileSync(docPath, 'utf-8');
  const seedPath = arg('seed');
  const seed = seedPath && existsSync(seedPath) ? readFileSync(seedPath, 'utf-8') : '';
  const remit = arg('remit', defaultRemit);
  const maxTokens = Number(arg('max-tokens', process.env[`SWAN_${providerName.toUpperCase()}_MAX_TOKENS`])) || 16000;
  const effort = arg('effort', process.env[`SWAN_${providerName.toUpperCase()}_EFFORT`] || (provider.supportsEffort ? 'high' : null));

  const prompt = `${remit}\n\n=====================  DOCUMENT UNDER REVIEW  =====================\n\n${doc}\n\n=====================  SEED CONTEXT (optional)  =====================\n\n${seed || '(no seed provided)'}\n\n=====================  END CONTEXT — PRODUCE YOUR REVIEW NOW  =====================`;
  // Ceiling screen: treat the document itself as the evidence being egressed.
  const pseudoManifest = { evidence: [{ id: 'E001', path: docPath.replaceAll('\\', '/') }] };
  const spend = assertSpend(provider, prompt.length, maxTokens);

  console.log(`[consult-${providerName}] model=${provider.model}${effort ? ` effort=${effort}` : ''}`);
  console.log(`[consult-${providerName}] prompt ~${Math.round(prompt.length / 4)} tok — est ~$${spend.estimate.toFixed(4)} (cap $${spend.cap})`);
  const r = await callProvider(provider, prompt, { maxTokens, effort, manifest: pseudoManifest });
  console.log(`[consult-${providerName}] ${r.inTok} in / ${r.outTok} out — $${r.cost.toFixed(4)} — ${(r.wallMs / 1000).toFixed(1)}s`);

  const outPath = arg('out', defaultOut);
  writeFileSync(outPath, `# ${provider.title}\n\n**Reviewer:** OpenRouter \`${r.model}\`${effort ? ` (effort: ${effort})` : ''}\n**Document:** ${docPath}\n**Seed:** ${seedPath || '(none)'}\n**Tokens:** ${r.inTok} in / ${r.outTok} out · **Cost:** ~$${r.cost.toFixed(4)} · **Wall:** ${(r.wallMs / 1000).toFixed(1)}s\n\n---\n\n${r.text}\n`, 'utf-8');
  console.log(`[consult-${providerName}] saved -> ${outPath}`);
}
