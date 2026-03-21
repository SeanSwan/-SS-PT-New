/**
 * AI Village Service — Programmatic Access to 11-Brain Validation
 * ================================================================
 * Wraps the CLI validation-orchestrator.mjs for in-app triggering.
 * Runs validation as a child process; reads reports from filesystem.
 *
 * Architecture:
 *   - Validation runs async (child process, not blocking event loop)
 *   - In-memory job tracking (same pattern as debate engine)
 *   - Reports read from AI-Village-Documentation/validation-prompts/
 *   - Admin-only RBAC (enforced at route layer)
 *
 * NO BullMQ/Redis dependency — runs in-process like debates.
 */
import { execFile } from 'child_process';
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';
import logger from '../../utils/logger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const ROOT = resolve(__dirname, '..', '..', '..');

const ORCHESTRATOR_PATH = join(ROOT, 'scripts', 'validation-orchestrator.mjs');
const REPORTS_DIR = join(ROOT, 'AI-Village-Documentation', 'validation-prompts');
const LATEST_DIR = join(REPORTS_DIR, 'latest');
const ARCHIVE_DIR = join(REPORTS_DIR, 'archive');

// ── Validation Job Store ────────────────────────────────────────────────────

const JOB_STATES = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETE: 'complete',
  FAILED: 'failed',
};

const activeJobs = new Map();

// Cleanup completed jobs after 1 hour
const cleanupTimer = setInterval(() => {
  const threshold = Date.now() - 60 * 60 * 1000;
  for (const [id, job] of activeJobs.entries()) {
    if (job.completedAt && job.completedAt < threshold) {
      activeJobs.delete(id);
    }
  }
}, 5 * 60 * 1000);
cleanupTimer.unref();

// ── Job Management ──────────────────────────────────────────────────────────

/**
 * Start a new validation run asynchronously.
 * Returns jobId immediately; poll getValidationStatus() for progress.
 *
 * @param {Object} options
 * @param {string[]} [options.files] - Specific files to validate
 * @param {string} [options.since] - Time range (e.g., '2h', '24h')
 * @param {boolean} [options.staged] - Validate staged changes only
 * @param {number} userId - Requesting user ID
 * @returns {string} jobId
 */
export function startValidation(options = {}, userId) {
  // Prevent concurrent runs (check both PENDING and RUNNING)
  for (const job of activeJobs.values()) {
    if (job.state === JOB_STATES.RUNNING || job.state === JOB_STATES.PENDING) {
      throw new Error('A validation is already in progress. Wait for it to complete.');
    }
  }

  const jobId = `val_${randomBytes(8).toString('hex')}`;

  const job = {
    id: jobId,
    state: JOB_STATES.PENDING,
    userId,
    options,
    startedAt: null,
    completedAt: null,
    output: '',
    error: null,
    exitCode: null,
    summary: null,
  };

  activeJobs.set(jobId, job);

  // Run async (don't block)
  runValidation(job).catch(err => {
    logger.error('[AIVillage] Unhandled validation error', { jobId, error: err.message });
    job.state = JOB_STATES.FAILED;
    job.error = err.message;
    job.completedAt = Date.now();
  });

  return jobId;
}

/**
 * Execute validation as child process.
 * @param {Object} job
 */
async function runValidation(job) {
  job.state = JOB_STATES.RUNNING;
  job.startedAt = Date.now();

  const args = [];
  if (job.options.files?.length) {
    args.push('--files', job.options.files.join(','));
  } else if (job.options.since) {
    args.push('--since', job.options.since);
  } else if (job.options.staged) {
    args.push('--staged');
  }
  // Default: orchestrator uses --since 2h

  logger.info('[AIVillage] Starting validation', {
    jobId: job.id,
    userId: job.userId,
    args,
  });

  return new Promise((resolvePromise) => {
    const child = execFile('node', [ORCHESTRATOR_PATH, ...args], {
      cwd: ROOT,
      timeout: 10 * 60 * 1000, // 10 minute max
      maxBuffer: 5 * 1024 * 1024, // 5MB output buffer
      env: { ...process.env },
    }, (error, stdout, stderr) => {
      job.output = stdout || '';
      job.completedAt = Date.now();

      if (error) {
        job.state = JOB_STATES.FAILED;
        job.error = error.message;
        job.exitCode = error.code || 1;
        logger.error('[AIVillage] Validation failed', {
          jobId: job.id,
          error: error.message,
          exitCode: job.exitCode,
          stderr: (stderr || '').slice(0, 500),
        });
      } else {
        job.state = JOB_STATES.COMPLETE;
        job.exitCode = 0;
        // Parse summary from latest reports
        try {
          job.summary = readLatestSummary();
        } catch {
          job.summary = null;
        }
        logger.info('[AIVillage] Validation complete', {
          jobId: job.id,
          durationMs: job.completedAt - job.startedAt,
        });
      }

      resolvePromise();
    });

    // Capture live output for progress streaming (capped at 5MB)
    const MAX_OUTPUT_SIZE = 5 * 1024 * 1024;
    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        if (job.output.length < MAX_OUTPUT_SIZE) {
          job.output += chunk.toString();
        }
      });
    }
    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        if (job.output.length < MAX_OUTPUT_SIZE) {
          job.output += chunk.toString();
        }
      });
    }
  });
}

// ── Job Queries ─────────────────────────────────────────────────────────────

/**
 * Get validation job status.
 * @param {string} jobId
 * @returns {Object|null}
 */
export function getValidationStatus(jobId) {
  const job = activeJobs.get(jobId);
  if (!job) return null;

  return {
    id: job.id,
    state: job.state,
    userId: job.userId,
    options: job.options,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    durationMs: job.completedAt ? job.completedAt - job.startedAt : (job.startedAt ? Date.now() - job.startedAt : null),
    exitCode: job.exitCode,
    error: job.error,
    outputLength: job.output.length,
    hasSummary: !!job.summary,
  };
}

/**
 * Get validation output with offset-based delta streaming.
 * Returns only new output since the given offset (character position).
 *
 * @param {string} jobId
 * @param {number} [offset=0] - Character position to start from
 * @returns {{ text: string, totalLength: number, state: string, hasMore: boolean }|null}
 */
export function getValidationOutput(jobId, offset = 0) {
  const job = activeJobs.get(jobId);
  if (!job) return null;

  const fullOutput = job.output;
  const requestedOutput = offset < fullOutput.length ? fullOutput.slice(offset) : '';

  return {
    text: requestedOutput,
    totalLength: fullOutput.length,
    state: job.state,
    hasMore: job.state === JOB_STATES.RUNNING || job.state === JOB_STATES.PENDING,
  };
}

/**
 * Check if any validation is currently running.
 * @returns {{ running: boolean, jobId: string|null }}
 */
export function isValidationRunning() {
  for (const job of activeJobs.values()) {
    if (job.state === JOB_STATES.RUNNING) {
      return { running: true, jobId: job.id };
    }
  }
  return { running: false, jobId: null };
}

// ── Report Reading ──────────────────────────────────────────────────────────

const REPORT_FILES = [
  'summary.md',
  '01-ux-accessibility.md',
  '02-code-quality.md',
  '03-security.md',
  '04-performance.md',
  '05-competitive-intel.md',
  '06-user-research.md',
  '07-architecture-bugs.md',
  '08-code-quality-debate.md',
  '09-design-debate.md',
  'debate-log.md',
  'design-debate-log.md',
  'fix-instructions.md',
  'design-recommendations.md',
  'data-safety-integrity.md',
  'frontend-ux-code-patterns.md',
];

/**
 * Read the latest summary report.
 * @returns {string} Markdown content
 */
function readLatestSummary() {
  const path = join(LATEST_DIR, 'summary.md');
  if (!existsSync(path)) throw new Error('No latest summary found');
  return readFileSync(path, 'utf-8');
}

/**
 * Read the latest validation report (all files or specific track).
 *
 * @param {string} [track] - Optional track filename (e.g., '01-ux-accessibility.md')
 * @returns {{ summary: string, reports: Object<string, string>, timestamp: string|null }}
 */
export function readLatestReport(track) {
  if (!existsSync(LATEST_DIR)) {
    return { summary: null, reports: {}, timestamp: null };
  }

  // Get timestamp from summary header if available
  let timestamp = null;
  try {
    const summary = readFileSync(join(LATEST_DIR, 'summary.md'), 'utf-8');
    const match = summary.match(/# Validation Summary — (.+)/);
    if (match) timestamp = match[1].trim();
  } catch { /* ignore */ }

  if (track) {
    // Return specific track
    const filePath = join(LATEST_DIR, track);
    if (!existsSync(filePath)) {
      return { summary: null, reports: {}, timestamp, error: `Track not found: ${track}` };
    }
    return {
      summary: null,
      reports: { [track]: readFileSync(filePath, 'utf-8') },
      timestamp,
    };
  }

  // Return all reports
  const reports = {};
  for (const file of REPORT_FILES) {
    const filePath = join(LATEST_DIR, file);
    if (existsSync(filePath)) {
      reports[file] = readFileSync(filePath, 'utf-8');
    }
  }

  return {
    summary: reports['summary.md'] || null,
    reports,
    timestamp,
  };
}

/**
 * List archived validation runs.
 * @returns {Array<{ timestamp: string, date: Date|null, fileCount: number }>}
 */
export function listArchiveRuns() {
  if (!existsSync(ARCHIVE_DIR)) return [];

  try {
    return readdirSync(ARCHIVE_DIR)
      .filter(name => {
        const fullPath = join(ARCHIVE_DIR, name);
        return existsSync(fullPath) && statSync(fullPath).isDirectory();
      })
      .map(name => {
        const dirPath = join(ARCHIVE_DIR, name);
        const files = readdirSync(dirPath).filter(f => f.endsWith('.md'));
        // Parse timestamp from directory name (e.g., 2026-03-20T08-49-00)
        const parsed = name.replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3');
        let date = null;
        try { date = new Date(parsed).toISOString(); } catch { /* ignore */ }

        return {
          timestamp: name,
          date,
          fileCount: files.length,
        };
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (err) {
    logger.warn('[AIVillage] Failed to list archive', { error: err.message });
    return [];
  }
}

/**
 * Read a specific archived report.
 *
 * @param {string} timestamp - Archive directory name (e.g., '2026-03-20T08-49-00')
 * @param {string} [track] - Optional specific track
 * @returns {{ reports: Object<string, string>, timestamp: string }}
 */
export function readArchivedReport(timestamp, track) {
  // Sanitize timestamp to prevent directory traversal
  const sanitized = timestamp.replace(/[^a-zA-Z0-9T-]/g, '');
  const dirPath = join(ARCHIVE_DIR, sanitized);

  if (!existsSync(dirPath) || !statSync(dirPath).isDirectory()) {
    return { reports: {}, timestamp: sanitized, error: 'Archive not found' };
  }

  if (track) {
    const filePath = join(dirPath, track);
    if (!existsSync(filePath)) {
      return { reports: {}, timestamp: sanitized, error: `Track not found: ${track}` };
    }
    return {
      reports: { [track]: readFileSync(filePath, 'utf-8') },
      timestamp: sanitized,
    };
  }

  const reports = {};
  const files = readdirSync(dirPath).filter(f => f.endsWith('.md'));
  for (const file of files) {
    reports[file] = readFileSync(join(dirPath, file), 'utf-8');
  }

  return { reports, timestamp: sanitized };
}

/**
 * Health check: are the required API keys configured?
 * @returns {{ ready: boolean, openRouter: boolean, gemini: boolean, latestRun: string|null }}
 */
export function getVillageHealth() {
  const openRouter = !!process.env.OPENROUTER_API_KEY;
  const gemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  const { running, jobId } = isValidationRunning();

  let latestRun = null;
  try {
    const { timestamp } = readLatestReport();
    latestRun = timestamp;
  } catch { /* ignore */ }

  return {
    ready: openRouter, // Minimum: OpenRouter for Phase 1
    openRouter,
    gemini,
    debatesEnabled: gemini,
    orchestratorExists: existsSync(ORCHESTRATOR_PATH),
    running,
    activeJobId: jobId,
    latestRun,
    archiveCount: listArchiveRuns().length,
  };
}
