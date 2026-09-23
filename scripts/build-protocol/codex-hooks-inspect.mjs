#!/usr/bin/env node
/** Query the installed Codex app-server locally. No thread creation or inference. */
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const binary = process.argv[2];
if (!binary) throw Error('Pass the verified installed Codex binary path.');
const child = spawn(binary, ['app-server'], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
const pending = new Map();
let id = 0, buffer = '';
child.stdout.on('data', chunk => {
  buffer += chunk;
  let newline;
  while ((newline = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
    try {
      const response = JSON.parse(line);
      const entry = pending.get(response.id);
      if (entry) {
        clearTimeout(entry.timer); pending.delete(response.id);
        response.error ? entry.reject(Error(JSON.stringify(response.error))) : entry.resolve(response.result);
      }
    } catch {}
  }
});
child.stderr.resume(); // Keep native diagnostics out of receipts; no prompt/credential output.
child.on('error', error => { for (const entry of pending.values()) entry.reject(error); });
function request(method, params) {
  return new Promise((resolve, reject) => {
    const requestId = ++id;
    const timer = setTimeout(() => { pending.delete(requestId); reject(Error(`${method}: timed out`)); }, 25000);
    pending.set(requestId, { resolve, reject, timer });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params })}\n`);
  });
}
try {
  await request('initialize', { clientInfo: { name: 'makeer-blueprints-verification', version: '1.0.0' }, capabilities: { experimentalApi: true } });
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'initialized', params: {} })}\n`);
  const result = await request('hooks/list', { cwds: [resolve('.')] });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (process.argv.includes('--config-keys')) {
    const config = await request('config/read', { includeLayers: false });
    process.stdout.write(`${JSON.stringify({ hookConfig: Object.fromEntries(
      Object.entries(config.config || {}).filter(([key]) => /hook/i.test(key))) }, null, 2)}\n`);
  }
} finally {
  for (const entry of pending.values()) clearTimeout(entry.timer);
  child.stdin.end(); child.kill(); // Only the app-server process created above.
}
