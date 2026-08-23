/**
 * hook-registration.mjs — audit every hook a config registers.
 * ============================================================
 * The WALK: read the project settings files, handle malformed shapes, dedupe, and
 * turn per-command verdicts into findings. The per-command decision lives in
 * ./hook-classify.mjs (split 2026-08-23 for the 300-line cap).
 *
 * Several of this loop's worst bugs lived HERE and not in the classifier: `hooks:
 * null` reading clean, a non-object root iterating zero times, an unreadable settings
 * file skipped exactly like an absent one. The walk has its own property fuzzer
 * (scripts/hooks/hook-audit.fuzz.mjs) for that reason.
 *
 * classifyCommand is re-exported so existing importers keep working unchanged.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { classifyCommand } from './hook-classify.mjs';

export { classifyCommand };

/**
 * Audit every hook registration in a repo's project-scope settings files.
 * @returns {{findings: string[], scopeNote: string}}
 */
export function auditHookRegistrations(root) {
  const missing = [];
  const unresolvable = [];
  const shape = [];
  const seen = new Set();

  for (const name of ['settings.json', 'settings.local.json']) {
    let raw;
    try {
      raw = readFileSync(join(root, '.claude', name), 'utf-8');
    } catch (e) {
      // Absent is legitimate (settings.local.json is optional). UNREADABLE is not —
      // collapsing both to "skip" is silence-means-clean one layer above the hooks.
      if (e?.code !== 'ENOENT') {
        shape.push(`.claude/${name} exists but could not be read (${e?.code || 'unknown'}) — the hooks it registers were NOT checked`);
      }
      continue;
    }

    let cfg;
    try {
      cfg = JSON.parse(raw);
    } catch {
      shape.push(`.claude/${name} is not valid JSON — the harness runs NONE of the hooks it declares`);
      continue;
    }

    // The ROOT must be a plain object before anything is read off it. Round 6 guarded
    // the `hooks` VALUE and not the document: a settings.json containing `[]`, `42`
    // or `"str"` left `cfg.hooks` undefined, skipped the guard below, iterated zero
    // times and reported clean — the 2026-08-22 outage signature, one level up from
    // the entries whose silence this module exists to make unrepresentable. A literal
    // `null` was worse: `cfg.hooks` threw, the exception escaped, and the caller's
    // catch replaced the WHOLE audit — including any already-confirmed MISSING — with
    // a generic "could not complete", demoting a certain alarm to unknown. (Round 7.)
    if (cfg === null || typeof cfg !== 'object' || Array.isArray(cfg)) {
      shape.push(`.claude/${name} is valid JSON but its root is ${cfg === null ? 'null' : Array.isArray(cfg) ? 'an array' : typeof cfg}, not an object — the harness registers NOTHING from it`);
      continue;
    }

    // `hooks` must be a plain object if the key is PRESENT at all.
    //
    // Round 7 wrote `cfg.hooks != null`, which is false for null — so `hooks: null`
    // skipped the guard, `Object.entries(null || {})` iterated zero times, and the
    // audit reported clean. Every other bad shape (`false`, `"str"`, `42`, `[]`)
    // produced a finding; only null was silently equated with absent. A duplicate-key
    // hand-edit or bad merge yielding `{"hooks": {...}, "hooks": null}` parses fine
    // (last wins), discards every real registration, and read as healthy. That is the
    // 2026-08-22 outage signature one level up — round EIGHT of the same class.
    //
    // `in` distinguishes "key absent" (legitimate) from "key present and null" (a
    // config that registers nothing), which `!= null` cannot.
    if ('hooks' in cfg && (cfg.hooks === null || typeof cfg.hooks !== 'object' || Array.isArray(cfg.hooks))) {
      const what = cfg.hooks === null ? 'null' : Array.isArray(cfg.hooks) ? 'an array' : typeof cfg.hooks;
      shape.push(`.claude/${name} has a "hooks" value that is ${what}, not an object — nothing it declares can register`);
      continue;
    }

    for (const [event, groups] of Object.entries(cfg.hooks || {})) {
      if (!Array.isArray(groups)) {
        shape.push(`${event} in ${name} is ${groups === null ? 'null' : typeof groups}, not an array — hooks there may not run at all`);
        continue;
      }
      for (const group of groups) {
        if (!Array.isArray(group?.hooks)) {
          shape.push(`a group under ${event} in ${name} has no hooks array — that group registers nothing`);
          continue;
        }
        for (const hook of group.hooks) {
          const v = classifyCommand(hook?.command, root);
          const dedupe = `${name}:${event}:${v.kind}:${v.key}`;
          if (seen.has(dedupe)) continue;
          seen.add(dedupe);
          if (v.kind === 'MISSING') missing.push(`${v.path} (${event}, ${name})`);
          else if (v.kind === 'UNVERIFIED') unresolvable.push(`${event}, ${name}: ${v.why}`);
          // OK is the only verdict that produces no output.
        }
      }
    }
  }

  const findings = [];
  if (shape.length) {
    findings.push(`${shape.length} hook CONFIG problem(s): ${shape.join('; ')}`);
  }
  if (unresolvable.length) {
    findings.push(
      `${unresolvable.length} hook registration(s) could NOT be verified: ${unresolvable.join('; ')}. ` +
      'This is UNKNOWN, not clean — check these by hand.'
    );
  }
  if (missing.length) {
    findings.push(
      `${missing.length} registered hook file(s) DO NOT EXIST: ${missing.join('; ')}. ` +
      'A hook the harness cannot find emits nothing, which is indistinguishable from a ' +
      'hook that ran and found no problems — so this protection is off and reads as on. ' +
      'Restore the file(s) or remove the registration; do not leave a phantom guard.'
    );
  }
  return {
    findings,
    // Stated so "hook-registration integrity" is never read as broader than it is.
    scopeNote: 'project scope only (.claude/settings.json, settings.local.json); user-global and managed settings are NOT inspected',
  };
}
