#!/usr/bin/env node
/** Contract tests for the Khronos glTF validator wrapper. */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateGltfFile } from './validate-gltf.mjs';

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

await check('accepts the checked-in Fryling LOD0 GLB', async () => {
  const assetPath = fileURLToPath(new URL('../../assets/runtime/enemy/fryling/lod0.glb', import.meta.url));
  const report = await validateGltfFile(assetPath);
  if (report.errors !== 0) throw new Error(`validator returned ${report.errors} error(s)`);
});

await check('classifies unreadable input as an instrument failure', async () => {
  const report = await validateGltfFile(join(tmpdir(), `missing-${process.pid}.glb`));
  if (!report.instrumentFailure) throw new Error('missing file was treated as an asset defect');
  if (report.messages[0]?.code !== 'INPUT_READ_FAILURE') {
    throw new Error(`unexpected failure code ${report.messages[0]?.code}`);
  }
});

const fixtureDir = join(tmpdir(), `swan-gltf-validator-${process.pid}`);
const brokenPath = join(fixtureDir, 'broken.glb');
mkdirSync(fixtureDir, { recursive: true });
writeFileSync(brokenPath, Buffer.from('not a glb'));

try {
  await check('rejects malformed GLB bytes', async () => {
    const report = await validateGltfFile(brokenPath);
    if (report.errors === 0) throw new Error('malformed file was accepted');
  });
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}

console.log(`${passed}/${passed + failed} checks passed`);
process.exit(failed === 0 ? 0 : 1);
