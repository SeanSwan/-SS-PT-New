/**
 * Video Job Queue Service — BullMQ-based background processing
 * =============================================================
 *
 * Architecture:
 *   [API Route] --addJob()--> [BullMQ Queue (Redis)] --Worker--> [Job Processors]
 *
 * Leader Election:
 *   Uses Redis SETNX for distributed leader lock so only ONE Render instance
 *   runs the worker. Heartbeat refreshes the lock atomically via Lua script.
 *   On SIGTERM the lock is released so another instance can pick up immediately.
 *
 * Graceful Degradation:
 *   If bullmq is not installed, all exports resolve to no-ops / null so the
 *   rest of the backend boots without error.
 *
 * Job Types:
 *   youtube_import   — Import a new YouTube video into the library
 *   youtube_sync     — Re-sync metadata / thumbnail for existing video
 *   analytics_rollup — Aggregate view/engagement analytics
 *   backfill         — Backfill missing metadata across the library
 *   checksum_verify  — Verify content checksums for integrity
 *   draft_cleanup    — Purge stale draft videos past retention window
 */

import logger from '../utils/logger.mjs';
import crypto from 'crypto';
import Redis from 'ioredis';

// ---------------------------------------------------------------------------
// Lazy-loaded BullMQ imports — gracefully degrades when package is missing
// ---------------------------------------------------------------------------
let Queue, Worker;
try {
  const bullmq = await import('bullmq');
  Queue = bullmq.Queue;
  Worker = bullmq.Worker;
} catch (err) {
  logger.warn(
    'BullMQ not installed — video job queue disabled. Install with: npm install bullmq'
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const QUEUE_NAME = 'swanstudios:video-jobs';
const LOCK_KEY = 'swanstudios:video-worker-leader';
const LOCK_TTL = 30; // seconds
const REFRESH_INTERVAL = 15000; // ms — must be < LOCK_TTL * 1000

// Lua script: atomically refresh the lock ONLY if we still own it
const LUA_REFRESH = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  redis.call('EXPIRE', KEYS[1], ARGV[2])
  return 1
end
return 0
`;

// Lua script: atomically release the lock ONLY if we still own it
const LUA_RELEASE = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

// ---------------------------------------------------------------------------
// Valid job types (used for input validation)
// ---------------------------------------------------------------------------
const VALID_JOB_TYPES = new Set([
  'youtube_import',
  'youtube_sync',
  'analytics_rollup',
  'backfill',
  'checksum_verify',
  'draft_cleanup',
]);

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------
let queue = null;
let worker = null;
let redisClient = null;
let instanceId = null;
let heartbeatInterval = null;
let isLeader = false;

// ---------------------------------------------------------------------------
// Job Processors (stubs — real implementations wired in later)
// ---------------------------------------------------------------------------

async function processYoutubeImport(job) {
  logger.info(`[video-queue] youtube_import job received — id=${job.id}`, {
    data: job.data,
  });
  // TODO: Implement YouTube import pipeline (fetch metadata, download thumbnail, create DB record)
  return { status: 'completed', jobId: job.id };
}

async function processYoutubeSync(job) {
  logger.info(`[video-queue] youtube_sync job received — id=${job.id}`, {
    data: job.data,
  });
  // TODO: Implement YouTube re-sync (update title, description, thumbnail, duration)
  return { status: 'completed', jobId: job.id };
}

async function processAnalyticsRollup(job) {
  logger.info(`[video-queue] analytics_rollup job received — id=${job.id}`, {
    data: job.data,
  });
  // TODO: Implement analytics aggregation (roll up view counts, watch time, engagement)
  return { status: 'completed', jobId: job.id };
}

async function processBackfill(job) {
  logger.info(`[video-queue] backfill job received — id=${job.id}`, {
    data: job.data,
  });
  // TODO: Implement metadata backfill across video library
  return { status: 'completed', jobId: job.id };
}

async function processChecksumVerify(job) {
  logger.info(`[video-queue] checksum_verify job received — id=${job.id}`, {
    data: job.data,
  });
  // TODO: Implement checksum verification
  //   1. Fetch the stored checksum from the Video record
  //   2. Re-download / stream the source and compute SHA-256
  //   3. Compare and flag mismatches via notification service
  //   4. Update lastVerifiedAt timestamp on the Video record
  return { status: 'completed', jobId: job.id };
}

async function processDraftCleanup(job) {
  logger.info(`[video-queue] draft_cleanup job received — id=${job.id}`, {
    data: job.data,
  });
  // TODO: Implement draft cleanup (delete drafts older than retention window)
  return { status: 'completed', jobId: job.id };
}

/** Route a job to the correct processor by type */
async function routeJob(job) {
  switch (job.name) {
    case 'youtube_import':
      return processYoutubeImport(job);
    case 'youtube_sync':
      return processYoutubeSync(job);
    case 'analytics_rollup':
      return processAnalyticsRollup(job);
    case 'backfill':
      return processBackfill(job);
    case 'checksum_verify':
      return processChecksumVerify(job);
    case 'draft_cleanup':
      return processDraftCleanup(job);
    default:
      logger.warn(`[video-queue] Unknown job type: ${job.name}`, {
        jobId: job.id,
      });
      throw new Error(`Unknown video job type: ${job.name}`);
  }
}

// ---------------------------------------------------------------------------
// Leader Lock helpers
// ---------------------------------------------------------------------------

/**
 * Attempt to acquire the leader lock via Redis SETNX.
 * @param {import('ioredis').Redis} redis
 * @returns {Promise<boolean>}
 */
async function acquireLeaderLock(redis) {
  // SET key value NX EX ttl — returns 'OK' on success, null if key exists
  const result = await redis.set(LOCK_KEY, instanceId, 'NX', 'EX', LOCK_TTL);
  return result === 'OK';
}

/**
 * Refresh the leader lock (only if we still own it).
 * @param {import('ioredis').Redis} redis
 * @returns {Promise<boolean>}
 */
async function refreshLeaderLock(redis) {
  const result = await redis.eval(LUA_REFRESH, 1, LOCK_KEY, instanceId, LOCK_TTL);
  return result === 1;
}

/**
 * Release the leader lock (only if we still own it).
 * @param {import('ioredis').Redis} redis
 * @returns {Promise<boolean>}
 */
async function releaseLeaderLock(redis) {
  const result = await redis.eval(LUA_RELEASE, 1, LOCK_KEY, instanceId);
  return result === 1;
}

// ---------------------------------------------------------------------------
// Heartbeat
// ---------------------------------------------------------------------------

function startHeartbeat(redis) {
  heartbeatInterval = setInterval(async () => {
    try {
      const refreshed = await refreshLeaderLock(redis);
      if (!refreshed) {
        logger.warn(
          '[video-queue] Lost leader lock — another instance may have taken over. Stopping worker.'
        );
        isLeader = false;
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
        if (worker) {
          await worker.close();
          worker = null;
        }
      }
    } catch (err) {
      logger.error('[video-queue] Heartbeat refresh failed:', err);
    }
  }, REFRESH_INTERVAL);
}

// ---------------------------------------------------------------------------
// Worker startup
// ---------------------------------------------------------------------------

function startWorker(redisConnection) {
  if (!Worker) return null;

  const w = new Worker(QUEUE_NAME, routeJob, {
    connection: redisConnection,
    concurrency: 3,
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  });

  w.on('completed', (job, result) => {
    logger.info(`[video-queue] Job completed — id=${job.id} type=${job.name}`, {
      result,
    });
  });

  w.on('failed', (job, err) => {
    logger.error(
      `[video-queue] Job failed — id=${job?.id} type=${job?.name}: ${err.message}`,
      { error: err }
    );
  });

  w.on('error', (err) => {
    logger.error('[video-queue] Worker error:', err);
  });

  logger.info('[video-queue] Worker started — processing jobs');
  return w;
}

// ---------------------------------------------------------------------------
// SIGTERM handler
// ---------------------------------------------------------------------------

function registerShutdownHandler(redis) {
  const shutdown = async () => {
    logger.info('[video-queue] SIGTERM received — releasing leader lock and stopping worker');

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    if (isLeader && redis) {
      try {
        const released = await releaseLeaderLock(redis);
        logger.info(
          `[video-queue] Leader lock ${released ? 'released' : 'already expired'}`
        );
      } catch (err) {
        logger.error('[video-queue] Failed to release leader lock on shutdown:', err);
      }
    }

    if (worker) {
      try {
        await worker.close();
        logger.info('[video-queue] Worker closed');
      } catch (err) {
        logger.error('[video-queue] Error closing worker:', err);
      }
      worker = null;
    }

    if (queue) {
      try {
        await queue.close();
        logger.info('[video-queue] Queue closed');
      } catch (err) {
        logger.error('[video-queue] Error closing queue:', err);
      }
      queue = null;
    }

    isLeader = false;
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize the video job queue and attempt to become the leader worker.
 *
 * @param {Object} [redisConnection] — Optional ioredis connection config or instance.
 *   If omitted, a new connection is created from REDIS_URL env var.
 * @returns {Promise<{ queue: Object|null, isLeader: boolean }>}
 */
export async function initVideoJobQueue(redisConnection) {
  if (!Queue || !Worker) {
    logger.warn(
      '[video-queue] BullMQ not available — skipping queue initialization'
    );
    return { queue: null, isLeader: false };
  }

  try {
    // Build Redis connection for BullMQ
    let bullmqConnection;

    if (redisConnection && typeof redisConnection === 'object' && redisConnection.constructor?.name === 'Redis') {
      // Caller passed an existing ioredis instance — duplicate it for BullMQ
      // (BullMQ manages its own connections internally)
      bullmqConnection = redisConnection.options;
      redisClient = redisConnection;
    } else if (redisConnection && typeof redisConnection === 'object') {
      // Caller passed a config object
      bullmqConnection = redisConnection;
      redisClient = new Redis(redisConnection);
    } else if (process.env.REDIS_URL) {
      // Default: use REDIS_URL
      bullmqConnection = {
        url: process.env.REDIS_URL,
        maxRetriesPerRequest: null, // BullMQ requirement
        enableReadyCheck: false,
      };
      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
      });
      await redisClient.connect();
    } else {
      logger.warn(
        '[video-queue] No REDIS_URL configured — skipping queue initialization'
      );
      return { queue: null, isLeader: false };
    }

    // Generate a unique instance ID for leader election
    instanceId = crypto.randomUUID();
    logger.info(`[video-queue] Instance ID: ${instanceId}`);

    // Create BullMQ Queue
    queue = new Queue(QUEUE_NAME, {
      connection: bullmqConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 200 },
      },
    });

    logger.info(`[video-queue] Queue "${QUEUE_NAME}" created`);

    // Attempt leader lock
    const acquired = await acquireLeaderLock(redisClient);
    isLeader = acquired;

    if (isLeader) {
      logger.info('[video-queue] Acquired leader lock — starting worker');
      worker = startWorker(bullmqConnection);
      startHeartbeat(redisClient);
    } else {
      logger.info(
        '[video-queue] Another instance holds the leader lock — running in queue-only mode (no worker)'
      );
    }

    // Register graceful shutdown
    registerShutdownHandler(redisClient);

    return { queue, isLeader };
  } catch (err) {
    logger.error('[video-queue] Failed to initialize video job queue:', err);
    return { queue: null, isLeader: false };
  }
}

/**
 * Add a job to the video processing queue.
 *
 * @param {string} jobType — One of: youtube_import, youtube_sync, analytics_rollup,
 *                           backfill, checksum_verify, draft_cleanup
 * @param {Object} payload — Job-specific data
 * @param {Object} [opts]  — BullMQ job options override (delay, priority, etc.)
 * @returns {Promise<Object|null>} The BullMQ Job object, or null if queue is unavailable
 */
export async function addJob(jobType, payload, opts = {}) {
  if (!queue) {
    logger.warn(
      `[video-queue] Cannot add job "${jobType}" — queue not initialized`
    );
    return null;
  }

  if (!VALID_JOB_TYPES.has(jobType)) {
    logger.error(
      `[video-queue] Invalid job type "${jobType}". Valid types: ${[...VALID_JOB_TYPES].join(', ')}`
    );
    return null;
  }

  try {
    const job = await queue.add(jobType, payload, {
      ...opts,
    });

    logger.info(`[video-queue] Job enqueued — id=${job.id} type=${jobType}`);
    return job;
  } catch (err) {
    logger.error(`[video-queue] Failed to enqueue job "${jobType}":`, err);
    return null;
  }
}

/**
 * Returns the underlying BullMQ Queue instance for advanced usage
 * (e.g., repeatable jobs, queue events, metrics).
 *
 * @returns {Object|null} The BullMQ Queue instance, or null if unavailable
 */
export function getVideoJobQueue() {
  return queue;
}
