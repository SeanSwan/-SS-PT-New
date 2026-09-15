#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/cli-args.mjs
 * PURPOSE: Argument reading and selection resolution shared by the command
 *          modules — and the run-limit flags (review HR23).
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR02/23)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHY IT IS SHARED RATHER THAN DUPLICATED:
 *   `commands.mjs` grew past the Rule 4 cap when the execution bounds landed, so
 *   the commands that run the pipeline moved to `run-commands.mjs`. Both need to
 *   read the same flags the same way — and the reviewer already found one defect
 *   of exactly this shape: `--per-hour=2` was once looked up as a channel id
 *   (HR02), so "a flag is never a creator reference" has to be enforced in ONE
 *   place rather than remembered in several.
 *
 * @module creator-brains/cli-args
 */

import {
  readRegistry, registryOrDefault, isDamaged, describeRead, enabledCreators,
} from './store.mjs';

/** Positional arguments only — a flag is never a creator reference (HR02). */
export function positionals(args = []) {
  const list = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a.startsWith('--')) {
      // Skip a flag's value when it is given as the next bare token.
      if (!a.includes('=') && args[i + 1] && !args[i + 1].startsWith('--')) i += 1;
      continue;
    }
    list.push(a);
  }
  return list;
}

export function flagValue(args = [], name, fallback = null) {
  const withEq = args.find((a) => a.startsWith(`${name}=`));
  if (withEq) return withEq.slice(name.length + 1);
  const i = args.indexOf(name);
  if (i > -1 && args[i + 1] && !args[i + 1].startsWith('--')) return args[i + 1];
  return fallback;
}

/**
 * The execution-bound flags, read once for every command that runs the pipeline
 * (HR23). Values are passed through RAW: `bounds.mjs` decides what is a valid
 * limit, so `0`, `abc` and `Infinity` are refused with one message in one place
 * instead of three subtly different fallbacks.
 */
export function runLimits(args = []) {
  return {
    budget: { perHour: flagValue(args, '--per-hour') ? Number(flagValue(args, '--per-hour')) : undefined },
    bounds: {
      maxMinutes: flagValue(args, '--max-minutes'),
      maxOps: flagValue(args, '--max-ops'),
    },
    noTrackHours: flagValue(args, '--no-track-hours'),
  };
}

/** The one line that says what the run was allowed to do, what it spent, and
 *  whether a limit rather than completion stopped it (HR23). */
export function formatLimits(record) {
  const b = record.bounds || {};
  const budget = record.budget || {};
  const ops = `${record.counts.transportOps ?? 0}${b.maxOps ? `/${b.maxOps}` : ''}`;
  const elapsed = `${Math.round((b.elapsedMs || 0) / 1000)}s of ${b.maxMinutes || '?'} min`;
  return `  budget ${budget.used ?? 0}/${budget.perHour ?? '?'} · transport ops ${ops} · ${elapsed}`;
}

/** Resolve explicit channel selections against the enabled registry (HR02).
 *  A selection naming a disabled or unknown creator is a REFUSAL, never a silent
 *  widening into "fetch everybody". */
export function resolveSelection(r, wanted) {
  const read = readRegistry(r);
  if (isDamaged(read)) return { ok: false, reason: `registry.json is ${describeRead(read)}` };
  const reg = registryOrDefault(read);
  const enabled = enabledCreators(reg);
  if (!wanted.length) return {
    ok: true, enabled, onlyCreators: null, reg,
  };
  const byId = new Map(Object.values(reg.creators).map((c) => [c.channelId, c]));
  const only = [];
  for (const w of wanted) {
    const hit = byId.get(w)
      || Object.values(reg.creators).find((c) => c.handle && c.handle.toLowerCase() === w.toLowerCase());
    if (!hit) return { ok: false, reason: `'${w}' is not in the registry` };
    if (!hit.enabled) return { ok: false, reason: `'${hit.title || hit.channelId}' is disabled — enable it first` };
    only.push(hit.channelId);
  }
  return {
    ok: true, enabled: enabled.filter((c) => only.includes(c.channelId)), onlyCreators: only, reg,
  };
}
