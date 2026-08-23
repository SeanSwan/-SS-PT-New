#!/usr/bin/env node
/**
 * idle-gpu-reaper.mjs — stop local models cooking the room when nothing is using them.
 * ===================================================================================
 * Sean, 2026-08-23 (room at 95°F): "I can't have AIs sit in there doing nothing,
 * heating up the whole house... I don't know when it's working necessarily or not
 * because I'm doing so much stuff."
 *
 * THE INCIDENT. A single 62-second panel call loaded Qwen 3.8 onto the 5090.
 * Ollama's keep-alive then held 17 GB of VRAM resident for FOUR MORE HOURS,
 * drawing power and heating the room, for zero work. Nothing surfaced it — the
 * spend ledger is blind to watts by design, and it was only found because Sean
 * said his room was hot.
 *
 * THE HARD PART IS NOT STOPPING THINGS, IT IS TELLING IDLE FROM THINKING.
 * Resident VRAM alone proves nothing: a model mid-inference and a model
 * abandoned for hours look identical if you only check `ollama ps`. The
 * discriminator is SUSTAINED GPU UTILISATION, sampled over a window:
 *
 *   resident memory + sustained LOW utilisation  -> idle, reapable
 *   resident memory + any utilisation spike      -> working, hands off
 *
 * Measured on this machine during the incident: idle sat flat at 9-11% for the
 * whole sampling window at 43°C. Real inference pushes 80-100%. The default
 * threshold (25%) sits far above observed idle and far below observed work.
 *
 * FALSE POSITIVES ARE THE EXPENSIVE FAILURE. Reaping a model mid-job destroys
 * real work — possibly paid work — to save pennies of electricity. So this is
 * deliberately reluctant: it requires resident VRAM, AND sustained low
 * utilisation across every sample, AND a grace period during which it saw the
 * same idleness before it will act. Any single high sample resets the clock.
 *
 * MODES
 *   --check   one-shot report, never acts. Safe anywhere, including hooks.
 *   --reap    one-shot: reap only if idle has persisted past the grace period.
 *   --watch   poll until nothing is resident, then EXIT. For walking away.
 *
 * The watch loop must terminate on its own. A watchdog that never exits is the
 * exact failure it exists to prevent, wearing a different hat.
 *
 * When it reaps, it writes a memo to the Hermes inbox so the event is visible to
 * Hermes and to any future agent, rather than vanishing into a console nobody
 * reads. Sean: "send a log somewhere... easy for Hermes to see."
 *
 * Privacy (Rules 8/44/59): records model names, sizes, utilisation and
 * timestamps. No prompt content, ever.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const STATE = join(ROOT, '.ai-workflow', 'spend', 'gpu-idle-state.json');
const INBOX = join(ROOT, '.ai-workflow', 'hermes-inbox', 'pending');

const CFG = {
  /** Above this %, the GPU is considered to be doing real work. */
  busyPercent: Number(process.env.SWAN_GPU_BUSY_PCT || 25),
  /** Minutes of continuous observed idleness before anything is unloaded. */
  graceMinutes: Number(process.env.SWAN_GPU_GRACE_MIN || 10),
  /** Samples taken per check, and the gap between them. */
  samples: Number(process.env.SWAN_GPU_SAMPLES || 4),
  sampleGapMs: Number(process.env.SWAN_GPU_SAMPLE_GAP_MS || 700),
  /** Seconds between polls in --watch. */
  watchIntervalSec: Number(process.env.SWAN_GPU_WATCH_SEC || 60),
  /** Hard ceiling on --watch so it can never become the runaway it hunts. */
  watchMaxMinutes: Number(process.env.SWAN_GPU_WATCH_MAX_MIN || 240),
};

const sh = (cmd, args) => {
  try { return execFileSync(cmd, args, { encoding: 'utf-8', timeout: 15000 }).trim(); }
  catch { return ''; }
};

/** Sampled GPU utilisation. Returns null when no NVIDIA GPU / driver is present. */
function sampleGpu() {
  const readings = [];
  for (let i = 0; i < CFG.samples; i += 1) {
    const out = sh('nvidia-smi', ['--query-gpu=utilization.gpu,memory.used,temperature.gpu', '--format=csv,noheader,nounits']);
    if (!out) return null;
    const [util, mem, temp] = out.split('\n')[0].split(',').map((v) => Number(v.trim()));
    // NaN guard. Number('N/A') is NaN, and `NaN >= busyPercent` is FALSE — so a
    // single poisoned reading would present as IDLE and authorise a reap. Any
    // unusable sample makes the whole observation unknown instead of permissive.
    if (!Number.isFinite(util)) return null;
    readings.push({ util, mem, temp });
    if (i < CFG.samples - 1) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, CFG.sampleGapMs);
  }
  return {
    maxUtil: Math.max(...readings.map((r) => r.util)),
    memUsedMiB: readings[readings.length - 1].mem,
    tempC: readings[readings.length - 1].temp,
    readings: readings.map((r) => r.util),
  };
}

/** Models currently resident in VRAM, via Ollama's own API. */
async function residentModels() {
  try {
    const res = await fetch('http://localhost:11434/api/ps', { signal: AbortSignal.timeout(8000) });
    // "Nothing resident" and "I could not ask" are the SAME VALUE and OPPOSITE
    // MEANINGS. Returning [] on error made --watch announce "GPU is clear" and
    // exit on a transient blip while 17 GB kept cooking the room. This is the
    // identical error class fixed in spend-ledger.mjs one day earlier — an empty
    // result standing in for an unknown one. Return null for unknown.
    if (!res.ok) return null;
    const body = await res.json();
    return (body?.models ?? [])
      .filter((m) => (m.size_vram ?? 0) > 0)
      .map((m) => ({
        name: m.name,
        vramGiB: Math.round(((m.size_vram ?? 0) / 1024 ** 3) * 10) / 10,
        expiresAt: m.expires_at ?? null,
      }));
  } catch { return null; }
}

const readState = () => {
  try { return JSON.parse(readFileSync(STATE, 'utf-8')); } catch { return {}; }
};
const writeState = (s) => {
  mkdirSync(dirname(STATE), { recursive: true });
  writeFileSync(STATE, JSON.stringify(s, null, 2), 'utf-8');
};

/**
 * One observation. Returns a verdict WITHOUT acting, so --check and --reap share
 * exactly one code path and cannot disagree about what "idle" means.
 */
async function observe() {
  const models = await residentModels();
  const gpu = sampleGpu();
  const now = Date.now();
  const state = readState();

  if (models === null) {
    return { status: 'unknown', models: [], gpu, idleMinutes: 0,
      reason: 'ollama /api/ps unreachable; cannot tell resident from clear' };
  }
  if (!models.length) {
    if (state.idleSince) writeState({});           // nothing resident: forget history
    return { status: 'clear', models, gpu, idleMinutes: 0 };
  }
  if (!gpu) {
    // No usable GPU telemetry. Refuse to guess — never reap blind.
    return { status: 'unknown', models, gpu: null, idleMinutes: 0,
      reason: 'nvidia-smi unavailable; cannot distinguish idle from working' };
  }
  if (gpu.maxUtil >= CFG.busyPercent) {
    writeState({});                                 // any spike resets the clock
    return { status: 'busy', models, gpu, idleMinutes: 0 };
  }

  // THE IDLE CLOCK BELONGS TO A SPECIFIC SET OF MODELS, NOT TO THE GPU.
  // Without this, the normal "swap models between tasks" pattern is a guaranteed
  // eventual kill of live work: model A idles past grace, someone unloads it and
  // loads B, and the very next check reads A's stale `idleSince`, sees B sitting
  // quiet between conversation turns, and reaps B mid-session. The first draft
  // WROTE `firstSeenModels` into the state and then never read it — the fix data
  // was already being recorded and ignored. Any change to the resident set is a
  // new subject, so the clock restarts.
  const fingerprint = models.map((m) => m.name).sort().join('|');
  const sameSubject = state.fingerprint === fingerprint;
  const idleSince = (sameSubject && state.idleSince) ? state.idleSince : now;
  if (!sameSubject || !state.idleSince) writeState({ idleSince, fingerprint });
  const idleMinutes = Math.floor((now - idleSince) / 60000);

  return {
    status: idleMinutes >= CFG.graceMinutes ? 'reapable' : 'idle',
    models, gpu, idleMinutes,
  };
}

function logToHermes(obs, freedGiB) {
  // Inbox convention is <UTC-YYYYMMDDThhmmssZ>-<surface>-<slug>.md — strip the
  // dashes too, or these files sort apart from every other memo in the folder.
  const stamp = `${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
  const path = join(INBOX, `${stamp}-gpu-idle-reaped.md`);
  mkdirSync(INBOX, { recursive: true });
  const lines = [
    '# GPU idle reaper — unloaded an abandoned local model',
    '',
    `**Surface:** local compute / operating cost · **UTC:** ${new Date().toISOString()}`,
    '',
    '## What happened',
    '',
    `Unloaded ${obs.models.length} resident model(s), freeing ~${freedGiB} GiB of VRAM, after`,
    `${obs.idleMinutes} minutes of continuous idleness (grace: ${CFG.graceMinutes} min).`,
    '',
    '| Model | VRAM GiB | Ollama keep-alive expiry |',
    '|---|---|---|',
    ...obs.models.map((m) => `| ${m.name} | ${m.vramGiB} | ${m.expiresAt ?? 'n/a'} |`),
    '',
    `GPU at reap time: max utilisation ${obs.gpu.maxUtil}% across samples ` +
    `[${obs.gpu.readings.join(', ')}], ${obs.gpu.memUsedMiB} MiB used, ${obs.gpu.tempC}°C.`,
    '',
    '## Why this matters',
    '',
    'A resident model draws power and heats the room for as long as Ollama holds it,',
    'whether or not anything is using it. The spend ledger is blind to watts by design,',
    'so without this reaper the only signal is someone noticing the room is hot.',
    '',
    '**If this memo appears often, the fix is upstream, not here:** shorten the Ollama',
    'keep-alive (`OLLAMA_KEEP_ALIVE`, or a per-request `keep_alive`) so models release',
    'themselves, and treat this reaper as the backstop rather than the mechanism.',
    '',
  ];
  writeFileSync(path, lines.join('\n'), 'utf-8');
  return path;
}

async function reap(obs) {
  // TOCTOU GUARD. Sampling took ~3s and shelling out takes more; a job submitted
  // in that gap would be killed mid-first-token. Re-check immediately before
  // acting and abort if anything woke up.
  const recheck = sampleGpu();
  if (recheck && recheck.maxUtil >= CFG.busyPercent) {
    writeState({});
    return { aborted: true, reason: `woke up at ${recheck.maxUtil}% between sampling and stop` };
  }

  const freed = Math.round(obs.models.reduce((s, m) => s + m.vramGiB, 0) * 10) / 10;
  for (const m of obs.models) sh('ollama', ['stop', m.name]);

  // Did the stop actually work? sh() swallows failures, so a failed unload is
  // otherwise indistinguishable from a successful one — and in --watch that
  // silently becomes an infinite reap loop.
  const still = await residentModels();
  if (still.length) {
    return { aborted: true, reason: `ollama stop did not release: ${still.map((m) => m.name).join(', ')}` };
  }

  const memoPath = logToHermes(obs, freed);
  writeState({});
  return { freed, memoPath };
}

const fmt = (obs) => {
  if (obs.status === 'clear') return '[idle-reaper] no models resident — GPU is clear.';
  if (obs.status === 'unknown') return `[idle-reaper] UNKNOWN — ${obs.reason}`;
  const m = obs.models.map((x) => `${x.name} (${x.vramGiB} GiB)`).join(', ');
  if (obs.status === 'busy') return `[idle-reaper] BUSY — ${obs.gpu.maxUtil}% util; leaving ${m} alone.`;
  return `[idle-reaper] ${obs.status.toUpperCase()} — ${m}; ` +
         `${obs.gpu.maxUtil}% util, idle ${obs.idleMinutes}/${CFG.graceMinutes} min.`;
};

const argv = process.argv.slice(2);
const mode = argv.includes('--watch') ? 'watch' : argv.includes('--reap') ? 'reap' : 'check';

try {
  if (mode === 'watch') {
    const deadline = Date.now() + CFG.watchMaxMinutes * 60000;
    let failedReaps = 0;
    for (;;) {
      // The deadline is checked FIRST, every iteration, before any branch can
      // skip it. The first draft put `continue` on the reap path ahead of this
      // check, so a failing `ollama stop` spun forever writing one Hermes memo
      // per pass — the watchdog becoming the runaway it exists to hunt, which
      // its own header claimed to prevent.
      if (Date.now() > deadline) {
        console.log('[idle-reaper] watch ceiling reached — exiting rather than becoming the runaway.');
        break;
      }

      const obs = await observe();
      console.log(fmt(obs));

      if (obs.status === 'clear') { console.log('[idle-reaper] nothing left to watch — exiting.'); break; }

      if (obs.status === 'reapable') {
        const r = await reap(obs);
        if (r.aborted) {
          failedReaps += 1;
          console.log(`[idle-reaper] reap aborted — ${r.reason}`);
          // Never retry a failing unload indefinitely; hand it to a human.
          if (failedReaps >= 3) {
            console.log('[idle-reaper] 3 failed reaps — giving up and exiting. Unload manually.');
            break;
          }
        } else {
          failedReaps = 0;
          console.log(`[idle-reaper] REAPED — freed ~${r.freed} GiB. Logged: ${r.memoPath}`);
        }
      }

      await new Promise((r) => setTimeout(r, CFG.watchIntervalSec * 1000));
    }
  } else {
    const obs = await observe();
    console.log(fmt(obs));
    if (mode === 'reap' && obs.status === 'reapable') {
      const r = await reap(obs);
      if (r.aborted) console.log(`[idle-reaper] reap aborted — ${r.reason}`);
      else console.log(`[idle-reaper] REAPED — freed ~${r.freed} GiB. Logged: ${r.memoPath}`);
    }
  }
  process.exit(0);
} catch (err) {
  // Fail OPEN and quiet. This must never block a turn or kill a session.
  console.error(`[idle-reaper] error, taking no action: ${err?.message}`);
  process.exit(0);
}
