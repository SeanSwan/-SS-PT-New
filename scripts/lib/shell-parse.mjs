/**
 * shell-parse.mjs — parse a Bash command into commands and argv, so the spend gate
 * can reason about STRUCTURE instead of pattern-matching text.
 * =============================================================================
 * WHY THIS EXISTS. Six rounds of hostile review found roughly twenty bypasses in a
 * regex-and-string-scan gate, and by round 4 **five of the six live bypasses were
 * created by my own fixes from rounds 2 and 3**:
 *
 *   node scripts/consult-fable.mjs --document x --check    -> exit 0
 *   node --version && node scripts/consult-fable.mjs …     -> exit 0
 *   bash -c "cd /srv/app && node scripts/consult-fable.mjs" -> exit 0
 *   node "scripts/consult-fable.mjs" --document x          -> exit 0
 *   sh -c "exec node scripts/consult-fable.mjs …"          -> exit 0
 *   <panel> && <kimi>  -> the panel's fan-out priced at $0
 *
 * Every one is the same root cause: a flat regex has no notion of WHERE a token sits.
 * `--check` means "do not execute" only between the runner and the file; quotes are
 * structure, not noise; a compound line is N commands, not one. Each patch bolted a
 * position rule onto a positionless matcher, and each new rule opened a new hole.
 * Round 3's quoted-span alternation was even made dead code by round 3's own mask.
 *
 * The pattern was not converging, so this replaces it. Parse once, then ask ordinary
 * questions of the result: which commands are there, what is argv[0], where does the
 * script sit relative to its flags. Whole classes stop existing rather than being
 * enumerated — which is the same lesson as `paid-seats.mjs` replacing a hand-curated
 * seat list with a contract.
 *
 * DELIBERATELY NOT A SHELL. No expansion, no substitution, no globbing, no here-docs.
 * `$VAR` indirection and `npm run` wrappers remain out of reach for any text-level
 * control, and `paid-seats.mjs` records that. This models quoting, splitting and
 * argument order — the parts the bypasses actually used.
 */

const RUNNERS = new Set(['node', 'npx', 'bun', 'bunx', 'tsx', 'ts-node']);

/** Wrappers that precede a real command without changing what it runs. */
const TRANSPARENT = new Set(['env', 'exec', 'nohup', 'command', 'time', 'stdbuf']);

/** Shells whose `-c` argument is itself a command line to parse. */
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh']);

/**
 * Flags whose VALUE is a file the runner will execute. Short, semantic and closed —
 * these are the options whose job is to load code — unlike "flags that take a value",
 * which is open-ended and is what made attempt two a bypass.
 */
const LOADER_FLAGS = new Set(['--require', '-r', '--import', '--loader', '--experimental-loader']);

/**
 * Flags that make a runner parse-and-exit instead of executing.
 *
 * `-c` added and `-c-check` removed 2026-08-27 (GLM 5.3-flash round-5 F1). `-c-check`
 * was never a token any shell produces — it is the wreckage of an earlier edit — while
 * `-c`, node's actual shorthand for `--check`, was missing. So `node -c <seat>` was
 * priced at $1.06 and BLOCKED: a syntax check refused as if it were a paid call. This
 * file already records refusing my own `node --check` mid-repair as the cry-wolf
 * failure worse than a hole; the same workflow one keystroke over still did it. A dead
 * entry sitting beside the missing real one is what a fix colliding with its own
 * encoding looks like.
 */
const NON_EXECUTING_FLAGS = new Set(['--check', '-c', '--version', '-v']);

const basename = (p) => String(p).replace(/^.*[/\\]/, '');

/**
 * Split into segments at UNQUOTED separators, then tokenise each into argv.
 * Quotes are consumed as structure: a token records whether it was quoted, because
 * a quoted arg is data even when it looks like a path.
 */
export function parseCommands(input) {
  const text = String(input || '');
  const commands = [];
  let argv = [];
  let token = '';
  let tokenQuoted = false;
  let started = false;
  let quote = null;

  const endToken = () => {
    if (started) argv.push({ value: token, quoted: tokenQuoted });
    token = ''; tokenQuoted = false; started = false;
  };
  const endCommand = () => {
    endToken();
    if (argv.length) commands.push(argv);
    argv = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) { quote = null; continue; }
      token += ch; started = true; continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; started = true; tokenQuoted = true; continue; }
    // BACKSLASH ESCAPES, not just line continuation (GLM 5.3-flash round-5 B1).
    // The only rule used to be `\` + newline; every other backslash fell through to
    // `token += ch`, so `scripts/consult\-fable.mjs` — which POSIX executes as the
    // real file — tokenised WITH the backslash, failed SEAT_NAME's `[a-z0-9-]`, and
    // minted a free Fable call from one character. The header claimed quoting was
    // modelled; half of it was. An escape consumes itself and yields the next char.
    if (ch === '\\') {
      if (text[i + 1] === '\n') { i += 1; continue; }   // line continuation
      if (i + 1 < text.length) { token += text[i + 1]; started = true; i += 1; continue; }
      continue;
    }
    if (ch === ';' || ch === '\n' || ch === '|' || ch === '&') {
      // `&&` and `||` are two chars; a single one separates too.
      if (text[i + 1] === ch) i += 1;
      endCommand();
      continue;
    }
    // REDIRECTIONS are structure, not arguments (GLM 5.3 round-5 B1). `>` and `<`
    // were ordinary characters, so `node >out.mjs scripts/consult-fable.mjs` put
    // `>out.mjs` in the script slot: it ends in `.mjs`, the runner loop took the
    // FIRST such token and stopped, and the real seat was never looked at. Exit 0.
    //
    // A redirect target is not a token the command receives, so it is dropped along
    // with any `2`/`&` file-descriptor prefix already accumulated. Redirection is
    // ordinary shell grammar — squarely inside this parser's stated charter of
    // quoting, splitting and argument order — not the expansion it declines to model.
    if (ch === '>' || ch === '<') {
      if (/^[0-9&]*$/.test(token)) { token = ''; started = false; } // `2>`, `&>`, `>`
      else endToken();
      while (text[i + 1] === '>' || text[i + 1] === '<' || text[i + 1] === '&') i += 1; // `>>`, `>&`
      while (text[i + 1] === ' ' || text[i + 1] === '\t') i += 1;
      // Consume the target, honouring quotes so `> "a b.txt"` drops the whole name.
      let q = null;
      while (i + 1 < text.length) {
        const c = text[i + 1];
        if (q) { if (c === q) q = null; i += 1; continue; }
        if (c === '"' || c === "'") { q = c; i += 1; continue; }
        if (/[\s;|&()]/.test(c)) break;
        i += 1;
      }
      continue;
    }
    if (ch === '(' || ch === ')' || ch === '{' || ch === '}') { endCommand(); continue; }
    if (ch === ' ' || ch === '\t' || ch === '\r') { endToken(); continue; }
    token += ch; started = true;
  }
  endCommand();
  return commands;
}

/** Strip leading `NAME=value` assignments and transparent wrappers. */
function stripPrefixes(argv) {
  let i = 0;
  while (i < argv.length) {
    const t = argv[i];
    if (!t.quoted && /^[A-Za-z_][A-Za-z0-9_]*=/.test(t.value)) { i += 1; continue; }
    const b = basename(t.value);
    if (TRANSPARENT.has(b)) {
      i += 1;
      // A WRAPPER'S OWN FLAGS (GLM 5.3 round-5 B4, reproduced — the command was
      // orphaned entirely, parsed=[none]): `stdbuf -oL node <seat>` skipped `stdbuf`,
      // then broke on `-oL` — not an assignment, not a wrapper, not `timeout` — so
      // argv[0] became a flag and the seat vanished. `env -i`, `nice -n 10` and
      // `nohup` behave the same way. Skipping a wrapper without skipping its options
      // is only half a strip, and the half that is missing is the half that hides the
      // command. `--` ends the options, so stop there rather than eating the runner.
      while (argv[i] && argv[i].value.startsWith('-') && argv[i].value !== '--') i += 1;
      if (argv[i] && argv[i].value === '--') i += 1;
      // `timeout 60 node …` — skip a bare numeric/duration argument.
      if (b === 'time' && argv[i] && /^[\d.]+[smh]?$/.test(argv[i].value)) i += 1;
      continue;
    }
    if (b === 'timeout') {
      i += 1;
      while (argv[i] && /^(-|\d)/.test(argv[i].value)) i += 1;
      continue;
    }
    break;
  }
  return argv.slice(i);
}

/**
 * Every script a command line would actually EXECUTE, in order.
 *
 * Returns `{ path, nonExecuting }` per invocation. `nonExecuting` is true only when a
 * parse-only flag sits BETWEEN the runner and the script — the position rule that a
 * flat regex could not express, and the exact hole `--check` opened when it was
 * matched line-globally.
 */
export function invokedScripts(input, depth = 0) {
  if (depth > 4) return []; // `sh -c "sh -c \"…\""` has to stop somewhere
  const out = [];

  for (const raw of parseCommands(input)) {
    const argv = stripPrefixes(raw);
    if (!argv.length) continue;
    const head = basename(argv[0].value);

    // `sh -c "<command line>"` — the argument IS a command line, so recurse into it.
    if (SHELLS.has(head)) {
      const cIdx = argv.findIndex((t, k) => k > 0 && /^-[a-z]*c[a-z]*$/.test(t.value));
      if (cIdx > 0 && argv[cIdx + 1]) out.push(...invokedScripts(argv[cIdx + 1].value, depth + 1));
      continue;
    }

    if (RUNNERS.has(head)) {
      let nonExecuting = false;
      let positionalFound = false;
      for (let i = 1; i < argv.length; i += 1) {
        const t = argv[i];
        // The script is the first token that LOOKS LIKE A SCRIPT, not merely the
        // first non-flag token. `node --require "a|b" scripts/consult-fable.mjs`
        // has a flag VALUE in between, and treating that as the script made three
        // round-2 regression tests fail the moment the parser landed — a value is
        // not a flag and is not a script either. Knowing which flags take values
        // would mean enumerating node's options, which is the hand-curated-list
        // failure this whole workstream is about; the file extension is intrinsic.
        // `bunx tsx script.mjs` falls out of the same rule for free.
        //
        // Only flags BEFORE the script can stop it running. A trailing `--check` is
        // an argument the target ignores, which is exactly how the carve-out became
        // a bypass. Position is the whole point, and a parser is what makes position
        // expressible.
        if (!/\.(mjs|js|cjs)$/.test(t.value)) {
          if (t.value.startsWith('-') && NON_EXECUTING_FLAGS.has(t.value.split('=')[0])) nonExecuting = true;
          continue;
        }
        // WHICH TOKENS WILL THE RUNNER EXECUTE? That is the only question, and it took
        // three attempts to ask it properly.
        //
        // The loop first stopped at the first script-shaped token, which flash's
        // round-5 B2 broke: `node --require ./prelude.js <seat>` took `./prelude.js` as
        // THE script and made the real seat its argv.
        //
        // Attempt two — "a candidate preceded by a non-parse-only flag is that flag's
        // value" — was ITSELF a bypass, found by mutation-testing minutes after it
        // landed: it assumes every flag takes a value, and boolean flags are ordinary,
        // so `node --trace-warnings <seat>` ran free.
        //
        // Attempt three — "collect every script-shaped token and let the seat filter
        // decide" — was too broad in the CRY-WOLF direction, and two existing tests
        // caught it within a minute: a seat name as a `--seed` VALUE, and one inside a
        // quoted `--text` argument, both started being priced as live Fable calls. I
        // had dismissed that over-match in a comment as "nobody writes that". The
        // tests knew otherwise, which is the argument for keeping cry-wolf cases
        // pinned as tests rather than as reasoning.
        //
        // Node executes exactly two things: the first POSITIONAL argument, and any
        // file passed to a LOADER flag. That is a short, semantic, closed set — the
        // flags whose job is to execute a file — not the open-ended "flags that take a
        // value" this rejected twice as the hand-curated-list failure. Everything else
        // a runner receives is data, however much it looks like a path.
        const prev = argv[i - 1];
        const isLoaderValue = Boolean(prev && LOADER_FLAGS.has(prev.value));
        if (!isLoaderValue && positionalFound) continue; // an argument, not a load
        if (!isLoaderValue) positionalFound = true;

        // Each executed file's args are what FOLLOW it, which is what lets the gate
        // read `--document` / `--seats` / `--model` off the seat that carries them.
        out.push({
          path: t.value,
          nonExecuting,
          args: argv.slice(i + 1).map((a) => a.value),
        });
      }
      continue;
    }

    // Direct execution of a shebang script: `./scripts/consult-fable.mjs`.
    //
    // The `!argv[0].quoted` guard is GONE (GLM 5.3-flash round-5 B1, sibling half).
    // `"./scripts/consult-fable.mjs" --document x` is legal shell and EXECUTES, so
    // treating a quoted argv[0] as data skipped a real invocation. Quoting is how you
    // write a path with spaces, not a way to mean something other than a command —
    // and in the argv[0] position there is nothing else it could mean. The `quoted`
    // flag still matters where a token could plausibly be data; this is not that.
    if (/\.(mjs|js|cjs)$/.test(argv[0].value)) {
      out.push({ path: argv[0].value, nonExecuting: false, args: argv.slice(1).map((a) => a.value) });
    }
  }
  return out;
}

/**
 * Read a flag from an ALREADY-PARSED argv, in either spelling.
 *
 * This replaces a string scan over the whole command line. That scan had to be taught
 * — twice — that a `--seats` inside a quoted remit is data, and the second fix had to
 * preserve offsets so a quoted `--document "path with spaces"` still resolved. Both
 * problems are artefacts of scanning text; argv has neither.
 */
export function flagFrom(args, name) {
  const flag = `--${name}`;
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === flag) return args[i + 1];
    if (a.startsWith(`${flag}=`)) return a.slice(flag.length + 1);
  }
  return undefined;
}

/** True when an already-parsed argv carries a bare flag. */
export function hasFlag(args, name) {
  const flag = `--${name}`;
  return args.some((a) => a === flag || a.startsWith(`${flag}=`));
}
