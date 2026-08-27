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

// `nodejs` is a REAL node binary (Debian/Ubuntu ship it under that name), so
// `nodejs <seat>` executes and bills. A test asserted ALLOW for it and called that a
// false-positive guard — enshrining a genuine hole as a requirement. Found when the
// fail-closed rule started blocking it and I checked whether the test or the code was
// wrong. A cry-wolf test is still a claim about the world, and this one was false.
const RUNNERS = new Set(['node', 'nodejs', 'npx', 'bun', 'bunx', 'tsx', 'ts-node']);

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

/**
 * Runner flags that execute code with NO script token at all.
 * `node -e "import('./scripts/consult-fable.mjs')"` bills in full and contains no
 * path the argv model can see (flash round-5 F5). Not `$VAR` indirection — the
 * runner's own exec mode.
 */
const EVAL_FLAGS = new Set(['-e', '--eval', '-p', '--print', '--input-type']);

/**
 * Heads that CANNOT execute a JavaScript file, however script-shaped their arguments.
 *
 * THE DIRECTION OF THIS LIST IS THE WHOLE POINT, and it is the ONE THING both review
 * seats independently asked for. Every "I cannot model this line" path used to mean
 * ALLOW: an unknown wrapper (`xargs`, `sudo`, `cmd /c`), a runner in eval mode, a
 * recursion-depth overflow. A parser whose ignorance spends money is fail-OPEN, which
 * is the one property a spend guard may not have.
 *
 * So the default inverts. Anything with an execution shape the parser cannot attribute
 * becomes an UNPRICED pseudo-seat, which the gate's existing classification BLOCK
 * absorbs — no token minted, because nobody yet knows what it costs.
 *
 * This IS a hand-curated list, and this workstream has deleted two of those. The
 * difference is which way it fails: a missing entry here costs ONE false block and a
 * one-line addition, while a missing entry in a known-DANGEROUS list costs money and
 * nobody finds out. `TRANSPARENT` is the dangerous-list shape and it is why `cmd /c`
 * silently regressed after the round-4 rewrite.
 */
/**
 * Shell KEYWORDS are structure, not commands.
 *
 * The fail-closed rule below blocked an ordinary test-runner loop within minutes of
 * being written — `for f in a.test.mjs b.test.mjs; do node --test "$f"; done` has head
 * `for` and script-shaped tokens, so it read as an unattributable execution. That is
 * precisely the cry-wolf cost the doctrine accepts (one false block, one small fix)
 * and it is worth recording that the bill arrived immediately rather than in theory.
 *
 * A loop or conditional HEADER runs nothing; the body is a separate command once the
 * line is split on `;`. `do`/`then`/`else` are stripped so the body is examined.
 */
const KEYWORD_HEADERS = new Set(['for', 'while', 'until', 'if', 'elif', 'case', 'select', 'function']);
const KEYWORD_PREFIXES = new Set(['do', 'then', 'else']);
const KEYWORD_ENDS = new Set(['done', 'fi', 'esac', 'in']);

const INERT_HEADS = new Set([
  'cat', 'echo', 'printf', 'grep', 'rg', 'egrep', 'fgrep', 'head', 'tail', 'less', 'more',
  'sed', 'awk', 'wc', 'sort', 'uniq', 'cut', 'tr', 'diff', 'jq', 'yq', 'file', 'stat',
  'ls', 'find', 'tree', 'du', 'df', 'pwd', 'which', 'basename', 'dirname', 'realpath',
  'cp', 'mv', 'rm', 'mkdir', 'rmdir', 'touch', 'chmod', 'chown', 'ln', 'tee',
  'git', 'gh', 'code', 'vim', 'nvim', 'nano', 'emacs', 'open', 'start',
  'md5sum', 'sha256sum', 'base64', 'xxd', 'strings', 'wget', 'curl',
  'true', 'false', 'test', 'export', 'unset', 'cd', 'source', 'alias', 'type',
]);

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
      // Inside DOUBLE quotes a backslash escapes the next character; inside SINGLE
      // quotes it is literal, per POSIX. Unmodelled, this broke every nested shell:
      // `sh -c "sh -c \"node <seat>\""` had the `\` appended and then the `"` CLOSED
      // the span, fusing tokens so the inner command vanished. Measured — nesting
      // failed at depth TWO, while the reviewers only predicted a failure at five.
      // A guess about where a limit bites is not a substitute for walking it.
      if (ch === '\\' && quote === '"' && i + 1 < text.length) {
        token += text[i + 1]; started = true; i += 1; continue;
      }
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
    // `do node …`, `then node …` — the keyword is structure; the command follows it.
    if (!t.quoted && KEYWORD_PREFIXES.has(t.value)) { i += 1; continue; }
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
/** An execution the parser can see the SHAPE of but not the target. Fails closed. */
const opaque = (why) => ({ path: `<unmodelled:${why}>`, unknown: true, nonExecuting: false, args: [] });

export function invokedScripts(input, depth = 0) {
  // Depth overflow used to return [] — ALLOW. Five nested `sh -c` bought a free call
  // (GLM 5.3 round-5 F6, reproduced). "I stopped looking" is not "there is nothing
  // there", and only one of those two is safe to act on.
  if (depth > 4) return [opaque('recursion-depth')];
  const out = [];

  for (const raw of parseCommands(input)) {
    const argv = stripPrefixes(raw);
    if (!argv.length) continue;
    const head = basename(argv[0].value);

    // A loop or conditional HEADER runs nothing — `for f in a.mjs b.mjs` names files,
    // it does not execute them. The body is a separate command after the `;`.
    if (KEYWORD_HEADERS.has(head) || KEYWORD_ENDS.has(head)) continue;

    // `sh -c "<command line>"` — the argument IS a command line, so recurse into it.
    if (SHELLS.has(head)) {
      const cIdx = argv.findIndex((t, k) => k > 0 && /^-[a-z]*c[a-z]*$/.test(t.value));
      if (cIdx > 0 && argv[cIdx + 1]) {
        const body = argv[cIdx + 1].value;
        const inner = invokedScripts(body, depth + 1);
        // A NON-EMPTY BODY THAT YIELDS NOTHING is the parser admitting it could not
        // read a command line it can see is there. That must not be silence — it is
        // the same fail-open the depth cap had, arriving one level down.
        out.push(...(inner.length || !body.trim() ? inner : [opaque('unreadable-shell-body')]));
      }
      continue;
    }

    if (RUNNERS.has(head)) {
      // EVAL MODE has no script token to find (flash round-5 F5, reproduced at exit 0):
      //   node -e "import('./scripts/consult-fable.mjs')"
      // bills in full and the argv model sees no path at all. Not `$VAR` indirection —
      // the runner's own exec mode, and an ordinary thing to type.
      //
      // SCOPED to eval bodies that actually name a script. `node -e "console.log(1)"`
      // is an everyday diagnostic and blocking it is pure cry-wolf; an eval body with
      // a `.mjs`/`.js` path in it is the shape that can reach a seat. This narrowing
      // came from firing my own guard on my own one-liner thirty seconds after adding
      // the rule — the accepted cost of failing closed is ONE false block and a small
      // fix, not a standing tax on ordinary work.
      const evalIdx = argv.findIndex((t, k) => k > 0 && EVAL_FLAGS.has(t.value.split('=')[0]));
      if (evalIdx > 0) {
        const body = argv.slice(evalIdx).map((t) => t.value).join(' ');
        if (/[\w./\\-]+\.(mjs|js|cjs)\b/.test(body)) { out.push(opaque('runner-eval')); continue; }
        continue; // an eval that names no script cannot reach a seat through this path
      }
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
      continue;
    }

    // AN UNKNOWN HEAD WITH AN EXECUTION SHAPE (flash round-5 F6, all reproduced at
    // exit 0): `xargs node <seat>`, `sudo node <seat>`, `cmd /c node <seat>`,
    // `env -S …`. The head is in no list, so nothing was recorded and the line ran
    // free. The round-4 header's own shape sweep included `cmd /c`; the parser
    // silently dropped it and no test noticed, because the sweep lived in prose.
    //
    // The parser had quietly re-grown a wrapper allowlist — shorter than the regex it
    // replaced, same disease. This is the inversion: an unrecognised head that carries
    // a runner or a script-shaped token is an execution I cannot attribute, so it
    // blocks as unpriced instead of passing as unseen.
    if (!INERT_HEADS.has(head)
        && argv.some((t, k) => k > 0
          && (/\.(mjs|js|cjs)$/.test(t.value) || RUNNERS.has(basename(t.value))))) {
      out.push(opaque(`unknown-head:${head}`));
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

/**
 * Leading `NAME=value` assignments, from the PARSE rather than a text scan.
 *
 * GLM 5.3 round-5 F8: `SWAN_*MODEL`, `SWAN_*MAX_TOKENS` and `SWAN_SPEND_APPROVE` were
 * still being pulled out of the raw command with regexes, so
 * `--document "SWAN_SOL_MODEL=claude-fable-5"` re-priced the call FROM DATA. Raise-only
 * today, and therefore harmless today — but it is exactly the position-blind class the
 * parser was written to end, left running on three lines. A control that is safe only
 * because of which direction its bug happens to point is on borrowed time.
 *
 * An assignment counts only where the shell would treat it as one: leading its command,
 * unquoted. `env FOO=bar node …` works because `env` is a transparent wrapper.
 */
export function envAssignments(input) {
  const out = {};
  for (const argv of parseCommands(input)) {
    for (const t of argv) {
      if (t.quoted) break;
      const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/s.exec(t.value);
      if (!m) {
        if (TRANSPARENT.has(basename(t.value))) continue; // `env FOO=bar …`
        break;                                            // the command has started
      }
      if (!(m[1] in out)) out[m[1]] = m[2];               // first wins, like the shell
    }
  }
  return out;
}

/** True when an already-parsed argv carries a bare flag. */
export function hasFlag(args, name) {
  const flag = `--${name}`;
  return args.some((a) => a === flag || a.startsWith(`${flag}=`));
}
