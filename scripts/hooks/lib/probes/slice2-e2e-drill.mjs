/**
 * End-to-end drill through the REAL hook entry point: build a transcript, write
 * an artifact, spawn the gate exactly as the harness does (JSON on stdin), and
 * read what it puts on stdout. Unit tests prove the functions; only this proves
 * the wired path.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ART_DIR = join('docs', 'ai-workflow', 'brainstorms');
const ART = join(ART_DIR, 'e2e-drill-scratch.md');
const TRANSCRIPT = join('.ai-workflow', 'qa', 'e2e-transcript.jsonl');

mkdirSync(ART_DIR, { recursive: true });
mkdirSync(join('.ai-workflow', 'qa'), { recursive: true });

const transcript = [
  { type: 'user', message: { content: 'go' } },
  {
    type: 'assistant',
    message: { content: [{ type: 'tool_use', name: 'Write', input: { file_path: ART.replace(/\\/g, '/') } }] },
  },
].map((e) => JSON.stringify(e)).join('\n');
writeFileSync(TRANSCRIPT, transcript, 'utf8');

function runGateProcess() {
  const input = JSON.stringify({ stop_hook_active: false, transcript_path: TRANSCRIPT });
  return execFileSync(process.execPath, ['scripts/hooks/privacy-boundary-gate.mjs'], {
    input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
  });
}

let failures = 0;
const expect = (label, cond, detail) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
  if (!cond) failures += 1;
};

// 1. Clean artifact -> silence (allow).
writeFileSync(ART, 'Client 4821 hit a squat PR. Trainer 77 logged it at 2026-08-19.', 'utf8');
let out = runGateProcess();
expect('clean artifact allows (empty stdout)', out.trim() === '', `stdout=${JSON.stringify(out.slice(0, 120))}`);

// 2. Artifact carrying an email -> block, path named, PII absent from the message.
writeFileSync(ART, 'follow up with fixture-not-a-real-person@gmail.com about the intake form', 'utf8');
out = runGateProcess();
let parsed = null;
try { parsed = JSON.parse(out); } catch { /* reported below */ }
expect('PII artifact blocks', parsed?.decision === 'block', `stdout=${JSON.stringify(out.slice(0, 160))}`);
expect('block names the offending path', Boolean(parsed?.reason?.includes('e2e-drill-scratch.md')));
expect('block names the pattern class', Boolean(parsed?.reason?.includes('email')));
expect('block does NOT echo the PII', !String(parsed?.reason ?? '').includes('fixture-not-a-real-person'));
expect('block names an unblock command', Boolean(parsed?.reason?.includes('To unblock:')));

// 3. A continuation (stop_hook_active) must never re-fire.
const cont = execFileSync(process.execPath, ['scripts/hooks/privacy-boundary-gate.mjs'], {
  input: JSON.stringify({ stop_hook_active: true, transcript_path: TRANSCRIPT }),
  encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
});
expect('stop_hook_active short-circuits', cont.trim() === '');

// 4. Deleted artifact -> absent is not an error.
rmSync(ART, { force: true });
out = runGateProcess();
expect('an artifact that no longer exists cannot leak', out.trim() === '');

rmSync(TRANSCRIPT, { force: true });
if (existsSync(ART)) rmSync(ART, { force: true });
console.log(failures ? `\n${failures} FAILURE(S)` : '\nend-to-end drill clean');
process.exitCode = failures ? 1 : 0;
