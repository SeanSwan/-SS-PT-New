# Hostile review ROUND 5 — dry-check (2026-08-23)

Rounds 1-4 found 8+6+7+8 defects, all fixed. **This reviews the round-4 redesign.**

## The round-4 change: a structural invariant, not more cases

Every prior version had some input that fell through every branch and produced NO output.
"Nothing" is byte-identical to "checked and healthy". Round 3 even shipped a PASSING TEST
asserting `sh -c ...` yields nothing. So the contract became structural:

```
every hook entry returns EXACTLY ONE verdict: OK | MISSING | UNVERIFIED
no path returns nothing — silence is unrepresentable
```

`classifyCommand` is a total function; the caller cannot skip an entry.
ASSERT only for `[interpreter] <path-with-ext> [args]` with NO quotes/meta/escapes,
and only the FIRST script-bearing arg (later ones are options/outputs).
Everything else -> UNVERIFIED: quoted subcommands, extensionless, globs incl `[]`/`^`,
interpolation, backslash escapes, absolute paths absent on THIS machine.

Test asserts the INVARIANT by fuzzing (each input yields a verdict), not just known answers.
Current: 23/23 cases, 11/11 fuzz, all 13 real registrations OK with zero noise.

## Questions

- Can ANY input still produce zero verdicts (silent clean)? That is the original outage.
- Can a HEALTHY registration be reported MISSING (phantom)?
- Is the ASSERT branch airtight, or does "no quotes and no metacharacters" still admit ambiguity?
- Is UNVERIFIED now so broad it is useless in practice (all 13 real hooks must still be OK)?

## FILE: scripts/hooks/drift-check-gate.mjs (check 7, current)

```javascript
  // ROUND 4 — THE INVARIANT. Every previous version had the same latent shape: some
  // input fell through every branch and produced NO output, which is byte-identical
  // to "checked and healthy". Round 3 even shipped a passing test case asserting
  // that `sh -c 'node scripts/x.mjs'` yields nothing — codifying the outage as
  // correct behaviour. Three panel seats caught that using my own matrix as evidence.
  //
  // So the contract is now structural, not case-by-case:
  //
  //     EVERY hook entry returns EXACTLY ONE verdict: OK | MISSING | UNVERIFIED.
  //     There is no path that returns nothing. Silence is unrepresentable.
  //
  // And assertion is narrowed to the only shape that can be judged safely:
  // `[interpreter] <path-with-script-extension> [args…]` with no quotes, no shell
  // metacharacters, no escapes — and ONLY the first such path is asserted, because
  // later arguments are options and outputs (`--emit dist/preview.mjs`), not the
  // registered script. Anything outside that shape is UNVERIFIED by construction:
  // extensionless commands, quoted subcommands, globs, interpolation, `sh -c`.
  //
  // This deliberately verifies less than v3 and lies in neither direction.
  const SHELL_META = /[;&|><`$(){}\[\]*?~!#^\n]|\\/;   // anything that changes word meaning
  const missing = [];
  const unresolvable = [];
  const unreadable = [];

  /**
   * Classify ONE hook command. Total function: always returns a verdict.
   * @returns {{kind:'OK'|'MISSING'|'UNVERIFIED', key:string, path?:string, why?:string}}
   */
  function classifyCommand(cmd) {
    if (typeof cmd !== 'string' || !cmd.trim()) {
      return { kind: 'UNVERIFIED', key: `empty:${String(cmd)}`, why: 'hook entry has no usable "command" string — it registers nothing' };
    }
    const brief = cmd.length > 90 ? `${cmd.slice(0, 90)}…` : cmd;
    const unver = (why) => ({ kind: 'UNVERIFIED', key: cmd, why: `\`${brief}\` — ${why}; existence NOT verified` });

    if (/["']/.test(cmd)) return unver('contains quoting (a subcommand or a path with spaces) that cannot be resolved statically');
    if (SHELL_META.test(cmd)) return unver('uses shell syntax (variable, glob, operator, subshell or escape)');
    if (/%[A-Za-z_][A-Za-z0-9_]*%/.test(cmd)) return unver('uses Windows environment interpolation');

    // Plain whitespace split is now sound: no quotes and no escapes remain.
    const words = cmd.trim().split(/\s+/);
    const candidate = words.find((w) => SCRIPT_EXT.test(w) && !URL_SCHEME.test(w));
    if (!candidate) {
      // Extensionless or unrecognised. NOT clean — an extensionless registration is
      // exactly as capable of being absent as one ending in .mjs (panel round 4).
      return unver('no argument carries a recognised script extension, so the registered file could not be identified');
    }

    const tok = candidate.replace(/\\/g, '/');
    const isAbs = tok.startsWith('/') || /^[A-Za-z]:\//.test(tok);
    // An absolute path is meaningful only on the machine it names. Asserting it from
    // a different host phantoms on every run (panel round 4) — so report, don't judge.
    if (isAbs && !existsSync(tok)) {
      return unver('names an absolute path that is not present on THIS machine — may be valid on the target host');
    }
    const abs = isAbs ? tok : join(SS_PT, tok);
    // isFile, not exists: a DIRECTORY named `x.mjs` satisfies existsSync and would
    // let a phantom registration read as healthy (panel round 3).
    let ok = false;
    try { ok = statSync(abs).isFile(); } catch { ok = false; }
    return ok ? { kind: 'OK', key: tok } : { kind: 'MISSING', key: tok, path: tok };
  }

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
          const where = `${event}, ${name}`;
          const verdict = classifyCommand(hook?.command);

          if (seen.has(`${event}:${verdict.key}`)) continue;
          seen.add(`${event}:${verdict.key}`);

          if (verdict.kind === 'MISSING') missing.push(`${verdict.path} (${where})`);
          else if (verdict.kind === 'UNVERIFIED') unresolvable.push(`${where}: ${verdict.why}`);
          // 'OK' is the only outcome that produces no output.
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
