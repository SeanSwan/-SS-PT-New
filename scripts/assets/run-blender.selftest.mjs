#!/usr/bin/env node
/**
 * Contract tests for deterministic Blender discovery and fresh run receipts.
 * These tests avoid launching Blender; the wrapper integration is exercised by CI.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  resolveBlenderTimeoutMs,
  resolveOutputDirectory,
  selectLatestBlenderDirectory,
  verifyFreshSentinel,
} from './run-blender.rules.mjs';

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

check('selects 4.5.13 over lexicographically larger 4.5.9', () => {
  const selected = selectLatestBlenderDirectory([
    'blender-4.5.9-windows-x64',
    'blender-4.5.13-windows-x64',
    'blender-4.5.2-windows-x64',
    'blender-5.2.1-windows-x64',
  ]);
  if (selected !== 'blender-4.5.13-windows-x64') throw new Error(`selected ${selected}`);
});

check('ignores malformed and non-4.5 install directories', () => {
  const selected = selectLatestBlenderDirectory([
    'blender-4.4.20-windows-x64',
    'blender-4.5-preview-windows-x64',
    'blender-4.5.7-windows-x64',
  ]);
  if (selected !== 'blender-4.5.7-windows-x64') throw new Error(`selected ${selected}`);
});

check('uses a 30-minute default Blender timeout', () => {
  const timeout = resolveBlenderTimeoutMs(undefined);
  if (timeout !== 30 * 60 * 1000) throw new Error(`received ${timeout}`);
});

check('accepts an explicit bounded timeout', () => {
  const timeout = resolveBlenderTimeoutMs('120000');
  if (timeout !== 120000) throw new Error(`received ${timeout}`);
});

check('rejects unsafe timeout values', () => {
  for (const value of ['0', '59999', 'not-a-number', '21600001']) {
    let rejected = false;
    try {
      resolveBlenderTimeoutMs(value);
    } catch (error) {
      rejected = /timeout/i.test(error.message);
    }
    if (!rejected) throw new Error(`accepted ${value}`);
  }
});

check('finds the output directory in Blender script arguments', () => {
  const outputDirectory = resolveOutputDirectory(['swan_pipe.py', '--', '--in', 'source.obj', '--out', 'build/enemy']);
  if (outputDirectory !== 'build/enemy') throw new Error(`received ${outputDirectory}`);
});

check('rejects runs that cannot verify an output receipt', () => {
  for (const args of [['swan_pipe.py'], ['swan_pipe.py', '--', '--out'], ['swan_pipe.py', '--', '--out', '--force']]) {
    let rejected = false;
    try {
      resolveOutputDirectory(args);
    } catch (error) {
      rejected = /--out <dir>/.test(error.message);
    }
    if (!rejected) throw new Error(`accepted ${JSON.stringify(args)}`);
  }
});

const fixtureDir = join(tmpdir(), `swan-blender-runner-${process.pid}`);
const sentinelPath = join(fixtureDir, '.swan-pipe.ok');
mkdirSync(fixtureDir, { recursive: true });

try {
  check('accepts a matching run receipt', () => {
    writeFileSync(sentinelPath, JSON.stringify({ runId: 'run-current', completedAt: '2026-08-31T00:00:00Z' }));
    const receipt = verifyFreshSentinel(sentinelPath, 'run-current');
    if (receipt.runId !== 'run-current') throw new Error('receipt run id changed');
  });

  check('rejects a stale receipt from another run', () => {
    writeFileSync(sentinelPath, JSON.stringify({ runId: 'run-old', completedAt: '2026-08-30T00:00:00Z' }));
    let rejected = false;
    try {
      verifyFreshSentinel(sentinelPath, 'run-current');
    } catch (error) {
      rejected = /run id mismatch/i.test(error.message);
    }
    if (!rejected) throw new Error('stale receipt was accepted');
  });

  check('rejects legacy marker-only sentinels', () => {
    writeFileSync(sentinelPath, 'ok\n');
    let rejected = false;
    try {
      verifyFreshSentinel(sentinelPath, 'run-current');
    } catch (error) {
      rejected = /valid json/i.test(error.message);
    }
    if (!rejected) throw new Error('legacy marker was accepted');
  });
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}

console.log(`${passed}/${passed + failed} checks passed`);
process.exit(failed === 0 ? 0 : 1);
