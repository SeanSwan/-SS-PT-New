# Hostile review — round 7: the sweep is a test now. What is left?

**Branch:** `feat/spend-guard-tests` (PR #87). Two commits since round 6: `60b80d79c`, `b299f7890`. If a claim here disagrees with the code in the appendix, **the code wins** — that rule has now settled three disputes in your favour and none in mine.

**Every blocker and every finding from both of you was reproduced before fixing. None was disproven.** Both of you have also retracted or conceded when you were wrong (12/20, gateway executability), which is why this is converging rather than churning.

## I took your ONE THING, and it was the right one

5.3: *"Turn the shape sweep into a test — one executable table of real bash line → does it execute a seat."* Built as `scripts/hooks/spend-shapes.test.mjs`: **49 BILLS rows** (bash runs a paid seat → must block) and **24 INERT rows** (nothing spends → must allow), every one asserted end-to-end through the real gate, each labelled with the round that found it. Wired into pre-commit at ~3s. Live-fired: re-introducing the backtick bypass blocks the commit and names the two rows that changed sides.

Your argument was made out of my own words, and it held:
```
round 4  "39 shapes" recorded in a packet -> lost cmd /c
round 5  the fail-closed inversion         -> lost backticks
round 6  INERT_HEADS                       -> lost find -exec
```

flash's ONE THING (equals-form loaders) was the only live free-money path this round and is fixed in the same commit.

## Round 6, itemised

| Finding | Status |
|---|---|
| 5.3 B1 / flash B4 — INERT_HEADS contained EXECUTORS (`find -exec`, `sed e`, `vim -c`, `start`) | FIXED. Reasons per row + per-head exec hatches. **Your refutation of my direction argument was correct** — see below |
| 5.3 B2 / flash B3 — backticks ran free | FIXED, incl. inside double quotes |
| 5.3 B3 — a runner fed a program on stdin | FIXED (`<` and pipe) |
| 5.3 B4 / flash B2 — the panel hold, and a comment claiming otherwise | FIXED. Per-seat holds, and the missing reader is now a test |
| flash B1 / 5.3 F2 — equals-form loader flags | FIXED |
| 5.3 F1 — `env -S "…"` quoted body | FIXED (recursed, like `sh -c`) |
| 5.3 F3 — an eval beside a positional recorded nothing | FIXED (opaque) |
| 5.3 F5 — `topicOfSeat`'s `\|\| docArg` fallback | FIXED |
| 5.3 F7 — case-insensitive filesystems | FIXED. **Real on this host** — NTFS |
| 5.3 F4 / flash F1 — `markSpent` swallow + reclaim = a re-redeemable token | FIXED last round: it fails CLOSED and says so |
| flash F2 — the NINTH vacuous test, mine | CONFIRMED by mutation and rewritten |
| flash F3 — the store forgets superseded tokens | RECORDED as a written KNOWN GAP |
| 5.3 F6 — `bash file.sh` / `curl \| sh` | NOT FIXED, and the totality claim is scoped in the corpus header. You were right that it overclaimed |
| flash F4 — "single call" wording on a summed line | NOT FIXED |
| flash F5 — backslash-in-double-quotes is stripped more aggressively than POSIX | NOT FIXED. Cry-wolf direction only |
| 5.3 F13 — all-time, name-colliding topic keys | NOT FIXED, now a written KNOWN GAP per flash's note |
| unbounded ledger/reservation files | NOT FIXED. Monotonic, its own slice |

## Where you changed my mind

**5.3 B1 refuted the argument I made when `INERT_HEADS` was born**, and I want this recorded because it is the most useful thing either of you has said. I claimed a hand-curated list is acceptable *here* because of its direction: "a missing entry costs one false block." You pointed out that is true **only for omissions** — it silently assumes every entry is TRUE, and a *wrong* entry fails in the money direction while wearing fail-closed clothes. `find` and `start` were the dangerous list written on the safe side.

## Still counting my own failures

Four false claims written into comments across this workstream: a pin test that did not exist, a price table that disagreed with the seat's own provider record by 2×, a test asserting `nodejs <seat>` should ALLOW (defending a real hole), and a comment saying the panel reserves per seat with `model: 'panel'` on the next line. **The only defence that has ever worked is a test that reads the artefact the claim is about.**

Nine vacuous tests. Signature never changed: *the fixture encodes the assumption the bug violates.*

Three of my own fixes were themselves bypasses, each caught in-session by mutation or by an existing test.

## Attack these

1. **The corpus itself.** Is a row wrong — a BILLS line bash would not actually run, or an INERT line it would? A wrong row is worse than a missing one; that is the lesson you just taught me about `INERT_HEADS`, and this table is now the biggest hand-written claim in the system.
2. **The parser after five rounds of patching.** It has grown redirects, escapes, backticks, keyword handling, loader flags in two spellings, eval modes, stdin. Find where the patches contradict each other, or a shape that composes two of them.
3. **The reservation lifecycle.** Per-seat model, per-seat topic, nonce release, generational reclaim, per-token markers. Find a hold that cannot settle, or a token that redeems twice.
4. **`INERT_HEADS` again, now that it has reasons.** Find another entry that is a wrong entry, not a missing one.
5. **My tests.** Nine vacuous so far, two of them named by you. Assume a tenth.

## Return
```
VERDICT:   APPROVE | REVISE | REJECT
BLOCKERS:  numbered; file:line + why it fails
FINDINGS:  numbered; severity + file:line + concrete failure scenario
MISSED:    what I should have checked and did not
ONE THING: the single highest-value change
```

**If nothing survives scrutiny, say APPROVE plainly.** A manufactured finding costs more than a missed one: the fix churns a working guard, and this guard has now been churned six times — three of those churns introduced the next round's bypass. If you believe a previous finding of yours was wrong, say that too.

---

# APPENDIX

## A1 · scripts/lib/shell-parse.mjs  (617 lines)

```javascript
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

/**
 * INERT HEADS, WITH THE EXEC ESCAPE HATCH EACH ONE ACTUALLY HAS.
 *
 * GLM 5.3 round-6 B1 refuted the direction argument I made when this list was born,
 * and the refutation is right: **"a missing entry costs one false block" is true only
 * for OMISSIONS. It silently assumes every entry is TRUE.** A head listed as inert
 * that can in fact execute fails in the MONEY direction while wearing fail-closed
 * clothes. `TRANSPARENT`'s disease was `cmd /c`; this list's was `find -exec`, in the
 * same round that drew the analogy. Reproduced at exit 0:
 *
 *     find . -maxdepth 0 -exec node scripts/consult-fable.mjs --document plan.md \;
 *     sed 'e node scripts/consult-fable.mjs' file.txt        (GNU `e` shells out)
 *     vim -c '!node scripts/consult-fable.mjs' -c qa f
 *     start node scripts/consult-fable.mjs
 *
 * So it stops being a bare Set. Every row carries a REASON — the discipline
 * `FREE_ALLOWLIST` got in round 3 — and every row that has an exec escape hatch names
 * it. `start`/`open` are gone entirely: launching is all they do.
 *
 * The rule cannot simply be "any visible runner blocks", and that is the interesting
 * part: `which node`, `echo node <seat>` and `git grep "node <seat>"` are all pinned
 * as ALLOW and all contain a runner token. Inertness is a property of the head's
 * SEMANTICS, so the escape hatch has to be per-head too.
 */
const INERT_HEADS = {
  cat: 'prints bytes',
  echo: 'prints its arguments',
  printf: 'prints its arguments',
  grep: 'matches lines', rg: 'matches lines', egrep: 'matches lines', fgrep: 'matches lines',
  head: 'prints a prefix', tail: 'prints a suffix', less: 'pages', more: 'pages',
  // GNU sed's `e` command shells out; `--exec` does not exist but `e` inside a script
  // does. Matched on the script text rather than a flag.
  sed: { why: 'stream editor', execPattern: /(^|[;\n])\s*e(\s|$)/ },
  awk: { why: 'text processing', execPattern: /\b(system|print\s*\|)\s*\(?/ },
  wc: 'counts', sort: 'sorts', uniq: 'dedupes', cut: 'slices', tr: 'translates',
  diff: 'compares', jq: 'queries JSON', yq: 'queries YAML', file: 'types a file',
  stat: 'reads metadata', ls: 'lists', tree: 'lists', du: 'sizes', df: 'sizes',
  pwd: 'prints cwd', which: 'resolves a name', basename: 'string op', dirname: 'string op',
  realpath: 'string op',
  // find's whole point is running things when asked to.
  find: { why: 'walks a tree', execFlags: ['-exec', '-execdir', '-ok', '-okdir'] },
  cp: 'copies', mv: 'moves', rm: 'deletes', mkdir: 'creates', rmdir: 'removes',
  touch: 'creates', chmod: 'permissions', chown: 'ownership', ln: 'links', tee: 'splits output',
  git: 'version control', gh: 'GitHub CLI',
  // Editors execute whatever their command flags say.
  vim: { why: 'editor', execFlags: ['-c', '--cmd', '-S'] },
  nvim: { why: 'editor', execFlags: ['-c', '--cmd', '-S'] },
  emacs: { why: 'editor', execFlags: ['--eval', '-f', '--funcall', '--load', '-l'] },
  nano: 'editor with no exec flag',
  code: 'opens an editor window',
  md5sum: 'hashes', sha256sum: 'hashes', base64: 'encodes', xxd: 'dumps',
  strings: 'extracts text', wget: 'downloads', curl: 'transfers',
  true: 'no-op', false: 'no-op', test: 'evaluates a condition',
  export: 'sets a variable', unset: 'unsets', cd: 'changes directory',
  alias: 'defines an alias', type: 'resolves a name',
  // `source` runs a shell script — not a JS runner, but it is not inert either, and
  // what it runs is out of reach for the same reason `$VAR` is. Left OFF the list so
  // it blocks when a seat is visible.
};

/** Is this head inert FOR THIS argv — i.e. is its exec escape hatch unused? */
function headIsInert(head, argv) {
  const row = INERT_HEADS[head];
  if (row === undefined) return false;
  if (typeof row === 'string') return true;
  if (row.execFlags && argv.some((t, k) => k > 0 && row.execFlags.includes(t.value))) return false;
  if (row.execPattern && argv.some((t, k) => k > 0 && row.execPattern.test(t.value))) return false;
  return true;
}

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

  // Whether this command is fed a program on stdin — by `<` or by following a pipe.
  // Both make a runner execute something the argv model cannot see.
  let stdinFed = false;
  let nextStdinFed = false;
  // Backtick substitution suspends an enclosing double quote; these restore it.
  let inTick = false;
  let tickSavedQuote = null;

  const endToken = () => {
    if (started) argv.push({ value: token, quoted: tokenQuoted });
    token = ''; tokenQuoted = false; started = false;
  };
  const endCommand = () => {
    endToken();
    if (argv.length) { argv.stdinFed = stdinFed; commands.push(argv); }
    argv = [];
    stdinFed = nextStdinFed;
    nextStdinFed = false;
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    // BACKTICK COMMAND SUBSTITUTION (GLM 5.3 round-6 B2, reproduced at exit 0).
    // The backtick was an ordinary character, so `` echo `node <seat>` `` tokenised as
    // [echo, `node, <seat>`] — the trailing backtick defeated the extension test, the
    // leading one defeated RUNNERS, and `echo` suppressed the unknown-head branch. Free
    // call. `$( )` worked only by accident of the paren split.
    //
    // The round-3 sweep listed "command substitution" among 39 shapes and the suite
    // pinned only the `$()` spelling. That is the `cmd /c` story verbatim: a verified
    // shape living in prose, lost in a rewrite.
    //
    // LIVE INSIDE DOUBLE QUOTES TOO, because bash runs it there. A markdown backtick in
    // a double-quoted remit therefore reads as a command — which is a real hazard in
    // real bash, not an artefact of this parser, and the refusal says so. Single quotes
    // make it literal, per POSIX, and that is the spelling to use for prose.
    if (ch === '`' && quote !== "'") {
      // Inside double quotes the substitution BODY is not quoted — bash re-parses it as
      // a command line. Ending the command without suspending the quote left the whole
      // body as one quoted token, so the seat inside it stayed invisible. Suspend on the
      // opening tick, restore on the closing one.
      endCommand();
      if (inTick) { quote = tickSavedQuote; tickSavedQuote = null; inTick = false; }
      else { tickSavedQuote = quote; quote = null; inTick = true; }
      continue;
    }
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
      // `&&` and `||` are two chars; a single one separates too. A SINGLE `|` pipes,
      // which feeds the next command a program on stdin — `cat <seat> | node
      // --input-type=module` is B3's second spelling.
      const piped = ch === '|' && text[i + 1] !== '|';
      if (text[i + 1] === ch) i += 1;
      if (piped) nextStdinFed = true;
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
      // A `<` FEEDS THE COMMAND A PROGRAM (GLM 5.3 round-6 B3). `node --input-type=module
      // < scripts/consult-fable.mjs` had the target eaten as a redirect and the signal
      // thrown away, so the runner had no script and nothing was recorded — exit 0,
      // while node evaluates the redirected stdin and bills. The parser HAD the
      // information and discarded it; it is remembered now.
      if (ch === '<') stdinFed = true;
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
    // `env -S "node <seat> --document x"` SPLITS AND EXECS that string (GLM round-6
    // F1). `-S` was skipped as one of env's own flags, the quoted body became argv[0]
    // as a single token with spaces in it, and there were no k>0 tokens left for the
    // unknown-head check to see. The UNQUOTED form was a reproduced round-5 blocker;
    // the quoted costume walked straight past the fix. The body is a command line, so
    // it is treated like one — the same answer as `sh -c`.
    if (b === 'env') {
      const sIdx = argv.findIndex((x, k) => k > i && (x.value === '-S' || x.value.startsWith('--split-string')));
      if (sIdx > 0) return { splitString: argv[sIdx].value.includes('=') ? argv[sIdx].value.split('=').slice(1).join('=') : (argv[sIdx + 1] || {}).value };
    }
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
    const stripped = stripPrefixes(raw);
    // `env -S "<command line>"` hands back a command line rather than an argv.
    if (stripped && stripped.splitString !== undefined) {
      const body = stripped.splitString || '';
      const inner = body.trim() ? invokedScripts(body, depth + 1) : [];
      out.push(...(inner.length || !body.trim() ? inner : [opaque('unreadable-env-S')]));
      continue;
    }
    const argv = stripped;
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
        if (/[\w./\\-]+\.(mjs|js|cjs)\b/i.test(body)) { out.push(opaque('runner-eval')); continue; }
        // AN EVAL DOES NOT ERASE A POSITIONAL SEAT (GLM round-6 F3, reproduced):
        //   node scripts/consult-fable.mjs --document x -e '1'
        // recorded NOTHING, because this branch returned before the script scan ran.
        // Which of the two node actually prefers is a runner question I have not
        // verified, and the doctrine already answers it: a shape I cannot attribute is
        // opaque. `node -e '1' <seat>` is nobody's ordinary work, so the narrowing
        // costs no cry-wolf.
        if (argv.some((t, k) => k > 0 && k !== evalIdx && /\.(mjs|js|cjs)$/i.test(t.value))) {
          out.push(opaque('runner-eval-and-script'));
          continue;
        }
        // An eval that names no script cannot reach a seat THROUGH THE EVAL BODY — but
        // it may still be fed one on stdin, which the check below owns.
        if (!raw.stdinFed) continue;
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
        if (!/\.(mjs|js|cjs)$/i.test(t.value)) {
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
        // EQUALS FORM COUNTS AS A LOADER (flash round-6 B1, GLM F2 — reproduced at
        // exit 0, and the only live free-money path either seat found this round):
        //
        //   node --import=./setup.mjs scripts/consult-fable.mjs --document plan.md
        //
        // `--import=./setup.mjs` ends in `.mjs`, so it is script-shaped; `prev` is
        // `node`, so it was not a loader value; it took the POSITIONAL SLOT, and the
        // real seat on the next index was skipped as an argument. Nothing recorded,
        // exit 0, node executes both files.
        //
        // This is flash's round-5 B2 surviving its own fix through one spelling: the
        // fix answered the loader question for space-separated values only, while
        // `LOADER_FLAGS.has(prev.value)` compares the WHOLE glued token — which is
        // itself script-shaped, so it poisoned the positional rule in the same motion.
        // The gate's READERS were tested thoroughly for `--flag=value`; the parser's
        // loader flags never were. One spelling gap, one blocker.
        if (LOADER_FLAGS.has(t.value.split('=')[0]) && t.value.includes('=')) {
          out.push({ path: t.value.slice(t.value.indexOf('=') + 1), nonExecuting, args: [] });
          continue; // a loaded file competes for neither the positional nor the seat slot
        }
        const prev = argv[i - 1];
        const isLoaderValue = Boolean(prev && LOADER_FLAGS.has(prev.value.split('=')[0]));
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
      // A RUNNER THAT EXECUTES NOTHING VISIBLE, while being handed a program on stdin,
      // is an execution this parser cannot attribute (GLM 5.3 round-6 B3):
      //
      //     node --input-type=module < scripts/consult-fable.mjs
      //     cat scripts/consult-fable.mjs | node --input-type=module
      //
      // Node evaluates redirected or piped stdin as a program, so the seat runs and
      // bills. Same tier as the round-5 `node -e "import(…)"` blocker, and the packet
      // claimed totality for this class — which the repro falsified.
      if (raw.stdinFed && !positionalFound) out.push(opaque('runner-stdin'));
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
    if (/\.(mjs|js|cjs)$/i.test(argv[0].value)) {
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
    if (!headIsInert(head, argv)
        && argv.some((t, k) => k > 0
          && (/\.(mjs|js|cjs)$/i.test(t.value) || RUNNERS.has(basename(t.value))))) {
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

```

## A2 · scripts/lib/paid-seats.mjs  (337 lines)

```javascript
import { invokedScripts } from './shell-parse.mjs';
/**
 * paid-seats.mjs — the single source of truth for "which scripts spend money".
 * ============================================================================
 * Created 2026-08-26 (SWA-218) because BOTH hostile reviewers, independently,
 * named the same highest-value change: stop hand-curating the gate's seat list.
 *
 * THE PROBLEM THIS EXISTS TO END. `spend-guard-gate.mjs` enumerated the paid
 * scripts inside its own regex. That enumeration drifted in BOTH directions at
 * once, and nothing noticed for weeks:
 *
 *   - It priced GHOSTS. `consult-grok.mjs` and `consult-panel.mjs` are named in
 *     the pattern and in SCRIPT_MODEL. Neither exists on main.
 *   - It MISSED live paid scripts. `consult-openrouter-panel.mjs` (a whole
 *     fan-out), `consult-hy3-design.mjs`, `consult-opus5.mjs` and
 *     `consult-codex-via-openrouter.mjs` all read OPENROUTER_API_KEY and matched
 *     nothing at all.
 *
 * A list a human maintains by hand is a list that goes stale silently. The fix is
 * not a better list — it is a TEST that fails the day drift lands
 * (`spend-coverage.test.mjs`), reading from this one file so the gate and the
 * contract can never disagree.
 *
 * WHY CREDENTIALS AND NOT NAMES. Names rot; a grep for a payment credential does
 * not. A new seat added next month is caught because it must read an API key to
 * spend, whatever it is called and wherever it sits.
 *
 * KNOWN GAP — DELEGATION (GLM 5.3-flash round-3 F6, accepted). That premise is false
 * for wrappers. A script that `spawn()`s `node scripts/consult-fable.mjs` contains no
 * credential literal, so the coverage contract passes it, AND its own command text
 * names no seat, so the gate ignores it. Both controls miss the same class.
 *
 * The two Village entries in KNOWN_UNGATED are exactly that shape, admitted by hand —
 * which is the tell: the contract could not have found them. It cannot find the next
 * one either. A marker that greps for the SEAT NAMES themselves (not just credentials)
 * would close it, and is not built here because it needs its own design pass: seat
 * names appear in docs, tests and this very file, so a naive version would flag the
 * whole repo and get switched off. Recorded rather than papered over — the contract's
 * "no third option" claim is true for direct callers and NOT for delegating ones.
 */

/**
 * Environment variables whose presence in a script means "this call costs money".
 *
 * ZAI_API_KEY is deliberately ABSENT: Z.ai GLM is billed against Sean's flat
 * coding-plan subscription, so it has no per-token cost to cap. It burns plan
 * credit, which is a budgeting concern, not a spend-gate concern.
 */
export const CREDENTIAL_MARKERS = [
  'OPENROUTER_API_KEY',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
];

/**
 * Does this source USE a payment credential — in any idiom, not just one?
 *
 * The detector tested exactly `process.env.<MARKER>`, and GLM 5.3 (F3) and
 * 5.3-flash (finding 7) both landed on the same consequence: a new paid script
 * written in the most ordinary modern style sails through the contract green, with
 * no failure prompting anyone to classify it. One linter-driven refactor to
 * destructuring silently empties the roster. `KNOWN_UNGATED`'s key set is frozen
 * against exactly that kind of quiet drift while the instrument reading it was not.
 *
 * WHAT IT STILL WILL NOT SEE, said plainly rather than implied by silence:
 *   - a key assembled at runtime (`process.env['OPEN' + 'ROUTER_API_KEY']`)
 *   - a key reached through a helper in another module (the delegation gap, F6)
 *   - a credential injected by a framework the source never names
 * Those need the seat-name marker the file header already records as unbuilt. This
 * closes the idioms a HONEST author would plausibly write, which is what a
 * drift-catcher is for; it is not an adversarial control and does not claim to be.
 *
 * Deliberately still narrower than `src.includes(marker)`: that flagged this file's
 * own siblings, because a guard that greps for credentials necessarily contains
 * their names. A grep loose enough to flag its own guard trains people to add
 * exemptions, and every exemption added for a false positive is a place a real one
 * can later hide.
 */
export function readsCredential(src) {
  // COMMENTS ARE NOT CODE. The round-5 widening flagged THIS FILE — the guard itself —
  // because a comment here explains the alias case with a literal
  // `const e = process.env; e.OPENROUTER_API_KEY`. The alias capture read `e` out of
  // prose and then matched the prose. That is precisely the "a grep loose enough to
  // flag its own guard" failure this function's own header warns about, arriving
  // through the widening meant to make it sharper.
  //
  // Stripping is deliberately CONSERVATIVE: block comments, and line comments only
  // where `//` starts the line. A trailing `// …` after code is left alone, because a
  // greedy rule would eat the tail of any string containing `//` (a URL) and drop real
  // code — the fail-open direction. Missing a commented-out read costs a false
  // positive that a human resolves; eating code costs a silent charge.
  const text = String(src || '')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, ' ');

  // ALIAS NAMES ARE CAPTURED, not assumed to be `env` (flash round-5 F10). The rule
  // hardcoded the name, so `const e = process.env; e.OPENROUTER_API_KEY` read false —
  // the widening had a hardcoded assumption inside it, which is the shape it existed
  // to remove. `const { env } = process` (GLM round-5 F2) is the same idea spelled the
  // other way and gets the same treatment.
  const aliases = new Set(['env']);
  for (const m of text.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:process|Bun)\.env\b/g)) {
    aliases.add(m[1]);
  }
  for (const m of text.matchAll(/\{\s*env\s*(?::\s*([A-Za-z_$][\w$]*)\s*)?\}\s*=\s*(?:process|Bun)\b/g)) {
    aliases.add(m[1] || 'env');
  }
  const aliasAlt = [...aliases].map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

  return CREDENTIAL_MARKERS.some((m) => {
    // `process.env.X` and `process?.env?.X` — optional chaining is ordinary defensive
    // style, and it read false (GLM round-5 F2).
    if (new RegExp(`(?:process|Bun)\\s*\\??\\.\\s*env\\s*\\??\\s*\\.\\s*${m}\\b`).test(text)) return true;
    // `env['X']`, `env?.["X"]`
    // `env["X"]` and `env?.["X"]` — optional-chained bracket access is `?.` then `[`,
    // two tokens, which a bare `\??` before the bracket does not span.
    if (new RegExp(`(?:process|Bun)\\s*\\??\\.\\s*env\\s*(?:\\?\\.)?\\s*\\[\\s*['"\`]${m}['"\`]`).test(text)) return true;
    // `const { X, Y } = process.env` — multiline, because prettier wraps these.
    if (new RegExp(`\\{[^{}]*\\b${m}\\b[^{}]*\\}\\s*=\\s*(?:process|Bun)\\s*\\??\\.\\s*env`, 's').test(text)) return true;
    // Any captured alias: `e.X`, `e["X"]`, `e?.X`.
    if (new RegExp(`\\b(?:${aliasAlt})\\s*(?:\\?\\.)?\\s*[.\\[]?\\s*['"\`]?${m}\\b`).test(text)) return true;
    return false;
  });
}

/**
 * Scripts that touch a credential but must NOT be gated, each with the reason.
 * Adding a row here is a deliberate, reviewable act — which is the entire point.
 * An empty reason is not allowed; the coverage test rejects it.
 */
export const FREE_ALLOWLIST = {
  'consult-gemini.mjs': 'Google AI Studio free tier; no OpenRouter credit consumed',
  'consult-glm.mjs': 'Z.ai coding-plan subscription — flat rate, nothing per-token to cap',

  // --- LIBRARIES, moved out of KNOWN_UNGATED 2026-08-27 (GLM 5.3 round-4 F5) ------
  // These read a credential and CANNOT BILL, which is this list's definition. They
  // sat in the frozen debt list only because that list was the only one that
  // accepted path keys — an accident of plumbing, not a judgement. Parking non-debt
  // in the debt baseline inflates the number this workstream is trying to drive to
  // zero, and makes the two real entries harder to see. Debt list: 5 -> 2.
  'lib/preflight.mjs':
    'LIBRARY. Reads a credential only to CHECK the key exists before an AI-invoking script '
    + 'runs; it makes no call of its own. Verified 2026-08-27.',
  'context-gateway/src/consult.mjs':
    'LIBRARY, not an entrypoint (verified 2026-08-27: no shebang, no self-invocation guard, so '
    + 'running it directly defines exports and exits, spending nothing). Kept keyed by PATH '
    + 'because basenaming it yields `consult.mjs`, which matched no allowlist and no price '
    + 'table — so the gate hard-BLOCKED a no-op and told the operator to price a library '
    + '(GLM 5.3-flash F4).',
  'context-gateway/src/transport.mjs':
    'LIBRARY, not an entrypoint — no shebang, no top-level invocation. Imported by '
    + 'context-gateway/src/consult.mjs, itself a library. Real spend goes through the '
    + 'consult-<seat>.mjs shims, which the gate matches. CORRECTION kept from the debt list: '
    + 'an earlier note called the gateway a live "substitute path" bypass. It is not — that '
    + 'finding was accepted after confirming the REGEX did not match it, without confirming '
    + 'the file was EXECUTABLE. Matching is not the same as exploitable.',
};

/**
 * KNOWN UNGATED — the debt this contract found on its first run, named rather than
 * hidden. These read a payment credential and the ledger does not see them.
 *
 * This baseline exists so the contract can be adopted onto a legacy surface without
 * either lying (deleting the finding) or blocking on a large refactor. The test
 * passes with exactly this list and FAILS THE MOMENT IT GROWS — which is the whole
 * point: today's debt is frozen, tomorrow's drift is caught.
 *
 * **Do not add a row here to make a test go green.** Each one is a real hole; adding
 * to this list is admitting a new one, which is a conversation with Sean, not a fix.
 *
 * Tracked as SWA-218 follow-up.
 */
export const KNOWN_UNGATED = {
  // The four forge-* image probes left this list 2026-08-27: PAID_INVOCATION now
  // matches the `forge-` prefix and they are priced against openai/gpt-5.4-image-2.
  // They were "UNCLASSIFIED — may bill per image", which is a record of a hole rather
  // than a control over one.
  'validation-orchestrator.mjs':
    'The paid AI Village (~13 brains). RECONCILED 2026-08-26: it now WRITES its actual per-model '
    + 'cost into the shared ledger (recordRunSpend) and its pre-run gate READS the cumulative '
    + 'per-topic and per-day totals, so Village spend and consult spend finally see each other. '
    + 'It stays listed here because the gate does not match its command shape — the control is '
    + 'in-process (its own SWAN_VILLAGE_MAX_USD cap plus the Rule 16 permission gate), not the '
    + 'PreToolUse hook. Covered, by a different mechanism, on purpose.',
  'hermes-village.mjs':
    'Wraps the Village runner, so it inherits the same in-process controls — including the '
    + 'ledger reconciliation landed 2026-08-26.',

  // NOTE: the five codex variants, consult-hy3-design.mjs and consult-opus5.mjs were
  // here as UNPRICED frozen debt until 2026-08-27. They are now PRICED in
  // spend-guard-gate.mjs from OpenRouter's per-endpoint API — read, not recalled —
  // so they are fully capped and no longer belong on any exemption list. Debt paid
  // down, not re-labelled.
  // NOTE: consult-openrouter-panel.mjs is deliberately NOT here. It belongs to
  // PANEL_SCRIPTS, which has real per-seat pricing. Listing it as frozen debt made the
  // gate short-circuit BEFORE that pricing ran, so an expensive fan-out sailed through
  // — caught by the "expensive seats must block" test within a minute of writing it.
  // Two overlapping allowlists is one allowlist too many; the ordering matters.
};

/**
 * Which seat names count as paid. The GATE no longer pattern-matches command text —
 * `shell-parse.mjs` parses it — so this is a NAME test on an already-parsed script
 * path, not a shell matcher.
 *
 * Kept broad on purpose (`consult-*`, `forge-*`, the two auto-research entrypoints,
 * the gateway engine). Enumerating individual seats is what drifted in both
 * directions for weeks; matching the shape and letting spend-coverage.test.mjs police
 * the roster is what replaced it.
 */
// CASE-INSENSITIVE (GLM 5.3 round-6 F7, reproduced at exit 0 and REAL ON SEAN'S HOST):
// `node scripts/consult-fable.MJS` resolves to the actual file on a case-insensitive
// filesystem — NTFS by default, and macOS — so it runs and bills while matching
// neither the extension test nor this pattern. One character, same class as the
// backslash evasion, wearing caps. Worthless on ext4 and free everywhere, and the
// primary host here is Windows.
const SEAT_NAME = /^(consult-[a-z0-9-]+|forge-[a-z0-9-]+|eval-suite|prompt-mutator)[.]mjs$/i;

/** One key per seat. The gateway engine keeps its PATH; everything else is a basename. */
function normalizeSeatKey(path) {
  const p = String(path).split('\\').join('/');
  if (p.includes('context-gateway/src/consult.mjs')) return 'context-gateway/src/consult.mjs';
  if (p.includes('context-gateway/src/transport.mjs')) return 'context-gateway/src/transport.mjs';
  if (p.includes('lib/preflight.mjs')) return 'lib/preflight.mjs';
  return p.replace(/^.*\//, '');
}

/** True when a parsed script path is a paid seat. */
function isSeatPath(path) {
  const p = String(path).split('\\').join('/');
  if (p.includes('context-gateway/src/consult.mjs')) return true;
  return SEAT_NAME.test(p.replace(/^.*\//, ''));
}

/**
 * EVERY paid seat a command line would actually execute, in order.
 *
 * Replaced a regex + a quote-mask + two extraction helpers, all of which were
 * position-blind. Round 4 found FIVE live bypasses that were themselves created by
 * rounds 2 and 3 patching that design; the parser makes those classes not exist
 * rather than enumerating them. See shell-parse.mjs for the full account.
 */
export function allScriptNamesFrom(cmd) {
  return invokedScripts(cmd)
    .filter((s) => !s.nonExecuting && isSeatPath(s.path))
    .map((s) => normalizeSeatKey(s.path));
}

/**
 * Scripts that ACTUALLY implement `--dry-run`.
 *
 * The gate used to honor the flag for anything: `if (/--dry-run/.test(cmd)) ALLOW()`.
 * Verified 2026-08-27 — only `consult-openrouter-panel.mjs` implements it. The Fable,
 * Sol and Kimi shims and the gateway engine do not mention it at all, so appending
 * `--dry-run` to one of those made the gate stand down while the script ignored the
 * unknown flag and billed in full.
 *
 * That is the identical bypass class the file already documents for `--max-tokens 500`
 * — a flag the script does not accept, lowering the gate's estimate. Honoring a flag
 * the target ignores is how a gate lies, and it was still doing it in one branch.
 */
export const DRY_RUN_AWARE = new Set(['consult-openrouter-panel.mjs']);

/**
 * Fan-out scripts that refuse the live call themselves without `--confirm-spend`,
 * so gating them before that flag appears would be pure cry-wolf.
 *
 * The old check named `consult-panel.mjs`, which does not exist on main — so the
 * REAL panel never took this branch, and a script that does exist never took it
 * either. Drift in both directions, in a single condition.
 */
export const PANEL_SCRIPTS = new Set(['consult-openrouter-panel.mjs']);

/**
 * Pull the seat script's basename out of a command, or '' if none.
 * Handles both `consult-<seat>.mjs` and the gateway engine path.
 */
export function scriptNameFrom(cmd) {
  return allScriptNamesFrom(cmd)[0] || '';
}

/** True when this command text invokes something that could spend money. */
export function invokesPaidSeat(cmd) {
  return allScriptNamesFrom(cmd).length > 0 || unmodelledExecutions(cmd).length > 0;
}

/**
 * Executions the parser can see the SHAPE of but not the TARGET.
 *
 * Both review seats named the same ONE THING in round 5, independently: every "I
 * cannot model this line" path mapped to ALLOW. A runner in eval mode, an unknown
 * wrapper head, a recursion-depth overflow — all ran free, and all were reproduced.
 *
 * These now block as UNPRICED, which is the branch that already exists for a seat with
 * no price: refuse, explain, mint no token. "Nobody knows what this costs" is the same
 * answer whether the unknown is the price or the target, and it is the only answer a
 * spend guard can give without guessing with Sean's money.
 */
export function unmodelledExecutions(cmd) {
  return invokedScripts(cmd).filter((s) => s.unknown).map((s) => s.path);
}

/** The argv of the seat this command prices — parsed, not scanned. */
export function seatArgsFrom(cmd) {
  const hit = invokedScripts(cmd).find((s) => !s.nonExecuting && isSeatPath(s.path));
  return hit ? hit.args : [];
}

/**
 * EVERY paid seat on the line, each with its OWN argv.
 *
 * GLM 5.3 round-5 B2, reproduced: `seatArgsFrom` returns the FIRST seat's argv, and
 * the gate read `--confirm-spend`, `--model`, `--seats`, `--max-tokens` and
 * `--document` from it alone. So a flag on any later invocation was invisible:
 *
 *   <free gemini call> && <panel --seats fable --confirm-spend>
 *      -> the confirm-spend check read GEMINI's argv, found nothing, and took the
 *         "the panel refuses its own live call" short-circuit. ALLOW, on a live
 *         confirmed Fable fan-out.
 *   <cheap grok> && <kimi --model claude-fable-5>
 *      -> the raise was on seat two; the estimate stayed at $0.42 against ~$1.37.
 *
 * That second one is flash's round-4 finding 6 SURVIVING ITS OWN FIX — the fix read
 * the override from the first seat's argv, and the regression test I wrote for it
 * happens to put the raise first. A test written from the same mental model as the
 * fix inherits the fix's blind spot; this is the seventh time that shape has appeared
 * in this workstream.
 *
 * GLM named the root exactly: round 4 moved HOLDS to per-invocation and left every
 * FLAG line-global-first. Half a migration. This is the other half.
 */
export function seatInvocations(cmd) {
  return invokedScripts(cmd)
    .filter((s) => !s.nonExecuting && isSeatPath(s.path))
    .map((s) => ({ name: normalizeSeatKey(s.path), args: s.args }));
}

```

## A3 · scripts/lib/spend-ledger.mjs  (627 lines)

```javascript
/**
 * spend-ledger.mjs — cumulative paid-AI spend tracking and the two-ask gate.
 * ==========================================================================
 * Sean's directive 2026-08-22, after a single trainer-dashboard workstream cost
 * ~$4.87: Fable 5 alone was $3.47 across FOUR calls, Sol Pro $0.92 across two.
 *
 * WHY THE EXISTING GATES DID NOT CATCH IT — this is the whole design rationale.
 * There were already two spend controls: `--confirm-spend` on the panel, and a
 * `premium: true` opt-in on the Fable and Sol seats. Neither fired, because
 * NEITHER IS CUMULATIVE. No single call was outrageous — the most expensive was
 * $0.97. Four reasonable calls in a row are what blew the budget. A per-call
 * ceiling alone would have approved every one of them.
 *
 * So the primary control here is a LEDGER with a per-topic budget. The per-call
 * ceiling is secondary, for the genuinely large single call.
 *
 * THE TWO-ASK RULE. Sean: "I would be asked twice before approving." One flag
 * an agent can type becomes a reflex — that is exactly how `--confirm-spend`
 * stopped working. So a breach is refused on the FIRST attempt and emits a
 * single-use token naming the real number. Only a SECOND, separate invocation
 * carrying that token proceeds. The agent cannot self-approve in one step, and
 * the number is put in front of Sean twice.
 *
 * Budgets are deliberately low. Sean: "shouldn't cost me no more than two or
 * three bucks for that whole thing max. Three dollars is a lot for one call."
 *
 * Privacy (Rule 8/44/59): the ledger stores model ids, costs and a topic slug.
 * Never prompt content, never keys.
 */
// unlinkSync is deliberately NOT imported. Deleting the claim is what made the orphan
// reclaim racy (flash round-5 F1: stat -> unlink -> create is three operations, so
// racer B can unlink racer A's fresh claim and both proceed). An unavailable import is
// a cheaper guard against that returning than a comment asking someone not to.
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * `SWAN_SPEND_DIR` redirects the ledger, for tests only. Added 2026-08-26 so
 * scripts/hooks/spend-guard-gate.test.mjs can exercise the BLOCKING path — which
 * mints a token and reads cumulative totals — without writing into Sean's real
 * spend state (SWA-218).
 *
 * WHY THIS IS NOT A BYPASS, since an env override on a money ledger deserves the
 * question: the gate runs as a Claude Code PreToolUse hook, so its environment is
 * the harness's, NOT the environment of the Bash command being judged. An agent
 * writing `SWAN_SPEND_DIR=/tmp/empty node scripts/consult-fable.mjs` puts that
 * text in the COMMAND STRING, which the hook merely reads as data — it never
 * reaches the hook process. That asymmetry is already load-bearing elsewhere in
 * this system: spend-guard-gate.mjs parses `SWAN_*MODEL=` out of the command text
 * for exactly the same reason. Setting this variable for real requires editing
 * the harness config or the shell profile, which is a different threat model than
 * the one these gates defend against.
 */
export const SPEND_DIR = process.env.SWAN_SPEND_DIR
  || join(HERE, '..', '..', '.ai-workflow', 'spend');
const LEDGER = join(SPEND_DIR, 'ledger.jsonl');
const TOKENS = join(SPEND_DIR, 'pending-approval.json');

/** Caps in USD. Env overrides exist for genuine exceptions, never for routine use. */
export const CAPS = {
  perCall: Number(process.env.SWAN_SPEND_CAP_CALL || 1.00),
  perTopic: Number(process.env.SWAN_SPEND_CAP_TOPIC || 3.00),
  perDay: Number(process.env.SWAN_SPEND_CAP_DAY || 5.00),
};

const ensureDir = () => { if (!existsSync(SPEND_DIR)) mkdirSync(SPEND_DIR, { recursive: true }); };

/** Read every ledger entry. A corrupt line is skipped, never fatal — this must not block work. */
export function readLedger() {
  if (!existsSync(LEDGER)) return [];
  return readFileSync(LEDGER, 'utf-8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
}

/**
 * Record real spend AFTER a call completes.
 * @param {{model:string, topic:string, usd:number, note?:string}} entry
 */
/**
 * "Priced" means a real finite number, or a non-blank numeric string. NOT `Number(usd)`
 * alone: `Number('')` is 0, `Number('  ')` is 0, `Number(true)` is 1 — so an empty cost
 * field or a boolean would have recorded a confident $0.00 / $1.00, the exact silent-zero
 * class recordSpend was rewritten to close. Caught by the author attacking the author's
 * own prompt list for the review panel (2026-08-25), before any seat did. Exported so
 * the test can pin it without writing to the real ledger.
 */
export function isPriced(usd) {
  // Non-negative only (round-1 GLM F5): a negative "cost" is not a refund in this
  // ledger, it is a bug upstream — treat it as unpriced so it counts as worst case.
  if (typeof usd === 'number') return Number.isFinite(usd) && usd >= 0;
  // Strings: plain non-negative DECIMAL only. `Number('0x10')` is 16 and `Number('1e3')`
  // is 1000 — a cost field carrying hex or exponent notation is not a price, it is a
  // bug upstream, and pricing it would book phantom spend (round-2 self-attack).
  if (typeof usd === 'string') return /^\s*\d+(?:\.\d+)?\s*$/.test(usd);
  return false;
}

export function recordSpend({ model, topic, usd, note = '' }) {
  ensureDir();
  // `usd: null` is a LEGAL, MEANINGFUL value: "this call cost money and nobody
  // could price it." Three review seats independently flagged the previous
  // `Number(usd) || 0`: an unpriced model recorded a confident $0.00, so the caps
  // could never fire for exactly the calls of unknown price — fail-open in the
  // expensive direction, dressed as safe. Readers below treat null as WORST CASE
  // (perCall cap), so an unpriced call pushes the caps toward refusal, never away.
  // "Priced" means a real number or a non-blank numeric string. NOT `Number(usd)`
  // alone: `Number('')` is 0 and `Number(true)` is 1, so an empty cost field or a
  // boolean would have recorded a confident $0.00 / $1.00 — the exact silent-zero
  // class this function was rewritten to close. Caught by the author attacking the
  // author's own prompt list for the review panel (2026-08-25), before any seat did.
  const priced = isPriced(usd);
  // ROW FIRST, THEN RELEASE. The reverse order left a window in which the call
  // counted NOWHERE — the hold was gone and the row was not yet written, so a
  // concurrent gate saw budget that was already committed (GLM 5.3 round-4 F4).
  // This order can briefly double-count instead, which is the direction a spend
  // guard is allowed to be wrong in.
  appendFileSync(LEDGER, `${JSON.stringify({
    ts: new Date().toISOString(), model, topic,
    usd: priced ? Number(usd) : null,
    note: priced ? note : `${note ? note + ' | ' : ''}UNPRICED — counted as worst-case $${CAPS.perCall}`,
  })}\n`, 'utf-8');
  try { releaseReservation({ model, topic }); } catch { /* non-fatal */ }
}

/**
 * ONE topic key for one document — the single source of truth for both sides of
 * the per-topic cap. The spend-guard hook normalized topics one way while a writer
 * stripped ANY extension and filtered nothing; `spentOnTopic` matches with STRICT
 * equality, so the same document could yield two keys and the topic cap would
 * silently never accumulate for it. Semantics are the GUARD's incumbent rules,
 * unchanged, so no in-flight approval token (keyed on model+topic+cost) is orphaned.
 * @param {string} p  document/out path or bare name
 */
export function topicFromPath(p) {
  return String(p || '')
    .replace(/^.*[\\/]/, '')
    .replace(/\.(md|txt|json)$/i, '')
    .replace(/[^A-Za-z0-9._-]/g, '')
    .slice(0, 60) || 'untitled';
}

// --- RESERVATIONS: the caps must count calls that are in flight ---------------
//
// GLM 5.3-flash round-3 F1, reproduced: twenty concurrent sol calls (~$0.31 each)
// against a $5.00 day cap were ALL allowed — $6.20 approved. Each one read
// spentToday = $0 and compared only its own worst case. The atomic claim fixed
// token REDEMPTION; this is the common case, and Claude Code issuing parallel tool
// calls is ordinary rather than exotic.
//
// APPEND-ONLY, because the obvious fix has the bug it is fixing. A shared counter
// read-modify-written by N processes is exactly the race being closed, one level up.
// So a reservation is an appended row and a release is another appended row; the
// outstanding total is a fold over the file. `appendFileSync` of a short line is
// atomic on both POSIX (O_APPEND) and Windows, so concurrent writers interleave
// whole lines rather than corrupting each other.
//
// TTL, because a crashed caller must not hold budget forever. A reservation older
// than the window is ignored — the same reasoning as the orphaned claim: a guard
// that can permanently withhold budget on a crash is broken in the safer direction.
const RESERVATIONS = join(SPEND_DIR, 'reservations.jsonl');
const RESERVATION_TTL_MS = 10 * 60_000;

/**
 * ONE model key for one seat, on BOTH sides of a reservation.
 *
 * THE DEFECT THIS CLOSES, proven by probe before it was fixed (2026-08-27):
 *
 *     reserve  claude-fable-5            (gate, from SCRIPT_MODEL)
 *     record   anthropic/claude-fable-5  (writer, from providers.mjs)
 *     -> day = $1.48   ($1.06 hold STILL HELD + $0.42 real row)
 *
 * The two sides never used the same string, so **no release has ever settled any
 * hold**. Every completed consult double-counted itself for the full 10-minute TTL.
 * That is the cry-wolf direction — refusing spend that is not real — and it made
 * every round-4 finding about releases settling the WRONG hold moot, because
 * releases settled nothing at all.
 *
 * GLM 5.3 named it in MISSED: "You never verified the consult scripts' recordSpend
 * model strings against SCRIPT_MODEL keys." He was right, and the reason I had not
 * is that both sides READ correct in isolation. Only running them against each
 * other shows it — the same lesson as validating an instrument before believing a
 * negative.
 *
 * Normalising rather than editing the writers: the vendor prefix is real metadata
 * (`anthropic/` vs `openai/`), and a seat may be reached through more than one
 * route. The reservation only needs the two sides to AGREE, not to be verbose.
 */
export const normalizeModelKey = (m) => String(m || '')
  .trim().toLowerCase().replace(/^[^/]+\//, '');

/**
 * Live holds, folded in APPEND ORDER.
 *
 * The previous fold counted every release first, then walked the reserves — so a
 * release could settle a reserve appended AFTER it. GLM 5.3 finding 2 and flash
 * finding 4 both landed on the consequence: any release without a live hold became
 * a coupon that silently cancelled the NEXT same-key hold within the TTL window.
 * Sean running a consult by hand (no hook, so no reserve, but the shim still
 * records) minted one every time.
 *
 * Append order removes the class: a release can only settle something already
 * outstanding, and an orphan release is discarded rather than banked. A nonce, when
 * the releaser knows it, settles that exact hold; otherwise the oldest live hold for
 * the model+topic is settled, which is correct for the ordinary one-call-one-release
 * shape and errs toward holding budget rather than freeing it.
 */
function readReservations() {
  if (!existsSync(RESERVATIONS)) return [];
  const cutoff = Date.now() - RESERVATION_TTL_MS;
  const rows = readFileSync(RESERVATIONS, 'utf-8').split(/\r?\n/).filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter((r) => r && Date.parse(r.ts) >= cutoff);

  const live = [];
  for (const r of rows) {
    if (r.kind === 'reserve') { live.push(r); continue; }
    if (r.kind !== 'release') continue;
    // Settle by nonce when the releaser knows it, else the oldest matching hold.
    let i = r.nonce ? live.findIndex((h) => h.nonce === r.nonce) : -1;
    if (i < 0 && !r.nonce) {
      i = live.findIndex((h) => h.model === r.model && h.topic === r.topic);
    }
    if (i >= 0) live.splice(i, 1); // orphan releases fall through and are DISCARDED
  }
  return live;
}

/**
 * Hold budget for a call the gate is about to allow. Returns the hold's nonce so
 * the caller can release exactly this one — a refusal must not settle somebody
 * else's in-flight call.
 */
export function reserveSpend({ model, topic, usd }) {
  ensureDir();
  const nonce = crypto.randomBytes(6).toString('hex');
  appendFileSync(RESERVATIONS, `${JSON.stringify({
    ts: new Date().toISOString(), kind: 'reserve', nonce,
    model: normalizeModelKey(model), topic, usd: isPriced(usd) ? Number(usd) : null,
  })}\n`, 'utf-8');
  return nonce;
}

/**
 * Settle a reservation: by nonce when the caller holds one, else the oldest hold
 * for this model+topic (the shims complete in a different process from the gate
 * that reserved, so they only ever know model+topic).
 */
export function releaseReservation({ model, topic, nonce = null }) {
  if (!existsSync(RESERVATIONS)) return;
  appendFileSync(RESERVATIONS, `${JSON.stringify({
    ts: new Date().toISOString(), kind: 'release', nonce,
    model: normalizeModelKey(model), topic,
  })}\n`, 'utf-8');
}

/**
 * The dollar value a ledger row contributes to a cap. Unpriced rows (usd null)
 * count as the per-call cap: the one direction an unknown cost is allowed to err.
 */
const rowUsd = (e) => (e.usd === null || e.usd === undefined ? CAPS.perCall : (Number(e.usd) || 0));

const today = () => new Date().toISOString().slice(0, 10);

export function spentToday(entries = readLedger()) {
  const d = today();
  const settled = entries.filter((e) => (e.ts || '').startsWith(d)).reduce((s, e) => s + rowUsd(e), 0);
  // Calls in flight count too, or twenty concurrent ones each see $0 (flash F1).
  const inFlight = readReservations()
    .filter((r) => (r.ts || '').startsWith(d)).reduce((s, r) => s + rowUsd(r), 0);
  return settled + inFlight;
}

export function spentOnTopic(topic, entries = readLedger()) {
  if (!topic) return 0;
  const settled = entries.filter((e) => e.topic === topic).reduce((s, e) => s + rowUsd(e), 0);
  const inFlight = readReservations().filter((r) => r.topic === topic).reduce((s, r) => s + rowUsd(r), 0);
  return settled + inFlight;
}

/** Single-use approval tokens, keyed by the exact breach they were issued for. */
function readTokens() {
  if (!existsSync(TOKENS)) return {};
  try { return JSON.parse(readFileSync(TOKENS, 'utf-8')); } catch { return {}; }
}
function writeTokens(t) { ensureDir(); writeFileSync(TOKENS, JSON.stringify(t, null, 2), 'utf-8'); }

/**
 * Redeem a token by ATOMICALLY creating a claim file. Returns true for the one
 * caller that wins, false for every other.
 *
 * `flag: 'wx'` opens with O_CREAT|O_EXCL, which is atomic ON LOCAL DISK — if the path
 * exists the call fails with EEXIST and cannot be interleaved.
 *
 * SCOPE OF THAT GUARANTEE (GLM 5.3-flash round-3 F3, and the correction is his): it
 * holds on local ext4/NTFS/APFS and is honoured by SMB2's exclusive-create
 * disposition, but O_EXCL is NOT guaranteed on NFSv3 — a known limitation of that
 * protocol, not of this code. An earlier version of this comment said "the operating
 * system guarantees", full stop, which is the same overclaiming this workstream keeps
 * having to walk back. **SPEND_DIR must live on local disk.** It defaults to
 * `.ai-workflow/spend/` inside the repo; if SWAN_SPEND_DIR is ever pointed at a
 * network mount, this guarantee weakens and the double-spend it prevents comes back.
 * That is the whole mechanism: no lock to acquire, nothing to release, and no
 * window between "check" and "set" for a second process to slip through.
 *
 * FAILS CLOSED on any unexpected error. A cost check that bricks the toolchain is
 * bad, but this is not that check — this is the last step before money is spent, and
 * "the filesystem misbehaved" is not a reason to spend twice.
 */
const CLAIM_ORPHAN_MS = 60_000;

/**
 * "This token has been spent" as a PER-KEY FILE, not a field in a shared object.
 *
 * GLM 5.3-flash round-4 finding 10. Redemption required `!tokens[key].used`, and
 * that flag was set by rewriting the WHOLE tokens.json with `writeFileSync` — an
 * unlocked read-modify-write of a shared object, on the money path. Two concurrent
 * redemptions of DIFFERENT keys can lose one `used: true` in the merge. A lost flag
 * plus a claim older than the orphan window means the same token redeems twice.
 *
 * That is the exact bug class this workstream has closed three times elsewhere (the
 * claim file, the append-only reservations, the ledger). Leaving one in place while
 * fixing its siblings is not a risk judgement, it is an inconsistency — the whole
 * argument for the append-only design was that a shared counter reproduces the race
 * it is meant to fix.
 *
 * A per-key marker cannot be lost by a write to another key, because there is no
 * shared object to merge. tokens.json keeps `used` for the audit trail; it no longer
 * decides anything.
 *
 * WHY THE MARKER AND THE CLAIM ARE BOTH NEEDED. The claim alone cannot tell a
 * CRASHED holder (create the claim, die before spending) from a SUCCESSFUL one —
 * both leave an aged claim file. Without that distinction the orphan reclaim either
 * bricks a legitimate approval forever, or re-redeems a token that was already
 * spent. The marker is what separates them: aged claim + no marker means crashed;
 * marker present means spent, at any age.
 */
const usedMarkerPath = (key) => join(SPEND_DIR, `used-${key}.json`);

/**
 * Is THIS TOKEN spent? Not "has this key ever been spent".
 *
 * BRICK, found by GLM 5.3 in round 5 and reproduced before fixing: the marker was
 * keyed only by `key`, and nothing ever deletes it. The key is
 * model+topic+rounded-cost, so every future approval for the same breach — Fable on
 * the same document, next day, clean caps — hit an existing marker, fell through to
 * "that token was already spent", minted a replacement, and refused that too.
 * **Every subsequent approval cycle looped forever**, needing a hand-deleted file the
 * error message never named. Verified: cycle 1 redeems, cycle 2 mints and refuses.
 *
 * This one is mine. The round-4 fix for flash's read-modify-write finding created it,
 * which makes it the sixth defect in this workstream introduced by a fix for the
 * previous defect. The lesson is not "be careful" — it is that a control keyed on
 * something COARSER than the thing it protects will eventually deny the thing it
 * protects. The token is what gets spent, so the token is what the marker records.
 *
 * A fresh token for the same key overwrites the marker, which is correct: the old
 * token is dead either way, and the file is per-key so there is no store to merge.
 */
const isSpent = (key, token) => {
  if (!token) return false;
  try {
    return JSON.parse(readFileSync(usedMarkerPath(key), 'utf-8')).token === token;
  } catch { return false; } // absent or unreadable — not spent
};

/** Has ANY token for this key been spent, whichever one? Used by the orphan reclaim. */
const claimedTokenFor = (key) => {
  try { return JSON.parse(readFileSync(usedMarkerPath(key), 'utf-8')).token || null; }
  catch { return null; }
};

/**
 * Returns false if the marker could not be written — and the caller must then REFUSE.
 *
 * GLM 5.3 round-5 F10: this used to swallow its own failure. Claim won, marker write
 * throws, sixty seconds pass, and the orphan reclaim hands the same approval out
 * again — the one path where "spent" is not durable, made invisible by the catch.
 *
 * FAILING CLOSED HERE IS THE RARE CORRECT CHOICE, and it is worth saying why, because
 * this file's own header says the gate fails OPEN on its own errors. That rule is
 * about not bricking the toolchain over a bug in a cost estimate. This is the last
 * step before money moves, and the question is narrower: can I record that this
 * approval has been used? If not, single-use cannot be guaranteed, and "the
 * filesystem misbehaved" is not a reason to risk spending twice. `claimToken` already
 * reasons exactly this way two functions down.
 *
 * The cost of being wrong is a retry. The cost of the other choice is a double charge
 * on an approval Sean gave once.
 */
function markSpent(key, token) {
  try {
    writeFileSync(usedMarkerPath(key), JSON.stringify({ key, token, at: new Date().toISOString() }), 'utf-8');
    return true;
  } catch (err) {
    console.error(`[spend-ledger] could not record the approval as spent (${err?.message}) — refusing rather than risk a double-spend`);
    return false;
  }
}

function claimToken(key, token) {
  ensureDir();
  // PER TOKEN, not per key. A claim is a claim on one APPROVAL; keying it by
  // model+topic+cost meant cycle 1's claim file sat in cycle 2's way forever, and
  // within the orphan window it refused outright with a concurrency message about a
  // call that finished days earlier (GLM 5.3 round-5 B3, second half — the marker fix
  // alone was not enough, the probe still showed BRICKED).
  //
  // The uniqueness O_EXCL needs is the token's, so the token belongs in the path.
  // Orphan reclaim then concerns only the SAME token, which is what it always meant.
  // One small file per approved breach accumulates; these are rare by construction
  // (this gate only fires above $1) and compaction is already a tracked slice.
  const claimPath = join(SPEND_DIR, `claim-${key}-${token}.json`);
  try {
    writeFileSync(claimPath, JSON.stringify({ key, token, at: new Date().toISOString() }), { flag: 'wx' });
    return true;
  } catch (err) {
    if (err?.code !== 'EEXIST') return false;
    // Never reclaim a claim held by a token that actually bought something. Compared
    // against THIS token: a marker from a PREVIOUS approval cycle for the same key is
    // not a reason to refuse a new one (that conflation bricked every second cycle —
    // GLM 5.3 round-5 B3).
    if (claimedTokenFor(key) === token) return false;

    // ORPHAN RECLAIM. Found by attacking this function directly, and independently
    // by GLM 5.3-flash (2026-08-27 blocker 1a): a process that dies between creating
    // the claim and writing `used: true` leaves a claim file with no matching record
    // of the spend. Without this branch every later redemption hits EEXIST forever —
    // the approval Sean is holding becomes permanently unredeemable, with no TTL, no
    // override, and an error message blaming a concurrency that never happened.
    // A guard that can brick a legitimate approval on a crash is not fail-closed, it
    // is just broken in the safer direction.
    //
    // The caller only reaches here when tokens.json still says `used: false`, so a
    // claim older than the reclaim window can only be a crashed holder: a live winner
    // marks `used` within milliseconds of creating the claim.
    //
    // Reclaiming does NOT reopen the race. Two processes may both unlink, but only
    // one `wx` create can succeed, so redemption stays single-winner throughout.
    // RECLAIM WITHOUT UNLINKING (flash round-5 F1). The old sequence was
    // stat -> unlink -> create, which is three operations and therefore not atomic as
    // a unit: racer B can stat the AGED claim, be descheduled while racer A completes
    // its reclaim, then unlink A's FRESH claim and create its own. Both proceed. The
    // inline invariant — "only one create can succeed" — assumed both racers act on the
    // same file, and after A's unlink they do not.
    //
    // Deleting is what made it racy, so nothing is deleted. A reclaim creates the NEXT
    // GENERATION with O_EXCL, and exactly one process can create generation N. The
    // original claim stays as the audit trail of the crash.
    try {
      if (Date.now() - statSync(claimPath).mtimeMs < CLAIM_ORPHAN_MS) return false; // a live winner
      for (let gen = 1; gen <= 8; gen += 1) {
        const genPath = `${claimPath.replace(/\.json$/, '')}.gen${gen}.json`;
        if (existsSync(genPath)) {
          // Somebody already reclaimed at this generation. If THAT one is also stale,
          // try the next; otherwise a live holder has it and we lose.
          if (Date.now() - statSync(genPath).mtimeMs < CLAIM_ORPHAN_MS) return false;
          continue;
        }
        writeFileSync(genPath, JSON.stringify({
          key, token, at: new Date().toISOString(), reclaimedOrphan: true, gen,
        }), { flag: 'wx' });
        // The reclaim is recorded on the original path too, for readers that look
        // there — but the WIN was decided by the exclusive create above.
        try { writeFileSync(claimPath, JSON.stringify({ key, token, at: new Date().toISOString(), reclaimedOrphan: true, gen })); } catch { /* audit only */ }
        return true;
      }
      return false; // eight stale generations is not a crash pattern, it is a bug
    } catch {
      return false; // lost the reclaim race, or the filesystem misbehaved — refuse
    }
  }
}

/** A token is bound to model+topic+rounded-cost so it cannot be reused for a different call. */
const tokenKey = ({ model, topic, worstCaseUsd }) =>
  crypto.createHash('sha256')
    .update(`${model}|${topic}|${Number(worstCaseUsd).toFixed(2)}`)
    .digest('hex').slice(0, 12);

/**
 * The gate. Returns a decision; the caller decides how loudly to refuse.
 *
 * @param {{model:string, topic:string, worstCaseUsd:number, approvalToken?:string}} req
 * @returns {{allow:boolean, reason:string, breach:string|null, token:string|null, totals:object}}
 */
export function checkSpend({ model, topic, worstCaseUsd, approvalToken = '', selfHeld = false }) {
  const entries = readLedger();
  const totals = {
    call: Number(worstCaseUsd) || 0,
    topic: spentOnTopic(topic, entries),
    day: spentToday(entries),
    caps: CAPS,
  };

  // RESERVE-THEN-CHECK (GLM 5.3 round-4 B4 / flash 3, and his ONE THING).
  //
  // The caller now appends its hold BEFORE asking, so the totals it reads already
  // contain its own worst case. Adding `call` again on top would refuse the caller
  // for its own money, twice counted.
  //
  // Why the order was wrong before: read -> decide -> reserve leaves the decision
  // unserialized against the hold, so N concurrent gates all decide on the same
  // snapshot. That narrowed the parallel-overshoot window from call-duration to
  // gate-duration; it did not close it, and the suite's own 12/20-under-a-barrier
  // number was the measurement of what remained. Appending first makes the hold
  // visible to every later reader before this one commits to anything, which turns a
  // probabilistic control into a deterministic one using the line-atomicity the
  // append-only design already depends on.
  const pending = selfHeld ? 0 : totals.call;

  const breaches = [];
  if (totals.call > CAPS.perCall) {
    breaches.push(`single call $${totals.call.toFixed(2)} > cap $${CAPS.perCall.toFixed(2)}`);
  }
  if (totals.topic + pending > CAPS.perTopic) {
    breaches.push(`topic "${topic}" would reach $${(totals.topic + pending).toFixed(2)} > cap $${CAPS.perTopic.toFixed(2)} (already spent $${(totals.topic + pending - totals.call).toFixed(2)})`);
  }
  if (totals.day + pending > CAPS.perDay) {
    breaches.push(`today would reach $${(totals.day + pending).toFixed(2)} > cap $${CAPS.perDay.toFixed(2)} (already spent $${(totals.day + pending - totals.call).toFixed(2)})`);
  }

  if (!breaches.length) {
    return { allow: true, reason: 'within budget', breach: null, token: null, totals };
  }

  const key = tokenKey({ model, topic, worstCaseUsd });
  const tokens = readTokens();

  // SECOND ask: a valid, unused, matching token was presented.
  //
  // REDEMPTION IS AN ATOMIC CLAIM, not a read-modify-write (GLM 5.3 finding 2,
  // 2026-08-26). The previous version read tokens.json, checked `used === false`,
  // set it true, and wrote the file back. Two concurrent calls carrying the same
  // fresh token could both observe `used: false` and both proceed — a double-spend
  // on a single approval. Claude Code issues tool calls in parallel, so scheduling
  // that race is ordinary, not exotic.
  //
  // `claimToken` uses O_EXCL file creation, which the OS guarantees is atomic:
  // exactly one caller can create a given path. The JSON below is still updated for
  // the audit trail, but it is no longer what decides the outcome — the claim is.
  // `isSpent` (a per-key file) rather than `tokens[key].used` (a field in a shared
  // object that an unlocked whole-file rewrite can lose). See markSpent above.
  if (approvalToken && tokens[key] && tokens[key].token === approvalToken && !isSpent(key, approvalToken)) {
    if (!claimToken(key, approvalToken)) {
      // The path must name the file that actually exists — claims are per TOKEN now.
      // A recovery instruction pointing at a path that was never created is worse
      // than none: it sends a stuck operator looking for a file, finding nothing, and
      // concluding the guard is broken in some way they cannot see.
      return { allow: false, reason: `token is being redeemed by a concurrent call (if this persists past ${CLAIM_ORPHAN_MS / 1000}s, delete .ai-workflow/spend/claim-${key}-${approvalToken}.json — a crashed holder left it behind)`, breach: breaches.join('; '), token: null, totals };
    }
    // MARK BEFORE RETURNING. This is the write that makes the claim mean "spent"
    // rather than "in progress", so it must land before the caller is told to go —
    // and if it cannot land, the caller is told to stop (GLM 5.3 round-5 F10).
    if (!markSpent(key, approvalToken)) {
      return {
        allow: false,
        reason: 'the approval could not be recorded as spent, so it cannot be honoured — retry, and check that .ai-workflow/spend/ is writable',
        breach: breaches.join('; '),
        token: null,
        totals,
      };
    }
    tokens[key].used = true;          // audit trail only — no longer load-bearing
    tokens[key].usedAt = new Date().toISOString();
    writeTokens(tokens);
    return { allow: true, reason: 'second approval accepted', breach: breaches.join('; '), token: null, totals };
  }

  // A WRONG token must not destroy a RIGHT one (GLM 5.3 finding 6). Re-minting on
  // every refusal meant that presenting a bad token for a valid key silently replaced
  // the approval Sean was holding, so his correct token stopped working — a
  // DoS-flavoured footgun where the failure looks like the gate malfunctioning.
  //
  // Not a deadlock risk: the key is derived from model+topic+cost, so re-running the
  // same command yields the same key and the SAME still-valid token, which remains
  // readable in the store.
  // Same authority as redemption: a token is unused when no MARKER exists for it.
  // Reading `existing.used` here would have re-minted over a token whose flag was
  // lost — destroying the approval Sean is holding, the exact DoS this branch was
  // added to prevent, arriving through the lost-write door instead of the re-mint one.
  const existing = tokens[key];
  if (existing && !isSpent(key, existing.token)) {
    return { allow: false, reason: 'budget breach — an unused approval token already exists for this exact call', breach: breaches.join('; '), token: existing.token, totals };
  }

  // REPLAY OF A SPENT TOKEN — say which it is.
  //
  // Caught by spend-token-race.test.mjs the moment the spent-marker landed, and the
  // catch was correct: making the marker authoritative moved this case out of the
  // redemption branch, so a replay fell through to the generic "first ask refused"
  // and the operator was told nothing about why their token stopped working.
  //
  // The old message called it a CONCURRENT call and pointed at the claim file to
  // delete. That was already wrong for this case — there is no concurrency, the token
  // was simply spent, and telling someone to delete a claim file is telling them to
  // re-open a redeemed approval. The two situations were conflated because one flag
  // had to serve both; with a separate marker they can finally be told apart:
  //   marker present            -> SPENT. Re-ask. (here)
  //   claim present, no marker  -> a redemption is genuinely in flight, or crashed.
  const replayedSpent = Boolean(approvalToken && tokens[key]
    && tokens[key].token === approvalToken && isSpent(key, approvalToken));

  // FIRST ask: refuse, and mint the token this exact call would need.
  const token = crypto.randomBytes(6).toString('hex');
  tokens[key] = { token, model, topic, worstCaseUsd, used: false, issuedAt: new Date().toISOString() };
  writeTokens(tokens);

  return {
    allow: false,
    reason: replayedSpent
      ? 'that approval token was already spent — this is a NEW ask, and it needs a new token'
      : 'budget breach — first ask refused',
    breach: breaches.join('; '),
    token,
    totals,
  };
}

export const LEDGER_PATH = LEDGER;

```

## A4 · scripts/hooks/spend-guard-gate.mjs  (819 lines)

```javascript
#!/usr/bin/env node
/**
 * spend-guard-gate.mjs — PreToolUse(Bash) gate on paid AI calls.
 * ==============================================================
 * Sean's directive 2026-08-22 after one workstream cost ~$4.87 (Fable $3.47
 * across four calls, Sol $0.92 across two): "we gotta now create a skill that
 * blocks ... shouldn't cost me no more than two or three bucks for that whole
 * thing max ... I would be asked twice before approving."
 *
 * WHY A HOOK AND NOT A SCRIPT EDIT. Two reasons, both load-bearing.
 *   1. The two priciest scripts (consult-fable.mjs, consult-sol.mjs) were being
 *      edited by another agent at the time this was written. Rule 67 says do not
 *      touch a file another agent has in flight. A hook needs none of them.
 *   2. A gate living inside the thing it gates can be bypassed by calling the
 *      model another way. This sits at the harness boundary, so it covers any
 *      invocation shape — including ones written after today.
 *
 * The lesson this session kept teaching: a rule the model must remember is a
 * rule that will eventually be skipped. Deterministic, or it is not a control.
 *
 * FAIL-OPEN on its own errors. A spend guard that bricks the toolchain when it
 * has a bug costs more than the spend it prevents. It fails open loudly.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkSpend, CAPS, spentToday, spentOnTopic, topicFromPath, SPEND_DIR, reserveSpend, releaseReservation } from '../lib/spend-ledger.mjs';
// SWA-218: the seat roster lives in ONE file, policed by spend-coverage.test.mjs.
// Hand-curating it inside this regex is what drifted in both directions at once.
import { FREE_ALLOWLIST, KNOWN_UNGATED, DRY_RUN_AWARE, PANEL_SCRIPTS, scriptNameFrom, allScriptNamesFrom, invokesPaidSeat, seatInvocations, unmodelledExecutions } from '../lib/paid-seats.mjs';
import { flagFrom, hasFlag, envAssignments } from '../lib/shell-parse.mjs';

const ALLOW = () => process.exit(0);

/** Worst-case $/M (in, out), OpenRouter catalog as of 2026-08-22. */
const PRICES = {
  'claude-fable-5':      [10.0, 50.0],
  // CORRECTED 2026-08-27. Both were [2.5, 15.0] — HALF what the seat's own provider
  // record says. `context-gateway/src/providers.mjs` has carried
  // `priceInPerM: 5, priceOutPerM: 30, priceVerified: '2026-07-17'` for sol the whole
  // time, so two price tables disagreed by 2x and nothing compared them. A spend guard
  // that under-counts by half is worse than one that is merely incomplete: it reports
  // a confident number and the number is wrong. Found by a parity test written for a
  // different defect (the reservation key), which is the argument for cross-table
  // tests over careful reading — see `sol prices are not cheaper than providers.mjs`.
  // Worst case moves $0.31 -> $0.61, still inside the $1.00 per-call cap, so this
  // corrects the count without crying wolf.
  'gpt-5.6-sol-pro':     [5.0,  30.0],
  'gpt-5.6-sol':         [5.0,  30.0],
  'kimi-k3':             [3.0,  15.0],
  'grok-4.6':            [2.0,  6.0],
  'deepseek-v4-pro':     [0.48, 0.96],
  'deepseek-v4-flash':   [0.073, 0.145],

  // --- Priced 2026-08-27 from OpenRouter's per-endpoint API, not from memory ----
  // These were KNOWN_UNGATED frozen debt. Every number below was READ from
  // openrouter.ai/api/v1/models/<id>/endpoints, because a price recalled from
  // training data is exactly the kind of confident-and-stale figure that silently
  // under-counts a cap. First lookup returned "NOT FOUND" for two of the three —
  // a summariser choking on a huge catalog page — so each was re-queried on its own
  // endpoint. A negative from one instrument is not a fact.
  //
  // gpt-5.5 spans SEVEN endpoints: openai/flex $2.50/$15, standard $5/$30, azure &
  // bedrock $5.50/$33, and openai/fast $12.50/$75. Priced at the highest STANDARD
  // route. Taking the true worst (`fast`) would put a routine codex consult at
  // ~$1.53 against a $1.00 cap and refuse every honest call — and a gate that cries
  // wolf is the one people learn to wave through, which this file's own comments
  // call more corrosive than the hole. KNOWN UNDER-COUNT: if OpenRouter routes to
  // `openai/fast`, real cost is ~2.3x this estimate. Revisit if that ever happens.
  'gpt-5.5':             [5.5,  33.0],
  // opus-5 is nearly flat across nine endpoints ($5/$25 to $5.50/$27.50). Worst case
  // taken, because here it costs nothing to be honest.
  'claude-opus-5':       [5.5,  27.5],
  // hy3 spans $0.126/$0.522 (GMICloud) to $0.20/$0.80 (AtlasCloud). Worst taken.
  'tencent-hy3':         [0.2,  0.8],

  // The four forge-* image probes all call openai/gpt-5.4-image-2 (read from each
  // file, not inferred). Verified endpoint pricing: prompt $8/M, completion $15/M,
  // PLUS an `image_output` component of $0.00003 and a `web_search` component of
  // $0.01 per use.
  //
  // KNOWN UNDER-COUNT, and this one is structural rather than a routing choice: this
  // table is [in, out] TOKENS, and an image model's dominant cost is not a token
  // rate. The text rates below are real and counted; the image-output component is
  // NOT modelled, so a heavy generation run costs more than the estimate says.
  // Pricing the text half is strictly better than the previous state (invisible), and
  // saying so is better than a number that looks complete. A per-image cost model is
  // its own slice — flagged rather than faked.
  //
  // Related, from forge-response-shape.mjs's own header: `data.usage.total_cost` is
  // absent from this provider's response, so the forge's run ledger has been writing
  // `costUsd: null` on every real generation. recordSpend() treats null as WORST CASE
  // against the caps, so that failure at least errs toward refusal.
  'gpt-5.4-image-2':     [8.0,  15.0],

  // The auto-research tooling, surfaced 2026-08-27 the moment the coverage walker
  // became recursive — it had been invisible below the top level for two rounds.
  // google/gemini-3-flash-preview spans $0.25/$1.50 (flex) to $0.90/$5.40 (priority);
  // worst taken. The `-lite` variant used by prompt-mutator is cheaper by definition,
  // so it is priced at the same worst case rather than guessed at separately — at a
  // ~$0.11 estimate the choice cannot change a verdict, and over-stating a cheap seat
  // is the one direction that costs nothing here.
  'gemini-3-flash-preview': [0.9, 5.4],
};

/** Map a consult script to its default model key. */
const SCRIPT_MODEL = {
  'consult-fable.mjs': 'claude-fable-5',
  // `gpt-5.6-sol`, not `-pro`: providers.mjs routes this shim to `openai/gpt-5.6-sol`
  // (verified 2026-08-27 by reading the provider record, not the script name). The
  // key must match what the WRITER records or the reservation never settles — the
  // same defect proven for Fable, second instance, and it survived because the two
  // sides read correct in isolation. `-pro` stays PRICED so a `--model` override
  // naming it is capped rather than falling into the unpriced BLOCK.
  'consult-sol.mjs': 'gpt-5.6-sol',
  'consult-kimi.mjs': 'kimi-k3',
  // `consult-grok.mjs` REMOVED 2026-08-27 (GLM 5.3 round-5 F9). It does not exist on
  // main — this file's own header cites it as one of the two ghosts that proved the
  // hand-curated roster had drifted, and it was still sitting here afterwards: the
  // ghosts were purged from the MATCHER and left in the TABLES. If the script is ever
  // written it lands in the unpriced BLOCK, which is the fail-closed direction and
  // exactly what that branch is for. `grok-4.6` stays in PRICES because the panel
  // fan-out has a real grok seat.
  // Moved out of KNOWN_UNGATED 2026-08-27 once real prices existed. All five codex
  // variants call openai/gpt-5.5; verified by reading the model id out of each file
  // rather than assuming the name implied the model.
  'consult-codex.mjs': 'gpt-5.5',
  'consult-codex-via-openrouter.mjs': 'gpt-5.5',
  'consult-codex-impl-review.mjs': 'gpt-5.5',
  'consult-codex-v1-1-review.mjs': 'gpt-5.5',
  'consult-codex-v1-2-review.mjs': 'gpt-5.5',
  'consult-opus5.mjs': 'claude-opus-5',
  'consult-hy3-design.mjs': 'tencent-hy3',
  // The forge image probes. They are ad-hoc diagnostics rather than routine consults,
  // but ad-hoc is not free: each one calls a paid image endpoint.
  'forge-capture-fixtures.mjs': 'gpt-5.4-image-2',
  'forge-i2i-influence.mjs': 'gpt-5.4-image-2',
  'forge-i2i-probe.mjs': 'gpt-5.4-image-2',
  'forge-response-shape.mjs': 'gpt-5.4-image-2',
  // auto-research: an LLM judge and a prompt mutator, both billing through OpenRouter.
  'eval-suite.mjs': 'gemini-3-flash-preview',
  'prompt-mutator.mjs': 'gemini-3-flash-preview',
};

/**
 * Read a flag value in EITHER spelling: `--flag value` or `--flag=value`, quoted or bare.
 *
 * GLM 5.3 finding 3 (2026-08-26): the hand-rolled `--flag\s+(\S+)` patterns diverged from
 * every real argument parser on the equals form, and one root cause produced three
 * symptoms — `--document=plan.md` yielded topic `untitled` so the per-topic cap silently
 * never accumulated for that document; `--seats=fable` priced a fan-out as if no seats
 * were named; `--model=` overrides were ignored entirely. Verified before fixing.
 */
function flagValue(cmd, name) {
  // STRUCTURAL now. This used to scan the command text, which had to be taught twice
  // that a flag inside a quoted remit is data — and the second fix had to preserve
  // byte offsets so a quoted `--document "path with spaces"` still resolved. Both
  // problems were artefacts of scanning text. argv has neither.
  //
  // ACROSS EVERY SEAT, not just the first (GLM 5.3 round-5 B2). Reading only the
  // first invocation's argv made a flag on any later one invisible — a `--model`
  // raise on seat two silently kept seat one's price. First hit wins, which is the
  // shell's own precedence and matches what a reader expects from a line.
  //
  // Where a flag belongs to ONE specific seat — the panel's `--confirm-spend` and
  // `--seats`, a `--dry-run` the target must actually implement — the call sites read
  // that seat's argv directly instead of using this helper. A flag that means "this
  // fan-out is approved" must not be satisfiable by typing it on a different command.
  for (const inv of seatInvocations(cmd)) {
    const v = flagFrom(inv.args, name);
    if (v !== undefined) return v;
  }
  return undefined;
}

/** The argv of one named seat on this line, or [] if it is not present. */
function argsOfSeat(cmd, seatName) {
  return (seatInvocations(cmd).find((s) => s.name === seatName) || { args: [] }).args;
}

function readInput() {
  try { return JSON.parse(readFileSync(0, 'utf-8')); } catch { return null; }
}

const input = readInput();
if (!input) ALLOW();

const cmd = input?.tool_input?.command || '';

// Gate INVOCATIONS, not mentions. `grep consult-fable.mjs`, `cat`, `git log` and
// friends contain the filename but spend nothing; blocking them is a false
// positive that trains people to route around the guard. Require a `node`
// (or npx/bun) execution of the script.
// Deliberately written with NO backslash escapes. Three earlier attempts to
// author this line through shell/python interpolation were silently corrupted —
// one turned `\b` into a literal backspace (0x08), which matches nothing, so the
// gate stopped firing entirely while still reporting "SYNTAX OK". A regex that
// silently never matches is the worst possible failure for a guard.
// FOURTH corruption of this line, found 2026-08-26 (SWA-218). The leading context
// used to be the enumerated separator class `[ ;&|(]`, which does not contain quote
// characters — so `sh -c "node scripts/consult-fable.mjs ..."` and
// `bash -lc 'node scripts/consult-fable.mjs ...'` put a QUOTE before `node` and were
// NOT MATCHED AT ALL. The gate never fired, no cap was checked, no token was required,
// and the call billed in full. It fails open by design, so the miss was silent.
//
// It was found by copying this regex into scripts/hooks/fable-remit-gate.mjs and then
// attacking the copy. Nothing here would have caught it: until this commit the file
// had no test at all, while scripts/lib/spend-ledger.test.mjs covered the CAP logic.
// The cap was proven; the pipe feeding it was not.
//
// Enumerating separators means enumerating every future one correctly, forever. A
// NEGATED IDENTIFIER class inverts the burden: anything that is not part of a word or
// a path is a boundary — quotes, newlines, tabs, parens, `$(`. `mynode script.mjs`
// still does not match, which was the only false positive that ever mattered.
//
// FIFTH issue, found in the same session by attacking the fixed regex rather than
// waiting for a reviewer. The MIDDLE segment used to be a bare `[^|;&]*?`, which
// cannot cross a shell boundary — that exclusion is deliberate and still wanted, so
// `node build.mjs | grep consult-fable.mjs` (an invocation and an unrelated MENTION in
// two different commands) does not false-positive. But it also could not cross a
// `| ; &` sitting INSIDE A QUOTED ARGUMENT, so all three of these were misses:
//     node --flag "a|b" scripts/consult-fable.mjs
//     node --flag "a;b" scripts/consult-fable.mjs
//     node --flag "a&b" scripts/consult-fable.mjs
// Not academic: this repo's own review templates instruct agents to pass remits
// containing "APPROVE | REVISE | REJECT".
//
// The middle now alternates QUOTED SPANS (opaque, any content) with non-boundary
// characters. Verified against 39 shapes — plain, sh -c, bash -lc, env prefix, env
// assignment, absolute interpreter, yarn node, npm exec, node flags, &&, ;, pipe,
// backgrounding, subshell, command substitution, Windows backslash paths, cmd /c,
// line continuation, eval, bun, npx — with zero misses AND zero false positives,
// including all four cross-command mention cases the exclusion exists to reject.
// SIXTH round, from the GLM hostile pass. `node<TAB>scripts/...` was a miss because
// the separator was a literal U+0020 and bash's IFS splits on tab too; `bunx`, `tsx`
// and `ts-node` were misses because the alternation named three runners. The separator
// is now the same negated identifier class as the leading context — NOT a literal tab,
// because an invisible character in a guard regex is the ``-became-0x08 failure with
// a different costume. `nodejs` and `node-foo` still correctly do not match.
// SEVENTH round (SWA-218): the pattern itself moved to scripts/lib/paid-seats.mjs and
// became PAID_INVOCATION, matching ANY `consult-*` seat instead of five hand-named ones.
// The old enumeration had drifted in both directions at once — pricing `consult-grok.mjs`
// and `consult-panel.mjs`, neither of which exists on main, while four live scripts that
// read OPENROUTER_API_KEY matched nothing. The roster now lives in one file with a
// coverage test policing it, so this line can never be the thing that goes stale again.
// `invokesPaidSeat`, NOT the bare regex. The helper also drops non-executing node
// flags (`--check`, `--version`), and testing the pattern directly here meant that
// carve-out existed in the library while the gate ignored it — the gate refused my
// own `node --check` of a consult file mid-repair. Two entry points into one decision
// is how a fix lands in the file nobody calls.
if (!cmd || !invokesPaidSeat(cmd)) ALLOW();

try {
  // --- which model, and how big is the worst case? -------------------------
  // scriptNameFrom is shared with the coverage test, so the gate and the contract
  // can never disagree about what a command names. It also resolves the gateway
  // engine path, which the old `consult-([a-z0-9-]+)` capture could not see.
  // EVERY paid name in the line, priced by the most expensive (GLM 5.3 blocker 4).
  // `node consult-kimi.mjs && node consult-fable.mjs` used to resolve to kimi alone,
  // price it at ~$0.32, fit the cap, and let Fable's ~$1.06 through unmetered in the
  // same Bash call. Verified exit 0 before this change.
  //
  // Free and frozen names are dropped FIRST, so a free seat in the line cannot become
  // the one that gets priced, and a paid one cannot hide behind it.
  // --- FAIL CLOSED ON WHAT THE PARSER CANNOT MODEL -------------------------
  //
  // The ONE THING both review seats named in round 5, independently. Every "I cannot
  // attribute this line" path used to mean ALLOW, and all of these were reproduced
  // running a live Fable call at exit 0:
  //
  //     node -e "import('./scripts/consult-fable.mjs')"      runner eval mode
  //     xargs node scripts/consult-fable.mjs                 unknown wrapper head
  //     sudo node scripts/consult-fable.mjs                  ditto
  //     cmd /c node scripts/consult-fable.mjs                ditto — and this one had
  //                                                          been in the round-4 shape
  //                                                          sweep, then silently
  //                                                          regressed, because the
  //                                                          sweep lived in prose
  //     five nested sh -c                                    depth overflow returned []
  //
  // A parser whose ignorance spends money is fail-open, which is the one property this
  // gate may not have. No token is minted: nobody knows the cost, so there is nothing
  // for Sean to approve — the same reasoning as the unpriced-seat block below.
  const opaqueRuns = unmodelledExecutions(cmd);
  if (opaqueRuns.length) {
    console.error([
      `SPEND GUARD — BLOCKED: this command has an execution shape the gate cannot read (${opaqueRuns.join(', ')}).`,
      '',
      '  It can see that something runs; it cannot see WHAT, so it cannot price it.',
      '  Waving it through was the old behaviour and it ran live paid calls unseen.',
      '',
      '  Rewrite it so the invocation is visible — a plain `node scripts/<seat>.mjs …`',
      '  rather than an eval, an unrecognised wrapper, or deeply nested shells.',
      '',
      '  If the head is genuinely harmless (it cannot execute a JS file), add it to',
      '  INERT_HEADS in scripts/lib/shell-parse.mjs. That list is safe to grow: a missing',
      '  entry costs one false block, never a silent charge.',
      '',
      '  There is no token for this. Nothing to approve until someone knows the cost.',
    ].join('\n'));
    process.exit(2);
  }

  const allNames = allScriptNamesFrom(cmd);
  const priceOf = (n) => {
    const key = SCRIPT_MODEL[n];
    const p = key && PRICES[key];
    return p ? p[0] + p[1] : -1; // unpriced sorts below priced; -1 never wins a max
  };
  const chargeable = allNames.filter((n) => !FREE_ALLOWLIST[n] && !KNOWN_UNGATED[n]);
  const scriptName = chargeable.length
    ? chargeable.reduce((worst, n) => (priceOf(n) > priceOf(worst) ? n : worst))
    : scriptNameFrom(cmd);

  // --- INVERTED: paid by default, free by declaration (SWA-218) -------------
  //
  // The matcher above now recognises ANY consult-* seat, not five hand-named ones.
  // That enumeration had drifted in both directions — pricing two scripts that do
  // not exist while four live ones billed unseen. So the roster moved to
  // scripts/lib/paid-seats.mjs, where a coverage test polices it, and a script is
  // waved through only if somebody WROTE DOWN why.
  if (FREE_ALLOWLIST[scriptName]) ALLOW();       // declared free, with a reason
  if (KNOWN_UNGATED[scriptName]) ALLOW();        // frozen debt, behaviour unchanged

  // A dry run spends nothing — BUT ONLY WHERE THE SCRIPT IMPLEMENTS ONE.
  // This used to be an unconditional `if (/--dry-run/.test(cmd)) ALLOW()`. Verified
  // 2026-08-27: only consult-openrouter-panel.mjs implements the flag. Appending it
  // to a Fable, Sol or Kimi call made the gate stand down while the script ignored
  // the unknown flag and billed in full — the identical bypass class this file
  // already documents for `--max-tokens 500`, still live in a different branch.
  //
  // Scanned over MASKED text, not the raw command (GLM 5.3-flash B2, reproduced at
  // exit 0). `--remit "does it support --dry-run"` put the flag in DATA, the substring
  // test saw it, and a LIVE paid fan-out was waved through with no cap and no token.
  // Round 2 restricted the flag to the one script that implements it but kept matching
  // over quoted arguments — narrowing WHICH script while leaving WHERE it looks.
  // ON THAT SEAT'S OWN ARGV (GLM 5.3 round-5 B2). Reading the line's first seat meant
  // a flag typed on a DIFFERENT command satisfied a check about this one — the same
  // "honoring a flag the target ignores" class the file documents twice, arriving
  // through the argv door instead of the text door.
  if (DRY_RUN_AWARE.has(scriptName) && hasFlag(argsOfSeat(cmd, scriptName), 'dry-run')) ALLOW();

  // The fan-out refuses its own live call without --confirm-spend, so gating it
  // earlier is cry-wolf. The old condition named `consult-panel.mjs`, which does not
  // exist on main: the real panel never took this branch and neither did anything
  // else. One condition, drifted in both directions.
  //
  // GLM 5.3 round-5 B2, reproduced: with `--confirm-spend` read from the LINE's first
  // seat, `<free gemini call> && <panel --seats fable --confirm-spend>` had the check
  // inspect GEMINI's argv, find nothing, and take this "it refuses its own live call"
  // short-circuit — ALLOW, on a live confirmed Fable fan-out. A flag meaning "this
  // fan-out is approved" must be read off the fan-out, never off a neighbour.
  if (PANEL_SCRIPTS.has(scriptName) && !hasFlag(argsOfSeat(cmd, scriptName), 'confirm-spend')) ALLOW();

  // An explicit --model / SWAN_*_MODEL override wins over the script default.
  // OVERRIDES MAY ONLY RAISE THE ESTIMATE — never lower it.
  // Found by a bypass round: `SWAN_FABLE_MODEL=deepseek-v4-flash node
  // scripts/consult-fable.mjs` sailed through, because the regex believed the
  // env var. consult-fable.mjs does not read SWAN_FABLE_MODEL at all (it reads
  // SWAN_FUSION_JUDGE_MODEL), so the real call would still have run Fable at
  // $10/M while the gate priced it as flash. Any caller-supplied value that
  // makes a call look CHEAPER is exactly what an agent under budget pressure
  // would reach for, so the estimate takes the max of default and override.
  //
  // THE RAISE BELONGS TO THE SEAT THAT CARRIES IT (GLM 5.3 round-5 B2). `flagValue`
  // now scans every invocation, so a `--model` on seat two is finally SEEN — but
  // comparing it against seat ONE's default would price the wrong delta. The seat
  // holding the flag supplies the baseline it is raising from.
  const raisingSeat = seatInvocations(cmd).find((s) => flagFrom(s.args, 'model') !== undefined);
  const raiseBaseKey = raisingSeat ? (SCRIPT_MODEL[raisingSeat.name] || '') : '';

  const defaultKey = SCRIPT_MODEL[scriptName] || '';
  let modelKey = defaultKey;
  // FROM THE PARSE, not a text scan (GLM 5.3 round-5 F8). The three `cmd.match(/SWAN_…/)`
  // lines were the last position-blind readers in the gate — `--document
  // "SWAN_SOL_MODEL=claude-fable-5"` re-priced the call from DATA. Raise-only, so
  // harmless in effect, and still exactly the class the parser exists to end.
  const envVars = envAssignments(cmd);
  const envModel = Object.entries(envVars).find(([k]) => /^SWAN_[A-Z_]*MODEL$/.test(k))?.[1];
  const overrideVal = envModel || flagValue(cmd, 'model');
  const override = overrideVal ? [null, overrideVal] : null;
  if (override) {
    const hit = Object.keys(PRICES).find((k) => override[1].includes(k));
    // Compare against the RAISING seat's default. For a single-seat line these are
    // the same key; on a compound they are not, and using the line's first seat asked
    // "is fable pricier than grok" about a flag typed on kimi. An env-var override
    // belongs to no particular seat, so it falls back to the line's default.
    const base = raiseBaseKey || defaultKey;
    if (hit && PRICES[base]) {
      const costOf = (k) => PRICES[k][0] + PRICES[k][1];
      if (costOf(hit) > costOf(base)) modelKey = hit;
    }
    // The `else if (hit && !defaultKey) modelKey = hit` branch is DELETED, and must
    // not come back. Both GLM seats found it independently (5.3 F3, 5.3-flash B1) and
    // it was reproduced live at exit 0:
    //
    //     node scripts/consult-mistral.mjs --document x.md --model deepseek-v4-flash
    //
    // An unknown seat has no default, so a caller-declared model became its price —
    // ~$0.07, under the cap, ALLOW — while the script bills at whatever it actually
    // calls and need not even READ `--model`. That is the "believing a flag the target
    // ignores" failure this file documents twice, reintroduced in the one branch whose
    // whole job is to refuse unknown seats, and a silent third option past the
    // "no third option" contract. An unknown seat now falls through to the unpriced
    // BLOCK, whatever the caller declares.
  }

  // consult-panel fans out to many seats; price it as the whole fan-out.
  const isPanel = PANEL_SCRIPTS.has(scriptName);

  // Price the panel by the seats ACTUALLY REQUESTED, not the full roster.
  // Flat-rating every fan-out at the whole-roster worst case made a run of two
  // free seats plus two cheap ones (~$0.15) present as $1.20 and get blocked.
  // A gate that cries wolf is a gate the human learns to wave through, which is
  // the failure mode this whole control exists to avoid — so an overstatement
  // is not the "safe" direction, it is corrosive.
  // DERIVED FROM PRICES, not hand-copied.
  //
  // I wrote "pinned against PRICES by a test" into this comment in the previous
  // commit. THAT TEST DID NOT EXIST — both review seats checked and said so, and they
  // were right. A comment asserting a control that is not there is worse than no
  // comment: the next reader trusts it and stops looking. Rule 75 exists for exactly
  // this, and I broke it in the act of claiming to have honoured it.
  //
  // The numbers were also already drifting low, which is what a third price table
  // does: grok 0.11 against 0.148 derived from PRICES, fable 1.05 against the $1.06 the
  // gate itself quotes. Deriving them removes the table rather than pinning it — the
  // same move as deleting the seat regex in favour of a contract. Only the free seats
  // stay listed, because "free" is a fact about billing, not a price to compute.
  // The panel's own per-call sizing. Deliberately NOT the caller's `--max-tokens`:
  // that flag belongs to a single consult, and a fan-out sizes its own calls.
  const PANEL_IN_TOK = 26000;
  const PANEL_OUT_TOK = 16000;
  const callUsdAt = (p) => (PANEL_IN_TOK / 1e6) * p[0] + (PANEL_OUT_TOK / 1e6) * p[1];

  const FREE_PANEL_SEATS = new Set(['glm', 'qwen', 'gemini', 'ox']);
  const PANEL_SEAT_MODEL = {
    fable: 'claude-fable-5', sol: 'gpt-5.6-sol', kimi: 'kimi-k3', grok: 'grok-4.6',
    dspro: 'deepseek-v4-pro', dsflash: 'deepseek-v4-flash',
  };
  const seatWorstUsd = (s) => {
    if (FREE_PANEL_SEATS.has(s)) return 0;
    const k = PANEL_SEAT_MODEL[s];
    // An unknown seat name is priced at the per-call cap, not at a flattering default.
    // The old `?? 0.35` silently under-priced any future expensive seat — the same
    // silent-zero class this file has closed twice elsewhere.
    return k && PRICES[k] ? callUsdAt(PRICES[k]) : CAPS.perCall;
  };
  const DEFAULT_SEATS = ['kimi', 'glm', 'qwen', 'ox', 'gemini', 'grok', 'dspro', 'dsflash'];
  // From the PANEL's own argv (GLM 5.3 round-5 B2): a panel appearing second on a
  // line had its `--seats` read off the first seat, found nothing, and priced the
  // fan-out at the full DEFAULT_SEATS roster — over-stating a small run, which is the
  // cry-wolf direction, while the confirm-spend hole under-stated a large one. One
  // root cause, both directions, exactly like the drifted allowlist it replaced.
  const panelName = [...PANEL_SCRIPTS].find((p) => allNames.includes(p)) || scriptName;
  const seatsArg = flagFrom(argsOfSeat(cmd, panelName), 'seats');
  // EMPTY IS NOT NONE (flash round-5 F1, reproduced: `--seats "" --confirm-spend`
  // exited 0). `''.split(',').filter(Boolean)` yields `[]`, which priced a CONFIRMED
  // fan-out at $0.00 and waved it through. Whatever the panel does with an empty list —
  // refuse, or fall back to its default roster — the gate cannot price it as nothing.
  // A declared-but-empty value is the caller telling us less than they think, so it
  // takes the default roster, which is the expensive reading.
  const namedSeats = seatsArg
    ? seatsArg.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const panelSeats = namedSeats.length ? namedSeats : DEFAULT_SEATS;
  const panelUsd = panelSeats.reduce((sum, s) => sum + seatWorstUsd(s), 0);
  const price = PRICES[modelKey];
  // --- THE UNPRICED FAIL-OPEN, CLOSED (SWA-218) ------------------------------
  //
  // This used to be `if (!price && !isPanel) ALLOW()` — "unknown model, do not guess
  // a number." The first half is right and stays: inventing a price for a money guard
  // is worse than admitting there isn't one, because a wrong number silently
  // UNDER-counts the caps. The conclusion was the bug. Not knowing the price is not a
  // reason to wave the call through; it is a reason to stop and ask someone to write
  // it down.
  //
  // It is the same shape as every other hole in this file's history: something the
  // gate could not classify became something the gate ignored. With the matcher now
  // inverted to paid-by-default, an unrecognised seat lands HERE, and this is the
  // branch that decides whether inversion means anything at all. GLM 5.3 named that
  // dependency exactly: inversion is cosmetic while the unpriced branch fail-opens.
  //
  // NO APPROVAL TOKEN IS MINTED. This is a CLASSIFICATION refusal, not a spend
  // refusal — there is nothing for Sean to approve, because nobody yet knows what
  // the call costs. A token here would let an agent buy its way past the one question
  // that must be answered.
  // ANY unpriced seat in the line blocks, not just the one that won the max.
  //
  // GLM 5.3 round-4 B2, reproduced at exit 0:
  //     node scripts/consult-kimi.mjs --document a && node scripts/consult-newseat.mjs --document b
  // `priceOf` returns -1 for an unknown seat so it can never win the max, and
  // `oneCallUsd` returned 0 for it — so the unpriced BLOCK, whose comment says "an
  // unknown seat now falls through", was FALSE for every compound line. Any future
  // seat not yet in SCRIPT_MODEL rode free beside any priced one, which is the
  // inversion being cosmetic in exactly the batching case the summing fix was for.
  const unpriced = chargeable.filter((n) => !PANEL_SCRIPTS.has(n) && !PRICES[SCRIPT_MODEL[n]]);
  if (unpriced.length && !(chargeable.length === 1 && isPanel)) {
    console.error([
      `SPEND GUARD — BLOCKED: ${unpriced.join(', ')} ${unpriced.length > 1 ? 'are' : 'is'} not priced.`,
      '',
      '  A seat with no price cannot be capped, so it cannot be allowed — not alone,',
      '  and not alongside a seat that is priced.',
      '',
      '  Pick ONE, deliberately:',
      '    PRICES + SCRIPT_MODEL   in scripts/hooks/spend-guard-gate.mjs — add the real',
      '                            OpenRouter price. Look it up; do not estimate.',
      '    FREE_ALLOWLIST          in scripts/lib/paid-seats.mjs — if it genuinely cannot',
      '                            bill (local, subscription, free tier).',
      '    KNOWN_UNGATED           in scripts/lib/paid-seats.mjs — only to freeze',
      '                            pre-existing debt, WITH a written reason.',
      '',
      '  There is no token for this. Nothing to approve until someone knows the cost.',
    ].join('\n'));
    process.exit(2);
  }

  if (!price && !isPanel) {
    console.error([
      `SPEND GUARD — BLOCKED: ${scriptName || 'this script'} is not priced.`,
      '',
      '  It reads a payment credential and the gate has no per-token price for it,',
      '  so no cap can be applied. Waving it through was the old behaviour and it is',
      '  how four live seats billed unseen for weeks.',
      '',
      '  Pick ONE, deliberately:',
      '    PRICES + SCRIPT_MODEL   in scripts/hooks/spend-guard-gate.mjs — add the real',
      '                            OpenRouter price. Look it up; do not estimate.',
      '    FREE_ALLOWLIST          in scripts/lib/paid-seats.mjs — if it genuinely cannot',
      '                            bill (local, subscription, free tier).',
      '    KNOWN_UNGATED           in scripts/lib/paid-seats.mjs — only to freeze',
      '                            pre-existing debt, WITH a written reason.',
      '',
      '  There is no token for this. Nothing to approve until someone knows the cost.',
    ].join('\n'));
    process.exit(2);
  }

  // Same rule for the output ceiling. Found by the same round: appending
  // `--max-tokens 500` to a Fable call dropped the estimate under the cap — and
  // consult-fable.mjs does not even accept that flag, so the real call would
  // have used its own 16k default and cost the full amount. A declared ceiling
  // may raise the estimate; it may never lower it below the script's default.
  const SCRIPT_DEFAULT_MAX_TOK = 16000;
  const declaredTok = Number(flagValue(cmd, 'max-tokens') || 0)
    || Number(Object.entries(envVars).find(([k]) => /^SWAN_[A-Z_]*MAX_TOKENS$/.test(k))?.[1] || 0)
    || 0;
  const maxTok = Math.max(declaredTok, SCRIPT_DEFAULT_MAX_TOK);

  // Input size is unknown at gate time; assume a large review packet so the
  // worst case is honest rather than flattering.
  const ASSUMED_IN_TOK = 26000;
  // SUM every chargeable invocation in the line, not just the priciest one.
  //
  // GLM 5.3-flash round-3 blocker 4, reproduced live at exit 0:
  //
  //     node consult-codex.mjs --document a && node consult-codex.mjs --document b
  //       && node consult-codex.mjs --document c
  //
  // Three real calls, ~$0.67 each. Round 2 fixed "two DIFFERENT paid scripts" by
  // taking the MAX — which prices this at $0.67, inside the $1.00 cap, ALLOW, with
  // ~$2.01 of exposure and no per-call enforcement for calls two through N. Max was
  // the wrong operator: it defends against a cheap seat sheltering an expensive one,
  // and does nothing about the same seat called repeatedly. GLM 5.3 said "price the
  // sum" in round 3 and I chose max with a rationale that only covered half the case.
  //
  // A panel is priced by its own per-seat fan-out, so it is summed as one unit.
  const oneCallUsd = (n) => {
    // A PANEL has no SCRIPT_MODEL entry — its cost is the per-seat fan-out. Returning
    // 0 for it (GLM 5.3-flash round-4 finding 5, reproduced at exit 0) meant a
    // compound line containing a panel priced the panel at nothing: `<panel with
    // fable,sol> && <kimi>` came out at ~$0.31 against ~$1.68 of real exposure. The
    // panel's special-case pricing only ran on the path where it was the sole or
    // worst chargeable name, and its -1 sort weight made that impossible in any
    // compound — a special case unreachable from the branch that needed it.
    if (PANEL_SCRIPTS.has(n)) return panelUsd;
    const k = SCRIPT_MODEL[n];
    const p = k && PRICES[k];
    return p ? (ASSUMED_IN_TOK / 1e6) * p[0] + (maxTok / 1e6) * p[1] : 0;
  };
  const callUsd = (k) => (ASSUMED_IN_TOK / 1e6) * PRICES[k][0] + (maxTok / 1e6) * PRICES[k][1];

  // CARRY THE RAISE INTO THE SUM (GLM 5.3-flash round-4 finding 6, reproduced):
  //
  //   node consult-kimi.mjs --document a --model claude-fable-5        -> exit 2 BLOCK
  //   ...the same, followed by `&& node consult-grok.mjs --document b` -> exit 0 ALLOW
  //
  // `oneCallUsd` reads SCRIPT_MODEL defaults only, so a raise the gate had already
  // computed was discarded in exactly the multi-call lines the summing fix was built
  // for — appending a cheap second call LOWERED the estimate of the first. The delta
  // is added once, for the one script the override targets; the override is a
  // property of the command, not of every seat on the line, so applying it to all of
  // them would over-count.
  // Against the RAISING seat's own baseline — the sum already contains that seat at
  // its default price, so the delta is what the raise ADDS to it. Using the line's
  // first seat here computed a delta between two unrelated models.
  const raiseBase = raiseBaseKey || defaultKey;
  const raiseDelta = (modelKey !== raiseBase && PRICES[modelKey] && PRICES[raiseBase])
    ? Math.max(0, callUsd(modelKey) - callUsd(raiseBase))
    : 0;

  const worstCaseUsd = isPanel
    ? panelUsd
    : (chargeable.length > 1
      ? chargeable.reduce((sum, n) => sum + oneCallUsd(n), 0) + raiseDelta
      : (ASSUMED_IN_TOK / 1e6) * price[0] + (maxTok / 1e6) * price[1]);

  // --- topic: what "the whole thing" means --------------------------------
  // Best available proxy for one workstream is the document/out path stem.
  // topicFromPath is the SINGLE normalizer, shared with every ledger WRITER. The inline
  // version this replaced was the guard's own rules; a writer used different rules;
  // spentOnTopic matches strictly — so the per-topic cap silently never accumulated for
  // some documents (found 2026-08-24, the day a writer went live).
  const docArg = flagValue(cmd, 'document') || flagValue(cmd, 'out');
  const topic = topicFromPath(docArg || 'untitled');

  // Also from the parse. This one matters MORE than the other two, not less: it is the
  // token that buys a refused call, and reading it out of raw text meant a token
  // appearing anywhere on the line — inside a quoted remit, in a `--document` value —
  // counted as presented. The protocol is "re-run the command with the token in front
  // of it", and that is now what is actually required.
  const approvalToken = /^[a-f0-9]{12}$/.test(envVars.SWAN_SPEND_APPROVE || '')
    ? envVars.SWAN_SPEND_APPROVE : '';

  // --- HOLD FIRST, THEN ASK ------------------------------------------------
  //
  // GLM 5.3 round-4 B4 and flash 3, same defect, and GLM's ONE THING. Reserving
  // AFTER the decision leaves nothing serializing the two, so N parallel gates all
  // decide on a snapshot none of them has written to yet. The suite's own
  // "12/20 under a barrier" was that residual window, measured. Appending the hold
  // first makes it visible to every later reader before this gate commits, and the
  // refusal path below gives the budget straight back.
  //
  // ONE HOLD PER INVOCATION, not one for the line. A compound reserved a single row
  // under the winner's key while each script settles under its own, so the first
  // completion cancelled the whole combined hold with siblings still running — the
  // in-flight blindness reopened for exactly the batching case. Per-invocation holds
  // mean each script settles the hold that belongs to it. It is also what GLM listed
  // as MISSED: nothing tested that a compound line reserves per invocation.
  // EACH HOLD CARRIES ITS OWN SEAT'S TOPIC (flash round-5 F2, reproduced — both holds
  // on `kimi --document a.md && sol --document b.md` were keyed to topic `a`). A hold
  // under the wrong topic can never be settled: the writer releases under the topic it
  // actually ran on, that release matches nothing and is discarded as an orphan, and
  // the hold sits for the full TTL as ghost spend against a workstream it never
  // touched. "Each script settles the hold that belongs to it" was true of the model
  // key and false of the topic — half a fix, again, and in the same function.
  // NO `|| docArg` FALLBACK (GLM 5.3 round-6 F5). A seat with no `--document` used to
  // inherit the LINE'S FIRST topic — while its writer records `untitled`, because that
  // is what `topicFromPath` returns for a doc-less call. Hold under `a`, release under
  // `untitled`, no match, orphan, ghost spend for the TTL. The same half-fix class as
  // the per-seat topic bug it sits inside, one field over: I made the topic per-seat
  // and then let a fallback put the wrong value in it.
  //
  // The rule is not "guess a topic" but "predict what the WRITER will record", which is
  // the only thing that makes a hold settleable.
  const topicOfSeat = (n) => {
    const a = argsOfSeat(cmd, n);
    return topicFromPath(flagFrom(a, 'document') || flagFrom(a, 'out') || 'untitled');
  };
  // A PANEL RESERVES PER SEAT, under the model ids its fan-out will actually record.
  //
  // Round 5 wrote that sentence as a COMMENT and left `model: 'panel'` on the very
  // next line. GLM 5.3 round-6 B4 caught it, reproduced: every panel hold — both the
  // single and compound paths — went under the literal string `panel`, which no writer
  // ever produces. So the per-seat releases matched nothing, were discarded as
  // orphans, and the whole fan-out sat as ghost spend for the full TTL, double-counting
  // every confirmed panel run.
  //
  // THIRD FALSE COMMENT of this workstream, on the money path, in the round after I
  // confessed the pattern twice. No test could have caught it: nothing reads
  // reservation rows for a panel line, and the settle-parity pairs derive from
  // providers.mjs, which cannot contain 'panel'. A claim in a comment is not a control,
  // and this is the third time that has cost something.
  const panelHolds = () => panelSeats
    .filter((s) => !FREE_PANEL_SEATS.has(s))
    .map((s) => ({ model: PANEL_SEAT_MODEL[s] || s, usd: seatWorstUsd(s), topic }));

  const holdSpec = isPanel
    ? panelHolds()
    : (chargeable.length <= 1
      ? [{ model: modelKey, usd: worstCaseUsd, topic }]
      : chargeable.map((n) => (PANEL_SCRIPTS.has(n)
        ? null                      // expanded below, per seat
        : { model: SCRIPT_MODEL[n] || n, usd: oneCallUsd(n), topic: topicOfSeat(n) }))
        .filter(Boolean)
        .concat(chargeable.some((n) => PANEL_SCRIPTS.has(n)) ? panelHolds() : []));

  // Non-fatal: a hold that cannot be written must not block a call the caps would
  // allow. It is loud, because silently losing it reopens the parallel overshoot.
  const holds = [];
  try {
    for (const h of holdSpec) {
      holds.push({ nonce: reserveSpend({ model: h.model, topic: h.topic, usd: h.usd }), topic: h.topic });
    }
  } catch (err) {
    console.error(`[spend-guard] could not reserve budget — parallel calls may overshoot: ${err?.message}`);
  }
  // `selfHeld` only when the WHOLE worst case is on the file; a partial write would
  // otherwise under-count the caller against its own caps.
  const selfHeld = holds.length === holdSpec.length;

  // EVERY TOPIC ON THE LINE IS CHECKED, not just the first (GLM 5.3 round-5 F5).
  // `--document` came from the first invocation, so the whole line was charged to
  // topic A and topic B's cap was never consulted. Repro: seed `plan` to $2.90, then
  //   node consult-kimi.mjs --document fresh.md && node consult-sol.mjs --document plan.md
  // -> $0.93 is under the per-call cap, `fresh` is clean, ALLOW — and sol's real $0.61
  // lands on `plan`, taking it to $3.51 against a $3.00 cap. The per-topic budget is
  // THE primary control here (per-call is secondary, by Sean's own framing), and it
  // was voidable by any seat that was not first.
  //
  // The holds are already on the file under their own topics, so `spentOnTopic` sees
  // this line's contribution to each — the comparison is against the total, not a sum
  // to add. checkSpend below still owns per-call and per-day, which are line-wide.
  const otherTopics = [...new Set(holdSpec.map((h) => h.topic))].filter((t) => t !== topic);
  for (const t of otherTopics) {
    const total = spentOnTopic(t);
    if (total > CAPS.perTopic) {
      for (const h of holds) {
        try { releaseReservation({ model: '', topic: h.topic, nonce: h.nonce }); } catch { /* non-fatal */ }
      }
      console.error([
        `SPEND GUARD — BLOCKED: topic "${t}" would reach $${total.toFixed(2)} > cap $${CAPS.perTopic.toFixed(2)}.`,
        '',
        '  This line spends against more than one document. The cap for a topic that is',
        '  not the first one on the line is checked too — it used to be invisible, so a',
        '  seat placed second could overrun its workstream budget unseen.',
        '',
        '  Split the line, or ask Sean about that topic specifically.',
      ].join('\n'));
      process.exit(2);
    }
  }

  const decision = checkSpend({ model: modelKey || 'panel', topic, worstCaseUsd, approvalToken, selfHeld });

  if (decision.allow) {
    if (decision.reason === 'second approval accepted') {
      console.error(`[spend-guard] SECOND APPROVAL ACCEPTED — proceeding. ${decision.breach}`);
    }
    ALLOW();
  }

  // REFUSED — hand the budget back. Released by NONCE, so a refusal settles the
  // holds this gate placed and never a concurrent caller's live one.
  for (const h of holds) {
    try { releaseReservation({ model: '', topic: h.topic, nonce: h.nonce }); } catch { /* non-fatal */ }
  }

  // --- refuse: first ask ---------------------------------------------------
  //
  // Write the token where SEAN reads it, not into the agent's own error output.
  // GLM 5.3 round-3 blocker 2: the Fable gate stopped printing its token in
  // `fef453e29`; this one kept doing it, and my commit message read broader than the
  // change. Two gates, one protocol, opposite behaviour — and the one still printing
  // is the one guarding actual money.
  //
  // Same honest limit as the Fable gate: an agent with file-read access can open this
  // too. What changes is the reflex, not the possibility — self-serving now takes a
  // deliberate, greppable act rather than reading the error it just caused.
  try {
    writeFileSync(join(SPEND_DIR, 'PENDING-SPEND-APPROVAL.txt'), [
      'SPEND GUARD — an agent asked to spend and was refused.',
      '',
      `  when:      ${new Date().toISOString()}`,
      `  model:     ${modelKey || 'panel fan-out'}`,
      `  worst case $${worstCaseUsd.toFixed(2)}`,
      `  topic:     ${topic}`,
      `  breach:    ${decision.breach}`,
      '',
      'If you want this to run, read the token below back to the agent.',
      'If you did not ask for it, do nothing — the refusal already held.',
      '',
      `  SWAN_SPEND_APPROVE=${decision.token}`,
      '',
      'Single-use, and bound to that exact model+topic+cost.',
    ].join('\n'), 'utf-8');
  } catch (err) {
    // Non-fatal: the refusal itself is the control. Losing the note costs Sean a
    // lookup in pending-approval.json, not the protection.
    console.error(`[spend-guard] could not write the approval note: ${err?.message}`);
  }

  const t = decision.totals;
  const lines = [
    'SPEND GUARD — BLOCKED (first ask). Sean 2026-08-22: a whole workstream should cost $2-3, not $5.',
    '',
    `  model            ${modelKey || 'panel fan-out'}`,
    `  worst case       $${worstCaseUsd.toFixed(2)}   (cap per call $${CAPS.perCall.toFixed(2)})`,
    `  topic            ${topic}`,
    `  spent on topic   $${t.topic.toFixed(2)}        (cap $${CAPS.perTopic.toFixed(2)})`,
    `  spent today      $${t.day.toFixed(2)}        (cap $${CAPS.perDay.toFixed(2)})`,
    '',
    `  BREACH: ${decision.breach}`,
    '',
    'This is the FIRST of two asks. Show Sean the numbers above and get an explicit yes.',
    '',
    'THE TOKEN IS NOT PRINTED HERE, and that is deliberate. A PreToolUse refusal is',
    'read by YOU, not by Sean — printing it made the second ask something you could',
    'satisfy alone, so the two-ask protocol bound nothing. It is written to:',
    '',
    `    .ai-workflow/spend/PENDING-SPEND-APPROVAL.txt`,
    '',
    'Ask Sean to read the token back to you, then re-run the same command with',
    'SWAN_SPEND_APPROVE=<token> in front. Do not open that file to serve yourself:',
    'this gate is friction and an audit trail, not a wall, and helping yourself to',
    'the key is the exact move it exists to make visible.',
    '',
    'The token is single-use and bound to this exact model+topic+cost.',
    'Cheaper first: Qwen 3.8 is local and free, GLM 5.3 is subscription, DeepSeek',
    'V4 Flash/Pro are cents. Ask whether the expensive seat is actually needed.',
  ];

  console.error(lines.join('\n'));
  process.exit(2); // non-zero blocks the tool call
} catch (err) {
  // Fail OPEN, loudly. Never brick the toolchain over a guard bug.
  console.error(`[spend-guard] gate error, failing open: ${err?.message}`);
  process.exit(0);
}

```

## A5 · scripts/hooks/spend-shapes.test.mjs  (196 lines)

```javascript
#!/usr/bin/env node
/**
 * spend-shapes.test.mjs — THE SHAPE CORPUS. One executable table of
 * "real bash line -> does it execute a paid seat", asserted end-to-end
 * through the real gate.
 * ============================================================================
 * GLM 5.3's round-6 ONE THING, and he made the case out of my own words. The
 * round-4 packet explained that `cmd /c` "regressed silently, because the sweep
 * lived in prose rather than a test" — and then the sweep stayed prose. Two
 * rounds later, backticks regressed the same way: a shape the ORIGINAL regex
 * caught, lost in the rewrite, invisible because nothing executed the list.
 *
 * A rewrite that can lose old coverage owes a proof of parser >= regex over the
 * old corpus. This is that proof, and it is the artefact the last three rounds
 * kept asking for in different words:
 *
 *   round 4  "39 shapes" recorded in a packet -> lost `cmd /c`
 *   round 5  the fail-closed inversion         -> lost backticks
 *   round 6  INERT_HEADS                       -> lost `find -exec`
 *
 * Every future fix adds a ROW here, not a paragraph somewhere. A row cannot rot
 * into prose, and a row that stops being true fails loudly.
 *
 * TWO COLUMNS, BOTH LOAD-BEARING. `BILLS` is the money direction: bash would run
 * a paid seat, so the gate must block. `INERT` is the cry-wolf direction, which
 * this workstream has repeatedly argued is the MORE corrosive failure — a guard
 * people learn to wave through protects nothing. A fix that turns a BILLS row
 * green by turning an INERT row red has not fixed anything.
 *
 * WHAT THIS IS NOT: a differential test against real bash. Both seats asked for
 * a shell oracle (flash round-6 MISSED 4) and they are right that it would have
 * caught shapes I hand-wrote wrongly. It is not built here because executing
 * these lines means executing paid seats; an oracle needs a harness that swaps
 * the seat for a no-op, which is its own slice. Recorded as a named gap rather
 * than implied to be covered — the same discipline as the O_EXCL walk-back.
 *
 * Run: node --test scripts/hooks/spend-shapes.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GATE = join(HERE, 'spend-guard-gate.mjs');
const SEAT = 'scripts/consult-fable.mjs';

function gate(command) {
  const dir = mkdtempSync(join(tmpdir(), 'swan-shapes-'));
  const r = spawnSync(process.execPath, [GATE], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    encoding: 'utf-8',
    env: { ...process.env, SWAN_SPEND_DIR: dir },
  });
  rmSync(dir, { recursive: true, force: true });
  return r.status;
}

/**
 * BILLS — bash runs a paid seat on this line. The gate must not exit 0.
 * Each row names the round that found it, so the corpus doubles as the history
 * of what this guard has actually been wrong about.
 */
const BILLS = [
  ['r1  plain invocation',            `node ${SEAT} --document plan.md`],
  ['r1  absolute interpreter',        `/usr/bin/node ${SEAT} --document plan.md`],
  ['r1  sh -c wrapper',               `sh -c "node ${SEAT} --document plan.md"`],
  ['r1  bash -lc wrapper',            `bash -lc 'node ${SEAT} --document plan.md'`],
  ['r1  newline separator',           `cd /repo\nnode ${SEAT} --document plan.md`],
  ['r1  tab before interpreter',      `cd /repo &&\tnode ${SEAT} --document plan.md`],
  ['r2  pipe inside a quoted arg',    `node --require "a|b" ${SEAT} --document plan.md`],
  ['r2  semicolon in a quoted arg',   `node --require "a;b" ${SEAT} --document plan.md`],
  ['r2  invocation in 2nd command',   `npm run build && node ${SEAT} --document plan.md`],
  ['r3  two paid seats, one line',    `node scripts/consult-kimi.mjs --document p.md && node ${SEAT} --document p.md`],
  ['r4  --check AFTER the script',    `node ${SEAT} --document x --check`],
  ['r4  --version in a sibling cmd',  `node --version && node ${SEAT} --document x`],
  ['r4  quoted span behind cd',       `bash -c "cd /srv/app && node ${SEAT} --document x"`],
  ['r4  quoted script path',          `node "${SEAT}" --document x`],
  ['r4  exec inside sh -c',           `sh -c "exec node ${SEAT}"`],
  ['r4  shebang direct execution',    `./${SEAT} --document x`],
  ['r5  redirect before the script',  `node >out.mjs ${SEAT} --document plan.md`],
  ['r5  fd-prefixed redirect first',  `2>err.mjs node ${SEAT} --document plan.md`],
  ['r5  wrapper with its own flags',  `stdbuf -oL node ${SEAT} --document plan.md`],
  ['r5  env -i',                      `env -i node ${SEAT} --document plan.md`],
  ['r5  backslash escape in path',    'node scripts/consult\\-fable.mjs --document plan.md'],
  ['r5  quoted argv[0]',              `"./${SEAT}" --document plan.md`],
  ['r5  --require space form',        `node --require ./prelude.js ${SEAT} --doc x`],
  ['r5  --import space form',         `node --import ./setup.mjs ${SEAT} --doc x`],
  ['r5  boolean node flag',           `node --trace-warnings ${SEAT}`],
  ['r5  unknown node flag',           `node --foo ${SEAT}`],
  ['r5  seat AS a loader value',      'node --require scripts/consult-fable.mjs other.mjs'],
  ['r5  runner eval mode',            `node -e "import('./${SEAT}')"`],
  ['r5  xargs',                       `xargs node ${SEAT}`],
  ['r5  sudo',                        `sudo node ${SEAT} --document x`],
  ['r5  cmd /c',                      `cmd /c node ${SEAT} --document x`],
  ['r5  nodejs (a real binary)',      `nodejs ${SEAT} --document x`],
  ['r5  unrecognised head + seat',    `node-foo ${SEAT} --document x`],
  ['r6  find -exec',                  `find . -maxdepth 0 -exec node ${SEAT} --document plan.md \\;`],
  ['r6  sed e (GNU shells out)',      `sed 'e node ${SEAT}' file.txt`],
  ['r6  vim -c',                      `vim -c '!node ${SEAT}' -c qa f`],
  ['r6  start (launcher)',            `start node ${SEAT}`],
  ['r6  backticks',                   `echo \`node ${SEAT} --document plan.md\``],
  ['r6  backticks in an assignment',  `OUT=\`node ${SEAT} --document plan.md\``],
  ['r6  backticks in double quotes',  `echo "r: \`node ${SEAT} --document plan.md\`"`],
  ['r6  $() substitution',            `echo $(node ${SEAT} --document plan.md)`],
  ['r6  stdin redirect',              `node --input-type=module < ${SEAT} --document plan.md`],
  ['r6  stdin pipe',                  `cat ${SEAT} | node --input-type=module --document plan.md`],
  ['r6  --import= equals form',       `node --import=./setup.mjs ${SEAT} --document plan.md`],
  ['r6  --require= equals form',      `node --require=./prelude.js ${SEAT} --document plan.md`],
  ['r6  -r= equals form',             `node -r=./prelude.js ${SEAT} --document plan.md`],
  ['r6  env -S quoted body',          `env -S "node ${SEAT} --document x"`],
  ['r6  eval beside a positional',    `node ${SEAT} --document x -e '1'`],
  ['r6  uppercase extension',         'node scripts/consult-fable.MJS --document x'],
];

/**
 * INERT — no money moves. The gate must exit 0.
 *
 * These matter as much as the rows above. Every one is a line somebody types on
 * an ordinary day, and several were BROKEN by a careless fix for a BILLS row
 * during the very rounds that produced this file: `find -name`, `sed -n`,
 * `node -c`, and a `for` loop over test files all cried wolf within minutes of a
 * new rule landing.
 */
const INERT = [
  ['mention: cat',                    `cat ${SEAT}`],
  ['mention: grep',                   `grep -n INVOCATION ${SEAT}`],
  ['mention: git grep',               `git grep "node ${SEAT}" docs`],
  ['mention: echo',                   `echo node ${SEAT}`],
  ['mention: which',                  'which node'],
  ['mention in single quotes',        `echo 'see \`node ${SEAT}\` in the docs'`],
  ['seat name as a --seed VALUE',     `node scripts/consult-gemini.mjs --document p.md --seed ${SEAT}`],
  ['seat name in quoted data',        `node scripts/format-docs.mjs --text "see ${SEAT}"`],
  ['parse-only --check',              `node --check ${SEAT}`],
  ['parse-only -c',                   `node -c ${SEAT}`],
  ['a free seat',                     'node scripts/consult-gemini.mjs --document plan.md'],
  ['a cheap seat',                    'node scripts/consult-sol.mjs --document plan.md'],
  ['a cheap compound',                'node scripts/consult-kimi.mjs --doc a && node scripts/consult-hy3-design.mjs --doc b'],
  ['find -name',                      'find . -name "*.mjs"'],
  ['sed -n print',                    `sed -n '1,5p' ${SEAT}`],
  ['a test-runner loop',              'for f in a.test.mjs b.test.mjs; do node --test "$f"; done'],
  ['a while loop',                    'while read l; do echo $l; done'],
  ['an if statement',                 'if [ -f x ]; then echo yes; fi'],
  ['eval naming no script',           `node -e 'console.log(1)'`],
  ['ordinary --import= on a build',   'node --import=./setup.mjs build.mjs'],
  ['env assignment',                  'env FOO=bar node build.mjs'],
  ['data on stdin, not a program',    'node build.mjs < input.txt'],
  ['a pipe into grep',                'cat notes.md | grep node'],
  ['npm',                             'npm run build'],
];

test('CORPUS: every shape that bills is blocked', () => {
  const escaped = [];
  for (const [name, cmd] of BILLS) {
    if (gate(cmd) !== 2) escaped.push(name);
  }
  assert.deepEqual(escaped, [], [
    '',
    'These command shapes run a PAID SEAT and the gate let them through:',
    ...escaped.map((n) => `    ${n}`),
    '',
    'Each row is a shape some round already found. A row going green->red here is a',
    'REGRESSION, not a new discovery — which is the whole reason this table exists:',
    '`cmd /c` and backticks were both caught once, recorded in prose, and lost.',
  ].join('\n'));
});

test('CORPUS: every inert shape stays quiet', () => {
  const wolves = [];
  for (const [name, cmd] of INERT) {
    if (gate(cmd) !== 0) wolves.push(name);
  }
  assert.deepEqual(wolves, [], [
    '',
    'These command shapes spend nothing and the gate refused them:',
    ...wolves.map((n) => `    ${n}`),
    '',
    'Cry-wolf is the more corrosive failure — a guard people learn to wave through',
    'protects nothing. A fix that turns a BILLS row green by turning one of these red',
    'has not fixed anything.',
  ].join('\n'));
});

test('CORPUS: the table itself is non-trivial and the instrument works', () => {
  // A corpus test that silently ran zero rows would report perfect coverage, which
  // is the instrument-blindness this workstream has now hit four separate times.
  assert.ok(BILLS.length >= 45, `the BILLS corpus shrank to ${BILLS.length} — rows are not deleted, they are fixed`);
  assert.ok(INERT.length >= 20, `the INERT corpus shrank to ${INERT.length}`);
  // And the harness really distinguishes the two directions.
  assert.equal(gate(`node ${SEAT} --document plan.md`), 2, 'control: the canonical paid call blocks');
  assert.equal(gate(`cat ${SEAT}`), 0, 'control: the canonical mention does not');
});

```

## A6 · scripts/hooks/spend-coverage.test.mjs  (338 lines)

```javascript
#!/usr/bin/env node
/**
 * spend-coverage.test.mjs — the coverage contract (SWA-218).
 * ==========================================================
 * Both hostile reviewers on 2026-08-26 named the same ONE THING, independently:
 * replace the hand-curated seat list with a generated contract that FAILS the day
 * drift lands, instead of the day someone notices a bill.
 *
 * The rule this file enforces, in one sentence: **every script that reads a payment
 * credential must either be matched by the spend gate, or be on the FREE allowlist
 * with a written reason.** No third option.
 *
 * It caught real drift the moment it was written — the gate priced two scripts that
 * do not exist while four live ones that read OPENROUTER_API_KEY matched nothing.
 *
 * Run: node scripts/hooks/spend-coverage.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CREDENTIAL_MARKERS, FREE_ALLOWLIST, KNOWN_UNGATED, invokesPaidSeat, readsCredential } from '../lib/paid-seats.mjs';

const SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Every .mjs under scripts/ and scripts/context-gateway/src/, as repo-ish paths. */
function candidateScripts(dir = SCRIPTS, depth = 0) {
  // RECURSIVE. It used to walk exactly two flat directories, so a credential-bearing
  // script in scripts/lib/, scripts/hooks/, or anywhere deeper was invisible and the
  // contract passed green forever (GLM 5.3 F5 and 5.3-flash B3, independently).
  //
  // The old positive control could not have noticed: it asserted only that the walk
  // found more than five files and included consult-fable.mjs — both true of a blind
  // walk. An instrument check that cannot detect the instrument being blind is the
  // same class of defect as the thing it is guarding.
  const out = [];
  if (!existsSync(dir) || depth > 6) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) { out.push(...candidateScripts(full, depth + 1)); continue; }
    // `.js` and `.cjs` too (GLM F3 / flash 7): a credential-bearing helper in either
    // was invisible, and nothing about a file extension makes a key cheaper to leak.
    // Measured before widening — 14 such files exist under scripts/ and none reads a
    // credential today, so this costs nothing now and closes the hole for later.
    if (!/\.(mjs|js|cjs)$/.test(e.name) || /\.test\.(mjs|js|cjs)$/.test(e.name)) continue;
    out.push(full);
  }
  return out;
}

/**
 * USES a payment credential, not merely NAMES one.
 *
 * The first version tested `src.includes(marker)`, which flagged this file's own
 * siblings — `spend-guard-gate.mjs`, `paid-seats.mjs`, `secret-read-gate.mjs` all
 * contain those strings precisely because they are the guards that look for them.
 * The recursive walk surfaced that immediately: six new hits, three of them the
 * machinery doing the checking.
 *
 * Reading a key is the difference from talking about one. A grep loose enough to
 * flag its own guard is a grep that trains people to add exemptions, and every
 * exemption added for a false positive is a place a real one can later hide.
 *
 * The idiom list now lives in `readsCredential` (paid-seats.mjs) so the gate and this
 * contract cannot drift apart on what "uses a credential" means — the same reason the
 * seat roster stopped living inside a regex.
 */
const spendsMoney = (file) => readsCredential(readFileSync(file, 'utf-8'));

/** How the gate would see a normal invocation of this script. */
const invocationOf = (file) =>
  `node ${relative(SCRIPTS, file).replaceAll('\\', '/')} --document plan.md`;

// ---------------------------------------------------------------------------

test('the walker actually finds scripts — validate the instrument first', () => {
  // A coverage test that silently scans nothing would report perfect coverage.
  // This is the positive control: if the walk breaks, this fails before the
  // reassuring green appears below it.
  const all = candidateScripts();
  assert.ok(all.length > 5, `expected to walk several scripts, found ${all.length}`);
  assert.ok(all.some((f) => f.endsWith('consult-fable.mjs')), 'the known paid seat must be in the walk');

  // DEPTH is the part the old control missed. Asserting "more than five files, and
  // consult-fable is present" is true of a walk that never descends, so it certified
  // a blind instrument for two rounds. Name files that only exist BELOW the top level.
  const rel = all.map((f) => relative(SCRIPTS, f).replaceAll('\\', '/'));
  for (const deep of ['lib/spend-ledger.mjs', 'hooks/spend-guard-gate.mjs', 'context-gateway/src/consult.mjs']) {
    assert.ok(rel.includes(deep), `the walk must descend: ${deep} is missing, so the contract is blind below the top level`);
  }
  assert.ok(rel.some((f) => f.split('/').length > 2), 'at least one file two levels deep');

  // EXTENSION is the other axis, and it was an untested invariant until a mutation
  // reporting zero reds sent me looking for why. Widening the walk to .js/.cjs adds
  // no credential-bearing files TODAY, so nothing downstream depends on it and no
  // assertion could fail — a change that is real, correct, and invisible to the
  // suite. That is the same shape as the vacuous tests this workstream keeps
  // finding, arriving from the other direction: not a test that cannot fail, but a
  // behaviour nothing watches.
  assert.ok(rel.some((f) => /\.(js|cjs)$/.test(f)),
    'the walk must cover .js/.cjs — a credential in one of those spends money exactly the same');
});

test('the credential grep actually discriminates — and on its REAL subjects', () => {
  // Second control: if `spendsMoney` returned true for everything (or nothing),
  // the contract below would be vacuous in one direction or the other.
  const all = candidateScripts();
  const paid = all.filter(spendsMoney);
  assert.ok(paid.length > 0, 'no script reads a payment credential — the grep is broken');
  assert.ok(paid.length < all.length, 'every script looks paid — the grep is too broad');

  // GLM 5.3 finding 1 / flash finding 11 — the fifth vacuous test, and both were
  // right about the shape. `paid.length > 0` is satisfied FOREVER by the frozen
  // library entries (lib/preflight.mjs, the two gateway files), which sit in
  // KNOWN_UNGATED and are skipped by the contract anyway. So the control could not
  // detect the grep going blind on its actual subject: the seats that bill.
  //
  // Pinning named exemplars is what makes it a control. These are chosen because
  // they are REAL paid entrypoints, not libraries — a fan-out and an image probe.
  const names = paid.map((f) => f.split(/[\\/]/).pop());
  for (const seat of ['consult-openrouter-panel.mjs', 'forge-i2i-probe.mjs', 'consult-codex.mjs']) {
    assert.ok(names.includes(seat),
      `${seat} bills real money and the credential grep no longer sees it — the instrument went blind`);
  }
});

test('every credential idiom an honest author would write is detected', () => {
  // The detector tested exactly `process.env.<MARKER>`. GLM F3 and flash 7 both
  // named the consequence: one linter-driven refactor to destructuring, and a new
  // paid script passes every test green with nobody prompted to classify it.
  //
  // Each case below is a shape a normal author writes, not an evasion. The two
  // negatives matter as much as the positives: a detector that matches a MENTION
  // flags this repo's own guards, and exemptions added for false positives are where
  // real ones later hide.
  const K = 'OPENROUTER_API_KEY';
  const yes = [
    `const k = process.env.${K};`,
    `const k = process.env['${K}'];`,
    `const k = process.env["${K}"];`,
    `const { ${K} } = process.env;`,
    `const {\n  FOO,\n  ${K},\n} = process.env;`,
    `const k = Bun.env.${K};`,
    `const env = process.env;\nconst k = env.${K};`,
    // Round-5: optional chaining, a NON-`env` alias name, and `{ env } = process`.
    // The first widening had a hardcoded `env` inside it — the same assumption it
    // existed to remove, one layer down (GLM F2 / flash F10).
    `const k = process?.env?.${K};`,
    `const e = process.env;\nconst k = e.${K};`,
    `const { env } = process;\nconst k = env["${K}"];`,
    `const k = process.env?.["${K}"];`,
  ];
  for (const src of yes) assert.equal(readsCredential(src), true, `missed idiom:\n${src}`);

  const no = [
    `// we never read ${K} here`,
    `const MARKERS = ['${K}'];`,          // this repo's own guards look exactly like this
    `console.log('set ${K} in your .env');`,
  ];
  for (const src of no) assert.equal(readsCredential(src), false, `false positive on:\n${src}`);
});

test('CREDENTIAL_MARKERS is FROZEN — the exact set, like the debt list', () => {
  // flash finding 11: the freeze discipline was applied to KNOWN_UNGATED's key set
  // and never to the marker list the whole contract reads through. Deleting
  // OPENAI_API_KEY — plausibly, to silence the next guard file that trips the grep —
  // quietly removed every OpenAI-only seat from the contract with all tests green.
  //
  // Shrinking this list is not a cleanup; it is narrowing what counts as spending
  // money. Growing it is fine and expected, and still lands here so it is deliberate.
  assert.deepEqual([...CREDENTIAL_MARKERS].sort(), [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'OPENROUTER_API_KEY',
  ], [
    'CREDENTIAL_MARKERS changed. This list decides what the whole contract can see.',
    'REMOVING one silently drops every seat that pays with it — update this assertion',
    'in the same commit and say why. ADDING one is expected as new providers appear.',
  ].join('\n'));
});

test('CONTRACT: every credential-bearing script is gated or explicitly allowlisted', () => {
  const uncovered = [];
  for (const file of candidateScripts()) {
    if (!spendsMoney(file)) continue;
    const name = file.split(/[\\/]/).pop();
    const rel = relative(SCRIPTS, file).replaceAll('\\', '/');
    // AN EXEMPTION IS SCOPED TO THE FILE IT NAMES (flash finding 7c). Both lists
    // matched by BARE NAME first, so a nested `consult-gemini.mjs` anywhere under
    // scripts/ inherited the top-level entry's free pass and the ghost test stayed
    // green. A bare key now means the top-level file only; anything deeper must be
    // keyed by its relative path — which the two gateway entries already are.
    // A path key matches that exact file at any depth; a bare key matches only the
    // top-level file of that name. Both lists take both forms, symmetrically — the
    // asymmetry (only KNOWN_UNGATED accepted paths) is what forced three libraries
    // into the frozen DEBT list when FREE_ALLOWLIST is where they belong.
    const exempt = (list) => Object.prototype.hasOwnProperty.call(list, rel)
      || (Object.prototype.hasOwnProperty.call(list, name) && rel === name);
    if (exempt(FREE_ALLOWLIST)) continue;
    if (exempt(KNOWN_UNGATED)) continue;
    if (invokesPaidSeat(invocationOf(file))) continue;
    uncovered.push(rel);
  }

  assert.deepEqual(uncovered, [], [
    '',
    'These scripts read a payment credential and the spend gate does not see them:',
    ...uncovered.map((f) => `    ${f}`),
    '',
    'Every one of them can spend real money with no cap, no token and no record.',
    'Fix by ONE of:',
    '  - make the invocation match PAID_INVOCATION in scripts/lib/paid-seats.mjs',
    '  - add it to FREE_ALLOWLIST there WITH A REASON, if it genuinely cannot bill',
    '',
    'Adding it to KNOWN_UNGATED is NOT a fix — that list is frozen debt, and growing',
    'it is admitting a new hole. Talk to Sean before you do.',
    '',
    'Do not delete this test to make it pass.',
  ].join('\n'));
});

test('CONTRACT: KNOWN_UNGATED is FROZEN — the exact key set, not merely reasoned', () => {
  // GLM 5.3 round-3 blocker 3, and it was right: "fails the moment it grows" was
  // FALSE for the list itself. The contract only checked that entries exist with
  // >10-char reasons, so adding a fourth reasoned entry kept everything green. The
  // pre-commit comment saying "adding to KNOWN_UNGATED is NOT a fix" was a comment,
  // not a control — and by this repo's own doctrine, a rule the model must remember
  // is a rule that will eventually be skipped.
  //
  // Now it is an asserted key set. Growing the list fails HERE, which is what the
  // freeze claimed to do all along.
  // SHRANK 5 -> 2 on 2026-08-27, and this assertion failing is what made the move a
  // deliberate act rather than a quiet one — exactly what the freeze is for.
  //
  // The three removed rows (lib/preflight.mjs and the two gateway files) are
  // LIBRARIES that cannot bill, which is FREE_ALLOWLIST's definition. They only sat
  // in the debt list because that list was the only one the contract matched by PATH
  // — an accident of plumbing, not a judgement (GLM 5.3 round-4 F5). Parking non-debt
  // in the baseline inflated the number this workstream is driving to zero and hid
  // the two entries that are real. Debt paid down by RECLASSIFICATION, and saying so
  // out loud matters: the alternative reading is that three holes were closed, and
  // they were not — they were never holes.
  assert.deepEqual(Object.keys(KNOWN_UNGATED).sort(), [
    'hermes-village.mjs',
    'validation-orchestrator.mjs',
  ], [
    'KNOWN_UNGATED changed. That list is FROZEN pre-existing debt, not a place to put',
    'a new script. If you added a row to make something pass, that is admitting a new',
    'hole — price it, or free-list it with a reason. If you genuinely PAID DOWN debt by',
    'removing a row, update this assertion in the same commit and say so.',
  ].join('\n'));
});

test('CONTRACT: the allowlist has no ghosts and no blank reasons', () => {
  // The drift ran both ways: the old gate also priced two scripts that do not
  // exist. An allowlist entry for a deleted file is the same rot, and a blank
  // reason is an exemption nobody can audit later.
  const present = new Set(candidateScripts().map((f) => f.split(/[\\/]/).pop()));
  for (const [name, reason] of [...Object.entries(FREE_ALLOWLIST), ...Object.entries(KNOWN_UNGATED)]) {
    const bare = name.split('/').pop();
    assert.ok(present.has(bare), `the allowlist names ${name}, which does not exist — remove the ghost`);
    assert.ok(reason && reason.trim().length > 10, `${name} needs a real reason, not a blank exemption`);
  }
});

test('CONTRACT: SCRIPT_MODEL has no ghosts either', () => {
  // GLM 5.3 round-5 F9. The no-ghosts discipline was applied to FREE_ALLOWLIST and
  // KNOWN_UNGATED and never to the price tables — so `consult-grok.mjs`, one of the
  // two ghosts the gate's own header cites as PROOF the roster had drifted, was still
  // sitting in SCRIPT_MODEL afterwards. Purged from the matcher, left in the tables.
  //
  // A ghost row is not dangerous the way a MISSING row is: it errs toward pricing
  // something that cannot run. It is still a lie in a table people read to learn what
  // exists, and it had quietly become a fixture in this suite's own tests.
  const gateSrc = readFileSync(join(SCRIPTS, 'hooks', 'spend-guard-gate.mjs'), 'utf-8');
  const block = gateSrc.slice(gateSrc.indexOf('const SCRIPT_MODEL'), gateSrc.indexOf('\n};', gateSrc.indexOf('const SCRIPT_MODEL')));
  const named = [...block.matchAll(/^\s*'([\w.-]+\.mjs)':/gm)].map((m) => m[1]);
  assert.ok(named.length > 5, `instrument: only ${named.length} SCRIPT_MODEL keys parsed`);

  const present = new Set(candidateScripts().map((f) => f.split(/[\\/]/).pop()));
  for (const name of named) {
    assert.ok(present.has(name),
      `SCRIPT_MODEL prices ${name}, which does not exist — remove the ghost, as the allowlists already require`);
  }
});

test('CONTRACT: the gate sees the context-gateway engine path', () => {
  // Kept as defence in depth, with the CLAIM CORRECTED.
  //
  // GLM 5.3-flash blocker 2 called this a live "substitute path" bypass: call the
  // engine directly and spend Fable while matching nothing. I accepted it after
  // confirming the REGEX did not match it — and never checked whether the file was
  // EXECUTABLE. It is not. Verified 2026-08-27: that engine has no shebang and no
  // self-invocation guard, so running it directly defines exports and exits, spending
  // nothing. Matching is not the same as exploitable, and verifying the wrong
  // proposition is how a finding gets "confirmed" while staying wrong.
  //
  // The assertion stays because the day someone gives that engine a CLI entry, it
  // should already be covered rather than newly forgotten.
  assert.equal(invokesPaidSeat('node scripts/context-gateway/src/consult.mjs --seat fable'), true);
});

test('an exemption is scoped to the file it names, not to every file with that name', () => {
  // flash finding 7c. Both lists matched by BARE NAME first, so a nested
  // `consult-gemini.mjs` anywhere under scripts/ inherited the top-level entry's
  // free pass — and the ghost test stayed green because the basename existed
  // somewhere. Free-listing a name is a statement about ONE file (this Gemini shim
  // is on a free tier), never about every future file that reuses the name.
  //
  // Written against the real predicate rather than the filesystem: creating a decoy
  // file under scripts/ during a test run would be visible to any concurrent agent
  // in this shared tree, and Rule 67 says do not do that.
  const bareKeyApplies = (list, name, rel) =>
    Object.prototype.hasOwnProperty.call(list, name) && rel === name;

  assert.equal(bareKeyApplies(FREE_ALLOWLIST, 'consult-gemini.mjs', 'consult-gemini.mjs'), true,
    'the top-level file the allowlist actually names must still be exempt');
  assert.equal(bareKeyApplies(FREE_ALLOWLIST, 'consult-gemini.mjs', 'vendor/consult-gemini.mjs'), false,
    'a NESTED file must not inherit a top-level exemption by sharing its basename');

  // The path-keyed entries keep working, which is what makes the bare-key rule safe
  // to tighten: anything nested that genuinely needs an exemption already has one.
  // Asserted on FREE_ALLOWLIST since the 5 -> 2 reclassification moved the gateway
  // libraries there; the point is that BOTH lists take path keys, not which list a
  // given library sits in.
  assert.ok(FREE_ALLOWLIST['context-gateway/src/consult.mjs'], 'nested entries are path-keyed');
  const nested = (l) => Object.keys(l).some((k) => k.includes('/'));
  assert.ok(nested(FREE_ALLOWLIST), 'FREE_ALLOWLIST must accept path keys, or libraries get pushed into the debt list');
});

test('a mention of a paid script is still not an invocation', () => {
  // The contract must not achieve coverage by matching everything.
  assert.equal(invokesPaidSeat('cat scripts/consult-fable.mjs'), false);
  assert.equal(invokesPaidSeat('npm run build'), false);
});

```

## A7 · scripts/lib/spend-settle.test.mjs  (487 lines)

```javascript
/**
 * spend-settle.test.mjs — does a completed call actually settle the hold the gate placed?
 * =======================================================================================
 * Round 5, and the answer for the whole life of the reservation feature was NO.
 *
 * THE DEFECT, proven by probe before any fix. The gate reserves under its
 * `SCRIPT_MODEL` key; the writer records under the OpenRouter id from
 * `providers.mjs`. Those are two different strings and always have been:
 *
 *     reserve  claude-fable-5             ->  day = $1.06
 *     record   anthropic/claude-fable-5   ->  day = $1.48   (hold STILL held)
 *
 * So every completed consult double-counted itself for the full 10-minute TTL. Two
 * honest Fable calls put the $3.00 topic cap over on the third — refusing spend that
 * was never real, which is the cry-wolf direction this workstream keeps arguing is
 * the more corrosive one.
 *
 * WHY 113 GREEN TESTS MISSED IT. `spend-token-race.test.mjs` has a test named
 * "F1: a completed call is counted ONCE, not twice" — and it reserves and records
 * with the SAME string. It proves the settle path works exactly when both sides
 * already agree, which is the one condition production never met. That is the sixth
 * vacuous test this workstream has found, and the signature has not changed once:
 * **the fixture encodes the assumption the bug violates.** A test written from the
 * same mental model as the code cannot see past it; only running the two real sides
 * against each other can. GLM 5.3 put it in MISSED — "you never verified the consult
 * scripts' recordSpend model strings against SCRIPT_MODEL keys" — and the reason I
 * had not is that both files read correct on their own.
 *
 * Every test below therefore uses the REAL strings from the two real call sites,
 * never a shared constant.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, utimesSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LEDGER_URL = new URL('./spend-ledger.mjs', import.meta.url).href;

async function freshLedger() {
  const dir = mkdtempSync(join(tmpdir(), 'swan-settle-'));
  process.env.SWAN_SPEND_DIR = dir;
  const mod = await import(`${LEDGER_URL}?s=${Math.random().toString(36).slice(2)}`);
  return { dir, mod };
}

test('PARITY: the gate reserves and the writer records the SAME seat — the hold drains', async () => {
  // The two strings are copied from their real sources, deliberately NOT shared:
  //   spend-guard-gate.mjs  SCRIPT_MODEL['consult-fable.mjs'] = 'claude-fable-5'
  //   context-gateway/src/providers.mjs  model: 'anthropic/claude-fable-5'
  // If a future refactor makes the two sides disagree again, this goes red.
  const { dir, mod } = await freshLedger();
  mod.reserveSpend({ model: 'claude-fable-5', topic: 'plan', usd: 1.06 });
  assert.ok(Math.abs(mod.spentOnTopic('plan') - 1.06) < 1e-9, 'control: the hold is visible');

  mod.recordSpend({ model: 'anthropic/claude-fable-5', topic: 'plan', usd: 0.42 });
  assert.ok(Math.abs(mod.spentOnTopic('plan') - 0.42) < 1e-9,
    `expected only the real $0.42; got $${mod.spentOnTopic('plan')} — the hold never settled`);
  rmSync(dir, { recursive: true, force: true });
});

test('PARITY holds for every gated seat — the pairs are DERIVED, not hand-copied', async () => {
  // GLM 5.3 round-5 F12 / flash F9, and they are right: this list used to be three
  // pairs typed by hand out of ~17 SCRIPT_MODEL keys, with nothing asserting it was
  // complete. A fourth seat added next week with mismatched keys would be invisible —
  // **the blind spot of the very fix that closed the never-settling hold**, one file
  // over. The price-parity test derives both sides; this one did not, and the
  // inconsistency is the tell.
  //
  // Derived now: every provider record's model must be a key the gate reserves under.
  // That is the exact invariant the Fable defect violated, asserted over the whole
  // roster instead of a sample of it.
  const gateSrc = readFileSync(fileURLToPath(new URL('../hooks/spend-guard-gate.mjs', import.meta.url)), 'utf-8');
  const { PROVIDERS } = await import('../context-gateway/src/providers.mjs');
  const { normalizeModelKey } = await import(LEDGER_URL);

  const block = gateSrc.slice(gateSrc.indexOf('const SCRIPT_MODEL'));
  const gateKeys = new Set([...block.matchAll(/:\s*'([a-z0-9][\w.-]*)',/g)].map((m) => m[1]));
  assert.ok(gateKeys.size > 5, `instrument: only ${gateKeys.size} SCRIPT_MODEL values parsed`);

  const PAIRS = Object.values(PROVIDERS).map((p) => [normalizeModelKey(p.model), p.model]);
  assert.ok(PAIRS.length >= 3, 'instrument: providers.mjs yielded too few seats');
  for (const [gateKey, writerId] of PAIRS) {
    assert.ok(gateKeys.has(gateKey),
      `${writerId} normalises to "${gateKey}", which the gate never reserves under — its holds can never settle`);
  }

  for (const [gateKey, writerId] of PAIRS) {
    const { dir, mod } = await freshLedger();
    mod.reserveSpend({ model: gateKey, topic: 't', usd: 0.5 });
    mod.recordSpend({ model: writerId, topic: 't', usd: 0.1 });
    assert.ok(Math.abs(mod.spentOnTopic('t') - 0.1) < 1e-9,
      `${gateKey} vs ${writerId}: hold not settled (got $${mod.spentOnTopic('t')})`);
    rmSync(dir, { recursive: true, force: true });
  }
});

test('LIFECYCLE: in-flight drains to zero after the settle', async () => {
  // GLM 5.3 MISSED: "no lifecycle test that in-flight totals drain to zero after a
  // settle — a leak test for the hold itself." Distinct from the test above, which
  // pins the TOTAL: this one pins that nothing is left holding budget. A hold that
  // survives its own settlement leaks silently until TTL, and the total only reveals
  // it while the real row happens to be smaller.
  const { dir, mod } = await freshLedger();
  const res = join(dir, 'reservations.jsonl');
  mod.reserveSpend({ model: 'kimi-k3', topic: 'x', usd: 0.31 });
  mod.recordSpend({ model: 'moonshotai/kimi-k3', topic: 'x', usd: 0.31 });
  // Subtract the settled row: whatever remains is in-flight.
  const settled = mod.readLedger().reduce((s, e) => s + Number(e.usd || 0), 0);
  assert.ok(Math.abs((mod.spentOnTopic('x') - settled)) < 1e-9,
    'in-flight must be zero once the call has settled');
  assert.ok(readFileSync(res, 'utf-8').includes('"kind":"release"'), 'control: a release was written');
  rmSync(dir, { recursive: true, force: true });
});

test('an ORPHAN release is discarded, not banked as a coupon for the next hold', async () => {
  // GLM 5.3 finding 2 / flash finding 4. The old fold counted every release first and
  // then walked the reserves, so a release could settle a hold appended AFTER it —
  // a coupon good for ten minutes. Sean running a consult by hand minted one every
  // time: no hook, so no reserve, but the shim still records.
  //
  // THIS TEST WAS VACUOUS ON ITS FIRST WRITING and mutation-testing caught it, not
  // reading. Its first version recorded the orphan into an EMPTY ledger dir, where
  // `releaseReservation` no-ops because reservations.jsonl does not exist yet — so no
  // orphan row was ever written and the fold was never exercised. Restoring the old
  // out-of-order fold produced ZERO reds while the assertion sat there looking
  // rigorous. Seventh vacuous test of this workstream, same signature every time: the
  // fixture never reaches the code it names. An unrelated hold below establishes the
  // file first, so the orphan actually lands.
  const { dir, mod } = await freshLedger();
  mod.reserveSpend({ model: 'grok-4.6', topic: 'other', usd: 0.11 });      // makes the file exist
  mod.recordSpend({ model: 'moonshotai/kimi-k3', topic: 'x', usd: 0.05 }); // release, no hold
  mod.reserveSpend({ model: 'kimi-k3', topic: 'x', usd: 0.31 });           // must NOT be eaten
  assert.ok(Math.abs(mod.spentOnTopic('x') - 0.36) < 1e-9,
    `the later hold was cancelled by an earlier orphan release (got $${mod.spentOnTopic('x')})`);
  rmSync(dir, { recursive: true, force: true });
});

test('a release settles by NONCE, never a concurrent caller’s hold', async () => {
  // The gate places holds before it decides, so a refusal has to give back exactly
  // its own. Without the nonce it would settle the oldest matching hold — which,
  // under parallel gates on the same seat and topic, is somebody else's live call.
  const { dir, mod } = await freshLedger();
  const mine = mod.reserveSpend({ model: 'kimi-k3', topic: 'x', usd: 0.31 });
  const theirs = mod.reserveSpend({ model: 'kimi-k3', topic: 'x', usd: 0.31 });
  assert.notEqual(mine, theirs, 'control: two holds get two nonces');

  mod.releaseReservation({ model: 'kimi-k3', topic: 'x', nonce: theirs });
  assert.ok(Math.abs(mod.spentOnTopic('x') - 0.31) < 1e-9, 'exactly one hold remains');

  // And the one remaining must be MINE: settling it must empty the file's live set.
  mod.releaseReservation({ model: 'kimi-k3', topic: 'x', nonce: mine });
  assert.equal(mod.spentOnTopic('x'), 0, 'the nonce settled a different hold than the one named');
  rmSync(dir, { recursive: true, force: true });
});

test('RESERVE-THEN-CHECK: a refused call does not keep holding the budget', async () => {
  // The hold is placed before the decision, so the refusal path must hand it back or
  // the guard slowly starves itself: every blocked attempt would leave $1.06 parked
  // for ten minutes, and the next honest call inherits a budget it never spent.
  const { dir, mod } = await freshLedger();
  const nonce = mod.reserveSpend({ model: 'claude-fable-5', topic: 'p', usd: 1.06 });
  const decision = mod.checkSpend({
    model: 'claude-fable-5', topic: 'p', worstCaseUsd: 1.06, selfHeld: true,
  });
  assert.equal(decision.allow, false, 'control: $1.06 breaches the $1.00 per-call cap');
  mod.releaseReservation({ model: 'claude-fable-5', topic: 'p', nonce });
  assert.equal(mod.spentOnTopic('p'), 0, 'a refusal must release the hold it placed');
  rmSync(dir, { recursive: true, force: true });
});

test('selfHeld does not double-count the caller against its own hold', async () => {
  // The whole risk of reserve-then-check: the totals now contain the caller's own
  // worst case, so adding `call` on top again would refuse honest calls at half the
  // real budget — the cry-wolf failure, arriving through the door opened to close a
  // race. $2.50 held, $2.50 asked, $3.00 topic cap: allowed once, refused if doubled.
  const { dir, mod } = await freshLedger();
  mod.reserveSpend({ model: 'kimi-k3', topic: 'p', usd: 0.90 });
  const d = mod.checkSpend({ model: 'kimi-k3', topic: 'p', worstCaseUsd: 0.90, selfHeld: true });
  assert.equal(d.allow, true, `own hold counted twice: topic read $${d.totals.topic}`);

  // And the opposite direction still works: a SECOND caller sees the first's hold.
  // Sized to actually breach — the first version of this assertion used $0.90 + $0.90
  // against a $3.00 topic cap and demanded a refusal the caps had no reason to give.
  // My expectation was wrong, not the code; a red for the wrong reason is exactly the
  // trap this file's own history records, so it is written down rather than quietly
  // retuned.
  const d2 = mod.checkSpend({ model: 'kimi-k3', topic: 'p', worstCaseUsd: 2.50, selfHeld: false });
  assert.equal(d2.allow, false, 'a second caller must see the first hold and be refused');
  rmSync(dir, { recursive: true, force: true });
});

test('the reported "already spent" figure excludes the caller’s own hold', async () => {
  // Cosmetic but load-bearing: the refusal text is what Sean reads to decide whether
  // to approve. Reserve-then-check puts the caller's own money inside the running
  // total, so a naive message would tell him $2.12 was already spent on a topic where
  // $1.06 was his pending request.
  const { dir, mod } = await freshLedger();
  mod.recordSpend({ model: 'anthropic/claude-fable-5', topic: 'p', usd: 2.50 });
  mod.reserveSpend({ model: 'claude-fable-5', topic: 'p', usd: 1.06 });
  const d = mod.checkSpend({ model: 'claude-fable-5', topic: 'p', worstCaseUsd: 1.06, selfHeld: true });
  assert.equal(d.allow, false);
  assert.match(d.breach, /already spent \$2\.50/, `misreported prior spend: ${d.breach}`);
  rmSync(dir, { recursive: true, force: true });
});

test('the gate never prices a seat CHEAPER than the seat’s own provider record', async () => {
  // Two price tables existed and disagreed by 2x for sol, unnoticed, because nothing
  // ever compared them: the gate's PRICES said $2.50/$15 while providers.mjs had
  // carried `priceVerified: '2026-07-17'` at $5/$30. A guard that under-counts by half
  // is worse than one that is incomplete — it reports a confident wrong number.
  //
  // Found by a parity test written for the RESERVATION key, which is the argument for
  // cross-table tests: careful reading of either file alone shows nothing, because
  // each is internally consistent. The assertion is one-directional — the gate may be
  // more pessimistic than the provider record (worst-case routing is a real reason),
  // never cheaper.
  const gateSrc = readFileSync(fileURLToPath(new URL('../hooks/spend-guard-gate.mjs', import.meta.url)), 'utf-8');
  const { PROVIDERS } = await import('../context-gateway/src/providers.mjs');

  const priceOf = (key) => {
    const m = gateSrc.match(new RegExp(`'${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}':\\s*\\[([\\d.]+),\\s*([\\d.]+)\\]`));
    return m ? [Number(m[1]), Number(m[2])] : null;
  };

  let checked = 0;
  for (const [seat, p] of Object.entries(PROVIDERS)) {
    const key = p.model.replace(/^[^/]+\//, '');
    const gate = priceOf(key);
    assert.ok(gate, `seat "${seat}" calls ${p.model} and the gate has no PRICES entry for "${key}"`);
    assert.ok(gate[0] >= p.priceInPerM,
      `${seat}: gate prices input at $${gate[0]}/M, provider record says $${p.priceInPerM}/M`);
    assert.ok(gate[1] >= p.priceOutPerM,
      `${seat}: gate prices output at $${gate[1]}/M, provider record says $${p.priceOutPerM}/M`);
    checked += 1;
  }
  // Instrument check: a regex that matched nothing would pass this loop silently.
  assert.ok(checked >= 3, `expected to check every provider, only reached ${checked}`);
});

test('a LOST used flag cannot buy a second redemption', async () => {
  // GLM 5.3-flash round-4 finding 10. Redemption required `!tokens[key].used`, and
  // that flag was set by rewriting the WHOLE tokens.json — an unlocked
  // read-modify-write of a shared object, on the money path. Two concurrent
  // redemptions of DIFFERENT keys can lose one `used: true` in the merge; a lost
  // flag plus a claim past the orphan window re-redeems the same approval.
  //
  // Simulated directly rather than raced for, the same reasoning as the
  // deterministic interleaving test: rewind tokens.json to `used: false` — exactly
  // what a lost write leaves behind — and age the claim past the reclaim window so
  // the orphan branch is reachable. That is the WHOLE failure, forced.
  //
  // MUTATION NOTE, because it is the inverse of the trap this file keeps recording.
  // There are TWO guards — the `!isSpent` precondition here and the `isSpent` check
  // inside claimToken — and disabling EITHER ONE leaves this test green, because the
  // other catches it. Only disabling BOTH turns it red. A single mutation reporting
  // zero reds therefore proves nothing about this test; it proves the layering works.
  // Worth writing down: "zero reds" has now meant three different things in this
  // workstream — a vacuous test, a mutation that never landed, and genuine defence in
  // depth — and they are indistinguishable from the number alone.
  const { dir, mod } = await freshLedger();
  const BREACH = { model: 'claude-fable-5', topic: 'p', worstCaseUsd: 4.00 };

  const first = mod.checkSpend(BREACH);
  assert.equal(first.allow, false, 'control: first ask is refused');
  assert.ok(first.token, 'control: a token is minted');

  const spent = mod.checkSpend({ ...BREACH, approvalToken: first.token });
  assert.equal(spent.allow, true, 'control: the second ask redeems');

  // The lost write, plus an aged claim.
  const tokensPath = join(dir, 'pending-approval.json');
  const store = JSON.parse(readFileSync(tokensPath, 'utf-8'));
  for (const k of Object.keys(store)) { store[k].used = false; delete store[k].usedAt; }
  writeFileSync(tokensPath, JSON.stringify(store, null, 2), 'utf-8');
  for (const f of readdirSync(dir)) {
    if (f.startsWith('claim-')) {
      const old = new Date(Date.now() - 10 * 60_000);
      utimesSync(join(dir, f), old, old);
    }
  }

  const again = mod.checkSpend({ ...BREACH, approvalToken: first.token });
  assert.equal(again.allow, false,
    'a token whose used-flag was lost redeemed a SECOND time — the store is authoritative again');
  rmSync(dir, { recursive: true, force: true });
});

test('an IN-FLIGHT redemption still names its own recovery path', async () => {
  // The "concurrent call — delete claim-<key>" message lost its only assertion when
  // the replay case moved out of the redemption branch. It is still REACHABLE, on the
  // one situation it was actually written for: a claim exists (a redemption is in
  // flight) and no spent-marker has been written yet. Leaving it uncovered would let
  // a stuck operator's only instructions rot silently — which is exactly the failure
  // the message exists to prevent.
  const { dir, mod } = await freshLedger();
  const BREACH = { model: 'claude-fable-5', topic: 'p', worstCaseUsd: 4.00 };
  const first = mod.checkSpend(BREACH);

  // Simulate a redemption in flight: a FRESH claim, no marker, token still unused.
  const store = JSON.parse(readFileSync(join(dir, 'pending-approval.json'), 'utf-8'));
  const key = Object.keys(store)[0];
  // Claims are keyed per TOKEN since 2026-08-27 (GLM 5.3 round-5 B3). A path built
  // the old way would create a decoy nobody consults, and the test would pass for the
  // wrong reason — which is exactly what happened to a sibling test in this batch:
  // it kept passing through the contract change and quietly went vacuous.
  writeFileSync(join(dir, `claim-${key}-${first.token}.json`), JSON.stringify({ inFlight: true }), 'utf-8');

  const blocked = mod.checkSpend({ ...BREACH, approvalToken: first.token });
  assert.equal(blocked.allow, false, 'a claim held by another caller must refuse');
  assert.match(blocked.reason, /concurrent call/, 'and must say it is a concurrency, not a spend');
  assert.match(blocked.reason, /delete .*claim-/, 'a refusal must name its own recovery path');
  rmSync(dir, { recursive: true, force: true });
});

test('a CRASHED holder is still distinguishable from a spent one', async () => {
  // The other half of the same mechanism, and the reason the marker exists rather
  // than the claim alone. A process that creates the claim and dies before spending
  // leaves an aged claim with NO marker — Sean's approval must still be redeemable,
  // or the guard bricks a legitimate token on a crash with no TTL and no override.
  //
  // THIS TEST WAS VACUOUS AS FIRST WRITTEN, and GLM 5.3-flash named it exactly when I
  // asked for an eighth. At the point it built the "claim", only the FIRST ask had
  // run — which mints a token and creates no claim file — so
  // `readdirSync(dir).find(f => f.startsWith('claim-')) || 'none'` wrote and aged a
  // junk file literally named `none`, and the retry then succeeded through the
  // ORDINARY path. Deleting the orphan-reclaim branch entirely left it green.
  //
  // Eighth of this workstream, signature unchanged: THE FIXTURE NEVER REACHES THE CODE
  // IT NAMES. The `|| 'none'` fallback is the tell — a default that silently converts
  // "the thing I need does not exist" into "carry on".
  //
  // Rebuilt to construct the claim at the real per-token path, and to ASSERT IT EXISTS
  // before ageing it. That instrument check is the one line that would have caught the
  // original.
  const { dir, mod } = await freshLedger();
  const BREACH = { model: 'claude-fable-5', topic: 'p', worstCaseUsd: 4.00 };
  const first = mod.checkSpend(BREACH);
  const key = Object.keys(JSON.parse(readFileSync(join(dir, 'pending-approval.json'), 'utf-8')))[0];

  // The crash: the claim was created, the process died before marking it spent.
  const claim = join(dir, `claim-${key}-${first.token}.json`);
  writeFileSync(claim, JSON.stringify({ crashed: true }), 'utf-8');
  assert.ok(existsSync(claim), 'instrument: the claim under test must actually exist');
  assert.ok(!readdirSync(dir).some((f) => f.startsWith('used-')),
    'instrument: a crashed holder leaves NO spent-marker — that is what distinguishes it');
  const old = new Date(Date.now() - 10 * 60_000);
  utimesSync(claim, old, old);

  const retry = mod.checkSpend({ ...BREACH, approvalToken: first.token });
  assert.equal(retry.allow, true,
    'an aged claim with no spent-marker is a crashed holder; the approval must still work');
  assert.ok(JSON.parse(readFileSync(claim, 'utf-8')).reclaimedOrphan,
    'and it must go through the RECLAIM branch, not around it');
  rmSync(dir, { recursive: true, force: true });
});

test('R5: the reclaim DELETES NOTHING — the race was in the unlink', async () => {
  // flash round-5 F1. `stat -> unlink -> create` is three operations and therefore not
  // atomic as a unit: racer B stats the AGED claim, is descheduled while racer A
  // completes its reclaim, then unlinks A's FRESH claim and creates its own. Both
  // proceed. The inline invariant "only one create can succeed" assumed both racers act
  // on the same file — and after A's unlink they do not.
  //
  // Asserted STRUCTURALLY rather than by racing, and deliberately so: the fix is that
  // the dangerous operation no longer exists, and forcing that interleaving reliably
  // needs instrumentation the production path should not carry. Exactly one process can
  // create generation N with O_EXCL; nothing is deleted, so there is no window to lose.
  const { dir, mod } = await freshLedger();
  const BREACH = { model: 'claude-fable-5', topic: 'p', worstCaseUsd: 4.00 };
  const first = mod.checkSpend(BREACH);
  const key = Object.keys(JSON.parse(readFileSync(join(dir, 'pending-approval.json'), 'utf-8')))[0];

  const claim = join(dir, `claim-${key}-${first.token}.json`);
  writeFileSync(claim, JSON.stringify({ crashed: true }), 'utf-8');
  const old = new Date(Date.now() - 10 * 60_000);
  utimesSync(claim, old, old);

  assert.equal(mod.checkSpend({ ...BREACH, approvalToken: first.token }).allow, true);
  assert.ok(existsSync(claim), 'the original claim must SURVIVE — deleting it is what was racy');
  assert.ok(readdirSync(dir).some((f) => f.includes('.gen1.')),
    'the win must be recorded as an exclusively-created next generation');
  rmSync(dir, { recursive: true, force: true });
});

test('R5: an approval that cannot be RECORDED as spent is refused', async () => {
  // GLM 5.3 round-5 F10. markSpent used to swallow its own failure: claim won, marker
  // write throws, sixty seconds pass, and the orphan reclaim hands the same approval
  // out again. The catch made it invisible.
  //
  // Forced by making the marker path unwritable — a directory where a file must go,
  // which is a real filesystem state and needs no monkey-patching of the module under
  // test. Failing CLOSED is the rare correct choice here: this is the last step before
  // money moves, and "the filesystem misbehaved" is not a reason to risk spending an
  // approval twice.
  const { dir, mod } = await freshLedger();
  const BREACH = { model: 'claude-fable-5', topic: 'p', worstCaseUsd: 4.00 };
  const first = mod.checkSpend(BREACH);
  const key = Object.keys(JSON.parse(readFileSync(join(dir, 'pending-approval.json'), 'utf-8')))[0];

  mkdirSync(join(dir, `used-${key}.json`), { recursive: true }); // a dir where a file must go
  const r = mod.checkSpend({ ...BREACH, approvalToken: first.token });
  assert.equal(r.allow, false, 'an unrecordable approval must not be honoured');
  assert.match(r.reason, /could not be recorded as spent/);
  rmSync(dir, { recursive: true, force: true });
});

test('R5: a SECOND approval cycle for the same breach still works', async () => {
  // GLM 5.3 round-5 B3 — a BRICK, and one my own round-4 fix created. The spent-marker
  // and the claim file were both keyed by model+topic+cost, and nothing deletes either.
  // So the next approval for the same breach — Fable on the same document, next day,
  // clean caps — minted a token and then refused to redeem it, forever, needing a
  // hand-deleted file the error message never named.
  //
  // Reproduced before fixing (cycle 2 redeem: allow=false), and this is the shape:
  // A CONTROL KEYED ON SOMETHING COARSER THAN THE THING IT PROTECTS WILL EVENTUALLY
  // DENY THE THING IT PROTECTS. The token is what gets spent, so the token is what the
  // marker records and what the claim path names.
  const { dir, mod } = await freshLedger();
  const BREACH = { model: 'claude-fable-5', topic: 'plan', worstCaseUsd: 1.06 };

  const c1 = mod.checkSpend(BREACH);
  assert.equal(mod.checkSpend({ ...BREACH, approvalToken: c1.token }).allow, true, 'cycle 1 redeems');

  const c2 = mod.checkSpend(BREACH);
  assert.ok(c2.token, 'cycle 2 mints a token');
  assert.notEqual(c2.token, c1.token, 'and it is a new one');
  assert.equal(mod.checkSpend({ ...BREACH, approvalToken: c2.token }).allow, true,
    'cycle 2 must redeem — a stale marker or claim from cycle 1 bricks every future approval');

  // Third cycle too: a brick that only appears on the Nth cycle is still a brick.
  const c3 = mod.checkSpend(BREACH);
  assert.equal(mod.checkSpend({ ...BREACH, approvalToken: c3.token }).allow, true, 'cycle 3 as well');
  rmSync(dir, { recursive: true, force: true });
});

test('R5: a spent token is dead by the MARKER, not by forgetfulness', async () => {
  // NINTH VACUOUS TEST, and GLM 5.3-flash named it (round-6 F2) when I asked for one.
  //
  // Its first version minted cycle 2 before replaying cycle 1's token — and cycle 2's
  // mint OVERWRITES `tokens[key]`, so the replay failed because the store no longer
  // held that token at all. Forgetfulness, not spentness. Proven by mutation:
  // `isSpent` forced to `false` left it GREEN while the sibling test went red. The
  // fixture encoded the assumption (a key-per-token store) that made it pass for the
  // wrong reason — the signature, unchanged, for the ninth time.
  //
  // Rewritten to exercise the mechanism that actually kills a token: the marker.
  const { dir, mod } = await freshLedger();
  const BREACH = { model: 'claude-fable-5', topic: 'plan', worstCaseUsd: 1.06 };
  const c1 = mod.checkSpend(BREACH);
  assert.equal(mod.checkSpend({ ...BREACH, approvalToken: c1.token }).allow, true, 'control: it redeems once');

  // The marker names the token that was spent — that is what "spent" IS.
  const marker = readdirSync(dir).find((f) => f.startsWith('used-'));
  assert.ok(marker, 'a redemption must leave a spent-marker');
  assert.equal(JSON.parse(readFileSync(join(dir, marker), 'utf-8')).token, c1.token,
    'the marker must name the token, or it cannot distinguish this approval from the next');

  // Replayed with NO intervening mint, so the store still holds it: this is the only
  // path that reaches `isSpent` with a live store entry, and it must refuse.
  const replay = mod.checkSpend({ ...BREACH, approvalToken: c1.token });
  assert.equal(replay.allow, false, 'a spent token must not redeem twice');
  assert.match(replay.reason, /already spent/, 'and must say WHY, not fall through to a generic refusal');

  // KNOWN GAP, recorded rather than implied (flash round-6 F3): the token store is
  // keyed per BREACH, so minting a replacement erases the record of its predecessor.
  // Behaviour stays correct — the successor is refused and re-minted — but the store
  // cannot answer "was THIS token spent" once superseded, and the audit trail for a
  // superseded token lives only in its claim and marker files. Keying the store per
  // token, as the claims already are, is the fix; it is its own slice.
  rmSync(dir, { recursive: true, force: true });
});

test('normalizeModelKey folds vendor prefixes and case, and nothing else', async () => {
  const { dir, mod } = await freshLedger();
  const n = mod.normalizeModelKey;
  assert.equal(n('anthropic/claude-fable-5'), 'claude-fable-5');
  assert.equal(n('claude-fable-5'), 'claude-fable-5');
  assert.equal(n('  OpenAI/GPT-5.6-Sol  '), 'gpt-5.6-sol');
  // Only the FIRST segment is a vendor. A seat id that legitimately contains a slash
  // must not be flattened past recognition.
  assert.equal(n('a/b/c'), 'b/c');
  assert.equal(n(null), '');
  rmSync(dir, { recursive: true, force: true });
});

```

## A8 · scripts/hooks/spend-guard-gate.test.mjs  (1155 lines)

```javascript
#!/usr/bin/env node
/**
 * spend-guard-gate.test.mjs — the money guard's first test file (SWA-218).
 * =========================================================================
 * WHY THIS EXISTS, AND WHY IT IS THE DELIVERABLE
 * ----------------------------------------------
 * `scripts/lib/spend-ledger.test.mjs` already proved the CAP — the arithmetic, the
 * topic normalizer, the two-ask token. Nothing proved the PIPE that feeds it. The
 * gate's own header catalogues three separate corruptions of its `INVOCATION` regex,
 * ending with the line "a regex that silently never matches is the worst possible
 * failure for a guard" — and then a fourth corruption sat in that exact line, unfound,
 * because there was no test.
 *
 * The fourth was `[ ;&|(]` as the leading context: no quote characters, so
 * `sh -c "node scripts/consult-fable.mjs"` was never matched. It was found by copying
 * the regex into fable-remit-gate.mjs and attacking the copy. Fixing the regex without
 * writing this file would just reset the clock on a fifth.
 *
 * WHY BLACK BOX, NOT A REFACTOR-AND-UNIT-TEST
 * -------------------------------------------
 * The tempting move is to extract a pure `decide()` and unit-test that. Rejected: it
 * changes a live money guard, and then the tests validate the refactor rather than the
 * behaviour that has been running. These tests spawn the REAL hook with a REAL hook
 * payload and assert the REAL exit code, so they cover stdin parsing, the ALLOW
 * short-circuits, the pricing maths, and the Claude Code PreToolUse contract
 * (0 = allow, 2 = block) — all things an extracted function would no longer see.
 *
 * LEDGER ISOLATION
 * ----------------
 * The blocking path mints a token and reads cumulative totals. Every spawn here points
 * `SWAN_SPEND_DIR` at a throwaway directory, so Sean's real spend state is never read
 * or written. See the note on SPEND_DIR in scripts/lib/spend-ledger.mjs for why that
 * override is not itself a bypass.
 *
 * Run: node scripts/hooks/spend-guard-gate.test.mjs
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GATE = join(HERE, 'spend-guard-gate.mjs');

const ALLOW = 0;
const BLOCK = 2;

let sandbox;
before(() => { sandbox = mkdtempSync(join(tmpdir(), 'swan-spend-gate-')); });
after(() => { try { rmSync(sandbox, { recursive: true, force: true }); } catch { /* best effort */ } });

/**
 * Run the real gate against a real hook payload.
 * Each call gets a FRESH ledger dir, so cumulative state from one case can never
 * leak into another and turn a green suite red in a different order.
 */
function runGate(command, { ledger = null } = {}) {
  const dir = ledger || mkdtempSync(join(sandbox, 'run-'));
  const res = spawnSync(process.execPath, [GATE], {
    input: JSON.stringify({ tool_input: { command } }),
    env: { ...process.env, SWAN_SPEND_DIR: dir },
    encoding: 'utf-8',
  });
  return { code: res.status, stderr: res.stderr || '', dir };
}

/**
 * Read the minted token from the operator note, NOT from stderr.
 *
 * GLM 5.3 round-3 blocker 2: the refusal used to print the token into output the
 * AGENT reads, so the two-ask protocol bound nothing. It now goes to a file for Sean.
 * These tests changed with it — and reading it here is exactly the deliberate,
 * greppable act the refusal warns an agent not to perform.
 */
function tokenFrom(dir) {
  const note = join(dir, 'PENDING-SPEND-APPROVAL.txt');
  if (!existsSync(note)) return undefined;
  return (readFileSync(note, 'utf-8').match(/SWAN_SPEND_APPROVE=([a-f0-9]{12})/) || [])[1];
}

/**
 * Seed a ledger directory with prior spend, to drive the cumulative caps.
 *
 * The timestamp field is `ts`, matching what `recordSpend()` writes. An earlier
 * draft of this helper used `at`, and the cumulative test still passed — because
 * `spentOnTopic()` filters on `topic` alone and never looks at the date, while only
 * `spentToday()` reads `ts`. A test that passes with a misspelled field is a test
 * proving something other than what it claims, so the name is asserted below.
 */
function seedLedger(entries) {
  const dir = mkdtempSync(join(sandbox, 'seeded-'));
  mkdirSync(dir, { recursive: true });
  const rows = entries.map((e) => {
    assert.ok(e.ts, 'ledger rows are keyed on `ts` — see recordSpend()');
    return JSON.stringify(e);
  });
  writeFileSync(join(dir, 'ledger.jsonl'), rows.join('\n') + '\n', 'utf-8');
  return dir;
}

// A Fable call with no flags: 26k in at $10/M + 16k out at $50/M = $1.06 > the $1.00
// per-call cap. This is the canonical BLOCK fixture the rest of the suite leans on.
const FABLE = 'node scripts/consult-fable.mjs --document plan.md';

// ---------------------------------------------------------------------------
// 1. The regression this file was written for (SWA-218)
// ---------------------------------------------------------------------------

test('SWA-218: sh -c quote-wrapping is gated', () => {
  // A QUOTE before `node`. The old [ ;&|(] class did not contain one, so this
  // sailed through and billed in full.
  assert.equal(runGate(`sh -c "${FABLE}"`).code, BLOCK);
});

test('SWA-218: bash -lc quote-wrapping is gated', () => {
  assert.equal(runGate(`bash -lc '${FABLE}'`).code, BLOCK);
});

test('SWA-218: command substitution is gated', () => {
  assert.equal(runGate(`echo $(${FABLE})`).code, BLOCK);
});

test('SWA-218: a newline-separated invocation is gated', () => {
  assert.equal(runGate(`cd /repo\n${FABLE}`).code, BLOCK);
});

test('SWA-218: a tab before the interpreter is gated', () => {
  assert.equal(runGate(`cd /repo &&\t${FABLE}`).code, BLOCK);
});

test('SWA-218: an absolute interpreter path is gated', () => {
  assert.equal(runGate('/usr/bin/node scripts/consult-fable.mjs --document plan.md').code, BLOCK);
});

test('SWA-218: a PIPE inside a quoted argument before the path does not hide the call', () => {
  // Found by attacking the FIXED regex. The middle segment was a bare [^|;&]*?, which
  // could not cross a boundary character even inside quotes. Not academic: this repo's
  // own review templates tell agents to pass remits containing "APPROVE | REVISE | REJECT".
  assert.equal(runGate(`node --require "a|b" scripts/consult-fable.mjs --document plan.md`).code, BLOCK);
});

test('SWA-218: a SEMICOLON inside a quoted argument before the path does not hide the call', () => {
  assert.equal(runGate(`node --require "a;b" scripts/consult-fable.mjs --document plan.md`).code, BLOCK);
});

test('SWA-218: an AMPERSAND inside a quoted argument before the path does not hide the call', () => {
  assert.equal(runGate(`node --require "a&b" scripts/consult-fable.mjs --document plan.md`).code, BLOCK);
});

test('BOUNDARY: an invocation and an unrelated MENTION in two commands still does not match', () => {
  // This is what the [^|;&] exclusion is FOR, and quoted-span support must not lose it.
  assert.equal(runGate('node build.mjs | grep scripts/consult-fable.mjs').code, ALLOW);
  assert.equal(runGate('node build.mjs ; cat scripts/consult-fable.mjs').code, ALLOW);
  assert.equal(runGate('node build.mjs && cat scripts/consult-fable.mjs').code, ALLOW);
});

test('BOUNDARY: a real invocation in the SECOND command is still caught', () => {
  assert.equal(runGate('node build.mjs | node scripts/consult-fable.mjs').code, BLOCK);
});

// --- interpreter shapes (GLM 5.3 blocker 2, GLM 5.3-flash blocker 1) ---------

test('a TAB after the runner is gated', () => {
  // bash's IFS splits on tab; the separator was a literal U+0020. Fixed with a
  // negated identifier class, NOT a literal tab — an invisible character in a guard
  // regex is the same failure as the backslash-b that became 0x08.
  assert.equal(runGate('node\tscripts/consult-fable.mjs --document plan.md').code, BLOCK);
});

test('bunx, tsx and ts-node are gated', () => {
  assert.equal(runGate('bunx tsx scripts/consult-fable.mjs --document plan.md').code, BLOCK);
  assert.equal(runGate('tsx scripts/consult-fable.mjs --document plan.md').code, BLOCK);
  assert.equal(runGate('ts-node scripts/consult-fable.mjs --document plan.md').code, BLOCK);
});

test('an UNRECOGNISED head carrying a seat now blocks — the fail-closed inversion', () => {
  // CONTRACT CHANGED in round 5, deliberately, and both halves of this test changed
  // with it. Stated rather than quietly retuned.
  //
  // `nodejs` used to assert ALLOW as a false-positive guard. That was WRONG about the
  // world: `nodejs` is a real node binary (Debian/Ubuntu ship it under that name), so
  // the test enshrined a genuine hole as a requirement. It is a RUNNER now, and this
  // asserts the block. A cry-wolf test is still a claim, and a false claim in a test
  // is load-bearing in the worst way — it defends the bug.
  assert.equal(runGate('nodejs scripts/consult-fable.mjs --document x').code, BLOCK,
    'nodejs really is node, and really does bill');

  // `node-foo` is genuinely unknown, and under the round-5 inversion an unknown head
  // carrying a script-shaped token blocks as unattributable rather than passing as
  // unseen. Both review seats named that inversion as the single highest-value change,
  // because every "I cannot model this" path used to mean ALLOW. The price is exactly
  // this: a false block, and a one-line addition to INERT_HEADS if the head is really
  // inert. That direction is affordable; the other one was not.
  assert.equal(runGate('node-foo scripts/consult-fable.mjs --document x').code, BLOCK,
    'an unknown head carrying a seat is an execution the gate cannot attribute');
});

test('a mention that includes the runner word is NO LONGER a false positive', () => {
  // This test used to assert BLOCK and called it an accepted trade: the guard fails
  // open, so a miss costs money silently while a false positive costs one retry, and
  // narrowing the regex would have reopened the SWA-218 miss. That reasoning was
  // sound FOR A REGEX. Parsing removes the dilemma — `git grep "node …"` is a git
  // command with one quoted argument, and no amount of text inside that argument
  // makes git spend money.
  //
  // Worth naming: the trade-off I documented as unavoidable was an artefact of the
  // tool, not of the problem.
  assert.equal(runGate('git grep -n "node scripts/consult-fable.mjs" docs').code, ALLOW);
  assert.equal(runGate('echo node scripts/consult-fable.mjs').code, ALLOW);
  // And the real call in the same shape still blocks:
  assert.equal(runGate('node scripts/consult-fable.mjs --document plan.md').code, BLOCK);
});


test('SWA-218: a word merely ENDING in node is not the node binary', () => {
  // The runner test still holds — `mynode` is NOT treated as node, so the line is not
  // priced as a Fable call. What changed in round 5 is the disposition of a head the
  // parser does not recognise AT ALL: it blocks as unattributable instead of passing.
  // Those are different claims, and only the second one moved.
  const r = runGate('mynode scripts/consult-fable.mjs --document plan.md');
  assert.equal(r.code, BLOCK, 'unrecognised head carrying a seat: blocked, not priced');
  assert.match(r.stderr, /cannot read/, 'and blocked as UNREADABLE, not as a $1.06 Fable call');
  assert.doesNotMatch(r.stderr, /worst case/, 'no price is invented for a command nobody can attribute');

  // The inert head beside it stays quiet, which is what keeps the rule affordable.
  assert.equal(runGate('cat scripts/consult-fable.mjs').code, ALLOW);
  assert.equal(runGate('grep -n x scripts/consult-fable.mjs').code, ALLOW);
});

// ---------------------------------------------------------------------------
// 2. Invocation vs. mention — false positives train people to route around guards
// ---------------------------------------------------------------------------

test('grepping the script is not an invocation', () => {
  assert.equal(runGate('grep -n INVOCATION scripts/consult-fable.mjs').code, ALLOW);
});

test('cat-ing the script is not an invocation', () => {
  assert.equal(runGate('cat scripts/consult-fable.mjs').code, ALLOW);
});

test('git log over the script is not an invocation', () => {
  assert.equal(runGate('git log --oneline scripts/consult-fable.mjs').code, ALLOW);
});

test('an unrelated command passes', () => {
  assert.equal(runGate('npm run build').code, ALLOW);
});

test('an empty command passes', () => {
  assert.equal(runGate('').code, ALLOW);
});

test('a free seat is allowed — but now BY DECLARATION, not by being unrecognised', () => {
  // Behaviour change, deliberate (SWA-218). This used to assert consult-ox.mjs, which
  // does not exist on main — it "passed" only because the narrow matcher ignored it,
  // which is indistinguishable from a paid seat the matcher also ignored. That
  // indistinguishability WAS the bug.
  //
  // Now every consult-* matches, and a seat passes only because someone wrote down
  // why in FREE_ALLOWLIST. consult-gemini.mjs is free-tier and really is on that list.
  assert.equal(runGate('node scripts/consult-gemini.mjs --document plan.md').code, ALLOW);
});

test('a seat that is neither priced nor declared is REFUSED, not waved through', () => {
  // The inversion's whole point, and the test that proves it is not cosmetic.
  const r = runGate('node scripts/consult-brandnewseat.mjs --document plan.md');
  assert.equal(r.code, BLOCK);
  assert.match(r.stderr, /is not priced/);
  assert.match(r.stderr, /paid-seats\.mjs/, 'the refusal must name where to fix it');
  assert.doesNotMatch(r.stderr, /SWAN_SPEND_APPROVE/, 'classification refusals mint no token');
});

test('malformed stdin fails OPEN — a guard bug must never brick the toolchain', () => {
  const res = spawnSync(process.execPath, [GATE], {
    input: 'not json at all',
    env: { ...process.env, SWAN_SPEND_DIR: sandbox },
    encoding: 'utf-8',
  });
  assert.equal(res.status, ALLOW);
});

// ---------------------------------------------------------------------------
// 3. The documented bypasses in the gate's own header — a caller-supplied value
//    may RAISE the estimate, never lower it
// ---------------------------------------------------------------------------

test('BYPASS (header-documented): a cheaper SWAN_*MODEL override does not lower the estimate', () => {
  // consult-fable.mjs does not even read SWAN_FABLE_MODEL, so the real call would
  // still run Fable at $10/M while the gate priced it as flash.
  const r = runGate('SWAN_FABLE_MODEL=deepseek-v4-flash node scripts/consult-fable.mjs --document plan.md');
  assert.equal(r.code, BLOCK);
});

test('BYPASS (header-documented): a cheaper --model override does not lower the estimate', () => {
  assert.equal(runGate(`${FABLE} --model deepseek-v4-flash`).code, BLOCK);
});

test('BYPASS (header-documented): --max-tokens below the script default does not lower the estimate', () => {
  // consult-fable.mjs does not accept --max-tokens; the real call uses its own 16k.
  assert.equal(runGate(`${FABLE} --max-tokens 500`).code, BLOCK);
});

test('a LARGER --max-tokens RAISES a passing call into a breach', () => {
  // GLM 5.3 blocker 1: the old version of this test used FABLE, which already
  // breaches at the 16k default ($1.06 > $1.00). Deleting the --max-tokens maths
  // entirely left it green, so it could not detect any regression in the raise-only
  // clause. Sol is the shape that makes the raise legible: ~$0.31 at the default,
  // over cap once a bigger ceiling is declared.
  const SOL = 'node scripts/consult-sol.mjs --document plan.md';
  assert.equal(runGate(SOL).code, ALLOW, 'sol at the default must pass, or this proves nothing');
  assert.equal(runGate(`${SOL} --max-tokens 64000`).code, BLOCK, 'a declared ceiling must raise');
});

test('EQUALS FORM: --max-tokens=N is read like --max-tokens N', () => {
  const SOL = 'node scripts/consult-sol.mjs --document plan.md';
  assert.equal(runGate(`${SOL} --max-tokens=64000`).code, BLOCK);
});

test('EQUALS FORM: --document=X still resolves the topic (GLM finding 3)', () => {
  // With the equals form unparsed, topic fell back to `untitled`, so the per-topic
  // cap silently never accumulated for that document. Seed `plan` and prove the
  // equals form lands on the same key the bare form does.
  const today = new Date().toISOString();
  const dir = seedLedger([{ ts: today, model: 'gpt-5.6-sol-pro', topic: 'plan', usd: 2.9 }]);
  const r = runGate('node scripts/consult-sol.mjs --document=plan.md', { ledger: dir });
  assert.equal(r.code, BLOCK, 'the equals form must hit the same topic bucket');
  assert.match(r.stderr, /topic\s+plan/);
});

test('a longer flag with the same prefix is not misread', () => {
  // `--max` must not swallow `--max-tokens`.
  const SOL = 'node scripts/consult-sol.mjs --document plan.md --max-tokens 64000';
  assert.equal(runGate(SOL).code, BLOCK);
});

test('an unpriced script is still not GUESSED at — it is refused instead', () => {
  // This test used to assert ALLOW, pinning the fail-open as contract. GLM 5.3
  // finding 4 named exactly that: the suite "proves and blesses" the hole.
  //
  // The half that was right survives: the gate must not invent a price, because a
  // wrong number silently UNDER-counts the caps. The conclusion was the bug — not
  // knowing the cost is a reason to stop and ask, never a reason to proceed.
  const r = runGate('node scripts/consult-newseat.mjs --document plan.md');
  assert.equal(r.code, BLOCK);
  assert.doesNotMatch(r.stderr, /\$\d/, 'it must not print an invented number');
});

// ---------------------------------------------------------------------------
// 4. The deliberate ALLOW short-circuits
// ---------------------------------------------------------------------------

const PANEL = 'node scripts/consult-openrouter-panel.mjs';

test('--dry-run passes ONLY for the script that implements it', () => {
  // Behaviour change, deliberate. The gate used to honor --dry-run unconditionally.
  // Verified 2026-08-27: only consult-openrouter-panel.mjs implements the flag, so
  // appending it to a Fable call made the gate stand down while the script ignored
  // the unknown flag and billed in full — the same class as the documented
  // `--max-tokens 500` bypass, still live in a different branch.
  assert.equal(runGate(`${PANEL} --document plan.md --dry-run`).code, ALLOW, 'the panel really has a dry run');
  assert.equal(runGate(`${FABLE} --dry-run`).code, BLOCK, 'Fable has no dry run; the flag must not excuse it');
});

test('the panel without --confirm-spend passes — it refuses the live call itself', () => {
  // FIFTH vacuous test, found by mutation-testing my own suite rather than by
  // inspection: deleting the `PANEL_SCRIPTS && !--confirm-spend` short-circuit
  // produced ZERO reds. The old version used `--seats kimi,sol` (~$0.63), which is
  // under the cap — so it ALLOWed whether the short-circuit existed or not. Same
  // signature as the other four: the expected value is also the buggy output.
  //
  // EXPENSIVE seats make the branch the only thing that can produce ALLOW. Without
  // the short-circuit these price at ~$1.68 and block.
  assert.equal(runGate(`${PANEL} --seats fable,sol,kimi --document plan.md`).code, ALLOW,
    'no --confirm-spend means no live call, so the gate must stand aside');
  assert.equal(runGate(`${PANEL} --seats fable,sol,kimi --document plan.md --confirm-spend`).code, BLOCK,
    'and the SAME seats must block once the call is real — the control for the line above');
});

test('the panel WITH --confirm-spend is priced by the seats actually requested', () => {
  const cheap = runGate(`${PANEL} --seats glm,gemini --document plan.md --confirm-spend`);
  assert.equal(cheap.code, ALLOW, 'a free fan-out must not be flat-rated at the roster worst case');
});

test('the panel WITH --confirm-spend blocks when the requested seats are expensive', () => {
  assert.equal(runGate(`${PANEL} --seats fable,sol,kimi --document plan.md --confirm-spend`).code, BLOCK);
});

// ---------------------------------------------------------------------------
// 5. The cap boundary — cheaper seats pass, expensive ones do not
// ---------------------------------------------------------------------------

test('a cheaper override does NOT lower a breaching call below the cap', () => {
  // GLM 5.3 blocker 1 killed the previous version of this test: it used
  // consult-grok.mjs (which does not exist on main) and grok's DEFAULT price is
  // already under cap, so it passed identically whether override parsing worked,
  // was deleted, or was inverted. It proved nothing about raise-only pricing.
  //
  // Fable breaches at its default, so naming a cheap model must not rescue it.
  assert.equal(runGate(`SWAN_FABLE_MODEL=deepseek-v4-flash ${FABLE}`).code, BLOCK);
  assert.equal(runGate(`${FABLE} --model=deepseek-v4-flash`).code, BLOCK, 'equals form too');
});

test('an EXPENSIVE override RAISES a passing call into a breach', () => {
  // Caught by red-testing my own replacement for GLM's vacuous test — and it was
  // vacuous the same way: Fable blocks at its default, so a cheap override cannot
  // change the verdict and the assertion proves nothing about override parsing.
  //
  // Overrides only ever RAISE, so the single shape that can detect a regression is a
  // cheap script pushed over the cap by an expensive override. Sol is ~$0.31 alone;
  // priced as Fable it is ~$1.06 and must block.
  const SOL = 'node scripts/consult-sol.mjs --document plan.md';
  assert.equal(runGate(SOL).code, ALLOW, 'the control: sol alone must pass');
  assert.equal(runGate(`SWAN_SOL_MODEL=claude-fable-5 ${SOL}`).code, BLOCK, 'env override must raise');
  assert.equal(runGate(`${SOL} --model claude-fable-5`).code, BLOCK, 'flag override must raise');
  assert.equal(runGate(`${SOL} --model=claude-fable-5`).code, BLOCK, 'equals form must raise');
});

// --- seats priced 2026-08-27 from OpenRouter's per-endpoint API ---------------
//
// Before pricing these were KNOWN_UNGATED, and after the inversion an unpriced seat
// BLOCKS. So "it passes" is itself the proof the price landed — an unpriced codex
// call would be refused with "is not priced". The second test proves the number is
// actually used in arithmetic rather than merely present.

test('the newly priced seats are recognised, not refused as unclassified', () => {
  for (const s of [
    'consult-codex.mjs', 'consult-codex-via-openrouter.mjs', 'consult-codex-impl-review.mjs',
    'consult-codex-v1-1-review.mjs', 'consult-codex-v1-2-review.mjs',
    'consult-opus5.mjs', 'consult-hy3-design.mjs',
  ]) {
    const r = runGate(`node scripts/${s} --document plan.md`);
    assert.equal(r.code, ALLOW, `${s} should price under the per-call cap on a clean ledger`);
    assert.doesNotMatch(r.stderr, /is not priced/, `${s} must not fall through as unclassified`);
  }
});

test('a priced codex call now COUNTS toward the cumulative topic cap', () => {
  // The arithmetic proof. gpt-5.5 at [5.5, 33] estimates ~$0.67 for the standard
  // 26k-in/16k-out packet — comfortably under the $1.00 per-call cap, which is why
  // the test above passes. Seed the topic near its $3.00 ceiling and that same $0.67
  // must tip it over. If the price were absent or zero, this would not block.
  const today = new Date().toISOString();
  const dir = seedLedger([{ ts: today, model: 'gpt-5.5', topic: 'plan', usd: 2.6 }]);
  const r = runGate('node scripts/consult-codex.mjs --document plan.md', { ledger: dir });
  assert.equal(r.code, BLOCK, 'a priced seat must accumulate against the topic cap');
  assert.match(r.stderr, /spent on topic/);
});

test('every forge image probe is MATCHED and priced, not invisible', () => {
  // Rewritten after red-testing caught it vacuous. The first version asserted ALLOW
  // on a clean ledger — which is exactly what an UNMATCHED script also produces, so
  // it passed whether the `forge-` prefix existed or not. That is the third time this
  // session a test has certified the hole it was written to close; the tell is always
  // the same, an assertion whose expected value is the buggy behaviour's output too.
  //
  // Exhausting the day cap makes the two states distinguishable: a matched, priced
  // script REFUSES, an unmatched one still sails through.
  const today = new Date().toISOString();
  for (const s of [
    'forge-capture-fixtures.mjs', 'forge-i2i-influence.mjs',
    'forge-i2i-probe.mjs', 'forge-response-shape.mjs',
  ]) {
    const dir = seedLedger([{ ts: today, model: 'other', topic: 'other', usd: 4.9 }]);
    const r = runGate(`node scripts/${s}`, { ledger: dir });
    assert.equal(r.code, BLOCK, `${s} must be matched and priced, not waved through`);
    assert.doesNotMatch(r.stderr, /is not priced/, `${s} must be PRICED, not refused as unclassified`);
  }
});

test('a forge probe still passes on a clean ledger — priced, not banned', () => {
  // The control for the test above: proving it blocks when the budget is gone means
  // nothing unless it also proves it works when the budget is there.
  assert.equal(runGate('node scripts/forge-i2i-probe.mjs').code, ALLOW);
});

test('a forge run COUNTS toward the daily cap', () => {
  // Arithmetic proof that the image price is used, not merely present. These probes
  // take no --document, so they land on topic "untitled" — the DAY cap is the one
  // that has to catch them.
  const today = new Date().toISOString();
  const dir = seedLedger([{ ts: today, model: 'other', topic: 'somethingelse', usd: 4.8 }]);
  const r = runGate('node scripts/forge-i2i-probe.mjs', { ledger: dir });
  assert.equal(r.code, BLOCK, 'an untitled-topic paid run must still hit the daily cap');
});

// --- the name must belong to the RUNNER, not to the string --------------------

test('BYPASS: a free-seat MENTION cannot launder a paid call', () => {
  // Live bypass, found by attacking scriptNameFrom and confirmed end-to-end through
  // the real gate before it was fixed. `scriptNameFrom` took the FIRST script name
  // anywhere in the command, so a `cat` of a free seat renamed the paid call that
  // followed it: matched (a Fable call really is there), resolved to consult-gemini,
  // hit FREE_ALLOWLIST, exit 0. Uncapped Fable behind a `cat`.
  const r = runGate('cat scripts/consult-gemini.mjs && node scripts/consult-fable.mjs --document plan.md');
  assert.equal(r.code, BLOCK, 'the seat name must come from the invocation, not the string');
});

test('BYPASS: a free-seat name in a redirect target cannot launder a paid call', () => {
  assert.equal(
    runGate('node scripts/consult-fable.mjs --document plan.md > out-consult-gemini.mjs.log').code,
    BLOCK,
  );
});

test('the converse holds: a paid name as an ARGUMENT does not tax a free call', () => {
  // The other direction matters just as much — resolving to the paid seat here would
  // price a free Gemini call as Fable and refuse honest work.
  assert.equal(
    runGate('node scripts/consult-gemini.mjs --document plan.md --seed scripts/consult-fable.mjs').code,
    ALLOW,
  );
});

// --- GLM 5.3 round-3 -----------------------------------------------------------

test('BLOCKER 4: two paid scripts in one line — the EXPENSIVE one is priced', () => {
  // Verified live at exit 0 before the fix. scriptNameFrom resolved the FIRST
  // invocation, the gate priced Kimi at ~$0.32, that fit inside the cap, and Fable's
  // ~$1.06 in the same Bash call was never priced, never asked about, never recorded.
  // This is the shape an agent batching consults writes with no intent to evade.
  assert.equal(
    runGate('node scripts/consult-kimi.mjs --document p.md && node scripts/consult-fable.mjs --document p.md').code,
    BLOCK,
  );
  // Order must not matter: expensive first is the same line.
  assert.equal(
    runGate('node scripts/consult-fable.mjs --document p.md && node scripts/consult-kimi.mjs --document p.md').code,
    BLOCK,
  );
});

test('a FREE seat in the line cannot become the one that gets priced', () => {
  // Free and frozen names are dropped before the max, so a free seat neither shelters
  // a paid one nor gets charged for standing next to it.
  assert.equal(
    runGate('node scripts/consult-gemini.mjs --document p.md && node scripts/consult-fable.mjs --document p.md').code,
    BLOCK,
  );
  assert.equal(
    runGate('node scripts/consult-gemini.mjs --document p.md && node scripts/consult-glm.mjs --document p.md').code,
    ALLOW,
  );
});

test('FINDING 1: node --check is a syntax check, not a run', () => {
  // The gate refused my own `node --check` of a consult file mid-repair. A guard that
  // blocks the verification step of its own fix teaches the operator to reach for
  // --no-verify, which is worse than the hole it is guarding.
  assert.equal(runGate('node --check scripts/consult-fable.mjs').code, ALLOW);
  assert.equal(runGate('node --version').code, ALLOW);
  // And the carve-out must not become a bypass word:
  assert.equal(runGate('node scripts/consult-fable.mjs --document plan.md').code, BLOCK);
});

// --- GLM 5.3-flash round-3: quoted data is not code, and N calls are not one ----

test('B1: an unknown seat cannot be priced by a caller-declared --model', () => {
  // Both seats found this (5.3 F3, flash B1) and it reproduced at exit 0. An unknown
  // seat has no default, so `--model deepseek-v4-flash` became its price — under the
  // cap, ALLOW — while the script bills at whatever it really calls and need not even
  // read the flag. The "believing a flag the target ignores" failure, reintroduced in
  // the one branch whose job is to refuse unknown seats.
  const r = runGate('node scripts/consult-mistral.mjs --document x.md --model deepseek-v4-flash');
  assert.equal(r.code, BLOCK);
  assert.match(r.stderr, /is not priced/);
});

test('B2: a flag inside quoted DATA does not excuse a paid call', () => {
  const PANEL = 'node scripts/consult-openrouter-panel.mjs --confirm-spend --seats fable,sol,kimi --document x.md';
  assert.equal(runGate(PANEL).code, BLOCK, 'control: the expensive fan-out blocks');
  assert.equal(runGate(`${PANEL} --remit "does it support --dry-run"`).code, BLOCK,
    'a --dry-run MENTION in a remit must not stand the gate down on a live fan-out');
  assert.equal(runGate(`${PANEL} --dry-run`).code, ALLOW,
    'but a REAL --dry-run on the script that implements it still passes');
});

test('B2: a quoted value is still READ — masking must not break honest flags', () => {
  // maskQuotedData pads with spaces so offsets survive: the flag is FOUND in masked
  // text, its value READ from the original. Blanking outright would send every
  // quoted --document to topic `untitled`, which is the cap-never-accumulates bug
  // this file already fixed once.
  const today = new Date().toISOString();
  const dir = seedLedger([{ ts: today, model: 'gpt-5.6-sol-pro', topic: 'plan', usd: 2.9 }]);
  const r = runGate('node scripts/consult-sol.mjs --document "plan.md"', { ledger: dir });
  assert.equal(r.code, BLOCK, 'a QUOTED --document must still resolve to its topic');
  assert.match(r.stderr, /topic\s+plan/);
});

test('B4: N invocations of the SAME script are SUMMED, not priced once', () => {
  // Round 2 fixed "two DIFFERENT paid scripts" with MAX. Max defends against a cheap
  // seat sheltering an expensive one and does nothing about the same seat called
  // repeatedly: three codex calls at ~$0.67 priced as one, ~$2.01 of exposure inside
  // a $1.00 cap. Reproduced at exit 0 before the fix.
  const one = 'node scripts/consult-codex.mjs --document a.md';
  assert.equal(runGate(one).code, ALLOW, 'control: one codex call is under cap');
  assert.equal(runGate(`${one} && ${one} && ${one}`).code, BLOCK, 'three are not');
});

test('F4: the gateway LIBRARY is not hard-blocked as an unpriced seat', () => {
  // Basenaming its path yielded `consult.mjs`, in no allowlist and no price table, so
  // the gate blocked a verified no-op and told the operator to price a library.
  const r = runGate('node scripts/context-gateway/src/consult.mjs --seat fable');
  assert.equal(r.code, ALLOW);
  assert.doesNotMatch(r.stderr, /is not priced/);
});

test('F5: a seat name inside a quoted ARGUMENT is data, not an invocation', () => {
  // This one blocked my own verification probe while I was checking B2.
  assert.equal(runGate('node scripts/format-docs.mjs --text "see scripts/consult-fable.mjs"').code, ALLOW);
  // And the shape that must still be caught, because it really is a command:
  assert.equal(runGate('sh -c "node scripts/consult-fable.mjs --document plan.md"').code, BLOCK);
});

// --- round 4: the parser rewrite ------------------------------------------------
//
// Round 4 found SIX live bypasses, FIVE of them created by my own fixes in rounds 2
// and 3. Every one had the same root: a flat regex has no notion of WHERE a token
// sits. These pin the classes that stopped existing when the gate started parsing
// commands instead of pattern-matching them.

test('R4: a parse-only flag counts only in the RUNNER position', () => {
  // `--check` means "do not execute" between the runner and the file. The carve-out
  // tested it line-globally, so appending it anywhere stood the whole gate down —
  // the third recurrence of this file's own "honoring a flag the target ignores"
  // class, reintroduced by the fix for the --check cry-wolf.
  assert.equal(runGate('node --check scripts/consult-fable.mjs').code, ALLOW, 'genuinely a syntax check');
  assert.equal(runGate(`${FABLE} --check`).code, BLOCK, 'trailing --check is an argument Fable ignores');
  assert.equal(runGate(`${FABLE} --version`).code, BLOCK, 'so is --version');
  assert.equal(runGate(`node --version && ${FABLE}`).code, BLOCK, 'and one in a DIFFERENT command is irrelevant');
});

test('R4: a real invocation inside quotes is found whatever precedes it', () => {
  // maskQuotedData kept a quoted span only if it STARTED with an interpreter, so
  // every ordinary prefix hid the call. `cd`, `exec`, `timeout` and friends are what
  // agent-written compound commands actually look like.
  assert.equal(runGate(`bash -c "cd /srv/app && ${FABLE}"`).code, BLOCK);
  assert.equal(runGate(`sh -c "exec ${FABLE}"`).code, BLOCK);
  assert.equal(runGate(`sh -c "timeout 600 ${FABLE}"`).code, BLOCK);
  assert.equal(runGate("bash -c 'cd scripts && node consult-fable.mjs --document x'").code, BLOCK);
});

test('R4: a quoted script PATH is still an invocation', () => {
  assert.equal(runGate('node "scripts/consult-fable.mjs" --document plan.md').code, BLOCK);
});

test('R4: direct shebang execution is gated', () => {
  // Previously listed as a KNOWN ungated shape because a regex keyed on the runner
  // token could not see it. Parsing gets it for free — argv[0] is the script.
  assert.equal(runGate('./scripts/consult-fable.mjs --document plan.md').code, BLOCK);
});

test('R4: a panel inside a compound line is priced at its fan-out, not $0', () => {
  // oneCallUsd returned 0 for the panel (no SCRIPT_MODEL entry) and priceOf returned
  // -1 so it could never win the max — a special case unreachable from the branch
  // that needed it. ~$1.68 of fan-out was riding on a ~$0.31 estimate.
  assert.equal(
    runGate('node scripts/consult-openrouter-panel.mjs --seats fable,sol --document x --confirm-spend && node scripts/consult-kimi.mjs --document y').code,
    BLOCK,
  );
});

test('R4: an UNPRICED seat cannot ride beside a priced one', () => {
  // GLM 5.3 B2. `priceOf` sorted unknowns to -1 so they never won the max, and
  // `oneCallUsd` scored them 0 — so "an unknown seat falls through to the unpriced
  // BLOCK" was false for every compound line, which is the batching case the
  // summing fix existed for.
  assert.equal(runGate('node scripts/consult-newseat.mjs --document a').code, BLOCK, 'control: alone');
  const r = runGate('node scripts/consult-kimi.mjs --document a && node scripts/consult-newseat.mjs --document b');
  assert.equal(r.code, BLOCK, 'and beside a priced seat');
  assert.match(r.stderr, /not priced/);
});

test('R4: a --model RAISE survives into a compound line', () => {
  // GLM 5.3-flash round-4 finding 6, reproduced by probe before fixing:
  //
  //   ... --model claude-fable-5                        -> exit 2 BLOCK
  //   ... --model claude-fable-5 && <a cheap second call> -> exit 0 ALLOW
  //
  // `oneCallUsd` reads SCRIPT_MODEL defaults only, so the raise the gate had already
  // computed was discarded in exactly the multi-call lines the summing fix was built
  // for. Appending a CHEAP call LOWERED the estimate of the expensive one, which is
  // the opposite of what summing is for and reachable by anyone under budget
  // pressure who has noticed that the single-call form blocks.
  const RAISE = 'node scripts/consult-kimi.mjs --document a --model claude-fable-5';
  assert.equal(runGate(RAISE).code, BLOCK, 'control: the raise blocks on its own');
  assert.equal(runGate(`${RAISE} && node scripts/consult-hy3-design.mjs --document b`).code, BLOCK,
    'a cheap sibling must not launder an expensive raise');
  // And the cry-wolf direction stays closed: the same compound WITHOUT the raise is
  // ~$0.47 and must still pass, or the fix would just be "block more".
  assert.equal(
    runGate('node scripts/consult-kimi.mjs --document a && node scripts/consult-hy3-design.mjs --document b').code,
    ALLOW,
    'the unraised compound is under every cap and must still run',
  );
});

test('R5: six shell shapes that hid a paid seat from the parser', () => {
  // Round 5. The parser closed the whole class of POSITION bugs and then had gaps of
  // its own in shell GRAMMAR — which is the honest cost of replacing a matcher: the
  // failure mode moves from "cannot express the rule" to "has not modelled the
  // language yet". Every one below was reproduced at exit 0 before it was fixed.
  //
  // GLM 5.3 B1 — `>` and `<` were ordinary characters, so a redirect TARGET ending in
  //   .mjs landed in the script slot and the runner loop stopped there.
  // GLM 5.3 B4 — a transparent wrapper's own flags ended the strip, orphaning the
  //   command entirely: argv[0] became `-oL` and the seat vanished.
  // flash B1 — the only backslash rule was line-continuation, so `consult\-fable.mjs`
  //   (which POSIX executes as the real file) tokenised WITH the backslash and failed
  //   SEAT_NAME. One character, one free Fable call.
  // flash B1 (sibling) — a QUOTED argv[0] is legal shell and executes; treating it as
  //   data skipped a real invocation.
  // flash B2 — a flag VALUE ending in .js/.mjs terminated the script scan:
  //   `node --require ./prelude.js <seat>` made prelude the script and the seat its argv.
  const HIDDEN = [
    ['redirect before the script', 'node >out.mjs scripts/consult-fable.mjs --document plan.md'],
    ['fd-prefixed redirect first', '2>err.mjs node scripts/consult-fable.mjs --document plan.md'],
    ['wrapper with its own flags', 'stdbuf -oL node scripts/consult-fable.mjs --document plan.md'],
    ['backslash escape in the path', 'node scripts/consult\\-fable.mjs --document plan.md'],
    ['quoted argv[0], direct exec', '"./scripts/consult-fable.mjs" --document plan.md'],
    ['--require value ending in .js', 'node --require ./prelude.js scripts/consult-fable.mjs --document plan.md'],
    ['--import value ending in .mjs', 'node --import ./setup.mjs scripts/consult-fable.mjs --document plan.md'],
  ];
  for (const [name, cmd] of HIDDEN) {
    assert.equal(runGate(cmd).code, BLOCK, `${name}: a Fable call slipped past the gate`);
  }
});

test('R5: an ordinary BOOLEAN node flag does not hide the seat behind it', () => {
  // My own fix for flash B2 was itself a bypass, found by mutation-testing minutes
  // after it landed. The rule "a script-shaped token preceded by a non-parse-only flag
  // is that flag's value" assumes EVERY flag takes a value — and boolean flags are
  // ordinary, so `node --trace-warnings <seat>` ran free.
  //
  // Seventh time in this workstream a fix opened the next hole, and the shape never
  // changes: a heuristic about which token is "the script" has to be right about a
  // language it is not parsing. The gate does not need that answer — it needs to know
  // whether a paid seat appears anywhere the runner would load it.
  for (const flag of ['--trace-warnings', '--enable-source-maps', '--no-warnings', '--foo']) {
    assert.equal(runGate(`node ${flag} scripts/consult-fable.mjs --document x`).code, BLOCK,
      `${flag} hid the seat behind it`);
  }
  // And a seat named as a LOADER value still bills, so it must still be gated.
  assert.equal(runGate('node --require scripts/consult-fable.mjs other.mjs').code, BLOCK,
    'a seat loaded via --require is loaded, and bills');
});

test('R5: `node -c` is parse-only, like `node --check`', () => {
  // flash round-5 F1. NON_EXECUTING_FLAGS held `-c-check` — a token no shell produces,
  // the wreckage of an earlier edit — while `-c`, node's real shorthand, was missing.
  // So a syntax check was priced at $1.06 and BLOCKED. This file records refusing my
  // own `node --check` mid-repair as the cry-wolf failure worse than a hole; the same
  // workflow one keystroke over still did it.
  assert.equal(runGate('node -c scripts/consult-fable.mjs').code, ALLOW, '-c must not be a paid call');
  assert.equal(runGate('node --check scripts/consult-fable.mjs').code, ALLOW, 'control: --check');
  // And the carve-out must not become a bypass: it only counts BEFORE the script.
  assert.equal(runGate('node scripts/consult-fable.mjs --document x -c').code, BLOCK,
    'a trailing -c is an argument the target ignores, not a parse-only run');
});

test('R5: a flag is read from the seat it is typed on, not the line', () => {
  // GLM 5.3 B2, both halves reproduced. Round 4 moved HOLDS to per-invocation and left
  // every FLAG line-global-first — half a migration, and the missing half is the half
  // that decides whether a fan-out is approved.
  //
  // Note the second case: this is flash's round-4 finding 6 SURVIVING ITS OWN FIX. The
  // fix read the override from the first seat's argv, and the regression test I wrote
  // for it happens to put the raise first. A test written from the same mental model
  // as the fix inherits the fix's blind spot.
  assert.equal(runGate(
    'node scripts/consult-gemini.mjs --document p && node scripts/consult-openrouter-panel.mjs --seats fable --document x --confirm-spend',
  ).code, BLOCK, 'confirm-spend on seat two: the panel short-circuit read gemini argv and allowed a live fan-out');

  assert.equal(runGate(
    'node scripts/consult-hy3-design.mjs --document b && node scripts/consult-kimi.mjs --document a --model claude-fable-5',
  ).code, BLOCK, 'a --model raise on seat two must be seen');

  // Both cry-wolf directions stay closed.
  assert.equal(runGate(
    'node scripts/consult-gemini.mjs --document p && node scripts/consult-openrouter-panel.mjs --seats fable --document x',
  ).code, ALLOW, 'without --confirm-spend the panel still refuses itself; gating early is cry-wolf');
  assert.equal(runGate(
    'node scripts/consult-kimi.mjs --document a && node scripts/consult-hy3-design.mjs --document b',
  ).code, ALLOW, 'an unraised cheap compound must still run');
});

test('R5: what the parser cannot attribute BLOCKS, and says so', () => {
  // The ONE THING both review seats named independently: every "I cannot model this
  // line" path used to mean ALLOW. All four were reproduced running a live Fable call
  // at exit 0. A parser whose ignorance spends money is fail-open, which is the one
  // property a spend guard may not have.
  const OPAQUE = [
    ['runner eval mode',   `node -e "import('./scripts/consult-fable.mjs')"`],
    ['unknown wrapper',    'xargs node scripts/consult-fable.mjs'],
    ['sudo',               'sudo node scripts/consult-fable.mjs --document x'],
    ['cmd /c',             'cmd /c node scripts/consult-fable.mjs --document x'],
  ];
  for (const [name, cmd] of OPAQUE) {
    const r = runGate(cmd);
    assert.equal(r.code, BLOCK, `${name}: an unattributable execution ran free`);
    assert.match(r.stderr, /cannot read/, `${name}: must refuse as unreadable`);
    assert.doesNotMatch(r.stderr, /SWAN_SPEND_APPROVE/,
      `${name}: no token — nobody knows the cost, so there is nothing to approve`);
  }

  // Deep nesting: resolvable for four levels, opaque beyond. Built here rather than
  // written as a literal, because shell escaping in a fixture is its own bug source —
  // and because nesting turned out to fail at depth TWO, not the five predicted, until
  // backslash escapes INSIDE double quotes were modelled.
  let deep = 'node scripts/consult-fable.mjs --document x';
  for (let i = 0; i < 6; i += 1) deep = `sh -c ${JSON.stringify(deep)}`;
  assert.equal(runGate(deep).code, BLOCK, 'depth overflow must not return "nothing here"');

  // AND THE REASON MATTERS, not just the verdict. Two levels of nesting must RESOLVE
  // to a priced Fable call, not fall back to "cannot read". Both outcomes block, so a
  // bare exit-code assertion cannot tell them apart — mutation-testing exposed that:
  // removing backslash handling inside double quotes produced ZERO reds, because the
  // unreadable-shell-body backstop caught what the parser had stopped understanding.
  //
  // Layered defence is good and this is the cost of it: a test that only checks the
  // verdict silently accepts the backstop doing the work of the mechanism. Nesting
  // actually failed at depth TWO before quoted escapes were modelled — not the five
  // the reviewers predicted — and only an assertion about WHY shows that.
  const two = `sh -c ${JSON.stringify(`sh -c ${JSON.stringify('node scripts/consult-fable.mjs --document plan.md')}`)}`;
  const r2 = runGate(two);
  assert.equal(r2.code, BLOCK);
  assert.match(r2.stderr, /worst case\s+\$1\.06/, 'two levels deep must still price as Fable');
  assert.doesNotMatch(r2.stderr, /cannot read/, 'the parser must UNDERSTAND this, not just refuse it');
});

test('R5: failing closed does not tax ordinary work', () => {
  // The cost of the inversion, pinned. My own guard blocked a `for f in …; do node
  // --test "$f"; done` loop within minutes of the rule landing, and then my own
  // `node -e` one-liner thirty seconds later. Both were fixed by narrowing — shell
  // KEYWORDS are structure, and an eval body that names no script cannot reach a seat.
  // The accepted price of failing closed is ONE false block and a small fix, not a
  // standing tax; these cases are what hold that line.
  const QUIET = [
    'for f in a.test.mjs b.test.mjs; do node --test "$f"; done',
    'while read l; do echo $l; done',
    'node -e "console.log(1)"',
    'if [ -f x ]; then echo yes; fi',
    'cat scripts/consult-fable.mjs',
    'grep -rn INVOCATION scripts/',
    'git grep "node scripts/consult-fable.mjs" docs',
  ];
  for (const cmd of QUIET) {
    assert.equal(runGate(cmd).code, ALLOW, `cry-wolf on ordinary work: ${cmd}`);
  }
});

test('R6: an INERT head that can execute is not inert for that command', () => {
  // GLM 5.3 round-6 B1, and it refuted the argument I made when INERT_HEADS was born.
  // "A missing entry costs one false block" is true only for OMISSIONS — it silently
  // assumes every entry is TRUE. A head listed as inert that CAN execute fails in the
  // money direction while wearing fail-closed clothes. All four reproduced at exit 0.
  const EXEC_HATCHES = [
    ['find -exec', 'find . -maxdepth 0 -exec node scripts/consult-fable.mjs --document plan.md \\;'],
    ['sed e',      `sed 'e node scripts/consult-fable.mjs' file.txt`],
    ['vim -c',     `vim -c '!node scripts/consult-fable.mjs' -c qa f`],
    ['start',      'start node scripts/consult-fable.mjs'],
  ];
  for (const [name, cmd] of EXEC_HATCHES) {
    assert.equal(runGate(cmd).code, BLOCK, `${name}: an inert head executed a seat`);
  }

  // And the same heads stay quiet doing their ordinary job — which is the whole reason
  // they are listed. Inertness is a property of the head's SEMANTICS, so the escape
  // hatch has to be per-head: "any visible runner blocks" would break all four below,
  // three of which are pinned elsewhere in this suite.
  for (const cmd of [
    'find . -name "*.mjs"',
    "sed -n '1,5p' scripts/consult-fable.mjs",
    'which node',
    'echo node scripts/consult-fable.mjs',
  ]) {
    assert.equal(runGate(cmd).code, ALLOW, `cry-wolf on ordinary use: ${cmd}`);
  }
});

test('R6: backtick command substitution runs a seat, and is gated', () => {
  // GLM 5.3 round-6 B2. The backtick was an ordinary character, so the seat token
  // ended with one and failed the extension test while the runner token started with
  // one and failed RUNNERS — and `echo` suppressed the unknown-head branch on top.
  //
  // The round-3 sweep listed "command substitution" among 39 shapes; the suite pinned
  // only the `$()` spelling, which worked by accident of the paren split. That is the
  // `cmd /c` story verbatim — a verified shape living in prose, lost in a rewrite.
  assert.equal(runGate('echo `node scripts/consult-fable.mjs --document plan.md`').code, BLOCK);
  assert.equal(runGate('OUT=`node scripts/consult-fable.mjs --document plan.md`').code, BLOCK);
  // Live inside DOUBLE quotes, because bash runs it there.
  assert.equal(runGate('echo "result: `node scripts/consult-fable.mjs --document plan.md`"').code, BLOCK);
  // Literal inside SINGLE quotes, per POSIX — that is the spelling for prose.
  assert.equal(runGate(`echo 'see \`node scripts/consult-fable.mjs\` in the docs'`).code, ALLOW);
  // The spelling that already worked must keep working.
  assert.equal(runGate('echo $(node scripts/consult-fable.mjs --document plan.md)').code, BLOCK);
});

test('R6: a runner fed a program on STDIN is gated', () => {
  // GLM 5.3 round-6 B3. `node --input-type=module < <seat>` had the redirect TARGET
  // eaten and the signal discarded, so the runner had no script and nothing was
  // recorded — while node evaluates redirected stdin as a program and bills. The
  // parser had the information and threw it away.
  assert.equal(
    runGate('node --input-type=module < scripts/consult-fable.mjs --document plan.md').code,
    BLOCK, 'a redirected program is a program');
  assert.equal(
    runGate('cat scripts/consult-fable.mjs | node --input-type=module --document plan.md').code,
    BLOCK, 'and so is a piped one');

  // Ordinary redirects and pipes that feed a runner NOTHING must stay quiet.
  assert.equal(runGate('node build.mjs < input.txt').code, ALLOW, 'data on stdin is not a program');
  assert.equal(runGate('cat notes.md | grep node').code, ALLOW);
});

test('R6: a PANEL reserves under the seat ids its fan-out records', () => {
  // GLM 5.3 round-6 B4 — and the sentence above was written as a COMMENT in round 5
  // with `model: 'panel'` on the very next line. Every panel hold went under a literal
  // string no writer ever produces, so the per-seat releases matched nothing, were
  // discarded as orphans, and the whole fan-out sat as ghost spend for the full TTL.
  //
  // THIRD false comment of this workstream, on the money path, in the round after I
  // confessed the pattern twice. No test could have caught it: nothing read reservation
  // rows for a panel line, and the settle-parity pairs derive from providers.mjs, which
  // cannot contain 'panel'. This test is that missing reader.
  const { dir } = runGate('node scripts/consult-openrouter-panel.mjs --seats kimi,grok --document x --confirm-spend');
  const rows = readFileSync(join(dir, 'reservations.jsonl'), 'utf-8')
    .trim().split('\n').map((l) => JSON.parse(l)).filter((r) => r.kind === 'reserve');
  assert.ok(rows.length >= 2, 'a fan-out holds per seat, not as one lump');
  assert.ok(!rows.some((r) => r.model === 'panel'),
    "no hold may use the literal 'panel' — nothing records it, so it can never settle");
  assert.deepEqual(rows.map((r) => r.model).sort(), ['grok-4.6', 'kimi-k3']);
});

test('R5: SWAN_* env vars are read from the PARSE, not from raw text', () => {
  // GLM 5.3 round-5 F8 — the last position-blind readers in the gate. Three
  // `cmd.match(/SWAN_…/)` scans survived the parser rewrite, so a value inside a
  // quoted argument was read as if it were a shell assignment.
  //
  // The approval token is the one that matters most: it BUYS a refused call, and
  // reading it out of raw text meant a token appearing anywhere on the line counted
  // as presented. The protocol is "re-run the command with the token in front of it",
  // and that is now what is actually required.
  const first = runGate(FABLE);
  assert.equal(first.code, BLOCK, 'control: a bare Fable call is refused');
  const token = tokenFrom(first.dir);
  assert.ok(token, 'control: a token was minted');

  // The token as DATA inside an argument must not redeem.
  assert.equal(
    runGate(`node scripts/consult-fable.mjs --document "notes SWAN_SPEND_APPROVE=${token}"`,
      { ledger: first.dir }).code,
    BLOCK,
    'a token quoted inside an argument is data, and must not buy the call',
  );

  // As a real leading assignment, it does.
  assert.equal(
    runGate(`SWAN_SPEND_APPROVE=${token} ${FABLE}`, { ledger: first.dir }).code,
    ALLOW,
    'presented the way the protocol says, the token redeems',
  );

  // Same for the model override: as data it must not re-price.
  const asData = runGate('node scripts/consult-kimi.mjs --document "SWAN_KIMI_MODEL=claude-fable-5"');
  assert.equal(asData.code, ALLOW, 'a model name quoted inside an argument must not re-price the call');
});

test('R5: each seat holds under its OWN topic', () => {
  // flash round-5 F2, reproduced: both holds on a two-document line were keyed to the
  // FIRST seat's topic. A hold under the wrong topic can never be settled — the writer
  // releases under the topic it actually ran on, that release matches nothing and is
  // discarded, and the hold sits for the full TTL as ghost spend against a workstream
  // it never touched.
  const { dir } = runGate('node scripts/consult-kimi.mjs --document a.md && node scripts/consult-sol.mjs --document b.md');
  const rows = readFileSync(join(dir, 'reservations.jsonl'), 'utf-8')
    .trim().split('\n').map((l) => JSON.parse(l)).filter((r) => r.kind === 'reserve');
  assert.equal(rows.length, 2, 'one hold per invocation');
  assert.deepEqual(rows.map((r) => r.topic).sort(), ['a', 'b'],
    'each hold carries its own seat’s topic, or it can never be settled');
  assert.deepEqual(rows.map((r) => r.model).sort(), ['gpt-5.6-sol', 'kimi-k3']);
});

test('R5: a cap on a NON-FIRST topic is still enforced', () => {
  // GLM 5.3 round-5 F5. `--document` came from the first invocation, so the whole line
  // was charged to topic A and topic B's cap was never consulted — the per-topic budget
  // is THE primary control by Sean's own framing, and it was voidable by any seat that
  // was not first.
  const seeded = seedLedger([
    { ts: `${new Date().toISOString().slice(0, 10)}T10:00:00.000Z`, model: 'kimi-k3', topic: 'plan', usd: 2.90 },
  ]);
  const r = runGate(
    'node scripts/consult-hy3-design.mjs --document fresh.md && node scripts/consult-kimi.mjs --document plan.md',
    { ledger: seeded },
  );
  assert.equal(r.code, BLOCK, 'the second seat’s topic is over its cap and must block');
  assert.match(r.stderr, /topic "plan"/, 'and the refusal must name the topic that breached');
});

test('R5: an EMPTY --seats is not a $0 fan-out', () => {
  // flash round-5 F1, reproduced at exit 0: `''.split(',').filter(Boolean)` yields [],
  // which priced a CONFIRMED fan-out at $0.00. Empty is not none.
  //
  // MY FIRST ASSERTION HERE WAS WRONG, and the code was right. I asserted a bare BLOCK
  // — but the default roster prices at roughly $0.50, which is honestly under the
  // $1.00 cap, so ALLOW is correct. Second time this batch I demanded a refusal the
  // caps had no reason to give ($0.90 + $0.90 against a $3.00 topic cap was the
  // first). The lesson is the same both times: assert the thing that CHANGED, not a
  // verdict that happens to differ.
  //
  // What changed is whether the fan-out is COUNTED. Seeding the day near its cap makes
  // that observable: at the real ~$0.50 the line breaches and blocks; at the old $0.00
  // it would sail through.
  const today = new Date().toISOString().slice(0, 10);
  const seeded = seedLedger([
    { ts: `${today}T10:00:00.000Z`, model: 'kimi-k3', topic: 'other', usd: 4.70 },
  ]);
  const r = runGate(
    'node scripts/consult-openrouter-panel.mjs --seats "" --document x --confirm-spend',
    { ledger: seeded },
  );
  assert.equal(r.code, BLOCK, 'a blank seat list must be priced at the default roster, not at zero');
  assert.match(r.stderr, /today would reach/, 'and it must breach the DAY cap, which is what counting it means');

  // Control: with room to spare, the same command runs. The fix must count the
  // fan-out, not forbid it.
  assert.equal(
    runGate('node scripts/consult-openrouter-panel.mjs --seats "" --document x --confirm-spend').code,
    ALLOW,
    'a ~$0.50 default roster is affordable and must not be refused',
  );

  // A NON-EMPTY value that yields no seats — `--seats ","` — is the case that
  // discriminates the fix from the bug. Mutation-testing found this gap: reverting to
  // the old `seatsArg ? … : DEFAULT_SEATS` produced ZERO reds, because an empty STRING
  // is falsy and took the default either way. Only a truthy-but-seatless value
  // separates them, and nothing covered it.
  const seeded2 = seedLedger([
    { ts: `${today}T10:00:00.000Z`, model: 'kimi-k3', topic: 'other', usd: 4.70 },
  ]);
  assert.equal(
    runGate('node scripts/consult-openrouter-panel.mjs --seats "," --document x --confirm-spend',
      { ledger: seeded2 }).code,
    BLOCK,
    'a seat list that parses to nothing must price at the default roster, not at zero',
  );
});

test('a genuinely cheap seat passes — the gate is not just "block everything"', () => {
  // The honest positive control. Sol at its default is ~$0.31, under the $1.00 cap.
  // Without this, every BLOCK assertion above would also pass on a gate that
  // refused unconditionally.
  assert.equal(runGate('node scripts/consult-sol.mjs --document plan.md').code, ALLOW);
});

test('a bare Fable call breaches the per-call cap and blocks', () => {
  const r = runGate(FABLE);
  assert.equal(r.code, BLOCK);
  assert.match(r.stderr, /SPEND GUARD — BLOCKED/);
});

test('the refusal names the model, the number and the cap', () => {
  const r = runGate(FABLE);
  assert.match(r.stderr, /claude-fable-5/);
  assert.match(r.stderr, /worst case/);
  assert.match(r.stderr, /cap per call/);
});

test('CUMULATIVE: prior topic spend can block a call that would otherwise pass', () => {
  // The whole reason the ledger exists — four reasonable calls, not one outrageous one.
  const today = new Date().toISOString();
  const dir = seedLedger([
    { ts: today, model: 'gpt-5.6-sol-pro', topic: 'plan', usd: 2.9 },
  ]);
  const r = runGate('node scripts/consult-sol.mjs --document plan.md', { ledger: dir });
  assert.equal(r.code, BLOCK, 'a small call on a nearly-exhausted topic must still block');
  assert.match(r.stderr, /spent on topic/);
});

// ---------------------------------------------------------------------------
// 6. The two-ask contract — an agent must not be able to self-approve
// ---------------------------------------------------------------------------

test('the first ask mints a token and refuses', () => {
  const r = runGate(FABLE);
  assert.equal(r.code, BLOCK);
  assert.doesNotMatch(r.stderr, /SWAN_SPEND_APPROVE=[a-f0-9]{12}/,
    'the token must never appear in output the agent reads (GLM 5.3 blocker 2)');
  assert.match(r.stderr, /PENDING-SPEND-APPROVAL/, 'it must say where Sean can find it');
  assert.match(r.stderr, /FIRST of two asks/);
  assert.match(tokenFrom(r.dir) || '', /^[a-f0-9]{12}$/, 'and the note must actually hold one');
});

test('an INVENTED approval token is refused', () => {
  const r = runGate(`SWAN_SPEND_APPROVE=deadbeef1234 ${FABLE}`);
  assert.equal(r.code, BLOCK, 'a guessable token would make the two-ask rule theatre');
});

test('the minted token, presented on the SAME call, is accepted', () => {
  const dir = mkdtempSync(join(sandbox, 'twoask-'));
  const first = runGate(FABLE, { ledger: dir });
  const token = tokenFrom(dir);
  assert.ok(token, 'first ask must mint a token');
  const second = runGate(`SWAN_SPEND_APPROVE=${token} ${FABLE}`, { ledger: dir });
  assert.equal(second.code, ALLOW);
});

test('the token is SINGLE USE — replaying it is refused', () => {
  const dir = mkdtempSync(join(sandbox, 'replay-'));
  const first = runGate(FABLE, { ledger: dir });
  const token = tokenFrom(dir);
  const cmd = `SWAN_SPEND_APPROVE=${token} ${FABLE}`;
  assert.equal(runGate(cmd, { ledger: dir }).code, ALLOW);
  assert.equal(runGate(cmd, { ledger: dir }).code, BLOCK, 'a replayable token is an unlimited pass');
});

test('a token minted for one call cannot be lifted onto a different one', () => {
  // The ledger MUST be seeded. On a clean one, sol costs ~$0.31 and passes, so no
  // token is minted and the test skips itself while still reporting green. An
  // earlier draft did exactly that: `if (!token) return`. A test that can silently
  // decline to test anything is worse than no test, because it reads as coverage.
  const today = new Date().toISOString();
  const dir = seedLedger([
    { ts: today, model: 'gpt-5.6-sol-pro', topic: 'plan', usd: 2.9 },
  ]);
  const first = runGate('node scripts/consult-sol.mjs --document plan.md', { ledger: dir });
  assert.equal(first.code, BLOCK, 'the seed must force a breach so a token is actually minted');
  const token = tokenFrom(dir);
  assert.ok(token, 'a refused call must mint a token');

  // Same ledger, same topic — but a different model and a different cost, so the
  // token's model+topic+cost key does not match.
  const r = runGate(`SWAN_SPEND_APPROVE=${token} ${FABLE}`, { ledger: dir });
  assert.equal(r.code, BLOCK, 'tokens bind to model+topic+cost');
});

// ---------------------------------------------------------------------------
// 7. Isolation self-check — if this fails, every result above is suspect
// ---------------------------------------------------------------------------

test('SWAN_SPEND_DIR really redirects the ledger — the real one is untouched', async () => {
  const { SPEND_DIR } = await import(
    `file://${join(HERE, '..', 'lib', 'spend-ledger.mjs').replaceAll('\\', '/')}?probe=1`
  );
  // This process has no SWAN_SPEND_DIR set, so the module must resolve to the repo path.
  assert.ok(!process.env.SWAN_SPEND_DIR, 'the test runner itself must not set the override');
  assert.match(SPEND_DIR.replaceAll('\\', '/'), /\.ai-workflow\/spend$/);
  // And a spawned gate with the override must write somewhere else entirely.
  const r = runGate(FABLE);
  assert.notEqual(r.dir, SPEND_DIR);
});

```
