/**
 * hook-provenance.mjs — is a LIVE hook actually committed?
 * =======================================================
 * Check 7 (hook-registration.mjs) answers "does the registered file exist?".
 * This answers the opposite, and equally silent, question:
 *
 *     Does the registration that is protecting ME exist for anyone else?
 *
 * WHY THIS EXISTS. On 2026-08-23 the exit-status gate — the mechanism built against
 * the single most recurring defect class in the corpus — was live in one working
 * tree and present in NO commit. It ran for the agent that wrote it and did not
 * exist for anybody else. Five of six hostile panel seats independently ranked this
 * P0, and named the failure mode precisely:
 *
 *   "Enforcement is not a property of the commit; it is a property of who touched
 *    the file last."                                                  — Grok 4.6
 *   "A gate that isn't committed isn't shipped; it's a drift bomb."    — GLM 5.3
 *
 * The asymmetry is what makes it dangerous. An uncommitted guard produces the same
 * silence as a healthy one, in the tree where it runs — and produces NOTHING AT ALL
 * in every other tree, where the operator still believes the class is blocked. One
 * `git checkout -- .claude/settings.json`, one fresh clone, one new worktree, and
 * the protection is gone with no error, no warning, and no degraded mode.
 *
 * BOTH DIRECTIONS ARE REPORTED, because both are split-brain:
 *   LIVE-UNCOMMITTED — runs here, absent everywhere else (the panel's P0)
 *   LOCALLY-REMOVED  — committed for everyone, deleted here (a guard silently
 *                      switched off in exactly the tree doing the work)
 *
 * SCOPE, deliberately: settings.json ONLY. settings.local.json is gitignored BY
 * DESIGN (.gitignore:324) — flagging it would fire on every machine forever, and a
 * check that always fires is a check that gets removed. That exclusion is the single
 * most important false-positive guard in this file.
 *
 * FAIL-OPEN, NEVER FAIL-SILENT. Same contract as check 7: if provenance cannot be
 * determined, that is UNKNOWN and it is said out loud. Reporting nothing would
 * reproduce the very ambiguity this module exists to remove.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

/** The one settings file whose provenance is checkable. See SCOPE above. */
export const TRACKED_SETTINGS = '.claude/settings.json';

/**
 * Normalize a hook command for cross-tree comparison.
 *
 * Applied SYMMETRICALLY to both sides, so it can only ever hide a difference that
 * does not change what runs. Whitespace runs collapse (a reformat is not a change of
 * enforcement) and backslashes become forward slashes (the same registration written
 * on Windows and POSIX must not read as two different guards — this repo runs on
 * Windows with Git Bash, where both spellings genuinely occur).
 */
export function normalizeCommand(cmd) {
  if (typeof cmd !== 'string') return null;
  const n = cmd.replace(/\\/g, '/').replace(/\s+/g, ' ').trim();
  return n === '' ? null : n;
}

/**
 * Walk a parsed settings object and collect every hook command as `event\0command`.
 *
 * The shape guards below are NOT defensive boilerplate — each one is a bug that
 * actually shipped in the sibling module and read as CLEAN (see hook-registration.mjs
 * rounds 6-8): a null root, an array root, `hooks: null` slipping past a `!= null`
 * test, a non-array event value. Every one of them made a config that registers
 * nothing report perfect health. They are reproduced here because this walk has the
 * same silent-success failure mode, and a copy that omits them is not a simpler
 * version — it is the old bug.
 *
 * @returns {{keys: Set<string>, shape: string[]}}
 */
export function collectHookCommands(cfg, label) {
  const keys = new Set();
  const shape = [];
  if (cfg === null || typeof cfg !== 'object' || Array.isArray(cfg)) {
    shape.push(`${label} root is ${cfg === null ? 'null' : Array.isArray(cfg) ? 'an array' : typeof cfg}, not an object — it registers NOTHING`);
    return { keys, shape };
  }
  if ('hooks' in cfg && (cfg.hooks === null || typeof cfg.hooks !== 'object' || Array.isArray(cfg.hooks))) {
    const what = cfg.hooks === null ? 'null' : Array.isArray(cfg.hooks) ? 'an array' : typeof cfg.hooks;
    shape.push(`${label} has a "hooks" value that is ${what}, not an object — nothing it declares can register`);
    return { keys, shape };
  }
  for (const [event, groups] of Object.entries(cfg.hooks || {})) {
    if (!Array.isArray(groups)) {
      shape.push(`${label} event ${event} is ${groups === null ? 'null' : typeof groups}, not an array`);
      continue;
    }
    for (const group of groups) {
      if (!Array.isArray(group?.hooks)) continue;
      for (const hook of group.hooks) {
        const cmd = normalizeCommand(hook?.command);
        if (cmd) keys.add(`${event}\u0000${cmd}`);
      }
    }
  }
  return { keys, shape };
}

const pretty = (k) => { const [e, c] = k.split('\u0000'); return `${c} (${e})`; };

/** Default HEAD reader. Split out so tests inject a blob and stay hermetic. */
function gitShowHead(root, path) {
  // MSYS_NO_PATHCONV: on Git Bash for Windows a `HEAD:path` argument is mangled into
  // a filesystem path, and `git show` then reports the blob as ABSENT for a file that
  // is committed. That false negative is recorded in this project's memory as having
  // produced six wrong "it's missing" claims in one session. A provenance checker
  // fooled by it would report every committed guard as uncommitted — the loudest
  // possible false positive, on the exact check whose credibility must be total.
  return execFileSync('git', ['show', `HEAD:${path}`], {
    cwd: root,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5000,
    env: { ...process.env, MSYS_NO_PATHCONV: '1' },
  });
}

/**
 * Compare the LIVE hook registrations against the ones in HEAD.
 * @returns {{findings: string[], scopeNote: string}}
 */
export function auditHookProvenance(root, { readHead = gitShowHead } = {}) {
  const findings = [];
  const scopeNote =
    `${TRACKED_SETTINGS} vs HEAD only; settings.local.json is gitignored by design and is ` +
    'NOT checkable; user-global and managed settings are not inspected';

  let liveRaw;
  try {
    liveRaw = readFileSync(join(root, TRACKED_SETTINGS), 'utf-8');
  } catch (e) {
    // Absent working file: nothing is live from it, so there is nothing to be
    // split-brained about. Unreadable is NOT the same and must not collapse into it.
    if (e?.code !== 'ENOENT') {
      findings.push(`${TRACKED_SETTINGS} could not be read (${e?.code || 'unknown'}) — hook provenance was NOT checked. This is UNKNOWN, not clean.`);
    }
    return { findings, scopeNote };
  }

  let liveCfg;
  try {
    liveCfg = JSON.parse(liveRaw);
  } catch {
    // Check 7 already reports the parse failure and its blast radius. Saying it twice
    // trains operators to skim the drift block, so this only records the consequence
    // that is unique to provenance.
    findings.push(`${TRACKED_SETTINGS} is not valid JSON — hook provenance could not be compared against HEAD.`);
    return { findings, scopeNote };
  }

  let headRaw = null;
  let headAbsent = false;
  try {
    headRaw = readHead(root, TRACKED_SETTINGS);
  } catch (e) {
    const msg = String(e?.stderr || e?.message || e);
    // "exists on disk, but not in HEAD" / "does not exist in HEAD" — the file is new.
    if (/does not exist|exists on disk/i.test(msg)) headAbsent = true;
    else {
      findings.push(`hook provenance could NOT be determined (${msg.split('\n')[0].slice(0, 160)}). Whether the live guards are committed is UNKNOWN, not clean.`);
      return { findings, scopeNote };
    }
  }

  const { keys: liveKeys, shape: liveShape } = collectHookCommands(liveCfg, `${TRACKED_SETTINGS} (working tree)`);
  if (liveShape.length) findings.push(...liveShape);

  let headKeys = new Set();
  if (headAbsent) {
    if (liveKeys.size) {
      findings.push(
        `${TRACKED_SETTINGS} is not committed at all, yet registers ${liveKeys.size} live hook(s). ` +
        'Every guard it declares runs ONLY in this working tree and exists for nobody else. ' +
        'Commit the file.'
      );
    }
    return { findings, scopeNote };
  }
  try {
    const headCfg = JSON.parse(headRaw);
    const c = collectHookCommands(headCfg, `${TRACKED_SETTINGS} (HEAD)`);
    headKeys = c.keys;
    if (c.shape.length) {
      findings.push(
        ...c.shape.map((s) => `${s}. The COMMITTED settings are what a fresh checkout runs — this is what everyone else gets.`)
      );
    }
  } catch {
    findings.push(`${TRACKED_SETTINGS} in HEAD is not valid JSON — a fresh checkout runs NONE of the hooks it declares, and provenance could not be compared.`);
    return { findings, scopeNote };
  }

  const liveOnly = [...liveKeys].filter((k) => !headKeys.has(k));
  const headOnly = [...headKeys].filter((k) => !liveKeys.has(k));

  if (liveOnly.length) {
    findings.push(
      `${liveOnly.length} hook(s) are LIVE HERE BUT NOT COMMITTED: ${liveOnly.map(pretty).join('; ')}. ` +
      'These protect this working tree and nobody else — a fresh clone, a new worktree, ' +
      `or one "git checkout -- ${TRACKED_SETTINGS}" silently removes them, with no ` +
      'error and no degraded mode. Enforcement must be a property of the commit, not of ' +
      'who touched the file last. Commit the registration.'
    );
  }
  if (headOnly.length) {
    findings.push(
      `${headOnly.length} committed hook(s) are NOT LIVE in this working tree: ${headOnly.map(pretty).join('; ')}. ` +
      'The repo says these guards are on; in the tree actually doing the work they are off. ' +
      'Restore them, or remove the registration so the claim matches reality.'
    );
  }
  return { findings, scopeNote };
}
