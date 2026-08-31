/**
 * Pure rules used by run-blender.mjs and its contract tests.
 * Production Blender stays pinned to the 4.5 LTS line; newer majors are compatibility probes.
 */
import { readFileSync } from 'node:fs';

const BLENDER_LTS_PATTERN = /^blender-(4)\.(5)\.(\d+)-windows-x64$/;
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
const MIN_TIMEOUT_MS = 60 * 1000;
const MAX_TIMEOUT_MS = 6 * 60 * 60 * 1000;

export function selectLatestBlenderDirectory(directoryNames) {
  return directoryNames
    .map((name) => {
      const match = BLENDER_LTS_PATTERN.exec(name);
      return match ? { name, patch: Number(match[3]) } : null;
    })
    .filter(Boolean)
    .sort((left, right) => left.patch - right.patch)
    .at(-1)?.name ?? null;
}

export function resolveBlenderTimeoutMs(rawValue) {
  if (rawValue === undefined || rawValue === '') return DEFAULT_TIMEOUT_MS;
  const timeoutMs = Number(rawValue);
  if (!Number.isInteger(timeoutMs) || timeoutMs < MIN_TIMEOUT_MS || timeoutMs > MAX_TIMEOUT_MS) {
    throw new Error(`Blender timeout must be an integer from ${MIN_TIMEOUT_MS} to ${MAX_TIMEOUT_MS} ms`);
  }
  return timeoutMs;
}

export function resolveOutputDirectory(argv) {
  const outputIndex = argv.indexOf('--out');
  const outputDirectory = outputIndex >= 0 ? argv[outputIndex + 1] : null;
  if (!outputDirectory || outputDirectory.startsWith('--')) {
    throw new Error('script arguments must include --out <dir> so the success receipt can be verified');
  }
  return outputDirectory;
}

export function verifyFreshSentinel(sentinelPath, expectedRunId) {
  let receipt;
  try {
    receipt = JSON.parse(readFileSync(sentinelPath, 'utf8'));
  } catch (error) {
    throw new Error(`success sentinel is not valid JSON: ${error.message}`);
  }
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    throw new Error('success sentinel is not a JSON object');
  }
  if (receipt.runId !== expectedRunId) {
    throw new Error(`success sentinel run id mismatch: expected ${expectedRunId}, received ${receipt.runId ?? '<missing>'}`);
  }
  if (typeof receipt.completedAt !== 'string' || Number.isNaN(Date.parse(receipt.completedAt))) {
    throw new Error('success sentinel has no valid completedAt timestamp');
  }
  return receipt;
}
