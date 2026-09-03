#!/usr/bin/env node
/**
 * npx-decoy-gate.mjs — PreToolUse(Bash). Blocks `npx <verifier>` that may silently
 * install and run a DIFFERENT package than the one you meant.
 *
 * WHY THIS EXISTS
 *   2026-08-25, verifying a money-path rescue: `npx tsc --noEmit` printed
 *
 *       This is not the tsc command you are looking for
 *
 *   and exited 1. `tsc` is a real npm package that is NOT the TypeScript compiler. The
 *   local `node_modules/.bin/tsc` shim had not been linked, so npx went to the registry,
 *   fetched a stranger's package, and ran it. The reading was `exit 1, 0 errors` — which
 *   is neither a pass nor a type error, but looks like both depending on which half you
 *   read. Two minutes later the *real* tsc OOM'd at exit 134 with zero error lines, which
 *   reads as CLEAN if you count only error lines.
 *
 *   Two false readings in a row on the same verification, in the same session, on money
 *   -path code that was about to be reported as verified.
 *
 * THE DEFECT IT KILLS
 *   A verifier is trusted precisely because you are not going to check it. When npx can
 *   substitute the binary, the instrument you are trusting is not the instrument you named.
 *   `--no-install` removes the substitution: if the local binary is absent, the command
 *   fails LOUDLY instead of quietly running something else.
 *
 * WHY A HOOK AND NOT A RULE
 *   The governing discipline already existed as prose AND as a skill (`instrument-check`,
 *   "validate the instrument before believing a negative"). It was in context. It did not
 *   fire. The same session logged three instrument-trust near-misses, all three caught by
 *   reflex and NONE by mechanism — while the one class that HAS a gate (`$?` after a
 *   pipeline) was caught in under a second, despite being an error the same agent had
 *   already written up and repeated anyway.
 *
 *   That contrast is the whole argument: reflex is what the corpus proves unreliable.
 *
 * DELIBERATELY NARROW
 *   Only `npx` (or `pnpm dlx` / `yarn dlx`) invoking a known VERIFIER — a tool whose output
 *   is read as evidence. Package runners for scaffolding, codegen or one-off utilities are
 *   untouched: running a stranger's scaffolder is a choice, trusting a stranger's type
 *   checker is an accident. The fix is one flag, so complying is cheaper than bypassing —
 *   the property that keeps a gate switched on.
 */

import fs from 'node:fs';

const VERIFIERS = [
  'tsc', 'vitest', 'jest', 'mocha', 'eslint', 'tslint', 'prettier',
  'playwright', 'cypress', 'ava', 'nyc', 'c8', 'stylelint', 'depcheck', 'knip',
];

const ALLOW = () => process.exit(0);

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

export function offendingVerifier(command) {
  if (typeof command !== 'string' || !command) return null;

  // Strip quoted strings so a verifier named inside an echo/commit-message is not a hit.
  const bare = command.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""');

  // Each runner invocation, examined independently: `a && npx tsc || npx --no-install jest`
  const runner = /\b(?:npx|pnpm\s+dlx|yarn\s+dlx|bunx)\b([^&|;]*)/g;
  let m;
  while ((m = runner.exec(bare)) !== null) {
    const tail = m[1];
    if (/--no-install\b|--offline\b/.test(tail)) continue; // already pinned to local
    const tokens = tail.trim().split(/\s+/).filter(Boolean);
    // First non-flag token is the package being run.
    const target = tokens.find((t) => !t.startsWith('-'));
    if (!target) continue;
    const name = target.split('/').pop();
    if (VERIFIERS.includes(name)) return name;
  }
  return null;
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readStdin() || '{}');
  } catch {
    return ALLOW(); // unparseable input is not our business — fail open, loudly elsewhere
  }
  if (payload?.tool_name !== 'Bash') return ALLOW();

  const hit = offendingVerifier(payload?.tool_input?.command);
  if (!hit) return ALLOW();

  console.error(
    [
      '',
      `  NPX DECOY GATE — \`npx ${hit}\` may run a DIFFERENT package than you mean.`,
      '',
      `  If the local \`node_modules/.bin/${hit}\` shim is missing, npx goes to the registry`,
      '  and runs whatever is published under that name. On 2026-08-25 `npx tsc` did exactly',
      '  this and answered "This is not the tsc command you are looking for" with exit 1 —',
      '  a reading that is neither a pass nor a type error, on money-path code about to be',
      '  reported as verified.',
      '',
      '  A verifier is trusted precisely because you will not check it. Do not let the binary',
      '  be substitutable.',
      '',
      '  FIX — pick one:',
      `    npx --no-install ${hit} ...        fails loudly if the local binary is absent`,
      `    node node_modules/<pkg>/bin/${hit}  invoke the installed entry directly`,
      `    npm run <script>                   use the package.json script that pins it`,
      '',
      '  Nothing was run. Re-issue with one of the above and it passes silently.',
      '',
    ].join('\n'),
  );
  process.exit(2); // non-zero blocks the tool call
}

// Only run when EXECUTED, never on import — so the unit test can import the matcher.
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('npx-decoy-gate.mjs')) {
  try {
    main();
  } catch (err) {
    console.error(`[npx-decoy] gate error, failing open: ${err?.message}`);
    ALLOW();
  }
}
