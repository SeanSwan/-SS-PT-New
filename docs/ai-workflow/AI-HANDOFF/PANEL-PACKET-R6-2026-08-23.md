# Hostile review ROUND 6 — dry-check (2026-08-23)

Rounds 1-5 found 8+6+7+8+4 defects, all fixed (plus 1 disproven). **Review the round-5 state.**

## Current design

Invariant: every hook entry returns EXACTLY ONE verdict — OK | MISSING | UNVERIFIED. Never zero.

ASSERT only when ALL hold: no quotes, no shell metacharacters (incl `[]`,`^`,backslash),
no Windows env interpolation, EXACTLY ONE argument bearing a script extension, and that path
is relative. Then statSync: isFile -> OK; ENOENT -> MISSING; any other errno -> UNVERIFIED.

Everything else -> UNVERIFIED with a stated reason.

Round 5 also: settings.json read distinguishes ENOENT from EACCES/EISDIR (unreadable = finding);
dedupe key includes verdict kind; dead backslash-replace removed; absolute paths always decline.

Test: 24 cases + 15 fuzz inputs asserting the INVARIANT (each yields exactly one verdict).

## Questions

- Can ANY input still yield zero verdicts (silent clean)? Five rounds have each found one.
- Can a HEALTHY registration read MISSING?
- Is UNVERIFIED now so broad the check is useless? (All 13 real registrations must still be OK.)
- Any defect in the emit/reporting logic itself?

## FILE: scripts/hooks/drift-check-gate.mjs (check 7, current — COMPLETE)

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
    // (No backslash normalisation here — SHELL_META already routes any command
    // containing `\` to UNVERIFIED, so a replace would be unreachable. Windows
    // drive paths therefore report as unverified rather than being half-judged.)
    const words = cmd.trim().split(/\s+/);
    const candidates = words.filter((w) => SCRIPT_EXT.test(w) && !URL_SCHEME.test(w));

    if (candidates.length === 0) {
      // Extensionless or unrecognised. NOT clean — an extensionless registration is
      // exactly as capable of being absent as one ending in .mjs (panel round 4).
      return unver('no argument carries a recognised script extension, so the registered file could not be identified');
    }
    if (candidates.length > 1) {
      // Which one is the ENTRYPOINT? `node --import ./preload.mjs ./guard.mjs` has
      // two, and taking the first meant asserting the loader (present -> OK) while
      // the actually-registered guard was never inspected — silent clean on a
      // missing hook, the original outage. Found by a panel seat in round 5.
      // Deciding requires knowing each interpreter's flag grammar; declining is honest.
      return unver(`names ${candidates.length} script paths (${candidates.join(', ')}) — cannot tell which is the entrypoint`);
    }

    const tok = candidates[0];
    const isAbs = tok.startsWith('/') || /^[A-Za-z]:\//.test(tok);
    // An absolute path is meaningful only on the machine it names, whether or not a
    // file happens to sit there now. Round 4 judged only the absent half, which is
    // exactly half a claim; decline both.
    if (isAbs) {
      return unver('names an absolute path, which is meaningful only on the target machine');
    }

    // isFile, not exists: a DIRECTORY named `x.mjs` satisfies existsSync and would
    // let a phantom registration read as healthy (panel round 3).
    // ENOENT means genuinely absent. Any OTHER errno (EACCES, ELOOP, EISDIR) means
    // the file may well exist and we simply could not look — reporting that as
    // "DOES NOT EXIST" is a factually wrong claim that erodes trust in the loud path.
    try {
      return statSync(join(SS_PT, tok)).isFile()
        ? { kind: 'OK', key: tok }
        : { kind: 'MISSING', key: tok, path: tok };
    } catch (e) {
      if (e?.code === 'ENOENT') return { kind: 'MISSING', key: tok, path: tok };
      return unver(`could not stat ${tok} (${e?.code || 'unknown error'}) — it may exist but be unreadable`);
    }
  }

  for (const name of ['settings.json', 'settings.local.json']) {
    const cfgPath = join(SS_PT, '.claude', name);
    // NOT the shared read() helper here: it collapses every failure to null, so an
    // unreadable settings.json (EACCES, EISDIR) would be skipped exactly like an
    // absent optional one — the silence-means-clean pathology one layer above the
    // hooks it guards. Absent is legitimate; unreadable is a finding. (Panel round 5.)
    let raw = null;
    try {
      raw = readFileSync(cfgPath, 'utf-8');
    } catch (e) {
      if (e?.code !== 'ENOENT') {
        unresolvable.push(`.claude/${name} exists but could not be read (${e?.code || 'unknown'}) — the hooks it registers were NOT checked`);
      }
      continue;                              // ENOENT: settings.local.json is optional
    }

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

          // Dedupe only IDENTICAL findings — the same file missing under the same
          // event, reported once. Keying on the verdict KIND as well means a second
          // entry can never be silently swallowed by a first one of a different kind,
          // which is what "the caller cannot skip an entry" has to mean in practice.
          const dedupe = `${name}:${event}:${verdict.kind}:${verdict.key}`;
          if (seen.has(dedupe)) continue;
          seen.add(dedupe);

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
if (findings.length) {
  process.stdout.write(
    '[drift-check] ⚠ ' + findings.length + ' drift finding(s) — a doc that reads as ' +
    'authoritative may be wrong:\n' +
    findings.map((f, i) => `  ${i + 1}. ${f}`).join('\n') +
    '\nFull procedure (7 checks incl. stale registry, stale index, missing tooling, ' +
    'guard coverage gaps, hook-registration integrity): .claude/skills/drift-check/SKILL.md\n'
  );
}

process.exit(0);

```
