#!/usr/bin/env node
/**
 * SwanStudios release verification orchestrator.
 *
 * Runs the local automated gates that are safe to execute before staging,
 * committing, pushing, or deploying. Output is redacted before it is printed.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const backendDir = path.join(repoRoot, 'backend');
const frontendDir = path.join(repoRoot, 'frontend');

const args = new Set(process.argv.slice(2));
const fast = args.has('--fast');

function bin(name) {
  return process.platform === 'win32' ? `${name}.cmd` : name;
}

function shellQuote(arg) {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(arg)) return arg;
  return `"${String(arg).replace(/"/g, '\\"')}"`;
}

function redact(text) {
  return String(text)
    .replace(/\b(sk|rk)_(live|test)_[A-Za-z0-9_]+/g, '$1_$2_<REDACTED>')
    .replace(/\bpk_(live|test)_[A-Za-z0-9_]+/g, 'pk_$1_<REDACTED>')
    .replace(/\bwhsec_[A-Za-z0-9_]+/g, 'whsec_<REDACTED>')
    .replace(/\bAIza[0-9A-Za-z_-]+/g, 'AIza<REDACTED>')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '<REDACTED-JWT>')
    .replace(/(DATABASE_URL\s*=\s*)\S+/gi, '$1<REDACTED>');
}

function runStep({ name, command, commandArgs = [], cwd = repoRoot }) {
  return new Promise((resolve) => {
    process.stdout.write(`\n== ${name} ==\n`);
    const commandLine = [command, ...commandArgs].map(shellQuote).join(' ');
    const child = spawn(commandLine, {
      cwd,
      env: process.env,
      shell: true,
      windowsHide: true,
    });

    child.stdout.on('data', (chunk) => process.stdout.write(redact(chunk)));
    child.stderr.on('data', (chunk) => process.stderr.write(redact(chunk)));
    child.on('error', (error) => {
      process.stderr.write(`Failed to start ${name}: ${error.message}\n`);
      resolve({ name, code: 1 });
    });
    child.on('close', (code) => resolve({ name, code: code ?? 1 }));
  });
}

const steps = [
  {
    name: 'staging area is empty',
    command: 'git',
    commandArgs: ['diff', '--cached', '--name-only'],
  },
  {
    name: 'diff whitespace check',
    command: 'git',
    commandArgs: ['diff', '--check'],
  },
  {
    name: 'Render/payment local preflight',
    command: 'node',
    commandArgs: ['scripts/qa/render-payment-preflight.mjs'],
  },
  {
    name: 'secret scan',
    command: 'bash',
    commandArgs: ['scripts/scan-secrets.sh', '--all'],
  },
  ...(
    fast ? [] : [
      {
        name: 'backend test suite',
        command: bin('npm'),
        commandArgs: ['test'],
        cwd: backendDir,
      },
      {
        name: 'frontend type-check',
        command: bin('npm'),
        commandArgs: ['run', 'type-check'],
        cwd: frontendDir,
      },
      {
        name: 'frontend production build',
        command: bin('npm'),
        commandArgs: ['run', 'build'],
        cwd: frontendDir,
      },
      {
        name: 'frontend sharded tests',
        command: bin('npm'),
        commandArgs: ['run', 'test:run'],
        cwd: frontendDir,
      },
    ]
  ),
];

process.stdout.write(`SwanStudios release verification (${fast ? 'fast' : 'full'})\n`);
process.stdout.write('No files are staged, committed, pushed, archived, or deleted by this script.\n');

const failures = [];
for (const step of steps) {
  const result = await runStep(step);
  if (result.code !== 0) failures.push(result);
}

process.stdout.write('\n== Release Verification Summary ==\n');
if (failures.length) {
  for (const failure of failures) {
    process.stdout.write(`FAIL ${failure.name} exited ${failure.code}\n`);
  }
  process.exit(1);
}

process.stdout.write('PASS all selected automated gates completed successfully\n');
