#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/canary-command.mjs
 * PURPOSE: `canary` — prove yt-dlp still answers, on demand, without running the
 *          catalog.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint S8)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * Split out of `commands.mjs` for the Rule 4 cap when the HR23 execution bounds
 * landed. Every other multi-line command already lives in its own module
 * (`status-command.mjs`, `authorize-command.mjs`, `backup-command.mjs`); this is
 * the same seam, applied to the one that was left behind.
 *
 * It reports the three outcomes separately, because they send you to different
 * places: yt-dlp missing (install it), the probe failing (yt-dlp cannot read
 * YouTube today), and zero valid cues (the payload changed shape).
 *
 * @module creator-brains/canary-command
 */

import { selfCheck, probeSubs, fetchJson3 } from './lib/ytdlp.mjs';
import { parseJson3 } from '../swan-scout/yt-scout-transcript.mjs';
import { validateCues } from './lib/subtitles.mjs';
import { DEFAULT_CANARY_VIDEO } from './lib/canary.mjs';
import { EXIT } from './commands.mjs';

const out = (s) => process.stdout.write(`${s}\n`);

/** Positional arguments only — a flag is never a creator reference (HR02). */
function positionals(args) {
  const list = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a.startsWith('--')) {
      if (!a.includes('=') && args[i + 1] && !args[i + 1].startsWith('--')) i += 1;
      continue;
    }
    list.push(a);
  }
  return list;
}

export async function canaryCommand({ args = [], deps = {} } = {}) {
  const [videoId = DEFAULT_CANARY_VIDEO] = positionals(args);
  const check = selfCheck();
  out(`yt-dlp: ${check.ok ? `ok (${check.version}) via ${check.reason}` : `MISSING — ${check.reason}`}`);
  if (!check.ok) return EXIT.REFUSED;

  const probe = (deps && deps.probeSubs) || probeSubs;
  const fetcher = (deps && deps.fetchJson3) || fetchJson3;
  const p = probe(videoId);
  if (!p.ok) { out(`probe FAILED (${p.kind || 'failed'}) for ${videoId}: ${p.error}`); return EXIT.FAILED; }
  out(`probe ok — ${p.languages.length} language(s), ${p.originals.length} original`);
  const lang = p.languages.includes('en') ? 'en' : p.languages[0];
  const { cues } = parseJson3(fetcher(videoId, lang));
  const checked = validateCues(cues);
  out(`fetch ok — ${checked.cues.length} valid cues in ${lang}`
    + `${checked.ok ? '' : ` (${checked.problems.length} cues rejected)`}`);
  return checked.ok && checked.cues.length ? EXIT.OK : EXIT.FAILED;
}
