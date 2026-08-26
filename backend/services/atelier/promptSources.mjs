/**
 * promptSources.mjs — where a Compose batch gets its prompt text.
 * ============================================================================
 *
 * Two sources, deliberately kept as peers:
 *
 *   brief  — the SS-PT slot compiler (`swanPromptCompiler`): intent defaults,
 *            surface rules, facets, the law filter. What the hosted lane has
 *            always used.
 *   taste  — the Swan taste brain: Sean's rated taste files + the Midjourney
 *            archive, served by `swan-taste-brain/prompter/serve.mjs` on
 *            127.0.0.1:7331. The same server the ComfyUI `SwanPrompt` node
 *            calls — ONE generator, ONE corpus, as that node's own doctrine
 *            requires. This module makes the Atelier ladder a second client of
 *            it rather than a second implementation.
 *
 * ── CONTROLS ON THE TASTE CLIENT (every one traces to a panel finding) ─────
 * The taste server is unauthenticated by design, binds loopback, and exposes
 * WRITE endpoints (`POST /api/keep`, `/api/rate`) that mutate the corpus —
 * which is the studio's actual IP. So this client:
 *   - is GET-only and can never be pointed at a write route;
 *   - uses a literal loopback URL; an env override is accepted only if it
 *     still resolves to loopback, otherwise it is refused, not "fixed";
 *   - sends exactly the allowlisted params {n, mode, ar, cinematic, seed},
 *     URL-encoded, never concatenated;
 *   - validates the response shape and rejects empty prompts item by item.
 *
 * ── THE LAW FILTER IS SLOT-SHAPED, NOT STRING-SHAPED ───────────────────────
 * `assertLawful(slots, facets)` walks every string slot. Feeding it a bare
 * string would be a no-op — a compliance gate that silently passes everything.
 * Each taste prompt is therefore wrapped as `{ subject: text }` so the same
 * laws that guard compiled briefs guard taste output, with real coverage.
 *
 * ── TASTE IS LOCAL-ONLY ────────────────────────────────────────────────────
 * Taste prompts encode a private aesthetic history. They go to the 5090 and
 * nowhere else; the orchestrator refuses `taste` + `hosted` before this module
 * is reached, and this module does not know how to send anything anywhere.
 */

import { compileImage } from '../../../shared/swanPromptCompiler.mjs';
import { resolveBrandKit, BrandKitError } from '../../../shared/brandKits/registry.mjs';
import { applyLaws } from '../../../shared/swanLawFilter.mjs';
import { ComposeError, MAX_STILLS, normalizeText } from './composeLimits.mjs';

export const TASTE_URL_DEFAULT = 'http://127.0.0.1:7331/api/prompt';
export const TASTE_URL_ENV_KEY = 'SWAN_ATELIER_TASTE_URL';
/** Ask for a few more than needed so law rejections do not leave the grid short. */
export const TASTE_OVERDRAW = 2;
const TASTE_TIMEOUT_MS = 8000;
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

/** The literal wins; an override is honoured only if it is still loopback. */
export function resolveTasteUrl(env = process.env) {
  const raw = String(env[TASTE_URL_ENV_KEY] || '').trim();
  if (!raw) return TASTE_URL_DEFAULT;
  let u;
  try { u = new URL(raw); } catch {
    throw new ComposeError('E_TASTE_URL_NOT_LOOPBACK', `${TASTE_URL_ENV_KEY} is not a valid URL.`);
  }
  if (!LOOPBACK.has(u.hostname)) {
    throw new ComposeError('E_TASTE_URL_NOT_LOOPBACK',
      `${TASTE_URL_ENV_KEY} must point at loopback; "${u.hostname}" is refused. The taste server `
      + 'can write the corpus and is unauthenticated by design — it is never reached over a network.');
  }
  return u.toString();
}

/**
 * Fetch prompts from the taste brain. GET only. Allowlisted params only.
 * @returns {{ seed:number|null, prompts:string[], dropped:number }}
 */
export async function fetchTastePrompts({ count, aspect, seed, cinematic = false, mode = 'taste' } = {}, deps = {}) {
  const { fetchImpl = fetch, env = process.env, timeoutMs = TASTE_TIMEOUT_MS } = deps;
  const url = new URL(resolveTasteUrl(env));
  const n = Math.min(50, Math.max(1, Number(count) || 1));
  url.searchParams.set('n', String(n));
  url.searchParams.set('mode', mode === 'surprise' ? 'surprise' : 'taste');
  if (/^\d{1,2}:\d{1,2}$/.test(String(aspect || ''))) url.searchParams.set('ar', aspect);
  if (cinematic) url.searchParams.set('cinematic', '1');
  if (Number.isInteger(seed) && seed >= 0) url.searchParams.set('seed', String(seed));

  let res;
  try {
    res = await fetchImpl(url.toString(), { method: 'GET', signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    throw new ComposeError('E_TASTE_UNREACHABLE',
      `The Swan taste server did not answer at ${url.origin}: ${err?.message || err}. `
      + 'Start it with `node prompter/serve.mjs` in the swan-taste-brain repo. Nothing was generated.');
  }
  if (!res.ok) {
    throw new ComposeError('E_TASTE_UNREACHABLE',
      `The Swan taste server answered ${res.status}. Nothing was generated.`);
  }
  let data;
  try { data = await res.json(); } catch {
    throw new ComposeError('E_TASTE_BAD_RESPONSE', 'The taste server returned non-JSON.');
  }
  if (!data || !Array.isArray(data.prompts)) {
    throw new ComposeError('E_TASTE_BAD_RESPONSE', 'The taste server returned no `prompts` array.');
  }
  const prompts = [];
  let dropped = 0;
  for (const p of data.prompts) {
    const text = normalizeText(p?.prompt);
    if (text.length < 3) { dropped += 1; continue; }
    prompts.push(text);
  }
  return { seed: Number.isFinite(Number(data.seed)) ? Number(data.seed) : null, prompts, dropped };
}

/**
 * Law profiles. The filter was written for ONE brand, and two of its laws are
 * that brand's taste, not house rules:
 *   LAW4 optics-not-creatures — a swan is never drawn as a bird (Swan brand)
 *   LAW2 gold allowlist        — gold only in four places (Swan brand)
 * Applied unconditionally to taste-brain output, LAW4 rejects Sean's default
 * wildlife vocabulary on every non-Swan project — a permanent failure tax.
 *
 * `full` is the default and drops nothing. `universal` drops ONLY the two brand
 * laws; LAW3 (anti-AI-slop kill-list), LAW9 (retired palette) and LAW10
 * (yoga/meditation + credential claims — Rule 9) stay in force everywhere. A
 * profile is chosen per request, in the open, and every rejection names its law.
 */
/**
 * Resolve the request's brand kit, in this lane's error currency.
 *
 * Lives beside the law profiles because that is what a kit mostly decides, and it keeps
 * the orchestrator free of a try/catch whose only job is to change an error's type.
 * Reads `brandKit`, NOT `workspaceId` — see brandKits/registry.mjs for why those are two
 * fields and not one.
 */
export function resolveKit(req) {
  try {
    return resolveBrandKit(req.brandKit, { lawProfile: req.lawProfile });
  } catch (err) {
    if (err instanceof BrandKitError) throw new ComposeError(err.code, err.message);
    throw err;
  }
}

export const LAW_PROFILES = Object.freeze({
  full: Object.freeze([]),
  universal: Object.freeze(['LAW4-optics-not-creatures', 'LAW2-gold-allowlist', 'LAW3-banned-facet']),
});

export function resolveLawProfile(name) {
  const p = name === undefined || name === null || name === '' ? 'full' : String(name);
  if (!LAW_PROFILES[p]) {
    throw new ComposeError('E_BAD_LAW_PROFILE', `lawProfile must be one of ${Object.keys(LAW_PROFILES).join(', ')}.`);
  }
  return p;
}

/** Run one prompt string through the same laws that guard compiled briefs. */
export function lawCheckPrompt(text, profile = 'full') {
  const drop = new Set(LAW_PROFILES[resolveLawProfile(profile)]);
  const r = applyLaws({ subject: normalizeText(text) }, []);
  const violations = (r.violations || []).filter((v) => !drop.has(v.law));
  return { passed: violations.length === 0, violations, profile: resolveLawProfile(profile), dropped: (r.violations || []).length - violations.length };
}

/**
 * Brief source: compile once, use for every still (seeds vary, prompt does not).
 * @returns {{ prompts: Array<{text:string, ok:true}>, compiled:object }}
 */
export function promptsFromBrief(brief, caps, count, compiler = compileImage) {
  let compiled;
  try {
    compiled = compiler(brief, caps);
  } catch (err) {
    throw new ComposeError(err.code || 'E_COMPILE', err.message);
  }
  const text = normalizeText(compiled?.promptText);
  if (text.length < 3) throw new ComposeError('E_COMPILE', 'The compiler produced an empty prompt.');
  return { prompts: Array.from({ length: count }, () => ({ text, ok: true })), compiled };
}

/**
 * Taste source: one DISTINCT prompt per still, each law-checked.
 *
 * Overdraws so a law rejection does not leave the grid short, then takes the
 * first `count` lawful prompts. A shortfall after overdraw becomes per-still
 * failures in the batch (the 207 path) rather than a hard error — the caller
 * sees exactly which slots were lost and why. Zero lawful prompts IS a hard
 * error; an empty grid presented as candidates is the dishonest shape.
 *
 * @returns {{ prompts: Array<{text?:string, ok:boolean, code?:string, message?:string}>,
 *             tasteSeed:number|null, lawRejected:number, dropped:number }}
 */
export async function promptsFromTaste({ count, aspect, seed, cinematic, mode, lawProfile }, deps = {}) {
  const profile = resolveLawProfile(lawProfile);
  const n = Math.min(MAX_STILLS + TASTE_OVERDRAW, Math.max(1, count) + TASTE_OVERDRAW);
  const got = await fetchTastePrompts({ count: n, aspect, seed, cinematic, mode }, deps);

  const lawful = [];
  const rejects = [];
  for (const text of got.prompts) {
    const r = lawCheckPrompt(text, profile);
    if (r.passed) lawful.push(text);
    else rejects.push(r.violations?.[0]);
    if (lawful.length === count) break;
  }
  if (lawful.length === 0) {
    const first = rejects[0];
    throw new ComposeError('E_ALL_FAILED',
      got.prompts.length === 0
        ? 'The taste server returned no usable prompts.'
        : `Every taste prompt failed the law filter. First: [${first?.law}] ${first?.detail}`);
  }

  const prompts = [];
  for (let i = 0; i < count; i += 1) {
    if (i < lawful.length) { prompts.push({ text: lawful[i], ok: true }); continue; }
    const v = rejects[i - lawful.length];
    prompts.push({
      ok: false,
      code: v ? 'E_LAW_VIOLATION' : 'E_TASTE_SHORT',
      message: v ? `[${v.law}] ${v.detail}` : 'The taste server returned fewer prompts than requested.',
    });
  }
  return { prompts, tasteSeed: got.seed, lawRejected: rejects.length, dropped: got.dropped, lawProfile: profile };
}
