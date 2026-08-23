# Hostile review ROUND 4 — dry-check (2026-08-23)

Rounds 1-3 found 8 + 6 + 7 defects, all fixed. **This reviews the round-3 redesign.**

## The round-3 change (design, not a patch)

Three regex generations each broke in the opposite direction. So the design changed:

- **simple command** (`<interpreter> <plain-path> [args]`, NO shell metacharacters) -> ASSERT existence. A missing file is a real finding.
- **anything else** -> UNVERIFIED, judged at COMMAND level, never tokenised. Never "clean", never "missing".

Complex commands use an UNANCHORED extension search over the whole string (the only way `x.mjs;echo` is seen at all).
The report is deliberately under-specific: naming the file would mean parsing shell, which failed three times.

Also: blank/non-string `command` -> reported; `statSync().isFile()` not `existsSync` (directory posing as script);
dry-run exit now matches real-run coverage; API key length no longer printed.

## Case matrix currently passing 23/23

ASSERT: plain rel/abs/drive paths, bare names, .cjs/.ts
UNVERIFIED: $VAR, ${VAR}, "$VAR"/x, %VAR%, ~/, globs, `;`/`&&`/subshell-glued
NONE: quoted subcommand, npm run build, URLs
NO-COMMAND: empty/undefined command

## Questions

- Can a REAL missing hook still report clean (false negative)? That is the original outage.
- Can a HEALTHY hook still be reported missing (phantom)?
- Is the ASSERT branch genuinely safe, or does "no metacharacters" still admit an ambiguous command?
- Any defect in the panel exit-code / egress changes?

## FILE: scripts/hooks/drift-check-gate.mjs (check 7, current)

```javascript
// ---- 7) Hook-registration integrity: a registered guard whose file is absent ----
//
// THE FAILURE THIS CATCHES (2026-08-22, found by Sean from outside the system):
// `.claude/settings.json` registered `lane-session-start.mjs` (SessionStart) and
// `push-blast-radius.mjs` (PreToolUse). Neither file existed on the branch. The
// harness cannot run a file it cannot find, so it emitted NOTHING — and nothing is
// byte-identical to what a healthy guard that found no problems emits. No error, no
// warning, no degraded mode. Every session read as clean while the Coordination
// Ledger went unread for weeks and pushes went unguarded.
//
// That is the general shape and it is why this check has to be mechanical:
// REGISTRATION IS NOT EXISTENCE, and a guard's silence is ambiguous by construction.
// You cannot notice this from inside a session; the only prior detection was a human
// spotting a second-order symptom (agents ignoring each other's notes).
//
// Also covers the wider version: an unparseable settings file silently disables EVERY
// hook it declares, which is the same failure with a larger blast radius.
//
// EXTRACTION — rewritten 2026-08-23 (second panel round). Two regex generations both
// failed, in opposite directions, and a third regex was the wrong answer:
//   v1 required `scripts/` or `.claude/` in the path, so a bare
//      `node lane-session-start.mjs` — literally the file from the incident —
//      matched nothing and the check went silent.
//   v2 anchored on the extension, which fixed that but broke two new ways:
//      FALSE POSITIVE: `node $CLAUDE_PROJECT_DIR/scripts/hooks/x.mjs` (the canonical
//        portable idiom) matched `CLAUDE_PROJECT_DIR/scripts/hooks/x.mjs` and reported
//        a healthy hook as missing. A phantom finding is not a harmless over-report —
//        it trains the operator to ignore the gate, which restores the original outage.
//      FALSE NEGATIVE: no match could ever START with `/` or `X:`, so absolute paths
//        were invisible, and the `^(?:[A-Za-z]:|\/)` branch written to handle them was
//        unreachable dead code. `NOT_A_FILE` was dead too — every match ends in an
//        extension, so it could never equal `npm`/`node`.
// Tokenising is the honest tool: split the command, look at each argument as an
// argument. Anything unresolvable is reported as UNVERIFIABLE rather than guessed in
// either direction — because for this check, a confident wrong answer in EITHER
// direction is the failure mode.
try {
  const SCRIPT_EXT = /\.(?:mjs|cjs|js|ts|mts|cts|sh|bash|ps1|py|rb)$/i;
  const URL_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
  /**
   * Split a shell-ish command into arguments, honouring simple quoting.
   *
   * The alternation must GLUE a quoted run to whatever abuts it: the canonical
   * portable form is `node "$CLAUDE_PROJECT_DIR"/scripts/hooks/x.mjs`, and a
   * naive `"[^"]*"|'[^']*'|\S+` splits that into `$CLAUDE_PROJECT_DIR` plus a
   * dangling `/scripts/hooks/x.mjs`, which then reads as an ABSOLUTE path and is
   * reported missing — a phantom on a perfectly healthy hook. Caught by this
   * check's own case matrix 2026-08-23, after a panel seat predicted it.
   */
  const tokenize = (cmd) => (String(cmd).match(/(?:"[^"]*"|'[^']*'|[^\s"'])+/g) || [])
    .map((t) => t.replace(/["']/g, ''));

  // ROUND 3 REDESIGN — asserting MISSING requires an unambiguous command.
  //
  // Three rounds of panel review each broke the previous shell-parsing attempt, in
  // alternating directions: v1 under-matched, v2 phantomed on $VAR and went blind on
  // absolute paths, v3 phantomed on `~/` and `sh -c '...'` while going silent on
  // `x.mjs;echo` (metacharacter glued to the token defeats the $-anchored extension
  // test — the ORIGINAL outage shape, reopened by the fix for it).
  //
  // The pattern in those failures is not a missing case. It is that a static checker
  // cannot faithfully parse arbitrary shell, and every patch that made one direction
  // safer made the other worse. So stop trying to be right about every command and
  // become HONEST about which ones can be judged:
  //
  //   simple command  -> assert. `<interpreter> <plain-path> [plain args]`, no shell
  //                      metacharacters anywhere, no globs, no interpolation. Here a
  //                      non-existent file is a real finding.
  //   anything else   -> UNVERIFIED. Reported as "could not check", never as clean
  //                      and never as missing.
  //
  // This trades some coverage for zero phantoms and zero false clean. Both wrong
  // answers are eliminated; what remains is an honest "I could not judge this one",
  // which a human can action. A checker that says "unknown" is useful; one that says
  // "clean" when it did not look is the thing this whole check exists to destroy.
  const SHELL_META = /[;&|><`$(){}*?~!#\n]|\\\s/;   // anything that changes word meaning
  const missing = [];
  const unresolvable = [];
  const unreadable = [];

  for (const name of ['settings.json', 'settings.local.json']) {
    const cfgPath = join(SS_PT, '.claude', name);
    const raw = read(cfgPath);
    if (raw === null) continue;              // absent is legitimate — settings.local.json is optional

    let cfg;
    try {
      cfg = JSON.parse(raw);
    } catch {
      // Not fail-open: a settings file the harness cannot parse runs NO hooks at all.
      unreadable.push(name);
      continue;
    }

    const seen = new Set();
    for (const [event, groups] of Object.entries(cfg.hooks || {})) {
      // A structurally-wrong hooks block is itself a finding. The previous version
      // coerced anomalies to [] and enumerated nothing, which reported "clean" for a
      // config the harness probably cannot run — the silence-means-clean pathology
      // reborn inside the fix meant to kill it. Flag the shape, then skip it.
      if (!Array.isArray(groups)) {
        unresolvable.push(`${event} in ${name} is ${groups === null ? 'null' : typeof groups}, not an array — hooks here may not run at all`);
        continue;
      }
      for (const group of groups) {
        if (!Array.isArray(group?.hooks)) {
          unresolvable.push(`a group under ${event} in ${name} has no hooks array — that group registers nothing`);
          continue;
        }
        for (const hook of group.hooks) {
          const cmd = hook?.command;
          const where = `${event}, ${name}`;

          // An entry with no usable command registers nothing. Silently skipping it
          // is the same silence-means-clean pathology one level further down —
          // caught by a panel seat in round 3 after round 2 fixed only the group level.
          if (typeof cmd !== 'string' || !cmd.trim()) {
            unresolvable.push(`a hook entry under ${where} has no usable "command" string — it registers nothing`);
            continue;
          }

          // A COMPLEX command is judged whole and never tokenised. `x.mjs;echo`
          // glues a metacharacter to the path, so the token fails the $-anchored
          // extension test and would be dropped BEFORE any per-token gate could see
          // it — silent, which is the original outage shape. So when the command
          // uses shell syntax, look for a script extension ANYWHERE in it (unanchored)
          // and emit one command-level "not verified". Under-specific on purpose:
          // naming the file would mean parsing the shell, which is what failed three
          // times. "This registration was not checked" is the honest, actionable claim.
          if (SHELL_META.test(cmd) || /%[A-Za-z_][A-Za-z0-9_]*%/.test(cmd)) {
            if (/\.(?:mjs|cjs|js|ts|mts|cts|sh|bash|ps1|py|rb)\b/i.test(cmd)) {
              const key = `${event}:${cmd}`;
              if (!seen.has(key)) {
                seen.add(key);
                unresolvable.push(`${where}: \`${cmd.slice(0, 90)}\` — uses shell syntax (variable, glob, operator or subshell); existence NOT verified`);
              }
            }
            continue;
          }

          for (const rawTok of tokenize(cmd)) {
            const tok = rawTok.replace(/\\/g, '/');
            if (!SCRIPT_EXT.test(tok)) continue;          // not a script argument
            // A remote URL ending in .sh is not a local file and must never be
            // reported missing — `curl https://host/x.sh` would otherwise phantom.
            if (URL_SCHEME.test(tok)) continue;
            // A quoted subcommand (`sh -c 'node scripts/x.mjs'`) survives tokenising
            // as one space-bearing token. It is a command, not a path.
            if (/\s/.test(tok)) continue;

            const key = `${event}:${tok}`;
            if (seen.has(key)) continue;
            seen.add(key);

            // (complex commands never reach here — they are handled whole, above)

            // Absolute: POSIX /…, Windows C:/…, or UNC //host/share.
            const isAbs = tok.startsWith('/') || /^[A-Za-z]:\//.test(tok);
            const abs = isAbs ? tok : join(SS_PT, tok);
            // isFile, not exists: a DIRECTORY named `x.mjs` satisfies existsSync and
            // would let a phantom registration read as healthy (panel round 3).
            let ok = false;
            try { ok = statSync(abs).isFile(); } catch { ok = false; }
            if (!ok) missing.push(`${tok} (${where})`);
          }
        }
      }
    }
  }

  // Reported at LOWER volume than `missing`: these are "could not check", not
  // "is broken". Stating the difference is the whole point — an unverified item
  // must never be laundered into either a clean bill or a phantom alarm.
  if (unresolvable.length) {
    findings.push(
      `${unresolvable.length} hook registration(s) could NOT be verified: ` +
      `${unresolvable.join('; ')}. This is UNKNOWN, not clean — check these by hand.`
    );
  }
  if (unreadable.length) {
    findings.push(
      `.claude/${unreadable.join(' and ')} is not valid JSON — the harness runs NONE of the ` +
      'hooks it declares. Every gate those files register is silently inactive right now.'
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
} catch (err) {
  // FAIL-OPEN, NOT FAIL-SILENT. The first version swallowed its own errors and
  // emitted nothing — which is byte-identical to "no phantom guards found", i.e. the
  // exact ambiguity this check's own header lectures about. Two panel seats caught
  // the hypocrisy 2026-08-23. A guard that cannot run must SAY it could not run;
  // it still must not block session start.
  findings.push(
    `hook-registration check could not complete (${err?.message || err}). Phantom-guard ` +
    'detection did NOT run this session — its silence means "unknown", not "clean".'
  );
}

// ---- Emit: silent when clean ----------------------------------------------

```
