#!/usr/bin/env node
/**
 * scripts/continuity-append.mjs
 * Phase B continuity bridge — append-only session-closeout log writer.
 *
 * Authoritative spec:
 *   docs/ai-workflow/AI-HANDOFF/CONTINUITY-BRIDGE-PHASE-B-DEBATE-2026-04-22.md
 *
 * Behavior summary:
 *   1. Hard-fail if SWAN_AGENT_SURFACE env var not set or not in allowed set.
 *   2. Read continuity-config.local.json when present; otherwise read continuity-config.json.
 *      Hard-fail if the loaded config has any <TODO_FILL_BEFORE_USE…> placeholder.
 *   3. Verify repo context via (git-toplevel-matches-multi-shape) AND (git-remote-matches OR marker-file).
 *   4. Acquire append.lock via atomic fs.openSync(path, 'wx'). Strict stale policy:
 *        - same runtime+host: PID-probe-DEAD-only releases. ALIVE/ambiguous → fail loud.
 *        - cross namespace: always fail loud.
 *        - --force-stale-release flag for operator override.
 *   5. Sanitize candidate entry in-memory ONLY:
 *        - Layer 1: spawn `scripts/scan-secrets.sh --stdin`, pipe candidate via child stdin. Hit → refuse write.
 *        - Layer 2: auto-transform 9 path shapes → <USER_HOME>; username → <USER>; config-driven host/IP scrubs.
 *   6. Duplicate-entry detection via sha256(topic+outcome+notes) vs last 5 entries. Warn + no-append unless --allow-duplicate.
 *   7. Append entry to rolling-last-done.md. Trim if > 30 KB (header preserved, newest 60% kept, middle dropped).
 *   8. On success: invoke continuity-promotions.sh --count, print pending-PROMOTE count.
 *
 * Created: 2026-04-22 (Chunk 1 of Phase B implementation).
 */

import { exit, env, cwd, pid, platform } from 'node:process';
import { spawn, execFileSync } from 'node:child_process';
import {
  readFileSync, writeFileSync, openSync, closeSync, fsyncSync,
  unlinkSync, renameSync, existsSync, statSync, mkdirSync,
} from 'node:fs';
import { dirname, basename } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { hostname, homedir } from 'node:os';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const CONTINUITY_DIR = '.ai-workflow/continuity';
const ROLLING_LOG = `${CONTINUITY_DIR}/rolling-last-done.md`;
const LOCK_FILE = `${CONTINUITY_DIR}/append.lock`;
const CONFIG_FILE = 'scripts/continuity-config.json';
const LOCAL_CONFIG_FILE = 'scripts/continuity-config.local.json';
const SCAN_SCRIPT = 'scripts/scan-secrets.sh';
const PROMOTIONS_SCRIPT = 'scripts/continuity-promotions.sh';

const SIZE_CAP_BYTES = 30 * 1024;           // 30 KB v1 cap
const TRIM_KEEP_NEWEST_PCT = 0.60;          // preserve newest 60% after trim
const HEADER_BUDGET = 1024;                 // ~1 KB header preserved across trims

const VALID_SURFACES = ['vs-claude', 'vs-codex', 'tg-claude', 'tg-codex'];

const LOCK_ACQUIRE_TIMEOUT_MS = 5000;
const LOCK_BACKOFF_INITIAL_MS = 50;
const LOCK_BACKOFF_MAX_MS = 500;

const PLACEHOLDER_PREFIX = '<TODO_FILL_BEFORE_USE';

// Operator identity is DERIVED AT RUNTIME, never hardcoded (2026-08-27).
// Spelling the username here made this redactor one more file carrying the exact
// string it exists to remove — and it hardcoded ONE machine's account into a script
// every agent surface runs. Behaviour is unchanged: same six path shapes, same
// standalone rule, same three repo shapes (still lowercased, because they are
// matched against a lowercased path). Proven byte-identical to the literals above
// on a fixture covering every shape plus all three repo verdicts.
const OPERATOR = basename(homedir() || '') || env.USERNAME || env.USER || '';
const OP = OPERATOR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const OP_LOWER = OP.toLowerCase();

// 9 path shapes per debate §3.4 Layer 2. Order matters — longer/more-specific first.
const PATH_SHAPES = [
  // Windows extended path (\\?\C:\...)
  [new RegExp(`\\\\\\\\\\?\\\\[Cc]:\\\\Users\\\\${OP}\\\\`, 'g'), '<USER_HOME>\\'],
  // JSON-escaped backslash (C:\\Users\\<user>\\)
  [new RegExp(`[Cc]:\\\\\\\\Users\\\\\\\\${OP}\\\\\\\\`, 'g'), '<USER_HOME>\\\\'],
  // WSL canonical (/mnt/c/Users/<user>/) — case-insensitive on "users"
  [new RegExp(`/mnt/c/[Uu]sers/${OP}/`, 'g'), '<USER_HOME>/'],
  // Git-Bash (/c/Users/<user>/)
  [new RegExp(`/c/Users/${OP}/`, 'g'), '<USER_HOME>/'],
  // Windows forward slash (C:/Users/<user>/ or c:/Users/<user>/)
  [new RegExp(`[Cc]:/Users/${OP}/`, 'g'), '<USER_HOME>/'],
  // Windows backslash (C:\Users\<user>\ or c:\Users\<user>\)
  [new RegExp(`[Cc]:\\\\Users\\\\${OP}\\\\`, 'g'), '<USER_HOME>\\'],
];
const USERNAME_STANDALONE_RE = new RegExp(`\\b${OP}\\b`, 'g');

// Accepted SwanStudios repo toplevel path shapes (lowercased before match)
const REPO_SHAPE_PATTERNS = [
  new RegExp(`^c:[/\\\\]users[/\\\\]${OP_LOWER}[/\\\\]desktop[/\\\\]quick-pt[/\\\\]ss-pt$`),
  new RegExp(`^/mnt/c/users/${OP_LOWER}/desktop/quick-pt/ss-pt$`),
  new RegExp(`^/c/users/${OP_LOWER}/desktop/quick-pt/ss-pt$`),
];
const EXPECTED_REMOTE_PATTERN = /seanswan.*ss-pt/i;
const MARKER_FILE = 'CLAUDE.md';

// ─────────────────────────────────────────────
// Exit codes (non-zero → structured failure, for caller debugging)
// ─────────────────────────────────────────────
const EX_OK = 0;
const EX_MISSING_ENV = 10;
const EX_INVALID_ARGS = 11;
const EX_CONFIG_PLACEHOLDER = 12;
const EX_WRONG_REPO = 13;
const EX_LOCK_BUSY = 20;
const EX_LOCK_STALE_UNSAFE = 21;
const EX_SANITIZER_HIT = 30;
// EX_DUPLICATE: reserved but not used — per debate §8 row 11, duplicates exit 0 (safe-no-op), not 40.
const EX_DUPLICATE_RESERVED = 40;
const EX_WRITE_FAIL = 50;

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

function die(code, msg) {
  console.error(`[continuity-append] ERROR (${code}): ${msg}`);
  exit(code);
}

function info(msg) {
  console.log(`[continuity-append] ${msg}`);
}

function warn(msg) {
  console.warn(`[continuity-append] WARN: ${msg}`);
}

function detectRuntime() {
  if (platform === 'linux') {
    try {
      const procVersion = readFileSync('/proc/version', 'utf8').toLowerCase();
      if (procVersion.includes('microsoft') || procVersion.includes('wsl')) {
        return 'wsl-bash';
      }
    } catch { /* not WSL */ }
    return 'linux';
  }
  if (platform === 'win32') {
    if (env.MSYSTEM) return 'git-bash';
    return 'win-native';
  }
  return platform;  // darwin, etc. (unexpected for this project)
}

function normalizePathLower(p) {
  return (p || '').toString().trim().toLowerCase().replace(/[\/\\]+$/, '');
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// ─────────────────────────────────────────────
// Args
// ─────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    topic: '',
    files: '',
    outcome: '',
    notes: '',
    forceStaleRelease: false,
    allowDuplicate: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--topic':   args.topic = argv[++i] || ''; break;
      case '--files':   args.files = argv[++i] || ''; break;
      case '--outcome': args.outcome = argv[++i] || ''; break;
      case '--notes':   args.notes = argv[++i] || ''; break;
      case '--force-stale-release': args.forceStaleRelease = true; break;
      case '--allow-duplicate':     args.allowDuplicate = true; break;
      case '-h': case '--help':
        printHelp();
        exit(EX_OK);
      default:
        die(EX_INVALID_ARGS, `unknown arg: ${a}. Use --help for usage.`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  SWAN_AGENT_SURFACE=<surface> node scripts/continuity-append.mjs \\
    --topic "<short>" --outcome "<brief>" [--files "a,b,c"] [--notes "..."] \\
    [--force-stale-release] [--allow-duplicate]

Required env: SWAN_AGENT_SURFACE ∈ {${VALID_SURFACES.join(', ')}}
Required args: --topic, --outcome
Optional args: --files, --notes, --force-stale-release, --allow-duplicate

Notes may contain <!-- PROMOTE: ... --> markers for curation review.

Exit codes:
  0  = success (also: safe-no-op duplicate detected — warned to stderr, no append)
  10 = missing/invalid env
  11 = invalid args
  12 = config placeholder still present
  13 = wrong repo context
  20 = lock busy (timeout without stale-safe release)
  21 = lock stale but unsafe to release (cross-namespace, use --force-stale-release)
  30 = sanitizer hit (secret detected)
  50 = disk write failed
`);
}

// ─────────────────────────────────────────────
// Env + config validation
// ─────────────────────────────────────────────

function assertEnv() {
  const surface = env.SWAN_AGENT_SURFACE;
  if (!surface) {
    die(EX_MISSING_ENV, `SWAN_AGENT_SURFACE env var not set. Must be one of: ${VALID_SURFACES.join(', ')}`);
  }
  if (!VALID_SURFACES.includes(surface)) {
    die(EX_MISSING_ENV, `SWAN_AGENT_SURFACE="${surface}" invalid. Must be one of: ${VALID_SURFACES.join(', ')}`);
  }
  return surface;
}

function loadConfigOrDie() {
  const configPath = existsSync(LOCAL_CONFIG_FILE) ? LOCAL_CONFIG_FILE : CONFIG_FILE;
  if (!existsSync(configPath)) {
    die(EX_CONFIG_PLACEHOLDER, `missing ${configPath}. Run Phase B setup step 1 first.`);
  }
  let cfg;
  try {
    cfg = JSON.parse(readFileSync(configPath, 'utf8'));
  } catch (err) {
    die(EX_CONFIG_PLACEHOLDER, `${configPath} is not valid JSON: ${err.message}`);
  }

  // Scan for any placeholder. Hard-fail per Sean 2026-04-22 directive.
  const placeholders = [];
  function scan(obj, path) {
    if (typeof obj === 'string') {
      if (obj.startsWith(PLACEHOLDER_PREFIX)) placeholders.push(`${path} = "${obj}"`);
      return;
    }
    if (Array.isArray(obj)) {
      obj.forEach((v, i) => scan(v, `${path}[${i}]`));
      return;
    }
    if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) scan(v, path ? `${path}.${k}` : k);
    }
  }
  scan(cfg, '');
  if (placeholders.length > 0) {
    die(EX_CONFIG_PLACEHOLDER,
      `${configPath} has ${placeholders.length} placeholder(s). Fill it before running append.\n` +
      placeholders.map(p => `  - ${p}`).join('\n'));
  }
  return cfg;
}

// ─────────────────────────────────────────────
// Repo-context verification (multi-shape)
// ─────────────────────────────────────────────

function assertRepoContext() {
  let toplevel;
  try {
    toplevel = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  } catch {
    die(EX_WRONG_REPO, `git rev-parse --show-toplevel failed. Not in a git repo?`);
  }

  const normalizedTop = normalizePathLower(toplevel);
  const shapeMatch = REPO_SHAPE_PATTERNS.some(rx => rx.test(normalizedTop));
  if (!shapeMatch) {
    die(EX_WRONG_REPO, `git toplevel "${toplevel}" does not normalize to a known SwanStudios repo shape. ` +
      `Accepted: Windows native, WSL /mnt/c/, Git-Bash /c/.`);
  }

  // Secondary: git remote OR marker file
  let remoteOk = false;
  try {
    const remote = execFileSync('git', ['config', '--get', 'remote.origin.url'], { encoding: 'utf8' }).trim();
    if (EXPECTED_REMOTE_PATTERN.test(remote)) remoteOk = true;
  } catch { /* no remote or not set, fall through to marker check */ }

  const markerOk = existsSync(`${toplevel}/${MARKER_FILE}`);
  if (!remoteOk && !markerOk) {
    die(EX_WRONG_REPO, `repo shape matches but neither git remote matches SwanStudios pattern ` +
      `nor marker file ${MARKER_FILE} present at toplevel.`);
  }

  return toplevel;
}

// ─────────────────────────────────────────────
// Lock acquisition (strict stale policy)
// ─────────────────────────────────────────────

async function acquireLock(runtime, surface, forceStaleRelease) {
  const start = Date.now();
  let backoff = LOCK_BACKOFF_INITIAL_MS;
  const myInfo = { pid, surface, host: hostname(), runtime, ts: new Date().toISOString() };
  const myJson = JSON.stringify(myInfo, null, 2);

  // Ensure continuity dir exists (first-run safety)
  mkdirSync(dirname(LOCK_FILE), { recursive: true });

  while (true) {
    try {
      const fd = openSync(LOCK_FILE, 'wx');
      writeFileSync(fd, myJson, { encoding: 'utf8' });
      closeSync(fd);
      lockHeldByThisProcess = true;
      return myInfo;
    } catch (err) {
      if (err.code !== 'EEXIST') die(EX_WRITE_FAIL, `lock create failed: ${err.message}`);
      // EEXIST — someone holds the lock. Check if we should wait or escalate.
      const elapsed = Date.now() - start;
      if (elapsed < LOCK_ACQUIRE_TIMEOUT_MS) {
        await sleep(Math.min(backoff, LOCK_BACKOFF_MAX_MS));
        backoff = Math.min(backoff * 2, LOCK_BACKOFF_MAX_MS);
        continue;
      }
      // Timeout — apply strict stale policy.
      return handleStaleLock(myInfo, forceStaleRelease);
    }
  }
}

function handleStaleLock(myInfo, forceStaleRelease) {
  let holder;
  try {
    holder = JSON.parse(readFileSync(LOCK_FILE, 'utf8'));
  } catch (err) {
    die(EX_LOCK_BUSY, `lock exists but holder info unreadable: ${err.message}. ` +
      `Use --force-stale-release after manual inspection.`);
  }

  const sameNamespace = (holder.host === myInfo.host) && (holder.runtime === myInfo.runtime);
  const ageSec = Math.round((Date.now() - new Date(holder.ts).getTime()) / 1000);
  info(`lock timeout. Holder: pid=${holder.pid} surface=${holder.surface} host=${holder.host} ` +
    `runtime=${holder.runtime} age=${ageSec}s. same-namespace=${sameNamespace}`);

  if (forceStaleRelease) {
    warn(`--force-stale-release: discarding lock held by pid=${holder.pid}. Risk accepted by operator.`);
    unlinkSync(LOCK_FILE);
    return acquireLockOnceForceLocked(myInfo);
  }

  if (!sameNamespace) {
    die(EX_LOCK_STALE_UNSAFE, `cross-namespace lock (holder.runtime=${holder.runtime}, ours=${myInfo.runtime}). ` +
      `PID probe meaningless across namespaces — age alone cannot release. ` +
      `Age ${ageSec}s logged for diagnostic. Re-run with --force-stale-release if you verified the holder is gone.`);
  }

  // Same namespace — PID probe is meaningful.
  try {
    process.kill(holder.pid, 0);
    // No throw → holder PID is alive.
    die(EX_LOCK_BUSY, `lock held by alive pid=${holder.pid} (surface=${holder.surface}, age=${ageSec}s). ` +
      `Wait for it to complete or --force-stale-release if you verified it's wedged.`);
  } catch (err) {
    if (err.code === 'ESRCH') {
      // PID is dead — safe to force-release.
      warn(`same-namespace holder pid=${holder.pid} is DEAD (ESRCH). Force-releasing lock.`);
      unlinkSync(LOCK_FILE);
      return acquireLockOnceForceLocked(myInfo);
    }
    // EPERM or other — ambiguous. Fail loud per debate §3.3.
    die(EX_LOCK_BUSY, `PID probe of holder pid=${holder.pid} returned ambiguous error (${err.code}). ` +
      `Not releasing. Use --force-stale-release after manual verification.`);
  }
}

function acquireLockOnceForceLocked(myInfo) {
  const myJson = JSON.stringify(myInfo, null, 2);
  const fd = openSync(LOCK_FILE, 'wx');
  writeFileSync(fd, myJson, { encoding: 'utf8' });
  closeSync(fd);
  lockHeldByThisProcess = true;  // process.on('exit') backstop covers stale-release reacquire path
  return myInfo;
}

// Defense in depth: process.exit() (called by die()) bypasses try/finally blocks.
// Track whether we hold the lock and unlink on exit. Idempotent against double-release.
let lockHeldByThisProcess = false;
process.on('exit', () => {
  if (lockHeldByThisProcess) {
    try { unlinkSync(LOCK_FILE); } catch { /* already gone */ }
  }
});

function releaseLock() {
  try { unlinkSync(LOCK_FILE); } catch { /* already gone */ }
  lockHeldByThisProcess = false;
}

// ─────────────────────────────────────────────
// Sanitizer Layer 1 (scan-secrets.sh --stdin via spawn+stdin)
// ─────────────────────────────────────────────

function runSanitizerLayer1(candidate) {
  return new Promise((resolve, reject) => {
    const child = spawn('bash', [SCAN_SCRIPT, '--stdin'], {
      stdio: ['pipe', 'pipe', 'inherit'],  // stdin pipe, stdout capture, stderr inherit
    });
    let stdout = '';
    child.stdout.on('data', (c) => { stdout += c.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ clean: true });
      else if (code === 1) resolve({ clean: false });
      else reject(new Error(`scan-secrets.sh --stdin exited with code ${code}`));
    });
    child.stdin.write(candidate);
    child.stdin.end();
  });
}

// ─────────────────────────────────────────────
// Sanitizer Layer 2 (path + config-driven host/IP scrubs)
// ─────────────────────────────────────────────

function applyLayer2Scrub(text, cfg) {
  let out = text;
  // Path shapes (9 variants, most-specific first)
  for (const [rx, sub] of PATH_SHAPES) out = out.replace(rx, sub);
  // Standalone username
  out = out.replace(USERNAME_STANDALONE_RE, '<USER>');
  // Config-driven scrubs
  const tsNodes = cfg?.scrub?.tailscale_nodes || [];
  tsNodes.forEach((node, i) => {
    if (!node) return;
    const escaped = node.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), `<TS_NODE_${i + 1}>`);
  });
  const piHosts = cfg?.scrub?.pi_hostnames || [];
  piHosts.forEach((h) => {
    if (!h) return;
    const escaped = h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '<HERMES_PI>');
  });
  const piIps = cfg?.scrub?.pi_ips || [];
  piIps.forEach((ip) => {
    if (!ip) return;
    const escaped = ip.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`\\b${escaped}\\b`, 'g'), '<HERMES_IP>');
  });
  return out;
}

// ─────────────────────────────────────────────
// Duplicate detection
// ─────────────────────────────────────────────

function hashEntry(topic, outcome, notes) {
  return createHash('sha256').update(`${topic}|${outcome}|${notes}`, 'utf8').digest('hex');
}

function checkDuplicate(candidateHash, rollingContent) {
  // Entries are delimited by the frontmatter fence lines. Last 5 entries' hashes are embedded as HTML comment markers at entry end.
  const marker = /<!-- hash: ([a-f0-9]{64}) -->/g;
  const hashes = [];
  let m;
  while ((m = marker.exec(rollingContent)) !== null) hashes.push(m[1]);
  const lastFive = hashes.slice(-5);
  return lastFive.includes(candidateHash);
}

// ─────────────────────────────────────────────
// Entry formatting + append + trim
// ─────────────────────────────────────────────

function formatEntry({ surface, sessionId, topic, files, outcome, notes, candidateHash }) {
  const ts = new Date().toISOString();
  const filesLine = files ? files.split(',').map(s => s.trim()).filter(Boolean).join(', ') : '(none)';
  return `
---
ts: ${ts}
surface: ${surface}
session: ${sessionId}
---

**Topic:** ${topic}

**Files touched:** ${filesLine}

**Outcome:** ${outcome}

**Notes:** ${notes || '(none)'}

<!-- hash: ${candidateHash} -->
`;
}

function ensureHeaderPresent(content) {
  if (content.startsWith('# Continuity Rolling Log')) return content;
  const header = `# Continuity Rolling Log

> Auto-managed by scripts/continuity-append.mjs. Append-only. Cap 30 KB — trimmed in place.
> See .ai-workflow/continuity/README.md for schema, marker syntax, and curation rules.
> Use scripts/continuity-promotions.sh to list/count pending promotion markers.

---
`;
  return header + content;
}

function trimIfNeeded(content) {
  const byteLen = Buffer.byteLength(content, 'utf8');
  if (byteLen <= SIZE_CAP_BYTES) return content;

  // Find end of header (~first 1 KB of content, ending at the first `---` separator after the opening block)
  const headerEnd = content.indexOf('\n---\n', HEADER_BUDGET);
  const safeHeaderEnd = headerEnd > 0 ? headerEnd + 5 : HEADER_BUDGET;
  const header = content.slice(0, safeHeaderEnd);

  const bodyStart = safeHeaderEnd;
  const body = content.slice(bodyStart);
  const keepBytes = Math.floor(SIZE_CAP_BYTES * TRIM_KEEP_NEWEST_PCT);
  // Preserve newest `keepBytes` of body. Align to a `\n---\n` boundary if possible to avoid mid-entry cuts.
  const targetStart = Math.max(0, Buffer.byteLength(body, 'utf8') - keepBytes);
  const alignIdx = body.indexOf('\n---\n', targetStart);
  const cutIdx = alignIdx > 0 ? alignIdx : targetStart;
  const kept = body.slice(cutIdx);
  const droppedBytes = byteLen - (Buffer.byteLength(header, 'utf8') + Buffer.byteLength(kept, 'utf8'));
  const trimMarker = `\n--- TRIM EVENT ${new Date().toISOString()} — dropped ${Math.round(droppedBytes / 1024)} KB middle ---\n`;
  return header + trimMarker + kept;
}

function atomicWrite(path, content) {
  const tmp = `${path}.tmp.${pid}.${randomBytes(3).toString('hex')}`;
  const fd = openSync(tmp, 'w');
  writeFileSync(fd, content, { encoding: 'utf8' });
  fsyncSync(fd);
  closeSync(fd);
  renameSync(tmp, path);
}

// ─────────────────────────────────────────────
// Promote-count (post-success info)
// ─────────────────────────────────────────────

function getPromoteCountOrNull() {
  if (!existsSync(PROMOTIONS_SCRIPT)) return null;
  try {
    const out = execFileSync('bash', [PROMOTIONS_SCRIPT, '--count'], { encoding: 'utf8' }).trim();
    const n = parseInt(out, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  if (!args.topic || !args.outcome) {
    die(EX_INVALID_ARGS, `missing required --topic and/or --outcome. Use --help.`);
  }

  const surface = assertEnv();
  const cfg = loadConfigOrDie();
  assertRepoContext();

  const runtime = detectRuntime();
  const candidateHash = hashEntry(args.topic, args.outcome, args.notes);

  // Acquire lock BEFORE sanitizing (sanitizer failure needs to release cleanly; no point sanitizing while contended)
  const lockInfo = await acquireLock(runtime, surface, args.forceStaleRelease);

  try {
    // Duplicate check AFTER lock, against current rolling content
    let rollingContent = '';
    if (existsSync(ROLLING_LOG)) {
      rollingContent = readFileSync(ROLLING_LOG, 'utf8');
    }
    if (!args.allowDuplicate && checkDuplicate(candidateHash, rollingContent)) {
      warn(`duplicate entry detected (hash=${candidateHash.slice(0, 12)}…). Last 5 entries contained this hash. No append. Use --allow-duplicate to override.`);
      // Per debate §8 row 11: warn + exit 0 (NOT a failure). Duplicate is safe-no-op, not an error.
      // Exit 0 so agents don't treat this as a failed closeout and retry.
      releaseLock();
      exit(EX_OK);
    }

    // Sanitizer Layer 1 — in-memory only; unredacted candidate never touches disk
    const rawCandidate = `Topic: ${args.topic}\nFiles: ${args.files}\nOutcome: ${args.outcome}\nNotes: ${args.notes}`;
    const { clean } = await runSanitizerLayer1(rawCandidate);
    if (!clean) {
      // Release lock BEFORE die() — die() calls process.exit() and skips finally blocks.
      // The process.on('exit') handler is a backstop, but explicit release is clearer.
      releaseLock();
      die(EX_SANITIZER_HIT, `scan-secrets.sh --stdin reported a Layer-1 hit on the candidate. Append refused. ` +
        `See stderr above for pattern name + candidate line number(s). The candidate is structured as ` +
        `"Topic: <topic>\\nFiles: <files>\\nOutcome: <outcome>\\nNotes: <notes>" so line 1=Topic, 2=Files, 3=Outcome, 4+=Notes. ` +
        `Rephrase or remove the offending content and retry.`);
    }

    // Sanitizer Layer 2 — auto-transform after Layer 1 passes
    const scrubbed = {
      topic:   applyLayer2Scrub(args.topic, cfg),
      files:   applyLayer2Scrub(args.files, cfg),
      outcome: applyLayer2Scrub(args.outcome, cfg),
      notes:   applyLayer2Scrub(args.notes, cfg),
    };

    const sessionId = randomBytes(4).toString('hex');
    const entry = formatEntry({
      surface, sessionId,
      topic: scrubbed.topic,
      files: scrubbed.files,
      outcome: scrubbed.outcome,
      notes: scrubbed.notes,
      candidateHash,
    });

    // Ensure header, append, trim, atomic write
    let next = ensureHeaderPresent(rollingContent) + entry;
    next = trimIfNeeded(next);
    atomicWrite(ROLLING_LOG, next);

    info(`appended to ${ROLLING_LOG} (surface=${surface}, hash=${candidateHash.slice(0, 12)}…, size=${Buffer.byteLength(next, 'utf8')} B)`);

    const promoteCount = getPromoteCountOrNull();
    if (promoteCount !== null && promoteCount > 0) {
      info(`${promoteCount} pending PROMOTE markers in rolling log; review via ${PROMOTIONS_SCRIPT}`);
    }
  } finally {
    releaseLock();
  }

  exit(EX_OK);
}

main().catch((err) => {
  try { releaseLock(); } catch { /* ignore */ }
  die(EX_WRITE_FAIL, `unhandled: ${err.stack || err.message}`);
});
