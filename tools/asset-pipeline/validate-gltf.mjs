#!/usr/bin/env node
/**
 * Deterministic wrapper around KhronosGroup/glTF-Validator.
 * Exit 0 means every supplied GLB has zero specification errors.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import validator from 'gltf-validator';

export async function validateGltfFile(filePath) {
  const absolutePath = resolve(filePath);
  let bytes;
  try {
    bytes = new Uint8Array(await readFile(absolutePath));
  } catch (error) {
    return {
      path: absolutePath,
      errors: 0,
      warnings: 0,
      messages: [{ severity: 0, code: 'INPUT_READ_FAILURE', message: error.message }],
      report: null,
      instrumentFailure: true,
    };
  }

  try {
    const report = await validator.validateBytes(bytes, { uri: absolutePath });
    return {
      path: absolutePath,
      errors: report.issues?.numErrors ?? 0,
      warnings: report.issues?.numWarnings ?? 0,
      messages: report.issues?.messages ?? [],
      report,
      instrumentFailure: false,
    };
  } catch (error) {
    return {
      path: absolutePath,
      errors: 1,
      warnings: 0,
      messages: [{ severity: 0, code: 'INVALID_GLTF', message: error.message }],
      report: null,
      instrumentFailure: false,
    };
  }
}

async function main(paths) {
  if (paths.length === 0) {
    console.error('usage: node tools/asset-pipeline/validate-gltf.mjs <file.glb> [...]');
    return 2;
  }

  let errorCount = 0;
  let instrumentFailure = false;
  for (const filePath of paths) {
    const result = await validateGltfFile(filePath);
    errorCount += result.errors;
    instrumentFailure ||= result.instrumentFailure;
    const status = result.instrumentFailure ? 'ERROR' : result.errors === 0 ? 'PASS' : 'FAIL';
    console.log(`${status} ${filePath} — ${result.errors} error(s), ${result.warnings} warning(s)`);
    for (const issue of result.messages.filter((message) => message.severity === 0)) {
      console.error(`  ${issue.code ?? 'ERROR'}: ${issue.message}`);
    }
  }
  if (instrumentFailure) return 2;
  return errorCount === 0 ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
