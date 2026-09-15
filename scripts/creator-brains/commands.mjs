#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/commands.mjs
 * PURPOSE: The command table — assembling the catalog commands, the run
 *          commands, and the operator commands behind one surface.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR02/03/23)
 * ADDED: 2026-09-13 | SPLIT 2026-09-13
 * ============================================================================
 *
 * THE EXIT-CODE CONTRACT LIVES IN `lib/exit.mjs` and is re-exported here, so
 * `import { EXIT, verdictExit } from './commands.mjs'` keeps working while the
 * individual command modules import the codes from a leaf module instead of from
 * the module that registers them (which would be a cycle).
 *
 * WHERE THE COMMANDS LIVE NOW:
 *   `run-commands.mjs`     daily, fetch, discover, build, repair  (they run the
 *                          pipeline and share the run-limit flags)
 *   `status-command.mjs`   status
 *   `canary-command.mjs`   canary
 *   `authorize-command.mjs`/`backup-command.mjs`   OAuth, backup/restore/rollback
 *   this file              the catalog commands and the two operator overrides
 *
 * @module creator-brains/commands
 */

import { RUN_COMMANDS } from './run-commands.mjs';
import { statusCommand } from './status-command.mjs';
import { canaryCommand } from './canary-command.mjs';
import { authorizeCommand } from './authorize-command.mjs';
import {
  backupCommand, verifyBackupCommand, restoreCommand, rollbackCommand,
} from './backup-command.mjs';
import {
  addCreator, listCreatorsSafe, setEnabled,
} from './lib/registry.mjs';
import { queryBrains, formatResults } from './lib/query.mjs';
import { syncSubscriptions } from './lib/subs.mjs';
import { describeRead } from './lib/store.mjs';
import { clearThrottle, throttleState, formatThrottle } from './lib/throttle.mjs';
import { positionals, flagValue } from './lib/cli-args.mjs';
import { EXIT, verdictExit } from './lib/exit.mjs';
import { root } from './lib/paths.mjs';

/** Exit codes, named so the callers cannot drift from the meaning. */
export { EXIT, verdictExit };

const out = (s) => process.stdout.write(`${s}\n`);

export const COMMANDS = {
  ...RUN_COMMANDS,

  async add({ args, r }) {
    const [ref] = positionals(args);
    if (!ref) { out('usage: cli.mjs add <@handle|channel-url|UC…id> [--name "Title"]'); return EXIT.REFUSED; }
    const res = await addCreator({ ref, r, name: flagValue(args, '--name') });
    if (!res.ok) { out(`refused: ${res.reason}`); return EXIT.REFUSED; }
    out(`added ${res.creator.title} (${res.creator.channelId}) — DISABLED`);
    out(`enable it with:  node scripts/creator-brains/cli.mjs enable ${res.creator.channelId}`);
    return EXIT.OK;
  },

  async list({ r }) {
    const res = listCreatorsSafe(r);
    if (!res.ok) { out(`refused: registry.json is ${describeRead(res.read)}`); return EXIT.REFUSED; }
    if (!res.creators.length) { out('no creators yet — add one with:  cli.mjs add @handle'); return EXIT.OK; }
    out('enabled  channel_id                    title');
    for (const c of res.creators) out(`${c.enabled ? '  yes  ' : '  no   '}  ${c.channelId}  ${c.title}`);
    out('');
    out(`${res.creators.length} creator(s), ${res.creators.filter((c) => c.enabled).length} enabled`);
    return EXIT.OK;
  },

  async enable({ args, r }) {
    const [id] = positionals(args);
    if (!id) { out('usage: cli.mjs enable <channel_id> [--off]'); return EXIT.REFUSED; }
    try {
      const c = setEnabled(r, id, !args.includes('--off'));
      out(`${c.title} is now ${c.enabled ? 'ENABLED' : 'disabled'}`);
      return EXIT.OK;
    } catch (e) { out(`refused: ${e.message}`); return EXIT.REFUSED; }
  },

  async query({ args, r }) {
    const terms = positionals(args);
    const creator = flagValue(args, '--creator');
    try {
      const res = queryBrains(terms.join(' '), { r, creator });
      out(formatResults(res));
      return res.hits.length ? EXIT.OK : EXIT.DEFERRED;
    } catch (e) { out(`refused: ${e.message}`); return EXIT.REFUSED; }
  },

  async status(ctx) { return statusCommand(ctx); },
  async canary(ctx) { return canaryCommand(ctx); },

  async authorize(ctx) {
    return authorizeCommand({
      credentialPath: flagValue(ctx.args, '--credential'),
      tokenStorePath: flagValue(ctx.args, '--token'),
      timeoutMs: Number(flagValue(ctx.args, '--timeout-ms')) || undefined,
    });
  },

  async backup(ctx) { return backupCommand({ r: ctx.r, args: ctx.args }); },
  async 'verify-backup'(ctx) { return verifyBackupCommand({ args: ctx.args }); },
  async restore(ctx) { return restoreCommand({ args: ctx.args }); },
  async rollback(ctx) { return rollbackCommand({ r: ctx.r, args: ctx.args }); },

  async sync({ r }) {
    const res = await syncSubscriptions({ r });
    if (res.blocked) {
      out(`BLOCKED: ${res.reason}`);
      out(res.message);
      out('');
      for (const s of res.steps) out(`  ${s}`);
      return EXIT.REFUSED;
    }
    out(`synced ${res.upserted} subscription(s); new creators are DISABLED`);
    if (res.note) out(`note: ${res.note}`);
    return EXIT.OK;
  },

  /**
   * `throttle` — show or clear the shared cooldown (HR23).
   *
   * The override is deliberately an explicit operator action with its own
   * command: resuming early is sometimes right (a misclassified error, a fixed
   * network) and it must be a decision someone made, not a side effect of
   * running the pipeline again.
   */
  async throttle({ args, r }) {
    if (args.includes('--clear')) {
      const res = clearThrottle(r);
      if (!res.ok) { out(`could not clear the cooldown: ${res.error}`); return EXIT.FAILED; }
      out(res.was.active
        ? `cooldown cleared (was ${res.was.kind} until ${res.was.until}) — traffic may resume`
        : 'no cooldown was active; nothing to clear');
      return EXIT.OK;
    }
    const st = throttleState(r);
    out(st.active ? `THROTTLED — ${formatThrottle(st)}` : 'not throttled — traffic is allowed');
    if (st.active) out('clear it with: node scripts/creator-brains/cli.mjs throttle --clear');
    return EXIT.OK;
  },
};

export { root };
